import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

interface ResetResult {
  email: string
  username?: string
  role?: string
  success: boolean
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting password reset for all users based on role...')

    // Get all profiles with their roles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, role')

    if (profileError) {
      return NextResponse.json(
        { error: `Failed to fetch profiles: ${profileError.message}` },
        { status: 500 }
      )
    }

    console.log(`Found ${profiles?.length || 0} profiles to reset`)

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: 'No profiles found' },
        { status: 400 }
      )
    }

    const results: ResetResult[] = []

    // Reset each user's password based on their role
    for (const profile of profiles) {
      let password = 'Test123456!' // default

      // Determine password based on role
      switch (profile.role) {
        case 'teacher':
          password = 'Teacher123!'
          break
        case 'student':
          password = 'Student123!'
          break
        case 'school_admin':
        case 'super_admin':
          password = 'Admin123!'
          break
        case 'parent':
          password = 'Parent123!'
          break
      }

      try {
        // Use the profile ID (which matches auth.users.id) to reset password
        await supabaseAdmin.auth.admin.updateUserById(profile.id, {
          password,
          email_confirm: true,
        })

        results.push({
          email: profile.email || 'unknown',
          username: profile.username,
          role: profile.role,
          success: true,
        })

        console.log(`✓ Reset password for ${profile.email} (${profile.role})`)
      } catch (err: any) {
        results.push({
          email: profile.email || 'unknown',
          username: profile.username,
          role: profile.role,
          success: false,
          error: err.message,
        })

        console.error(`✗ Failed to reset password for ${profile.email}:`, err.message)
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    console.log(`Password reset complete: ${successCount} successful, ${failureCount} failed`)

    return NextResponse.json({
      success: true,
      total: results.length,
      successCount,
      failureCount,
      results,
      message: `Reset ${successCount} of ${results.length} account passwords`,
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` },
      { status: 500 }
    )
  }
}
