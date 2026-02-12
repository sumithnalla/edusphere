
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Payment } from '../types/database';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) return;
    const fetchPayment = async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, batches(*)')
        .eq('payment_id', paymentId)
        .single();
      if (data) setPayment(data);
      setLoading(false);
    };
    fetchPayment();
  }, [paymentId]);

  if (loading) return <div className="p-20 text-center">Verifying confirmation...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border-t-8 border-green-500">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold mb-2 text-gray-800">Payment Successful!</h2>
        <p className="text-gray-600 mb-8">Thank you for purchasing the <strong>{payment?.batches?.batch_name}</strong> batch.</p>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Payment ID</span>
            <span className="font-mono text-gray-800">#{paymentId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Amount Paid</span>
            <span className="font-bold text-gray-800">₹{payment?.amount_paid}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Student</span>
            <span className="font-medium text-gray-800">{payment?.student_name}</span>
          </div>
        </div>

        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-10 leading-relaxed">
          <p><strong>Next Step:</strong> Our admin team will verify your details and allot your batch within <strong>2 hours</strong>. You will receive a magic link on your email <strong>{payment?.email}</strong> to login.</p>
        </div>

        <Link to="/" className="block w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition">
          Go back Home
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;
