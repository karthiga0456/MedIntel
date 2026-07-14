import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Assistant from './pages/Assistant';
import KnowledgeBase from './pages/KnowledgeBase';
import Outbreak from './pages/Outbreak';
import WorkerPortal from './pages/WorkerPortal';
import Insurance from './pages/Insurance';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard/assistant" replace />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="rag" element={<KnowledgeBase />} />
          <Route path="outbreak" element={<Outbreak />} />
          <Route path="worker" element={<WorkerPortal />} />
          <Route path="insurance" element={<Insurance />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
