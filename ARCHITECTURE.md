# Technical Architecture Summary

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 16 Frontend                          │
│                   (React 19 + TypeScript)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ AuthContext (Global State)                              │   │
│  │ - user: User                                            │   │
│  │ - profile: Profile (role, school_id, etc.)            │   │
│  │ - signIn/signUp/signOut methods                        │   │
│  │ - loading state                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Layout + Router (Next.js App Router)                   │   │
│  │ ├── /login → LoginPage                                 │   │
│  │ ├── /register → RegisterPage                           │   │
│  │ └── /dashboard/[page] → Protected Routes               │   │
│  │     ├── /dashboard → DashboardHome                     │   │
│  │     ├── /dashboard/exams → ExamsPage (Most Complete)   │   │
│  │     ├── /dashboard/classes → ClassesPage              │   │
│  │     ├── /dashboard/students → StudentsPage            │   │
│  │     ├── /dashboard/schools → SchoolsPage              │   │
│  │     └── /dashboard/grades → GradesPage (Future)       │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                                                     │
│           ├─ Protected by AuthContext (frontend)               │
│           └─ Role checked for UI visibility                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ DashboardLayout Component (if authenticated)           │   │
│  │ - Renders role-specific sidebar navigation            │   │
│  │ - User profile info displayed                         │   │
│  │ - Sign out button                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Page Components                                         │   │
│  │ ├── Load data from Supabase based on role              │   │
│  │ ├── Apply role-based filtering                         │   │
│  │ ├── Render role-specific UI                            │   │
│  │ └── Handle CRUD operations                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                                                     │
│           │ Supabase Queries (filtered by role)                │
│           │ .from('table').select()                            │
│           │ .eq('school_id', school_id)                        │
│           │ .eq('created_by', user_id)                         │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ UI Components (Radix + Tailwind)                        │   │
│  │ - Button, Card, Dialog, Table, Form, etc.              │   │
│  │ - Pre-styled with consistent design system             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ HTTP/REST API Calls
                           │ (Supabase JavaScript Client)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│            Supabase Backend (Firebase Alternative)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Supabase Auth (Supabase Auth Table)                      │  │
│  │ - Email/Password authentication                         │  │
│  │ - Session tokens (JWT)                                  │  │
│  │ - User IDs (UUID)                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PostgreSQL Database (with Row-Level Security)           │  │
│  │                                                          │  │
│  │ Tables:                                                  │  │
│  │ ├── profiles (linked to auth.users)                    │  │
│  │ ├── schools                                             │  │
│  │ ├── subjects                                            │  │
│  │ ├── classes (school_id, grade_level, section)          │  │
│  │ ├── students (user_id, class_id)                       │  │
│  │ ├── exams (school_id, class_id, subject_id, created_by) │  │
│  │ ├── exam_results (exam_id, student_id, marks, grade)   │  │
│  │ └── attendance (student_id, class_id, status)          │  │
│  │                                                          │  │
│  │ RLS Policies (enforced at row level):                   │  │
│  │ - Super Admin: can see all data                         │  │
│  │ - School Admin: can see school data only               │  │
│  │ - Teacher: can see classes/exams they manage           │  │
│  │ - Student: can see only their own data                 │  │
│  │ - Parent: can see child's data only                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow for Key Features

### Authentication Flow
```
User enters username/password
        ↓
POST to Supabase Auth
        ↓
Query profiles table: WHERE username = 'SA-00000001'
        ↓
Get email from result
        ↓
Auth with email + password
        ↓
JWT token returned
        ↓
AuthContext updates with user data
        ↓
Redirect to /dashboard
        ↓
All subsequent queries include JWT token
        ↓
Supabase RLS policies evaluate token
        ↓
Only allowed data returned
```

### Exam & Marks Entry Flow
```
Teacher clicks "Create Exam"
        ↓
Dialog opens with form
        ↓
Teacher fills: Title, Class, Subject, Date, Total Marks
        ↓
Submit → INSERT into exams table
        ↓
Automatically sets:
  - created_by = auth.uid() (teacher's ID)
  - school_id = teacher's school_id
  - class_id = selected class
        ↓
Exam appears in table

---

Teacher clicks "Enter Grades" on exam
        ↓
Modal loads students from that class
        ↓
Query: SELECT * FROM students WHERE class_id = ?
        ↓
For each student, check existing exam_results
        ↓
Load existing marks (if any)
        ↓
Teacher enters marks for each student
        ↓
Real-time % calculation: (marks / total_marks) * 100
        ↓
Click "Save Grades"
        ↓
For each student:
  - Calculate percentage
  - Determine grade (A/B/C/D/E/F)
  - INSERT/UPDATE exam_results table
  - Set graded_by = auth.uid()
  - Set graded_at = now()
        ↓
Database returns updated records
        ↓
Modal closes, table refreshed
```

## Role-Based Data Access

### Super Admin View
```
Can see:
- ALL schools
- ALL classes from ALL schools
- ALL students from ALL schools
- ALL exams from ALL schools
- ALL exam results

Database filtering:
- No WHERE filter (can see all)
- RLS policy allows all rows
```

### School Admin View
```
Can see:
- ONE school (their assigned school)
- Classes in their school
- Students in their school
- Exams in their school
- Exam results for exams in their school

Database filtering:
- WHERE school_id = $1
- $1 = user's school_id from profiles table
- RLS policy checks: school_id = user's school_id
```

### Teacher View
```
Can see:
- Their own school's classes (future: only assigned)
- Exams they created
- Students in their exams' classes
- Exam results for exams they created

Database filtering:
- For exams: WHERE created_by = auth.uid()
- For students: joined through exam's class_id
- RLS policy checks: created_by = auth.uid()
```

### Student View
```
Can see:
- Only their own profile
- Only their enrolled class
- Only exams for their class
- Only their own exam results

Database filtering:
- For exam_results: 
  WHERE student_id = (SELECT id FROM students WHERE user_id = auth.uid())
- RLS policy checks: student owns the result
```

## Key Design Decisions & Why

### 1. Direct Frontend → Database (No API Layer)
**Why**: MVP speed, no backend server needed
**How**: Supabase client directly from frontend
**Trade-off**: Scalability - add API layer when needed
**Security**: RLS policies prevent unauthorized access

### 2. Username-Based Login
**Why**: User-friendly, system-generated prevents collisions
**Format**: `{ROLE_PREFIX}-{SEQUENCE}` e.g., `SA-00000001`
**Mapping**: Username → email lookup → auth with email
**Future**: Can add email-based login later

### 3. Role-Based UI Rendering
**Why**: Better UX, performance, clarity
**How**: Check `profile.role` before rendering
**Example**: `if (profile.role === 'teacher') { show teacher menu }`
**Security**: Backup to RLS policies (defense in depth)

### 4. React Context for Global State
**Why**: Simple, no external dependencies
**What**: user, profile, auth methods
**When**: Rarely changes, used everywhere
**Alternative**: Could use Redux/Zustand for complexity

### 5. Tailwind + Radix UI Components
**Why**: Fast development, consistent design, accessibility
**Benefits**: Pre-built, styled, accessible components
**Trade-off**: Less customization, more consistency

## Scaling Considerations

### Current MVP Limitations
- No API layer (could bottleneck with many users)
- No caching (every query hits database)
- No background jobs (async tasks)
- No file storage (exams, reports)
- Single database instance

### When to Add Backend API
- User count > 1000 concurrent
- Need complex business logic
- Want to decouple frontend from database
- Need background job processing
- Multiple databases/services

### Migration Path
```
Current: Frontend → Supabase
         ↓
Later:   Frontend → Backend API → Supabase
         
Then:    Frontend → Backend → Multiple Services:
                    ├─ Auth Service
                    ├─ Exam Service
                    ├─ Reporting Service
                    └─ Notification Service
```

## Security Model

### Frontend Security
- ✅ Role checks before rendering
- ✅ Sensitive endpoints protected
- ❌ Not a real security layer (user can bypass)

### Database Security (Real)
- ✅ RLS policies enforce permissions
- ✅ Cannot bypass (enforced server-side)
- ✅ Every query checked against policy
- ✅ User's role embedded in JWT token
- ✅ Data isolation per school

### Authentication Security
- ✅ Passwords hashed by Supabase
- ✅ JWT tokens for session
- ✅ HTTPS all communication
- ✅ Token expiration (auto-refresh)

## Performance Considerations

### Current
- All data fetched on page load
- No pagination (loads all data)
- No caching (every page refresh = new query)
- No indexes (assumes small dataset)

### For Production
- Add pagination (load 25 rows at a time)
- Add React Query for caching
- Add database indexes on common filters
- Implement search optimization (PostgreSQL full-text search)
- Add CDN for static assets
- Enable query result caching

## Testing the Architecture

### 1. Role-Based Access
```
Login as Teacher
→ Can see only own exams: SELECT * FROM exams WHERE created_by = ?
→ Cannot see other teachers' exams (RLS blocks)
→ Can see students in own exam's class
→ Cannot see unrelated students (RLS blocks)
```

### 2. Data Isolation
```
Login to School A as Admin
→ Can see only School A's data

Switch to School B Admin
→ Can see only School B's data
→ School A's data completely hidden

Try to directly query School A's data
→ RLS policy blocks at database level
```

### 3. Audit Trail
```
Teacher enters marks
→ exam_results.graded_by = teacher's user_id
→ exam_results.graded_at = timestamp
→ Cannot modify after grading (future: enforce)
```

---

**Document Purpose**: Technical handoff for continuation in another chat
**For**: Next AI developer or team continuing the project
**Focus**: Understanding the MVP architecture and how pieces fit together
