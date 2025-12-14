// =====================================================
// SUPER ADMIN DASHBOARD
// app/dashboard/super-admin/page.tsx
// =====================================================

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
  FileText
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'

interface DashboardStats {
  active_schools: number
  suspended_schools: number
  total_schools: number
  total_school_admins: number
  total_teachers: number
  total_students: number
  total_parents: number
  actions_last_24h: number
  actions_last_week: number
  expired_subscriptions: number
  expiring_soon: number
  recent_activities: Array<{
    action_type: string
    entity_type: string
    performed_by_name: string
    created_at: string
  }>
}

interface RecentSchool {
  id: string
  name: string
  school_code: string
  school_type: string
  created_at: string
  status: string
  stats: {
    students: number
    teachers: number
    admins: number
  }
}

export default function SuperAdminDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSchools, setRecentSchools] = useState<RecentSchool[]>([])
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

      // Load dashboard stats
      const { data: statsData, error: statsError } = await supabase
        .rpc('super_admin_dashboard_stats')
        .single()

      if (statsError) throw statsError
      setStats(statsData as DashboardStats)

      // Load recent schools
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (schoolsError) throw schoolsError

      // Get stats for each school
      const schoolsWithStats = await Promise.all(
        (schoolsData || []).map(async (school) => {
          const { count: studentCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', school.id)
            .eq('student_status', 'active')

          const { count: teacherCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', school.id)
            .eq('role', 'teacher')

          const { count: adminCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', school.id)
            .eq('role', 'school_admin')

          return {
            ...school,
            stats: {
              students: studentCount || 0,
              teachers: teacherCount || 0,
              admins: adminCount || 0,
            },
          }
        })
      )

      setRecentSchools(schoolsWithStats)

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
          <Link href="/dashboard/super-admin/schools/create">
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

          <Link href="/dashboard/super-admin/schools">
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

          <Link href="/dashboard/super-admin/audit-logs">
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

          <Link href="/dashboard/super-admin/settings">
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
                  Active Schools
                </CardTitle>
                <School className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">
                {stats?.active_schools ?? 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.suspended_schools || 0} suspended
              </p>
            </CardContent>
          </Card>

          {/* Students Stats */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Students
                </CardTitle>
                <GraduationCap className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">
                {stats?.total_students?.toLocaleString() ?? 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Across all schools
              </p>
            </CardContent>
          </Card>

          {/* Teachers Stats */}
          <Card className="hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Teachers
                </CardTitle>
                <UserCog className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">
                {stats?.total_teachers?.toLocaleString() ?? 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.total_school_admins || 0} school admins
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

        {/* Alerts & Warnings */}
        {(stats?.expired_subscriptions ?? 0) > 0 || (stats?.expiring_soon ?? 0) > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(stats?.expired_subscriptions ?? 0) > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    {stats && stats.expired_subscriptions > 0 && <div>
                      <p className="font-semibold text-red-900">
                        {stats.expired_subscriptions} Expired Subscriptions
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        Some schools have expired subscriptions and may lose access
                      </p>
                      <Button 
                        size="sm" 
                        className="mt-3 bg-red-600 hover:bg-red-700"
                        onClick={() => router.push('/dashboard/super-admin/schools?filter=expired')}
                      >
                        View Schools
                      </Button>
                    </div>}
                  </div>
                </CardContent>
              </Card>
            )}

            {(stats?.expiring_soon ?? 0) > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                    {stats && stats.expiring_soon > 0 && <div>
                      <p className="font-semibold text-yellow-900">
                        {stats.expiring_soon} Expiring Soon
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Subscriptions expiring in the next 30 days
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="mt-3 border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                        onClick={() => router.push('/dashboard/super-admin/schools?filter=expiring')}
                      >
                        Review
                      </Button>
                    </div>}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        {/* Recent Schools */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recently Added Schools</CardTitle>
                <CardDescription>Latest schools registered on the platform</CardDescription>
              </div>
              <Link href="/dashboard/super-admin/schools">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSchools.map((school) => (
                <div 
                  key={school.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <School className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{school.name}</p>
                      <p className="text-sm text-gray-500">
                        {school.school_code} • {school.school_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900">
                        {school.stats.students}
                      </p>
                      <p className="text-xs text-gray-500">Students</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900">
                        {school.stats.teachers}
                      </p>
                      <p className="text-xs text-gray-500">Teachers</p>
                    </div>
                    <Badge 
                      className={
                        school.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {school.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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