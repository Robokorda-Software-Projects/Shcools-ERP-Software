// app/api/admin/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, password } = body

    console.log('🔐 Resetting password for user:', user_id)

    // Validate required fields
    if (!user_id || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: user_id, password' 
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

    console.log('🔐 Updating user password...')

    // Update user password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: password }
    )

    if (error) {
      console.error('❌ Password reset error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to reset password',
        details: error
      }, { status: 400 })
    }

    console.log('✅ Password reset successfully for user:', data.user.id)

    return NextResponse.json({ 
      success: true, 
      message: 'Password reset successfully',
      data: { user_id: data.user.id }
    })

  } catch (error: any) {
    console.error('❌ Password reset error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 })
  }
}