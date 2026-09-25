import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import PubProDashboard from './pages/PubProDashboard';
import WriterDashboard from './pages/WriterDashboard';
import PublicationForm from './pages/PublicationForm';
import Publications from './pages/Publications';
import SamplePublication from './pages/SamplePublication';
import SamplePlan from './pages/SamplePlan';
import SampleAuthor from './pages/SampleAuthor';
import ExternalAuthors from './pages/ExternalAuthors';
import ExternalAuthorDashboard from './pages/ExternalAuthorDashboard';
import PublicationPlans from './pages/PublicationPlans';
import PublicationPlanForm from './pages/PublicationPlanForm';
import ExternalAuthorProfile from './pages/ExternalAuthorProfile';
import VendorProfile from './pages/VendorProfile';
import FinancialReport from './pages/FinancialReport';
import PublicationWorkflows from './pages/PublicationWorkflows';
import Studies from './pages/Studies';
import StudyProfile from './pages/StudyProfile';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  // External authors only have their own dashboard.
  if (user.role === 'author' && pathname !== '/author-dashboard') return <Navigate to="/author-dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<PubProDashboard />} />
            <Route path="writer-dashboard" element={<WriterDashboard />} />
            <Route path="publications" element={<Publications />} />
            <Route path="publication" element={<SamplePublication />} />
            <Route path="publication/:id" element={<PublicationForm />} />
            <Route path="publication-plans" element={<PublicationPlans />} />
            <Route path="publication-plan" element={<SamplePlan />} />
            <Route path="publication-plan/:id" element={<PublicationPlanForm />} />
            <Route path="external-authors" element={<ExternalAuthors />} />
            <Route path="author-dashboard" element={<ExternalAuthorDashboard />} />
            <Route path="external-author" element={<SampleAuthor />} />
            <Route path="external-author/:id" element={<ExternalAuthorProfile />} />
            <Route path="studies" element={<Studies />} />
            <Route path="study/:id" element={<StudyProfile />} />
            <Route path="vendor" element={<VendorProfile />} />
            <Route path="financial-report" element={<FinancialReport />} />
            <Route path="workflows" element={<PublicationWorkflows />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
