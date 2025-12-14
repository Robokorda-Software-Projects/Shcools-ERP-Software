// app/api/admin/create-user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, phone, school_id, username } = body

    console.log('🔐 Creating admin user:', { email, username, school_id })

    // Validate required fields
    if (!email || !password || !full_name || !school_id || !username) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
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
        role: 'school_admin',
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

    // Create profile using service role (bypasses RLS)
    console.log('🔐 Creating profile...')
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        username: username,
        full_name: full_name,
        phone_number: phone,
        role: 'school_admin',
        school_id: school_id,
        account_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
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

    console.log('✅ Profile created successfully:', profileData)

    return NextResponse.json({ 
      success: true, 
      data: {
        user_id: authData.user.id,
        email: authData.user.email,
        profile: profileData
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