// Quick Testing Guide for Schools Management

// ============================================
// 1. TEST: Create School with Admin
// ============================================

// Mock Form Data
const testSchoolData = {
  name: "Test High School",
  school_type: "Secondary",
  address: "123 Main Street",
  phone: "+1234567890",
  contact_email: "contact@testschool.com",
  principal_name: "Principal John",
  principal_email: "principal@testschool.com",
  principal_phone: "+1987654321",
  established_year: 2010,
  total_capacity: 500,
  subscription_tier: "premium",
  admin_full_name: "Admin Sarah",
  admin_email: "admin@testschool.com",
  admin_phone: "+1111111111",
  school_motto: "Excellence in Education",
  registration_number: "REG-12345",
  curriculum: "International Baccalaureate",
  logo_file: null
}

// Expected Output:
// ✅ School created with code: THS-SC-25-XXXX
// ✅ Admin user created: THS-ADM-XXXXX
// ✅ Admin welcome email sent to admin@testschool.com
// ✅ Principal notification email sent to principal@testschool.com

// ============================================
// 2. TEST: Assign Existing User as Admin
// ============================================

// Step 1: Create a regular user manually
// Step 2: In schools page, click "Assign Admin"
// Step 3: Enter their email address
// Step 4: Click "Assign"

// Expected Output:
// ✅ User role updated to school_admin
// ✅ User linked to school
// ✅ Admin assigned notification email sent

// ============================================
// 3. TEST: Resend Credentials
// ============================================

// Step 1: Go to schools list
// Step 2: Click three-dot menu on school
// Step 3: Click "Resend Credentials"

// Expected Output:
// ✅ Admin password reset
// ✅ New temporary password generated
// ✅ Credentials reset email sent with new password
// ✅ Admin can login with new password

// ============================================
// 4. TEST: Edit School
// ============================================

// Step 1: Click Edit button on school
// Step 2: Modify any field
// Step 3: Upload new logo (optional)
// Step 4: Click "Update"

// Expected Output:
// ✅ School information updated
// ✅ Logo updated if provided
// ✅ Success message shown

// ============================================
// 5. TEST: Delete School
// ============================================

// Step 1: Click Delete button on school
// Step 2: Confirm in dialog
// Step 3: Wait for cascade delete

// Expected Output:
// ✅ All students deleted
// ✅ All classes deleted
// ✅ All subjects deleted
// ✅ Teachers/admins unlinked (not deleted)
// ✅ School deleted
// ✅ Users can still login (just unlinked)

// ============================================
// Environment Variables Check
// ============================================

console.log("Checking .env.local configuration...")

const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "EMAILJS_SERVICE_ID",
  "EMAILJS_PUBLIC_KEY",
  "EMAILJS_PRIVATE_KEY",
  "EMAILJS_TEMPLATE_WELCOME_ADMIN",
  "EMAILJS_TEMPLATE_WELCOME_PRINCIPAL",
  "EMAILJS_TEMPLATE_CREDENTIALS_RESET",
  "EMAILJS_TEMPLATE_ADMIN_ASSIGNED"
]

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar]
  if (!value) {
    console.error(`❌ Missing: ${envVar}`)
  } else {
    console.log(`✅ Found: ${envVar} (value set)`)
  }
})

// ============================================
// API Health Check
// ============================================

async function checkAPIs() {
  console.log("Checking API endpoints...")

  // Check create-user API
  try {
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "test@invalid.com",
        password: "Test123!",
        full_name: "Test",
        phone: "123",
        school_id: "test",
        username: "test"
      })
    })
    console.log(`✅ /api/admin/create-user responds (status: ${response.status})`)
  } catch (error) {
    console.error(`❌ /api/admin/create-user failed: ${error.message}`)
  }

  // Check reset-password API
  try {
    const response = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: "test",
        password: "Test123!"
      })
    })
    console.log(`✅ /api/admin/reset-password responds (status: ${response.status})`)
  } catch (error) {
    console.error(`❌ /api/admin/reset-password failed: ${error.message}`)
  }

  // Check send-email API
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: "test@invalid.com",
        template: "welcome-admin",
        data: {
          adminName: "Test",
          schoolName: "Test School"
        }
      })
    })
    console.log(`✅ /api/send-email responds (status: ${response.status})`)
  } catch (error) {
    console.error(`❌ /api/send-email failed: ${error.message}`)
  }
}

// ============================================
// Console Test Commands
// ============================================

/*
// Run these in browser console (Inspector -> Console tab)

// 1. Check if Supabase is connected
supabase.auth.getUser().then(user => console.log("Supabase user:", user))

// 2. Check if localStorage has auth token
console.log("Auth token:", localStorage.getItem('sb-auth-token'))

// 3. Check if you're logged in as super_admin
console.log("Current role:", localStorage.getItem('user_role'))

// 4. Test API calls
fetch('/api/admin/create-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: true })
}).then(r => r.json()).then(console.log)

*/

// ============================================
// Common Error Messages & Solutions
// ============================================

const errorGuide = {
  "Missing required fields": {
    problem: "Form validation failed",
    solution: "Fill in all required fields marked with *"
  },
  "Failed to create auth user": {
    problem: "Email already exists or invalid email",
    solution: "Use unique email, must be valid format"
  },
  "Failed to create profile": {
    problem: "School ID not found or constraint issue",
    solution: "Make sure school exists, refresh and try again"
  },
  "EmailJS failed": {
    problem: "Email service not configured or template ID invalid",
    solution: "Check .env.local for EmailJS credentials and template IDs"
  },
  "Server configuration error": {
    problem: "Environment variables not set in server",
    solution: "Verify .env.local exists and restart development server"
  },
  "Failed to delete school": {
    problem: "Foreign key constraints blocking deletion",
    solution: "System should handle cascade delete - try again or check logs"
  },
  "No school admin assigned": {
    problem: "School has no admin yet",
    solution: "Click 'Assign Admin' first before resending credentials"
  }
}

// Print error guide
console.log("=" * 50)
console.log("ERROR TROUBLESHOOTING GUIDE")
console.log("=" * 50)
Object.entries(errorGuide).forEach(([error, guide]) => {
  console.log(`\n❌ Error: "${error}"`)
  console.log(`   Problem: ${guide.problem}`)
  console.log(`   Solution: ${guide.solution}`)
})
