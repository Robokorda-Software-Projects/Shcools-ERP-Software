'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Users, GraduationCap, FileText, School, Calendar, CalendarDays, BookOpen, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SchoolInfo {
  name: string
  school_code: string
  school_type: string
  address: string | null
  phone: string | null
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [stats, setStats] = useState({
    classes: 0,
    subjects: 0,
    students: 0,
    upcomingExams: 0,
    pendingAssignments: 0,
    todayClasses: 0
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (profile) {
      if (profile.role === 'teacher') {
        loadTeacherData()
      }
      if (profile.school_id) {
        loadSchoolInfo()
      }
    }
  }, [profile])

  const loadSchoolInfo = async () => {
    if (!profile?.school_id) return

    try {
      const { data } = await supabase
        .from('schools')
        .select('name, school_code, school_type, address, phone')
        .eq('id', profile.school_id)
        .single()

      if (data) {
        setSchoolInfo(data)
      }
    } catch (error) {
      console.error('Error loading school info:', error)
    }
  }

  const loadTeacherData = async () => {
    if (!profile?.id) return

    try {
      // Get classes assigned to teacher
      const { data: classAssignments } = await supabase
        .from('class_subject_assignments')
        .select('class_id, classes!inner(school_id)')
        .eq('teacher_id', profile.id)
        .eq('classes.school_id', profile.school_id)

      const uniqueClasses = new Set(classAssignments?.map(a => a.class_id) || [])
      
      // Get subjects assigned to teacher
      const { data: subjectAssignments } = await supabase
        .from('teacher_subject_assignments')
        .select('subject_id')
        .eq('teacher_id', profile.id)
        .eq('school_id', profile.school_id)

      const uniqueSubjects = new Set(subjectAssignments?.map(a => a.subject_id) || [])

      // Get total students in teacher's classes
      let totalStudents = 0
      if (uniqueClasses.size > 0) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .in('class_id', Array.from(uniqueClasses))
      
        totalStudents = count || 0
      }

      // Get upcoming exams (next 7 days)
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      let upcomingExams = 0
      if (uniqueClasses.size > 0) {
        const { count } = await supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .in('class_id', Array.from(uniqueClasses))
          .gte('exam_date', today)
          .lte('exam_date', nextWeek)
          .eq('school_id', profile.school_id)
        
        upcomingExams = count || 0
      }

      // Get pending assignments (due in next 7 days, not fully graded)
      let pendingAssignments = 0
      if (uniqueClasses.size > 0) {
        const { data: assignments } = await supabase
          .from('assignments')
          .select('id, class_id')
          .in('class_id', Array.from(uniqueClasses))
          .gte('due_date', today)
          .eq('school_id', profile.school_id)

        // Check which ones have pending submissions
        for (const assignment of assignments || []) {
          const { count: studentCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', assignment.class_id)

          const { count: submissionCount } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id)

          if ((submissionCount || 0) < (studentCount || 0)) {
            pendingAssignments++
          }
        }
      }

      setStats({
        classes: uniqueClasses.size,
        subjects: uniqueSubjects.size,
        students: totalStudents,
        upcomingExams,
        pendingAssignments,
        todayClasses: uniqueClasses.size // Simplified for now
      })
    } catch (error) {
      console.error('Error loading teacher stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {/* Welcome Card */}
          <Card className="bg-gradient-to-r from-purple-500 to-purple-700 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome back, {profile.full_name}!</CardTitle>
              <CardDescription className="text-purple-100">
                {profile.role === 'teacher' && 'Teacher Dashboard - Manage your classes and students'}
                {profile.role === 'school_admin' && 'School Administrator Dashboard'}
                {profile.role === 'super_admin' && 'System Administrator Dashboard'}
              </CardDescription>
            </CardHeader>
          </Card>

        {/* School Info Banner */}
        {schoolInfo && (
          
          <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                    <School className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">{schoolInfo.name}</h2>
                    <p className="text-blue-100 text-sm">
                      {schoolInfo.school_code} • {schoolInfo.school_type} School
                    </p>
                    {schoolInfo.address && (
                      <p className="text-blue-100 text-sm mt-1">{schoolInfo.address}</p>
                    )}
                    <p className="text-xs text-white-500 mt-1 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Academic Year 2025
                    </p>
                  </div>
                    
                  
                </div>
                {schoolInfo.phone && (
                  <div className="text-right">
                    <p className="text-blue-100 text-sm">Contact</p>
                    <p className="font-semibold">{schoolInfo.phone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        
        )}
        </div>

        

        {/* Teacher Stats */}
        {profile.role === 'teacher' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/classes')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">My Classes</CardTitle>
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats.classes}</div>
                  <p className="text-xs text-gray-500 mt-1">Assigned classes</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/classes')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
                  <Users className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{stats.students}</div>
                  <p className="text-xs text-gray-500 mt-1">In my classes</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/exams')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Teaching Subjects</CardTitle>
                  <BookOpen className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats.subjects}</div>
                  <p className="text-xs text-gray-500 mt-1">Subjects assigned</p>
                </CardContent>
              </Card>


              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/attendance')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Today's Classes</CardTitle>
                  <Calendar className="h-5 w-5 text-teal-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-600">{stats.todayClasses}</div>
                  <p className="text-xs text-gray-500 mt-1">Mark attendance</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 ">
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => router.push('/dashboard/attendance')}
                  >
                    <ClipboardList className="h-6 w-6 text-blue-600" />
                    <span className="font-semibold">Mark Attendance</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col gap-2 hover:bg-green-50 hover:border-green-300"
                    onClick={() => router.push('/dashboard/classes')}
                  >
                    <GraduationCap className="h-6 w-6 text-green-600" />
                    <span className="font-semibold">View Classes</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-300"
                    onClick={() => router.push('/dashboard/exams')}
                  >
                    <FileText className="h-6 w-6 text-purple-600" />
                    <span className="font-semibold">Manage Exams</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col gap-2 hover:bg-orange-50 hover:border-orange-300"
                    onClick={() => router.push('/dashboard/lesson-plans')}
                  >
                    <BookOpen className="h-6 w-6 text-orange-600" />
                    <span className="font-semibold">Lesson Plans</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}