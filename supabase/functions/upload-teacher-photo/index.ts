// supabase/functions/upload-teacher-photo/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { file_base64, file_name, content_type } = await req.json()

    // Validate input
    if (!file_base64 || !file_name) {
      throw new Error('Missing file data or filename')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Decode base64
    const file_data = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0))

    // Generate unique filename
    const timestamp = Date.now()
    const sanitized_name = file_name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const file_path = `teacher-photos/${timestamp}_${sanitized_name}`

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('teacher-photos')
      .upload(file_path, file_data, {
        contentType: content_type || 'image/jpeg',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    // Get public URL
    const { data: publicURL } = supabase.storage
      .from('teacher-photos')
      .getPublicUrl(file_path)

    console.log('File uploaded successfully:', publicURL.publicUrl)

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicURL.publicUrl,
        path: file_path,
        message: 'Photo uploaded successfully'
      }),
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Upload photo error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})