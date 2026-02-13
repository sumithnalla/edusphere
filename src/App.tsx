import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from '../pages/Landing';
import Payment from '../pages/Payment';
import PaymentSuccess from '../pages/PaymentSuccess';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import AdminLogin from '../pages/AdminLogin';
import AdminDashboard from '../pages/AdminDashboard';
import AllotBatches from '../pages/AllotBatches';

const App: React.FC = () => {

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          window.location.hash = '/dashboard';
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/login" element={<Login />} />

        {/* Student Routes */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/allot-batches" element={<AllotBatches />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;