/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Users, 
  GraduationCap, 
  Edit, 
  Trash2, 
  UserCircle, 
  Search, 
  UserPlus, 
  RefreshCw,
  Save,
  X,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
  Printer,
  School,
  Download,
  Filter,
  Eye,
  Calendar,
  UserCheck,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface PreviousGrade {
  id: string
  subject: string
  marks: number
  grade: string
  unit?: number
}

interface EnrolledStudent {
  id: string
  user_id: string
  username: string
  full_name: string
  email: string
  class_id: string | null
  grade_level: string
  section: string
  school_id: string
  school_name: string
  parent_id: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null
  parent_id_number: string | null
  parent_occupation: string | null
  parent_date_of_birth: string | null
  admission_date: string
  gender: string | null
  birth_date: string | null
  student_status: string
  nationality: string | null
  address: string | null
  id_number: string | null
  birth_certificate_number: string | null
  medical_conditions: string | null
  previous_school: string | null
  admission_number: string | null
  fee_slip_url: string | null
  // Document URLs
  birth_certificate_url: string | null
  student_id_url: string | null
  parent_id_url: string | null
  previous_school_report_url: string | null
  // Previous grades
  previous_grades?: PreviousGrade[]
}

interface EditableFields {
  full_name: string
  gender: string
  birth_date: string
  nationality: string
  address: string
  id_number: string
  birth_certificate_number: string
  medical_conditions: string
  previous_school: string
  class_id: string
}

export default function EnrolledStudentsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [students, setStudents] = useState<EnrolledStudent[]>([])
  const [classes, setClasses] = useState<{ id: string; grade_level: string; section: string; school_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null)
  
  // Filters
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [filterSection, setFilterSection] = useState<string>('all')
  const [filterGender, setFilterGender] = useState<string>('all')
  const [filterClass, setFilterClass] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<EnrolledStudent | null>(null)
  const [editForm, setEditForm] = useState<EditableFields>({
    full_name: '',
    gender: '',
    birth_date: '',
    nationality: '',
    address: '',
    id_number: '',
    birth_certificate_number: '',
    medical_conditions: '',
    previous_school: '',
    class_id: ''
  })
  const [saving, setSaving] = useState(false)

  // View dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  // Subject management for edit
  const [studentSubjects, setStudentSubjects] = useState<{id: string; name: string; code: string}[]>([])
  const [availableClassSubjects, setAvailableClassSubjects] = useState<{id: string; name: string; code: string}[]>([])
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  // Print letter
  const [showPrintLetter, setShowPrintLetter] = useState(false)
  const [printingStudent, setPrintingStudent] = useState<EnrolledStudent | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [schoolInfo, setSchoolInfo] = useState<any>(null)

  const loadData = async () => {
    setLoading(true)

    try {
      // Load classes
      let classesQuery = supabase
        .from('classes')
        .select('id, grade_level, section, school_id')
        .order('grade_level')

      if (profile?.school_id) {
        classesQuery = classesQuery.eq('school_id', profile.school_id)
      }

      const { data: classesData } = await classesQuery
      setClasses(classesData || [])

      // Load enrolled students with all details including documents
      let studentsQuery = supabase
        .from('students')
        .select(`
          id,
          user_id,
          class_id,
          parent_id,
          admission_date,
          gender,
          birth_date,
          student_status,
          school_id,
          nationality,
          address,
          id_number,
          birth_certificate_number,
          medical_conditions,
          previous_school,
          admission_number,
          fee_slip_url,
          birth_certificate_url,
          student_id_url,
          parent_id_url,
          previous_school_report_url,
          profiles!students_user_id_fkey(username, full_name, email),
          parent:profiles!students_parent_id_fkey(full_name, phone_number, email, id_number, occupation, date_of_birth),
          classes(grade_level, section, school_id, schools(name, school_code))
        `)
        .eq('student_status', 'active')
        .order('created_at', { ascending: false })

      if (profile?.school_id) {
        studentsQuery = studentsQuery.eq('school_id', profile.school_id)
      }

      // If user is a teacher, only show students from their classes
      if (profile?.role === 'teacher') {
        // Get classes where this teacher is assigned
        const { data: teacherClasses } = await supabase
          .from('classes')
          .select('id')
          .eq('class_teacher_id', profile.id)
        
        // Also get classes from subject assignments
        const { data: subjectClasses } = await supabase
          .from('class_subject_assignments')
          .select('class_id')
          .eq('teacher_id', profile.id)
        
        const teacherClassIds = [
          ...(teacherClasses?.map(c => c.id) || []),
          ...(subjectClasses?.map(c => c.class_id) || [])
        ]
        const uniqueClassIds = [...new Set(teacherClassIds)]
        
        if (uniqueClassIds.length > 0) {
          studentsQuery = studentsQuery.in('class_id', uniqueClassIds)
        } else {
          // Teacher has no assigned classes - show no students
          studentsQuery = studentsQuery.eq('class_id', 'no-class-match')
        }
      }

      const { data: studentsData, error: studentsError } = await studentsQuery

      if (studentsError) {
        toast.error('Failed to load students')
        console.error(studentsError)
      } else {
        // Fetch previous grades for all students
        const studentIds = (studentsData || []).map((s: any) => s.id)
        const { data: gradesData } = await supabase
          .from('student_previous_grades')
          .select('*')
          .in('student_id', studentIds)

        const gradesByStudent = (gradesData || []).reduce((acc: any, grade: any) => {
          if (!acc[grade.student_id]) acc[grade.student_id] = []
          acc[grade.student_id].push(grade)
          return acc
        }, {})

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformed: EnrolledStudent[] = (studentsData || []).map((s: any) => ({
          id: s.id,
          user_id: s.user_id,
          username: s.profiles?.username || 'Unknown',
          full_name: s.profiles?.full_name || 'Unknown',
          email: s.profiles?.email || 'N/A',
          class_id: s.class_id,
          grade_level: s.classes?.grade_level || 'Not Assigned',
          section: s.classes?.section || '',
          school_id: s.school_id || s.classes?.school_id || '',
          school_name: s.classes?.schools?.name || 'Not Assigned',
          parent_id: s.parent_id,
          parent_name: s.parent?.full_name || null,
          parent_phone: s.parent?.phone_number || null,
          parent_email: s.parent?.email || null,
          parent_id_number: s.parent?.id_number || null,
          parent_occupation: s.parent?.occupation || null,
          parent_date_of_birth: s.parent?.date_of_birth || null,
          admission_date: s.admission_date,
          gender: s.gender || null,
          birth_date: s.birth_date || null,
          student_status: s.student_status || 'active',
          nationality: s.nationality || null,
          fee_slip_url: s.fee_slip_url || null,
          birth_certificate_url: s.birth_certificate_url || null,
          student_id_url: s.student_id_url || null,
          parent_id_url: s.parent_id_url || null,
          previous_school_report_url: s.previous_school_report_url || null,
          address: s.address || null,
          id_number: s.id_number || null,
          birth_certificate_number: s.birth_certificate_number || null,
          medical_conditions: s.medical_conditions || null,
          previous_school: s.previous_school || null,
          admission_number: s.admission_number || null,
          previous_grades: gradesByStudent[s.id] || []
        }))
        setStudents(transformed)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    }

    setLoading(false)
  }

  // Load student's enrolled subjects and available class subjects
  const loadStudentSubjects = async (studentId: string, classId: string) => {
    console.log('Loading subjects for student:', studentId, 'class:', classId)
    setLoadingSubjects(true)
    try {
      // Load student's current enrolled subjects through class_subject_assignments
      const { data: enrolledSubjects, error: enrollError } = await supabase
        .from('student_subject_enrollments')
        .select(`
          id,
          class_subject_assignment_id,
          class_subject_assignments (
            id,
            subject_id,
            subjects (id, name, code)
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active')
      
      console.log('Student enrolled subjects:', enrolledSubjects, 'Error:', enrollError)
      
      if (enrollError) throw enrollError

      const enrolled = (enrolledSubjects || []).map((item: any) => ({
        id: item.class_subject_assignments?.subject_id,
        name: item.class_subject_assignments?.subjects?.name || 'Unknown',
        code: item.class_subject_assignments?.subjects?.code || ''
      })).filter((s: any) => s.id) // Filter out any with missing subject_id
      setStudentSubjects(enrolled)

      // Load available subjects from class assignments
      if (classId) {
        const { data: classSubjects, error: classError } = await supabase
          .from('class_subject_assignments')
          .select(`
            id,
            subject_id,
            subjects (id, name, code)
          `)
          .eq('class_id', classId)
        
        console.log('Class subjects for class', classId, ':', classSubjects, 'Error:', classError)
        
        if (classError) throw classError

        const available = (classSubjects || []).map((item: any) => ({
          id: item.subject_id,
          name: item.subjects?.name || 'Unknown',
          code: item.subjects?.code || ''
        }))
        console.log('Available subjects mapped:', available)
        setAvailableClassSubjects(available)
        
        // If student has enrolled subjects, use those; otherwise select ALL available subjects by default
        if (enrolled.length > 0) {
          setSelectedSubjectIds(enrolled.map((s: any) => s.id))
        } else {
          // Auto-select all available subjects
          setSelectedSubjectIds(available.map((s: any) => s.id))
        }
      } else {
        console.log('No classId provided, clearing available subjects')
        setAvailableClassSubjects([])
      }
    } catch (error) {
      console.error('Error loading subjects:', error)
      setAvailableClassSubjects([])
    } finally {
      setLoadingSubjects(false)
    }
  }

  // Save student subject changes
  const saveStudentSubjects = async (studentId: string, classId: string) => {
    try {
      // First, get the class_subject_assignments for this class to map subject_id to assignment_id
      const { data: classAssignments } = await supabase
        .from('class_subject_assignments')
        .select('id, subject_id')
        .eq('class_id', classId)
      
      const subjectToAssignment = new Map((classAssignments || []).map((a: any) => [a.subject_id, a.id]))
      
      // Get current enrolled assignments
      const { data: currentEnrollments } = await supabase
        .from('student_subject_enrollments')
        .select('id, class_subject_assignment_id, class_subject_assignments(subject_id)')
        .eq('student_id', studentId)
        .eq('status', 'active')

      const currentSubjectIds = (currentEnrollments || []).map((e: any) => e.class_subject_assignments?.subject_id).filter(Boolean)
      
      // Find subjects to add (in selectedSubjectIds but not in currentSubjectIds)
      const toAdd = selectedSubjectIds.filter(id => !currentSubjectIds.includes(id))
      
      // Find subjects to remove (in currentSubjectIds but not in selectedSubjectIds)
      const toRemove = currentSubjectIds.filter((id: string) => !selectedSubjectIds.includes(id))

      // Add new subjects
      if (toAdd.length > 0) {
        const newEnrollments = toAdd
          .map(subjectId => {
            const assignmentId = subjectToAssignment.get(subjectId)
            if (!assignmentId) return null
            return {
              student_id: studentId,
              class_subject_assignment_id: assignmentId,
              status: 'active',
              created_by: profile?.id
            }
          })
          .filter(Boolean)

        if (newEnrollments.length > 0) {
          const { error: addError } = await supabase
            .from('student_subject_enrollments')
            .insert(newEnrollments)

          if (addError) throw addError
        }
      }

      // Remove subjects (soft delete by setting status = 'dropped')
      if (toRemove.length > 0) {
        const assignmentIdsToRemove = toRemove
          .map((subjectId: string) => subjectToAssignment.get(subjectId))
          .filter(Boolean)
        
        if (assignmentIdsToRemove.length > 0) {
          const { error: removeError } = await supabase
            .from('student_subject_enrollments')
            .update({ status: 'dropped', dropped_at: new Date().toISOString() })
            .eq('student_id', studentId)
            .in('class_subject_assignment_id', assignmentIdsToRemove)

          if (removeError) throw removeError
        }
      }

      console.log('Subject changes saved:', { added: toAdd.length, removed: toRemove.length })
    } catch (error) {
      console.error('Error saving subject changes:', error)
      throw error
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    // Allow enrollment_officer, school_admin, super_admin, and teacher roles
    if (!authLoading && profile && !['enrollment_officer', 'school_admin', 'super_admin', 'teacher'].includes(profile.role)) {
      router.push('/dashboard')
      toast.error('Access denied')
    }
  }, [user, authLoading, profile, router])

  // Role-based permissions
  const canEdit = profile?.role && ['enrollment_officer', 'super_admin'].includes(profile.role)
  const canDelete = profile?.role && ['enrollment_officer', 'super_admin'].includes(profile.role)
  const canEnroll = profile?.role && ['enrollment_officer', 'super_admin'].includes(profile.role)
  const canPrint = profile?.role && ['enrollment_officer', 'school_admin', 'super_admin', 'teacher'].includes(profile.role)

  useEffect(() => {
    if (profile) {
      loadData()
      
      // Check for class_id URL parameter
      const classIdParam = searchParams.get('class_id')
      if (classIdParam) {
        setFilterClass(classIdParam)
        setShowFilters(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, searchParams])

  const handleEditClick = (student: EnrolledStudent) => {
    setEditingStudent(student)
    setEditForm({
      full_name: student.full_name || '',
      gender: student.gender || '',
      birth_date: student.birth_date || '',
      nationality: student.nationality || '',
      address: student.address || '',
      id_number: student.id_number || '',
      birth_certificate_number: student.birth_certificate_number || '',
      medical_conditions: student.medical_conditions || '',
      previous_school: student.previous_school || '',
      class_id: student.class_id || ''
    })
    // Load subjects for this student
    if (student.id && student.class_id) {
      loadStudentSubjects(student.id, student.class_id)
    } else {
      setStudentSubjects([])
      setAvailableClassSubjects([])
      setSelectedSubjectIds([])
    }
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingStudent) return

    setSaving(true)
    try {
      // Update student record
      const { error: studentError } = await supabase
        .from('students')
        .update({
          gender: editForm.gender || null,
          birth_date: editForm.birth_date || null,
          nationality: editForm.nationality || null,
          address: editForm.address || null,
          id_number: editForm.id_number || null,
          birth_certificate_number: editForm.birth_certificate_number || null,
          medical_conditions: editForm.medical_conditions || null,
          previous_school: editForm.previous_school || null,
          class_id: editForm.class_id || null
        })
        .eq('id', editingStudent.id)

      if (studentError) throw studentError

      // Update profile name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name
        })
        .eq('id', editingStudent.user_id)

      if (profileError) throw profileError

      // Save subject changes if class has subjects
      if (editForm.class_id && availableClassSubjects.length > 0) {
        await saveStudentSubjects(editingStudent.id, editForm.class_id)
      }

      toast.success('Student updated successfully!')
      setEditDialogOpen(false)
      setEditingStudent(null)
      loadData()
    } catch (error) {
      console.error('Error updating student:', error)
      toast.error('Failed to update student', { description: error instanceof Error ? error.message : 'Unknown error' })
    }
    setSaving(false)
  }

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      return
    }

    try {
      // Delete related records first to avoid foreign key constraint errors
      // Delete student_enrollments
      await supabase
        .from('student_enrollments')
        .delete()
        .eq('student_id', studentId)

      // Delete student_fees
      await supabase
        .from('student_fees')
        .delete()
        .eq('student_id', studentId)

      // Delete attendance records
      await supabase
        .from('attendance')
        .delete()
        .eq('student_id', studentId)

      // Delete grades
      await supabase
        .from('grades')
        .delete()
        .eq('student_id', studentId)

      // Now delete the student record
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (error) throw error

      toast.success('Student deleted successfully!')
      loadData()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete student', { description: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  // Handle print letter
  const handlePrintLetter = async (student: EnrolledStudent) => {
    try {
      // Load school info if not already loaded
      if (!schoolInfo && profile?.school_id) {
        const { data: school } = await supabase
          .from('schools')
          .select('id, name, school_code, logo_url, school_type, address, phone, contact_email, school_motto, principal_name, principal_email, school_stamp_url, principal_signature_url, enrollment_officer_signature_url')
          .eq('id', profile.school_id)
          .single()
        setSchoolInfo(school)
      }
      setPrintingStudent(student)
      setShowPrintLetter(true)
    } catch (error) {
      console.error('Error loading school info:', error)
      toast.error('Failed to load school information')
    }
  }

  const printLetter = () => {
    window.print()
  }

  // Filtered data
  const filteredStudents = students.filter(student => {
    if (filterClass !== 'all' && student.class_id !== filterClass) return false
    if (filterGrade !== 'all' && student.grade_level !== filterGrade) return false
    if (filterSection !== 'all' && student.section !== filterSection) return false
    if (filterGender !== 'all' && student.gender !== filterGender) return false
    if (searchQuery && 
        !student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !student.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(student.admission_number?.toLowerCase().includes(searchQuery.toLowerCase()))
    ) return false
    return true
  })

  const availableGrades = [...new Set(students.map(s => s.grade_level))].sort()
  const availableSections = [...new Set(students.map(s => s.section).filter(Boolean))].sort()

  // Export to CSV function
  const exportToCSV = () => {
    const csvHeaders = [
      'Admission Number', 'Full Name', 'Gender', 'Birth Date', 'Class', 'Section',
      'Parent Name', 'Parent Phone', 'Email', 'Admission Date', 'Status'
    ]
    
    const csvData = filteredStudents.map(s => [
      s.admission_number || '',
      s.full_name,
      s.gender || '',
      s.birth_date || '',
      s.grade_level,
      s.section,
      s.parent_name || '',
      s.parent_phone || '',
      s.email,
      s.admission_date || '',
      s.student_status
    ])

    const csv = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `enrolled-students-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Students list exported successfully!')
  }

  const handleViewClick = (student: EnrolledStudent) => {
    console.log('Viewing student:', student)
    console.log('Document URLs:', {
      birth_certificate: student.birth_certificate_url,
      student_id: student.student_id_url,
      parent_id: student.parent_id_url,
      previous_report: student.previous_school_report_url,
      fee_slip: student.fee_slip_url
    })
    setSelectedStudent(student)
    setViewDialogOpen(true)
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Enrolled Students">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading students...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Enrolled Students">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Link href="/dashboard/enrollment-officer">
              <Button variant="ghost" size="sm" className="mb-2 -ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Enrolled Students</h1>
                <p className="text-gray-600">Manage and view all enrolled students</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportToCSV} disabled={filteredStudents.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            {canEnroll && (
              <Link href="/dashboard/students/enroll-new">
                <Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Enroll New Student
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-all border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Students</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{filteredStudents.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all border-l-4 border-l-pink-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Female Students</p>
                  <p className="text-3xl font-bold text-pink-600 mt-1">
                    {filteredStudents.filter(s => s.gender === 'Female').length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-pink-100 flex items-center justify-center">
                  <UserCircle className="h-6 w-6 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Male Students</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">
                    {filteredStudents.filter(s => s.gender === 'Male').length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserCircle className="h-6 w-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">With Parent</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {filteredStudents.filter(s => s.parent_id).length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Search & Filter Students</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search Bar - Always Visible */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, username, admission number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>

              {/* Advanced Filters - Collapsible */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t">
                  <div>
                    <Label className="text-xs font-medium text-gray-700">Class</Label>
                    <Select value={filterClass} onValueChange={setFilterClass}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.grade_level} - {cls.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-700">Grade Level</Label>
                    <Select value={filterGrade} onValueChange={setFilterGrade}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        {availableGrades.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-700">Section</Label>
                    <Select value={filterSection} onValueChange={setFilterSection}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {availableSections.map((sec) => (
                          <SelectItem key={sec} value={sec}>
                            {sec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-700">Gender</Label>
                    <Select value={filterGender} onValueChange={setFilterGender}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Active Filters Display */}
              {(filterClass !== 'all' || filterGrade !== 'all' || filterSection !== 'all' || filterGender !== 'all' || searchQuery) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <span className="text-xs text-gray-600">Active filters:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery('')}>
                      Search: {searchQuery} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  )}
                  {filterClass !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterClass('all')}>
                      Class: {classes.find(c => c.id === filterClass)?.grade_level} - {classes.find(c => c.id === filterClass)?.section} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  )}
                  {filterGrade !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterGrade('all')}>
                      Grade: {filterGrade} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  )}
                  {filterSection !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterSection('all')}>
                      Section: {filterSection} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  )}
                  {filterGender !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterGender('all')}>
                      Gender: {filterGender} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setSearchQuery('')
                      setFilterClass('all')
                      setFilterGrade('all')
                      setFilterSection('all')
                      setFilterGender('all')
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Student List ({filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'})
            </CardTitle>
            <CardDescription>
              Click on any student row to view full details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <GraduationCap className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || filterGrade !== 'all' || filterSection !== 'all' || filterGender !== 'all'
                    ? 'Try adjusting your search or filters' 
                    : 'Start by enrolling your first student'}
                </p>
                {canEdit && (
                  <Link href="/dashboard/students/enroll-new">
                    <Button className="bg-gradient-to-r from-teal-600 to-cyan-600">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Enroll First Student
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Admission Date</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student, index) => (
                      <TableRow 
                        key={student.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewClick(student)}
                      >
                        <TableCell className="font-medium text-gray-500">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-medium text-blue-600">
                            {student.admission_number || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              student.gender === 'Male' 
                                ? 'bg-blue-100' 
                                : student.gender === 'Female' 
                                ? 'bg-pink-100' 
                                : 'bg-gray-100'
                            }`}>
                              <UserCircle className={`w-5 h-5 ${
                                student.gender === 'Male' 
                                  ? 'text-blue-600' 
                                  : student.gender === 'Female' 
                                  ? 'text-pink-600' 
                                  : 'text-gray-400'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{student.full_name}</p>
                              <p className="text-xs text-gray-500">{student.username}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            student.gender === 'Male' 
                              ? 'border-blue-200 text-blue-700 bg-blue-50' 
                              : 'border-pink-200 text-pink-700 bg-pink-50'
                          }>
                            {student.gender || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary">
                              {student.grade_level}
                            </Badge>
                            {student.section && (
                              <Badge variant="outline" className="text-xs">
                                {student.section}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {student.parent_id ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-sm font-medium text-gray-700">{student.parent_name}</span>
                              </div>
                              {student.parent_id_number && (
                                <p className="text-xs text-gray-500 font-mono ml-3">
                                  ID: {student.parent_id_number}
                                </p>
                              )}
                              {student.parent_occupation && (
                                <p className="text-xs text-gray-500 ml-3">
                                  {student.parent_occupation}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                              <span className="text-xs text-amber-600">No Parent</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="w-3 h-3" />
                            {student.admission_date 
                              ? new Date(student.admission_date).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewClick(student)
                              }}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditClick(student)
                                }}
                                title="Edit Student"
                              >
                                <Edit className="w-4 h-4 text-orange-600" />
                              </Button>
                            )}
                            {canPrint && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePrintLetter(student)
                                }}
                                title="Print Letter"
                              >
                                <Printer className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteStudent(student.id, student.full_name)
                                }}
                                title="Delete Student"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Student Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedStudent?.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
              }`}>
                <UserCircle className={`w-6 h-6 ${
                  selectedStudent?.gender === 'Male' ? 'text-blue-600' : 'text-pink-600'
                }`} />
              </div>
              {selectedStudent?.full_name}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Complete student information and details
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-6 py-4">
              {/* Quick Info Banner */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-600 mb-1">Admission No.</p>
                  <p className="font-mono font-bold text-blue-600">
                    {selectedStudent.admission_number || 'N/A'}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-600 mb-1">Username</p>
                  <p className="font-mono font-bold text-purple-600">
                    {selectedStudent.username}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-600 mb-1">Status</p>
                  <Badge className="bg-green-600">
                    {selectedStudent.student_status}
                  </Badge>
                </div>
              </div>

              {/* Personal Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-blue-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Full Name</p>
                    <p className="font-medium">{selectedStudent.full_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Gender</p>
                    <p className="font-medium">{selectedStudent.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Date of Birth</p>
                    <p className="font-medium">
                      {selectedStudent.birth_date 
                        ? new Date(selectedStudent.birth_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Nationality</p>
                    <p className="font-medium">{selectedStudent.nationality || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 mb-1">ID Number</p>
                    <p className="font-medium font-mono">{selectedStudent.id_number || 'N/A'}</p>
                  </div>
                  {selectedStudent.birth_certificate_number && (
                    <div className="col-span-2">
                      <p className="text-gray-500 mb-1">Birth Certificate Number</p>
                      <p className="font-medium font-mono">{selectedStudent.birth_certificate_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Academic Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                  Academic Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Class/Grade</p>
                    <p className="font-medium">{selectedStudent.grade_level}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Section</p>
                    <p className="font-medium">{selectedStudent.section || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Admission Date</p>
                    <p className="font-medium">
                      {selectedStudent.admission_date 
                        ? new Date(selectedStudent.admission_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">School Name</p>
                    <p className="font-medium">{selectedStudent.school_name}</p>
                  </div>
                  {selectedStudent.previous_school && (
                    <div className="col-span-2">
                      <p className="text-gray-500 mb-1">Previous School</p>
                      <p className="font-medium">{selectedStudent.previous_school}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Parent/Guardian Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Parent/Guardian Information
                </h3>
                {selectedStudent.parent_id ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Parent/Guardian Name</p>
                      <p className="font-bold text-lg text-green-700">{selectedStudent.parent_name}</p>
                      {selectedStudent.parent_occupation && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Occupation:</span> {selectedStudent.parent_occupation}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedStudent.parent_id_number && (
                        <div className="col-span-2 bg-blue-50 p-3 rounded-lg">
                          <p className="text-gray-600 mb-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Parent ID Number
                          </p>
                          <p className="font-bold font-mono text-blue-700 text-lg">{selectedStudent.parent_id_number}</p>
                        </div>
                      )}
                      {selectedStudent.parent_date_of_birth && (
                        <div className="col-span-2">
                          <p className="text-gray-500 mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Date of Birth
                          </p>
                          <p className="font-medium">
                            {new Date(selectedStudent.parent_date_of_birth).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                      {selectedStudent.parent_phone && (
                        <div>
                          <p className="text-gray-500 mb-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> Phone Number
                          </p>
                          <p className="font-medium">{selectedStudent.parent_phone}</p>
                        </div>
                      )}
                      {selectedStudent.parent_email && (
                        <div>
                          <p className="text-gray-500 mb-1 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Email Address
                          </p>
                          <p className="font-medium text-xs">{selectedStudent.parent_email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-amber-50 rounded-lg">
                    <AlertCircle className="w-10 h-10 mx-auto text-amber-600 mb-2" />
                    <p className="text-sm text-amber-600 font-medium">No parent/guardian linked to this student</p>
                  </div>
                )}
              </div>

              {/* Contact & Medical Information */}
              {(selectedStudent.address || selectedStudent.medical_conditions) && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    Additional Information
                  </h3>
                  <div className="space-y-4 text-sm">
                    {selectedStudent.address && (
                      <div>
                        <p className="text-gray-500 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Home Address
                        </p>
                        <p className="font-medium">{selectedStudent.address}</p>
                      </div>
                    )}
                    {selectedStudent.medical_conditions && (
                      <div>
                        <p className="text-gray-500 mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-600" /> Medical Conditions
                        </p>
                        <p className="font-medium text-red-600 bg-red-50 p-3 rounded-lg">
                          {selectedStudent.medical_conditions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Fee Slip Section */}
              {selectedStudent.fee_slip_url && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    Fee Payment Proof
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800 mb-2">✅ Fee slip uploaded</p>
                      <a 
                        href={selectedStudent.fee_slip_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View Fee Slip
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Uploaded Documents
                </h3>
                {(selectedStudent.birth_certificate_url || selectedStudent.student_id_url || 
                  selectedStudent.parent_id_url || selectedStudent.previous_school_report_url) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedStudent.birth_certificate_url && (
                      <a
                        href={selectedStudent.birth_certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors group"
                      >
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="font-medium text-blue-900 text-sm">Birth Certificate</p>
                          <p className="text-xs text-blue-600">Click to view</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    )}
                    {selectedStudent.student_id_url && (
                      <a
                        href={selectedStudent.student_id_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors group"
                      >
                        <FileText className="w-5 h-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900 text-sm">Student ID</p>
                          <p className="text-xs text-green-600">Click to view</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    )}
                    {selectedStudent.parent_id_url && (
                      <a
                        href={selectedStudent.parent_id_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors group"
                      >
                        <FileText className="w-5 h-5 text-purple-600" />
                        <div className="flex-1">
                          <p className="font-medium text-purple-900 text-sm">Parent ID</p>
                          <p className="text-xs text-purple-600">Click to view</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    )}
                    {selectedStudent.previous_school_report_url && (
                      <a
                        href={selectedStudent.previous_school_report_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors group"
                      >
                        <FileText className="w-5 h-5 text-amber-600" />
                        <div className="flex-1">
                          <p className="font-medium text-amber-900 text-sm">Previous School Report</p>
                          <p className="text-xs text-amber-600">Click to view</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 font-medium">No documents uploaded</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Documents should be uploaded during enrollment
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {canEdit && (
                  <Button 
                    onClick={() => {
                      setViewDialogOpen(false)
                      handleEditClick(selectedStudent)
                    }}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Student
                  </Button>
                )}
                {canPrint && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setViewDialogOpen(false)
                      handlePrintLetter(selectedStudent)
                    }}
                    className="flex-1"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Letter
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Edit Student: {editingStudent?.full_name}
            </DialogTitle>
            <DialogDescription>
              Update student information below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input 
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Full name"
              />
            </div>

            {/* Gender & DOB */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={editForm.gender} onValueChange={(v) => setEditForm(prev => ({ ...prev, gender: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input 
                  type="date"
                  value={editForm.birth_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, birth_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Nationality & ID */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input 
                  value={editForm.nationality}
                  onChange={(e) => setEditForm(prev => ({ ...prev, nationality: e.target.value }))}
                  placeholder="e.g., Zimbabwe"
                />
              </div>
              <div className="space-y-2">
                <Label>ID Number</Label>
                <Input 
                  value={editForm.id_number}
                  onChange={(e) => setEditForm(prev => ({ ...prev, id_number: e.target.value }))}
                  placeholder="e.g., 73-0000000-X-00"
                />
              </div>
            </div>

            {/* Class */}
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={editForm.class_id} onValueChange={(v) => setEditForm(prev => ({ ...prev, class_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.grade_level} {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea 
                value={editForm.address}
                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Home address"
                rows={2}
              />
            </div>

            {/* Previous School */}
            <div className="space-y-2">
              <Label>Previous School</Label>
              <Input 
                value={editForm.previous_school}
                onChange={(e) => setEditForm(prev => ({ ...prev, previous_school: e.target.value }))}
                placeholder="Previous school name"
              />
            </div>

            {/* Subject Management */}
            {editForm.class_id && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">📚 Subject Enrollment</Label>
                  {loadingSubjects && <span className="text-sm text-gray-500">Loading...</span>}
                </div>
                
                {!loadingSubjects && availableClassSubjects.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800">
                    No subjects assigned to this class. Assign subjects via Forms/Classes page.
                  </div>
                )}

                {!loadingSubjects && availableClassSubjects.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Select subjects for this student ({selectedSubjectIds.length} selected)
                    </p>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                      {availableClassSubjects.map((subject) => (
                        <label 
                          key={subject.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                            selectedSubjectIds.includes(subject.id)
                              ? 'bg-blue-100 border border-blue-300'
                              : 'bg-white border border-gray-200 hover:border-blue-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSubjectIds.includes(subject.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSubjectIds(prev => [...prev, subject.id])
                              } else {
                                setSelectedSubjectIds(prev => prev.filter(id => id !== subject.id))
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium">{subject.name}</span>
                          {subject.code && <span className="text-xs text-gray-500">({subject.code})</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Medical Conditions */}
            <div className="space-y-2">
              <Label>Medical Conditions</Label>
              <Textarea 
                value={editForm.medical_conditions}
                onChange={(e) => setEditForm(prev => ({ ...prev, medical_conditions: e.target.value }))}
                placeholder="Any medical conditions or allergies"
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editForm.full_name}>
              {saving ? (
                <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-1" /> Save Changes</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Letter Dialog */}
      {showPrintLetter && printingStudent && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto print:p-0">
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-letter, .print-letter * {
                visibility: visible;
              }
              .print-letter {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 40px !important;
              }
              .no-print {
                display: none !important;
              }
              @page {
                size: A4;
                margin: 20mm;
              }
            }
          `}</style>

          {/* Actions Bar - Hidden in Print */}
          <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
            <Button variant="outline" onClick={() => setShowPrintLetter(false)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>
            <Button onClick={printLetter} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" /> Print Letter
            </Button>
          </div>

          {/* Professional Letter */}
          <div className="print-letter min-h-screen bg-white p-8 max-w-4xl mx-auto">
            {/* Letterhead */}
            <div className="border-b-4 border-blue-800 pb-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {schoolInfo?.logo_url ? (
                    <img 
                      src={schoolInfo.logo_url} 
                      alt={schoolInfo.name} 
                      className="w-20 h-20 object-contain"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-blue-800 rounded-full flex items-center justify-center">
                      <School className="w-10 h-10 text-white" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-blue-900 uppercase tracking-wide">
                      {schoolInfo?.name || 'School Name'}
                    </h1>
                    {schoolInfo?.school_motto && (
                      <p className="text-sm italic text-gray-600">&quot;{schoolInfo.school_motto}&quot;</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {schoolInfo?.school_type} School • Code: {schoolInfo?.school_code}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-600">
                  {schoolInfo?.address && <p>{schoolInfo.address}</p>}
                  {schoolInfo?.phone && <p>Tel: {schoolInfo.phone}</p>}
                  {schoolInfo?.contact_email && <p>Email: {schoolInfo.contact_email}</p>}
                </div>
              </div>
            </div>

            {/* Date and Reference */}
            <div className="flex justify-between mb-8 text-sm">
              <div>
                <p className="font-semibold">Reference: {printingStudent.admission_number || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p>{new Date().toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>
            </div>

            {/* Subject Line */}
            <div className="text-center mb-8">
              <h2 className="text-lg font-bold uppercase underline decoration-2 underline-offset-4">
                ENROLLMENT CONFIRMATION LETTER
              </h2>
            </div>

            {/* Letter Body */}
            <div className="space-y-4 text-justify leading-relaxed">
              <p>Dear Parent/Guardian,</p>
              
              <p>
                We are pleased to confirm that the following student has been successfully enrolled at{' '}
                <strong>{schoolInfo?.name}</strong> for the {new Date().getFullYear()} academic year.
              </p>

              {/* Student Information Box */}
              <div className="border-2 border-gray-300 rounded-lg p-4 my-6 bg-gray-50">
                <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">STUDENT DETAILS</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Full Name:</span>
                    <p className="font-semibold">{printingStudent.full_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Admission Number:</span>
                    <p className="font-semibold font-mono">{printingStudent.admission_number || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Class/Grade:</span>
                    <p className="font-semibold">{printingStudent.grade_level} {printingStudent.section}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Gender:</span>
                    <p className="font-semibold">{printingStudent.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Date of Birth:</span>
                    <p className="font-semibold">
                      {printingStudent.birth_date 
                        ? new Date(printingStudent.birth_date).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Admission Date:</span>
                    <p className="font-semibold">
                      {printingStudent.admission_date 
                        ? new Date(printingStudent.admission_date).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })
                        : new Date().toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="border-2 border-blue-400 rounded-lg p-4 my-6 bg-blue-50">
                <h3 className="font-bold text-blue-900 mb-4 border-b border-blue-300 pb-2">🔐 SCHOOL PORTAL LOGIN CREDENTIALS</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Please use the following credentials to access our online School Management Portal.
                </p>
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" /> Student Account
                  </p>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Username:</span>
                      <span className="font-bold">{printingStudent.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-bold">{printingStudent.email}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 italic">
                      (Password is the student ID number provided during enrollment)
                    </p>
                  </div>
                </div>
              </div>

              <p>
                We look forward to working with you throughout the academic year.
              </p>

              <p>
                Yours faithfully,
              </p>
            </div>

            {/* Signature Section */}
            <div className="mt-12">
              {/* Three columns: Enrollment Officer, Stamp, Principal */}
              <div className="grid grid-cols-3 gap-6 mt-8 items-end">
                {/* Enrollment Officer Signature */}
                <div className="text-center">
                  {schoolInfo?.enrollment_officer_signature_url ? (
                    <img 
                      src={schoolInfo.enrollment_officer_signature_url} 
                      alt="Enrollment Officer Signature"
                      className="h-16 mx-auto object-contain mb-2"
                    />
                  ) : (
                    <div className="h-16 border-b-2 border-gray-300 mb-2"></div>
                  )}
                  <div className="border-t border-gray-400 pt-2">
                    <p className="font-semibold text-sm">Enrollment Officer</p>
                    <p className="text-xs text-gray-600">Admissions</p>
                  </div>
                </div>
                
                {/* School Stamp */}
                <div className="text-center flex items-center justify-center">
                  {schoolInfo?.school_stamp_url ? (
                    <div className="transform -rotate-12 opacity-90">
                      <img 
                        src={schoolInfo.school_stamp_url} 
                        alt="School Stamp"
                        className="w-28 h-28 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-4 border-gray-800 rounded-full flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xs font-bold text-gray-800">OFFICIAL</p>
                        <p className="text-xs font-bold text-gray-800">STAMP</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* School Head/Principal Signature */}
                <div className="text-center">
                  {schoolInfo?.principal_signature_url ? (
                    <img 
                      src={schoolInfo.principal_signature_url} 
                      alt="Principal Signature"
                      className="h-16 mx-auto object-contain mb-2"
                    />
                  ) : (
                    <div className="h-16 border-b-2 border-gray-300 mb-2"></div>
                  )}
                  <div className="border-t border-gray-400 pt-2">
                    <p className="font-semibold text-sm">School Head / Principal</p>
                    <p className="text-xs text-gray-600">{schoolInfo?.principal_name || 'School Principal'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-4 border-t-2 border-gray-300 text-center text-xs text-gray-500">
              <p>This is an official document from {schoolInfo?.name}.</p>
              
              <p className="mt-3 text-gray-400">
                Powered by <strong>Robokorda Africa</strong> | {schoolInfo?.name} © {new Date().getFullYear()} All Rights Reserved
              </p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
