import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Batch, UserProfile, Payment } from '../types/database';
import { useNavigate, Link } from 'react-router-dom';

const AllotBatches: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    student_name: '',
    phone: '',
    batch_id: '',
    payment_id: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      // Auth check
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.app_metadata?.role;
      if (!user || role !== 'admin') {
        navigate('/admin/login');
        return;
      }

      const [batchesRes, pendingRes, studentsRes] = await Promise.all([
        supabase.from('batches').select('*').eq('is_active', true),
        supabase.from('payments').select('*').eq('payment_status', 'success').eq('access_granted', false),
        supabase.from('users').select('*, batches(*)').order('created_at', { ascending: false })
      ]);

      if (batchesRes.data) setBatches(batchesRes.data);
      if (pendingRes.data) setPendingPayments(pendingRes.data);
      if (studentsRes.data) setStudents(studentsRes.data);
      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const handleAllot = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setErrorMessage('');

    try {
      // Validate form data
      if (!formData.email || !formData.student_name || !formData.phone || !formData.batch_id) {
        throw new Error('Please fill in all required fields');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        throw new Error('Please enter a valid email address');
      }

      // Phone validation (10 digits)
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      const payload = {
        email: formData.email.trim().toLowerCase(),
        student_name: formData.student_name.trim(),
        phone: formData.phone.trim(),
        batch_id: Number(formData.batch_id),
        payment_id: formData.payment_id ? Number(formData.payment_id) : null,
      };

      console.log("🔥 INVOKING allot-batch WITH:", payload);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke(
        'allot-batch',
        {
          body: payload,
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );
      

      console.log("📥 FUNCTION RESPONSE:", { data, error });

      // Check for error from the function invoke itself
      if (error) {
        console.error("❌ INVOKE ERROR:", error);
        // supabase-js FunctionsError may include useful context (status/body)
        const anyErr: any = error;
        const status =
          anyErr?.context?.status ??
          anyErr?.context?.response?.status ??
          anyErr?.status ??
          undefined;
        const statusText =
          anyErr?.context?.statusText ??
          anyErr?.context?.response?.statusText ??
          anyErr?.statusText ??
          undefined;
        const body =
          anyErr?.context?.body ??
          anyErr?.context?.response?.body ??
          anyErr?.body ??
          undefined;

        const detailsParts = [
          status ? `status=${status}` : null,
          statusText ? `statusText=${statusText}` : null,
          body ? `body=${typeof body === 'string' ? body : JSON.stringify(body)}` : null,
        ].filter(Boolean);

        const details = detailsParts.length ? ` (${detailsParts.join(', ')})` : '';
        throw new Error(`Function invocation failed: ${error.message}${details}`);
      }

      // Check for error in the response data
      if (data && !data.success) {
        console.error("❌ FUNCTION RETURNED ERROR:", data.error);
        throw new Error(data.error || 'Failed to allot batch');
      }

      // Success!
      alert('✅ Batch allotted successfully! Magic link sent to student.');
      
      // Reset form
      setFormData({
        email: '',
        student_name: '',
        phone: '',
        batch_id: '',
        payment_id: ''
      });

      // Refresh the page data
      window.location.reload();
      
    } catch (err: any) {
      console.error("❌ ALLOT ERROR:", err);
      const errorMsg = err.message || 'An unexpected error occurred';
      setErrorMessage(errorMsg);
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setProcessing(false);
    }
  };

  const selectPending = (payment: Payment) => {
    setFormData({
      email: payment.email,
      student_name: payment.student_name,
      phone: payment.phone,
      batch_id: payment.batch_id.toString(),
      payment_id: payment.payment_id.toString()
    });
    setErrorMessage(''); // Clear any previous errors
  };

  const filteredStudents = students.filter(s => 
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading allot batches panel...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col fixed h-full z-20">
        <div className="p-6 text-white font-black text-2xl border-b border-gray-800">ADMIN</div>
        <nav className="p-4 flex-grow space-y-1">
          <Link to="/admin/dashboard" className="block p-3 rounded-lg hover:bg-gray-800 transition">
            Dashboard Overview
          </Link>
          <Link to="/admin/allot-batches" className="block p-3 rounded-lg bg-indigo-600 text-white font-bold">
            Allot Batches
          </Link>
          <button 
            className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition" 
            onClick={() => navigate('/admin/dashboard')}
          >
            Back to Dashboard
          </button>
        </nav>
      </aside>

      <main className="ml-64 flex-grow p-10">
        <h1 className="text-3xl font-black text-gray-900 mb-8">Allot Batches</h1>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            <p className="font-bold">Error:</p>
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-6">New Allotment</h2>
              <form onSubmit={handleAllot} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Student Email <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                    placeholder="student@gmail.com" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Student Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={formData.student_name} 
                    onChange={e => setFormData({...formData, student_name: e.target.value})} 
                    className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                    placeholder="Full Name" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required 
                    type="tel" 
                    pattern="[0-9]{10}"
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                    placeholder="10 digit phone" 
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter 10 digits without spaces or special characters</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Select Batch <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required 
                    value={formData.batch_id} 
                    onChange={e => setFormData({...formData, batch_id: e.target.value})} 
                    className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select a batch</option>
                    {batches.map(b => (
                      <option key={b.batch_id} value={b.batch_id}>
                        {b.batch_name.toUpperCase()} (₹{b.cost})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <button 
                    disabled={processing} 
                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing Allotment...
                      </span>
                    ) : (
                      "Allot Batch & Send Magic Link"
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Students Table */}
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">All Students ({filteredStudents.length})</h2>
                <input 
                  type="text" 
                  placeholder="Search name or email..." 
                  className="border border-gray-300 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <tr>
                      <th className="p-6">Student</th>
                      <th className="p-6">Batch</th>
                      <th className="p-6">Status</th>
                      <th className="p-6">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-gray-500">
                          No students found
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map(student => (
                        <tr key={student.user_id} className="hover:bg-gray-50 transition">
                          <td className="p-6">
                            <div className="font-bold text-gray-900">{student.student_name}</div>
                            <div className="text-xs text-gray-400">{student.email}</div>
                          </td>
                          <td className="p-6">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full capitalize">
                              {student.batches?.batch_name || 'N/A'}
                            </span>
                          </td>
                          <td className="p-6">
                            <span className={`text-xs font-bold ${student.account_status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
                              {student.account_status?.toUpperCase() || 'UNKNOWN'}
                            </span>
                          </td>
                          <td className="p-6 text-sm text-gray-500">
                            {student.last_login ? new Date(student.last_login).toLocaleDateString() : 'Never'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Pending Side Panel */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Pending Allotments ({pendingPayments.length})</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {pendingPayments.length === 0 && (
                <p className="text-gray-400 italic text-center py-8">No pending payments.</p>
              )}
              {pendingPayments.map(p => (
                <div 
                  key={p.payment_id} 
                  onClick={() => selectPending(p)} 
                  className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-500 hover:shadow-md transition group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">New Order</span>
                    <span className="text-xs text-gray-400">₹{p.amount_paid}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition">{p.student_name}</h4>
                  <p className="text-xs text-gray-500 mb-4">{p.email}</p>
                  <div className="flex items-center text-indigo-600 text-xs font-bold">
                    <span>Click to autofill form</span>
                    <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AllotBatches;