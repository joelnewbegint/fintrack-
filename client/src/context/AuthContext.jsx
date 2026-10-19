import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

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
          const data = await res.json();
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

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
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
