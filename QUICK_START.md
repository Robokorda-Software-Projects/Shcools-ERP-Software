# Quick Start Guide - Eschools ERP MVP

## TL;DR - What You Have

A **fully-functional MVP** of a school management system with:
- ✅ Role-based login (super admin, school admin, teacher, student, parent)
- ✅ Multi-school support (data completely isolated per school)
- ✅ **Complete exam & grading system** (create exams, enter marks, auto-grade)
- ✅ Student enrollment with auto-generated usernames
- ✅ Class management
- ✅ Role-specific dashboards showing different data/options
- ✅ Beautiful UI with Tailwind CSS + Radix components

## What's NOT in This MVP (Intentionally)

❌ Attendance system (designed but deferred)
❌ Announcements (designed but deferred)  
❌ Reports/Analytics (structure ready, data views to build)
❌ Mobile app (desktop-only for now)

## Get Started in 5 Steps

### 1. Clone and Install
```bash
cd Eschools-ERP-Software/frontend
npm install
```

### 2. Create Supabase Project
- Go to https://supabase.com
- Create new project
- Get your URL and API key

### 3. Setup Database
- In Supabase SQL Editor, copy-paste the full schema from `PROJECT_INSTRUCTIONS.md`
- Execute all SQL statements
- Enable RLS for each table

### 4. Configure Environment
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-api-key
```

### 5. Run It
```bash
npm run dev
# Open http://localhost:3000
```

## Test It

### Create Test Data
In Supabase SQL Editor:
```sql
-- School
INSERT INTO schools (name, school_code) 
VALUES ('Test School', 'TEST001');

-- Get school_id (replace with actual ID from above)
-- Subject
INSERT INTO subjects (school_id, name, code)
VALUES ('YOUR_SCHOOL_ID', 'Math', 'MTH001');

-- Class  
INSERT INTO classes (school_id, grade_level, section, academic_year)
VALUES ('YOUR_SCHOOL_ID', 'Form 1', 'A', '2024-2025');
```

### Create Test Users
Supabase Dashboard → Authentication:
- Email: admin@test.com, Password: Test123!, Create Profile with role: `school_admin`
- Email: teacher@test.com, Password: Test123!, Create Profile with role: `teacher`
- Email: student@test.com, Password: Test123!, Create Profile with role: `student`

### Test the Flow
1. Login as teacher → Create an exam
2. Enroll students in that exam's class
3. Click "Enter Grades" → Add marks
4. See automatic grade calculation (A/B/C/D/E/F)
5. Student sees their grade when logged in

## File Structure to Know

```
frontend/
├── app/
│   ├── page.tsx               → Landing (redirects to login/dashboard)
│   ├── layout.tsx             → Auth setup
│   ├── login/page.tsx         → Login screen
│   ├── dashboard/
│   │   ├── page.tsx           → Home (role-specific)
│   │   ├── exams/page.tsx     → ⭐ MAIN FEATURE - exams & grading
│   │   ├── students/page.tsx  → Student enrollment
│   │   ├── classes/page.tsx   → Class management
│   │   └── schools/page.tsx   → School list
│   └── register/page.tsx      → Signup (stub)
├── components/
│   ├── dashboard/
│   │   └── DashboardLayout.tsx  → Sidebar + navigation
│   └── ui/                      → Pre-built UI components
├── contexts/
│   └── AuthContext.tsx          → Global auth state
└── lib/
    ├── supabase.ts              → DB client + types
    └── utils.ts                 → Helpers
```

## The MVP's Key Strength

### Role-Based Views
Same data, completely different interface per role:

| Feature | Super Admin | School Admin | Teacher | Student |
|---------|------------|-------------|---------|---------|
| See all schools | ✅ | ❌ | ❌ | ❌ |
| Create class | ✅ Any | ✅ Own school | ❌ | ❌ |
| Create exam | ✅ | ✅ | ✅ | ❌ |
| Enter grades | ✅ | ✅ | ✅ Own | ❌ |
| View grades | ✅ | ✅ | ✅ | ✅ Own |
| Create student | ✅ | ✅ | ❌ | ❌ |

**How it works**:
1. Frontend: Hides buttons/pages based on `profile.role`
2. Backend: Database queries filter by school/creator
3. Database: RLS policies enforce rules (can't bypass frontend)

## What the Frontend Code Does

**On Login**:
- Username → lookup email in `profiles` table
- Email + password → Supabase Auth
- On success → loads user profile → redirects to dashboard

**On Dashboard**:
- Checks role → renders role-specific sidebar menu
- Shows role-specific KPI cards

**Exams (Most Complex Feature)**:
- Form to create exam (auto-fills creator's school)
- Table listing exams (filtered by role/school)
- "Enter Grades" modal:
  - Lists students in exam's class
  - Input fields for marks
  - Real-time % calculation
  - Auto-grade assignment on save
  - Updates exam_results table

**Students**:
- Form to add student → creates auth user + student record
- Auto-generates username: `{SCHOOL_CODE}-ST-{sequential}`
- Assigns to class

## Next Steps After MVP

1. **Attendance** - Extend Attendance table structure
2. **Reports** - Query exam_results for analytics
3. **Announcements** - New table + notification system
4. **Parent Portal** - Filter student data by parent_id
5. **Mobile** - React Native app using same API

## Key Architecture Points

**Why Supabase?**
- Direct frontend → database (no custom API needed for MVP)
- Built-in auth, RLS policies
- Scalable PostgreSQL
- Free tier sufficient

**Why This Approach?**
- Fast development (no backend to build)
- Secure (RLS enforces permissions)
- Type-safe (TypeScript)
- Easy to scale (add backend API later)

**Data Isolation**
- All queries filtered by `school_id`
- Each school completely isolated
- Perfect for SaaS model

## Common Issues & Fixes

**"Login not working"**
- Check profiles table has data
- Verify `NEXT_PUBLIC_SUPABASE_URL` is set
- Check Supabase project is active

**"Page shows loading forever"**
- Check user has auth token
- Verify RLS policies allow the query
- Check browser console for errors

**"Enter Grades button not showing"**
- User role must be: super_admin, school_admin, or teacher
- Check profiles.role is set correctly

## Questions?

Refer to `PROJECT_INSTRUCTIONS.md` for:
- Full database schema
- Complete RLS policies
- Detailed feature breakdown
- Testing workflows
- Deployment guide

---

**Status**: Ready to use. Just need Supabase setup.
**Complexity**: Comprehensive. Not a simple prototype.
**Scalability**: Built for growth. Can add features or split to microservices later.
