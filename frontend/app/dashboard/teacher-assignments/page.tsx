'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'

interface Class {
  id: string
  grade_level: string
  section: string
  academic_year: string
  class_teacher_id: string | null
  school_id: string
  school_name: string
  teacher_name: string | null
}

interface Teacher {
  id: string
  full_name: string
  username: string
  email: string
  school_id: string
}

export default function TeacherAssignmentsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningClass, setAssigningClass] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [profile])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch classes with teacher info
      let classQuery = supabase
        .from('classes')
        .select(`
          id,
          grade_level,
          section,
          academic_year,
          class_teacher_id,
          school_id,
          schools!inner(name),
          profiles(full_name)
        `)
        .order('grade_level')
        .order('section')

      // Filter by school for non-super admins
      if (profile?.role !== 'super_admin' && profile?.school_id) {
        classQuery = classQuery.eq('school_id', profile.school_id)
      }

      const { data: classData, error: classError } = await classQuery

      if (classError) throw classError

      // Transform the data
      const transformedClasses = classData?.map((c: any) => ({
        id: c.id,
        grade_level: c.grade_level,
        section: c.section,
        academic_year: c.academic_year,
        class_teacher_id: c.class_teacher_id,
        school_id: c.school_id,
        school_name: c.schools?.name || 'Unknown',
        teacher_name: c.profiles?.full_name || null,
      })) || []

      setClasses(transformedClasses)

      // Fetch available teachers
      let teacherQuery = supabase
        .from('profiles')
        .select('id, full_name, username, email, school_id')
        .eq('role', 'teacher')
        .order('full_name')

      // Filter teachers by school for non-super admins
      if (profile?.role !== 'super_admin' && profile?.school_id) {
        teacherQuery = teacherQuery.eq('school_id', profile.school_id)
      }

      const { data: teacherData, error: teacherError } = await teacherQuery

      if (teacherError) throw teacherError

      setTeachers(teacherData || [])
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const assignTeacher = async (classId: string, teacherId: string) => {
    try {
      setAssigningClass(classId)

      const { error } = await supabase
        .from('classes')
        .update({ class_teacher_id: teacherId })
        .eq('id', classId)

      if (error) throw error

      toast.success('Teacher assigned successfully!')
      fetchData()
    } catch (error: any) {
      console.error('Error assigning teacher:', error)
      toast.error('Failed to assign teacher: ' + error.message)
    } finally {
      setAssigningClass(null)
    }
  }

  const removeTeacher = async (classId: string) => {
    try {
      setAssigningClass(classId)

      const { error } = await supabase
        .from('classes')
        .update({ class_teacher_id: null })
        .eq('id', classId)

      if (error) throw error

      toast.success('Teacher removed successfully!')
      fetchData()
    } catch (error: any) {
      console.error('Error removing teacher:', error)
      toast.error('Failed to remove teacher: ' + error.message)
    } finally {
      setAssigningClass(null)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Teacher Assignments">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) {
    return null
  }

  const canManageAssignments = ['super_admin', 'school_admin'].includes(profile?.role || '')

  if (!canManageAssignments) {
    return (
      <DashboardLayout title="Teacher Assignments">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              You don't have permission to manage teacher assignments.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Teacher Assignments">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Teacher-Class Assignments</CardTitle>
            <CardDescription>
              Assign class teachers to each class. Each class can have one class teacher.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{classes.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Assigned</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {classes.filter(c => c.class_teacher_id).length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {classes.filter(c => !c.class_teacher_id).length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Classes Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      {profile.role === 'super_admin' && <TableHead>School</TableHead>}
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Current Teacher</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500">
                          No classes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      classes.map((classItem) => (
                        <TableRow key={classItem.id}>
                          <TableCell className="font-medium">
                            {classItem.grade_level} {classItem.section}
                          </TableCell>
                          {profile.role === 'super_admin' && (
                            <TableCell>{classItem.school_name}</TableCell>
                          )}
                          <TableCell>{classItem.academic_year}</TableCell>
                          <TableCell>
                            {classItem.teacher_name ? (
                              <Badge variant="secondary">{classItem.teacher_name}</Badge>
                            ) : (
                              <Badge variant="outline">Not Assigned</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Select
                                disabled={assigningClass === classItem.id}
                                onValueChange={(value) => {
                                  if (value === 'remove') {
                                    removeTeacher(classItem.id)
                                  } else {
                                    assignTeacher(classItem.id, value)
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Select teacher..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {classItem.teacher_name && (
                                    <SelectItem value="remove" className="text-red-600">
                                      <div className="flex items-center gap-2">
                                        <X className="h-4 w-4" />
                                        Remove Teacher
                                      </div>
                                    </SelectItem>
                                  )}
                                  {teachers
                                    .filter(t => t.school_id === classItem.school_id)
                                    .map((teacher) => (
                                      <SelectItem key={teacher.id} value={teacher.id}>
                                        {teacher.full_name} ({teacher.username})
                                      </SelectItem>
                                    ))}
                                  {teachers.filter(t => t.school_id === classItem.school_id).length === 0 && (
                                    <SelectItem value="none" disabled>
                                      No teachers available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              {assigningClass === classItem.id && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Help Text */}
              {teachers.length === 0 && (
                <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    No teachers found. Please create teacher accounts first before assigning them to classes.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
