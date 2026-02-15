tables for tests:



-- TABLE 6: exams
CREATE TABLE exams (
  exam_id SERIAL PRIMARY KEY,
  exam_name TEXT NOT NULL,
  total_questions INTEGER DEFAULT 160,
  duration_minutes INTEGER DEFAULT 180,
  maths_questions INTEGER DEFAULT 80,
  physics_questions INTEGER DEFAULT 40,
  chemistry_questions INTEGER DEFAULT 40,
  conducted_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 7: questions
CREATE TABLE questions (
  question_id SERIAL PRIMARY KEY,
  exam_id INTEGER REFERENCES exams(exam_id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('maths', 'physics', 'chemistry')),
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, question_number)
);

-- TABLE 8: student_responses
CREATE TABLE student_responses (
  response_id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(question_id) ON DELETE CASCADE,
  selected_option TEXT CHECK (selected_option IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- TABLE 9: exam_attempts
CREATE TABLE exam_attempts (
  attempt_id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  exam_id INTEGER REFERENCES exams(exam_id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER DEFAULT 160,
  correct_answers INTEGER NOT NULL,
  wrong_answers INTEGER NOT NULL,
  unanswered INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  time_taken_minutes INTEGER NOT NULL,
  UNIQUE(user_id, exam_id)
);





# PHASE 3: EXAMS MODULE 📝

## 🎯 Overview
Build 3 student-facing pages for taking tests and viewing results.

---

## PAGE 1: Tests List (`/dashboard/tests`)

**What it shows:**
- List all exams from `exams` table
- For each exam, check if student attempted it (lookup in `exam_attempts`)
- If attempted: Show score + "Retake Test" + "View Result" buttons
- If not attempted: Show "Attempt Test" button

**Data needed:**
- Fetch all exams (where `is_active = true`)
- Fetch student's attempts
- Match them together

---

## PAGE 2: Test Attempt (`/dashboard/test/:exam_id/attempt`)

**Layout:**
- Left sidebar: Question navigator (1-160 grid)
- Right: Current question with 4 options
- Top: Timer

**Key features:**
- Fetch questions from `questions` table
- Auto-save answer to `student_responses` on every option click (UPSERT)
- Timer auto-submits when it hits 0:00
- Mark for review button
- Previous/Next navigation

**On Submit:**
1. Count correct/wrong/unanswered from `student_responses`
2. Save to `exam_attempts` table (UPSERT - updates if retaking)
3. Redirect to result page

---

## PAGE 3: View Result (`/dashboard/test/:exam_id/result`)

**Score Summary Card:**
- Show total score (145/160)
- Show breakdown: ✅ Correct, ❌ Wrong, ⚪ Unanswered
- Time taken, submission date

**Question-by-Question Review:**
- Fetch questions + student responses (JOIN tables)
- For each question, show:
  - Question text
  - Student's answer (highlight green if correct, red if wrong)
  - Correct answer (always show in green)
  - Grey if unanswered

**Buttons:**
- Retake Test (goes back to attempt page)
- Back to Tests


**Result:** One row per student per question, one row per student per exam.

---

## ✅ Simple Checklist

- [ ] Tests list shows all exams
- [ ] Correct buttons appear (Attempt vs Retake/View Result)
- [ ] Timer counts down and auto-submits
- [ ] Answers save on click
- [ ] Submit calculates score correctly
- [ ] Result page shows correct/wrong breakdown
- [ ] Retake updates the same attempt row (doesn't duplicate)

Done! 🎯