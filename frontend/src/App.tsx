import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import ApplicationDetail from './pages/ApplicationDetail';
import UnderwritingWorkflow from './pages/UnderwritingWorkflow';
import Compliance from './pages/Compliance';
import AgentMonitor from './pages/AgentMonitor';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="applications" element={<Applications />} />
        <Route path="applications/:id" element={<ApplicationDetail />} />
        <Route path="underwriting/:workflowId" element={<UnderwritingWorkflow />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="agents" element={<AgentMonitor />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
