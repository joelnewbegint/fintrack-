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
    const isRemembered = localStorage.getItem('fintrack_remember') === 'true';
    if (isRemembered) {
      const local = localStorage.getItem('fintrack_token');
      if (local && local !== 'undefined' && local !== 'null') return local;
    } else {
      // If not explicitly remembered, clear persistent localStorage token
      localStorage.removeItem('fintrack_token');
      localStorage.removeItem('fintrack_user');
    }
    const session = sessionStorage.getItem('fintrack_token');
    if (session && session !== 'undefined' && session !== 'null') return session;
    return null;
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  try {
    const isRemembered = localStorage.getItem('fintrack_remember') === 'true';
    if (isRemembered) {
      const local = localStorage.getItem('fintrack_user');
      if (local && local !== 'undefined' && local !== 'null') return JSON.parse(local);
    }
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          try {
            controller.abort(new Error('Auth session verification timed out'));
          } catch {
            controller.abort();
          }
        }, 12000);
        try {
          const baseUrl = getApiBaseUrl();

          const res = await fetch(`${baseUrl}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          });

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
          if (err?.name !== 'AbortError' && !controller.signal.aborted) {
            console.warn('Session background verification note:', err.message);
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const login = async (identifier, password, rememberMe = true) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('Internet connection required to log in. App cannot open offline.');
    }

    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      try {
        controller.abort(new Error('Login timed out'));
      } catch {
        controller.abort();
      }
    }, 20000);
    try {
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
          return data.user;
        }
        throw new Error(data.message || 'Invalid username/email or password');
      }
      throw new Error('Unable to reach server. Please ensure internet connection is active.');
    } catch (apiErr) {
      if (apiErr?.name === 'AbortError' || controller.signal.aborted) {
        throw new Error('Server connection timed out. Please check your internet and try again.');
      }
      throw new Error(apiErr?.message || 'Unable to connect to server. App requires internet connection.');
    } finally {
      clearTimeout(timeoutId);
    }
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
