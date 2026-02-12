
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Stats {
  totalStudents: number;
  totalRevenue: number;
  pendingAllotments: number;
  todaysClasses: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalRevenue: 0,
    pendingAllotments: 0,
    todaysClasses: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      // 1. Check Auth
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.app_metadata?.role;
      if (!user || role !== 'admin') {
        navigate('/admin/login');
        return;
      }

      // 2. Fetch Data
      const [
        { count: studentsCount },
        { data: paymentsData },
        { count: pendingCount },
        { count: classesCount }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('amount_paid').eq('payment_status', 'success'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('access_granted', false).eq('payment_status', 'success'),
        supabase.from('daily_classes').select('*', { count: 'exact', head: true }).eq('date', new Date().toISOString().split('T')[0])
      ]);

      const totalRevenue = (paymentsData || []).reduce((acc, p) => acc + p.amount_paid, 0);

      setStats({
        totalStudents: studentsCount || 0,
        totalRevenue: totalRevenue,
        pendingAllotments: pendingCount || 0,
        todaysClasses: classesCount || 0
      });
      setLoading(false);
    };

    fetchStats();
  }, [navigate]);

  if (loading) return <div className="p-10 text-center">Loading admin stats...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col fixed h-full z-20">
        <div className="p-6 text-white font-black text-2xl border-b border-gray-800">ADMIN</div>
        <nav className="p-4 flex-grow space-y-1">
          <Link to="/admin/dashboard" className="block p-3 rounded-lg bg-indigo-600 text-white font-bold">Dashboard Overview</Link>
          <button className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition">Manage Batches</button>
          <Link to="/admin/allot-batches" className="block p-3 rounded-lg hover:bg-gray-800 transition">Allot Batches</Link>
          <button className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition">Student Payments</button>
          <button className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition">All Students</button>
          <div className="pt-4 pb-2 px-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Content Management</div>
          <button className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition">Daily Classes</button>
          <button className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition">Recorded Classes</button>
          <button className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition">Exams & Tests</button>
        </nav>
        <div className="p-4 border-t border-gray-800">
           <button onClick={() => supabase.auth.signOut().then(() => navigate('/admin/login'))} className="w-full p-2 text-sm text-gray-500 hover:text-red-400">Logout</button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="ml-64 flex-grow p-10">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Platform Overview</h1>
            <p className="text-gray-500 mt-2">Real-time statistics for Eduspace EAMCET.</p>
          </div>
          <div className="flex space-x-4">
            <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition">Generate Report</button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-4 mb-4 text-indigo-600">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-gray-400">Total Students</span>
            </div>
            <h3 className="text-4xl font-black text-gray-900">{stats.totalStudents}</h3>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-4 mb-4 text-green-600">
              <div className="p-2 bg-green-50 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-gray-400">Total Revenue</span>
            </div>
            <h3 className="text-4xl font-black text-gray-900">₹{stats.totalRevenue.toLocaleString()}</h3>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 border-l-4 border-l-orange-500">
            <div className="flex items-center space-x-4 mb-4 text-orange-600">
              <div className="p-2 bg-orange-50 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-gray-400">Pending Allotments</span>
            </div>
            <h3 className="text-4xl font-black text-gray-900">{stats.pendingAllotments}</h3>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-4 mb-4 text-blue-600">
              <div className="p-2 bg-blue-50 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-gray-400">Today's Classes</span>
            </div>
            <h3 className="text-4xl font-black text-gray-900">{stats.todaysClasses}</h3>
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="mt-12 bg-white rounded-3xl p-10 border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-black mb-6">Recent Successful Payments</h2>
          <div className="overflow-hidden">
             <p className="text-gray-400 italic">Phase 1 Dashboard loaded. All statistics are live from database.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
