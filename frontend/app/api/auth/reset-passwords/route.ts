'use server'

import { createClient } from '@supabase/supabase-js'

// Create an admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function resetPassword(email: string, newPassword: string) {
  try {
    // Use admin API to update user password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      email, // This should be the user ID, not email - we need to look up first
      {
        password: newPassword,
        email_confirm: true, // Mark email as confirmed
      }
    )

    if (error) {
      console.error('Password reset error:', error)
      return { error: error.message }
    }

    return { success: true, data }
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return { error: err.message }
  }
}

export async function resetAllTestPasswords() {
  try {
    // Get all test accounts
    const { data: testUsers, error: fetchError } = await supabaseAdmin.auth.admin.listUsers()

    if (fetchError) {
      return { error: `Failed to list users: ${fetchError.message}` }
    }

    const testAccounts = testUsers?.users.filter(u => u.email?.includes('.test')) || []

    console.log(`Found ${testAccounts.length} test accounts to reset`)

    const results = []

    for (const user of testAccounts) {
      let password = 'Test123456!' // default

      // Determine password based on role (we'd need to look this up)
      if (user.email?.includes('teacher') || user.email?.includes('tc-')) {
        password = 'Teacher123!'
      } else if (user.email?.includes('student') || user.email?.includes('st-')) {
        password = 'Student123!'
      } else if (user.email?.includes('admin') || user.email?.includes('ad-')) {
        password = 'Admin123!'
      } else if (user.email?.includes('parent') || user.email?.includes('pr-')) {
        password = 'Parent123!'
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
      })

      results.push({
        email: user.email,
        success: !error,
        error: error?.message,
      })
    }

    return { success: true, results, total: testAccounts.length }
  } catch (err: any) {
    return { error: err.message }
  }
}
