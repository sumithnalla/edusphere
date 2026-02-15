tables  structures of all the three:

-- TABLE 4: daily_classes
CREATE TABLE daily_classes (
  class_id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('maths', 'physics', 'chemistry')),
  teacher_name TEXT NOT NULL,
  teacher_photo_url TEXT,
  class_title TEXT NOT NULL,
  duration TEXT NOT NULL,
  youtube_live_link TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 5: recorded_classes
CREATE TABLE recorded_classes (
  recording_id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('maths', 'physics', 'chemistry')),
  teacher_name TEXT NOT NULL,
  teacher_photo_url TEXT,
  class_title TEXT NOT NULL,
  duration TEXT NOT NULL,
  youtube_video_link TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 10: doubts_classes
CREATE TABLE doubts_classes (
  doubts_class_id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('maths', 'physics', 'chemistry', 'general')),
  teacher_name TEXT NOT NULL,
  class_title TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  google_meet_link TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

Phase 4, Part 1: Admin Class Management
Page Daily Classes (Admin)
Admin Purpose: Schedule and manage live classes that will appear on student dashboards
Admin Functionality:

Add New Class Form:

Date picker (default: today)
Subject dropdown (maths/physics/chemistry)
Teacher name text input
Class title text input
Duration text input (e.g., "60 mins")
YouTube Live Link URL input
"Add Class" button → INSERT into daily_classes table


List of Classes:

Table displaying all classes (filterable by date)
Columns: Date, Subject, Teacher, Title, Duration, Live Link, Active Status
Edit button → Opens form with pre-filled data → UPDATE query
Delete button → Soft delete or hard delete from table
Toggle Active/Inactive → Update is_active field




Page  Recorded Classes (Admin)
Admin Purpose: Build the video library by adding past class recordings
Admin Functionality:

Add Recording Form:

Date picker (select any past date)
Subject dropdown (maths/physics/chemistry)
Teacher name text input
Class title text input
Duration text input
YouTube Video Link URL input 
"Add Recording" button → INSERT into recorded_classes table


Recordings Library Management:

Table with date range filter
Columns: Date, Subject, Teacher, Title, Duration, Video Link, Active Status
Edit button → Modify recording details → UPDATE query
Delete button → Remove recording
Toggle Active/Inactive → Control visibility to students
Sort/search by date, subject, or teacher




Page  Doubts Classes (Admin)
Admin Purpose: Schedule Google Meet doubt-clearing sessions for premium students
Admin Functionality:

Schedule Doubts Session Form:

Date picker (future dates)
Subject dropdown (maths/physics/chemistry/general)
Teacher name text input
Class title text input
Time slot text input (e.g., "6:00 PM - 7:30 PM")
Google Meet Link URL input
"Add Doubts Class" button → INSERT into doubts_classes table


Doubts Sessions Management:

Table showing all scheduled sessions
Filter by: Date range, Subject, Upcoming/Past
Columns: Date, Time Slot, Subject, Teacher, Title, Meet Link, Active Status
Edit button → Modify session details → UPDATE query
Delete button → Cancel/remove session
Toggle Active/Inactive → Control session visibility
View which sessions have passed vs upcoming