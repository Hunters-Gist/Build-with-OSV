import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Pipeline from './leads/Pipeline.jsx';
import QuoteBuilder from './quotes/QuoteBuilder.jsx';
import QuoteEditor from './quotes/QuoteEditor.jsx';
import AdminDashboard from './admin/AdminDashboard.jsx';
import ClientPortal from './client/ClientPortal.jsx';
import Dashboard from './dashboard/Dashboard.jsx';

import SubcontractorProfile from './subcontractors/Profile.jsx';
import SubcontractorOnboarding from './subcontractors/Onboarding.jsx';
import JobDashboard from './jobs/JobDashboard.jsx';

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
