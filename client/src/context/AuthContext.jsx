import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const safeParseJson = async (res) => {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON received from server (${res.status}).`);
    }
  }

  if (text.includes('<!DOCTYPE') || text.includes('<html')) {
    throw new Error(
      `Unable to reach VK BANKER'S backend (${res.status}). Please verify the backend server is running on http://localhost:5000.`
    );
  }

  throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('fintrack_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('fintrack_token') || null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If token exists, verify current session with server
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await safeParseJson(res);
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem('fintrack_user', JSON.stringify(data.user));
          } else {
            logout();
          }
        } catch (err) {
          console.warn('Session verification error:', err.message);
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await safeParseJson(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed. Please check credentials.');
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('fintrack_token', data.token);
      localStorage.setItem('fintrack_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('fintrack_token');
    localStorage.removeItem('fintrack_user');
  };

  const isOwner = user?.role === 'owner';
  const isAgent = user?.role === 'agent';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isOwner,
        isAgent,
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
