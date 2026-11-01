import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Overview from './pages/Overview';
import NewInspection from './pages/NewInspection';
import InspectionHistory from './pages/InspectionHistory';
import InspectionDetails from './pages/InspectionDetails';
import InspectionReport from './pages/InspectionReport';
import Analytics from './pages/Analytics';
import ModelPerformance from './pages/ModelPerformance';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="new-inspection" element={<NewInspection />} />
        <Route path="history" element={<InspectionHistory />} />
        <Route path="history/:id" element={<InspectionDetails />} />
        <Route path="report/:id" element={<InspectionReport />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="model-performance" element={<ModelPerformance />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
