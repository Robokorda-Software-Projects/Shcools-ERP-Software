'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Users, GraduationCap, FileText, School, Calendar, BookOpen, ClipboardList, TrendingUp, Award, Bell, Clock, MessageSquare, Star, Trophy, BarChart3, Download, Upload, Home, Settings, ChevronRight, Activity, Target, CheckCircle2, CalendarDays, Phone, Mail, MapPin, Globe, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

interface SchoolInfo {
  id: string
  name: string
  school_code: string
  school_type: string
  address: string | null
  phone: string | null
  contact_email: string | null
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
    todayClasses: 0,
    attendanceRate: 95,
    avgGrade: 75
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
        .select('*')
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
        .select(`
          class_id,
          classes!inner(grade_level, section)
        `)
        .eq('teacher_id', profile.id)
        .eq('classes.school_id', profile.school_id)

      // Get unique classes with details
      const classMap = new Map()
      classAssignments?.forEach(assignment => {
        if (!classMap.has(assignment.class_id)) {
          classMap.set(assignment.class_id, {
            class_id: assignment.class_id,
            grade_level: assignment.classes.grade_level,
            section: assignment.classes.section,
            subject_count: 0,
            student_count: 0
          })
        }
        const cls = classMap.get(assignment.class_id)
        cls.subject_count += 1
      })

      // Get student counts for each class
      for (const cls of Array.from(classMap.values())) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.class_id)
        
        cls.student_count = count || 0
      }

      const classesArray = Array.from(classMap.values())

      // Get subjects count
      const { count: subjectCount } = await supabase
        .from('teacher_subject_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', profile.id)
        .eq('school_id', profile.school_id)

      // Get total students
      const totalStudents = classesArray.reduce((sum, cls) => sum + cls.student_count, 0)

      setStats({
        classes: classesArray.length,
        subjects: subjectCount || 0,
        students: totalStudents,
        upcomingExams: 3, // Mock data
        pendingAssignments: 5, // Mock data
        todayClasses: classesArray.length,
        attendanceRate: 95,
        avgGrade: 75
      })

    } catch (error) {
      console.error('Error loading teacher data:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Hero Welcome Section */}
        <Card className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white overflow-hidden">
          <CardContent className="pt-8 pb-8 relative">
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
              <div className="h-full w-full bg-gradient-to-br from-white to-transparent rounded-full"></div>
            </div>
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative h-16 w-16">
                      <Image
                        src="/images/logos/schools/demo-high-school/logo.png"
                        alt="School Logo"
                        fill
                        className="rounded-lg object-contain border-2 border-white/30"
                      />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold mb-1">
                        Welcome, <span className="text-yellow-300">{profile.full_name}</span>!
                      </h1>
                      <p className="text-blue-100">
                        {schoolInfo?.name ? `${schoolInfo.name} Teacher Dashboard` : 'Your Teaching Dashboard'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                    onClick={() => router.push('/dashboard/classes')}
                  >
                    <GraduationCap className="mr-2 h-4 w-4" />
                    My Classes
                  </Button>
                  <Button 
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    onClick={() => router.push('/dashboard/attendance')}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Mark Attendance
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* School Information Banner */}
        {schoolInfo && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20">
                    <Image
                      src="/images/logos/schools/demo-high-school/logo.png"
                      alt={schoolInfo.name}
                      fill
                      className="rounded-lg object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{schoolInfo.name}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{schoolInfo.address || 'Address not provided'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{schoolInfo.address || 'Address not provided'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{schoolInfo.phone || 'Phone not provided'}</span>
                      </div>
                    </div>
                    <div className="mt-1">
                      <Badge variant="outline">{schoolInfo.school_type} School</Badge>
                      <Badge variant="outline" className="ml-2">Code: {schoolInfo.school_code}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm">
                    <Globe className="mr-2 h-4 w-4" />
                    School Website
                  </Button>
                  <Button variant="outline" size="sm">
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Admin
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer border-l-4 border-l-blue-500"
                onClick={() => router.push('/dashboard/classes')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Classes</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.classes}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-600">+2 this term</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer border-l-4 border-l-purple-500"
                onClick={() => router.push('/dashboard/students')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.students}</h3>
                  <p className="text-xs text-gray-500 mt-1">Across all classes</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer border-l-4 border-l-orange-500"
                onClick={() => router.push('/dashboard/attendance')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Attendance</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.attendanceRate}%</h3>
                  <div className="mt-2">
                    <Progress value={stats.attendanceRate} className="h-2" />
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer border-l-4 border-l-green-500"
                onClick={() => router.push('/dashboard/grading')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Student Grade</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.avgGrade}%</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-600">+5% this month</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Robokorda Branding Section */}
        <Card className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-48">
                  <Image
                    src="/images/logos/robokorda/logo-white.png"
                    alt="Robokorda Africa"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Powered by Robokorda Africa</h3>
                  <p className="text-gray-300 mt-1">
                    Empowering African Education with cutting-edge technology solutions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  className="text-white border-white/30 hover:bg-white/10"
                  onClick={() => window.open('https://www.robokorda.com/', '_blank')}
                >
                  <Star className="mr-2 h-4 w-4" />
                  Visit Website
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  onClick={() => window.open('https://www.robokorda.com/product-details/', '_blank')}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Contact Support
                </Button>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                    <Shield className="h-4 w-4 text-blue-300" />
                  </div>
                  <p className="text-gray-300">Secure & Reliable</p>
                </div>
                <div className="text-center">
                  <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="h-4 w-4 text-green-300" />
                  </div>
                  <p className="text-gray-300">Performance Focused</p>
                </div>
                <div className="text-center">
                  <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                    <Globe className="h-4 w-4 text-purple-300" />
                  </div>
                  <p className="text-gray-300">Made for Africa</p>
                </div>
                <div className="text-center">
                  <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-2">
                    <Clock className="h-4 w-4 text-orange-300" />
                  </div>
                  <p className="text-gray-300">24/7 Support</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}