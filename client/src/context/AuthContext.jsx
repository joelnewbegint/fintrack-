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

  return { __isHtml: true, status: res.status, text };
};

const getStoredToken = () => {
  try {
    const local = localStorage.getItem('fintrack_token');
    if (local && local !== 'undefined' && local !== 'null') return local;
    const session = sessionStorage.getItem('fintrack_token');
    if (session && session !== 'undefined' && session !== 'null') return session;
    return null;
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  try {
    const local = localStorage.getItem('fintrack_user');
    if (local && local !== 'undefined' && local !== 'null') return JSON.parse(local);
    const session = sessionStorage.getItem('fintrack_user');
    if (session && session !== 'undefined' && session !== 'null') return JSON.parse(session);
    return null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        if (token.startsWith('fintrack_auth_')) {
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
            const isRemembered = localStorage.getItem('fintrack_remember') === 'true';
            if (isRemembered) {
              localStorage.setItem('fintrack_user', JSON.stringify(data.user));
            } else {
              sessionStorage.setItem('fintrack_user', JSON.stringify(data.user));
            }
          } else if (data && !data.__isHtml && data.success === false && res.status === 401) {
            logout();
          }
        } catch (err) {
          console.warn('Session background verification note:', err.message);
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const login = async (identifier, password, rememberMe = true) => {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

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
        body: JSON.stringify({
          loginId: cleanId,
          password: cleanPass,
          rememberMe: !!rememberMe,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await safeParseJson(res);
      if (data && !data.__isHtml) {
        if (res.ok && data.success && data.token && data.user) {
          setToken(data.token);
          setUser(data.user);

          if (rememberMe) {
            localStorage.setItem('fintrack_token', data.token);
            localStorage.setItem('fintrack_user', JSON.stringify(data.user));
            localStorage.setItem('fintrack_remember', 'true');
            sessionStorage.removeItem('fintrack_token');
            sessionStorage.removeItem('fintrack_user');
          } else {
            sessionStorage.setItem('fintrack_token', data.token);
            sessionStorage.setItem('fintrack_user', JSON.stringify(data.user));
            localStorage.removeItem('fintrack_token');
            localStorage.removeItem('fintrack_user');
            localStorage.removeItem('fintrack_remember');
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fintrack:auth-success', { detail: data.user }));
          }
          apiSuccess = true;
          return data.user;
        } else if (res.status === 400 || res.status === 401 || res.status === 403) {
          throw new Error(data.message || 'Invalid username/email or password');
        }
      }
    } catch (apiErr) {
      if (apiErr.message.includes('Invalid') || apiErr.message.includes('locked') || apiErr.message.includes('Account')) {
        throw apiErr;
      }
      console.warn('Server API not responding directly, checking offline authorization...', apiErr.message);
    }

    if (apiSuccess) return;

    // Failsafe Local Authorized Authentication (Offline or Standalone Demo)
    const isOwnerMatch =
      (cleanId === 'owner@fintrack.com' || cleanId === 'owner' || cleanId === 'vasantha') &&
      cleanPass === 'admin123';
    const isLoanAgentMatch =
      (cleanId === 'loanagent@fintrack.com' || cleanId === 'agent@fintrack.com' || cleanId === 'loanagent' || cleanId === 'agent') &&
      (cleanPass === 'loan123' || cleanPass === 'agent123');
    const isEmiAgentMatch =
      (cleanId === 'emiagent@fintrack.com' || cleanId === 'emiagent') &&
      cleanPass === 'emi123';

    if (isOwnerMatch) {
      const ownerUser = {
        id: 'auth_owner_001',
        _id: 'auth_owner_001',
        name: 'Vasantha Kumar K (Owner)',
        username: 'owner',
        email: 'owner@fintrack.com',
        phone: '9842112345',
        role: 'owner',
        assignedAreas: ['Gandhipuram', 'RS Puram', 'Ukkadam', 'Town Hall', 'Singanallur', 'Simmakkal'],
        isAuthorizedLocal: true,
      };
      const sessionToken = 'fintrack_auth_owner_' + Date.now();
      saveSession(sessionToken, ownerUser, rememberMe);
      return ownerUser;
    }

    if (isLoanAgentMatch) {
      const loanAgentUser = {
        id: 'auth_loan_agent_001',
        _id: 'auth_loan_agent_001',
        name: 'K. Saravanan (Loan Agent)',
        username: 'loanagent',
        email: 'loanagent@fintrack.com',
        phone: '9842199887',
        role: 'loan_agent',
        assignedAreas: ['Gandhipuram', 'RS Puram', 'Town Hall'],
        isAuthorizedLocal: true,
      };
      const sessionToken = 'fintrack_auth_loanagent_' + Date.now();
      saveSession(sessionToken, loanAgentUser, rememberMe);
      return loanAgentUser;
    }

    if (isEmiAgentMatch) {
      const emiAgentUser = {
        id: 'auth_emi_agent_001',
        _id: 'auth_emi_agent_001',
        name: 'R. Vignesh (EMI Agent)',
        username: 'emiagent',
        email: 'emiagent@fintrack.com',
        phone: '9789123456',
        role: 'emi_agent',
        assignedAreas: ['Ukkadam', 'Singanallur', 'Simmakkal'],
        isAuthorizedLocal: true,
      };
      const sessionToken = 'fintrack_auth_emiagent_' + Date.now();
      saveSession(sessionToken, emiAgentUser, rememberMe);
      return emiAgentUser;
    }

    throw new Error('Invalid credentials. Use: owner (admin123), loanagent (loan123), or emiagent (emi123).');
  };

  const saveSession = (tok, usr, remember) => {
    setToken(tok);
    setUser(usr);
    if (remember) {
      localStorage.setItem('fintrack_token', tok);
      localStorage.setItem('fintrack_user', JSON.stringify(usr));
      localStorage.setItem('fintrack_remember', 'true');
      sessionStorage.removeItem('fintrack_token');
      sessionStorage.removeItem('fintrack_user');
    } else {
      sessionStorage.setItem('fintrack_token', tok);
      sessionStorage.setItem('fintrack_user', JSON.stringify(usr));
      localStorage.removeItem('fintrack_token');
      localStorage.removeItem('fintrack_user');
      localStorage.removeItem('fintrack_remember');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fintrack:auth-success', { detail: usr }));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('fintrack_token');
    localStorage.removeItem('fintrack_user');
    localStorage.removeItem('fintrack_remember');
    sessionStorage.removeItem('fintrack_token');
    sessionStorage.removeItem('fintrack_user');
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
        const isRemembered = localStorage.getItem('fintrack_remember') === 'true';
        if (isRemembered) {
          localStorage.setItem('fintrack_user', JSON.stringify(data.user));
        } else {
          sessionStorage.setItem('fintrack_user', JSON.stringify(data.user));
        }
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

    const updated = { ...user, ...profileData };
    setUser(updated);
    const isRemembered = localStorage.getItem('fintrack_remember') === 'true';
    if (isRemembered) {
      localStorage.setItem('fintrack_user', JSON.stringify(updated));
    } else {
      sessionStorage.setItem('fintrack_user', JSON.stringify(updated));
    }
    return updated;
  };

  const isOwner = user?.role === 'owner' || user?.role === 'admin';
  const isLoanAgent = user?.role === 'loan_agent' || user?.role === 'agent';
  const isEmiAgent = user?.role === 'emi_agent';
  const isAgent = isLoanAgent || isEmiAgent;
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
        isLoanAgent,
        isEmiAgent,
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
