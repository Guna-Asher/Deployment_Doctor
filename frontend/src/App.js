import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/dd/DashboardLayout';
import HomePage from './pages/HomePage';
import ReportPage from './pages/ReportPage';
import SampleScenariosPage from './pages/SampleScenariosPage';
import IncidentKnowledgeBasePage from './pages/IncidentKnowledgeBasePage';
import './App.css';

export default function App() {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/report/:analysisId" element={<ReportPage />} />
          <Route path="/sample-scenarios" element={<SampleScenariosPage />} />
          <Route path="/incidents" element={<IncidentKnowledgeBasePage />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}
