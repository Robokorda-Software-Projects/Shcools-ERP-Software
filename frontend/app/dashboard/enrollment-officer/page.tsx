'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  School, 
  Users, 
  GraduationCap, 
  CheckCircle2,
  UserPlus,
  Upload,
  ArrowUpRight
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
  school_motto: string | null
  academic_year: string | null
}

interface EnrollmentStats {
  total_students: number
  male_students: number
  female_students: number
  students_with_parents: number
  students_without_parents: number
}

interface ClassCapacity {
  id: string
  name: string
  form: string
  current_count: number
  max_capacity: number
}

export default function EnrollmentOfficerDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [stats, setStats] = useState<EnrollmentStats | null>(null)
  const [classCapacities, setClassCapacities] = useState<ClassCapacity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'enrollment_officer') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'enrollment_officer' && profile.school_id) {
      loadDashboardData()
    }
  }, [profile])

  const loadDashboardData = async () => {
    if (!profile?.school_id) return

    try {
      setLoading(true)

      // Load school info
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name, school_code, school_type, status, logo_url, school_motto, academic_year')
        .eq('id', profile.school_id)
        .single()

      if (schoolError) throw schoolError
      setSchoolInfo(schoolData)

      // Load enrollment stats
      const { data: allStudents } = await supabase
        .from('students')
        .select('gender, parent_id')
        .eq('school_id', profile.school_id)
        .eq('student_status', 'active')

      const enrollmentStats: EnrollmentStats = {
        total_students: allStudents?.length || 0,
        male_students: allStudents?.filter(s => s.gender === 'Male').length || 0,
        female_students: allStudents?.filter(s => s.gender === 'Female').length || 0,
        students_with_parents: allStudents?.filter(s => s.parent_id !== null).length || 0,
        students_without_parents: allStudents?.filter(s => s.parent_id === null).length || 0
      }
      setStats(enrollmentStats)

      // Load classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, grade_level, section, max_capacity, academic_year')
        .eq('school_id', profile.school_id)
        .order('grade_level')

      if (classesError) {
        console.error('Error loading classes:', classesError)
      }

      // Set class capacities with real student counts
      if (classesData && classesData.length > 0) {
        const capacitiesPromises = classesData.map(async (cls) => {
          // Count students in this class
          const { count, error: countError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('school_id', profile.school_id)

          if (countError) {
            console.error(`Error counting students for class ${cls.grade_level}-${cls.section}:`, countError)
          }

          return {
            id: cls.id,
            name: `${cls.grade_level} - ${cls.section}`,
            form: cls.grade_level,
            current_count: count || 0,
            max_capacity: cls.max_capacity || 40
          }
        })

        const capacities = await Promise.all(capacitiesPromises)
        setClassCapacities(capacities)
      } else {
        setClassCapacities([])
      }

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
      <DashboardLayout title="Enrollment Officer Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'enrollment_officer') {
    return null
  }

  return (
    <DashboardLayout title="Enrollment Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-700 text-white overflow-hidden">
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
                  <p className="text-teal-100 text-sm">{getGreeting()},</p>
                  <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                  <p className="text-teal-100 text-sm mt-1">{schoolInfo?.name}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary Quick Actions - Simplified */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/students/enroll-new">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-teal-500 bg-gradient-to-br from-teal-50 to-teal-100 h-full">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-teal-600 flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-teal-900">Enroll New Student</p>
                    <p className="text-xs text-teal-700">Individual enrollment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/students/bulk-enroll">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 h-full">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-purple-900">Bulk Upload</p>
                    <p className="text-xs text-purple-700">Upload CSV file</p>
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
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">View All Students</p>
                    <p className="text-xs text-blue-700">Search & filter</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Enrollment Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-700">{stats.total_students}</div>
                <p className="text-xs text-gray-600">Total Enrolled</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-700">{stats.students_with_parents}</div>
                <p className="text-xs text-gray-600">With Parent Link</p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <UserPlus className="h-5 w-5 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-700">{stats.students_without_parents}</div>
                <p className="text-xs text-gray-600">No Parent Link</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-sm text-gray-600 mb-1">Gender Split</div>
                <div className="flex gap-3">
                  <div>
                    <div className="text-xl font-bold text-blue-700">{stats.male_students}</div>
                    <p className="text-xs text-gray-500">Male</p>
                  </div>
                  <div className="h-10 w-px bg-gray-200"></div>
                  <div>
                    <div className="text-xl font-bold text-pink-700">{stats.female_students}</div>
                    <p className="text-xs text-gray-500">Female</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Class Capacity */}
        <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Class Capacity Status</CardTitle>
                <Link href="/dashboard/students/enrolled">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View All <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
              <CardDescription className="text-xs">Available spots for enrollment</CardDescription>
            </CardHeader>
            <CardContent>
              {classCapacities.length > 0 ? (
                <div className="space-y-3">
                  {classCapacities.map((cls) => {
                    const percentage = (cls.current_count / cls.max_capacity) * 100
                    const isFull = percentage >= 100
                    const isNearFull = percentage >= 80
                    
                    return (
                      <div key={cls.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{cls.name}</span>
                          <span className={`text-xs ${isFull ? 'text-red-600' : isNearFull ? 'text-orange-600' : 'text-green-600'}`}>
                            {cls.current_count}/{cls.max_capacity}
                            {isFull && ' (Full)'}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(percentage, 100)} 
                          className={`h-2 ${isFull ? '[&>div]:bg-red-500' : isNearFull ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <GraduationCap className="h-10 w-10 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">No classes set up yet</p>
                  <p className="text-xs text-gray-400">Contact school admin to create classes</p>
                </div>
              )}
            </CardContent>
          </Card>

        {/* Enrollment Tips / Guidelines Card */}
        <Card className="bg-teal-50 border-teal-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-teal-800">Enrollment Checklist</p>
                <ul className="text-xs text-teal-700 mt-1 space-y-1">
                  <li>• Verify parent/guardian ID and contact details</li>
                  <li>• Collect birth certificate (original + copy)</li>
                  <li>• Verify fee payment via QR code or receipt</li>
                  <li>• Assign student to appropriate class/form</li>
                  <li>• Generate student credentials and parent login</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
