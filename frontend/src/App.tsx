import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/layout/AuthGuard';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

// Eager load critical initial public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

// Lazy load private feature pages for code splitting & faster bundle performance
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ChatPage = lazy(() => import('./pages/chat/ChatPage'));
const JournalPage = lazy(() => import('./pages/journal/JournalPage'));
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
    <Loader2 className="h-7 w-7 animate-spin text-accent" />
    <span className="text-xs text-secondary font-medium tracking-wide">
      Accessing encrypted vault module...
    </span>
  </div>
);

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* Protected Routes (AuthGuard) */}
              <Route element={<AuthGuard />}>
                <Route
                  element={
                    <DashboardLayout>
                      <Outlet />
                    </DashboardLayout>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/journal" element={<JournalPage />} />
                  <Route path="/memories" element={<JournalPage />} />
                  <Route path="/goals" element={<DashboardPage />} />
                  <Route path="/decisions" element={<DecisionsPage />} />
                  <Route path="/decisions/:id" element={<DecisionDetailsPage />} />
                  <Route path="/insights" element={<InsightsPage />} />
                  <Route path="/memory-graph" element={<MemoryGraphPage />} />
                  <Route path="/security" element={<SecurityPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
