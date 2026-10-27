import { Navigate, Outlet } from 'react-router-dom';
import useAppStore from '../../store/useAppStore';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAppStore();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
