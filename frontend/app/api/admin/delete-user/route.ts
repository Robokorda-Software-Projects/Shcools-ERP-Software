// app/api/admin/delete-user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id } = body

    console.log('🗑️ Deleting auth user:', user_id)

    // Validate required fields
    if (!user_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required field: user_id' 
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

    // First delete the profile (to ensure clean removal)
    console.log('🗑️ Deleting profile first...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user_id)

    if (profileError) {
      console.error('⚠️ Profile delete error (continuing):', profileError)
      // Continue anyway - profile might not exist or have different constraints
    } else {
      console.log('✅ Profile deleted')
    }

    // Delete the auth user
    console.log('🗑️ Deleting auth user...')
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)

    if (error) {
      console.error('❌ Delete user error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to delete user',
        details: error
      }, { status: 400 })
    }

    console.log('✅ Auth user deleted successfully:', user_id)

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully',
      data: { user_id }
    })

  } catch (error: any) {
    console.error('❌ Delete user error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 })
  }
}
