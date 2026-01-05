'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  School, 
  Users, 
  GraduationCap, 
  Building2,
  Settings,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Layers,
  FileText
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

interface SchoolInfo {
  id: string
  name: string
  school_code: string
  school_type: 'Primary' | 'Secondary'
  status: string
  logo_url: string | null
  address: string | null
  phone: string | null
  contact_email: string | null
  principal_name: string | null
  principal_email: string | null
  school_motto: string | null
  established_year: number | null
  current_term: string | null
  academic_year: string | null
}

interface DashboardStats {
  total_students: number
  male_students: number
  female_students: number
  total_teachers: number
  total_classes: number
  total_subjects: number
  total_parents: number
  total_enrollment_officers: number
}

interface MarkingPeriod {
  id: string
  term: string
  academic_year: string
  end_date: string
  is_active: boolean
}

export default function SchoolAdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activeMarkingPeriod, setActiveMarkingPeriod] = useState<MarkingPeriod | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'school_admin') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'school_admin' && profile.school_id) {
      loadDashboardData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const loadDashboardData = async () => {
    if (!profile?.school_id) return

    try {
      setLoading(true)

      // Load school info
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', profile.school_id)
        .single()

      if (schoolError) throw schoolError
      setSchoolInfo(schoolData)

      // Load students count
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, gender')
        .eq('school_id', profile.school_id)

      // Load teachers count
      const { count: teacherCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', profile.school_id)
        .eq('role', 'teacher')

      // Load classes count
      const { count: classCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', profile.school_id)

      // Load subjects count
      const { count: subjectCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', profile.school_id)

      // Load parents count
      const { count: parentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', profile.school_id)
        .eq('role', 'parent')

      // Load enrollment officers count
      const { count: enrollmentOfficerCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', profile.school_id)
        .eq('role', 'enrollment_officer')

      const totalStudents = studentsData?.length || 0
      const maleStudents = studentsData?.filter(s => s.gender === 'Male').length || 0
      const femaleStudents = studentsData?.filter(s => s.gender === 'Female').length || 0

      setStats({
        total_students: totalStudents,
        male_students: maleStudents,
        female_students: femaleStudents,
        total_teachers: teacherCount || 0,
        total_classes: classCount || 0,
        total_subjects: subjectCount || 0,
        total_parents: parentCount || 0,
        total_enrollment_officers: enrollmentOfficerCount || 0
      })

      // Load active marking period
      const { data: periodData } = await supabase
        .from('exam_marking_periods')
        .select('id, term, academic_year, end_date, is_active')
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (periodData) {
        // Check if period hasn't expired
        const endDate = new Date(periodData.end_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (endDate >= today) {
          setActiveMarkingPeriod(periodData)
        } else {
          setActiveMarkingPeriod(null)
        }
      }

    } catch (error) {
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

  const getCurrentTerm = () => {
    const month = new Date().getMonth() + 1
    if (month >= 1 && month <= 4) return 'Term 1'
    if (month >= 5 && month <= 8) return 'Term 2'
    return 'Term 3'
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="School Admin Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'school_admin') {
    return null
  }

  return (
    <DashboardLayout title="School Dashboard">
      <div className="space-y-6">
        {/* School Header Banner */}
        <Card className="bg-gradient-to-r from-green-600 via-green-700 to-teal-700 text-white overflow-hidden">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* School Logo */}
                <div className="h-16 w-16 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
                  {schoolInfo?.logo_url ? (
                    <Image
                      src={schoolInfo.logo_url}
                      alt={schoolInfo.name}
                      width={64}
                      height={64}
                      className="object-contain"
                    />
                  ) : (
                    <School className="h-8 w-8 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold mb-1">
                    {schoolInfo?.name || 'My School'}
                  </h1>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      {schoolInfo?.school_code}
                    </Badge>
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      {schoolInfo?.school_type} School
                    </Badge>
                    <Badge variant="secondary" className="bg-green-400/30 text-white border-0">
                      {getCurrentTerm()} • {new Date().getFullYear()}
                    </Badge>
                  </div>
                  {schoolInfo?.school_motto && (
                    <p className="text-green-100 mt-2 text-sm italic">&ldquo;{schoolInfo.school_motto}&rdquo;</p>
                  )}
                </div>
              </div>
              <div className="hidden lg:block text-right">
                <p className="text-green-100 text-sm">{getGreeting()},</p>
                <p className="text-xl font-semibold">{profile.full_name}</p>
                <p className="text-green-200 text-sm">School Administrator</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Marking Period Banner */}
        {activeMarkingPeriod && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">
                      {activeMarkingPeriod.term} {activeMarkingPeriod.academic_year} - Marking Period Open
                    </p>
                    <p className="text-sm text-blue-700">
                      Teachers can enter marks until {new Date(activeMarkingPeriod.end_date).toLocaleDateString('en-GB', { 
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/exam-periods">
                  <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                    Manage Periods
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Simplified */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link href="/dashboard/staff">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-green-500 bg-gradient-to-br from-green-50 to-green-100 h-full">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-green-600 flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-900">Staff Management</p>
                    <p className="text-xs text-green-700">Teachers & officers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/forms-classes">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 h-full">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center">
                    <Layers className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-purple-900">Classes & Forms</p>
                    <p className="text-xs text-purple-700">Manage structure</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/students/enrolled">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 h-full">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">View Students</p>
                    <p className="text-xs text-blue-700">All enrolled</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/enrollment-settings">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 h-full">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-orange-600 flex items-center justify-center">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-900">Enrollment Settings</p>
                    <p className="text-xs text-orange-700">Rules & documents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/school-admin/settings">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100 h-full">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-cyan-600 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-cyan-900">School Settings</p>
                    <p className="text-xs text-cyan-700">Details & info</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/school-admin/documents">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 h-full">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-indigo-900">Lesson Plans</p>
                    <p className="text-xs text-indigo-700">View all documents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <Badge variant="secondary" className="text-xs">Total</Badge>
              </div>
              <div className="text-2xl font-bold text-blue-700">{stats?.total_students ?? 0}</div>
              <p className="text-xs text-gray-600">Students Enrolled</p>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-blue-600">♂ {stats?.male_students || 0}</span>
                <span className="text-pink-600">♀ {stats?.female_students || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-green-600" />
                <Badge variant="secondary" className="text-xs">Staff</Badge>
              </div>
              <div className="text-2xl font-bold text-green-700">{stats?.total_teachers ?? 0}</div>
              <p className="text-xs text-gray-600">Teachers</p>
              <p className="text-xs text-gray-400 mt-2">{stats?.total_enrollment_officers || 0} enrollment officers</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Layers className="h-5 w-5 text-purple-600" />
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <div className="text-2xl font-bold text-purple-700">{stats?.total_classes ?? 0}</div>
              <p className="text-xs text-gray-600">Class Sections</p>
              <p className="text-xs text-gray-400 mt-2">{stats?.total_subjects || 0} subjects offered</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <User className="h-5 w-5 text-orange-600" />
                <Badge variant="secondary" className="text-xs">Linked</Badge>
              </div>
              <div className="text-2xl font-bold text-orange-700">{stats?.total_parents ?? 0}</div>
              <p className="text-xs text-gray-600">Parents/Guardians</p>
              <p className="text-xs text-gray-400 mt-2">Registered guardians</p>
            </CardContent>
          </Card>
        </div>

        {/* School Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" />
              School Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-700">Address</p>
                  <p className="text-sm text-gray-600">{schoolInfo?.address || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-700">Phone</p>
                  <p className="text-sm text-gray-600">{schoolInfo?.phone || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-600">{schoolInfo?.contact_email || 'Not set'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-700">Principal</p>
                  <p className="text-sm text-gray-600">{schoolInfo?.principal_name || 'Not assigned'}</p>
                  {schoolInfo?.principal_email && (
                    <p className="text-xs text-gray-500">{schoolInfo.principal_email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-700">Academic Year</p>
                  <p className="text-sm text-gray-600">{schoolInfo?.academic_year || new Date().getFullYear()}</p>
                </div>
              </div>
              <Link href="/dashboard/school-admin/settings">
                <Button variant="outline" size="sm" className="w-full">
                  <Settings className="h-3 w-3 mr-2" />
                  Edit School Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
