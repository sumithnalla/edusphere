
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Batch } from '../types/database';
import Navbar from '../components/Navbar';

const Landing: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBatches = async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('is_active', true);
      
      if (data) setBatches(data);
      setLoading(false);
    };
    fetchBatches();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-20 px-4 bg-indigo-600 text-white text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Master EAMCET with Eduspace</h1>
          <p className="text-xl opacity-90 mb-10">High-quality live classes, comprehensive tests, and personalized doubt clearing sessions.</p>
          <a href="#courses" className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition">View Batches</a>
        </div>
      </section>

      {/* Course Cards */}
      <section id="courses" className="py-20 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Choose Your Path</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {batches.map((batch) => (
            <div key={batch.batch_id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition hover:shadow-xl flex flex-col">
              <div className="p-8 flex-grow">
                <div className="flex justify-between items-center mb-4">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-600 text-xs font-bold uppercase rounded-full tracking-wider">
                    {batch.duration_months} Months
                  </span>
                  <span className="text-2xl font-bold">₹{batch.cost}</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 capitalize">{batch.batch_name} Batch</h3>
                <ul className="space-y-3">
                  {batch.features.split(',').map((feature, idx) => (
                    <li key={idx} className="flex items-start text-gray-600">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {feature.trim()}
                    </li>
                  ))}
                  {batch.has_doubts_access && (
                    <li className="flex items-start text-gray-600">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Exclusive Doubt Support
                    </li>
                  )}
                </ul>
              </div>
              <div className="p-8 bg-gray-50 border-t">
                <button 
                  onClick={() => navigate(`/payment?batch_id=${batch.batch_id}`)}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
                >
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer id="contact" className="bg-gray-900 text-white py-12 px-4 text-center">
        <p className="opacity-70">&copy; 2026 Eduspace EAMCET Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
