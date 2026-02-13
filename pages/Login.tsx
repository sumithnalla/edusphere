
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Security: First check if email exists in 'users' table
    const { data: userExists, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      setMessage({ type: 'error', text: 'Error verifying account. Please try again.' });
      setLoading(false);
      return;
    }

    if (!userExists) {
      setMessage({ type: 'error', text: 'Account not found. Please purchase a batch first.' });
      setLoading(false);
      return;
    }

    // Send Magic Link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Magic link sent! Please check your email inbox.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10">
        <div className="text-center mb-10">
          <Link to="/" className="text-3xl font-black text-indigo-600 tracking-tight">EDUSPACE</Link>
          <h2 className="text-2xl font-bold text-gray-800 mt-6">Student Login</h2>
          <p className="text-gray-500 mt-2">Enter your registered email to receive a magic link.</p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleMagicLink} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full border p-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none border-gray-200" 
            />
          </div>
          <button 
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-100 text-center">
          <p className="text-gray-500 text-sm">Haven't joined yet?</p>
          <Link to="/" className="text-indigo-600 font-bold hover:underline">View Batches & Enroll</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
