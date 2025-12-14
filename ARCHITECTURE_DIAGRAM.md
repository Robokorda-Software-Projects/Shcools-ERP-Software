# Schools Management System - Architecture Diagram

## Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SCHOOLS MANAGEMENT SYSTEM                               │
└─────────────────────────────────────────────────────────────────────────────────┘

                              SUPER ADMIN
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              CREATE SCHOOL   ASSIGN ADMIN   DELETE SCHOOL
                    │              │              │
                    ▼              ▼              ▼

╔═══════════════════════════════════════════════════════════════════════════════╗
║                            FRONTEND (Next.js)                                  ║
║  app/dashboard/schools/page.tsx - Main UI Component                            ║
║                                                                                ║
║  ├─ handleCreateSchool()     → Create school + admin + send emails             ║
║  ├─ handleAssignAdmin()      → Assign admin to school                          ║
║  ├─ handleDeleteSchool()     → Delete school with cascade                      ║
║  ├─ handleEditSchool()       → Update school info                              ║
║  ├─ handleResendCredentials()→ Reset password + send email                     ║
║  └─ sendWelcomeEmails()      → Send templated emails                           ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            CREATE ADMIN    SEND EMAIL      DELETE DATA
         /api/admin/...   /api/send-email  (Supabase)
                    │               │               │
                    │               │               │
    ┌───────────────┼───────────────┼───────────────┐
    │               │               │               │
    ▼               ▼               ▼               ▼

╔═══════════════════════════════════════════════════════════════════════════════╗
║                          BACKEND (Node.js/Next.js)                             ║
║                                                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │ API: /api/admin/create-user (POST)                                      │  ║
║  │                                                                          │  ║
║  │  1. Create auth user in Supabase Auth                                   │  ║
║  │  2. Wait for user confirmation                                          │  ║
║  │  3. Create profile in Supabase Database                                 │  ║
║  │  4. Return user_id and profile data                                     │  ║
║  │  5. On error: Cleanup auth user + return error                          │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │ API: /api/admin/reset-password (POST)                                   │  ║
║  │                                                                          │  ║
║  │  1. Receive user_id and new password                                    │  ║
║  │  2. Update password in Supabase Auth                                    │  ║
║  │  3. Return success                                                      │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │ API: /api/send-email (POST)                                             │  ║
║  │                                                                          │  ║
║  │  1. Receive: to, template, data                                         │  ║
║  │  2. Build email content from template                                   │  ║
║  │  3. Call EmailJS API                                                    │  ║
║  │  4. Return success/error                                                │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
                    │               │               │
                    │               │               │
    ┌───────────────┼───────────────┼───────────────┘
    │               │               │
    ▼               ▼               ▼

╔═══════════════════════════════════════════════════════════════════════════════╗
║                          EXTERNAL SERVICES                                     ║
║                                                                                ║
║  ┌──────────────────────────────────────────────────────────────────────────┐ ║
║  │ SUPABASE                                                                 │ ║
║  │                                                                          │ ║
║  │  ├─ Auth (auth.users)                                                   │ ║
║  │  │   └─ Stores user credentials & metadata                              │ ║
║  │  │                                                                      │ ║
║  │  └─ Database (public schema)                                            │ ║
║  │      ├─ schools (school info)                                           │ ║
║  │      ├─ profiles (user profiles with role)                              │ ║
║  │      ├─ students (student records)                                      │ ║
║  │      ├─ classes (class records)                                         │ ║
║  │      ├─ subjects (subject records)                                      │ ║
║  │      └─ system_audit_log (audit logs)                                   │ ║
║  │                                                                          │ ║
║  │  └─ Storage (school-assets bucket)                                      │ ║
║  │      └─ school-logos/ (school logos)                                    │ ║
║  └──────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
║  ┌──────────────────────────────────────────────────────────────────────────┐ ║
║  │ EMAILJS                                                                  │ ║
║  │                                                                          │ ║
║  │  service_id: service_zgp0mlq                                             │ ║
║  │  Templates:                                                              │ ║
║  │    ├─ template_rs5obsx   (Welcome Admin)                                 │ ║
║  │    ├─ template_myxsvo5   (Welcome Principal)                             │ ║
║  │    ├─ template_myxsvo5   (Credentials Reset)                             │ ║
║  │    └─ template_xxxxx     (Admin Assigned)                                │ ║
║  │                                                                          │ ║
║  │  Receives: email content, template params                                │ ║
║  │  Sends: Formatted email to recipient                                     │ ║
║  └──────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## Create School Flow (Detailed)

```
SUPER ADMIN CLICKS "CREATE NEW SCHOOL"
                      │
                      ▼
        ┌─────────────────────────────┐
        │  FORM DIALOG OPENS           │
        │  - School info fields        │
        │  - Admin info fields         │
        │  - Logo upload (optional)    │
        └─────────────────────────────┘
                      │
        SUPER ADMIN FILLS FORM & CLICKS CREATE
                      │
                      ▼
        ┌─────────────────────────────┐
        │  VALIDATION                  │
        │  - All required fields?      │
        │  - Valid emails?             │
        │  - Logo file valid?          │
        └─────────────────────────────┘
             │               │
          PASS           FAIL
             │               │
             ▼               ▼
        ┌────────┐     ┌──────────────┐
        │ Continue│     │ Show Error   │
        └────────┘     │ Toast        │
             │         └──────────────┘
             ▼
        ┌─────────────────────────────┐
        │  GENERATE SCHOOL CODE        │
        │  Format: {INIT}{TYPE}{YR}{RND}
        │  Ex: DHS-SC-25-5123          │
        └─────────────────────────────┘
             │
             ▼
        ┌─────────────────────────────┐
        │  UPLOAD LOGO (if provided)   │
        │  - Save to: school-assets/   │
        │  - Generate public URL       │
        └─────────────────────────────┘
             │
             ▼
        ┌─────────────────────────────┐
        │  CREATE SCHOOL RECORD        │
        │  - Insert into schools table │
        │  - Set status: active        │
        │  - Return school.id          │
        └─────────────────────────────┘
             │
             ▼
        ┌─────────────────────────────┐
        │  CREATE ADMIN USER           │
        │  - Call /api/admin/create    │
        │  - Input:                    │
        │    {email, password, name,   │
        │     phone, school_id}        │
        └─────────────────────────────┘
             │
             ├─ CREATE AUTH USER ───────────────┐
             │   └─ Supabase Auth               │
             │       ├─ Email                   │
             │       ├─ Password (hashed)       │
             │       ├─ email_confirmed: true   │
             │       └─ metadata: {role, etc}   │
             │                                  │
             ├─ CREATE PROFILE RECORD ─────────┤
             │   └─ Supabase Database          │
             │       ├─ user_id (from auth)    │
             │       ├─ email                  │
             │       ├─ role: school_admin     │
             │       ├─ school_id              │
             │       └─ account_status: active │
             │                                  │
             └─ Return Profile ───────────────┘
             │
             ▼
        ┌─────────────────────────────┐
        │  SEND ADMIN WELCOME EMAIL    │
        │  - Call /api/send-email      │
        │  - Template: welcome-admin   │
        │  - Include:                  │
        │    * School name & code      │
        │    * Username & password     │
        │    * Login URL               │
        └─────────────────────────────┘
             │
             ├─ BUILD EMAIL CONTENT ──────────┐
             │   └─ HTML formatted message    │
             │                                │
             ├─ CALL EMAILJS API ─────────────┤
             │   └─ Send email to admin       │
             │                                │
             └─ Confirm delivery ────────────┘
             │
             ▼
        ┌─────────────────────────────┐
        │  SEND PRINCIPAL EMAIL        │
        │  - Call /api/send-email      │
        │  - Template: welcome-principal
        │  - Include:                  │
        │    * School info             │
        │    * Admin details           │
        └─────────────────────────────┘
             │
             ▼
        ┌─────────────────────────────┐
        │  SUCCESS! SHOW TOAST         │
        │  - School code & admin info  │
        │  - Refresh schools list      │
        │  - Close dialog              │
        └─────────────────────────────┘
```

---

## Delete School Flow (Detailed)

```
SUPER ADMIN CLICKS DELETE ON SCHOOL
                      │
                      ▼
        ┌─────────────────────────────┐
        │  CONFIRM DIALOG APPEARS      │
        │  - "This will delete all     │
        │     related data!"           │
        │  - Cannot be undone!         │
        └─────────────────────────────┘
             │
          YES/NO
             │
        ┌─────────┴─────────┐
        │                   │
       YES                 NO
        │                   │
        ▼                   ▼
    CONTINUE           CANCEL
        │
        ▼
    ┌─────────────────────────────┐
    │  CASCADE DELETE (in order)   │
    │  - Delete students          │
    │  - Delete classes           │
    │  - Delete subjects          │
    │  - Unlink teachers/admins   │
    │  - Delete audit logs        │
    │  - DELETE SCHOOL            │
    └─────────────────────────────┘
        │
        ├─ DELETE STUDENTS ─────┐
        │  FROM students        │
        │  WHERE school_id = X  │
        │  (Students gone)      │
        │                       │
        ├─ DELETE CLASSES ──────┤
        │  FROM classes         │
        │  WHERE school_id = X  │
        │  (Classes gone)       │
        │                       │
        ├─ DELETE SUBJECTS ─────┤
        │  FROM subjects        │
        │  WHERE school_id = X  │
        │  (Subjects gone)      │
        │                       │
        ├─ UNLINK USERS ────────┤
        │  UPDATE profiles      │
        │  SET school_id = NULL │
        │  WHERE school_id = X  │
        │  (Users preserved!)   │
        │                       │
        ├─ DELETE AUDIT LOGS ───┤
        │  FROM system_audit_log
        │  WHERE school_id = X  │
        │  (Logs gone)          │
        │                       │
        └─ DELETE SCHOOL ───────┘
           FROM schools
           WHERE id = X
           (School gone!)
        │
        ▼
    ┌─────────────────────────────┐
    │  SUCCESS!                    │
    │  - School removed from list  │
    │  - Users still in system     │
    │  - Can reassign to new school│
    └─────────────────────────────┘
```

---

## Email Flow (Detailed)

```
BACKEND API RECEIVES EMAIL REQUEST
    to: admin@school.com
    template: welcome-admin
    data: { adminName, schoolName, schoolCode, ... }
                      │
                      ▼
        ┌─────────────────────────────┐
        │  VALIDATE INPUTS             │
        │  - to: valid email?          │
        │  - template: known?          │
        │  - data: complete?           │
        └─────────────────────────────┘
             │
             ▼
        ┌─────────────────────────────┐
        │  BUILD EMAIL CONTENT         │
        │  Based on template type:     │
        │                              │
        │  welcome-admin:              │
        │  ├─ Dear {{adminName}}       │
        │  ├─ Welcome message          │
        │  ├─ School code              │
        │  ├─ Username & password      │
        │  └─ Login instructions       │
        │                              │
        │  welcome-principal:          │
        │  ├─ Dear {{principalName}}   │
        │  ├─ Registration notification│
        │  ├─ Admin contact details    │
        │  └─ System instructions      │
        │                              │
        │  etc...                      │
        └─────────────────────────────┘
             │
             ▼
        ┌─────────────────────────────┐
        │  MAP TEMPLATE TO ID          │
        │  welcome-admin              │
        │    → template_rs5obsx        │
        │  welcome-principal          │
        │    → template_myxsvo5        │
        │  credentials-reset          │
        │    → template_myxsvo5        │
        │  admin-assigned             │
        │    → template_xxxxx          │
        └─────────────────────────────┘
             │
             ▼
        ┌─────────────────────────────┐
        │  VALIDATE EMAILJS CREDS      │
        │  - Service ID set?           │
        │  - Public Key set?           │
        │  - Private Key set?          │
        │  - Template ID exists?       │
        └─────────────────────────────┘
             │
             ▼
        ┌─────────────────────────────┐
        │  BUILD EMAILJS PAYLOAD       │
        │  {                           │
        │    service_id,               │
        │    template_id,              │
        │    user_id (public key),     │
        │    accessToken (private),    │
        │    template_params: {        │
        │      to_email,               │
        │      to_name,                │
        │      subject,                │
        │      message,                │
        │      ...                     │
        │    }                         │
        │  }                           │
        └─────────────────────────────┘
             │
             ▼
        ┌─────────────────────────────┐
        │  CALL EMAILJS API            │
        │  POST /api/v1.0/email/send   │
        │  https://api.emailjs.com     │
        └─────────────────────────────┘
             │
          RESPONSE
             │
        ┌─────────┴─────────┐
        │                   │
      SUCCESS             ERROR
        │                   │
        ▼                   ▼
    ┌────────┐       ┌──────────────┐
    │ Log OK  │       │ Log Error    │
    │ Return  │       │ Return Error │
    │ 200     │       │ 500/400      │
    └────────┘       └──────────────┘
        │                   │
        └───────────────────┘
             │
             ▼
        ┌─────────────────────────────┐
        │  FRONTEND RECEIVES RESPONSE  │
        │  - Success: Show toast       │
        │  - Error: Show error toast   │
        └─────────────────────────────┘
```

---

## Database State After Operations

### After Create School:

```sql
-- schools table
INSERT INTO schools (
  id, name, school_code, school_type, status,
  address, phone, contact_email,
  principal_name, principal_email, principal_phone,
  logo_url, created_at, ...
)

-- profiles table
INSERT INTO profiles (
  id (from auth.users),
  email, username, full_name, phone_number,
  role = 'school_admin',
  school_id (foreign key to schools.id),
  account_status = 'active',
  created_at, updated_at
)

-- auth.users table (Supabase Auth)
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  user_metadata = {
    full_name, phone, role: 'school_admin', school_id
  }
)
```

### After Delete School:

```sql
-- schools table
DELETE FROM schools WHERE id = 'school-id'

-- students table
DELETE FROM students WHERE school_id = 'school-id'
-- Result: No orphaned students

-- classes table
DELETE FROM classes WHERE school_id = 'school-id'
-- Result: No orphaned classes

-- profiles table
UPDATE profiles SET school_id = NULL WHERE school_id = 'school-id'
-- Result: Users preserved but unlinked

-- auth.users table
-- Result: No changes (users still exist)
```

---

## Key Design Principles

✅ **Service Role Key**: Server-side only, handles admin operations
✅ **Cascade Delete**: Automatic cleanup of related data
✅ **Email Templates**: Reusable, consistent branding
✅ **Error Handling**: Rollback on failure, user feedback
✅ **Data Preservation**: Users kept even if school deleted
✅ **Unique Codes**: No duplicates, auto-generated
✅ **Temporary Passwords**: Change on first login
✅ **Audit Trail**: All actions logged (for future use)

