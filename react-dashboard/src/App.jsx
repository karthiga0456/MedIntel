import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Assistant from './pages/Assistant';
import KnowledgeBase from './pages/KnowledgeBase';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import Labs from './pages/Labs';
import Medicines from './pages/Medicines';
import Surveillance from './pages/Surveillance';
import GISMap from './pages/GISMap';
import Outbreak from './pages/Outbreak';
import Emergency from './pages/Emergency';
import WorkerPortal from './pages/WorkerPortal';
import Insurance from './pages/Insurance';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import AuditLogs from './pages/AuditLogs';
import Admin from './pages/Admin';
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
              <Route index element={<Navigate to="/dashboard/patients" replace />} />
              {/* Necessary User & Worker Workspace Routes */}
              <Route path="patients" element={<Patients />} />
              <Route path="patients/:id" element={<PatientDetails />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="rag" element={<KnowledgeBase />} />
              <Route path="labs" element={<Labs />} />
              <Route path="medicines" element={<Medicines />} />
              <Route path="worker" element={<WorkerPortal />} />
              <Route path="notifications" element={<Notifications />} />

              {/* Admin & Public Health Governance Only Routes */}
              <Route element={<AdminRoute />}>
                <Route path="surveillance" element={<Surveillance />} />
                <Route path="outbreak" element={<Outbreak />} />
                <Route path="map" element={<GISMap />} />
                <Route path="emergency" element={<Emergency />} />
                <Route path="insurance" element={<Insurance />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="admin/audit" element={<AuditLogs />} />
                <Route path="admin" element={<Admin />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
