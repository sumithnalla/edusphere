// supabase/functions/submit-test/index.ts

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
    const { user_id, exam_id, responses, started_at } = await req.json()
    // responses format: [{ question_id, selected_option }, ...]

    // Validate input
    if (!user_id || !exam_id || !responses || !started_at) {
      throw new Error('Missing required fields')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get correct answers for this exam
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('question_id, correct_option')
      .eq('exam_id', exam_id)

    if (questionsError) {
      console.error('Questions fetch error:', questionsError)
      throw new Error(`Failed to fetch questions: ${questionsError.message}`)
    }

    if (!questions || questions.length === 0) {
      throw new Error('No questions found for this exam')
    }

    // Calculate score
    let correct = 0, wrong = 0, unanswered = 0
    const responsesMap = new Map(responses.map(r => [r.question_id, r.selected_option]))
    
    const studentResponses = questions.map(q => {
      const selected = responsesMap.get(q.question_id)
      const is_correct = selected ? selected === q.correct_option : false
      
      if (!selected) {
        unanswered++
      } else if (is_correct) {
        correct++
      } else {
        wrong++
      }

      return {
        user_id,
        question_id: q.question_id,
        selected_option: selected || null,
        is_correct
      }
    })

    // Bulk upsert student responses
    const { error: responsesError } = await supabase
      .from('student_responses')
      .upsert(studentResponses, { onConflict: 'user_id,question_id' })

    if (responsesError) {
      console.error('Responses upsert error:', responsesError)
      throw new Error(`Failed to save responses: ${responsesError.message}`)
    }

    // Calculate time taken
    const submitted_at = new Date()
    const started_time = new Date(started_at)
    const time_taken = Math.floor((submitted_at.getTime() - started_time.getTime()) / 60000) // minutes

    // Insert/Update exam attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .upsert({
        user_id,
        exam_id,
        score: correct,
        total_questions: questions.length,
        correct_answers: correct,
        wrong_answers: wrong,
        unanswered,
        started_at,
        submitted_at: submitted_at.toISOString(),
        time_taken_minutes: time_taken
      }, { onConflict: 'user_id,exam_id' })
      .select()
      .single()

    if (attemptError) {
      console.error('Exam attempt error:', attemptError)
      throw new Error(`Failed to record exam attempt: ${attemptError.message}`)
    }

    console.log('Test submitted successfully:', {
      user_id,
      exam_id,
      score: correct,
      total: questions.length
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        score: correct,
        total_questions: questions.length,
        correct,
        wrong,
        unanswered,
        time_taken_minutes: time_taken,
        message: 'Test submitted successfully'
      }),
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Submit test error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})