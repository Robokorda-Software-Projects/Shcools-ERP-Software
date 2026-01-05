'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  School, 
  Users, 
  GraduationCap, 
  Clock,
  BookOpen,
  ClipboardList,
  Bell,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Edit,
  Upload,
  BarChart3,
  Layers,
  AlertTriangle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

interface SchoolInfo {
  id: string
  name: string
  school_code: string
  school_type: string
  logo_url: string | null
  school_motto: string | null
}

interface ClassInfo {
  id: string
  grade_level: string
  section: string
  student_count: number
  subject_name: string
}

interface SubjectInfo {
  id: string
  name: string
  code: string
}

interface TeacherStats {
  total_classes: number
  total_students: number
  total_subjects: number
  pending_test_marks: number
  pending_exam_marks: number
  assignments_pending: number
}

interface MarkingPeriod {
  id: string
  term: string
  academic_year: string
  end_date: string
  is_active: boolean
}

export default function TeacherDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [stats, setStats] = useState<TeacherStats | null>(null)
  const [activeMarkingPeriod, setActiveMarkingPeriod] = useState<MarkingPeriod | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'teacher') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'teacher' && profile.school_id) {
      loadDashboardData()
    }
  }, [profile])

  const loadDashboardData = async () => {
    if (!profile?.school_id || !profile?.id) return

    try {
      setLoading(true)

      // Load school info
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, name, school_code, school_type, logo_url, school_motto')
        .eq('id', profile.school_id)
        .single()

      setSchoolInfo(schoolData)

      // Load teacher's class-subject assignments
      const { data: assignments } = await supabase
        .from('class_subject_assignments')
        .select(`
          id,
          class_id,
          subject_id,
          classes!inner(id, grade_level, section),
          subjects!inner(id, name, code)
        `)
        .eq('teacher_id', profile.id)

      if (!assignments || assignments.length === 0) {
        setClasses([])
        setSubjects([])
        setStats({
          total_classes: 0,
          total_students: 0,
          total_subjects: 0,
          pending_test_marks: 0,
          pending_exam_marks: 0,
          assignments_pending: 0
        })
        setLoading(false)
        return
      }

      // Build unique classes list with subjects and student counts
      const classMap = new Map<string, ClassInfo>()
      const subjectMap = new Map<string, SubjectInfo>()
      
      for (const a of assignments) {
        const cls = a.classes as any
        const subj = a.subjects as any
        
        // Track subjects
        if (subj && !subjectMap.has(subj.id)) {
          subjectMap.set(subj.id, {
            id: subj.id,
            name: subj.name,
            code: subj.code
          })
        }

        // Track classes with subject info
        const classKey = `${cls.id}-${subj.id}`
        if (cls && !classMap.has(classKey)) {
          // Get student count for this class
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('student_status', 'active')

          classMap.set(classKey, {
            id: cls.id,
            grade_level: cls.grade_level,
            section: cls.section,
            student_count: count || 0,
            subject_name: subj.name
          })
        }
      }

      const classesArray = Array.from(classMap.values())
      setClasses(classesArray)
      setSubjects(Array.from(subjectMap.values()))

      // Calculate total unique students (students in assigned classes)
      const uniqueClassIds = [...new Set(classesArray.map(c => c.id))]
      let totalStudents = 0
      for (const classId of uniqueClassIds) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classId)
          .eq('student_status', 'active')
        totalStudents += count || 0
      }

      // Check for active marking period (only show if not past end date)
      const { data: markingPeriods } = await supabase
        .from('exam_marking_periods')
        .select('id, term, academic_year, end_date, is_active')
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
        .limit(1)

      if (markingPeriods && markingPeriods.length > 0) {
        const period = markingPeriods[0]
        const endDate = new Date(period.end_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Only set active period if end date hasn't passed
        if (endDate >= today) {
          setActiveMarkingPeriod(period)
        } else {
          setActiveMarkingPeriod(null)
        }
      }

      // Count pending exam marks (exams without all results entered)
      const { data: exams } = await supabase
        .from('exams')
        .select('id, class_id')
        .eq('school_id', profile.school_id)
        .in('class_id', uniqueClassIds)

      let pendingExamMarks = 0
      if (exams) {
        for (const exam of exams) {
          const { count: studentCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', exam.class_id)
            .eq('student_status', 'active')

          const { count: resultCount } = await supabase
            .from('exam_results')
            .select('*', { count: 'exact', head: true })
            .eq('exam_id', exam.id)
            .not('marks_obtained', 'is', null)

          if ((resultCount || 0) < (studentCount || 0)) {
            pendingExamMarks++
          }
        }
      }

      // Count pending assignment reviews
      const { count: pendingAssignments } = await supabase
        .from('assignment_submissions')
        .select('*, assignments!inner(class_id, created_by)', { count: 'exact', head: true })
        .eq('assignments.created_by', profile.id)
        .is('marks_obtained', null)

      setStats({
        total_classes: uniqueClassIds.length,
        total_students: totalStudents,
        total_subjects: subjectMap.size,
        pending_test_marks: 0, // Will be populated when term_tests table exists
        pending_exam_marks: pendingExamMarks,
        assignments_pending: pendingAssignments || 0
      })

    } catch (error: any) {
      console.error('Error loading dashboard:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Teacher Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'teacher') {
    return null
  }

  return (
    <DashboardLayout title="Teacher Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white overflow-hidden">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
                  {schoolInfo?.logo_url ? (
                    <Image
                      src={schoolInfo.logo_url}
                      alt={schoolInfo.name}
                      width={56}
                      height={56}
                      className="object-contain"
                    />
                  ) : (
                    <School className="h-7 w-7 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-indigo-100 text-sm">{getGreeting()},</p>
                  <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                  <p className="text-indigo-200 text-sm">{schoolInfo?.name || 'Teacher'}</p>
                </div>
              </div>
              <div className="hidden lg:block text-right">
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric'
                  })}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Marking Period Banner */}
        {activeMarkingPeriod && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Edit className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">
                      Exam Marks Entry Open - {activeMarkingPeriod.term} {activeMarkingPeriod.academic_year}
                    </p>
                    <p className="text-sm text-green-600">
                      Closes on {new Date(activeMarkingPeriod.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/exams">
                  <Button className="bg-green-600 hover:bg-green-700">
                    Enter Marks
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/attendance">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-indigo-100 hover:border-indigo-300">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6 text-indigo-600" />
                </div>
                <p className="text-sm font-bold text-gray-900">Mark Attendance</p>
                <p className="text-xs text-gray-500 mt-1">Daily register</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/teacher-tests">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-orange-100 hover:border-orange-300">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="h-6 w-6 text-orange-600" />
                </div>
                <p className="text-sm font-bold text-gray-900">Term Tests</p>
                <p className="text-xs text-gray-500 mt-1">Create & grade</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/exams">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-red-100 hover:border-red-300">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-red-600" />
                </div>
                <p className="text-sm font-bold text-gray-900">Exam Marks</p>
                <p className="text-xs text-gray-500 mt-1">Enter results</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/lesson-plans">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-purple-100 hover:border-purple-300">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm font-bold text-gray-900">Lesson Plans</p>
                <p className="text-xs text-gray-500 mt-1">Plan & manage</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.total_classes ?? 0}</div>
              <p className="text-sm text-gray-600">Classes Assigned</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.total_students ?? 0}</div>
              <p className="text-sm text-gray-600">Total Students</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.total_subjects ?? 0}</div>
              <p className="text-sm text-gray-600">Subjects Teaching</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {(stats?.pending_exam_marks ?? 0) + (stats?.pending_test_marks ?? 0)}
              </div>
              <p className="text-sm text-gray-600">Pending Marks</p>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Classes & Subjects */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">My Classes & Subjects</CardTitle>
                <Badge variant="secondary">{classes.length} assignments</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {classes.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {classes.slice(0, 6).map((cls, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{cls.grade_level} {cls.section}</p>
                        <p className="text-xs text-gray-500">{cls.subject_name}</p>
                      </div>
                      <Badge variant="secondary">{cls.student_count} students</Badge>
                    </div>
                  ))}
                  {classes.length > 6 && (
                    <p className="text-xs text-gray-500 text-center pt-2">
                      +{classes.length - 6} more assignments
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Layers className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-base font-medium text-gray-700 mb-1">No Classes Assigned Yet</p>
                  <p className="text-sm text-gray-500">Contact your school administrator to get assigned to classes</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeMarkingPeriod ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Exam Marks Entry</p>
                        <p className="text-xs text-gray-500">{stats?.pending_exam_marks || 0} subjects pending</p>
                      </div>
                    </div>
                    <Link href="/dashboard/exams">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">Enter</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Exam Marks Entry</p>
                        <p className="text-xs text-gray-400">Waiting for admin to open period</p>
                      </div>
                    </div>
                    <Badge variant="outline">Closed</Badge>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <ClipboardList className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Term Tests</p>
                      <p className="text-xs text-gray-500">Create and manage term tests</p>
                    </div>
                  </div>
                  <Link href="/dashboard/teacher-tests">
                    <Button size="sm" variant="outline">Manage</Button>
                  </Link>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Upload className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Assignments</p>
                      <p className="text-xs text-gray-500">{stats?.assignments_pending || 0} to review</p>
                    </div>
                  </div>
                  <Link href="/dashboard/assignments">
                    <Button size="sm" variant="outline">Review</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
