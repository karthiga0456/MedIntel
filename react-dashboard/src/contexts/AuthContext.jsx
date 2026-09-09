import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('medintel_token');
      const savedUser = localStorage.getItem('medintel_user');
      if (token && token !== 'demo-token') {
        try {
          const user = await api.auth.getMe();
          setCurrentUser(user);
        } catch (error) {
          // Token is invalid/expired — clear it so user must re-login
          // (don't set a fake user with a broken token in storage)
          localStorage.removeItem('medintel_token');
          localStorage.removeItem('medintel_user');
          setCurrentUser(null);
        }
      } else if (token === 'demo-token') {
        // Clear stale demo tokens
        localStorage.removeItem('medintel_token');
        localStorage.removeItem('medintel_user');
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await api.auth.login(email, password);
      localStorage.setItem('medintel_token', data.access_token);
      let user = null;
      try {
        user = await api.auth.getMe();
      } catch (_) {
        const isWorker = email.toLowerCase().includes('worker');
        user = { email, role: isWorker ? 'worker' : 'admin', id: data.user_id || 'session-id' };
      }
      localStorage.setItem('medintel_user', JSON.stringify(user));
      setCurrentUser(user);
      return user;
    } catch (err) {
      // Do NOT set a fake token — that causes 401s on all subsequent API calls.
      // If login fails, re-throw so the Login page can show an error.
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('medintel_token');
    localStorage.removeItem('medintel_user');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
