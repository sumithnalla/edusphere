import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Batch, UserProfile, Payment } from '../types/database';

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
    payment_id: '',
    password: '',
    batch_id: '',
  });

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.app_metadata?.role;
    if (!user || role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    const [batchesRes, pendingRes, studentsRes] = await Promise.all([
      supabase.from('batches').select('*').eq('is_active', true),
      supabase.from('payments').select('*').eq('payment_status', 'success').eq('access_granted', false),
      supabase.from('users').select('*, batches(*)').order('created_at', { ascending: false }),
    ]);

    if (batchesRes.data) setBatches(batchesRes.data);
    if (pendingRes.data) setPendingPayments(pendingRes.data);
    if (studentsRes.data) setStudents(studentsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAllot = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setErrorMessage('');

    try {
      if (!formData.payment_id || !formData.password || !formData.batch_id) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const payload = {
        payment_id: Number(formData.payment_id),
        password: formData.password,
        batch_id: Number(formData.batch_id),
      };

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('allot-batch', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        const anyErr: any = error;
        const bodyText =
          anyErr?.context?.body ||
          anyErr?.context?.response?.body ||
          anyErr?.body ||
          null;

        if (typeof bodyText === 'string') {
          try {
            const parsed = JSON.parse(bodyText);
            throw new Error(parsed?.error || error.message);
          } catch {
            throw new Error(bodyText || error.message);
          }
        }

        throw new Error(error.message);
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to allot batch');
      }

      alert('Batch allotted successfully. Student can login with email and password.');

      setFormData({
        payment_id: '',
        password: '',
        batch_id: '',
      });

      await loadData();
    } catch (err: any) {
      const message = err?.message || 'Unexpected error occurred';
      setErrorMessage(message);
      alert(`Error: ${message}`);
    } finally {
      setProcessing(false);
    }
  };

  const selectPending = (payment: Payment) => {
    setFormData({
      payment_id: payment.payment_id.toString(),
      password: '',
      batch_id: payment.batch_id.toString(),
    });
    setErrorMessage('');
  };

  const filteredStudents = students.filter(
    (student) =>
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading allot batches panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
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

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            <p className="font-bold">Error:</p>
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-6">New Allotment</h2>
              <form onSubmit={handleAllot} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Payment ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={formData.payment_id}
                    onChange={(e) => setFormData({ ...formData, payment_id: e.target.value })}
                    className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Select from pending list"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Student Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Select Batch <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.batch_id}
                    onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                    className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select a batch</option>
                    {batches.map((batch) => (
                      <option key={batch.batch_id} value={batch.batch_id}>
                        {batch.batch_name.toUpperCase()} (Rs.{batch.cost})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <button
                    disabled={processing}
                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Processing Allotment...' : 'Allot Batch with Password Access'}
                  </button>
                </div>
              </form>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">All Students ({filteredStudents.length})</h2>
                <input
                  type="text"
                  placeholder="Search name or email..."
                  className="border border-gray-300 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                      filteredStudents.map((student) => (
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

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Pending Allotments ({pendingPayments.length})</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {pendingPayments.length === 0 && (
                <p className="text-gray-400 italic text-center py-8">No pending payments.</p>
              )}
              {pendingPayments.map((payment) => (
                <div
                  key={payment.payment_id}
                  onClick={() => selectPending(payment)}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-500 hover:shadow-md transition group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">New Order</span>
                    <span className="text-xs text-gray-400">Rs.{payment.amount_paid}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition">{payment.student_name}</h4>
                  <p className="text-xs text-gray-500 mb-4">{payment.email}</p>
                  <p className="text-xs text-indigo-600 font-bold">Click to autofill form</p>
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
