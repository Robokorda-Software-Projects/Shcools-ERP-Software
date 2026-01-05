/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Users,
  CreditCard,
  MessageSquare,
  UserCircle,
  Award,
  Heart,
  CalendarDays,
  Phone,
  Mail,
  MapPin,
  Globe,
  Download
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
  principal_email: string | null
  principal_phone: string | null
  established_year: number | null
  curriculum: string | null
  website: string | null
}

interface ChildInfo {
  id: string
  full_name: string
  class_name: string
  grade_level: string
  attendance_rate: number
  current_average: number
  class_rank: number | null
  profile_photo: string | null
  pending_fees: number
}

interface ParentStats {
  total_children: number
  total_fees_due: number
  upcoming_events: number
  unread_messages: number
}

export default function ParentDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [children, setChildren] = useState<ChildInfo[]>([])
  const [stats, setStats] = useState<ParentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'parent') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'parent') {
      loadDashboardData()
    }
  }, [profile])

  const loadDashboardData = async () => {
    if (!profile?.id) return

    try {
      setLoading(true)

      // Load school info if parent has a school_id
      if (profile?.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('id, name, school_code, school_type, logo_url, school_motto, address, phone, contact_email, principal_name, principal_email, principal_phone, established_year, curriculum, website')
          .eq('id', profile.school_id)
          .single()

        setSchoolInfo(schoolData)
      }

      // Fetch children linked to this parent
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          roll_number,
          class_id,
          profiles!students_user_id_fkey(full_name),
          classes(grade_level, section)
        `)
        .eq('parent_id', profile.id)

      if (studentsError) throw studentsError

      if (!studentsData || studentsData.length === 0) {
        setChildren([])
        setStats({
          total_children: 0,
          total_fees_due: 0,
          upcoming_events: 0,
          unread_messages: 0
        })
        setLoading(false)
        return
      }

      // Fetch detailed info for each child
      const childrenWithStats = await Promise.all(
        studentsData.map(async (student: any) => {
          // Get attendance rate (last 30 days)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          
          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('status')
            .eq('student_id', student.id)
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

          const attendanceRate = attendanceData && attendanceData.length > 0
            ? Math.round((attendanceData.filter(a => a.status === 'present').length / attendanceData.length) * 100)
            : 0

          // Get average from term test results
          const { data: testResults } = await supabase
            .from('term_test_results')
            .select('marks_obtained, term_tests(total_marks)')
            .eq('student_id', student.id)
            .order('created_at', { ascending: false })
            .limit(10)

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

          // Get class rank (simplified - just count students with higher average)
          const { data: allResults } = await supabase
            .from('term_test_results')
            .select('student_id, marks_obtained')
            .in('student_id', studentsData.map((s: any) => s.id))

          const className = `${student.classes?.grade_level || 'Unknown'} ${student.classes?.section || ''}`

          return {
            id: student.id,
            full_name: student.profiles?.full_name || 'Unknown',
            class_name: className,
            grade_level: student.classes?.grade_level || 'Unknown',
            attendance_rate: attendanceRate,
            current_average: currentAverage,
            class_rank: null, // Complex calculation - can be added later
            profile_photo: null,
            pending_fees: 0 // Would need fee_payments table integration
          }
        })
      )

      setChildren(childrenWithStats)
      setStats({
        total_children: studentsData.length,
        total_fees_due: 0, // Would need fee integration
        upcoming_events: 0, // Would need events table
        unread_messages: 0 // Would need messages table
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

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-blue-600'
    if (percentage >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Parent Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'parent') {
    return null
  }

  return (
    <DashboardLayout title="Parent Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-purple-600 via-purple-700 to-pink-700 text-white overflow-hidden">
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
                    <Heart className="h-7 w-7 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-purple-100 text-sm">{getGreeting()},</p>
                  <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                  <p className="text-purple-200 text-sm">
                    {schoolInfo?.name || 'Parent Portal'}
                  </p>
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/children-grades">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-purple-500 bg-purple-50">
              <CardContent className="pt-6 pb-6 text-center">
                <Award className="h-8 w-8 mx-auto text-purple-600 mb-3" />
                <p className="text-sm font-medium text-gray-600">View</p>
                <p className="text-lg font-bold text-purple-700">Children&apos;s Grades</p>
                <p className="text-xs text-gray-500 mt-1">Academic performance & results</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/student/attendance">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-yellow-500 bg-yellow-50">
              <CardContent className="pt-6 pb-6 text-center">
                <CalendarDays className="h-8 w-8 mx-auto text-yellow-600 mb-3" />
                <p className="text-sm font-medium text-gray-600">View</p>
                <p className="text-lg font-bold text-yellow-700">Attendance</p>
                <p className="text-xs text-gray-500 mt-1">Attendance records</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/parent/resources">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-green-500 bg-green-50">
              <CardContent className="pt-6 pb-6 text-center">
                <Download className="h-8 w-8 mx-auto text-green-600 mb-3" />
                <p className="text-sm font-medium text-gray-600">View</p>
                <p className="text-lg font-bold text-green-700">Resources</p>
                <p className="text-xs text-gray-500 mt-1">Notes & learning materials</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/student/ereport">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-blue-500 bg-blue-50">
              <CardContent className="pt-6 pb-6 text-center">
                <FileText className="h-8 w-8 mx-auto text-blue-600 mb-3" />
                <p className="text-sm font-medium text-gray-600">View</p>
                <p className="text-lg font-bold text-blue-700">E-Report</p>
                <p className="text-xs text-gray-500 mt-1">Exam report cards</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-700">{stats?.total_children ?? 0}</div>
              <p className="text-xs text-gray-600">Children Enrolled</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {children.length > 0 
                  ? Math.round(children.reduce((sum, c) => sum + c.current_average, 0) / children.length)
                  : 0}%
              </div>
              <p className="text-xs text-gray-600">Average Performance</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-700">
                {children.length > 0
                  ? Math.round(children.reduce((sum, c) => sum + c.attendance_rate, 0) / children.length)
                  : 0}%
              </div>
              <p className="text-xs text-gray-600">Average Attendance</p>
            </CardContent>
          </Card>
        </div>

        {/* Children Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">My Children</CardTitle>
              <Link href="/dashboard/children-grades">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {children.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children.map((child) => (
                  <Card key={child.id} className="bg-gray-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={child.profile_photo || undefined} />
                          <AvatarFallback className="bg-purple-100 text-purple-700">
                            {child.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{child.full_name}</p>
                          <p className="text-xs text-gray-500">{child.class_name} • {child.grade_level}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="text-lg font-bold text-green-600">{child.attendance_rate}%</div>
                          <p className="text-xs text-gray-500">Attendance</p>
                        </div>
                        <div>
                          <div className={`text-lg font-bold ${getGradeColor(child.current_average)}`}>
                            {child.current_average}%
                          </div>
                          <p className="text-xs text-gray-500">Average</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-yellow-600">
                            #{child.class_rank || '--'}
                          </div>
                          <p className="text-xs text-gray-500">Rank</p>
                        </div>
                      </div>

                      {child.pending_fees > 0 && (
                        <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-red-600">Fees Due</span>
                            <span className="text-sm font-bold text-red-700">${child.pending_fees}</span>
                          </div>
                        </div>
                      )}

                      <div className="mt-3">
                        <Link href={`/dashboard/children-grades?child=${child.id}`} className="w-full">
                          <Button variant="default" size="sm" className="w-full text-xs bg-purple-600 hover:bg-purple-700">
                            <Award className="h-3 w-3 mr-1" />
                            View Full Report Card
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">No children linked to your account</p>
                <p className="text-xs text-gray-400">Contact the school to link your children&apos;s accounts</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Announcements Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">School Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <Bell className="h-10 w-10 mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">No announcements</p>
              <p className="text-xs text-gray-400">School announcements will appear here</p>
            </div>
          </CardContent>
        </Card>

        {/* School Info Card - Full Contact Details */}
        {schoolInfo && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                {schoolInfo.logo_url ? (
                  <Image
                    src={schoolInfo.logo_url}
                    alt={schoolInfo.name}
                    width={48}
                    height={48}
                    className="rounded-lg object-contain"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <School className="h-6 w-6 text-blue-600" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg text-blue-900">{schoolInfo.name}</CardTitle>
                  <p className="text-xs text-blue-600">
                    {schoolInfo.school_type} School • Code: {schoolInfo.school_code}
                    {schoolInfo.established_year && ` • Est. ${schoolInfo.established_year}`}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* School Motto */}
              {schoolInfo.school_motto && (
                <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
                  <p className="text-sm text-blue-800 italic text-center">&ldquo;{schoolInfo.school_motto}&rdquo;</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Information */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Information
                  </h4>
                  {schoolInfo.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2 pl-6">
                      <Phone className="h-3 w-3 text-gray-400" />
                      {schoolInfo.phone}
                    </p>
                  )}
                  {schoolInfo.contact_email && (
                    <p className="text-sm text-gray-600 flex items-center gap-2 pl-6">
                      <Mail className="h-3 w-3 text-gray-400" />
                      {schoolInfo.contact_email}
                    </p>
                  )}
                  {schoolInfo.address && (
                    <p className="text-sm text-gray-600 flex items-center gap-2 pl-6">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      {schoolInfo.address}
                    </p>
                  )}
                  {schoolInfo.website && (
                    <a 
                      href={schoolInfo.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-2 pl-6"
                    >
                      <Globe className="h-3 w-3" />
                      Visit Website
                    </a>
                  )}
                </div>

                {/* Principal Information */}
                {schoolInfo.principal_name && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <UserCircle className="h-4 w-4" />
                      Principal&apos;s Office
                    </h4>
                    <p className="text-sm text-gray-600 pl-6">
                      {schoolInfo.principal_name}
                    </p>
                    {schoolInfo.principal_phone && (
                      <p className="text-sm text-gray-600 flex items-center gap-2 pl-6">
                        <Phone className="h-3 w-3 text-gray-400" />
                        {schoolInfo.principal_phone}
                      </p>
                    )}
                    {schoolInfo.principal_email && (
                      <p className="text-sm text-gray-600 flex items-center gap-2 pl-6">
                        <Mail className="h-3 w-3 text-gray-400" />
                        {schoolInfo.principal_email}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Curriculum Badge */}
              {schoolInfo.curriculum && (
                <div className="flex justify-center">
                  <Badge variant="outline" className="bg-white">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    {schoolInfo.curriculum} Curriculum
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
