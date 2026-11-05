import React from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import CoordinatorDashboard from './CoordinatorDashboard';
import RequesterDashboard from './RequesterDashboard';
import SppIntakeForm from './SppIntakeForm';
import { Shell } from './shared';

const SCREENS = [
  ['coordinator', 'Coordinator dashboard', 'Validation queue sorted by due date, Approvia AI checks, in-review records at risk.'],
  ['requester', 'Requester dashboard', 'Start a new submission and follow the ones in flight. Nothing else.'],
  ['intake?state=a', 'Intake form · State A', 'Student Project Proposal: Teacher Fellow, standard review date, one department.'],
  ['intake?state=b', 'Intake form · State B', 'Student Intern with graduation year, date inside 6 business days, expedited reason, two departments.'],
];

function Index() {
  return (
    <Shell nav={['Home']} activeNav="Home" workspace="Clearance mockups" tabs={[]}>
      <main className="rgm-page">
        <div>
          <div className="pp-section">Clearance mockups</div>
          <p className="pp-help">Static screens with fictional data. Open each at 1,440px wide for screenshots.</p>
        </div>
        <nav className="rgm-index">
          {SCREENS.map(([path, title, text]) => (
            <Link key={path} to={path}><strong>{title}</strong><span className="pp-help">{text}</span></Link>
          ))}
        </nav>
      </main>
    </Shell>
  );
}

export default function RegeneronMockups() {
  return (
    <Routes>
      <Route index element={<Index />} />
      <Route path="coordinator" element={<CoordinatorDashboard />} />
      <Route path="requester" element={<RequesterDashboard />} />
      <Route path="intake" element={<SppIntakeForm />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
