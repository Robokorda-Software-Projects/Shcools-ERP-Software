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
import { Plus, School, Users, GraduationCap, ChevronDown, ChevronUp, Edit, Trash2, UserCircle, Link2, Calendar } from 'lucide-react'

interface School {
  id: string
  name: string
  school_code: string
  school_type: string
  student_count: number
}

interface Student {
  id: string
  user_id: string
  username: string
  full_name: string
  email: string
  class_id: string | null
  grade_level: string
  section: string
  school_id: string
  school_name: string
  parent_id: string | null
  parent_name: string | null
  admission_date: string
  expanded: boolean
}

export default function StudentsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [parents, setParents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null)
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  
  // Filters
  const [filterSchoolType, setFilterSchoolType] = useState<string>('all')
  const [filterSchool, setFilterSchool] = useState<string>('all')
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [filterSection, setFilterSection] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
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

    // Load schools
    let schoolsQuery = supabase
      .from('schools')
      .select('id, name, school_code, school_type')
      .order('school_type')
      .order('name')

    if (profile?.role === 'school_admin' && profile?.school_id) {
      schoolsQuery = schoolsQuery.eq('id', profile.school_id)
    }

    const { data: schoolsData, error: schoolsError } = await schoolsQuery

    if (schoolsError) {
      toast.error('Failed to load schools')
      console.error(schoolsError)
    } else {
      const schoolsWithCount = await Promise.all(
        (schoolsData || []).map(async (school) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', school.id) // Using school_id from classes join
          return { ...school, student_count: count || 0 }
        })
      )
      setSchools(schoolsWithCount)
    }

    // Load classes
    let classesQuery = supabase
      .from('classes')
      .select('id, grade_level, section, school_id, schools(name)')
      .order('grade_level')

    if (profile?.role === 'school_admin' && profile?.school_id) {
      classesQuery = classesQuery.eq('school_id', profile.school_id)
    }

    const { data: classesData } = await classesQuery
    setClasses(classesData || [])

    // Load parents
    const { data: parentsData } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .eq('role', 'parent')
    setParents(parentsData || [])

    // Load students with all details
    let studentsQuery = supabase
      .from('students')
      .select(`
        id,
        user_id,
        class_id,
        parent_id,
        admission_date,
        profiles!students_user_id_fkey(username, full_name, email),
        parent:profiles!students_parent_id_fkey(full_name),
        classes(grade_level, section, school_id, schools(name, school_code, school_type))
      `)

    const { data: studentsData, error: studentsError } = await studentsQuery

    if (studentsError) {
      toast.error('Failed to load students')
      console.error(studentsError)
    } else {
      const transformed = (studentsData || []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        username: s.profiles?.username || 'Unknown',
        full_name: s.profiles?.full_name || 'Unknown',
        email: s.profiles?.email || 'N/A',
        class_id: s.class_id,
        grade_level: s.classes?.grade_level || 'Not Assigned',
        section: s.classes?.section || '',
        school_id: s.classes?.school_id || '',
        school_name: s.classes?.schools?.name || 'Not Assigned',
        parent_id: s.parent_id,
        parent_name: s.parent?.full_name || null,
        admission_date: s.admission_date,
        expanded: false
      }))
      setStudents(transformed)
    }

    setLoading(false)
  }

  const generateStudentUsername = (schoolCode: string) => {
    const randomNum = Math.floor(10000000 + Math.random() * 90000000)
    return `${schoolCode}-ST-${randomNum}`
  }-ST-${randomNum}`
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Get school code
      const school = schools.find(s => s.id === selectedSchoolId)
      if (!school) throw new Error('School not found')

      const username = generateStudentUsername(school.school_code)

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      })

      if (authError) throw authError

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          username: username,
          full_name: fullName,
          role: 'student',
          school_id: selectedSchoolId
        })

      if (profileError) throw profileError

      // Create student record
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          user_id: authData.user.id,
          class_id: selectedClassId || null,
          admission_date: new Date().toISOString().split('T')[0]
        })

      if (studentError) throw studentError

      toast.success('Student created successfully!', { description: `Username: ${username}` })
      setDialogOpen(false)
      setFullName('')
      setEmail('')
      setPassword('')
      setSelectedClassId('')
      setSelectedSchoolId('')
      loadData()
    } catch (error: any) {
      toast.error('Failed to create student', { description: error.message })
    }
    setSubmitting(false)
  }

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}? This will remove all associated data.`)) {
      return
    }

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)

    if (error) {
      toast.error('Failed to delete student', { description: error.message })
    } else {
      toast.success('Student deleted successfully!')
      loadData()
    }
  }

  // Filtered data
  const filteredSchools = schools.filter(school => {
    if (filterSchoolType !== 'all' && school.school_type !== filterSchoolType) return false
    if (filterSchool !== 'all' && school.id !== filterSchool) return false
    return true
  })

  const filteredStudents = students.filter(student => {
    if (filterSchool !== 'all' && student.school_id !== filterSchool) return false
    if (filterGrade !== 'all' && student.grade_level !== filterGrade) return false
    if (filterSection !== 'all' && student.section !== filterSection) return false
    if (searchQuery && !student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !student.username.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const availableGrades = [...new Set(filteredStudents.map(s => s.grade_level))]
  const availableSections = [...new Set(filteredStudents.map(s => s.section).filter(Boolean))]

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Students Management">
        <div>Loading...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Students Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Manage students across all schools</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Student</DialogTitle>
                <DialogDescription>Add a new student to the system</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="e.g., Tanaka Moyo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="student@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">Default: Student123! (can be changed later)</p>
                </div>
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
                <div className="space-y-2">
                  <Label>Class *</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes
                        .filter(c => c.school_id === selectedSchoolId)
                        .map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.grade_level} {cls.section}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Student ID:</strong> Will be auto-generated as{' '}
                    {selectedSchoolId 
                      ? `${schools.find(s => s.id === selectedSchoolId)?.school_code}-ST-########`
                      : 'SCHOOL-ST-########'}
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Enrolling Student...' : 'Enroll Student'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>School Type</Label>
                <Select value={filterSchoolType} onValueChange={setFilterSchoolType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>School</Label>
                <Select value={filterSchool} onValueChange={setFilterSchool}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {filteredSchools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade Level</Label>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {availableGrades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {availableSections.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Search</Label>
                <Input
                  placeholder="Name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">Total Schools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{filteredSchools.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{filteredStudents.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">With Parents Linked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {filteredStudents.filter(s => s.parent_id).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* School Cards */}
        <div className="space-y-6">
          {['Primary', 'Secondary'].map((schoolType) => {
            const schoolsOfType = filteredSchools.filter(s => s.school_type === schoolType)
            if (schoolsOfType.length === 0) return null

            return (
              <div key={schoolType}>
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <GraduationCap className="mr-2" />
                  {schoolType} Schools
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schoolsOfType.map((school) => {
                    const schoolStudents = filteredStudents.filter(s => s.school_id === school.id)
                    const isExpanded = expandedSchool === school.id

                    return (
                      <div key={school.id} className="space-y-2">
                        <Card 
                          className="cursor-pointer hover:shadow-lg transition-all"
                          onClick={() => setExpandedSchool(isExpanded ? null : school.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{school.name}</CardTitle>
                                <p className="text-sm text-gray-500">{school.school_code}</p>
                              </div>
                              {isExpanded ? <ChevronUp /> : <ChevronDown />}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-gray-600">
                                <Users className="w-4 h-4 mr-2" />
                                <span className="text-sm">{schoolStudents.length} Students</span>
                              </div>
                              <Badge variant="outline">{school.school_type}</Badge>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Expanded Students */}
                        {isExpanded && schoolStudents.length > 0 && (
                          <div className="ml-4 space-y-2 animate-in slide-in-from-top">
                            {schoolStudents.map((student) => {
                              const isStudentExpanded = expandedStudent === student.id

                              return (
                                <Card 
                                  key={student.id}
                                  className="cursor-pointer hover:shadow-md transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedStudent(isStudentExpanded ? null : student.id)
                                  }}
                                >
                                  <CardHeader className="py-3">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                        <UserCircle className="w-8 h-8 text-gray-400" />
                                        <div>
                                          <CardTitle className="text-base">{student.full_name}</CardTitle>
                                          <p className="text-xs text-gray-500">{student.username}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge>{student.grade_level} {student.section}</Badge>
                                        {isStudentExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </div>
                                    </div>
                                  </CardHeader>

                                  {/* Expanded Student Details */}
                                  {isStudentExpanded && (
                                    <CardContent className="space-y-3 border-t pt-3">
                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                          <span className="text-gray-500">Email:</span>
                                          <p className="font-medium">{student.email}</p>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Class:</span>
                                          <p className="font-medium">{student.grade_level} {student.section}</p>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Parent:</span>
                                          <p className="font-medium">
                                            {student.parent_name ? (
                                              <span className="text-green-600">{student.parent_name}</span>
                                            ) : (
                                              <span className="text-yellow-600">Not Linked</span>
                                            )}
                                          </p>
                                        </div>
                                        <div>
                                          <span className="text-gray-500 flex items-center">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            Admission:
                                          </span>
                                          <p className="font-medium">{student.admission_date}</p>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 pt-2">
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toast.info('Edit functionality coming in next phase')
                                          }}
                                        >
                                          <Edit className="w-3 h-3 mr-1" />
                                          Edit
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            router.push('/dashboard/parents')
                                          }}
                                        >
                                          <Link2 className="w-3 h-3 mr-1" />
                                          Link Parent
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="destructive"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteStudent(student.id, student.full_name)
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3 mr-1" />
                                          Delete
                                        </Button>
                                      </div>
                                    </CardContent>
                                  )}
                                </Card>
                              )
                            })}
                          </div>
                        )}

                        {isExpanded && schoolStudents.length === 0 && (
                          <Card className="ml-4">
                            <CardContent className="py-6 text-center text-gray-500">
                              No students found for this school
                            </CardContent>
                          </Card>
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


