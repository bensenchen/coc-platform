import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage';
import { HomePage } from '@/pages/home/HomePage';
import { AdminSettingsPage } from '@/pages/home/AdminSettingsPage';
import { WorkspacePage } from '@/pages/workspace/WorkspacePage';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminSettingsPage /></ProtectedRoute>} />
      <Route path="/w/:workspaceSlug/p/:projectSlug" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<WorkspacePage />} />
        <Route path="page/:pageId" element={<WorkspacePage />} />
      </Route>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
