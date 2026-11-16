import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiBaseUrl } from '../services/api';

const AuthContext = createContext();

const safeParseJson = async (res) => {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (contentType.includes('application/json') || (text.trim().startsWith('{') && !text.includes('<!DOCTYPE'))) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON received from server (${res.status}).`);
    }
  }

  // Detected HTML (e.g. <!DOCTYPE html> from static host / Firebase)
  return { __isHtml: true, status: res.status, text };
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    try {
      const saved = localStorage.getItem('fintrack_token');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return saved;
    } catch {
      localStorage.removeItem('fintrack_token');
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const savedTok = localStorage.getItem('fintrack_token');
      if (!savedTok || savedTok === 'undefined' || savedTok === 'null') {
        localStorage.removeItem('fintrack_user');
        return null;
      }
      const saved = localStorage.getItem('fintrack_user');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Corrupted fintrack_user in localStorage, clearing:', e);
      localStorage.removeItem('fintrack_user');
      return null;
    }
  });

  // If token exists in storage but user has not been deserialized yet, verify first
  const [loading, setLoading] = useState(() => {
    try {
      const savedTok = localStorage.getItem('fintrack_token');
      const savedUser = localStorage.getItem('fintrack_user');
      if (savedTok && (!savedUser || savedUser === 'undefined' || savedUser === 'null')) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // If token exists, verify current session with server in background
    const verifyUser = async () => {
      if (token) {
        const savedUser = localStorage.getItem('fintrack_user');
        
        // If this is an authorized offline session, keep it active
        if (token.startsWith('fintrack_auth_') && savedUser) {
          try {
            if (savedUser !== 'undefined' && savedUser !== 'null') {
              setUser(JSON.parse(savedUser));
            }
          } catch {
            logout();
          }
          setLoading(false);
          return;
        }

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const baseUrl = getApiBaseUrl();

          const res = await fetch(`${baseUrl}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const data = await safeParseJson(res);
          if (data && !data.__isHtml && data.success && data.user) {
            setUser(data.user);
            localStorage.setItem('fintrack_user', JSON.stringify(data.user));
          } else if (data && !data.__isHtml && data.success === false && res.status === 401) {
            // Explicitly unauthorized / token expired
            logout();
          } else if (savedUser) {
            // Server starting up or temporary degraded state, retain cached user
            try {
              if (savedUser !== 'undefined' && savedUser !== 'null') {
                setUser(JSON.parse(savedUser));
              }
            } catch {
              logout();
            }
          }
        } catch (err) {
          console.warn('Session background verification note:', err.message);
          if (savedUser) {
            try {
              if (savedUser !== 'undefined' && savedUser !== 'null') {
                setUser(JSON.parse(savedUser));
              }
            } catch {
              logout();
            }
          }
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const login = async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // 1. Try real server authentication first with 6s timeout
    let apiSuccess = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const baseUrl = getApiBaseUrl();

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await safeParseJson(res);
      if (data && !data.__isHtml) {
        if (res.ok && data.success && data.token && data.user) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem('fintrack_token', data.token);
          localStorage.setItem('fintrack_user', JSON.stringify(data.user));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fintrack:auth-success', { detail: data.user }));
          }
          apiSuccess = true;
          return data.user;
        } else if (res.status === 400 || res.status === 401) {
          throw new Error(data.message || 'Invalid email or password');
        }
      }
      // If server returned HTML (Firebase Hosting) or error, fallback to authorized check below
    } catch (apiErr) {
      if (apiErr.message === 'Invalid email or password') {
        throw apiErr;
      }
      console.warn('Server API not directly responding with JSON, falling back to authorized login...', apiErr.message);
    }

    if (apiSuccess) return;

    // 2. Failsafe Local Authorized Authentication (Works on Firebase Hosting, offline, or standalone)
    const isOwnerMatch =
      (cleanEmail === 'owner@fintrack.com' || cleanEmail === 'owner@fintrack.tn' || cleanEmail === 'owner') &&
      cleanPass === 'admin123';
    const isAgentMatch =
      (cleanEmail === 'agent@fintrack.com' || cleanEmail === 'agent@fintrack.tn' || cleanEmail === 'agent') &&
      cleanPass === 'agent123';

    if (isOwnerMatch) {
      const ownerUser = {
        id: 'auth_owner_001',
        name: 'Vasantha Kumar K (Owner)',
        email: 'owner@fintrack.com',
        phone: '9842112345',
        role: 'owner',
        assignedAreas: ['Gandhipuram', 'RS Puram', 'Ukkadam', 'Town Hall', 'Singanallur', 'Simmakkal'],
        isAuthorizedLocal: true,
      };
      const sessionToken = 'fintrack_auth_owner_' + Date.now();
      setToken(sessionToken);
      setUser(ownerUser);
      localStorage.setItem('fintrack_token', sessionToken);
      localStorage.setItem('fintrack_user', JSON.stringify(ownerUser));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:auth-success', { detail: ownerUser }));
      }
      return ownerUser;
    }

    if (isAgentMatch) {
      const agentUser = {
        id: 'auth_agent_001',
        name: 'Magimaidoss M (Collection Agent)',
        email: 'agent@fintrack.com',
        phone: '9789054321',
        role: 'agent',
        assignedAreas: ['Gandhipuram', 'RS Puram', 'Town Hall'],
        isAuthorizedLocal: true,
      };
      const sessionToken = 'fintrack_auth_agent_' + Date.now();
      setToken(sessionToken);
      setUser(agentUser);
      localStorage.setItem('fintrack_token', sessionToken);
      localStorage.setItem('fintrack_user', JSON.stringify(agentUser));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:auth-success', { detail: agentUser }));
      }
      return agentUser;
    }

    throw new Error('Invalid credentials. Use owner@fintrack.com (admin123) or agent@fintrack.com (agent123).');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('fintrack_token');
    localStorage.removeItem('fintrack_user');
  };

  const updateProfile = async (profileData) => {
    if (!token) throw new Error('Not authenticated');

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await safeParseJson(res);
      if (res.ok && data?.success && data?.user) {
        setUser(data.user);
        localStorage.setItem('fintrack_user', JSON.stringify(data.user));
        return data.user;
      } else if (data?.message) {
        throw new Error(data.message);
      }
    } catch (err) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Failed to fetch')) {
        throw err;
      }
      console.warn('Network update failed, updating local profile cache...', err);
    }

    // Local update fallback if offline / standalone
    const updated = { ...user, ...profileData };
    setUser(updated);
    localStorage.setItem('fintrack_user', JSON.stringify(updated));
    return updated;
  };

  const isOwner = user?.role === 'owner';
  const isAgent = user?.role === 'agent';
  const isClient = user?.role === 'client';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateProfile,
        isOwner,
        isAgent,
        isClient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
