import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Processing from './pages/Processing';
import Evaluations from './pages/Evaluations';
import SessionReview from './pages/SessionReview';
import Export from './pages/Export';
import Prototype from './pages/Prototype';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/evaluations" element={<Evaluations />} />
            <Route path="/processing" element={<Evaluations />} />
            <Route path="/prototype" element={<Prototype />} />
            <Route path="/session/:id" element={<SessionReview />} />
            <Route path="/session/:id/processing" element={<Evaluations />} />
            <Route path="/session/:id/export" element={<Export />} />
          </Route>
        </Route>


        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
