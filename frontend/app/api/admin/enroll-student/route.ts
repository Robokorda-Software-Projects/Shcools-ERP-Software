/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/enroll-student/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function generateUsername(fullName: string, birthDate: string): string {
  const surname = fullName.split(' ').pop()?.toLowerCase() || 'student'
  const year = birthDate.split('-')[0]
  return `${surname}${year}`
}

function normalizeIdNumber(idNumber: string): string {
  return idNumber.toLowerCase().replace(/[-\s/]/g, '')
}

function generateEnrollmentNumber(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `ENR-${timestamp}${random}`
}

function generateAdmissionNumber(schoolCode: string): string {
  // Generate admission number: SCHOOL_CODE + 4 random digits
  // Example: ABC1234, XYZ5678
  const random4Digits = Math.floor(1000 + Math.random() * 9000).toString()
  return `${schoolCode.toUpperCase().substring(0, 3)}${random4Digits}`
}

export async function POST(request: NextRequest) {
  console.log('🎓 ========== STUDENT ENROLLMENT API CALLED ==========')
  
  try {
    // Step 1: Validate environment variables
    console.log('📋 Step 1: Checking environment variables...')
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing environment variables')
      return NextResponse.json({ 
        success: false, 
        message: 'Server configuration error - missing environment variables' 
      }, { status: 500 })
    }
    console.log('✅ Environment variables OK')

    // Step 2: Create Supabase admin client INSIDE the function
    console.log('📋 Step 2: Creating Supabase admin client...')
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
    console.log('✅ Supabase admin client created')

    // Step 3: Parse request body
    console.log('📋 Step 3: Parsing request body...')
    const body = await request.json()
    console.log('✅ Request body parsed:', JSON.stringify(body, null, 2))

    const {
      student,
      parent,
      classId,
      className,
      previousGrades = [],
      feePaid = 0,
      feeSlipUrl,
      documentUrls = {}, // Extract document URLs
      schoolId,
      enrolledBy,
      entryStatus,
      formName,
      selectedSubjectIds = [], // Subject IDs selected during enrollment
      isALevel = false // Whether this is an A-Level student
    } = body

    // Step 4: Validate required fields
    console.log('📋 Step 4: Validating required fields...')
    
    if (!student || !student.fullName || !student.birthDate || !student.idNumber) {
      console.error('❌ Student data incomplete:', student)
      return NextResponse.json({ 
        success: false, 
        message: 'Student information incomplete - need fullName, birthDate, and idNumber' 
      }, { status: 400 })
    }

    if (!parent || !parent.fullName || !parent.idNumber || !parent.email) {
      console.error('❌ Parent data incomplete:', parent)
      return NextResponse.json({ 
        success: false, 
        message: 'Parent information incomplete - need fullName, idNumber, and email' 
      }, { status: 400 })
    }

    if (!classId) {
      console.error('❌ Class ID missing')
      return NextResponse.json({ 
        success: false, 
        message: 'Class selection required' 
      }, { status: 400 })
    }

    if (!schoolId) {
      console.error('❌ School ID missing')
      return NextResponse.json({ 
        success: false, 
        message: 'School ID required' 
      }, { status: 400 })
    }
    console.log('✅ All required fields validated')

    // Step 4.5: Get school code for admission number
    console.log('📋 Step 4.5: Fetching school information...')
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('school_code')
      .eq('id', schoolId)
      .single()
    
    if (schoolError || !schoolData) {
      console.error('❌ Failed to fetch school data:', schoolError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to fetch school information' 
      }, { status: 500 })
    }
    console.log('✅ School code retrieved:', schoolData.school_code)

    // Step 5: Generate credentials and admission number
    console.log('📋 Step 5: Generating credentials and admission number...')
    const parentBirthYear = parent.birthDate ? parent.birthDate.split('-')[0] : student.birthDate.split('-')[0]
    const studentUsername = generateUsername(student.fullName, student.birthDate)
    const studentPassword = normalizeIdNumber(student.idNumber)
    const studentEmail = `${studentUsername}@smartschools.local`
    const parentSurname = parent.fullName.split(' ').pop()?.toLowerCase() || 'parent'
    const parentUsername = `${parentSurname}${parentBirthYear}`
    const parentPassword = normalizeIdNumber(parent.idNumber)
    const admissionNumber = generateAdmissionNumber(schoolData.school_code || 'STU')
    
    // Combine medical conditions and details
    let medicalConditionsText = ''
    if (student.medicalConditions && student.medicalConditions !== 'none') {
      const conditionLabel = student.medicalConditions
      const details = student.medicalConditionsDetails || ''
      medicalConditionsText = details ? `${conditionLabel}: ${details}` : conditionLabel
    }

    console.log('✅ Generated credentials:')
    console.log('   Student:', { username: studentUsername, email: studentEmail, admissionNumber })
    console.log('   Parent:', { username: parentUsername, email: parent.email })
    console.log('   Medical Conditions:', medicalConditionsText || 'None')

    // Step 6: Check if users already exist
    console.log('📋 Step 6: Checking for existing users...')
    
    // Check specifically for the parent email first (more reliable than listing all users)
    const { data: existingParentAuth } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Increase limit to get more users
    })
    
    const existingEmails = existingParentAuth?.users.map(u => u.email?.toLowerCase()) || []
    console.log('   Total existing users found:', existingEmails.length)
    console.log('   Checking for parent email:', parent.email.toLowerCase())
    console.log('   Parent email exists in list:', existingEmails.includes(parent.email.toLowerCase()))
    
    if (existingEmails.includes(studentEmail.toLowerCase())) {
      console.error('❌ Student email already exists:', studentEmail)
      return NextResponse.json({ 
        success: false, 
        message: 'A student with this username already exists. Try a different ID number.' 
      }, { status: 400 })
    }

    // Step 6B: Check if parent already exists and link if so
    let parentUserId: string
    const parentEmailLower = parent.email.toLowerCase()
    
    if (existingEmails.includes(parentEmailLower)) {
      console.log('🔗 Parent email exists - linking to existing parent account')
      
      // Get existing parent profile using case-insensitive email match
      const { data: existingParent, error: parentFetchError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, username')
        .ilike('email', parent.email)
        .eq('role', 'parent')
        .single()
      
      if (parentFetchError || !existingParent) {
        console.error('❌ Failed to fetch existing parent:', parentFetchError)
        // Try without role filter as fallback
        const { data: fallbackParent } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, username, role')
          .ilike('email', parent.email)
          .single()
        
        if (fallbackParent) {
          parentUserId = fallbackParent.id
          console.log('✅ Found parent (fallback):', fallbackParent.full_name, 'Role:', fallbackParent.role)
        } else {
          return NextResponse.json({ 
            success: false, 
            message: 'Parent email exists in auth but profile not found. Contact administrator.' 
          }, { status: 400 })
        }
      } else {
        parentUserId = existingParent.id
        console.log('✅ Linked to existing parent:', existingParent.full_name)
      }
    } else {
      console.log('✅ No duplicate parent email - will create new parent')

      // Step 7: Create parent auth user
      console.log('📋 Step 7: Creating parent auth user...')
      const { data: parentAuthData, error: parentAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: parent.email,
        password: parentPassword,
        email_confirm: true,
        user_metadata: {
          full_name: parent.fullName,
          username: parentUsername,
          role: 'parent',
          school_id: schoolId
        }
      })

      if (parentAuthError) {
        console.error('❌ Failed to create parent auth user:', parentAuthError)
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to create parent account: ' + parentAuthError.message 
        }, { status: 500 })
      }

      parentUserId = parentAuthData.user.id
      console.log('✅ Parent auth user created:', parentUserId)

      // Wait for auth user to be fully created
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 8: Create parent profile
      console.log('📋 Step 8: Creating parent profile...')
      const parentProfileData = {
        id: parentUserId,
        email: parent.email,
        username: parentUsername,
        full_name: parent.fullName,
        role: 'parent',
        school_id: schoolId,
        phone_number: parent.phoneNumber || null,
        address: parent.address || null,
        id_number: parent.idNumber,
        date_of_birth: parent.birthDate || null,
        account_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      console.log('   Parent profile data:', JSON.stringify(parentProfileData, null, 2))

      const { error: parentProfileError } = await supabaseAdmin
        .from('profiles')
        .insert(parentProfileData)

      if (parentProfileError) {
        console.error('❌ Failed to create parent profile:', parentProfileError)
        // Cleanup: delete parent auth user
        await supabaseAdmin.auth.admin.deleteUser(parentUserId)
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to create parent profile: ' + parentProfileError.message 
        }, { status: 500 })
      }
      console.log('✅ Parent profile created')
    }

    // Step 9: Create student auth user
    console.log('📋 Step 9: Creating student auth user...')
    const { data: studentAuthData, error: studentAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
      user_metadata: {
        full_name: student.fullName,
        username: studentUsername,
        role: 'student',
        school_id: schoolId
      }
    })

    if (studentAuthError) {
      console.error('❌ Failed to create student auth user:', studentAuthError)
      // Cleanup: delete parent
      await supabaseAdmin.auth.admin.deleteUser(parentUserId)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create student account: ' + studentAuthError.message 
      }, { status: 500 })
    }

    const studentUserId = studentAuthData.user.id
    console.log('✅ Student auth user created:', studentUserId)

    // Wait for auth user to be fully created
    await new Promise(resolve => setTimeout(resolve, 500))

    // Step 10: Create student profile
    console.log('📋 Step 10: Creating student profile...')
    const studentProfileData = {
      id: studentUserId,
      email: studentEmail,
      username: studentUsername,
      full_name: student.fullName,
      role: 'student',
      school_id: schoolId,
      date_of_birth: student.birthDate,
      gender: student.gender || null,
      address: student.address || null,
      id_number: student.idNumber,
      phone_number: student.phoneNumber || null,
      account_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    console.log('   Student profile data:', JSON.stringify(studentProfileData, null, 2))

    const { error: studentProfileError } = await supabaseAdmin
      .from('profiles')
      .insert(studentProfileData)

    if (studentProfileError) {
      console.error('❌ Failed to create student profile:', studentProfileError)
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(studentUserId)
      await supabaseAdmin.auth.admin.deleteUser(parentUserId)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create student profile: ' + studentProfileError.message 
      }, { status: 500 })
    }
    console.log('✅ Student profile created')

    // Step 11: Create student record in students table
    console.log('📋 Step 11: Creating student record in students table...')
    const studentRecordData = {
      user_id: studentUserId,
      school_id: schoolId,
      class_id: classId,
      parent_id: parentUserId,
      admission_number: admissionNumber,
      admission_date: new Date().toISOString().split('T')[0],
      birth_date: student.birthDate,
      gender: student.gender || null,
      nationality: student.nationality || 'Zimbabwe',
      id_number: student.idNumber,
      birth_certificate_number: student.birthCertificateNumber || null,
      address: student.address || null,
      emergency_contact: parent.phoneNumber || null,
      emergency_contact_name: parent.fullName,
      medical_conditions: medicalConditionsText || null,
      previous_school: student.previousSchool || null,
      fee_slip_url: feeSlipUrl || null,
      birth_certificate_url: documentUrls.birth_certificate_url || null,
      student_id_url: documentUrls.student_id_url || null,
      parent_id_url: documentUrls.parent_id_url || null,
      previous_school_report_url: documentUrls.previous_school_report_url || null,
      student_status: 'active'
    }
    console.log('   Student record data:', JSON.stringify(studentRecordData, null, 2))

    const { data: studentRecord, error: studentRecordError } = await supabaseAdmin
      .from('students')
      .insert(studentRecordData)
      .select()
      .single()

    if (studentRecordError) {
      console.error('❌ Failed to create student record:', studentRecordError)
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(studentUserId)
      await supabaseAdmin.auth.admin.deleteUser(parentUserId)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create student record: ' + studentRecordError.message 
      }, { status: 500 })
    }
    console.log('✅ Student record created:', studentRecord.id)

    // Step 12: Create enrollment record (optional - continue if fails)
    console.log('📋 Step 12: Creating enrollment record...')
    const enrollmentNumber = generateEnrollmentNumber()
    let enrollmentRecord = null
    
    try {
      const enrollmentData = {
        school_id: schoolId,
        student_id: studentRecord.id,
        student_user_id: studentUserId,
        student_full_name: student.fullName,
        student_gender: student.gender || null,
        student_birth_date: student.birthDate,
        student_nationality: student.nationality || 'Zimbabwe',
        student_id_number: student.idNumber,
        student_birth_certificate_number: student.birthCertificateNumber || null,
        parent_id: parentUserId,
        parent_user_id: parentUserId,
        parent_full_name: parent.fullName,
        parent_id_number: parent.idNumber,
        parent_phone_number: parent.phoneNumber || null,
        parent_email: parent.email,
        parent_address: parent.address || null,
        parent_relationship: parent.relationship || 'parent',
        class_id: classId,
        class_name: className || null,
        form_name: formName || null,
        entry_status: entryStatus || null,
        academic_year: new Date().getFullYear().toString(),
        term: 'Term 1',
        previous_school_name: student.previousSchool || null,
        student_username: studentUsername,
        student_initial_password: studentPassword,
        parent_username: parentUsername,
        parent_initial_password: parentPassword,
        accounts_created: true,
        enrollment_status: 'completed',
        enrollment_date: new Date().toISOString().split('T')[0],
        enrolled_by: enrolledBy || null,
        initial_fee_amount: feePaid || 0
      }

      const { data, error } = await supabaseAdmin
        .from('student_enrollments')
        .insert(enrollmentData)
        .select()
        .single()

      if (error) {
        console.error('⚠️ Failed to create enrollment record (non-fatal):', error)
      } else {
        enrollmentRecord = data
        console.log('✅ Enrollment record created:', enrollmentRecord.id)
      }
    } catch (err) {
      console.error('⚠️ Enrollment record error (non-fatal):', err)
    }

    // Step 13: Store previous grades (optional)
    if (previousGrades && previousGrades.length > 0) {
      console.log('📋 Step 13: Storing previous grades...')
      try {
        const gradesToInsert = previousGrades.map((g: any) => ({
          student_id: studentRecord.id,
          enrollment_id: enrollmentRecord?.id || null,
          subject_name: g.subject,
          unit_level: g.unit || null,
          grade: g.grade || null,
          marks: g.marks || null,
          exam_type: 'previous_school',
          exam_year: new Date().getFullYear() - 1
        }))

        const { error: gradesError } = await supabaseAdmin
          .from('student_previous_grades')
          .insert(gradesToInsert)

        if (gradesError) {
          console.error('⚠️ Failed to store previous grades (non-fatal):', gradesError)
        } else {
          console.log('✅ Previous grades stored')
        }
      } catch (err) {
        console.error('⚠️ Previous grades error (non-fatal):', err)
      }
    }

    // Step 13.5: Create student subject enrollments
    if (selectedSubjectIds && selectedSubjectIds.length > 0) {
      console.log('📋 Step 13.5: Creating student subject enrollments...')
      try {
        const subjectEnrollments = selectedSubjectIds.map((subjectId: string) => ({
          student_id: studentRecord.id,
          subject_id: subjectId,
          class_id: classId,
          school_id: schoolId,
          enrollment_type: isALevel ? 'manual' : 'auto',
          is_active: true
        }))

        const { error: subjectEnrollError } = await supabaseAdmin
          .from('student_subject_enrollments')
          .insert(subjectEnrollments)

        if (subjectEnrollError) {
          console.error('⚠️ Failed to create subject enrollments (non-fatal):', subjectEnrollError)
        } else {
          console.log('✅ Student subject enrollments created:', selectedSubjectIds.length, 'subjects')
        }
      } catch (err) {
        console.error('⚠️ Subject enrollments error (non-fatal):', err)
      }
    }

    // Step 14: Get class info for response
    console.log('📋 Step 14: Getting class info...')
    let classTeacherName = 'TBD'
    try {
      const { data: classData } = await supabaseAdmin
        .from('classes')
        .select('class_teacher_id')
        .eq('id', classId)
        .single()

      if (classData?.class_teacher_id) {
        const { data: teacherProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('id', classData.class_teacher_id)
          .single()
        classTeacherName = teacherProfile?.full_name || 'TBD'
      }
    } catch (err) {
      console.error('⚠️ Error getting class info (non-fatal):', err)
    }

    // Get subjects for the class
    let subjectNames: string[] = []
    try {
      const { data: classSubjects } = await supabaseAdmin
        .from('class_subject_assignments')
        .select('subjects(name)')
        .eq('class_id', classId)

      subjectNames = classSubjects?.map((cs: any) => cs.subjects?.name).filter(Boolean) || []
    } catch (err) {
      console.error('⚠️ Error getting subjects (non-fatal):', err)
    }

    console.log('🎉 ========== ENROLLMENT SUCCESSFUL ==========')
    console.log('   Student ID:', studentRecord.id)
    console.log('   Student Username:', studentUsername)
    console.log('   Admission Number:', admissionNumber)
    console.log('   Parent Username:', parentUsername)
    console.log('   Class:', className)
    console.log('===============================================')

    return NextResponse.json({
      success: true,
      studentId: studentRecord.id,
      studentUsername,
      studentPassword,
      parentUsername,
      parentPassword,
      enrollmentNumber,
      admissionNumber,
      className,
      classTeacher: classTeacherName,
      subjects: subjectNames
    })

  } catch (error: any) {
    console.error('💥 ========== ENROLLMENT FAILED ==========')
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    console.error('==========================================')
    
    return NextResponse.json({ 
      success: false, 
      message: 'Enrollment failed: ' + (error?.message || 'Unknown error'),
      errorDetails: error?.message,
      errorName: error?.name
    }, { status: 500 })
  }
}
