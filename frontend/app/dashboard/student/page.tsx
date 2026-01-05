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
  TrendingUp,
  TrendingDown,
  User,
  Award,
  BookMarked,
  Trophy,
  Target
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
  address: string | null
  phone: string | null
  contact_email: string | null
  principal_name: string | null
  principal_phone: string | null
}

interface SubjectGrade {
  subject: string
  grade: string
  percentage: number
  trend: 'up' | 'down' | 'stable'
}

interface Assignment {
  id: string
  subject: string
  title: string
  due_date: string
  status: 'pending' | 'submitted' | 'graded'
}

interface StudentStats {
  attendance_rate: number
  current_average: number
  class_rank: number
  total_in_class: number
  subjects_count: number
  pending_assignments: number
}

export default function StudentDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [grades, setGrades] = useState<SubjectGrade[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'student') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'student' && profile.school_id) {
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
        .select('id, name, school_code, school_type, logo_url, school_motto, address, phone, contact_email, principal_name, principal_phone')
        .eq('id', profile.school_id)
        .single()

      setSchoolInfo(schoolData)

      // Get student record
      const { data: studentData } = await supabase
        .from('students')
        .select('id, class_id')
        .eq('user_id', profile.id)
        .single()

      if (!studentData) {
        setStats({
          attendance_rate: 0,
          current_average: 0,
          class_rank: 0,
          total_in_class: 0,
          subjects_count: 0,
          pending_assignments: 0
        })
        setLoading(false)
        return
      }

      // Fetch attendance rate (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentData.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

      const attendanceRate = attendanceData && attendanceData.length > 0
        ? Math.round((attendanceData.filter(a => a.status === 'present').length / attendanceData.length) * 100)
        : 0

      // Fetch subjects count for student's class
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id')
        .eq('school_id', profile.school_id)

      // Fetch pending assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select(`
          id,
          assignment_submissions(id, student_id)
        `)
        .eq('class_id', studentData.class_id)
        .gt('due_date', new Date().toISOString())

      const pendingCount = assignmentsData?.filter(a => 
        !a.assignment_submissions?.some(s => s.student_id === studentData.id)
      ).length || 0

      // Fetch latest term test results for average
      const { data: testResults } = await supabase
        .from('term_test_results')
        .select('marks_obtained, term_tests(total_marks)')
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false })
        .limit(5)

      let currentAverage = 0
      if (testResults && testResults.length > 0) {
        const totalPercentage = testResults.reduce((sum, result: any) => {
          const testData = Array.isArray(result.term_tests) ? result.term_tests[0] : result.term_tests
          const totalMarks = testData?.total_marks || 100
          const percentage = (result.marks_obtained / totalMarks) * 100
          return sum + percentage
        }, 0)
        currentAverage = Math.round(totalPercentage / testResults.length)
      }

      // Get total students in class for rank context
      const { count: totalInClass } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', studentData.class_id)

      setStats({
        attendance_rate: attendanceRate,
        current_average: currentAverage,
        class_rank: 0, // Ranking would require complex calculation
        total_in_class: totalInClass || 0,
        subjects_count: subjectsData?.length || 0,
        pending_assignments: pendingCount
      })

      // For now, showing placeholder data for grades and assignments list
      setGrades([])
      setAssignments([])

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

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-blue-600'
    if (percentage >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Student Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'student') {
    return null
  }

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 text-white overflow-hidden">
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
                  <p className="text-green-100 text-sm">{getGreeting()},</p>
                  <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                  <p className="text-green-200 text-sm">{schoolInfo?.name || 'Student'}</p>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats?.current_average || '--'}%</div>
                  <p className="text-xs text-green-200">Average</p>
                </div>
                <div className="h-10 w-px bg-white/20"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold">#{stats?.class_rank || '--'}</div>
                  <p className="text-xs text-green-200">Class Rank</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/dashboard/student/grades">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-green-500 bg-green-50">
              <CardContent className="pt-4 pb-4 text-center">
                <BookMarked className="h-6 w-6 mx-auto text-green-600 mb-2" />
                <p className="text-xs font-medium text-gray-600">View</p>
                <p className="text-sm font-bold text-green-700">My Grades</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/student/assignments">
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="pt-4 pb-4 text-center">
                <FileText className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                <p className="text-xs font-medium text-gray-600">My</p>
                <p className="text-sm font-bold text-gray-900">Assignments</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/student/attendance">
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="pt-4 pb-4 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto text-orange-600 mb-2" />
                <p className="text-xs font-medium text-gray-600">My</p>
                <p className="text-sm font-bold text-gray-900">Attendance</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/student/ereport">
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="pt-4 pb-4 text-center">
                <ClipboardList className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                <p className="text-xs font-medium text-gray-600">Exam</p>
                <p className="text-sm font-bold text-gray-900">Results</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-700">{stats?.attendance_rate ?? 0}%</div>
              <p className="text-xs text-gray-600">Attendance Rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700">{stats?.subjects_count ?? 0}</div>
              <p className="text-xs text-gray-600">Subjects</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-yellow-700">
                {stats?.class_rank ? `#${stats.class_rank}` : '--'}
                {stats?.total_in_class ? <span className="text-sm font-normal text-gray-500">/{stats.total_in_class}</span> : null}
              </div>
              <p className="text-xs text-gray-600">Class Rank</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-700">{stats?.pending_assignments ?? 0}</div>
              <p className="text-xs text-gray-600">Due Assignments</p>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Grades */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Grades</CardTitle>
                <Link href="/dashboard/student/grades">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View All <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {grades.length > 0 ? (
                <div className="space-y-3">
                  {grades.map((grade, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{grade.subject}</p>
                          <p className="text-xs text-gray-500">Latest test</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${getGradeColor(grade.percentage)}`}>
                          {grade.percentage}%
                        </span>
                        {grade.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {grade.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-10 w-10 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">No grades yet</p>
                  <p className="text-xs text-gray-400">Grades will appear here after tests</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Assignments */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Upcoming Assignments</CardTitle>
                <Link href="/dashboard/student/assignments">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View All <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          assignment.status === 'pending' ? 'bg-red-100' :
                          assignment.status === 'submitted' ? 'bg-yellow-100' : 'bg-green-100'
                        }`}>
                          <FileText className={`h-4 w-4 ${
                            assignment.status === 'pending' ? 'text-red-600' :
                            assignment.status === 'submitted' ? 'text-yellow-600' : 'text-green-600'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{assignment.title}</p>
                          <p className="text-xs text-gray-500">{assignment.subject}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          assignment.status === 'pending' ? 'destructive' :
                          assignment.status === 'submitted' ? 'secondary' : 'default'
                        }>
                          {assignment.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">No assignments yet</p>
                  <p className="text-xs text-gray-400">Assignments from teachers will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* School Info Card */}
        <Card className="bg-gradient-to-br from-gray-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <School className="h-4 w-4 text-blue-600" />
              School Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* School Details */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">School Details</p>
                <div className="flex items-start gap-2">
                  {schoolInfo?.logo_url && (
                    <Image
                      src={schoolInfo.logo_url}
                      alt={schoolInfo?.name || 'School'}
                      width={40}
                      height={40}
                      className="rounded-lg object-contain"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{schoolInfo?.name || 'School Name'}</p>
                    <p className="text-xs text-gray-500">{schoolInfo?.school_type || 'School'} • Code: {schoolInfo?.school_code || 'N/A'}</p>
                  </div>
                </div>
                {schoolInfo?.school_motto && (
                  <p className="text-sm text-gray-600 italic mt-2">&ldquo;{schoolInfo.school_motto}&rdquo;</p>
                )}
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Contact</p>
                <div className="space-y-1">
                  {schoolInfo?.phone && (
                    <p className="text-sm text-gray-700">📞 {schoolInfo.phone}</p>
                  )}
                  {schoolInfo?.contact_email && (
                    <p className="text-sm text-gray-700">✉️ {schoolInfo.contact_email}</p>
                  )}
                  {schoolInfo?.address && (
                    <p className="text-sm text-gray-700">📍 {schoolInfo.address}</p>
                  )}
                </div>
              </div>

              {/* Principal Information */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Principal</p>
                <div className="space-y-1">
                  {schoolInfo?.principal_name && (
                    <p className="text-sm font-medium text-gray-900">{schoolInfo.principal_name}</p>
                  )}
                  {schoolInfo?.principal_phone && (
                    <p className="text-sm text-gray-700">📞 {schoolInfo.principal_phone}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
