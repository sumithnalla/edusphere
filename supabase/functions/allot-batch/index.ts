import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    // Keep this aligned with supabase.functions.invoke expectations
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  console.log("🔥🔥🔥 FUNCTION ENTERED")
  console.log("🔥 METHOD:", req.method)

  // ---------- CORS ----------
  if (req.method === "OPTIONS") {
    console.log("🟡 CORS PREFLIGHT HIT")
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    console.error("❌ INVALID METHOD")
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // ---------- ENV CHECK ----------
  console.log("🔑 ENV CHECK", {
    hasUrl: !!SUPABASE_URL,
    hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  })

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ ENV VARS MISSING")
    return new Response(
      JSON.stringify({ success: false, error: "Environment variables missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // ---------- BODY PARSE ----------
  let body: any
  try {
    body = await req.json()
    console.log("📦 BODY RECEIVED:", body)
  } catch (e) {
    console.error("❌ JSON PARSE FAILED", e)
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // ---------- EXTRACT AND VALIDATE ----------
  const { email, batch_id, student_name, phone, payment_id } = body

  console.log("🧪 VALIDATION DATA", {
    email,
    batch_id,
    student_name,
    phone,
    payment_id,
  })

  if (!email || !batch_id || !student_name || !phone) {
    console.error("❌ VALIDATION FAILED - Missing fields")
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Missing required fields: email, batch_id, student_name, phone" 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // Convert to proper types
  const batchIdNum = Number(batch_id)
  const paymentIdNum = payment_id ? Number(payment_id) : null

  if (isNaN(batchIdNum)) {
    console.error("❌ INVALID BATCH_ID")
    return new Response(
      JSON.stringify({ success: false, error: "Invalid batch_id - must be a number" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // ---------- SUPABASE CLIENT ----------
  console.log("🧠 CREATING SUPABASE CLIENT")
  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  try {
    // ---------- CHECK EXISTING USER ----------
    console.log("🔍 CHECKING EXISTING USER")
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("user_id")
      .eq("email", email)
      .maybeSingle()

    console.log("🔍 EXISTING USER RESULT", { existingUser, checkError })

    if (checkError) {
      console.error("❌ USER CHECK FAILED", checkError)
      return new Response(
        JSON.stringify({ success: false, error: `Database error: ${checkError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ---------- EXISTING USER ----------
    if (existingUser) {
      console.log("✅ EXISTING USER FOUND - UPDATING")

      const { error: updateError } = await supabase
        .from("users")
        .update({
          batch_id: batchIdNum,
          payment_id: paymentIdNum,
          student_name: student_name,
          phone: phone,
        })
        .eq("email", email)

      console.log("✏️ USER UPDATE RESULT", updateError)

      if (updateError) {
        console.error("❌ USER UPDATE FAILED", updateError)
        return new Response(
          JSON.stringify({ success: false, error: `User update failed: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Update payment if payment_id provided
      if (paymentIdNum) {
        console.log("💰 UPDATING PAYMENT ACCESS")
        const { error: payErr } = await supabase
          .from("payments")
          .update({ access_granted: true })
          .eq("payment_id", paymentIdNum)

        console.log("💰 PAYMENT UPDATE RESULT", payErr)

        if (payErr) {
          console.error("❌ PAYMENT UPDATE FAILED", payErr)
          return new Response(
            JSON.stringify({ success: false, error: `Payment update failed: ${payErr.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
      }

      console.log("🎉 EXISTING USER FLOW COMPLETE")

      return new Response(
        JSON.stringify({
          success: true,
          message: "Existing student updated successfully",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ---------- NEW USER ----------
    console.log("🆕 CREATING NEW AUTH USER")

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { role: "student" },
      })

    console.log("🆕 AUTH CREATE RESULT", { 
      hasUser: !!authData?.user, 
      userId: authData?.user?.id,
      authError 
    })

    if (authError || !authData?.user) {
      console.error("❌ AUTH USER CREATION FAILED", authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Auth user creation failed: ${authError?.message || 'Unknown error'}` 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log("📥 INSERTING USER PROFILE")
    const { error: insertError } = await supabase.from("users").insert({
      user_id: authData.user.id,
      email,
      student_name,
      phone,
      batch_id: batchIdNum,
      payment_id: paymentIdNum,
      account_status: 'active',
      youtube_channel_added: false,
    })

    console.log("📥 USER INSERT RESULT", insertError)

    if (insertError) {
      console.error("❌ USER INSERT FAILED", insertError)
      return new Response(
        JSON.stringify({ success: false, error: `User insert failed: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Update payment if payment_id provided
    if (paymentIdNum) {
      console.log("💰 UPDATING PAYMENT ACCESS (NEW USER)")
      const { error: payErr } = await supabase
        .from("payments")
        .update({ access_granted: true })
        .eq("payment_id", paymentIdNum)

      console.log("💰 PAYMENT UPDATE RESULT", payErr)

      if (payErr) {
        console.error("❌ PAYMENT UPDATE FAILED", payErr)
        return new Response(
          JSON.stringify({ success: false, error: `Payment update failed: ${payErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    }

    console.log("🔗 GENERATING MAGIC LINK")
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${
            req.headers.get("origin") || "http://localhost:3000"
          }/dashboard`,
        },
      })

    console.log("🔗 MAGIC LINK RESULT", { 
      hasLink: !!linkData?.properties?.action_link, 
      linkError 
    })

    if (linkError) {
      console.error("⚠️ MAGIC LINK GENERATION FAILED (non-fatal)", linkError)
    }

    console.log("🎉 NEW USER FLOW COMPLETE")

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authData.user.id,
        message: "Student allotted successfully",
        magic_link: linkData?.properties?.action_link,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: any) {
    console.error("❌ UNEXPECTED ERROR", error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Unexpected error: ${error.message || 'Unknown error'}` 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})