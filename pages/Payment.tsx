
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Batch } from '../types/database';

const Payment: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const batchId = searchParams.get('batch_id');

  const [batch, setBatch] = useState<Batch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!batchId) {
      navigate('/');
      return;
    }
    const fetchBatch = async () => {
      const { data } = await supabase
        .from('batches')
        .select('*')
        .eq('batch_id', batchId)
        .single();
      if (data) setBatch(data);
      setLoading(false);
    };
    fetchBatch();
  }, [batchId, navigate]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;

    setProcessing(true);
    try {
      // 1. Create Razorpay order via Edge Function
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          batch_id: batch.batch_id,
          student_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          amount: batch.cost
        }
      });

      if (orderError || !orderData.success) {
        throw new Error(orderError?.message || orderData?.error || 'Failed to create order');
      }

      // 2. Configure Razorpay Checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Eduspace EAMCET",
        description: `Enrollment for ${batch.batch_name} Batch`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          // 3. Verify payment via Edge Function
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              student_name: formData.name,
              email: formData.email,
              phone: formData.phone,
              batch_id: batch.batch_id,
              amount: batch.cost
            }
          });

          if (verifyError || !verifyData.success) {
            alert("Payment verification failed! Please contact support.");
          } else {
            navigate(`/payment-success?payment_id=${verifyData.payment_id}`);
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone
        },
        theme: { color: "#4f46e5" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading batch details...</div>;
  if (!batch) return <div className="p-10 text-center">Batch not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left: Form */}
        <div className="flex-1 p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-6">Enroll Now</h2>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                placeholder="Student Name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
              <input 
                required
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                placeholder="example@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
              <input 
                required
                type="tel" 
                pattern="[0-9]{10}"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                placeholder="10 digit number"
              />
            </div>
            <button 
              disabled={processing}
              type="submit" 
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center disabled:opacity-50"
            >
              {processing ? "Processing..." : `Pay ₹${batch.cost} Now`}
            </button>
          </form>
        </div>

        {/* Right: Summary */}
        <div className="md:w-80 bg-indigo-600 text-white p-8 md:p-12">
          <h3 className="text-xl font-bold mb-6">Order Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-indigo-500 pb-2">
              <span className="opacity-80">Batch</span>
              <span className="font-bold capitalize">{batch.batch_name}</span>
            </div>
            <div className="flex justify-between border-b border-indigo-500 pb-2">
              <span className="opacity-80">Duration</span>
              <span>{batch.duration_months} Months</span>
            </div>
            <div className="flex justify-between pt-4 text-2xl font-bold">
              <span>Total</span>
              <span>₹{batch.cost}</span>
            </div>
          </div>
          <div className="mt-12 text-sm opacity-80 leading-relaxed">
            <p>Secured payment powered by Razorpay. Access will be granted within 2 hours of payment.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
