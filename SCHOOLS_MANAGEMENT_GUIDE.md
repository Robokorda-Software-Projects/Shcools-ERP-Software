# Schools Management System - Complete Guide

## Overview
This guide explains the complete workflow for managing schools, admins, principals, and email credentials in the SmartSchools ERP system.

---

## 🎯 Main Features

### 1. **Create School**
Creates a new school with admin and sends welcome emails.

**Flow:**
```
Create School Form
    ↓
Validate Form Data
    ↓
Generate School Code (e.g., DHS-PR-25-5123)
    ↓
Upload Logo (optional)
    ↓
Save School to Database
    ↓
Create Admin User (in Auth & Profiles)
    ↓
Send Welcome Emails
    └─→ Admin Email (with credentials)
    └─→ Principal Email (notification)
    ↓
Show Success Toast
```

**Required Fields:**
- School Name, Type (Primary/Secondary)
- Address, Phone, Email
- Principal Name, Email, Phone
- Admin Name, Email, Phone
- Subscription Tier, Capacity, etc.

**Behind the Scenes:**
1. Generates unique school code: `{INITIALS}{TYPE_CODE}{YEAR}{RANDOM}`
   - Example: `DHS` (initials) + `PR` (Primary) + `25` (2025) + `5123` (random)
2. Uploads logo to Supabase Storage if provided
3. Creates school record in `schools` table
4. Calls `/api/admin/create-user` to:
   - Create auth user in Supabase Auth
   - Create profile record in `profiles` table
5. Sends two emails via EmailJS:
   - Welcome email to admin (includes username & temp password)
   - Welcome email to principal (notification only)

---

### 2. **Assign Admin to School**
Assign an existing user or create new user as school admin.

**Flow:**
```
Select School → Assign Admin Dialog
    ↓
Enter Admin Email, Name, Phone
    ↓
Check if User Exists
    ├─ YES: Update existing user role to school_admin
    └─ NO: Create new admin user (same as Create School)
    ↓
Send Email Notification
    ↓
Show Success Toast
```

**Two Cases:**
1. **Existing User**: Update their role and school assignment
2. **New User**: Create auth account and profile

---

### 3. **Delete School**
Cascade delete school and all related data.

**Flow:**
```
Confirm Delete Action
    ↓
Delete All Related Data (in order):
    ├─ Delete students
    ├─ Delete classes
    ├─ Delete subjects
    ├─ Unlink teachers/admins (set school_id = null)
    ├─ Delete audit logs
    └─ Finally: Delete school
    ↓
Show Success Toast
```

**Safety:**
- Shows confirmation dialog with warning
- Preserves user accounts (only unlinks them)
- Deletes only school-specific data

---

### 4. **Resend Credentials**
Reset admin password and send new credentials.

**Flow:**
```
Click "Resend Credentials"
    ↓
Check if Admin Exists
    ↓
Generate New Temporary Password
    ↓
Call `/api/admin/reset-password` API
    ├─ Updates password in Supabase Auth
    └─ Returns confirmation
    ↓
Send "Credentials Reset" Email
    ├─ New username
    ├─ New temporary password
    └─ Login URL
    ↓
Show Success Toast
```

**Password Format:** `Admin@{SCHOOL_CODE}{RANDOM_3_DIGITS}`

---

### 5. **Edit School**
Update school information and logo.

**Flow:**
```
Click Edit School
    ↓
Pre-fill Form with Current Data
    ↓
Make Changes
    ↓
Upload New Logo (optional)
    ↓
Update Database
    ↓
Show Success Toast
```

**Editable Fields:**
- Name, Type, Address, Phone, Email
- Principal Details
- Capacity, Subscription Tier
- School Motto, Registration Number
- Curriculum, Logo

---

## 📧 Email Templates

### Template 1: Welcome Admin
**When:** New school created or admin assigned
**Variables:** adminName, schoolName, schoolCode, username, password, loginUrl, supportEmail
**Content:** Admin receives login credentials

### Template 2: Welcome Principal
**When:** New school created
**Variables:** principalName, schoolName, schoolCode, adminName, adminEmail, adminPhone, supportEmail
**Content:** Principal receives notification about school registration and admin details

### Template 3: Credentials Reset
**When:** Resend credentials clicked
**Variables:** adminName, schoolName, username, password, loginUrl
**Content:** Admin receives new password for login

### Template 4: Admin Assigned
**When:** Existing user assigned as admin
**Variables:** adminName, schoolName, schoolCode, loginUrl, supportEmail
**Content:** Admin receives notification of role assignment

---

## 🔧 API Endpoints

### 1. `/api/admin/create-user` (POST)
**Purpose:** Create new admin user in Auth and Profiles

**Request:**
```json
{
  "email": "admin@school.com",
  "password": "Admin@SchoolCode123",
  "full_name": "Admin Name",
  "phone": "1234567890",
  "school_id": "school-uuid",
  "username": "SCHOOLCODE-ADM-12345"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "user-uuid",
    "email": "admin@school.com",
    "profile": { ... }
  }
}
```

**Error Cases:**
- Missing required fields → 400
- Auth user creation fails → 400 (returns error details)
- Profile creation fails → 400 + cleanup auth user
- Server config error → 500

---

### 2. `/api/admin/reset-password` (POST)
**Purpose:** Reset existing admin password

**Request:**
```json
{
  "user_id": "user-uuid",
  "password": "Admin@SchoolCode123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": { "user_id": "user-uuid" }
}
```

**Error Cases:**
- Missing required fields → 400
- User not found → 400
- Permission denied → 400

---

### 3. `/api/send-email` (POST)
**Purpose:** Send templated emails via EmailJS

**Request:**
```json
{
  "to": "email@example.com",
  "subject": "Welcome to SmartSchools ERP",
  "template": "welcome-admin",
  "data": {
    "adminName": "John Doe",
    "schoolName": "Demo High School",
    "schoolCode": "DHS-SC-25-1234",
    "username": "DHS-ADM-12345",
    "password": "Admin@DHS123",
    "loginUrl": "http://localhost:3000/login",
    "supportEmail": "support@smartschools.com"
  }
}
```

**Valid Templates:**
- `welcome-admin`
- `welcome-principal`
- `credentials-reset`
- `admin-assigned`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Email sent successfully",
    "to": "email@example.com",
    "template": "welcome-admin"
  }
}
```

**Error Cases:**
- Missing required fields → 400
- Unknown template → 400
- EmailJS credentials missing → 500
- EmailJS API error → 500

---

## ⚙️ Environment Configuration

**.env.local** must contain:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# EmailJS
EMAILJS_SERVICE_ID=service_...
EMAILJS_PUBLIC_KEY=...
EMAILJS_PRIVATE_KEY=...
EMAILJS_TEMPLATE_WELCOME_ADMIN=template_...
EMAILJS_TEMPLATE_WELCOME_PRINCIPAL=template_...
EMAILJS_TEMPLATE_CREDENTIALS_RESET=template_...
EMAILJS_TEMPLATE_ADMIN_ASSIGNED=template_...
```

---

## 🐛 Troubleshooting

### Issue: School created but email not sent
**Possible Causes:**
1. EmailJS credentials missing in `.env.local`
2. Template ID doesn't exist in EmailJS
3. Invalid recipient email address
4. EmailJS API is down

**Solution:**
- Check console for error message
- Verify `.env.local` has all EmailJS keys
- Go to EmailJS dashboard and confirm template IDs
- Check network tab in DevTools for API errors

---

### Issue: Admin created but user can't login
**Possible Causes:**
1. Password not set correctly
2. Email not confirmed in Auth
3. Profile not created properly
4. User account suspended

**Solution:**
- Click "Resend Credentials" to reset password
- Check Supabase dashboard for user status
- Verify profile record exists in `profiles` table
- Check `account_status` field is "active"

---

### Issue: School deletion fails
**Possible Causes:**
1. Foreign key constraints not properly handled
2. User still linked to school
3. Permission denied

**Solution:**
- Frontend automatically handles cascade delete
- Check Supabase RLS policies
- Verify service role key is correct

---

### Issue: Can't assign existing user as admin
**Possible Causes:**
1. User email doesn't exist
2. User already has admin role
3. Permission denied

**Solution:**
- Create user first if not exists
- Check `profiles` table for user email
- Verify you have super_admin role

---

## 📊 Database Schema (Relevant Tables)

### schools
```sql
id, name, school_code, school_type, status
address, phone, contact_email
principal_name, principal_email, principal_phone
established_year, total_capacity, current_enrollment
subscription_tier, subscription_expires_at
logo_url, school_motto, registration_number
curriculum, created_at, updated_at
```

### profiles
```sql
id, email, username, full_name, phone_number
role (school_admin, teacher, parent, student, super_admin)
school_id, account_status, last_login_at
created_at, updated_at
```

### auth.users (Supabase Auth)
```sql
id, email, password_hash, email_confirmed_at
user_metadata (contains full_name, phone, role, school_id)
created_at, updated_at
```

---

## ✅ Testing Checklist

- [ ] Create school with new admin → Emails sent?
- [ ] Create school without logo → Works?
- [ ] Assign existing user as admin → Works?
- [ ] Create admin → User can login with credentials?
- [ ] Resend credentials → New password works?
- [ ] Delete school → All data deleted, users preserved?
- [ ] Edit school → Changes applied?
- [ ] View school stats → Numbers correct?

---

## 🚀 Next Steps

1. **Verify EmailJS Templates**
   - Log into EmailJS dashboard
   - Confirm all 4 template IDs exist
   - Test with sample variables

2. **Test Email Sending**
   - Create a test school
   - Check admin email inbox
   - Verify email content is correct

3. **Monitor Errors**
   - Check browser console for errors
   - Check server logs for validation issues
   - Check Supabase dashboard for data creation issues

4. **Optimize Performance**
   - Add loading indicators
   - Cache school list
   - Optimize database queries

