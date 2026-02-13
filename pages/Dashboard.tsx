
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/database';

const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

 useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate('/login');
      return;
    }

    const user = session.user;  // ✅ ADD THIS LINE

      const { data, error } = await supabase
        .from('users')
        .select('*, batches(*)')
        .eq('user_id', user.id)
        .single();

       if (error || !data) {
         navigate('/login');
         return;
      }

      setProfile(data);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600">EDUSPACE</Link>
          <span className="md:hidden">Menu</span>
        </div>
        <nav className="p-4 flex-grow space-y-1">
          <button className="w-full text-left p-3 rounded-lg bg-indigo-50 text-indigo-700 font-bold">My Classes</button>
          <button className="w-full text-left p-3 rounded-lg text-gray-600 hover:bg-gray-50">Recorded Classes</button>
          <button className="w-full text-left p-3 rounded-lg text-gray-600 hover:bg-gray-50">Tests</button>
          {profile?.batches?.has_doubts_access && (
            <button className="w-full text-left p-3 rounded-lg text-gray-600 hover:bg-gray-50">Doubts Classes</button>
          )}
          <button className="w-full text-left p-3 rounded-lg text-gray-600 hover:bg-gray-50">Profile</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <h2 className="font-bold text-gray-800">Hello, {profile?.student_name}</h2>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase rounded-md tracking-wide">
              {profile?.batches?.batch_name}
            </span>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-red-600">Logout</button>
        </header>

        {/* Content Area */}
        <div className="p-8">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Welcome back!</h1>
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm font-medium uppercase mb-2">My Batch</p>
                <h3 className="text-xl font-bold text-indigo-600 capitalize">{profile?.batches?.batch_name} Batch</h3>
                <p className="text-gray-600 mt-1">{profile?.batches?.duration_months} Months Access</p>
              </div>
              <div className="bg-indigo-600 p-6 rounded-2xl shadow-sm text-white">
                <p className="opacity-80 text-sm font-medium uppercase mb-2">Classes Today</p>
                <h3 className="text-2xl font-bold">3 Classes Scheduled</h3>
                <Link to="#" className="text-white font-bold underline mt-4 inline-block">View Schedule</Link>
              </div>
            </div>

            {/* Placeholder for missing sections */}
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
              <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">Wait for Phase 2!</h3>
              <p className="text-gray-500 mt-2">Class details, recorded lectures, and tests are coming in the next update.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
