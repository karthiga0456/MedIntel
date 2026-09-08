import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Assistant from './pages/Assistant';
import KnowledgeBase from './pages/KnowledgeBase';
import Medicines from './pages/Medicines';
import Emergency from './pages/Emergency';
import Insurance from './pages/Insurance';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import NearbyHospitals from './pages/NearbyHospitals';
import Patients from './pages/Patients';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/dashboard/assistant" replace />} />
              {/* Normal User Routes */}
              <Route path="assistant" element={<Assistant />} />
              <Route path="rag" element={<KnowledgeBase />} />
              <Route path="medicines" element={<Medicines />} />
              <Route path="emergency" element={<Emergency />} />
              <Route path="insurance" element={<Insurance />} />
              <Route path="nearby-hospitals" element={<NearbyHospitals />} />
              <Route path="notifications" element={<Notifications />} />

              {/* Admin & Public Health Governance Only Routes */}
              <Route element={<AdminRoute />}>
                <Route path="analytics" element={<Analytics />} />
                <Route path="admin" element={<Admin />} />
                <Route path="patients" element={<Patients />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
