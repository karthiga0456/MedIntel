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
      if (token) {
        try {
          // Verify token by fetching user profile
          const user = await api.auth.getMe();
          setCurrentUser(user);
        } catch (error) {
          console.error('Invalid token or session expired', error);
          localStorage.removeItem('medintel_token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    localStorage.setItem('medintel_token', data.access_token);
    const user = await api.auth.getMe();
    setCurrentUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('medintel_token');
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
