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
import { Plus, School, Users, GraduationCap, ChevronDown, ChevronUp, Trash2, BookOpen, UserCircle } from 'lucide-react'

interface School {
  id: string
  name: string
  school_code: string
  school_type: string
  teacher_count: number
}

interface Teacher {
  id: string
  user_id: string
  username: string
  full_name: string
  email: string
  school_id: string
  school_name: string
  school_type: string
  subjects: string[]
  classes: string[]
  assignment_count: number
}

export default function TeachersPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null)
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null)
  
  const [filterSchoolType, setFilterSchoolType] = useState<string>('all')
  const [filterSchool, setFilterSchool] = useState<string>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
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

    let schoolsQuery = supabase.from('schools').select('id, name, school_code, school_type').order('school_type').order('name')
    if (profile?.role === 'school_admin' && profile?.school_id) {
      schoolsQuery = schoolsQuery.eq('id', profile.school_id)
    }

    const { data: schoolsData } = await schoolsQuery
    const schoolsWithCount = await Promise.all(
      (schoolsData || []).map(async (school) => {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher').eq('school_id', school.id)
        return { ...school, teacher_count: count || 0 }
      })
    )
    setSchools(schoolsWithCount)

    let subjectsQuery = supabase.from('subjects').select('*').order('name')
    if (profile?.role === 'school_admin' && profile?.school_id) {
      subjectsQuery = subjectsQuery.eq('school_id', profile.school_id)
    }
    const { data: subjectsData } = await subjectsQuery
    setSubjects(subjectsData || [])

    let teachersQuery = supabase.from('profiles').select('id, username, full_name, email, school_id, schools(name, school_type)').eq('role', 'teacher').order('full_name')
    if (profile?.role === 'school_admin' && profile?.school_id) {
      teachersQuery = teachersQuery.eq('school_id', profile.school_id)
    }

    const { data: teachersData } = await teachersQuery

    const teachersWithAssignments = await Promise.all(
      (teachersData || []).map(async (teacher: any) => {
        const { data: assignmentsData } = await supabase.from('teacher_subject_assignments').select('subject_id, subjects(name)').eq('teacher_id', teacher.id)
        const { data: classAssignmentsData } = await supabase.from('class_subject_assignments').select('class_id, classes(grade_level, section)').eq('teacher_id', teacher.id)

        return {
          id: teacher.id,
          user_id: teacher.id,
          username: teacher.username,
          full_name: teacher.full_name,
          email: teacher.email,
          school_id: teacher.school_id,
          school_name: teacher.schools?.name || 'Unknown',
          school_type: teacher.schools?.school_type || 'Unknown',
          subjects: assignmentsData?.map((a: any) => a.subjects?.name).filter(Boolean) || [],
          classes: classAssignmentsData?.map((a: any) => `${a.classes?.grade_level} ${a.classes?.section}`).filter(Boolean) || [],
          assignment_count: (assignmentsData?.length || 0) + (classAssignmentsData?.length || 0)
        }
      })
    )
    setTeachers(teachersWithAssignments)
    setLoading(false)
  }

  const generateTeacherUsername = (schoolCode: string) => {
    const randomNum = Math.floor(10000000 + Math.random() * 90000000)
    return `${schoolCode}-TC-${randomNum}`
  }

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const school = schools.find(s => s.id === selectedSchoolId)
      if (!school) throw new Error('School not found')

      const username = generateTeacherUsername(school.school_code)

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      })

      if (authError) throw authError

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: email,
        username: username,
        full_name: fullName,
        role: 'teacher',
        school_id: selectedSchoolId
      })

      if (profileError) throw profileError

      toast.success('Teacher created successfully!', { description: `Username: ${username}` })
      setDialogOpen(false)
      setFullName('')
      setEmail('')
      setPassword('')
      setSelectedSchoolId('')
      loadData()
    } catch (error: any) {
      toast.error('Failed to create teacher', { description: error.message })
    }
    setSubmitting(false)
  }

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Delete ${teacherName}? All assignments will be removed.`)) return
    const { error } = await supabase.from('profiles').delete().eq('id', teacherId)
    if (error) {
      toast.error('Failed to delete teacher')
    } else {
      toast.success('Teacher deleted successfully!')
      loadData()
    }
  }

  const filteredTeachers = teachers.filter(teacher => {
    if (filterSchoolType !== 'all' && teacher.school_type !== filterSchoolType) return false
    if (filterSchool !== 'all' && teacher.school_id !== filterSchool) return false
    if (filterSubject !== 'all' && !teacher.subjects.includes(subjects.find(s => s.id === filterSubject)?.name)) return false
    if (searchQuery && !teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !teacher.username.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const filteredSchools = schools.filter(school => {
    if (filterSchoolType !== 'all' && school.school_type !== filterSchoolType) return false
    return filteredTeachers.some(teacher => teacher.school_id === school.id)
  })

  if (authLoading || loading) {
    return <DashboardLayout title="Teachers Management"><div>Loading...</div></DashboardLayout>
  }

  return (
    <DashboardLayout title="Teachers Management">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Manage teachers and their assignments</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Create Teacher</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Teacher</DialogTitle><DialogDescription>Add a new teacher to the system</DialogDescription></DialogHeader>
              <form onSubmit={handleCreateTeacher} className="space-y-4">
                <div><Label>Full Name *</Label><Input placeholder="e.g., John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
                <div><Label>Email *</Label><Input type="email" placeholder="teacher@school.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><Label>Password *</Label><Input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                <div><Label>School *</Label>
                  <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId} required>
                    <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                    <SelectContent>{schools.map((school) => <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Creating...' : 'Create Teacher'}</Button>
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
              <div><Label>Search</Label><Input placeholder="Name or username..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">Total Teachers</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold">{filteredTeachers.length}</div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">With Assignments</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold">{filteredTeachers.filter(t => t.assignment_count > 0).length}</div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">Total Assignments</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold">{filteredTeachers.reduce((sum, t) => sum + t.assignment_count, 0)}</div></CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {['Primary', 'Secondary'].map((schoolType) => {
            const schoolsOfType = filteredSchools.filter(s => s.school_type === schoolType)
            if (schoolsOfType.length === 0) return null

            return (
              <div key={schoolType}>
                <h2 className="text-2xl font-bold mb-4 flex items-center"><GraduationCap className="mr-2" />{schoolType} Schools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schoolsOfType.map((school) => {
                    const schoolTeachers = filteredTeachers.filter(t => t.school_id === school.id)
                    const isExpanded = expandedSchool === school.id

                    return (
                      <div key={school.id} className="space-y-2">
                        <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setExpandedSchool(isExpanded ? null : school.id)}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div><CardTitle className="text-lg">{school.name}</CardTitle><p className="text-sm text-gray-500">{school.school_code}</p></div>
                              {isExpanded ? <ChevronUp /> : <ChevronDown />}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-gray-600"><Users className="w-4 h-4 mr-2" /><span className="text-sm">{schoolTeachers.length} Teachers</span></div>
                              <Badge variant="outline">{school.school_type}</Badge>
                            </div>
                          </CardContent>
                        </Card>

                        {isExpanded && schoolTeachers.length > 0 && (
                          <div className="ml-4 space-y-2 animate-in slide-in-from-top">
                            {schoolTeachers.map((teacher) => {
                              const isTeacherExpanded = expandedTeacher === teacher.id

                              return (
                                <Card key={teacher.id} className="cursor-pointer hover:shadow-md transition-all" onClick={(e) => { e.stopPropagation(); setExpandedTeacher(isTeacherExpanded ? null : teacher.id) }}>
                                  <CardHeader className="py-3">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                        <UserCircle className="w-8 h-8 text-gray-400" />
                                        <div><CardTitle className="text-base">{teacher.full_name}</CardTitle><p className="text-xs text-gray-500">{teacher.username}</p></div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge>{teacher.assignment_count} assignments</Badge>
                                        {isTeacherExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </div>
                                    </div>
                                  </CardHeader>

                                  {isTeacherExpanded && (
                                    <CardContent className="space-y-3 border-t pt-3">
                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-gray-500">Email:</span><p className="font-medium">{teacher.email}</p></div>
                                        <div><span className="text-gray-500">School:</span><p className="font-medium">{teacher.school_name}</p></div>
                                      </div>
                                      <div>
                                        <span className="text-gray-500 text-sm flex items-center mb-1"><BookOpen className="w-3 h-3 mr-1" />Subjects:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {teacher.subjects.length > 0 ? teacher.subjects.map((subj, idx) => <Badge key={idx} variant="outline">{subj}</Badge>) : <span className="text-xs text-gray-400">No subjects assigned</span>}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-500 text-sm flex items-center mb-1"><GraduationCap className="w-3 h-3 mr-1" />Classes:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {teacher.classes.length > 0 ? teacher.classes.map((cls, idx) => <Badge key={idx} variant="outline">{cls}</Badge>) : <span className="text-xs text-gray-400">No classes assigned</span>}
                                        </div>
                                      </div>
                                      <div className="flex gap-2 pt-2">
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); router.push('/dashboard/teacher-assignments') }}>
                                          <BookOpen className="w-3 h-3 mr-1" />Manage Assignments
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDeleteTeacher(teacher.id, teacher.full_name) }}>
                                          <Trash2 className="w-3 h-3 mr-1" />Delete
                                        </Button>
                                      </div>
                                    </CardContent>
                                  )}
                                </Card>
                              )
                            })}
                          </div>
                        )}

                        {isExpanded && schoolTeachers.length === 0 && (
                          <Card className="ml-4"><CardContent className="py-6 text-center text-gray-500">No teachers found for this school</CardContent></Card>
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