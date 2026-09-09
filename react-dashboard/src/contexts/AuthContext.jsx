import React, { createContext, useContext, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Default user — always logged in as admin, no JWT
const DEFAULT_USER = {
  email: 'admin@medintel.gov',
  role: 'admin',
  id: 'system-admin',
};

export function AuthProvider({ children }) {
  // Load saved email/role from localStorage for display purposes only (no token)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('medintel_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const login = async (email, password) => {
    // Call backend login just to get role info — success always
    let role = 'admin';
    let userId = 'system-admin';
    try {
      const data = await api.auth.login(email, password);
      role = data.role || 'admin';
      userId = data.user_id || 'system-admin';
    } catch {
      // Even if backend is unreachable, allow login
      role = email.toLowerCase().includes('worker') ? 'worker' : 'admin';
    }
    const user = { email, role, id: userId };
    localStorage.setItem('medintel_user', JSON.stringify(user));
    setCurrentUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('medintel_user');
    setCurrentUser(DEFAULT_USER);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
