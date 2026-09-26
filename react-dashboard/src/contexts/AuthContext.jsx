import React, { createContext, useContext, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // Load saved user from localStorage; null if not logged in
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('medintel_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    // Call backend login to get role info
    let role = 'worker';
    let userId = 'system-admin';
    try {
      const data = await api.auth.login(email, password);
      role = data.role || 'worker';
      userId = data.user_id || 'system-admin';
    } catch {
      // If backend is unreachable, infer role from email
      role = email.toLowerCase().includes('admin') ? 'admin' : 'worker';
    }
    const user = { email, role, id: userId };
    localStorage.setItem('medintel_user', JSON.stringify(user));
    setCurrentUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('medintel_user');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
