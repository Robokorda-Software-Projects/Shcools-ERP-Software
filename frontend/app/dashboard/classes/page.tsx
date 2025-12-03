'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, Loader2, Users } from 'lucide-react'

interface ClassWithSchool {
  id: string
  grade_level: string
  section: string
  academic_year: string
  school_id: string
  schools: { name: string; school_code: string } | null
  student_count?: number
}

export default function ClassesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassWithSchool[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [section, setSection] = useState('')
  const [academicYear, setAcademicYear] = useState('2024-2025')
  const [submitting, setSubmitting] = useState(false)

  const gradeLevels = [
    'ECD A', 'ECD B', 'ECD C',
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7',
    'Form 1', 'Form 2', 'Form 3', 'Form 4',
    'Lower 6', 'Upper 6'
  ]

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

      let classQuery = supabase
        .from('classes')
        .select('id, grade_level, section, academic_year, school_id, schools(name, school_code)')
        .order('grade_level')

      if (profile?.role !== 'super_admin' && profile?.school_id) {
        classQuery = classQuery.eq('school_id', profile.school_id)
      }

      const { data: classData, error: classError } = await classQuery
      if (classError) throw classError

      // Get student count for each class
      const classesWithCounts = await Promise.all(
        (classData || []).map(async (cls: any) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)

          return {
            id: cls.id,
            grade_level: cls.grade_level,
            section: cls.section,
            academic_year: cls.academic_year,
            school_id: cls.school_id,
            schools: Array.isArray(cls.schools) && cls.schools.length > 0 ? cls.schools[0] : null,
            student_count: count || 0
          } as ClassWithSchool
        })
      )

      setClasses(classesWithCounts)

      if (profile?.role === 'super_admin') {
        const { data: schoolData } = await supabase.from('schools').select('*').order('name')
        setSchools(schoolData || [])
      } else if (profile?.school_id) {
        setSelectedSchoolId(profile.school_id)
      }
    } catch (error: any) {
      console.error('Error:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)

      const schoolId = profile?.role === 'super_admin' ? selectedSchoolId : profile?.school_id

      if (!schoolId) {
        toast.error('School not selected')
        return
      }

      const { error } = await supabase.from('classes').insert({
        school_id: schoolId,
        grade_level: gradeLevel,
        section: section,
        academic_year: academicYear,
      })

      if (error) throw error

      toast.success('Class created successfully!')
      setDialogOpen(false)
      setGradeLevel('')
      setSection('')
      fetchData()
    } catch (error: any) {
      console.error('Error:', error)
      toast.error('Failed to create class')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Classes">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) return null

  const canManage = ['super_admin', 'school_admin'].includes(profile?.role || '')
  const totalStudents = classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0)

  return (
    <DashboardLayout title="Classes">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Classes</CardTitle>
                <CardDescription>Manage class sections and academic years</CardDescription>
              </div>
              {canManage && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Class
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Class</DialogTitle>
                      <DialogDescription>Add a new class section</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={createClass} className="space-y-4">
                      {profile?.role === 'super_admin' && (
                        <div className="space-y-2">
                          <Label>School *</Label>
                          <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select school" />
                            </SelectTrigger>
                            <SelectContent>
                              {schools.map((school) => (
                                <SelectItem key={school.id} value={school.id}>
                                  {school.name} ({school.school_code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Grade Level *</Label>
                        <Select value={gradeLevel} onValueChange={setGradeLevel} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {gradeLevels.map((level) => (
                              <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Section *</Label>
                        <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g., A, B, C" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Academic Year *</Label>
                        <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g., 2024-2025" required />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create Class
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
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
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStudents}</div>
                </CardContent>
              </Card>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Students</TableHead>
                  {profile?.role === 'super_admin' && <TableHead>School</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">No classes found</TableCell>
                  </TableRow>
                ) : (
                  classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.grade_level}</TableCell>
                      <TableCell>{cls.section}</TableCell>
                      <TableCell>{cls.academic_year}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{cls.student_count}</span>
                        </div>
                      </TableCell>
                      {profile?.role === 'super_admin' && (
                        <TableCell>
                          <Badge variant="secondary">{cls.schools?.name || 'Unknown'}</Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
