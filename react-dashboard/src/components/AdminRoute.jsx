import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute() {
  const { currentUser } = useAuth();

  if (currentUser?.role !== 'admin') {
    return <Navigate to="/dashboard/patients" replace />;
  }

  return <Outlet />;
}
