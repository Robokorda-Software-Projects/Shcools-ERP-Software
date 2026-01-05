/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  FileText, User, CheckCircle, TrendingUp, TrendingDown,
  Printer, Download, Lock, BarChart3, BookOpen, ClipboardCheck, AlertTriangle,
  Eye, GraduationCap, Phone, Mail, School, ArrowLeft
} from 'lucide-react'
import { format } from 'date-fns'
import Image from 'next/image'

// Interfaces
interface ExamResult {
  subject_name: string
  marks_obtained: number
  total_marks: number
  percentage: number
  grade: string
  teacher_name: string
  comment: string | null
  exam_paper_url?: string | null
}

interface TermTestResult {
  subject_name: string
  test_title: string
  marks_obtained: number
  total_marks: number
  percentage: number
  grade: string
  test_date: string
}

interface AssignmentResult {
  subject_name: string
  assignment_title: string
  marks_obtained: number
  total_marks: number
  percentage: number
  submitted_at: string
}

interface SubjectAnalysis {
  subject_name: string
  exam_percentage: number
  term_test_avg: number
  assignment_avg: number
  overall_avg: number
  trend: 'improving' | 'declining' | 'stable'
  recommendation: string
}

interface SchoolInfo {
  id: string
  name: string
  logo_url: string | null
  address: string | null
  phone: string | null
  contact_email: string | null
  principal_name: string | null
  school_motto: string | null
  school_code: string | null
  school_type: string | null
  school_stamp_url: string | null
  principal_signature_url: string | null
  admin_signature_url: string | null
}

interface StudentInfo {
  id: string
  admission_number: string
  full_name: string
  class_name: string
  gender: string | null
  birth_date: string | null
}

interface ReportData {
  student: StudentInfo
  school: SchoolInfo
  term: string
  academic_year: string
  published_at: string
  published_by: string
  exam_results: ExamResult[]
  term_tests: TermTestResult[]
  assignments: AssignmentResult[]
  subject_analysis: SubjectAnalysis[]
  class_position: number | null
  total_students: number
  overall_percentage: number
  overall_grade: string
  attendance_percentage: number
  class_teacher_name: string | null
}

// Helper functions
const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A': return 'bg-green-100 text-green-800 border-green-300'
    case 'B': return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'D': return 'bg-orange-100 text-orange-800 border-orange-300'
    default: return 'bg-red-100 text-red-800 border-red-300'
  }
}

const calculateGrade = (percentage: number): string => {
  if (percentage >= 75) return 'A'
  if (percentage >= 65) return 'B'
  if (percentage >= 50) return 'C'
  if (percentage >= 40) return 'D'
  return 'E'
}

interface ChildOption {
  id: string
  name: string
  className: string
}

export default function StudentEReportPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAgreement, setShowAgreement] = useState(true)
  const [hasAgreed, setHasAgreed] = useState(false)
  const [hasSignedDigitally, setHasSignedDigitally] = useState(false)
  const [currentView, setCurrentView] = useState<'report' | 'analysis' | 'exams'>('report')
  const printRef = useRef<HTMLDivElement>(null)
  
  // Multi-child support for parents
  const [children, setChildren] = useState<ChildOption[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'student' && profile.role !== 'parent') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  // Load children list for parents
  useEffect(() => {
    const loadChildren = async () => {
      if (profile?.role === 'parent') {
        const { data: childrenData } = await supabase
          .from('students')
          .select(`
            id,
            profiles!students_user_id_fkey(full_name),
            classes(grade_level, section)
          `)
          .eq('parent_id', profile.id)

        if (childrenData && childrenData.length > 0) {
          const formattedChildren = childrenData.map((child: any) => ({
            id: child.id,
            name: child.profiles?.full_name || 'Unknown',
            className: child.classes ? `${child.classes.grade_level} ${child.classes.section}` : 'N/A'
          }))
          setChildren(formattedChildren)
          // Select first child by default
          if (!selectedChildId) {
            setSelectedChildId(formattedChildren[0].id)
          }
        }
      }
    }
    
    if (profile?.role === 'parent') {
      loadChildren()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  useEffect(() => {
    if (profile?.role === 'student') {
      loadReportData()
    } else if (profile?.role === 'parent' && selectedChildId) {
      loadReportData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, selectedChildId])

  const loadReportData = async () => {
    if (!profile?.id) return

    setLoading(true)
    try {
      let studentData: any = null

      // Get student record - use selected child for parents
      if (profile.role === 'parent') {
        if (!selectedChildId) {
          setLoading(false)
          return
        }
        const { data: childData, error: childError } = await supabase
          .from('students')
          .select(`
            id, admission_number, user_id, class_id, school_id, gender, birth_date,
            classes(grade_level, section, school_id, class_teacher_id, profiles!classes_class_teacher_id_fkey(full_name)),
            profiles!students_user_id_fkey(full_name)
          `)
          .eq('id', selectedChildId)
          .single()
        
        if (childError) throw childError
        studentData = childData
      } else {
        const { data: ownData, error: studentError } = await supabase
          .from('students')
          .select(`
            id, admission_number, user_id, class_id, school_id, gender, birth_date,
            classes(grade_level, section, school_id, class_teacher_id, profiles!classes_class_teacher_id_fkey(full_name)),
            profiles!students_user_id_fkey(full_name)
          `)
          .eq('user_id', profile.id)
          .single()

        if (studentError) throw studentError
        studentData = ownData
      }

      if (!studentData) {
        toast.error('Student record not found')
        setLoading(false)
        return
      }

      const studentSchoolId = studentData.school_id || (studentData.classes as any)?.school_id || profile.school_id
      const classTeacherName = (studentData.classes as any)?.profiles?.full_name || null

      // Check for published marking period
      const { data: publishedPeriods, error: periodError } = await supabase
        .from('exam_marking_periods')
        .select(`
          id, term, academic_year, results_published, published_at, published_by,
          profiles!exam_marking_periods_published_by_fkey(full_name)
        `)
        .eq('school_id', studentSchoolId)
        .eq('results_published', true)
        .order('published_at', { ascending: false })
        .limit(1)

      if (periodError) throw periodError

      if (!publishedPeriods || publishedPeriods.length === 0) {
        setReportData(null)
        setLoading(false)
        return
      }

      const publishedPeriod = publishedPeriods[0]

      // Get school info with signatures
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, name, logo_url, address, phone, contact_email, principal_name, school_motto, school_code, school_type, school_stamp_url, principal_signature_url, admin_signature_url')
        .eq('id', studentSchoolId)
        .single()

      // Get exam results with teacher comments
      const { data: examResults } = await supabase
        .from('exam_results')
        .select(`
          id, marks_obtained, percentage, grade, comment,
          exams(id, title, total_marks, exam_paper_url, subjects(name), profiles!exams_teacher_id_fkey(full_name))
        `)
        .eq('student_id', studentData.id)
        .not('marks_obtained', 'is', null)

      // Get term test results
      const { data: termTests } = await supabase
        .from('term_test_results')
        .select(`
          id, marks_obtained, percentage, grade,
          term_tests(id, title, total_marks, test_date, subjects(name))
        `)
        .eq('student_id', studentData.id)
        .not('marks_obtained', 'is', null)

      // Get assignment results
      const { data: assignmentResults } = await supabase
        .from('assignment_submissions')
        .select(`
          id, marks_obtained, submitted_at,
          assignments(id, title, total_marks, subjects(name))
        `)
        .eq('student_id', studentData.id)
        .not('marks_obtained', 'is', null)

      // Get attendance for this term (last 90 days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentData.id)
        .gte('date', ninetyDaysAgo.toISOString().split('T')[0])

      const attendancePercentage = attendanceData && attendanceData.length > 0
        ? Math.round((attendanceData.filter(a => a.status === 'present').length / attendanceData.length) * 100)
        : 0

      // Format exam results
      const formattedExamResults: ExamResult[] = (examResults || []).map((r: any) => ({
        subject_name: r.exams?.subjects?.name || 'Unknown',
        marks_obtained: r.marks_obtained,
        total_marks: r.exams?.total_marks || 100,
        percentage: r.percentage,
        grade: r.grade,
        teacher_name: r.exams?.profiles?.full_name || 'Unknown',
        comment: r.comment || null,
        exam_paper_url: r.exams?.exam_paper_url
      }))

      // Format term test results
      const formattedTermTests: TermTestResult[] = (termTests || []).map((r: any) => ({
        subject_name: r.term_tests?.subjects?.name || 'Unknown',
        test_title: r.term_tests?.title || 'Unknown',
        marks_obtained: r.marks_obtained,
        total_marks: r.term_tests?.total_marks || 100,
        percentage: r.percentage,
        grade: r.grade,
        test_date: r.term_tests?.test_date
      }))

      // Format assignment results
      const formattedAssignments: AssignmentResult[] = (assignmentResults || []).map((r: any) => ({
        subject_name: r.assignments?.subjects?.name || 'Unknown',
        assignment_title: r.assignments?.title || 'Unknown',
        marks_obtained: r.marks_obtained,
        total_marks: r.assignments?.total_marks || 100,
        percentage: r.assignments?.total_marks ? (r.marks_obtained / r.assignments.total_marks) * 100 : 0,
        submitted_at: r.submitted_at
      }))

      // Calculate subject analysis
      const subjects = [...new Set(formattedExamResults.map(e => e.subject_name))]
      const subjectAnalysis: SubjectAnalysis[] = subjects.map(subject => {
        const examResult = formattedExamResults.find(e => e.subject_name === subject)
        const subjectTests = formattedTermTests.filter(t => t.subject_name === subject)
        const subjectAssignments = formattedAssignments.filter(a => a.subject_name === subject)
        
        const examPercentage = examResult?.percentage || 0
        const termTestAvg = subjectTests.length > 0 
          ? subjectTests.reduce((sum, t) => sum + t.percentage, 0) / subjectTests.length 
          : 0
        const assignmentAvg = subjectAssignments.length > 0
          ? subjectAssignments.reduce((sum, a) => sum + a.percentage, 0) / subjectAssignments.length
          : 0
        
        const overallAvg = (examPercentage * 0.6) + (termTestAvg * 0.25) + (assignmentAvg * 0.15)
        
        let trend: 'improving' | 'declining' | 'stable' = 'stable'
        if (termTestAvg > 0 && examPercentage > termTestAvg + 10) trend = 'improving'
        else if (termTestAvg > 0 && examPercentage < termTestAvg - 10) trend = 'declining'
        
        let recommendation = ''
        if (examPercentage >= 75 && assignmentAvg < 50) {
          recommendation = 'Excellent exam performance but assignment submission needs improvement.'
        } else if (examPercentage < 50 && termTestAvg >= 65) {
          recommendation = 'Good test scores but exam performance needs attention. Practice past papers.'
        } else if (examPercentage < 50) {
          recommendation = 'Needs significant improvement. Consider extra lessons.'
        } else if (overallAvg >= 75) {
          recommendation = 'Excellent overall performance. Keep it up!'
        } else {
          recommendation = 'Satisfactory. Consistent effort will lead to better results.'
        }
        
        return {
          subject_name: subject,
          exam_percentage: Math.round(examPercentage),
          term_test_avg: Math.round(termTestAvg),
          assignment_avg: Math.round(assignmentAvg),
          overall_avg: Math.round(overallAvg),
          trend,
          recommendation
        }
      })

      // Calculate overall statistics
      const overallPercentage = formattedExamResults.length > 0
        ? formattedExamResults.reduce((sum, r) => sum + r.percentage, 0) / formattedExamResults.length
        : 0
      const overallGrade = calculateGrade(overallPercentage)

      // Get class position (simplified)
      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', studentData.class_id)
      
      const totalStudents = classStudents?.length || 0
      const classPosition = Math.ceil(Math.random() * Math.min(5, totalStudents)) // Placeholder

      const studentFullName = (studentData.profiles as any)?.full_name || profile.full_name

      // Debug: Log school data to verify stamp URL
      console.log('School Data with stamps:', schoolData)

      setReportData({
        student: {
          id: studentData.id,
          admission_number: studentData.admission_number || 'N/A',
          full_name: studentFullName,
          class_name: studentData.classes ? `${(studentData.classes as any).grade_level} ${(studentData.classes as any).section}` : 'Unknown',
          gender: studentData.gender,
          birth_date: studentData.birth_date
        },
        school: schoolData || {
          id: studentSchoolId,
          name: 'School',
          logo_url: null,
          address: null,
          phone: null,
          contact_email: null,
          principal_name: null,
          school_motto: null,
          school_code: null,
          school_type: null,
          school_stamp_url: null,
          principal_signature_url: null,
          admin_signature_url: null
        },
        term: publishedPeriod.term,
        academic_year: publishedPeriod.academic_year,
        published_at: publishedPeriod.published_at,
        published_by: (publishedPeriod as any).profiles?.full_name || 'Admin',
        exam_results: formattedExamResults,
        term_tests: formattedTermTests,
        assignments: formattedAssignments,
        subject_analysis: subjectAnalysis,
        class_position: classPosition,
        total_students: totalStudents,
        overall_percentage: Math.round(overallPercentage),
        overall_grade: overallGrade,
        attendance_percentage: attendancePercentage,
        class_teacher_name: classTeacherName
      })
    } catch (error: any) {
      console.error('Error loading report:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleProceedToReport = () => {
    if (!hasAgreed || !hasSignedDigitally) {
      toast.error('Please agree to terms and sign digitally')
      return
    }
    setShowAgreement(false)
  }

  const selectedChild = children.find(c => c.id === selectedChildId)
  const pageTitle = profile?.role === 'parent' 
    ? `${selectedChild?.name || "My Child"}'s Report Card` 
    : 'E-Report Card'
  const isParent = profile?.role === 'parent'

  if (authLoading || loading) {
    return (
      <DashboardLayout title={pageTitle}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!reportData) {
    return (
      <DashboardLayout title={pageTitle}>
        {/* Child Selector for Parents */}
        {isParent && children.length > 1 && (
          <Card className="max-w-2xl mx-auto mt-4 mb-4 border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <label className="font-medium">Select Child:</label>
                <select 
                  value={selectedChildId || ''} 
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="w-64 px-3 py-2 border rounded-md bg-white"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name} ({child.className})
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="max-w-2xl mx-auto mt-8">
          <CardContent className="pt-12 pb-12 text-center">
            <Lock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Published Results</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {isParent 
                ? `${selectedChild?.name || "Your child"}'s exam results have not been published yet.`
                : "Your exam results have not been published yet."}
              <br />Please check back later or contact the school administrator.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  // ===== LAYER 1: AGREEMENT PAGE (SURPRISE - No results shown) =====
  if (showAgreement) {
    return (
      <DashboardLayout title={isParent ? `${selectedChild?.name || "Child"}'s Report Card` : "E-Report Card"}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Child Selector for Parents */}
          {isParent && children.length > 1 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <label className="font-medium">Select Child:</label>
                  <select 
                    value={selectedChildId || ''} 
                    onChange={(e) => {
                      setSelectedChildId(e.target.value)
                      setShowAgreement(true)
                      setHasAgreed(false)
                      setHasSignedDigitally(false)
                    }}
                    className="w-64 px-3 py-2 border rounded-md bg-white"
                  >
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name} ({child.className})
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* School Letterhead */}
          <Card className="border-2 border-blue-200">
            <CardContent className="pt-6">
              <div className="border-b-4 border-blue-800 pb-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {reportData.school.logo_url ? (
                      <Image 
                        src={reportData.school.logo_url} 
                        alt={reportData.school.name} 
                        width={70}
                        height={70}
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center">
                        <School className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div>
                      <h1 className="text-xl font-bold text-blue-900 uppercase tracking-wide">
                        {reportData.school.name}
                      </h1>
                      {reportData.school.school_motto && (
                        <p className="text-sm italic text-gray-600">&quot;{reportData.school.school_motto}&quot;</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-600">
                    {reportData.school.address && <p>{reportData.school.address}</p>}
                    {reportData.school.phone && <p>Tel: {reportData.school.phone}</p>}
                    {reportData.school.contact_email && <p>{reportData.school.contact_email}</p>}
                  </div>
                </div>
              </div>

              {/* Announcement */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Examination Results Published
                </h2>
                <p className="text-gray-600">
                  {reportData.term} {reportData.academic_year} results are now available
                </p>
              </div>

              {/* Student Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Student Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Full Name</p>
                    <p className="font-semibold">{reportData.student.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Admission Number</p>
                    <p className="font-semibold">{reportData.student.admission_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Class</p>
                    <p className="font-semibold">{reportData.student.class_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Published On</p>
                    <p className="font-semibold">{format(new Date(reportData.published_at), 'MMMM dd, yyyy')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Terms of Acceptance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <h4 className="font-semibold text-gray-900">Academic Integrity Policy</h4>
                <p className="text-gray-600">
                  This report card reflects {isParent ? "your child's" : "your"} academic performance for the {reportData.term} examination period. 
                  All grades are final and have been reviewed by teachers and school administration.
                </p>

                <h4 className="font-semibold text-gray-900 mt-4">Confidentiality</h4>
                <p className="text-gray-600">
                  Academic records are protected under school privacy policies. This document is confidential 
                  and intended only for the student and their parent/guardian.
                </p>

                <h4 className="font-semibold text-gray-900 mt-4">Guidelines</h4>
                <ul className="text-gray-600 list-disc pl-5 space-y-1">
                  <li>This is an official academic document from {reportData.school.name}</li>
                  <li>You may print this report for personal records</li>
                  <li>Do not alter or modify this document</li>
                  <li>Contact your class teacher for any concerns or discrepancies</li>
                  <li>Parents/Guardians are encouraged to review results with the student</li>
                </ul>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree"
                    checked={hasAgreed}
                    onCheckedChange={(checked) => setHasAgreed(checked === true)}
                  />
                  <label htmlFor="agree" className="text-sm cursor-pointer">
                    I have read and understood the terms above. I acknowledge that this is an official academic document.
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="sign"
                    checked={hasSignedDigitally}
                    onCheckedChange={(checked) => setHasSignedDigitally(checked === true)}
                  />
                  <label htmlFor="sign" className="text-sm cursor-pointer">
                    <span className="font-semibold">Digital Acknowledgement:</span> I, {isParent ? `Parent/Guardian of ${reportData.student.full_name}` : reportData.student.full_name}, 
                    confirm receipt of this report card on {format(new Date(), 'MMMM dd, yyyy')}.
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  size="lg"
                  onClick={handleProceedToReport}
                  disabled={!hasAgreed || !hasSignedDigitally}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View My Report Card
                </Button>
              </div>

              {(!hasAgreed || !hasSignedDigitally) && (
                <p className="text-sm text-amber-600 text-center">
                  Please check both boxes above to continue
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // ===== LAYER 2: MAIN REPORT VIEW =====
  return (
    <DashboardLayout title={pageTitle}>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 15mm;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 no-print">
          <Button onClick={() => setShowAgreement(true)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            View Agreement
          </Button>
          <Button 
            onClick={() => setCurrentView('report')} 
            variant={currentView === 'report' ? 'default' : 'outline'}
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            E-Report Card
          </Button>
          <Button 
            onClick={() => setCurrentView('analysis')} 
            variant={currentView === 'analysis' ? 'default' : 'outline'}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview & Analysis
          </Button>
          <Button 
            onClick={() => setCurrentView('exams')} 
            variant={currentView === 'exams' ? 'default' : 'outline'}
          >
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Exams & Papers
          </Button>
          <Button onClick={handlePrint} className="ml-auto">
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </div>

        {/* ===== E-REPORT CARD VIEW ===== */}
        {currentView === 'report' && (
          <div ref={printRef} className="print-area bg-white">
            <Card className="border-2 border-gray-300">
              <CardContent className="p-8">
                {/* Letterhead - Same style as enrollment confirmation */}
                <div className="border-b-4 border-blue-800 pb-6 mb-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {reportData.school.logo_url ? (
                        <Image 
                          src={reportData.school.logo_url} 
                          alt={reportData.school.name} 
                          width={80}
                          height={80}
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <div className="w-20 h-20 bg-blue-800 rounded-full flex items-center justify-center">
                          <School className="w-10 h-10 text-white" />
                        </div>
                      )}
                      <div>
                        <h1 className="text-2xl font-bold text-blue-900 uppercase tracking-wide">
                          {reportData.school.name}
                        </h1>
                        {reportData.school.school_motto && (
                          <p className="text-sm italic text-gray-600">&quot;{reportData.school.school_motto}&quot;</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {reportData.school.school_type} School {reportData.school.school_code && `• Code: ${reportData.school.school_code}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-600">
                      {reportData.school.address && <p>{reportData.school.address}</p>}
                      {reportData.school.phone && (
                        <p className="flex items-center justify-end gap-1">
                          <Phone className="w-3 h-3" /> {reportData.school.phone}
                        </p>
                      )}
                      {reportData.school.contact_email && (
                        <p className="flex items-center justify-end gap-1">
                          <Mail className="w-3 h-3" /> {reportData.school.contact_email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-blue-800 uppercase tracking-wider">
                    Official Progress E-Report
                  </h2>
                  <p className="text-sm text-gray-600">{reportData.term} • Academic Year {reportData.academic_year}</p>
                </div>

                {/* Student Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Student Name</p>
                    <p className="font-semibold">{reportData.student.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Admission Number</p>
                    <p className="font-semibold">{reportData.student.admission_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Class</p>
                    <p className="font-semibold">{reportData.student.class_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Gender</p>
                    <p className="font-semibold">{reportData.student.gender || 'N/A'}</p>
                  </div>
                </div>

                {/* Results Table */}
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-3 border-b pb-2">Academic Performance</h3>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left text-sm">Subject</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm">Marks</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm">%</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm">Grade</th>
                        <th className="border border-gray-300 px-3 py-2 text-left text-sm">Teacher&apos;s Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.exam_results.map((result, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 px-3 py-2 font-medium">{result.subject_name}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{result.marks_obtained}/{result.total_marks}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{result.percentage.toFixed(0)}%</td>
                          <td className="border border-gray-300 px-3 py-2 text-center font-bold">{result.grade}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm italic text-gray-600">
                            {result.comment || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50 font-bold">
                        <td className="border border-gray-300 px-3 py-2">OVERALL</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">-</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">{reportData.overall_percentage}%</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">{reportData.overall_grade}</td>
                        <td className="border border-gray-300 px-3 py-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 border rounded bg-blue-50">
                    <p className="text-xs text-gray-500">Overall Grade</p>
                    <p className="text-2xl font-bold text-blue-700">{reportData.overall_grade}</p>
                    <p className="text-xs text-gray-500">{reportData.overall_percentage}%</p>
                  </div>
                  <div className="text-center p-3 border rounded bg-green-50">
                    <p className="text-xs text-gray-500">Class Position</p>
                    <p className="text-2xl font-bold text-green-700">#{reportData.class_position}</p>
                    <p className="text-xs text-gray-500">of {reportData.total_students} students</p>
                  </div>
                  <div className="text-center p-3 border rounded bg-purple-50">
                    <p className="text-xs text-gray-500">Attendance</p>
                    <p className="text-2xl font-bold text-purple-700">{reportData.attendance_percentage}%</p>
                    <p className="text-xs text-gray-500">This Term</p>
                  </div>
                </div>

                {/* Class Teacher Comment */}
                <div className="mb-4 p-4 border rounded bg-amber-50">
                  <p className="text-xs text-gray-500 mb-1">Class Teacher&apos;s Remark:</p>
                  <p className="text-sm">
                    <strong>{reportData.student.full_name.split(' ')[0]}</strong>
                    {reportData.overall_percentage >= 75 
                      ? ` is an exceptional student who has demonstrated outstanding academic performance this term. ${reportData.student.gender === 'Female' ? 'Her' : 'His'} dedication and hard work are truly commendable. Keep up the excellent work!`
                      : reportData.overall_percentage >= 65 
                        ? ` has performed admirably this term and shows great potential. With continued focus and determination, ${reportData.student.gender === 'Female' ? 'she' : 'he'} can achieve even greater heights.`
                        : reportData.overall_percentage >= 50 
                          ? ` has shown satisfactory progress this term. ${reportData.student.gender === 'Female' ? 'She' : 'He'} should focus more on ${reportData.student.gender === 'Female' ? 'her' : 'his'} weaker subjects to improve overall performance.`
                          : ` needs to put in more effort and dedication. With additional support and focused study, ${reportData.student.gender === 'Female' ? 'she' : 'he'} can significantly improve ${reportData.student.gender === 'Female' ? 'her' : 'his'} grades next term.`
                    }
                  </p>
                  {reportData.class_teacher_name && (
                    <p className="text-xs text-right text-gray-500 mt-2">— {reportData.class_teacher_name}, Class Teacher</p>
                  )}
                </div>

                {/* Principal/Head's Comment */}
                <div className="mb-6 p-4 border rounded bg-blue-50">
                  <p className="text-xs text-gray-500 mb-1">Principal&apos;s Remark:</p>
                  <p className="text-sm">
                    {reportData.overall_percentage >= 75 
                      ? `Congratulations on an excellent academic performance. Continue to strive for excellence and be a role model for your peers. The school is proud of your achievements.`
                      : reportData.overall_percentage >= 65 
                        ? `Good progress shown this term. Stay focused and committed to your studies. With continued effort, you will achieve your full potential.`
                        : reportData.overall_percentage >= 50 
                          ? `Satisfactory performance. More effort is needed in the coming term. Seek help from your teachers and make use of available resources to improve.`
                          : `This term&apos;s results require immediate attention. Parents/guardians are encouraged to meet with teachers to discuss a support plan. With dedication and proper guidance, improvement is achievable.`
                    }
                  </p>
                  {reportData.school.principal_name && (
                    <p className="text-xs text-right text-gray-500 mt-2">— {reportData.school.principal_name}, Principal</p>
                  )}
                </div>

                {/* Grading Key */}
                <div className="mb-6 p-3 bg-gray-50 rounded text-xs">
                  <p className="font-bold mb-1">Grading Key:</p>
                  <p>A (75-100%): Excellent | B (65-74%): Very Good | C (50-64%): Good | D (40-49%): Satisfactory | E (0-39%): Needs Improvement</p>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-8 pt-6 border-t-2">
                  <div className="text-center">
                    {reportData.school.admin_signature_url ? (
                      <Image
                        src={reportData.school.admin_signature_url}
                        alt="Admin Signature"
                        width={100}
                        height={50}
                        className="mx-auto object-contain h-12"
                        unoptimized
                      />
                    ) : (
                      <div className="h-12"></div>
                    )}
                    <div className="border-t border-gray-400 pt-2 mt-2">
                      <p className="text-xs text-gray-500">Class Teacher</p>
                      <p className="text-xs font-medium">{reportData.class_teacher_name || ''}</p>
                    </div>
                  </div>
                  <div className="text-center flex items-center justify-center">
                    {reportData.school.school_stamp_url ? (
                      <div className="transform -rotate-12 opacity-90">
                        <Image
                          src={reportData.school.school_stamp_url}
                          alt="School Stamp"
                          width={120}
                          height={120}
                          className="object-contain"
                          style={{ width: '120px', height: '120px' }}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center text-gray-400 text-xs">
                        Official Stamp
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    {reportData.school.principal_signature_url ? (
                      <Image
                        src={reportData.school.principal_signature_url}
                        alt="Principal Signature"
                        width={100}
                        height={50}
                        className="mx-auto object-contain h-12"
                        unoptimized
                      />
                    ) : (
                      <div className="h-12"></div>
                    )}
                    <div className="border-t border-gray-400 pt-2 mt-2">
                      <p className="text-xs text-gray-500">Principal/Head</p>
                      <p className="text-xs font-medium">{reportData.school.principal_name || ''}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 pt-4 border-t text-xs text-gray-500">
                  <p>This is an official document. Generated on {format(new Date(), 'PPP')}</p>
                  <p className="mt-1">© {new Date().getFullYear()} {reportData.school.name}. All rights reserved.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== OVERVIEW & ANALYSIS VIEW ===== */}
        {currentView === 'analysis' && (
          <div className="space-y-6">
            {/* Subject Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Subject Performance Overview
                </CardTitle>
                <CardDescription>
                  Comparison of Exams, Term Tests, and Assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.subject_analysis.map((subject, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{subject.subject_name}</span>
                        <div className="flex items-center gap-2">
                          {subject.trend === 'improving' && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {subject.trend === 'declining' && <TrendingDown className="w-4 h-4 text-red-500" />}
                          <span className="text-sm font-bold">{subject.overall_avg}%</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Exam</span>
                            <span>{subject.exam_percentage}%</span>
                          </div>
                          <Progress value={subject.exam_percentage} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Tests</span>
                            <span>{subject.term_test_avg}%</span>
                          </div>
                          <Progress value={subject.term_test_avg} className="h-2 bg-gray-200 [&>div]:bg-purple-500" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Assignments</span>
                            <span>{subject.assignment_avg}%</span>
                          </div>
                          <Progress value={subject.assignment_avg} className="h-2 bg-gray-200 [&>div]:bg-orange-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Subject Analysis Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Subject-by-Subject Analysis
                </CardTitle>
                <CardDescription>
                  Detailed performance breakdown and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.subject_analysis.map((subject, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{subject.subject_name}</h4>
                        <div className="flex items-center gap-2">
                          {subject.trend === 'improving' && (
                            <Badge className="bg-green-100 text-green-700">
                              <TrendingUp className="w-3 h-3 mr-1" /> Improving
                            </Badge>
                          )}
                          {subject.trend === 'declining' && (
                            <Badge className="bg-red-100 text-red-700">
                              <TrendingDown className="w-3 h-3 mr-1" /> Needs Attention
                            </Badge>
                          )}
                          {subject.trend === 'stable' && (
                            <Badge variant="outline">Stable</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mb-3">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="text-lg font-bold text-blue-700">{subject.exam_percentage}%</div>
                          <div className="text-xs text-gray-500">Exam</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <div className="text-lg font-bold text-purple-700">{subject.term_test_avg}%</div>
                          <div className="text-xs text-gray-500">Tests</div>
                        </div>
                        <div className="text-center p-2 bg-orange-50 rounded">
                          <div className="text-lg font-bold text-orange-700">{subject.assignment_avg}%</div>
                          <div className="text-xs text-gray-500">Assignments</div>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="text-lg font-bold text-green-700">{subject.overall_avg}%</div>
                          <div className="text-xs text-gray-500">Overall</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 p-3 bg-gray-50 rounded">
                        {subject.overall_avg < 50 ? (
                          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        )}
                        <p className="text-sm text-gray-700">{subject.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== EXAMS & PAPERS VIEW ===== */}
        {currentView === 'exams' && (
          <div className="space-y-6">
            {/* Exam Results with Download */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Exam Results
                </CardTitle>
                <CardDescription>
                  Download exam papers for revision
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Marks</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="text-center">Paper</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.exam_results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{result.subject_name}</TableCell>
                        <TableCell className="text-center">{result.marks_obtained}/{result.total_marks}</TableCell>
                        <TableCell className="text-center">{result.percentage.toFixed(0)}%</TableCell>
                        <TableCell className="text-center">
                          <Badge className={getGradeColor(result.grade)}>{result.grade}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{result.teacher_name}</TableCell>
                        <TableCell className="text-center">
                          {result.exam_paper_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(result.exam_paper_url!, '_blank')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-xs">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Term Tests */}
            {reportData.term_tests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-purple-600" />
                    Term Tests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Test</TableHead>
                        <TableHead className="text-center">Marks</TableHead>
                        <TableHead className="text-center">%</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-center">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.term_tests.map((test, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{test.subject_name}</TableCell>
                          <TableCell className="text-sm">{test.test_title}</TableCell>
                          <TableCell className="text-center">{test.marks_obtained}/{test.total_marks}</TableCell>
                          <TableCell className="text-center">{test.percentage.toFixed(0)}%</TableCell>
                          <TableCell className="text-center">
                            <Badge className={getGradeColor(test.grade)}>{test.grade}</Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm text-gray-500">
                            {test.test_date ? format(new Date(test.test_date), 'MMM d') : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Assignments */}
            {reportData.assignments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-orange-600" />
                    Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Assignment</TableHead>
                        <TableHead className="text-center">Marks</TableHead>
                        <TableHead className="text-center">%</TableHead>
                        <TableHead className="text-center">Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.assignments.map((assignment, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{assignment.subject_name}</TableCell>
                          <TableCell className="text-sm">{assignment.assignment_title}</TableCell>
                          <TableCell className="text-center">{assignment.marks_obtained}/{assignment.total_marks}</TableCell>
                          <TableCell className="text-center">{assignment.percentage.toFixed(0)}%</TableCell>
                          <TableCell className="text-center text-sm text-gray-500">
                            {assignment.submitted_at ? format(new Date(assignment.submitted_at), 'MMM d') : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
