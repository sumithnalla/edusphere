import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')

// ✅ Correct CORS headers for supabase.functions.invoke
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log('🔥 FUNCTION HIT', req.method)

  // ✅ Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('🟡 CORS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('🔑 ENV CHECK', {
    hasKeyId: !!RAZORPAY_KEY_ID,
    hasKeySecret: !!RAZORPAY_KEY_SECRET
  })

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.error('❌ Razorpay env vars missing')
    return new Response(
      JSON.stringify({ success: false, error: 'Razorpay keys not configured' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  let body
  try {
    body = await req.json()
    console.log('📦 BODY RECEIVED', body)
  } catch {
    console.error('❌ Invalid JSON')
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON body' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const { batch_id, student_name, email, phone, amount } = body

    if (!batch_id || !student_name || !email || !phone || !amount) {
      throw new Error('Missing required fields')
    }

    console.log('💳 Creating Razorpay order…')

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount * 100, // paise
        currency: 'INR',
        receipt: `order_${Date.now()}`,
        notes: { batch_id, student_name, email, phone }
      })
    })

    console.log('📡 Razorpay status:', razorpayResponse.status)

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.json()
      console.error('❌ Razorpay error:', errorData)
      throw new Error(errorData.error?.description || 'Razorpay API error')
    }

    const order = await razorpayResponse.json()
    console.log('✅ Order created:', order.id)

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        key_id: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('🔥 Create order error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
