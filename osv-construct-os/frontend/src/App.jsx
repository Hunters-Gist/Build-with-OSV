import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
const Pipeline = lazy(() => import('./leads/Pipeline.jsx'));
const QuoteBuilder = lazy(() => import('./quotes/QuoteBuilder.jsx'));
const QuoteEditor = lazy(() => import('./quotes/QuoteEditor.jsx'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard.jsx'));
const ClientPortal = lazy(() => import('./client/ClientPortal.jsx'));
const Dashboard = lazy(() => import('./dashboard/Dashboard.jsx'));
const SubcontractorProfile = lazy(() => import('./subcontractors/Profile.jsx'));
const SubcontractorOnboarding = lazy(() => import('./subcontractors/Onboarding.jsx'));
const JobDashboard = lazy(() => import('./jobs/JobDashboard.jsx'));

function AppLoading() {
  return (
    <div className="min-h-screen bg-osv-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-white/10 border-t-osv-accent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<AppLoading />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/quotes/new" element={<QuoteBuilder />} />
          <Route path="/quotes/:quoteRef/edit" element={<QuoteEditor />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/jobs" element={<JobDashboard />} />
          <Route path="/client/quote/:quoteId" element={<ClientPortal />} />
          <Route path="/subcontractors/join" element={<SubcontractorOnboarding />} />
          <Route path="/subcontractors/:id" element={<SubcontractorProfile />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
