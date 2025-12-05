'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, School, GraduationCap, ChevronDown, ChevronUp, Trash2, BookOpen, UserCircle } from 'lucide-react'

export default function TeacherAssignmentsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schools, setSchools] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null)
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null)
  
  const [filterSchoolType, setFilterSchoolType] = useState<string>('all')
  const [filterSchool, setFilterSchool] = useState<string>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSchoolForDialog, setSelectedSchoolForDialog] = useState('')
  const [assignmentLevel, setAssignmentLevel] = useState('school')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile) {
      loadData()
    }
  }, [profile])

  const loadData = async () => {
    setLoading(true)

    let schoolsQuery = supabase.from('schools').select('*').order('school_type').order('name')
    if (profile?.role === 'school_admin' && profile?.school_id) {
      schoolsQuery = schoolsQuery.eq('id', profile.school_id)
    }
    const { data: schoolsData } = await schoolsQuery
    setSchools(schoolsData || [])

    let teachersQuery = supabase.from('profiles').select('id, username, full_name, school_id, schools(name, school_type)').eq('role', 'teacher').order('full_name')
    if (profile?.role === 'school_admin' && profile?.school_id) {
      teachersQuery = teachersQuery.eq('school_id', profile.school_id)
    }
    const { data: teachersData } = await teachersQuery

    const teachersWithAssignments = await Promise.all(
      (teachersData || []).map(async (teacher: any) => {
        const { data: subjectAssignments } = await supabase.from('teacher_subject_assignments').select('id, subject_id, assignment_level, subjects(name)').eq('teacher_id', teacher.id)
        const { data: classAssignments } = await supabase.from('class_subject_assignments').select('id, class_id, subject_id, classes(grade_level, section), subjects(name)').eq('teacher_id', teacher.id)

        return {
          ...teacher,
          school_name: teacher.schools?.name || 'Unknown',
          school_type: teacher.schools?.school_type || 'Unknown',
          subject_assignments: subjectAssignments || [],
          class_assignments: classAssignments || [],
          all_subjects: [...new Set([...(subjectAssignments || []).map((a: any) => a.subjects?.name), ...(classAssignments || []).map((a: any) => a.subjects?.name)].filter(Boolean))]
        }
      })
    )
    setTeachers(teachersWithAssignments)

    let subjectsQuery = supabase.from('subjects').select('*').order('name')
    if (profile?.role === 'school_admin' && profile?.school_id) {
      subjectsQuery = subjectsQuery.eq('school_id', profile.school_id)
    }
    const { data: subjectsData } = await subjectsQuery
    setSubjects(subjectsData || [])

    let classesQuery = supabase.from('classes').select('*').order('grade_level')
    if (profile?.role === 'school_admin' && profile?.school_id) {
      classesQuery = classesQuery.eq('school_id', profile.school_id)
    }
    const { data: classesData } = await classesQuery
    setClasses(classesData || [])

    setLoading(false)
  }

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const teacher = teachers.find(t => t.id === selectedTeacher)
      if (!teacher) throw new Error('Teacher not found')

      if (assignmentLevel === 'class') {
        const { error } = await supabase.from('class_subject_assignments').insert({
          teacher_id: selectedTeacher,
          subject_id: selectedSubject,
          class_id: selectedClass,
          created_by: profile?.id
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from('teacher_subject_assignments').insert({
          teacher_id: selectedTeacher,
          subject_id: selectedSubject,
          school_id: teacher.school_id,
          assignment_level: assignmentLevel,
          created_by: profile?.id
        })
        if (error) throw error
      }

      toast.success('Assignment created successfully!')
      setDialogOpen(false)
      setSelectedTeacher('')
      setSelectedSubject('')
      setSelectedClass('')
      setSelectedSchoolForDialog('')
      loadData()
    } catch (error: any) {
      toast.error('Failed to create assignment', { description: error.message })
    }
    setSubmitting(false)
  }

  const handleRemoveSubjectAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this assignment?')) return
    const { error } = await supabase.from('teacher_subject_assignments').delete().eq('id', assignmentId)
    if (error) {
      toast.error('Failed to remove assignment')
    } else {
      toast.success('Assignment removed!')
      loadData()
    }
  }

  const handleRemoveClassAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this assignment?')) return
    const { error } = await supabase.from('class_subject_assignments').delete().eq('id', assignmentId)
    if (error) {
      toast.error('Failed to remove assignment')
    } else {
      toast.success('Assignment removed!')
      loadData()
    }
  }

  const filteredTeachers = teachers.filter(teacher => {
    if (filterSchoolType !== 'all' && teacher.school_type !== filterSchoolType) return false
    if (filterSchool !== 'all' && teacher.school_id !== filterSchool) return false
    if (filterSubject !== 'all' && !teacher.all_subjects.includes(subjects.find(s => s.id === filterSubject)?.name)) return false
    if (searchQuery && !teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) && !teacher.username.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const filteredSchools = schools.filter(school => {
    if (filterSchoolType !== 'all' && school.school_type !== filterSchoolType) return false
    return filteredTeachers.some(t => t.school_id === school.id)
  })

  const groupedTeachers = filteredSchools.map(school => ({
    school,
    teachers: filteredTeachers.filter(t => t.school_id === school.id)
  })).filter(g => g.teachers.length > 0)

  if (authLoading || loading) {
    return <DashboardLayout title="Teacher Assignments"><div>Loading...</div></DashboardLayout>
  }

  return (
    <DashboardLayout title="Teacher Assignments">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Assign teachers to subjects and classes</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Create Assignment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Assignment</DialogTitle><DialogDescription>Assign a teacher to a subject or class</DialogDescription></DialogHeader>
              <form onSubmit={handleAssignSubject} className="space-y-4">
                {profile?.role === 'super_admin' && (
                  <div><Label>School *</Label>
                    <Select value={selectedSchoolForDialog} onValueChange={setSelectedSchoolForDialog} required>
                      <SelectTrigger><SelectValue placeholder="Select school first" /></SelectTrigger>
                      <SelectContent>{schools.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>Teacher *</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher} required>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>{teachers.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.full_name} ({t.school_name})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Subject *</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject} required>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>{subjects.filter((s: any) => {
                      if (profile?.role === 'super_admin' && selectedSchoolForDialog) {
                        return s.school_id === selectedSchoolForDialog
                      }
                      return !selectedTeacher || s.school_id === teachers.find(t => t.id === selectedTeacher)?.school_id
                    }).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Assignment Level *</Label>
                  <Select value={assignmentLevel} onValueChange={setAssignmentLevel} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school">School-wide</SelectItem>
                      <SelectItem value="grade">Grade-level</SelectItem>
                      <SelectItem value="class">Specific Class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {assignmentLevel === 'class' && (
                  <div><Label>Class *</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass} required>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>{classes.filter((c: any) => {
                        if (profile?.role === 'super_admin' && selectedSchoolForDialog) {
                          return c.school_id === selectedSchoolForDialog
                        }
                        return !selectedTeacher || c.school_id === teachers.find(t => t.id === selectedTeacher)?.school_id
                      }).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.grade_level} {c.section}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Creating...' : 'Create Assignment'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><Label>School Type</Label>
                <Select value={filterSchoolType} onValueChange={setFilterSchoolType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="Primary">Primary</SelectItem><SelectItem value="Secondary">Secondary</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>School</Label>
                <Select value={filterSchool} onValueChange={setFilterSchool}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Schools</SelectItem>{filteredSchools.map((school) => <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Subject</Label>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Subjects</SelectItem>{subjects.filter(s => filterSchool === 'all' || s.school_id === filterSchool).map((subj: any) => <SelectItem key={subj.id} value={subj.id}>{subj.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Search</Label><Input placeholder="Teacher name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">Total Teachers</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold">{filteredTeachers.length}</div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">Subject Assignments</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold">{filteredTeachers.reduce((sum, t) => sum + t.subject_assignments.length, 0)}</div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">Class Assignments</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold">{filteredTeachers.reduce((sum, t) => sum + t.class_assignments.length, 0)}</div></CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {['Primary', 'Secondary'].map((schoolType) => {
            const schoolGroups = groupedTeachers.filter(g => g.school.school_type === schoolType)
            if (schoolGroups.length === 0) return null

            return (
              <div key={schoolType}>
                <h2 className="text-2xl font-bold mb-4 flex items-center"><GraduationCap className="mr-2" />{schoolType} Schools</h2>
                <div className="space-y-4">
                  {schoolGroups.map(({ school, teachers: schoolTeachers }) => {
                    const isExpanded = expandedSchool === school.id

                    return (
                      <div key={school.id}>
                        <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setExpandedSchool(isExpanded ? null : school.id)}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div><CardTitle className="text-lg flex items-center"><School className="w-5 h-5 mr-2" />{school.name}</CardTitle><p className="text-sm text-gray-500">{school.school_code}</p></div>
                              <div className="flex items-center gap-2"><Badge>{schoolTeachers.length} Teachers</Badge>{isExpanded ? <ChevronUp /> : <ChevronDown />}</div>
                            </div>
                          </CardHeader>
                        </Card>

                        {isExpanded && (
                          <div className="ml-4 mt-2 space-y-2">
                            {schoolTeachers.map((teacher: any) => {
                              const isTeacherExpanded = expandedTeacher === teacher.id

                              return (
                                <Card key={teacher.id} className="cursor-pointer hover:shadow-md" onClick={(e) => { e.stopPropagation(); setExpandedTeacher(isTeacherExpanded ? null : teacher.id) }}>
                                  <CardHeader className="py-3">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                        <UserCircle className="w-8 h-8 text-gray-400" />
                                        <div><CardTitle className="text-base">{teacher.full_name}</CardTitle><p className="text-xs text-gray-500">{teacher.username}</p></div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge>{teacher.subject_assignments.length + teacher.class_assignments.length} assignments</Badge>
                                        {isTeacherExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </div>
                                    </div>
                                  </CardHeader>

                                  {isTeacherExpanded && (
                                    <CardContent className="border-t pt-3 space-y-4">
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium flex items-center"><BookOpen className="w-4 h-4 mr-1" />Subject Assignments</span>
                                        </div>
                                        {teacher.subject_assignments.length > 0 ? (
                                          <div className="space-y-1">
                                            {teacher.subject_assignments.map((assignment: any) => (
                                              <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                <div className="flex items-center gap-2">
                                                  <Badge variant="outline">{assignment.subjects?.name}</Badge>
                                                  <span className="text-xs text-gray-500">({assignment.assignment_level})</span>
                                                </div>
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleRemoveSubjectAssignment(assignment.id) }}>
                                                  <Trash2 className="w-3 h-3 text-red-500" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-gray-400">No subject assignments</p>
                                        )}
                                      </div>

                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium flex items-center"><GraduationCap className="w-4 h-4 mr-1" />Class Assignments</span>
                                        </div>
                                        {teacher.class_assignments.length > 0 ? (
                                          <div className="space-y-1">
                                            {teacher.class_assignments.map((assignment: any) => (
                                              <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                <div className="flex items-center gap-2">
                                                  <Badge variant="outline">{assignment.classes?.grade_level} {assignment.classes?.section}</Badge>
                                                  <span className="text-xs text-gray-500">({assignment.subjects?.name})</span>
                                                </div>
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleRemoveClassAssignment(assignment.id) }}>
                                                  <Trash2 className="w-3 h-3 text-red-500" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-gray-400">No class assignments</p>
                                        )}
                                      </div>
                                    </CardContent>
                                  )}
                                </Card>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
