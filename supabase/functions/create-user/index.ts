import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, full_name, role, school_id, school_code } = await req.json()

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (authError) throw authError

    // Generate username
    const rolePrefix = role === 'teacher' ? 'TC' : role === 'student' ? 'ST' : role === 'parent' ? 'PR' : 'AD'
    const randomNum = Math.floor(10000000 + Math.random() * 90000000)
    const username = `${school_code}-${rolePrefix}-${randomNum}`

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        username: username,
        full_name: full_name,
        role: role,
        school_id: school_id
      })

    if (profileError) throw profileError

    // If student, create student record
    if (role === 'student') {
      const { error: studentError } = await supabaseAdmin
        .from('students')
        .insert({
          user_id: authData.user.id,
          admission_date: new Date().toISOString().split('T')[0]
        })

      if (studentError) throw studentError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: authData.user.id,
        username: username 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
