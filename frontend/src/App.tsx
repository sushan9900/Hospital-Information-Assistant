// ==============================================================================
// Hospital Information Assistance — App Router Registry
// ==============================================================================
// WHY THIS FILE EXISTS:
//   This is the router configuration module of the frontend.
//   It:
//     1. Wraps the entire application in the global <AuthProvider>
//     2. Defines all pages under their corresponding layouts (Main or Auth Layout)
//     3. Implements client-side route protection (guarantees patients/visitors
//        cannot access private panels, and patients cannot access RAG admin panel).
// ==============================================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';

// Layout Wrappers
import MainLayout from '@/layouts/MainLayout';
import AuthLayout from '@/layouts/AuthLayout';

// Pages Viewports
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/ProfilePage';
import DoctorsPage from '@/pages/DoctorsPage';
import DepartmentsPage from '@/pages/DepartmentsPage';
import AppointmentsPage from '@/pages/AppointmentsPage';
import ChatbotPage from '@/pages/ChatbotPage';
import RAGPage from '@/pages/RAGPage';
import NotFoundPage from '@/pages/NotFoundPage';

import { LoadingSpinner } from '@/components/LoadingSpinner';

// ------------------------------------------------------------------------------
// PROTECTED ROUTE WRAPPER
// WHY: Blocks unauthorized users from loading private routing branches.
// ------------------------------------------------------------------------------
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show a full-screen loading spinner while the auth state is being initialized
  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading private portal viewport..." />;
  }

  // Redirect to login if user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard if the page is admin-only and the user is a patient
  if (adminOnly && user?.role !== UserRole.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          
          {/* 1. AUTHENTICATION PAGES (SPLIT SCREEN LAYOUT) */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* 2. MAIN APPLICATION PORTAL PAGES (NAVBAR + FOOTER LAYOUT) */}
          <Route element={<MainLayout />}>
            
            {/* Root redirects to Dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Public directory views (Anyone can view, booking prompts login) */}
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />

            {/* Protected dashboard and bookings */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/appointments"
              element={
                <ProtectedRoute>
                  <AppointmentsPage />
                </ProtectedRoute>
              }
            />
            
            {/* Session-based AI consultation panel */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatbotPage />
                </ProtectedRoute>
              }
            />

            {/* Admin-only RAG controls indexer */}
            <Route
              path="/rag"
              element={
                <ProtectedRoute adminOnly>
                  <RAGPage />
                </ProtectedRoute>
              }
            />

            {/* 404 Catch-All within MainLayout */}
            <Route path="*" element={<NotFoundPage />} />
            
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
export default App;
