// app/api/admin/create-user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email, 
      password, 
      full_name, 
      phone, 
      school_id, 
      username,
      role = 'school_admin', // Default to school_admin for backwards compatibility
      employee_id,
      id_number,  // ID Number (used as password for staff)
      department
    } = body

    console.log('🔐 Creating user:', { email, username, school_id, role })

    // Validate required fields
    if (!email || !password || !full_name || !school_id || !username) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // Validate role
    const validRoles = ['school_admin', 'teacher', 'enrollment_officer', 'student', 'parent']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
      }, { status: 400 })
    }

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Environment variables not configured')
      return NextResponse.json({ 
        success: false, 
        error: 'Server configuration error' 
      }, { status: 500 })
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔐 Creating auth user...')

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { 
        full_name: full_name,
        phone: phone,
        role: role,
        school_id: school_id
      }
    })

    if (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ 
        success: false, 
        error: authError.message || 'Failed to create auth user'
      }, { status: 400 })
    }

    if (!authData || !authData.user) {
      console.error('❌ No auth data returned')
      return NextResponse.json({ 
        success: false, 
        error: 'Auth user created but no data returned' 
      }, { status: 500 })
    }

    console.log('✅ Auth user created:', authData.user.id)

    // Wait a moment for auth user to be fully created
    await new Promise(resolve => setTimeout(resolve, 500))

    // Build profile data - only include fields that have values
    const profileData: Record<string, any> = {
      id: authData.user.id,
      email: email,
      username: username,
      full_name: full_name,
      role: role,
      school_id: school_id,
      account_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add optional fields if provided
    if (phone) profileData.phone_number = phone
    if (employee_id) profileData.id_number = employee_id // Using id_number for EC Number
    if (id_number && !employee_id) profileData.id_number = id_number // Direct id_number if provided
    // Note: department field doesn't exist in profiles table, would need to be added

    // Create profile using service role (bypasses RLS)
    console.log('🔐 Creating profile...')
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert(profileData)
      .select()
      .single()

    if (profileError) {
      console.error('❌ Profile error:', profileError)
      
      // Try to clean up the auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        console.log('🧹 Cleaned up auth user after profile creation failure')
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError)
      }
      
      return NextResponse.json({ 
        success: false, 
        error: profileError.message || 'Failed to create profile',
        details: profileError
      }, { status: 400 })
    }

    console.log('✅ Profile created successfully:', profile)

    return NextResponse.json({ 
      success: true, 
      data: {
        user_id: authData.user.id,
        email: authData.user.email,
        profile: profile
      }
    })

  } catch (error: any) {
    console.error('❌ Admin user creation error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}