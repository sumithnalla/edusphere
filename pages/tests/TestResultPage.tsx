import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type Option = 'A' | 'B' | 'C' | 'D';

interface ExamRow {
  exam_id: number;
  exam_name: string;
  total_questions: number;
}

interface AttemptRow {
  score: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  time_taken_minutes: number;
  submitted_at: string;
}

interface QuestionRow {
  question_id: number;
  question_number: number;
  subject: 'maths' | 'physics' | 'chemistry';
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: Option;
}

interface ResponseRow {
  question_id: number;
  selected_option: Option | null;
  is_correct: boolean | null;
}

interface ReviewItem {
  question: QuestionRow;
  response: ResponseRow | null;
}

interface TestResultPageProps {
  userId: string;
}

const OPTIONS: Option[] = ['A', 'B', 'C', 'D'];

const TestResultPage: React.FC<TestResultPageProps> = ({ userId }) => {
  const { examId } = useParams();
  const examIdNum = Number(examId);

  const [exam, setExam] = useState<ExamRow | null>(null);
  const [attempt, setAttempt] = useState<AttemptRow | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      if (!examId || Number.isNaN(examIdNum)) {
        setError('Invalid exam id.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const [{ data: examData, error: examError }, { data: attemptData, error: attemptError }, { data: questionsData, error: questionsError }] =
        await Promise.all([
          supabase.from('exams').select('exam_id, exam_name, total_questions').eq('exam_id', examIdNum).single(),
          supabase
            .from('exam_attempts')
            .select('score, total_questions, correct_answers, wrong_answers, unanswered, time_taken_minutes, submitted_at')
            .eq('user_id', userId)
            .eq('exam_id', examIdNum)
            .single(),
          supabase
            .from('questions')
            .select('question_id, question_number, subject, question_text, option_a, option_b, option_c, option_d, correct_option')
            .eq('exam_id', examIdNum)
            .order('question_number', { ascending: true }),
        ]);

      if (examError || !examData) {
        setError(examError?.message || 'Exam not found.');
        setLoading(false);
        return;
      }

      if (attemptError || !attemptData) {
        setError(attemptError?.message || 'No attempt found for this exam.');
        setLoading(false);
        return;
      }

      if (questionsError || !questionsData) {
        setError(questionsError?.message || 'Failed to fetch questions.');
        setLoading(false);
        return;
      }

      const questionRows = questionsData as QuestionRow[];
      const questionIds = questionRows.map((q) => q.question_id);

      const { data: responsesData, error: responsesError } = await supabase
        .from('student_responses')
        .select('question_id, selected_option, is_correct')
        .eq('user_id', userId)
        .in('question_id', questionIds);

      if (responsesError) {
        setError(responsesError.message);
        setLoading(false);
        return;
      }

      const responseMap = new Map<number, ResponseRow>();
      (responsesData as ResponseRow[] | null)?.forEach((res) => {
        responseMap.set(res.question_id, res);
      });

      const merged: ReviewItem[] = questionRows.map((question) => ({
        question,
        response: responseMap.get(question.question_id) || null,
      }));

      setExam(examData as ExamRow);
      setAttempt(attemptData as AttemptRow);
      setReviewItems(merged);
      setLoading(false);
    };

    fetchResult();
  }, [examId, examIdNum, userId]);

  const accuracy = useMemo(() => {
    if (!attempt || !attempt.total_questions) return 0;
    return Math.round((attempt.correct_answers / attempt.total_questions) * 100);
  }, [attempt]);

  const getOptionText = (question: QuestionRow, option: Option) => {
    if (option === 'A') return question.option_a;
    if (option === 'B') return question.option_b;
    if (option === 'C') return question.option_c;
    return question.option_d;
  };

  if (loading) return <p className="text-gray-500">Loading result...</p>;
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/dashboard/tests" className="text-indigo-600 font-semibold hover:underline">
          Back to Tests
        </Link>
      </div>
    );
  }

  if (!exam || !attempt) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <p className="text-gray-600 mb-4">Result not available.</p>
        <Link to="/dashboard/tests" className="text-indigo-600 font-semibold hover:underline">
          Back to Tests
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam.exam_name} - Result</h1>
        <p className="text-gray-500 mb-6">Submitted on {new Date(attempt.submitted_at).toLocaleString()}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-indigo-50 rounded-xl p-4">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Score</p>
            <p className="text-2xl font-bold text-indigo-800 mt-1">
              {attempt.score}/{attempt.total_questions}
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs font-bold text-green-500 uppercase tracking-wide">Correct</p>
            <p className="text-2xl font-bold text-green-800 mt-1">{attempt.correct_answers}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wide">Wrong</p>
            <p className="text-2xl font-bold text-red-800 mt-1">{attempt.wrong_answers}</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Unanswered</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{attempt.unanswered}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Time / Accuracy</p>
            <p className="text-lg font-bold text-amber-800 mt-1">
              {attempt.time_taken_minutes} mins • {accuracy}%
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={`/dashboard/test/${exam.exam_id}/attempt`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Retake Test
          </Link>
          <Link
            to="/dashboard/tests"
            className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            Back to Tests
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {reviewItems.map(({ question, response }, index) => {
          const selectedOption = response?.selected_option || null;

          return (
            <div key={question.question_id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs uppercase tracking-wide text-gray-400 font-bold mb-2">
                Q{index + 1} • {question.subject}
              </p>
              <h3 className="text-base font-semibold text-gray-900 mb-4">{question.question_text}</h3>

              <div className="space-y-2">
                {OPTIONS.map((option) => {
                  const isCorrect = option === question.correct_option;
                  const isStudentWrong = selectedOption === option && selectedOption !== question.correct_option;

                  let classes = 'border-gray-200 bg-white text-gray-800';
                  if (isCorrect) classes = 'border-green-300 bg-green-50 text-green-800';
                  if (isStudentWrong) classes = 'border-red-300 bg-red-50 text-red-800';

                  return (
                    <div key={option} className={`border rounded-lg px-3 py-2 text-sm ${classes}`}>
                      <span className="font-bold mr-2">{option}.</span>
                      {getOptionText(question, option)}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 text-sm">
                {selectedOption ? (
                  <p className={selectedOption === question.correct_option ? 'text-green-700' : 'text-red-700'}>
                    Your Answer: <span className="font-semibold">{selectedOption}</span>
                  </p>
                ) : (
                  <p className="text-gray-500">Your Answer: Unanswered</p>
                )}
                <p className="text-green-700">
                  Correct Answer: <span className="font-semibold">{question.correct_option}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TestResultPage;

