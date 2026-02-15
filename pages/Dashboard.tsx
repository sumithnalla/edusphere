import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/database';
import TestsSection from './tests/TestsSection';
import TestAttemptPage from './tests/TestAttemptPage';
import TestResultPage from './tests/TestResultPage';

type Subject = 'maths' | 'physics' | 'chemistry';

interface DailyClassRow {
  class_id: number;
  date: string;
  subject: Subject;
  teacher_name: string;
  teacher_photo_url: string | null;
  class_title: string;
  duration: string;
  youtube_live_link: string;
}

interface RecordedClassRow {
  recording_id: number;
  date: string;
  subject: Subject;
  teacher_name: string;
  teacher_photo_url: string | null;
  class_title: string;
  duration: string;
  youtube_video_link: string;
}

interface DoubtsClassRow {
  doubts_class_id: number;
  date: string;
  subject: 'maths' | 'physics' | 'chemistry' | 'general';
  teacher_name: string;
  class_title: string;
  time_slot: string;
  google_meet_link: string;
}

interface ExamAttemptRow {
  score: number;
  total_questions: number;
}

const SUBJECTS: Subject[] = ['maths', 'physics', 'chemistry'];

const getTodayISO = () => new Date().toISOString().split('T')[0];

const formatSubject = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const getRouteTitle = (pathname: string) => {
  if (pathname.includes('/test/') && pathname.includes('/attempt')) return 'Test Attempt';
  if (pathname.includes('/test/') && pathname.includes('/result')) return 'Test Result';
  if (pathname.includes('/tests')) return 'Tests';
  if (pathname.includes('/recordings')) return 'Recorded Classes';
  if (pathname.includes('/doubts')) return 'Doubts Classes';
  if (pathname.includes('/profile')) return 'Profile';
  return 'My Classes';
};

const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const checkAuthAndProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*, batches(*)')
        .eq('user_id', session.user.id)
        .single();

      if (!mounted) return;

      if (error || !data || data.account_status === 'suspended') {
        await supabase.auth.signOut();
        navigate('/login');
        return;
      }

      setProfile(data);
      setLoading(false);

      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', session.user.id);
    };

    checkAuthAndProfile();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const hasDoubtsAccess = Boolean(profile?.batches?.has_doubts_access);
  const pageTitle = useMemo(() => getRouteTitle(location.pathname), [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `block p-3 rounded-lg font-medium transition ${
      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <Link to="/" className="text-xl font-bold text-indigo-600">
            EDUSPACE
          </Link>
        </div>
        <nav className="p-4 flex-grow space-y-1">
          <NavLink to="/dashboard/classes" className={navClass}>
            My Classes
          </NavLink>
          <NavLink to="/dashboard/recordings" className={navClass}>
            Recorded Classes
          </NavLink>
          <NavLink to="/dashboard/tests" className={navClass}>
            Tests
          </NavLink>
          {hasDoubtsAccess && (
            <NavLink to="/dashboard/doubts" className={navClass}>
              Doubts Classes
            </NavLink>
          )}
          <NavLink to="/dashboard/profile" className={navClass}>
            Profile
          </NavLink>
        </nav>
      </aside>

      <main className="flex-grow flex flex-col">
        <header className="bg-white border-b h-16 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <h2 className="font-bold text-gray-800">{pageTitle}</h2>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase rounded-md tracking-wide">
              {profile.batches?.batch_name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Hi, {profile.student_name}</span>
            <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-red-600">
              Logout
            </button>
          </div>
        </header>

        <div className="p-8">
          <Routes>
            <Route index element={<Navigate to="classes" replace />} />
            <Route path="classes" element={<MyClassesSection />} />
            <Route path="recordings" element={<RecordedClassesSection />} />
            <Route path="tests" element={<TestsSection userId={profile.user_id} />} />
            <Route path="test/:examId/attempt" element={<TestAttemptPage userId={profile.user_id} />} />
            <Route path="test/:examId/result" element={<TestResultPage userId={profile.user_id} />} />
            <Route path="doubts" element={<DoubtsClassesSection hasDoubtsAccess={hasDoubtsAccess} />} />
            <Route path="profile" element={<ProfileSection profile={profile} />} />
            <Route path="*" element={<Navigate to="classes" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const MyClassesSection: React.FC = () => {
  const [classesBySubject, setClassesBySubject] = useState<Partial<Record<Subject, DailyClassRow>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      setError('');

      const today = getTodayISO();
      const { data, error: fetchError } = await supabase
        .from('daily_classes')
        .select('*')
        .eq('date', today)
        .eq('is_active', true);

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const mapped: Partial<Record<Subject, DailyClassRow>> = {};
      (data || []).forEach((row) => {
        if (row.subject === 'maths' || row.subject === 'physics' || row.subject === 'chemistry') {
          mapped[row.subject] = row as DailyClassRow;
        }
      });

      setClassesBySubject(mapped);
      setLoading(false);
    };

    fetchClasses();
  }, []);

  if (loading) return <p className="text-gray-500">Loading today's classes...</p>;
  if (error) return <p className="text-red-600">Failed to load classes: {error}</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Today's Live Classes</h1>
      <p className="text-gray-500 mb-8">{new Date().toLocaleDateString()}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SUBJECTS.map((subject) => {
          const classInfo = classesBySubject[subject];
          const initials = (classInfo?.teacher_name || formatSubject(subject)).slice(0, 1).toUpperCase();

          return (
            <div key={subject} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                {classInfo?.teacher_photo_url ? (
                  <img
                    src={classInfo.teacher_photo_url}
                    alt={classInfo.teacher_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{formatSubject(subject)}</p>
                  <p className="font-semibold text-gray-900">{classInfo?.teacher_name || 'Teacher TBD'}</p>
                </div>
              </div>

              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {classInfo?.class_title || `No ${formatSubject(subject)} class today`}
              </h3>
              <p className="text-sm text-gray-500 mb-6">{classInfo?.duration || 'Schedule not announced'}</p>

              <a
                href={classInfo?.youtube_live_link || '#'}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  if (!classInfo?.youtube_live_link) event.preventDefault();
                }}
                className={`mt-auto text-center py-3 rounded-xl font-semibold transition ${
                  classInfo?.youtube_live_link
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {classInfo?.youtube_live_link ? 'Attend Class' : 'Not Scheduled'}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RecordedClassesSection: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [recordingsBySubject, setRecordingsBySubject] = useState<Partial<Record<Subject, RecordedClassRow>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecordings = async () => {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('recorded_classes')
        .select('*')
        .eq('date', selectedDate)
        .eq('is_active', true);

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const mapped: Partial<Record<Subject, RecordedClassRow>> = {};
      (data || []).forEach((row) => {
        if (row.subject === 'maths' || row.subject === 'physics' || row.subject === 'chemistry') {
          mapped[row.subject] = row as RecordedClassRow;
        }
      });

      setRecordingsBySubject(mapped);
      setLoading(false);
    };

    fetchRecordings();
  }, [selectedDate]);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Recorded Classes</h1>
          <p className="text-gray-500">Select a date to watch subject-wise recordings.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading recordings...</p>}
      {error && <p className="text-red-600 mb-4">Failed to load recordings: {error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SUBJECTS.map((subject) => {
            const recording = recordingsBySubject[subject];
            const initials = (recording?.teacher_name || formatSubject(subject)).slice(0, 1).toUpperCase();

            return (
              <div key={subject} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  {recording?.teacher_photo_url ? (
                    <img
                      src={recording.teacher_photo_url}
                      alt={recording.teacher_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                      {initials}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{formatSubject(subject)}</p>
                    <p className="font-semibold text-gray-900">{recording?.teacher_name || 'Teacher TBD'}</p>
                  </div>
                </div>

                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  {recording?.class_title || `No ${formatSubject(subject)} recording`}
                </h3>
                <p className="text-sm text-gray-500 mb-6">{recording?.duration || 'No duration available'}</p>

                <a
                  href={recording?.youtube_video_link || '#'}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    if (!recording?.youtube_video_link) event.preventDefault();
                  }}
                  className={`mt-auto text-center py-3 rounded-xl font-semibold transition ${
                    recording?.youtube_video_link
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {recording?.youtube_video_link ? 'Watch Recording' : 'No Recording'}
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DoubtsClassesSection: React.FC<{ hasDoubtsAccess: boolean }> = ({ hasDoubtsAccess }) => {
  const [sessions, setSessions] = useState<DoubtsClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      if (!hasDoubtsAccess) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('doubts_classes')
        .select('*')
        .gte('date', getTodayISO())
        .eq('is_active', true)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setSessions((data || []) as DoubtsClassRow[]);
      setLoading(false);
    };

    fetchSessions();
  }, [hasDoubtsAccess]);

  if (!hasDoubtsAccess) {
    return (
      <div className="bg-white border border-orange-100 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Restricted Section</h2>
        <p className="text-gray-600">
          Doubts Classes are available only for batches with doubts access.
        </p>
      </div>
    );
  }

  if (loading) return <p className="text-gray-500">Loading doubts sessions...</p>;
  if (error) return <p className="text-red-600">Failed to load doubts sessions: {error}</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Doubts Classes</h1>
      <p className="text-gray-500 mb-8">Join sessions and clear your doubts with faculty.</p>

      {sessions.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-gray-500">
          No upcoming doubts sessions are scheduled right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map((session) => (
            <div key={session.doubts_class_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                    {formatSubject(session.subject)}
                  </p>
                  <h3 className="text-lg font-bold text-gray-900">{session.class_title}</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                  {new Date(session.date).toLocaleDateString()}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-1">Teacher: {session.teacher_name}</p>
              <p className="text-sm text-gray-600 mb-5">Time: {session.time_slot}</p>

              <a
                href={session.google_meet_link}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Join Doubts Class
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProfileSection: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const [stats, setStats] = useState({
    testsAttempted: 0,
    averageScore: 0,
    averagePercent: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);

      const { data } = await supabase
        .from('exam_attempts')
        .select('score, total_questions')
        .eq('user_id', profile.user_id);

      const attempts = (data || []) as ExamAttemptRow[];

      if (!attempts.length) {
        setStats({
          testsAttempted: 0,
          averageScore: 0,
          averagePercent: 0,
        });
        setLoadingStats(false);
        return;
      }

      const totalScore = attempts.reduce((acc, row) => acc + row.score, 0);
      const totalQuestions = attempts.reduce((acc, row) => acc + row.total_questions, 0);
      const averageScore = Number((totalScore / attempts.length).toFixed(1));
      const averagePercent = totalQuestions ? Math.round((totalScore / totalQuestions) * 100) : 0;

      setStats({
        testsAttempted: attempts.length,
        averageScore,
        averagePercent,
      });
      setLoadingStats(false);
    };

    fetchStats();
  }, [profile.user_id]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-500">Your personal details, batch info and performance stats.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Personal Details</h2>
          <div className="space-y-3 text-sm">
            <p><span className="text-gray-500">Name:</span> <span className="font-semibold text-gray-900">{profile.student_name}</span></p>
            <p><span className="text-gray-500">Email:</span> <span className="font-semibold text-gray-900">{profile.email}</span></p>
            <p><span className="text-gray-500">Phone:</span> <span className="font-semibold text-gray-900">{profile.phone}</span></p>
            <p><span className="text-gray-500">Account Status:</span> <span className="font-semibold text-gray-900 capitalize">{profile.account_status}</span></p>
            <p><span className="text-gray-500">Joined On:</span> <span className="font-semibold text-gray-900">{new Date(profile.created_at).toLocaleDateString()}</span></p>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Batch Details</h2>
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-gray-500">Batch Name:</span>{' '}
              <span className="font-semibold text-gray-900 capitalize">{profile.batches?.batch_name || 'Not assigned'}</span>
            </p>
            <p>
              <span className="text-gray-500">Duration:</span>{' '}
              <span className="font-semibold text-gray-900">{profile.batches?.duration_months || 0} Months</span>
            </p>
            <p>
              <span className="text-gray-500">Doubts Access:</span>{' '}
              <span className="font-semibold text-gray-900">
                {profile.batches?.has_doubts_access ? 'Enabled' : 'Not available'}
              </span>
            </p>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Test Statistics</h2>
        {loadingStats ? (
          <p className="text-gray-500">Loading test statistics...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Tests Attempted</p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{stats.testsAttempted}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-wide">Average Score</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.averageScore}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wide">Average Percentage</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{stats.averagePercent}%</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
