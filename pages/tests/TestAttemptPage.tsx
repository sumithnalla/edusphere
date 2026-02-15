import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type Option = 'A' | 'B' | 'C' | 'D';

interface ExamRow {
  exam_id: number;
  exam_name: string;
  duration_minutes: number;
  total_questions: number;
}

interface QuestionRow {
  question_id: number;
  exam_id: number;
  subject: 'maths' | 'physics' | 'chemistry';
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface ResponseRow {
  question_id: number;
  selected_option: Option | null;
}

interface TestAttemptPageProps {
  userId: string;
}

const OPTIONS: Option[] = ['A', 'B', 'C', 'D'];

const TestAttemptPage: React.FC<TestAttemptPageProps> = ({ userId }) => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState<ExamRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answers, setAnswers] = useState<Record<number, Option | null>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const hasSubmittedRef = useRef(false);

  const examIdNum = useMemo(() => Number(examId), [examId]);

  useEffect(() => {
    const fetchExamData = async () => {
      if (!examId || Number.isNaN(examIdNum)) {
        setError('Invalid exam id.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const [{ data: examData, error: examError }, { data: questionsData, error: questionsError }] =
        await Promise.all([
          supabase
            .from('exams')
            .select('exam_id, exam_name, duration_minutes, total_questions')
            .eq('exam_id', examIdNum)
            .eq('is_active', true)
            .single(),
          supabase.from('questions').select('*').eq('exam_id', examIdNum).order('question_number', { ascending: true }),
        ]);

      if (examError || !examData) {
        setError(examError?.message || 'Exam not found.');
        setLoading(false);
        return;
      }

      if (questionsError || !questionsData?.length) {
        setError(questionsError?.message || 'No questions found for this exam.');
        setLoading(false);
        return;
      }

      const questionRows = questionsData as QuestionRow[];
      const questionIds = questionRows.map((q) => q.question_id);

      const { data: previousResponses, error: responsesError } = await supabase
        .from('student_responses')
        .select('question_id, selected_option')
        .eq('user_id', userId)
        .in('question_id', questionIds);

      if (responsesError) {
        setError(responsesError.message);
        setLoading(false);
        return;
      }

      const initialAnswers: Record<number, Option | null> = {};
      questionRows.forEach((q) => {
        initialAnswers[q.question_id] = null;
      });

      (previousResponses as ResponseRow[] | null)?.forEach((res) => {
        initialAnswers[res.question_id] = res.selected_option;
      });

      setExam(examData as ExamRow);
      setQuestions(questionRows);
      setAnswers(initialAnswers);
      setStartedAt(new Date().toISOString());
      setTimeLeft((examData.duration_minutes || 180) * 60);
      setLoading(false);
    };

    fetchExamData();
  }, [examId, examIdNum, userId]);

  useEffect(() => {
    if (loading || submitting) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [loading, submitting]);

  const saveSingleAnswer = async (questionId: number, selectedOption: Option | null) => {
    const { error: saveError } = await supabase.from('student_responses').upsert(
      {
        user_id: userId,
        question_id: questionId,
        selected_option: selectedOption,
        is_correct: null,
      },
      { onConflict: 'user_id,question_id' }
    );

    if (saveError) {
      setError(`Auto-save failed: ${saveError.message}`);
      return;
    }

    setLastSavedAt(new Date().toLocaleTimeString());
  };

  const saveAllAnswers = async () => {
    if (!questions.length) return;

    const rows = questions.map((q) => ({
      user_id: userId,
      question_id: q.question_id,
      selected_option: answers[q.question_id] || null,
      is_correct: null as boolean | null,
    }));

    setSaving(true);
    const { error: saveError } = await supabase.from('student_responses').upsert(rows, {
      onConflict: 'user_id,question_id',
    });
    setSaving(false);

    if (saveError) {
      setError(`Periodic auto-save failed: ${saveError.message}`);
      return;
    }

    setLastSavedAt(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    if (loading || submitting || !questions.length) return;

    const intervalId = setInterval(() => {
      saveAllAnswers();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [answers, loading, questions, submitting]);

  const handleSubmit = async (autoSubmitted = false) => {
    if (submitting || hasSubmittedRef.current) return;

    if (!autoSubmitted) {
      const confirmed = window.confirm('Submit test now? You can retake later if needed.');
      if (!confirmed) return;
    }

    hasSubmittedRef.current = true;
    setSubmitting(true);

    const responsePayload = questions.map((question) => ({
      question_id: question.question_id,
      selected_option: answers[question.question_id] || null,
    }));

    const { data, error: submitError } = await supabase.functions.invoke('submit-test', {
      body: {
        user_id: userId,
        exam_id: examIdNum,
        responses: responsePayload,
        started_at: startedAt || new Date().toISOString(),
      },
    });

    if (submitError || !data?.success) {
      let submitMessage = data?.error || submitError?.message || 'Failed to submit test.';

      if (submitError) {
        const anyErr: any = submitError;
        const bodyText =
          anyErr?.context?.body ||
          anyErr?.context?.response?.body ||
          anyErr?.body ||
          null;

        if (typeof bodyText === 'string') {
          try {
            const parsed = JSON.parse(bodyText);
            submitMessage = parsed?.error || submitMessage;
          } catch {
            submitMessage = bodyText || submitMessage;
          }
        }
      }

      setSubmitting(false);
      hasSubmittedRef.current = false;
      setError(submitMessage);
      return;
    }

    navigate(`/dashboard/test/${examIdNum}/result`);
  };

  useEffect(() => {
    if (loading || submitting) return;
    if (timeLeft > 0) return;
    handleSubmit(true);
  }, [loading, submitting, timeLeft]);

  if (loading) return <p className="text-gray-500">Loading test...</p>;
  if (error) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-red-100">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/dashboard/tests" className="text-indigo-600 font-semibold hover:underline">
          Back to Tests
        </Link>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-100">
        <p className="text-gray-600 mb-4">Exam data unavailable.</p>
        <Link to="/dashboard/tests" className="text-indigo-600 font-semibold hover:underline">
          Back to Tests
        </Link>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter((q) => Boolean(answers[q.question_id])).length;

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  const getOptionText = (question: QuestionRow, option: Option) => {
    if (option === 'A') return question.option_a;
    if (option === 'B') return question.option_b;
    if (option === 'C') return question.option_c;
    return question.option_d;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{exam.exam_name}</h1>
          <p className="text-sm text-gray-500">
            Answered {answeredCount}/{questions.length}
            {lastSavedAt ? ` • Last saved at ${lastSavedAt}` : ''}
            {saving ? ' • Saving...' : ''}
          </p>
        </div>
        <div className={`text-2xl font-bold ${timeLeft <= 300 ? 'text-red-600' : 'text-indigo-700'}`}>
          {mins}:{secs}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <aside className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="font-bold text-gray-900 mb-4">Question Navigator</h2>
          <div className="grid grid-cols-8 gap-2">
            {questions.map((question, index) => {
              const isCurrent = index === currentIndex;
              const isAnswered = Boolean(answers[question.question_id]);
              const isMarked = Boolean(marked[question.question_id]);

              let buttonClass = 'bg-gray-100 text-gray-700';
              if (isAnswered) buttonClass = 'bg-green-100 text-green-700';
              if (isMarked) buttonClass = 'bg-amber-100 text-amber-700';
              if (isCurrent) buttonClass = 'bg-indigo-600 text-white';

              return (
                <button
                  key={question.question_id}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-9 w-9 rounded-md text-xs font-bold transition ${buttonClass}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 font-bold">
                {currentQuestion.subject} • Question {currentIndex + 1}
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mt-1">{currentQuestion.question_text}</h3>
            </div>
            <button
              onClick={() =>
                setMarked((prev) => ({
                  ...prev,
                  [currentQuestion.question_id]: !prev[currentQuestion.question_id],
                }))
              }
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                marked[currentQuestion.question_id]
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {marked[currentQuestion.question_id] ? 'Marked' : 'Mark for Review'}
            </button>
          </div>

          <div className="space-y-3">
            {OPTIONS.map((option) => {
              const selected = answers[currentQuestion.question_id] === option;
              return (
                <button
                  key={option}
                  onClick={() => {
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.question_id]: option,
                    }));
                    saveSingleAnswer(currentQuestion.question_id, option);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="font-bold mr-2">{option}.</span>
                  {getOptionText(currentQuestion, option)}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-3 justify-between">
            <div className="flex gap-3">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={currentIndex === questions.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Test'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TestAttemptPage;
