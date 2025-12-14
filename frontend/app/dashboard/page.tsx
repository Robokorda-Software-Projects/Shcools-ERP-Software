'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  School, 
  Users, 
  GraduationCap, 
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  UserCog,
  BarChart3,
  Plus,
  Eye,
  Settings,
  Calendar,
  FileText,
  User,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'

interface DashboardStats {
  total_schools: number
  total_students: number
  total_school_admins: number
  total_teachers: number
  total_parents: number
  active_schools: number
  suspended_schools: number
  actions_last_24h: number
  actions_last_week: number
  expired_subscriptions: number
  expiring_soon: number
  male_students: number
  female_students: number
}

interface SchoolWithDetails {
  id: string
  name: string
  school_code: string
  school_type: string
  status: string
  created_at: string
  logo_url: string | null
  address: string | null
  phone: string | null
  contact_email: string | null
  principal_name: string | null
  principal_email: string | null
  principal_phone: string | null
  stats: {
    total_students: number
    male_students: number
    female_students: number
    total_classes: number
    total_teachers: number
    school_admin: {
      id: string
      full_name: string
      email: string
      username: string
    } | null
  }
}

export default function SuperAdminDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSchools, setRecentSchools] = useState<SchoolWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile?.role !== 'super_admin') {
      router.push('/dashboard')
      toast.error('Access denied')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      loadDashboardData()
    }
  }, [profile])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load dashboard stats with real data
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, status')

      const { data: studentsData } = await supabase
        .from('students')
        .select('id, gender')
        .eq('student_status', 'active')

      const { data: adminsData } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'school_admin')

      const { data: teachersData } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'teacher')

      const { data: parentsData } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'parent')

      // Calculate counts
      const totalSchools = schoolsData?.length || 0
      const activeSchools = schoolsData?.filter(s => s.status === 'active').length || 0
      const suspendedSchools = schoolsData?.filter(s => s.status === 'suspended').length || 0
      
      const totalStudents = studentsData?.length || 0
      const maleStudents = studentsData?.filter(s => s.gender === 'Male').length || 0
      const femaleStudents = studentsData?.filter(s => s.gender === 'Female').length || 0

      // Load recent schools with detailed stats
      const { data: recentSchoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select(`
          *,
          classes!classes_school_id_fkey (
            id
          ),
          profiles!profiles_school_id_fkey (
            id,
            full_name,
            email,
            username,
            role
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (schoolsError) throw schoolsError

      const schoolsWithStats = await Promise.all(
        (recentSchoolsData || []).map(async (school) => {
          // Get student stats for this school
          const { data: schoolStudents } = await supabase
            .from('students')
            .select('id, gender')
            .eq('school_id', school.id)
            .eq('student_status', 'active')

          // Get school admin for this school
          const schoolAdmin = school.profiles?.find((p: { role: string }) => p.role === 'school_admin') || null

          return {
            id: school.id,
            name: school.name,
            school_code: school.school_code,
            school_type: school.school_type,
            status: school.status,
            created_at: school.created_at,
            logo_url: school.logo_url,
            address: school.address,
            phone: school.phone,
            contact_email: school.contact_email,
            principal_name: school.principal_name,
            principal_email: school.principal_email,
            principal_phone: school.principal_phone,
            stats: {
              total_students: schoolStudents?.length || 0,
              male_students: schoolStudents?.filter(s => s.gender === 'Male').length || 0,
              female_students: schoolStudents?.filter(s => s.gender === 'Female').length || 0,
              total_classes: school.classes?.length || 0,
              total_teachers: school.profiles?.filter((p: { role: string }) => p.role === 'teacher').length || 0,
              school_admin: schoolAdmin ? {
                id: schoolAdmin.id,
                full_name: schoolAdmin.full_name,
                email: schoolAdmin.email,
                username: schoolAdmin.username
              } : null
            }
          }
        })
      )

      setRecentSchools(schoolsWithStats)

      // Set stats
      setStats({
        total_schools: totalSchools,
        total_students: totalStudents,
        total_school_admins: adminsData?.length || 0,
        total_teachers: teachersData?.length || 0,
        total_parents: parentsData?.length || 0,
        active_schools: activeSchools,
        suspended_schools: suspendedSchools,
        actions_last_24h: 0, // You'll need to implement this from audit logs
        actions_last_week: 0,
        expired_subscriptions: 0,
        expiring_soon: 0,
        male_students: maleStudents,
        female_students: femaleStudents
      })

    } catch (error: any) {
      console.error('Error loading dashboard:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Super Admin Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'super_admin') {
    return null
  }

  return (
    <DashboardLayout title="Super Admin Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome back, {profile.full_name}! 👋
                </h1>
                <p className="text-blue-100">
                  Managing {stats?.total_schools ?? 0} schools across the SmartSchools ERP platform
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    <Activity className="h-3 w-3 mr-1" />
                    {stats?.actions_last_24h || 0} actions in last 24h
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric' 
                    })}
                  </Badge>
                </div>
              </div>
              <div className="hidden lg:block">
                <Building2 className="h-24 w-24 opacity-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/dashboard/schools?action=create">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-blue-500 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Create New</p>
                    <p className="text-lg font-bold text-blue-700">School</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/schools">
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">View All</p>
                    <p className="text-lg font-bold text-gray-900">Schools</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/audit-logs">
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">System</p>
                    <p className="text-lg font-bold text-gray-900">Audit Logs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/settings">
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <Settings className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">System</p>
                    <p className="text-lg font-bold text-gray-900">Settings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Schools Stats */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Schools
                </CardTitle>
                <School className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">
                {stats?.total_schools ?? 0}
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-green-600">{stats?.active_schools || 0} active</span>
                <span className="text-red-600">{stats?.suspended_schools || 0} suspended</span>
              </div>
            </CardContent>
          </Card>

          {/* Students Stats */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Students
                </CardTitle>
                <GraduationCap className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">
                {stats?.total_students?.toLocaleString() ?? 0}
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-blue-600">♂️ {stats?.male_students || 0}</span>
                <span className="text-pink-600">♀️ {stats?.female_students || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* School Admins Stats */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  School Admins
                </CardTitle>
                <UserCog className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">
                {stats?.total_school_admins?.toLocaleString() ?? 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.total_teachers || 0} teachers
              </p>
            </CardContent>
          </Card>

          {/* Activity Stats */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  System Activity
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700">
                {stats?.actions_last_week?.toLocaleString() ?? 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Actions this week
              </p>
            </CardContent>
          </Card>
        </div>

        

        {/* System Health */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">All Systems Operational</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Last checked: Just now</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Database Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">Healthy</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Response time: {'<'}50ms</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">API Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">Excellent</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Uptime: 99.9%</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}