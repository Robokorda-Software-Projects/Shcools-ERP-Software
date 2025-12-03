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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, Users, Search, GraduationCap, Filter, X } from 'lucide-react'

interface StudentWithDetails {
  id: string
  roll_number: string
  admission_date: string
  profiles: {
    username: string
    full_name: string
    email: string
  }
  classes: {
    id: string
    grade_level: string
    section: string
    school_id: string
    schools: {
      name: string
      school_code: string
    }
  } | null
}

export default function StudentsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<StudentWithDetails[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // Filters
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all')
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('all')
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [rollNumber, setRollNumber] = useState('')
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
      if (profile.role === 'super_admin') {
        loadSchools()
      } else if (profile.school_id) {
        setSelectedSchoolId(profile.school_id)
      }
      loadStudents()
    }
  }, [profile])

  useEffect(() => {
    loadClasses()
  }, [selectedSchoolId])

  const loadSchools = async () => {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('name')

    if (!error && data) {
      setSchools(data)
    }
  }

  const loadClasses = async () => {
    let query = supabase
      .from('classes')
      .select('*, schools(name, school_code)')
      .order('grade_level')
      .order('section')

    if (selectedSchoolId && selectedSchoolId !== 'all') {
      query = query.eq('school_id', selectedSchoolId)
    } else if (profile?.role !== 'super_admin' && profile?.school_id) {
      query = query.eq('school_id', profile.school_id)
    }

    const { data, error } = await query

    if (!error && data) {
      setClasses(data)
      if (data.length > 0 && !selectedClassId) {
        setSelectedClassId(data[0].id)
      }
    }
  }

  const loadStudents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        profiles:user_id(username, full_name, email),
        classes(
          id,
          grade_level,
          section,
          school_id,
          schools(name, school_code)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load students')
      console.error(error)
    } else {
      setStudents(data || [])
    }
    setLoading(false)
  }

  const generateStudentUsername = async () => {
    if (!selectedClassId) return ''

    const classData = classes.find(c => c.id === selectedClassId)
    if (!classData) return ''

    const schoolCode = classData.schools?.school_code || 'UNKN001'
    
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })

    const studentNumber = (count || 0) + 1
    return `${schoolCode}-ST-${studentNumber.toString().padStart(8, '0')}`
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const username = await generateStudentUsername()
      const classData = classes.find(c => c.id === selectedClassId)
      const schoolId = classData?.school_id

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username,
            full_name: fullName,
            role: 'student',
            school_id: schoolId
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            user_id: authData.user.id,
            class_id: selectedClassId,
            roll_number: rollNumber,
            admission_date: new Date().toISOString().split('T')[0]
          })

        if (studentError) throw studentError

        toast.success('Student created successfully!', {
          description: `Username: ${username}`,
        })
        
        setDialogOpen(false)
        setFullName('')
        setEmail('')
        setPassword('')
        setRollNumber('')
        loadStudents()
      }
    } catch (error: any) {
      toast.error('Failed to create student', {
        description: error.message,
      })
    }
    
    setSubmitting(false)
  }

  const clearFilters = () => {
    if (profile?.role === 'super_admin') {
      setSelectedSchoolId('all')
    }
    setSelectedGradeLevel('all')
    setSelectedSection('all')
    setSearchTerm('')
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_number?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSchool = selectedSchoolId === 'all' || 
      student.classes?.school_id === selectedSchoolId
    
    const matchesGrade = selectedGradeLevel === 'all' || 
      student.classes?.grade_level === selectedGradeLevel
    
    const matchesSection = selectedSection === 'all' || 
      student.classes?.section === selectedSection

    return matchesSearch && matchesSchool && matchesGrade && matchesSection
  })

  const uniqueSections = Array.from(new Set(
    students
      .filter(s => s.classes && (selectedGradeLevel === 'all' || s.classes.grade_level === selectedGradeLevel))
      .map(s => s.classes?.section)
      .filter(Boolean)
  ))

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Students">
        <div>Loading...</div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) {
    return null
  }

  const canManageStudents = profile.role === 'super_admin' || profile.role === 'school_admin'

  return (
    <DashboardLayout title="Students">
      <div className="space-y-6">
        {/* Filters Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <CardTitle className="text-base">Filters</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {profile.role === 'super_admin' && (
                <div className="space-y-2">
                  <Label>School</Label>
                  <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Schools" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schools</SelectItem>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          [{school.school_code}] {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Grade Level</Label>
                <Select value={selectedGradeLevel} onValueChange={setSelectedGradeLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {gradeLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {uniqueSections.map((section) => (
                      <SelectItem key={section} value={section as string}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Name, username, roll..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {filteredStudents.length} of {students.length} students
          </div>
          {canManageStudents && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>
                    Create a new student account and assign to a class
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateStudent} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        placeholder="e.g., Tatenda Moyo"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="student@school.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rollNumber">Roll Number</Label>
                      <Input
                        id="rollNumber"
                        placeholder="e.g., 001"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="class">Assign to Class *</Label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={submitting}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((classItem) => (
                            <SelectItem key={classItem.id} value={classItem.id}>
                              {profile.role === 'super_admin' && `[${classItem.schools?.school_code}] `}
                              {classItem.grade_level} {classItem.section}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">Username will be auto-generated</p>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Student'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-linear-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Students</CardTitle>
              <Users className="h-5 w-5" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{students.length}</div>
              <p className="text-xs opacity-75 mt-1">Filtered: {filteredStudents.length}</p>
            </CardContent>
          </Card>
        </div>

        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">
                {students.length === 0 ? 'No students found' : 'No students match your filters'}
              </p>
              {students.length > 0 && (
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              )}
              {canManageStudents && students.length === 0 && (
                <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Student
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Students List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Roll Number</TableHead>
                    {profile.role === 'super_admin' && <TableHead>School</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {student.profiles?.username}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{student.profiles?.full_name}</TableCell>
                      <TableCell>
                        {student.classes ? (
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">
                              {student.classes.grade_level} {student.classes.section}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                          {student.roll_number || 'N/A'}
                        </Badge>
                      </TableCell>
                      {profile.role === 'super_admin' && (
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {student.classes?.schools?.school_code || 'N/A'}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
