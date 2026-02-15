import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'Missing environment variables' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { payment_id, batch_id, password } = body;

    if (!payment_id || !batch_id || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: payment_id, batch_id, password',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (String(password).length < 6) {
      return new Response(JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const batchIdNum = Number(batch_id);
    const paymentIdNum = Number(payment_id);

    if (Number.isNaN(batchIdNum) || Number.isNaN(paymentIdNum)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid payment_id or batch_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: paymentRow, error: paymentError } = await supabase
      .from('payments')
      .select('payment_id, student_name, phone, email, access_granted')
      .eq('payment_id', paymentIdNum)
      .single();

    if (paymentError || !paymentRow) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment record not found for the given payment_id' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (paymentRow.access_granted) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access already granted for this payment' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: paymentRow.email,
      password,
      email_confirm: true,
      user_metadata: { role: 'student' },
    });

    if (authError || !authData?.user) {
      throw new Error(`Failed to create auth user: ${authError?.message || 'Unknown error'}`);
    }

    const { error: insertUserError } = await supabase.from('users').insert({
      user_id: authData.user.id,
      email: paymentRow.email,
      student_name: paymentRow.student_name,
      phone: paymentRow.phone,
      batch_id: batchIdNum,
      payment_id: paymentRow.payment_id,
      account_status: 'active',
      youtube_channel_added: false,
    });

    if (insertUserError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create user profile: ${insertUserError.message}`);
    }

    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({ access_granted: true, batch_id: batchIdNum })
      .eq('payment_id', paymentIdNum);

    if (updatePaymentError) {
      throw new Error(`Failed to update payment access: ${updatePaymentError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authData.user.id,
        message: 'Student created and access granted successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
