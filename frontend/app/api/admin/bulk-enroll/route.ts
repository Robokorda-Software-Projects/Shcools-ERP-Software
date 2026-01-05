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

interface StudentRow {
  fullName: string
  gender: string
  birthDate: string
  nationality: string
  studentId: string
  birthCertificate: string
  address: string
  medicalConditions: string
  previousSchool: string
  parentName: string
  parentId: string
  parentPhone: string
  parentEmail: string
  parentAddress: string
  parentRelationship: string
  class: string
  feeAmount: number
}

function generateUsername(fullName: string, birthDate: string): string {
  const surname = fullName.split(' ').pop()?.toLowerCase() || 'student'
  const year = birthDate.split('-')[0]
  return `${surname}${year}`
}

function normalizeIdNumber(idNumber: string): string {
  return idNumber.toLowerCase().replace(/[-\s/]/g, '')
}

function parseCSV(csv: string): StudentRow[] {
  const lines = csv.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const rows: StudentRow[] = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    const values = lines[i].split(',').map(v => v.trim())
    const row: any = {}

    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })

    rows.push({
      fullName: row['full name'] || '',
      gender: row['gender'] || '',
      birthDate: row['birth date'] || '',
      nationality: row['nationality'] || 'Zimbabwean',
      studentId: row['student id'] || '',
      birthCertificate: row['birth certificate'] || '',
      address: row['address'] || '',
      medicalConditions: row['medical conditions'] || '',
      previousSchool: row['previous school'] || '',
      parentName: row['parent name'] || '',
      parentId: row['parent id'] || '',
      parentPhone: row['parent phone'] || '',
      parentEmail: row['parent email'] || '',
      parentAddress: row['parent address'] || '',
      parentRelationship: row['parent relationship'] || 'parent',
      class: row['class'] || '',
      feeAmount: parseFloat(row['fee amount']) || 0
    })
  }

  return rows
}

async function processRow(
  row: StudentRow,
  schoolId: string,
  enrolledBy: string,
  uploadId: string,
  rowNumber: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate required fields
    if (!row.fullName || !row.birthDate || !row.studentId) {
      return { success: false, error: 'Missing student info' }
    }

    if (!row.parentName || !row.parentId || !row.parentEmail) {
      return { success: false, error: 'Missing parent info' }
    }

    // Find class
    const classNameParts = row.class.split(' ')
    const { data: classData } = await supabaseAdmin
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)
      .eq('grade_level', classNameParts[0])
      .eq('section', classNameParts[1] || 'A')
      .single()

    if (!classData) {
      return { success: false, error: `Class ${row.class} not found` }
    }

    // Generate credentials
    const studentUsername = generateUsername(row.fullName, row.birthDate)
    const studentPassword = normalizeIdNumber(row.studentId)
    const parentUsername = generateUsername(row.parentName, row.birthDate)
    const parentPassword = normalizeIdNumber(row.parentId)

    // Create parent account
    const { data: parentAuthData, error: parentAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: row.parentEmail,
      password: parentPassword,
      email_confirm: true,
      user_metadata: {
        full_name: row.parentName,
        username: parentUsername,
        role: 'parent',
        school_id: schoolId
      }
    })

    if (parentAuthError) {
      return { success: false, error: `Parent account error: ${parentAuthError.message}` }
    }

    const parentUserId = parentAuthData.user.id

    // Create parent profile
    const { error: parentProfileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: parentUserId,
        email: row.parentEmail,
        username: parentUsername,
        full_name: row.parentName,
        role: 'parent',
        school_id: schoolId,
        phone_number: row.parentPhone,
        address: row.parentAddress,
        id_number: row.parentId,
        relationship_to_student: row.parentRelationship
      }])

    if (parentProfileError) {
      await supabaseAdmin.auth.admin.deleteUser(parentUserId)
      return { success: false, error: `Parent profile error: ${parentProfileError.message}` }
    }

    // Create student account
    const { data: studentAuthData, error: studentAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: `${studentUsername}@smartschools.local`,
      password: studentPassword,
      email_confirm: true,
      user_metadata: {
        full_name: row.fullName,
        username: studentUsername,
        role: 'student',
        school_id: schoolId
      }
    })

    if (studentAuthError) {
      await supabaseAdmin.auth.admin.deleteUser(parentUserId)
      return { success: false, error: `Student account error: ${studentAuthError.message}` }
    }

    const studentUserId = studentAuthData.user.id

    // Create student profile
    const { error: studentProfileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: studentUserId,
        email: `${studentUsername}@smartschools.local`,
        username: studentUsername,
        full_name: row.fullName,
        role: 'student',
        school_id: schoolId,
        date_of_birth: row.birthDate,
        gender: row.gender,
        address: row.address,
        id_number: row.studentId,
        phone_number: row.parentPhone
      }])

    if (studentProfileError) {
      await supabaseAdmin.auth.admin.deleteUser(studentUserId)
      await supabaseAdmin.auth.admin.deleteUser(parentUserId)
      return { success: false, error: `Student profile error: ${studentProfileError.message}` }
    }

    // Create student record
    const { data: studentRecord, error: studentRecordError } = await supabaseAdmin
      .from('students')
      .insert([{
        user_id: studentUserId,
        school_id: schoolId,
        class_id: classData.id,
        parent_id: parentUserId,
        admission_date: new Date().toISOString().split('T')[0],
        birth_date: row.birthDate,
        gender: row.gender,
        nationality: row.nationality,
        id_number: row.studentId,
        birth_certificate_number: row.birthCertificate,
        address: row.address,
        emergency_contact: row.parentPhone,
        emergency_contact_name: row.parentName,
        medical_conditions: row.medicalConditions,
        previous_school: row.previousSchool,
        student_status: 'active'
      }])
      .select()
      .single()

    if (studentRecordError) {
      await supabaseAdmin.auth.admin.deleteUser(studentUserId)
      await supabaseAdmin.auth.admin.deleteUser(parentUserId)
      return { success: false, error: `Student record error: ${studentRecordError.message}` }
    }

    // Create enrollment record
    const enrollmentNumber = `BULK-${uploadId.slice(0, 8)}-${rowNumber}`

    const { error: enrollmentError } = await supabaseAdmin
      .from('student_enrollments')
      .insert([{
        school_id: schoolId,
        student_id: studentRecord.id,
        student_user_id: studentUserId,
        student_full_name: row.fullName,
        student_gender: row.gender,
        student_birth_date: row.birthDate,
        student_nationality: row.nationality,
        student_id_number: row.studentId,
        student_birth_certificate_number: row.birthCertificate,
        parent_id: parentUserId,
        parent_user_id: parentUserId,
        parent_full_name: row.parentName,
        parent_id_number: row.parentId,
        parent_phone_number: row.parentPhone,
        parent_email: row.parentEmail,
        parent_address: row.parentAddress,
        parent_relationship: row.parentRelationship,
        class_id: classData.id,
        class_name: row.class,
        academic_year: new Date().getFullYear().toString(),
        term: 'Term 1',
        previous_school_name: row.previousSchool,
        student_username: studentUsername,
        student_initial_password: studentPassword,
        parent_username: parentUsername,
        parent_initial_password: parentPassword,
        accounts_created: true,
        enrollment_status: 'completed',
        enrollment_date: new Date().toISOString().split('T')[0],
        enrolled_by: enrolledBy,
        is_bulk_upload: true,
        bulk_upload_id: uploadId,
        bulk_upload_row_number: rowNumber,
        initial_fee_amount: row.feeAmount
      }])

    if (enrollmentError) {
      return { success: false, error: `Enrollment record error: ${enrollmentError.message}` }
    }

    // Create fee balance record
    await supabaseAdmin
      .from('student_fee_balances')
      .insert([{
        school_id: schoolId,
        student_id: studentRecord.id,
        academic_year: new Date().getFullYear().toString(),
        term: 'Term 1',
        total_fees_due: 2000,
        total_paid: row.feeAmount,
        fee_status: row.feeAmount > 0 ? 'partial' : 'unpaid'
      }])

    return { success: true }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const schoolId = formData.get('schoolId') as string
    const enrolledBy = formData.get('enrolledBy') as string

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      )
    }

    // Create upload record
    const { data: uploadRecord, error: uploadError } = await supabaseAdmin
      .from('bulk_enrollment_uploads')
      .insert([{
        school_id: schoolId,
        file_name: file.name,
        upload_status: 'processing',
        uploaded_by: enrolledBy
      }])
      .select()
      .single()

    if (uploadError) {
      return NextResponse.json(
        { message: 'Failed to create upload record' },
        { status: 500 }
      )
    }

    const uploadId = uploadRecord.id

    // Read file content
    const text = await file.text()
    const rows = parseCSV(text)

    // Process each row
    let successCount = 0
    let failCount = 0
    const errors: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const result = await processRow(rows[i], schoolId, enrolledBy, uploadId, i + 1)

      if (result.success) {
        successCount++
      } else {
        failCount++
        errors.push({
          row: i + 2, // +2 because of header and 0-index
          error: result.error
        })
      }
    }

    // Update upload record
    await supabaseAdmin
      .from('bulk_enrollment_uploads')
      .update({
        total_rows: rows.length,
        successful_rows: successCount,
        failed_rows: failCount,
        upload_status: 'completed',
        processing_completed_at: new Date().toISOString(),
        errors: errors
      })
      .eq('id', uploadId)

    return NextResponse.json({
      success: true,
      total_rows: rows.length,
      successful_rows: successCount,
      failed_rows: failCount,
      uploadId,
      errors: failCount > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { message: 'Upload failed: ' + error.message },
      { status: 500 }
    )
  }
}
