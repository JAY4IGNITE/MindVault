import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/layout/AuthGuard';
import { GuestGuard } from './components/layout/GuestGuard';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeProvider';

// Route-level code splitting for all pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));

// Lazy load private feature pages for code splitting & faster bundle performance
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ChatPage = lazy(() => import('./pages/chat/ChatPage'));
const JournalPage = lazy(() => import('./pages/journal/JournalPage'));
const MemoriesPage = lazy(() => import('./pages/memories/MemoriesPage'));
const GoalsPage = lazy(() => import('./pages/goals/GoalsPage'));
const MemoryGraphPage = lazy(() => import('./pages/graph/MemoryGraphPage'));
const InsightsPage = lazy(() => import('./pages/insights/InsightsPage'));
const DecisionsPage = lazy(() => import('./pages/decisions/DecisionsPage'));
const DecisionDetailsPage = lazy(() => import('./pages/decisions/DecisionDetailsPage'));
const SecurityPage = lazy(() => import('./pages/security/SecurityPage'));

// Configure TanStack React Query for caching strategy
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 5,    // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader: React.FC = () => (
  <div className="h-full min-h-[300px] w-full flex flex-col items-center justify-center gap-3">
    <div className="relative flex h-6 w-6">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
    </div>
    <span className="text-xs text-muted-foreground font-medium tracking-wide">
      Accessing encrypted vault module...
    </span>
  </div>
);

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Route */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Guest-only routes: redirects authenticated users directly to /dashboard without flash */}
      <Route element={<GuestGuard />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      {/* Protected Routes (AuthGuard) */}
      <Route element={<AuthGuard />}>
        <Route
          element={
            <DashboardLayout>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </DashboardLayout>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/memories" element={<MemoriesPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/decisions" element={<DecisionsPage />} />
          <Route path="/decisions/:id" element={<DecisionDetailsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/memory-graph" element={<MemoryGraphPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Suspense fallback={<PageLoader />}>
              <AppRoutes />
            </Suspense>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
