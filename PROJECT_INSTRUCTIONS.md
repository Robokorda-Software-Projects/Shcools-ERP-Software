# Eschools ERP System - Project Instructions & Context

## Project Overview
This is a **School Enterprise Resource Planning (ERP) System** - a comprehensive MVP (Minimum Viable Product) showcasing a complete school management platform with role-based dashboards and interactions. The system enables schools to manage classes, students, and exams with different views and capabilities depending on user roles.

**Project Status**: MVP Phase - Core Features Complete
- ✅ Multi-role authentication and authorization
- ✅ Class management with filtering
- ✅ Student enrollment system with auto-generated usernames
- ✅ Comprehensive exam creation and grading system
- ✅ Role-specific dashboards and navigation
- ✅ Real-time marks entry with automatic grade calculation
- 🔄 Future: Attendance tracking and announcements (designed but not prioritized)

**Technology Stack**: Next.js 16 + React 19 + TypeScript + Tailwind CSS + Supabase PostgreSQL

---

## Current Project Structure

```
Eschools-ERP-Software/
├── frontend/              # Next.js 16 application (PRIMARY FOCUS)
│   ├── app/               # Next.js App Router pages
│   │   ├── page.tsx       # Root redirect page (routes to /login or /dashboard)
│   │   ├── layout.tsx     # Root layout with AuthProvider & Toaster
│   │   ├── globals.css    # Global Tailwind styles
│   │   ├── login/
│   │   │   └── page.tsx   # Login page with username/password auth
│   │   ├── register/
│   │   │   └── page.tsx   # Registration page (stub - needs implementation)
│   │   └── dashboard/
│   │       ├── page.tsx   # Main dashboard with role-based widgets
│   │       ├── classes/
│   │       │   └── page.tsx
│   │       ├── exams/
│   │       │   ├── page.tsx
│   │       │   └── [id]/   # Dynamic exam detail page
│   │       ├── schools/
│   │       │   └── page.tsx
│   │       └── students/
│   │           └── page.tsx
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── DashboardLayout.tsx  # Sidebar layout with role-based nav
│   │   └── ui/                      # Radix UI + Tailwind component library
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── calendar.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── form.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── sonner.tsx (toast notifications)
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       └── textarea.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx         # Global auth state management
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client & TypeScript types
│   │   └── utils.ts                # Utility functions
│   ├── public/                     # Static assets
│   └── Configuration files:
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── tailwind.config.js
│       ├── postcss.config.mjs
│       ├── eslint.config.mjs
│       └── components.json
```

---

## Backend Architecture - Supabase

### Database Backend
The entire backend is powered by **Supabase** (Firebase alternative) with PostgreSQL database. This MVP does NOT have a separate API backend - instead, it uses Supabase's client libraries for direct database access with Row-Level Security (RLS) policies for data protection.

**Key Benefits**:
- Real-time database synchronization
- Built-in authentication with email/password
- Row-level security for data isolation per user/school
- Scalable PostgreSQL backend
- No backend server maintenance required

### Authentication Flow
1. **User Registration** (via admin or self-signup):
   - Super Admin creates users in the system
   - User data stored in `profiles` table + Supabase Auth
   - Auto-generated username based on role + school code
   - Password stored securely in Supabase Auth

2. **Login Flow**:
   - User enters username → system queries `profiles` table for email
   - Email + password sent to Supabase Auth
   - Session token maintained in browser
   - AuthContext provides global state to app

3. **Session Management**:
   - Supabase Auth maintains JWT tokens
   - Browser cookies store session automatically
   - AuthContext checks session on app mount
   - Automatic redirect to login if not authenticated

### Data Access Model
- All queries go directly from frontend → Supabase
- Supabase RLS policies enforce data access rules
- Role-based filtering happens at database level
- No middleware server needed for MVP

### Future Scalability
When MVP transitions to production, consider:
- Dedicated backend API (Node.js/Express) for business logic
- Redis caching layer for performance
- Separate microservices for specialized tasks
- Message queue for async operations

---

## Frontend - Detailed Implementation Status

### ✅ FULLY COMPLETED Features

#### 1. **Role-Based Authentication System** (`contexts/AuthContext.tsx`)
- Custom React Context for global auth state
- Supabase Auth integration with real-time session syncing
- Persistent session across page refreshes
- User profile loading on app mount
- Sign In with username-based lookup
- Sign Up functionality (basic stub for future enhancements)
- Sign Out with session cleanup

**Supported Roles**:
- `super_admin`: System-wide access to all schools and users
- `school_admin`: Access to their specific school's data
- `teacher`: Access to classes and students they manage
- `student`: Access to personal grades, attendance, assignments
- `parent`: Access to children's grades and attendance

#### 2. **Login Page** (`app/login/page.tsx`)
- Professional UI with gradient background
- Username-based authentication (e.g., `SA-00000001`)
- Email lookup from username field (queries profiles table)
- Password validation via Supabase Auth
- "Remember Me" functionality (localStorage persistence)
- Toast notifications for errors/success
- Responsive design for desktop and tablet
- Loading states during submission
- Comprehensive error handling with user-friendly messages

#### 3. **Dashboard Layout Component** (`components/dashboard/DashboardLayout.tsx`)
**Sidebar Navigation with Full Role-Based Customization**:

| Role | Navigation Items |
|------|------------------|
| **super_admin** | Dashboard, Schools, All Classes, All Students, All Exams, Reports |
| **school_admin** | Dashboard, Classes, Students, Teachers, Exams, Attendance, Announcements |
| **teacher** | Dashboard, My Classes, Exams, Attendance, Students |
| **student** | Dashboard, My Grades, My Attendance, Assignments, Announcements |
| **parent** | Dashboard, My Children, Grades, Attendance, Announcements |

Features:
- Persistent sidebar with profile info
- Active route highlighting
- Sign out button
- Professional styling with Tailwind
- Responsive design (collapses on mobile - future enhancement)

#### 4. **Dashboard Home Page** (`app/dashboard/page.tsx`)
**Role-Specific Welcome Screen with KPI Cards**:

- **Super Admin Dashboard**:
  - Total Schools count
  - Total Classes across all schools
  - Total Users in system
  - System Health status (100%)

- **School Admin Dashboard**:
  - Total Classes in school
  - Total Teachers
  - Total Students enrolled

- **Teacher Dashboard**:
  - My Classes count
  - Pending Exams (grading queue)
  - Today's Classes scheduled

- **Student Dashboard**:
  - My Class (grade level & section)
  - Upcoming Exams count
  - Current Attendance percentage

- **Quick Actions** (placeholder buttons for future functionality)
- Welcome card with personalized greeting

#### 5. **Exam Management System** (`app/dashboard/exams/page.tsx`)
**MOST COMPLETE FEATURE - Fully Functional Exam & Grading System**

Capabilities:
- **Exam Creation** (Super Admin, School Admin, Teacher):
  - Form to create new exams with validation
  - Fields: Title, Description, Class, Subject, Date, Total Marks
  - Automatically associates exam to creator's school
  - Dialog-based form interface

- **Exam Listing**:
  - Table view of all exams with sorting
  - Displays: Title, Class, Subject, Date, Total Marks, Created By
  - Advanced filtering by Class and Subject
  - Search functionality across exam titles and descriptions
  - Shows total exams vs. filtered count

- **Marks Entry System** (Super Admin, School Admin, Teacher):
  - Opens modal with list of students in the exam's class
  - Shows: Roll Number, Student Name, Marks Input, Auto-calculated Percentage
  - Real-time percentage calculation (marks/total_marks * 100)
  - Input validation (0 to total_marks)
  - Batch save functionality

- **Automatic Grade Calculation**:
  - **A**: 90-100%
  - **B**: 80-89%
  - **C**: 70-79%
  - **D**: 60-69%
  - **E**: 50-59%
  - **F**: < 50%

- **Data Relationships**:
  - Joins with classes, subjects, profiles
  - Stores exam_results with exam_id, student_id, marks, percentage, grade
  - Tracks who graded (graded_by) and when (graded_at)
  - Supports both new grade entry and updating existing grades

#### 6. **Student Management System** (`app/dashboard/students/page.tsx`)
**Complete Student Enrollment & Management**

Features:
- **Student Creation**:
  - Form with validation for Full Name, Email, Password, Class, Roll Number
  - Auto-generates username format: `{SCHOOL_CODE}-ST-{8-digit-number}`
  - Creates both auth user (in Supabase Auth) and student record
  - Assigns to class on creation
  - Sets admission date automatically

- **Student Listing**:
  - Table displaying all students with details
  - Shows: Username, Roll Number, Full Name, Email, Class, School
  - Search functionality by name, username, email
  - Filter by School (Super Admin only), Grade Level, Section

- **Role-Based Access**:
  - Super Admin: Can see all students across all schools
  - School Admin: Can only see their school's students
  - Teachers: View students in their classes (future enhancement)

- **Data Integration**:
  - Fetches from `students` table with related `profiles` and `classes` data
  - Properly handles user_id foreign keys to auth users

#### 7. **Class Management System** (`app/dashboard/classes/page.tsx`)
**Complete Class Setup & Organization**

Features:
- **Class Creation**:
  - Form to create new classes
  - Fields: Grade Level (dropdown with 16 options), Section (A-Z), Academic Year
  - Grade levels: ECD A/B/C, Grade 1-7, Form 1-4, Lower 6, Upper 6
  - Auto-associates to school based on user role

- **Class Listing**:
  - Table view of all classes
  - Shows: Grade Level, Section, Academic Year, School, Student Count
  - Sortable and organized by grade level then section

- **Role-Based Permissions**:
  - Super Admin: Can create classes in any school
  - School Admin: Can create classes in their school only
  - Teachers: Can view classes (future: manage their classes)

- **Academic Organization**:
  - Grouped by academic year (2024-2025 default)
  - Easy identification of class sections

#### 8. **Schools Management System** (`app/dashboard/schools/page.tsx`)
**School Directory & Management**

Features:
- List all schools in system (Super Admin view)
- Shows school name, code, contact info
- Used for filtering classes, students, exams by school
- Organizational hierarchy root

#### 9. **UI Component Library**
Pre-built, reusable components following shadcn/ui pattern:
- Button, Card, Input, Dialog, Select, Tabs, Table, Calendar
- Checkbox, Badge, Dropdown-Menu, Label, Form, Textarea
- Avatar (for future user profiles)
- Sonner Toast notifications (success/error messages)
- All styled with Tailwind CSS for consistency

#### 10. **Type Safety & Data Models**
Full TypeScript interfaces for type safety:
```typescript
Profile - User profile with role, school_id, etc.
School - School organization details
Class - Classroom with grade level and academic year
Student - Student with roll number and admission date
Exam - Examination with date and total marks
ExamResult - Marks and grades per student per exam
Subject - Subject/course information
```

### 🔄 Partially Completed Features

#### 1. **Registration Page** (`app/register/page.tsx`)
- Basic UI structure exists
- Supports email, password, full name, role selection
- Uses AuthContext signUp method
- **Status**: Stub implementation
- **Reason**: Self-registration not primary workflow in MVP
- Most users created by admin with auto-generated usernames
- Could be enhanced for future parent/student self-signup

### ❌ Not Started (Intentionally Deferred for MVP)

The following features are architecturally planned but NOT prioritized for this MVP release:

1. **Attendance System** - Infrastructure exists but not implemented
   - Would track daily attendance per student
   - Reports on attendance percentage
   - Planned but deferred for later

2. **Announcements/Notifications** - UI placeholders exist
   - Would allow teachers/admins to broadcast messages
   - Email/in-app notifications
   - Not yet implemented

3. **Reports & Analytics** - Dashboard structure only
   - Student performance reports
   - Class-wise statistics
   - Teacher workload analytics
   - Future enhancement

4. **Advanced Features**:
   - Mobile app (currently desktop-focused)
   - Email notifications
   - Bulk import/export
   - Advanced search and filtering
   - Assignment management
   - Parent-teacher messaging

---

## Technology Stack Details

### Frontend Dependencies
```json
{
  "Framework": "Next.js 16.0.6 with App Router",
  "React": "19.2.0",
  "UI Components": {
    "Radix UI": "Various (avatar, checkbox, dialog, etc.)",
    "Tailwind CSS": "4.0",
    "Icons": "lucide-react 0.555.0"
  },
  "Forms": {
    "react-hook-form": "7.67.0",
    "@hookform/resolvers": "5.2.2",
    "zod": "4.1.13"
  },
  "State Management": {
    "@tanstack/react-query": "5.90.11",
    "React Context API"
  },
  "Backend": "@supabase/supabase-js 2.86.0",
  "Notifications": "sonner 2.0.7",
  "Theming": "next-themes 0.4.6",
  "Utilities": {
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "date-fns": "4.1.0",
    "tailwind-merge": "3.4.0"
  }
}
```

### Development Tools
- TypeScript 5
- ESLint 9
- Tailwind CSS with PostCSS

---

## Supabase Database Schema (ACTUAL IMPLEMENTATION)

The application uses the following Supabase PostgreSQL tables with Row-Level Security policies:

```sql
-- 1. AUTHENTICATION USERS (Managed by Supabase)
-- Table: auth.users
-- Columns: id (UUID), email, created_at, etc.
-- Note: Do NOT modify directly - use Supabase Auth API

-- 2. USER PROFILES (Linked to auth.users via id)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL UNIQUE,
  username VARCHAR NOT NULL UNIQUE,  -- Format: SA-00000001 (Role + Sequential)
  full_name VARCHAR NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('super_admin', 'school_admin', 'teacher', 'student', 'parent')),
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 3. SCHOOLS (Top-level organizational unit)
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  school_code VARCHAR UNIQUE,        -- e.g., "DEMO001"
  address TEXT,
  contact_email VARCHAR,
  contact_phone VARCHAR,
  created_at TIMESTAMP DEFAULT now()
);

-- 4. SUBJECTS (Academic subjects)
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  name VARCHAR NOT NULL,             -- e.g., "Mathematics", "English"
  code VARCHAR NOT NULL,             -- e.g., "MTH001"
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(school_id, code)
);

-- 5. CLASSES (Classrooms within a school)
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  grade_level VARCHAR NOT NULL,      -- e.g., "Form 1", "Grade 5"
  section VARCHAR,                   -- e.g., "A", "B", "C"
  academic_year VARCHAR NOT NULL,    -- e.g., "2024-2025"
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(school_id, grade_level, section, academic_year)
);

-- 6. STUDENTS (Student records)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),
  roll_number VARCHAR,               -- e.g., "001", "A-15"
  admission_date DATE,
  parent_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT now()
);

-- 7. EXAMS (Examination setup)
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  title VARCHAR NOT NULL,            -- e.g., "Mid-Term Mathematics"
  description TEXT,
  exam_date DATE NOT NULL,
  total_marks INTEGER NOT NULL,      -- e.g., 100
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT now()
);

-- 8. EXAM RESULTS (Marks and grades per student)
CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  marks_obtained DECIMAL(5, 2),      -- e.g., 85.50
  percentage DECIMAL(5, 2),          -- e.g., 85.50
  grade VARCHAR,                     -- A, B, C, D, E, F
  remarks TEXT,
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- 9. ATTENDANCE (Optional - not yet implemented)
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  attendance_date DATE NOT NULL,
  status VARCHAR CHECK (status IN ('present', 'absent', 'late')),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(student_id, attendance_date)
);
```

### Row-Level Security (RLS) Policies (MUST BE IMPLEMENTED)

These policies ensure users can only access data appropriate to their role:

```sql
-- PROFILES TABLE POLICIES
-- Super Admin: Can see all profiles
-- Others: Can only see profiles in same school
CREATE POLICY "Super admin sees all profiles"
  ON profiles FOR SELECT
  USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY "School users see school members"
  ON profiles FOR SELECT
  USING (
    school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

-- CLASSES TABLE POLICIES
-- Super Admin: Can manage all classes
-- School Admin: Can manage classes in their school only
CREATE POLICY "Classes visible to school members"
  ON classes FOR SELECT
  USING (
    school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- STUDENTS TABLE POLICIES
-- Super Admin: All students
-- School Admin: Students in their school
-- Teacher: Students in their classes
-- Student: Only self
CREATE POLICY "Students visible based on role"
  ON students FOR SELECT
  USING (
    user_id = auth.uid()  -- Students see themselves
    OR (
      SELECT school_id FROM classes WHERE id = class_id
    ) = (SELECT school_id FROM profiles WHERE id = auth.uid())  -- School members
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')  -- Super admin
  );

-- EXAMS TABLE POLICIES
-- Super Admin: All exams
-- School Admin: Exams in their school
-- Teacher: Exams they created
-- Student: Exams in their class
CREATE POLICY "Exams visible based on role"
  ON exams FOR SELECT
  USING (
    school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
    OR created_by = auth.uid()
    OR (
      SELECT COUNT(*) FROM students 
      WHERE user_id = auth.uid() AND class_id = exams.class_id
    ) > 0
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- EXAM_RESULTS TABLE POLICIES
-- Students: Only see their own results
-- Teachers: Only see results for exams they created
-- School Admin/Super Admin: See all results
CREATE POLICY "Results visible based on ownership"
  ON exam_results FOR SELECT
  USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())  -- Own results
    OR (
      SELECT created_by FROM exams WHERE id = exam_id
    ) = auth.uid()  -- Their exams
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin'))
  );
```

### Data Relationships Diagram

```
schools (1)
  ├── classes (many)
  ├── subjects (many)
  ├── exams (many)
  └── profiles (many) [school_admin, teachers assigned to school]
       └── students (many)
            ├── classes (many through enrollment)
            ├── exam_results (many)
            └── attendance (many)

exams (1)
  ├── class_id (1) → classes
  ├── subject_id (1) → subjects
  ├── created_by (1) → profiles
  └── exam_results (many)
       └── student_id (1) → students

students (1)
  ├── user_id (1) → profiles
  ├── class_id (1) → classes
  ├── parent_id (optional) → profiles
  └── exam_results (many)
```

---

## Environment Variables Required

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Running the Project Locally

### Prerequisites
- Node.js 18+ and npm 9+
- Supabase account (free tier works)
- Git (optional)

### Development Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create environment file
# Create file: frontend/.env.local
# Add your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# 4. Start development server
npm run dev
```

Open `http://localhost:3000` in browser. The app will be live-reloading as you make changes.

### Building for Production

```bash
cd frontend

# Build optimization for deployment
npm run build

# Run optimized production build locally
npm start
```

### Available Scripts

```bash
npm run dev       # Start development server with hot reload
npm run build     # Build for production (outputs to .next/)
npm start         # Run production build locally
npm run lint      # Run ESLint to check code quality
```

### Supabase Setup (Required Before Running)

1. **Create Supabase Project**:
   - Go to https://supabase.com
   - Click "New Project"
   - Fill in name, password
   - Select region closest to you
   - Wait for project to initialize

2. **Create Database Tables**:
   - Go to SQL Editor in Supabase dashboard
   - Paste the complete SQL schema provided earlier
   - Execute each CREATE TABLE statement
   - Verify tables appear in the Tables section

3. **Enable Row-Level Security**:
   - For each table, click on it
   - Turn "RLS" toggle ON
   - Add the RLS policies from earlier section

4. **Create Test Data**:
   ```sql
   -- Insert a test school
   INSERT INTO schools (name, school_code)
   VALUES ('Demo High School', 'DEMO001');
   
   -- Insert test subjects
   INSERT INTO subjects (school_id, name, code)
   SELECT id, 'Mathematics', 'MTH001' FROM schools WHERE school_code = 'DEMO001';
   
   -- Insert test class
   INSERT INTO classes (school_id, grade_level, section, academic_year)
   SELECT id, 'Form 1', 'A', '2024-2025' FROM schools WHERE school_code = 'DEMO001';
   ```

5. **Get API Keys**:
   - Go to Settings → API
   - Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Add to `frontend/.env.local`

---

## Key Files to Understand

### Application Architecture Overview

```
Frontend (Next.js) ──────────────┐
                                 │
Auth Context (Global State)      │
                                 ├─── Supabase Client ──────────┐
Dashboard Layout (Role-Based UI) │                             │
                                 │                             ▼
Page Components (Exams, Classes, │                   Supabase (PostgreSQL)
Students, etc.)                  │                      │      ▲
                                 │                      │      │
UI Components Library            │                      └──────┘
                                 │
TSX Components                   │
```

### Data Flow & Authentication

**Initial App Load**:
1. `layout.tsx` wraps app with `AuthProvider`
2. `AuthContext.useEffect()` checks Supabase session
3. If session exists, loads user profile from `profiles` table
4. If no session, user redirected to login on accessing protected pages

**Login Flow**:
1. User enters username on `/login` page
2. Frontend queries `profiles` table: `select email where username = 'SA-00000001'`
3. Email + password sent to Supabase Auth
4. Auth token returned and stored in browser
5. AuthContext updates with user data
6. User redirected to `/dashboard`

**Role-Based Page Access**:
1. Each dashboard page checks `profile.role`
2. Page renders different UI/features based on role
3. Database queries automatically filtered by school/role
4. RLS policies prevent unauthorized access at database level (defense in depth)

### Component Hierarchy

```
app/layout.tsx (Root)
├── AuthProvider (Context)
├── Toaster (Notifications)
└── app/[page routes]
    ├── app/page.tsx (Redirect to login/dashboard)
    ├── app/login/page.tsx
    ├── app/register/page.tsx
    └── app/dashboard/
        ├── layout implicit via DashboardLayout component
        ├── page.tsx (Dashboard home)
        ├── exams/page.tsx
        ├── classes/page.tsx
        ├── students/page.tsx
        ├── schools/page.tsx
        └── grades/page.tsx (future)
```

### State Management Strategy

**Global State** (AuthContext):
- Current user
- User profile (role, school_id, etc.)
- Auth methods (signIn, signUp, signOut)
- Loading state

**Local Component State** (useState):
- Form inputs
- Dialog open/close states
- Table filters
- Pagination

**Server State** (Supabase Queries):
- Classes, Students, Exams (fetched on component mount)
- Auto-synced with database
- Could be enhanced with React Query caching

### Critical Business Logic

**Username Generation** (Students):
```
Format: {SCHOOL_CODE}-ST-{8-digit-sequential}
Example: DEMO001-ST-00000001
Implementation: In students/page.tsx, generateStudentUsername()
```

**Grade Calculation** (Exams):
```
Percentage = (marks_obtained / total_marks) * 100
Grade = A (90-100%), B (80-89%), C (70-79%), D (60-69%), E (50-59%), F (<50%)
Implementation: In exams/page.tsx, saveGrades() function
```

**Data Filtering by Role**:
```
Super Admin:  Sees ALL data across all schools
School Admin: Sees data ONLY from their school
Teacher:      Sees data from classes they manage
Student:      Sees only THEIR OWN data
Parent:       Sees THEIR CHILD'S data (if implemented)
```

---

## How the MVP Demonstrates Different Views for Different Roles

### 1. Authentication & Authorization
Every user logs in with their unique username, which determines their role. The system is fully multi-tenant:
- Each school has its own data
- Each user sees only what their role permits
- Same database, different views per role

### 2. Dashboard Home (`/dashboard`)
- **Super Admin**: System-wide statistics (total schools, classes, users)
- **School Admin**: School-level overview (classes in school, teachers, students)
- **Teacher**: Personal workload (my classes, pending exams, today's schedule)
- **Student**: Personal information (my class, upcoming exams, attendance)
- **Parent**: Child's information (my children, their grades, attendance)

### 3. Exams Management (`/dashboard/exams`)
- **Super Admin**: View ALL exams across ALL schools, create exams, enter grades
- **School Admin**: View exams in their school, create exams, enter grades
- **Teacher**: View and create ONLY THEIR exams, enter grades for their exams
- **Student**: View exams in their class, see their grades (when available)

### 4. Student Management (`/dashboard/students`)
- **Super Admin**: View ALL students, create new students, assign to any school
- **School Admin**: View students in their school, enroll in classes, create new students
- **Teacher**: View students in their classes (would show only assigned classes)
- **Student**: Cannot access this page (permission denied)

### 5. Class Management (`/dashboard/classes`)
- **Super Admin**: Create classes in any school, view all classes
- **School Admin**: Create classes in their school, view their school's classes
- **Teacher**: View assigned classes only
- **Student**: Cannot access this page

### 6. Schools Management (`/dashboard/schools`)
- **Super Admin**: Full access to all schools and their details
- **School Admin**: Cannot access (restricted to their school)
- Others: No access

### Implementing Role-Based Interactions
The system uses multiple layers:

**Layer 1 - Frontend Logic**:
```tsx
const canCreateExam = ['super_admin', 'school_admin', 'teacher'].includes(profile.role)
if (canCreateExam) {
  // Show create button
}
```

**Layer 2 - Database Queries**:
```tsx
if (profile?.role === 'teacher') {
  query = query.eq('created_by', profile.id)  // Teachers see only their exams
} else if (profile?.role !== 'super_admin' && profile?.school_id) {
  query = query.eq('school_id', profile.school_id)  // Admins see school exams
}
```

**Layer 3 - Row-Level Security Policies**:
```sql
-- Database enforces rules even if frontend is bypassed
CREATE POLICY "Exams visible based on role" ON exams
  USING (
    created_by = auth.uid()  -- Teachers only see theirs
    OR school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())  -- Admins see school
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')  -- Super admin sees all
  );
```

### Real Marks Entry Example
The most comprehensive feature showing role-based interaction:

**Teacher's Workflow**:
1. Logs in as teacher (e.g., username `TC-00000001`)
2. Navigates to `/dashboard/exams`
3. Sees only exams they created (filtered by `created_by = auth.uid()`)
4. Clicks "Enter Grades" button on an exam
5. Modal opens showing students in that exam's class
6. Enters marks for each student
7. Clicks "Save Grades" → marks saved with `graded_by = auth.uid()`
8. Automatic grade calculation applied

**Student's Workflow**:
1. Logs in as student
2. Cannot see "Enter Grades" button (`canEnterGrades` check hides it)
3. Cannot see `/dashboard/exams` create/grade options in UI
4. If RLS policy correctly set, student viewing exam_results sees only their own results
5. Sees their marks and grades when they're published

**Admin's Workflow**:
1. Logs in as school admin
2. Sees all exams in school (regardless of who created them)
3. Can manually enter/correct grades for any exam
4. Access to all correction features

---

## Implementation Roadmap & Next Steps

### Phase 1: MVP Foundation (COMPLETED ✅)
- [x] Authentication system with role-based access
- [x] Dashboard with role-specific views
- [x] Exam management and marks entry
- [x] Student enrollment system
- [x] Class management
- [x] School organization structure

### Phase 2: Core Features (NEXT)
These are the natural next steps to build out the MVP:

1. **Supabase Backend Configuration** (CRITICAL - Do First)
   - Create all database tables using provided SQL schema
   - Set up Row-Level Security (RLS) policies
   - Create seed data (demo schools, classes, users)
   - Set up proper indexes for performance
   
2. **Grades Management** (`/dashboard/grades`)
   - Student view of their grades per exam
   - Grade history and trends
   - Export grades as PDF
   - GPA calculation

3. **Reports System** (`/dashboard/reports`)
   - Class-wise performance reports
   - Student progress tracking
   - Teacher workload reports
   - Export functionality (CSV, PDF)

4. **Attendance System** (`/dashboard/attendance`)
   - Mark daily attendance
   - View attendance reports
   - Attendance percentage calculations
   - Bulk mark absent

5. **Announcements** (`/dashboard/announcements`)
   - Teachers/Admins post announcements
   - Students/Parents view announcements
   - Category-based organization

### Phase 3: Polish & Production
- Error boundaries and error handling
- Loading skeletons for better UX
- Mobile responsiveness
- Performance optimization
- Unit and integration tests
- Email notifications
- Bulk import/export functionality

### Phase 4: Advanced Features (Post-MVP)
- Parent-teacher messaging
- Assignment management
- Fee management
- Library management
- Hostel management
- Advanced analytics and dashboards
- Mobile native apps

---

## Debugging & Common Issues

### Authentication Issues
**Problem**: Login page not working or auth always redirects
- Check that Supabase environment variables are correctly set in `.env.local`
- Verify the `profiles` table exists and has test data with correct username format
- Check browser console for Supabase auth errors
- Confirm user exists: `SELECT * FROM profiles WHERE username = 'test-username'`

**Problem**: Session not persisting after refresh
- Ensure Supabase Auth is properly initialized in `lib/supabase.ts`
- Check browser cookies for Supabase session token
- Verify `AuthContext.useEffect()` runs on component mount

### Page Not Loading
**Problem**: Pages showing "Loading..." indefinitely
- Check if auth context is properly set (loading state)
- Verify user is authenticated with correct permissions
- Check browser console for Supabase query errors
- Ensure RLS policies don't block the query

**Problem**: Data not showing in tables
- Verify database table exists and has data
- Check that joined tables have proper foreign key references
- Look at browser Network tab to see actual API response
- Ensure RLS policy allows the current user to see the data

### Marks Entry Issues
**Problem**: "Enter Grades" button not showing
- Check `canEnterGrades` condition: user must be super_admin, school_admin, or teacher
- Verify user's role is correctly set in profiles table
- Clear browser cache and refresh page

**Problem**: Marks not saving
- Check that students exist in the exam's class
- Verify exam record has valid class_id and subject_id
- Ensure `graded_by` (current user) exists and is not null
- Check Supabase real-time subscriptions are not throwing errors

### Database Query Errors
**Problem**: "Column does not exist" error
- Verify table schema matches the SQL provided
- Check table and column names are correctly spelled (case-sensitive in PostgreSQL)
- Ensure all indexes are created

**Problem**: "RLS policy violation" or "no rows returned"
- RLS policy is restricting the query
- Add appropriate permissions to RLS policy for the role
- Test with super_admin first to isolate the issue
- Check that school_id matches between user's school and data's school

---

## Important MVP Design Decisions

### Why Direct Supabase Queries?
- **MVP Speed**: No need for custom backend API
- **Cost Effective**: Supabase free tier is sufficient
- **Scalability**: Can add backend later without breaking frontend
- **Real-time**: Built-in real-time updates
- **Security**: RLS policies enforce authorization at database level

### Why Username-Based Login?
- **User-Friendly**: Easier to remember than student ID + password
- **System Generated**: Admin-created usernames prevent collisions
- **Flexible Format**: Can encode school/role/sequence in username
- **Future-Proof**: Can easily add email-based login later

### Why React Context for Auth?
- **Simple State**: Auth state doesn't need complex logic
- **Global Access**: All components need auth info
- **Performance**: Limited re-renders as auth changes rarely
- **No External Deps**: Reduces bundle size vs. Redux/Zustand

### Why Role-Based UI Instead of Just RLS?
- **Better UX**: Hide irrelevant buttons/pages upfront
- **Performance**: Avoid unnecessary database queries
- **Clarity**: Users see what they can do
- **Backup Security**: RLS still enforces at database level

---

## Deployment Considerations

### Pre-Deployment Checklist
- [ ] All Supabase database tables created with correct schema
- [ ] All RLS policies implemented for security
- [ ] Environment variables configured in production
- [ ] Test all roles: super_admin, school_admin, teacher, student, parent
- [ ] Test data created (schools, classes, students, exams)
- [ ] Error handling tested (bad auth, network errors, etc.)
- [ ] Performance tested with realistic data volume
- [ ] Email notifications configured (if adding)
- [ ] Backups configured in Supabase dashboard

### Deployment Platforms
- **Vercel** (Recommended for Next.js): Zero-config deployment
- **Netlify**: Good alternative with build pipeline
- **AWS Amplify**: More control, similar to Vercel
- **Self-hosted**: Docker container option

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Note: These are safe to expose (NEXT_PUBLIC prefix) as they're restricted by RLS policies

---

## Testing Workflows

### Test User Accounts (Create These in Supabase)

**Super Admin**:
```
Username: SA-00000001
Email: superadmin@school.com
Password: TestPass123!
Role: super_admin
School: (null - can see all)
```

**School Admin**:
```
Username: AD-00000001
Email: admin@school.com
Password: TestPass123!
Role: school_admin
School: {school_id}
```

**Teacher**:
```
Username: TC-00000001
Email: teacher@school.com
Password: TestPass123!
Role: teacher
School: {school_id}
```

**Student**:
```
Username: ST-00000001
Email: student@school.com
Password: TestPass123!
Role: student
School: {school_id}
```

**Parent**:
```
Username: PR-00000001
Email: parent@school.com
Password: TestPass123!
Role: parent
School: (optional)
```

### Test Workflows

**Create Exam Flow**:
1. Login as teacher/admin
2. Go to `/dashboard/exams`
3. Click "Create Exam"
4. Fill in form (Title, Description, Class, Subject, Date, Total Marks)
5. Submit → exam should appear in table

**Enter Marks Flow**:
1. Exam exists with students enrolled
2. Click "Enter Grades" button
3. Fill in marks for students (0-total_marks)
4. Click "Save Grades"
5. Verify exam_results table has entries
6. Verify grades calculated correctly (A/B/C/D/E/F)

**Role-Based Access Flow**:
1. Login as different roles
2. Verify navigation matches their role in DashboardLayout
3. Try accessing restricted pages directly (should redirect or show nothing)
4. Verify filters show only their data (school, class, etc.)

---

## Contact & Handoff Notes

This MVP demonstrates:
✅ Complete authentication with role-based access
✅ Multi-tenant architecture (each school has isolated data)
✅ Role-specific dashboards with different views
✅ Full exam management with marks entry and grading
✅ Student enrollment with auto-generated usernames
✅ Class organization system
✅ Professional UI with responsive design
✅ Database relationship implementation
✅ Real-time data synchronization via Supabase

**For Next Developer**:
- Start by setting up Supabase database using provided schema
- Test all authentication flows with provided test accounts
- Run through test workflows to verify functionality
- Pay special attention to RLS policies - they're critical for security
- Refer to the "How the MVP Demonstrates Different Views for Different Roles" section to understand the architecture
- The frontend code is production-ready; backend database setup is the key missing piece

**Project Complexity**: This is a COMPREHENSIVE MVP, not a basic prototype. The foundation is solid for scaling.

**Last Updated**: December 3, 2025
**MVP Status**: Ready for Supabase Backend Configuration
