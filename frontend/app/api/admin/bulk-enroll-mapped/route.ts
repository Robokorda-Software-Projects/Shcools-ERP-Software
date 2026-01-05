import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

interface MappedStudentData {
  rowNumber: number
  student_full_name: string
  student_gender: string
  student_birth_date: string
  student_nationality?: string
  student_id_number: string
  student_birth_certificate?: string
  student_address?: string
  student_medical_conditions?: string
  student_previous_school?: string
  parent_full_name: string
  parent_id_number: string
  parent_birth_date: string
  parent_phone: string
  parent_email: string
  parent_address?: string
  parent_relationship?: string
  parent_occupation?: string
  class_name: string
  grade_level: string
  fee_amount?: number
  notes?: string
}

function generateUsername(fullName: string, birthDate: string): string {
  const surname = fullName.split(' ').pop()?.toLowerCase() || 'user'
  const year = birthDate.split('-')[0]
  return `${surname}${year}`
}

function normalizeIdNumber(idNumber: string): string {
  return idNumber.toLowerCase().replace(/[-\s/]/g, '')
}

function generateAdmissionNumber(schoolCode: string): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return `${schoolCode}${randomNum}`
}

async function processStudent(
  student: MappedStudentData,
  schoolId: string,
  schoolCode: string,
  enrolledBy: string,
  uploadId: string,
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
): Promise<{ success: boolean; error?: string; studentName?: string }> {
  try {
    // Validate required fields
    if (!student.student_full_name || !student.student_birth_date || !student.student_id_number || !student.student_gender) {
      return { 
        success: false, 
        error: 'Missing required student fields (name, birth date, ID, or gender)',
        studentName: student.student_full_name || 'Unknown'
      }
    }

    if (!student.parent_full_name || !student.parent_id_number || !student.parent_birth_date || !student.parent_phone || !student.parent_email) {
      return { 
        success: false, 
        error: 'Missing required parent fields (name, ID, birth date, phone, or email)',
        studentName: student.student_full_name
      }
    }

    if (!student.grade_level || !student.class_name) {
      return { 
        success: false, 
        error: 'Missing class information (grade level or class name)',
        studentName: student.student_full_name
      }
    }

    // Find class - improved matching logic with debug logging
    console.log(`[Class Match] Looking for: grade="${student.grade_level}", section="${student.class_name}"`)
    
    // Try exact match first
    let { data: classData } = await supabaseAdmin
      .from('classes')
      .select('id, grade_level, section')
      .eq('school_id', schoolId)
      .eq('grade_level', student.grade_level)
      .eq('section', student.class_name)
      .maybeSingle()

    // Try with just the last part (e.g., "Form 1A" -> "A")
    if (!classData) {
      const sectionLetter = student.class_name.match(/[A-Z]$/)?.[0]
      if (sectionLetter) {
        console.log(`[Class Match] Trying section letter: ${sectionLetter}`)
        const { data: letterMatch } = await supabaseAdmin
          .from('classes')
          .select('id, grade_level, section')
          .eq('school_id', schoolId)
          .eq('grade_level', student.grade_level)
          .eq('section', sectionLetter)
          .maybeSingle()
        if (letterMatch) classData = letterMatch
      }
    }

    // Try fuzzy match as last resort
    if (!classData) {
      console.log(`[Class Match] Trying fuzzy match...`)
      const { data: fuzzyMatches } = await supabaseAdmin
        .from('classes')
        .select('id, grade_level, section')
        .eq('school_id', schoolId)
        .or(`grade_level.ilike.%${student.grade_level}%,section.ilike.%${student.class_name}%`)
        .limit(1)

      if (fuzzyMatches && fuzzyMatches.length > 0) {
        classData = fuzzyMatches[0]
      }
    }

    if (!classData) {
      console.error(`[Class Match] FAILED for: "${student.grade_level}" section "${student.class_name}"`)
      return { 
        success: false, 
        error: `Class not found: "${student.grade_level}" section "${student.class_name}". Please create this class first or check your mapping.`,
        studentName: student.student_full_name
      }
    }

    console.log(`[Class Match] SUCCESS: ${classData.grade_level} ${classData.section} (ID: ${classData.id})`)
    const classId = classData.id

    // Generate credentials
    const studentUsername = generateUsername(student.student_full_name, student.student_birth_date)
    const studentPassword = normalizeIdNumber(student.student_id_number)
    const parentUsername = generateUsername(student.parent_full_name, student.parent_birth_date)
    const parentPassword = normalizeIdNumber(student.parent_id_number)

    // Check if parent already exists
    let parentUserId: string
    const { data: existingParent } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id_number', student.parent_id_number)
      .eq('role', 'parent')
      .single()

    if (existingParent) {
      parentUserId = existingParent.id
    } else {
      // Create parent account
      const { data: parentAuthData, error: parentAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: student.parent_email,
        password: parentPassword,
        email_confirm: true,
        user_metadata: {
          full_name: student.parent_full_name,
          username: parentUsername,
          role: 'parent',
          school_id: schoolId
        }
      })

      if (parentAuthError) {
        // Check if email already exists
        if (parentAuthError.message.includes('already registered')) {
          return { 
            success: false, 
            error: `Parent email ${student.parent_email} already registered`,
            studentName: student.student_full_name
          }
        }
        return { 
          success: false, 
          error: `Parent account error: ${parentAuthError.message}`,
          studentName: student.student_full_name
        }
      }

      parentUserId = parentAuthData.user.id

      // Create parent profile
      const { error: parentProfileError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: parentUserId,
          email: student.parent_email,
          username: parentUsername,
          full_name: student.parent_full_name,
          role: 'parent',
          school_id: schoolId,
          phone_number: student.parent_phone,
          address: student.parent_address || student.student_address,
          id_number: student.parent_id_number,
          date_of_birth: student.parent_birth_date,
          relationship_to_student: student.parent_relationship || 'parent',
          occupation: student.parent_occupation
        }])

      if (parentProfileError) {
        await supabaseAdmin.auth.admin.deleteUser(parentUserId)
        return { 
          success: false, 
          error: `Parent profile error: ${parentProfileError.message}`,
          studentName: student.student_full_name
        }
      }
    }

    // Create student account
    const studentEmail = `${studentUsername}@smartschools.local`
    const { data: studentAuthData, error: studentAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
      user_metadata: {
        full_name: student.student_full_name,
        username: studentUsername,
        role: 'student',
        school_id: schoolId
      }
    })

    if (studentAuthError) {
      return { 
        success: false, 
        error: `Student account error: ${studentAuthError.message}`,
        studentName: student.student_full_name
      }
    }

    const studentUserId = studentAuthData.user.id

    // Create student profile
    const { error: studentProfileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: studentUserId,
        email: studentEmail,
        username: studentUsername,
        full_name: student.student_full_name,
        role: 'student',
        school_id: schoolId,
        date_of_birth: student.student_birth_date,
        gender: student.student_gender,
        address: student.student_address,
        id_number: student.student_id_number,
        phone_number: student.parent_phone
      }])

    if (studentProfileError) {
      await supabaseAdmin.auth.admin.deleteUser(studentUserId)
      return { 
        success: false, 
        error: `Student profile error: ${studentProfileError.message}`,
        studentName: student.student_full_name
      }
    }

    // Generate admission number
    const admissionNumber = generateAdmissionNumber(schoolCode)

    // Create student record
    const { data: studentRecord, error: studentRecordError } = await supabaseAdmin
      .from('students')
      .insert([{
        user_id: studentUserId,
        school_id: schoolId,
        class_id: classId,
        parent_id: parentUserId,
        admission_date: new Date().toISOString().split('T')[0],
        admission_number: admissionNumber,
        birth_date: student.student_birth_date,
        gender: student.student_gender,
        nationality: student.student_nationality || 'Zimbabwe',
        id_number: student.student_id_number,
        birth_certificate_number: student.student_birth_certificate,
        address: student.student_address,
        emergency_contact: student.parent_phone,
        emergency_contact_name: student.parent_full_name,
        medical_conditions: student.student_medical_conditions,
        previous_school: student.student_previous_school,
        student_status: 'active'
      }])
      .select()
      .single()

    if (studentRecordError) {
      await supabaseAdmin.auth.admin.deleteUser(studentUserId)
      // Don't delete parent if they already existed
      if (!existingParent) {
        await supabaseAdmin.auth.admin.deleteUser(parentUserId)
      }
      return { 
        success: false, 
        error: `Student record error: ${studentRecordError.message}`,
        studentName: student.student_full_name
      }
    }

    // Create enrollment record
    const enrollmentNumber = `BULK-${uploadId.slice(0, 8)}-${student.rowNumber}`

    const { error: enrollmentError } = await supabaseAdmin
      .from('student_enrollments')
      .insert([{
        school_id: schoolId,
        student_id: studentRecord.id,
        student_user_id: studentUserId,
        student_full_name: student.student_full_name,
        student_gender: student.student_gender,
        student_birth_date: student.student_birth_date,
        student_nationality: student.student_nationality || 'Zimbabwe',
        student_id_number: student.student_id_number,
        student_birth_certificate_number: student.student_birth_certificate,
        parent_id: parentUserId,
        parent_user_id: parentUserId,
        parent_full_name: student.parent_full_name,
        parent_id_number: student.parent_id_number,
        parent_phone_number: student.parent_phone,
        parent_email: student.parent_email,
        parent_address: student.parent_address || student.student_address,
        parent_relationship: student.parent_relationship || 'parent',
        class_id: classId,
        grade_level: student.grade_level,
        enrollment_number: enrollmentNumber,
        enrollment_date: new Date().toISOString().split('T')[0],
        enrolled_by: enrolledBy,
        enrollment_status: 'active',
        fee_amount_paid: student.fee_amount || 0,
        notes: student.notes
      }])

    if (enrollmentError) {
      console.error('Enrollment record error:', enrollmentError)
      // Don't fail the whole enrollment, just log it
    }

    return { success: true, studentName: student.student_full_name }

  } catch (error: any) {
    console.error('Processing error:', error)
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      studentName: student.student_full_name || 'Unknown'
    }
  }
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const body = await request.json()
    const { students, schoolId, enrolledBy, fileName } = body

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No student data provided' },
        { status: 400 }
      )
    }

    if (!schoolId || !enrolledBy) {
      return NextResponse.json(
        { success: false, message: 'Missing school ID or enrolled by' },
        { status: 400 }
      )
    }

    // Get school code
    const { data: schoolData } = await supabaseAdmin
      .from('schools')
      .select('school_code')
      .eq('id', schoolId)
      .single()

    if (!schoolData) {
      return NextResponse.json(
        { success: false, message: 'School not found' },
        { status: 404 }
      )
    }

    const schoolCode = schoolData.school_code || 'SCH'

    // Generate upload ID
    const uploadId = `${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Process all students
    const results = await Promise.all(
      students.map(student => processStudent(student, schoolId, schoolCode, enrolledBy, uploadId, supabaseAdmin))
    )

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const errors = results
      .filter(r => !r.success)
      .map((r, index) => ({
        row: students[index].rowNumber,
        student_name: r.studentName,
        error: r.error
      }))

    // Save bulk upload record
    await supabaseAdmin
      .from('bulk_enrollment_uploads')
      .insert([{
        school_id: schoolId,
        file_name: fileName || 'unknown.csv',
        total_rows: students.length,
        successful_rows: successful,
        failed_rows: failed,
        upload_status: failed === 0 ? 'completed' : 'completed_with_errors',
        uploaded_by: enrolledBy,
        errors: errors
      }])

    return NextResponse.json({
      success: true,
      total: students.length,
      successful,
      failed,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Bulk enrollment error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Internal server error',
        error: error.toString()
      },
      { status: 500 }
    )
  }
}
