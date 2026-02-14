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
    const { email, password, batch_id, student_name, phone, payment_id } = body;

    if (!email || !password || !batch_id || !student_name || !phone) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: email, password, batch_id, student_name, phone',
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
    const paymentIdNum = payment_id ? Number(payment_id) : null;

    if (Number.isNaN(batchIdNum)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid batch_id' }), {
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

    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Database error: ${checkError.message}`);
    }

    if (existingUser) {
      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          batch_id: batchIdNum,
          payment_id: paymentIdNum,
          student_name,
          phone,
        })
        .eq('user_id', existingUser.user_id);

      if (updateUserError) {
        throw new Error(`Failed to update student profile: ${updateUserError.message}`);
      }

      const { error: updatePasswordError } = await supabase.auth.admin.updateUserById(existingUser.user_id, {
        password,
      });

      if (updatePasswordError) {
        throw new Error(`Failed to update password: ${updatePasswordError.message}`);
      }

      if (paymentIdNum) {
        const { error: updatePaymentError } = await supabase
          .from('payments')
          .update({ access_granted: true })
          .eq('payment_id', paymentIdNum);

        if (updatePaymentError) {
          throw new Error(`Failed to update payment access: ${updatePaymentError.message}`);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Existing student updated with password access' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'student' },
    });

    if (authError || !authData?.user) {
      throw new Error(`Failed to create auth user: ${authError?.message || 'Unknown error'}`);
    }

    const { error: insertUserError } = await supabase.from('users').insert({
      user_id: authData.user.id,
      email,
      student_name,
      phone,
      batch_id: batchIdNum,
      payment_id: paymentIdNum,
      account_status: 'active',
      youtube_channel_added: false,
    });

    if (insertUserError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create user profile: ${insertUserError.message}`);
    }

    if (paymentIdNum) {
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({ access_granted: true })
        .eq('payment_id', paymentIdNum);

      if (updatePaymentError) {
        throw new Error(`Failed to update payment access: ${updatePaymentError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authData.user.id,
        message: 'Student created with password login access',
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
