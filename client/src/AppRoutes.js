import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

// Layout
import { MainLayout } from './components/Layout';

// Pages
import { Dashboard } from './components/Dashboard';
import { Irrigation } from './components/Irrigation';
import { ActivityHistory } from './components/ActivityHistory';
import { Settings } from './components/Settings';

// Auth pages
import Login from './components/Login';
import SignUp from './components/SignUp';

function AppRoutes({ message, gardenId }) {
  const location = useLocation();
  const [user, setUser] = useState({
    name: 'Vườn Thông Minh',
    email: 'user@email.com'
  });

  // Đảm bảo có gardenId mặc định
  useEffect(() => {
    if (!gardenId) {
      // Nếu chưa có gardenId, set mặc định là 1
      localStorage.setItem('gardenId', '1');
    }
  }, [gardenId]);

  // Main app with layout
  return (
    <MainLayout user={user}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard message={message} />} />
        <Route path="/irrigation" element={<Irrigation />} />
        <Route path="/history" element={<ActivityHistory gardenId={gardenId || 1} />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </MainLayout>
  );
}

export default AppRoutes;
