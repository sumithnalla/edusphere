
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('edutech_sriraj@eduspace.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) throw loginError;

      // Check for admin metadata
      const userRole = data.user?.app_metadata?.role;
      if (userRole !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Unauthorized: You do not have admin access.');
      }

      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-10">
        <div className="text-center mb-10">
          <span className="text-xs font-black bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest">Admin Control</span>
          <h2 className="text-3xl font-black text-gray-900 mt-6">Secure Portal</h2>
          <p className="text-gray-500 mt-2">Sign in to manage the Eduspace platform.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-xl mb-6 text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email Address</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-indigo-500 outline-none transition" 
              placeholder="admin@eduspace.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Password</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-indigo-500 outline-none transition" 
              placeholder="••••••••"
            />
          </div>
          <button 
            disabled={loading}
            className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Login to Admin Panel"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
