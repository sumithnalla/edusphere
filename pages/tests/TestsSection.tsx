import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface ExamRow {
  exam_id: number;
  exam_name: string;
  total_questions: number;
  duration_minutes: number;
  conducted_date: string;
  is_active: boolean;
}

interface AttemptRow {
  exam_id: number;
  score: number;
  total_questions: number;
  submitted_at: string;
}

interface TestsSectionProps {
  userId: string;
}

const TestsSection: React.FC<TestsSectionProps> = ({ userId }) => {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      const [{ data: examsData, error: examsError }, { data: attemptsData, error: attemptsError }] =
        await Promise.all([
          supabase.from('exams').select('*').eq('is_active', true).order('conducted_date', { ascending: false }),
          supabase
            .from('exam_attempts')
            .select('exam_id, score, total_questions, submitted_at')
            .eq('user_id', userId),
        ]);

      if (examsError) {
        setError(examsError.message);
        setLoading(false);
        return;
      }

      if (attemptsError) {
        setError(attemptsError.message);
        setLoading(false);
        return;
      }

      setExams((examsData || []) as ExamRow[]);
      setAttempts((attemptsData || []) as AttemptRow[]);
      setLoading(false);
    };

    fetchData();
  }, [userId]);

  const attemptMap = useMemo(() => {
    const map = new Map<number, AttemptRow>();
    attempts.forEach((attempt) => {
      map.set(attempt.exam_id, attempt);
    });
    return map;
  }, [attempts]);

  if (loading) return <p className="text-gray-500">Loading tests...</p>;
  if (error) return <p className="text-red-600">Failed to load tests: {error}</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Tests</h1>
      <p className="text-gray-500 mb-8">Attempt tests, retake, and review detailed results.</p>

      {exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-gray-500">
          No active tests available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {exams.map((exam) => {
            const attempt = attemptMap.get(exam.exam_id);
            const attempted = Boolean(attempt);

            return (
              <div key={exam.exam_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{exam.exam_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Conducted: {new Date(exam.conducted_date).toLocaleDateString()}
                    </p>
                  </div>
                  {attempted && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                      Score: {attempt?.score}/{attempt?.total_questions || exam.total_questions}
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500">Questions</p>
                    <p className="font-semibold text-gray-900">{exam.total_questions}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500">Duration</p>
                    <p className="font-semibold text-gray-900">{exam.duration_minutes} mins</p>
                  </div>
                </div>

                {attempted && attempt?.submitted_at && (
                  <p className="text-xs text-gray-500 mt-4">
                    Last submitted on {new Date(attempt.submitted_at).toLocaleString()}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={`/dashboard/test/${exam.exam_id}/attempt`}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
                  >
                    {attempted ? 'Retake Test' : 'Attempt Test'}
                  </Link>

                  {attempted && (
                    <Link
                      to={`/dashboard/test/${exam.exam_id}/result`}
                      className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
                    >
                      View Result
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TestsSection;

