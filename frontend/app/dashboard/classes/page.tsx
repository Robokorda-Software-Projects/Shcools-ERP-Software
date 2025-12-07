'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { GraduationCap, Users, ChevronDown, ChevronUp, UserCircle, Mail, Calendar, BookOpen } from 'lucide-react'

interface ClassInfo {
  id: string
  grade_level: string
  section: string
  academic_year: string
  student_count: number
  subjects: string[]
}

interface Student {
  id: string
  user_id: string
  username: string
  full_name: string
  email: string
  roll_number: string
  admission_date: string
  parent_name: string | null
}

export default function TeacherClassesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [students, setStudents] = useState<Map<string, Student[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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

    try {
      if (profile?.role === 'teacher') {
        // Get classes assigned to teacher
        const { data: classAssignments } = await supabase
          .from('class_subject_assignments')
          .select(`
            class_id,
            subject_id,
            classes!inner(
              id,
              grade_level,
              section,
              academic_year,
              school_id
            ),
            subjects(name)
          `)
          .eq('teacher_id', profile.id)
          .eq('classes.school_id', profile.school_id)

        // Group by class
        const classMap = new Map<string, ClassInfo>()
        
        classAssignments?.forEach((assignment: any) => {
          const cls = assignment.classes
          const classId = cls.id

          if (!classMap.has(classId)) {
            classMap.set(classId, {
              id: cls.id,
              grade_level: cls.grade_level,
              section: cls.section,
              academic_year: cls.academic_year,
              student_count: 0,
              subjects: []
            })
          }

          const classInfo = classMap.get(classId)!
          if (assignment.subjects?.name && !classInfo.subjects.includes(assignment.subjects.name)) {
            classInfo.subjects.push(assignment.subjects.name)
          }
        })

        // Get student counts
        const classesArray = Array.from(classMap.values())
        for (const cls of classesArray) {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
          
          cls.student_count = count || 0
        }

        // Sort by grade level
        classesArray.sort((a, b) => {
          if (a.grade_level < b.grade_level) return -1
          if (a.grade_level > b.grade_level) return 1
          return a.section.localeCompare(b.section)
        })

        setClasses(classesArray)
      }
    } catch (error) {
      console.error('Error loading classes:', error)
      toast.error('Failed to load classes')
    }

    setLoading(false)
  }

  const loadStudentsForClass = async (classId: string) => {
    if (students.has(classId)) return // Already loaded

    try {
      console.log('Loading students for class:', classId)
      
      // CRITICAL: Do NOT query roll_number, admission_date, or school_id
      // Only query columns that are guaranteed to exist
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          profiles!students_user_id_fkey(username, full_name, email),
          parent:profiles!students_parent_id_fkey(full_name)
        `)
        .eq('class_id', classId)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Raw student data received:', data)
      console.log('Number of students:', data?.length || 0)

      // Map the data without relying on database roll_number
      const studentsList: Student[] = (data || []).map((s: any, index: number) => {
        console.log('Processing student:', s.id, s.profiles?.full_name)
        return {
          id: s.id,
          user_id: s.user_id,
          username: s.profiles?.username || 'Unknown',
          full_name: s.profiles?.full_name || 'Unknown',
          email: s.profiles?.email || 'N/A',
          roll_number: `#${String(index + 1).padStart(2, '0')}`, // Generate display number
          admission_date: 'Not recorded',
          parent_name: s.parent?.full_name || null
        }
      })

      console.log(`Successfully loaded ${studentsList.length} students`)
      console.log('Student list:', studentsList)
      
      // Update the state with the new students
      const newStudentsMap = new Map(students)
      newStudentsMap.set(classId, studentsList)
      setStudents(newStudentsMap)
      
      console.log('State updated, students map size:', newStudentsMap.size)
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('Failed to load students: ' + (error as any).message)
    }
  }

  const handleClassClick = (classId: string) => {
    const isExpanding = expandedClass !== classId
    console.log('Class clicked:', classId, 'isExpanding:', isExpanding)
    console.log('Current students map:', students)
    console.log('Has students for this class:', students.has(classId))
    
    setExpandedClass(isExpanding ? classId : null)
    
    if (isExpanding) {
      console.log('Loading students for class:', classId)
      loadStudentsForClass(classId)
    }
  }

  const filteredClasses = classes.filter(cls => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      cls.grade_level.toLowerCase().includes(query) ||
      cls.section.toLowerCase().includes(query) ||
      cls.subjects.some(s => s.toLowerCase().includes(query))
    )
  })

  if (authLoading || loading) {
    return (
      <DashboardLayout title="My Classes & Students">
        <div>Loading...</div>
      </DashboardLayout>
    )
  }

  if (profile?.role !== 'teacher') {
    return (
      <DashboardLayout title="My Classes & Students">
        <div>Access Denied. This page is for teachers only.</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="My Classes & Students">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-gray-600">View your assigned classes and students</p>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label>Search Classes</Label>
              <Input
                placeholder="Search by grade, section, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">Total Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{filteredClasses.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {filteredClasses.reduce((sum, cls) => sum + cls.student_count, 0)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">Subjects Teaching</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {new Set(filteredClasses.flatMap(c => c.subjects)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classes List */}
        {filteredClasses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              {searchQuery ? 'No classes match your search' : 'No classes assigned yet'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredClasses.map((cls) => {
              const isExpanded = expandedClass === cls.id
              const classStudents = students.get(cls.id) || []

              return (
                <Card 
                  key={cls.id}
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => handleClassClick(cls.id)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            {cls.grade_level} {cls.section}
                          </CardTitle>
                          <p className="text-sm text-gray-500">
                            Academic Year: {cls.academic_year}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-medium">{cls.student_count} Students</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2 justify-end">
                            {cls.subjects.map((subject, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expanded Students List */}
                  {isExpanded && (
                    <CardContent className="border-t pt-4 animate-in slide-in-from-top">
                      {(() => {
                        console.log('Rendering expanded content for class:', cls.id)
                        console.log('Students from map:', classStudents)
                        console.log('Students length:', classStudents.length)
                        return null
                      })()}
                      
                      {classStudents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p className="font-semibold">No students enrolled in this class</p>
                          <p className="text-sm mt-2">Class ID: {cls.id}</p>
                          <p className="text-sm">Check console for debugging info</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-700">
                              Students ({classStudents.length})
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {classStudents.map((student) => {
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
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-3">
                                        <UserCircle className="w-10 h-10 text-gray-400" />
                                        <div>
                                          <p className="font-semibold">{student.full_name}</p>
                                          <p className="text-xs text-gray-500">
                                            Roll: {student.roll_number}
                                          </p>
                                        </div>
                                      </div>
                                      {isStudentExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                      )}
                                    </div>

                                    {/* Expanded Student Details */}
                                    {isStudentExpanded && (
                                      <div className="mt-4 pt-4 border-t space-y-3">
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                          <div>
                                            <div className="flex items-center gap-1 text-gray-500 mb-1">
                                              <Mail className="w-3 h-3" />
                                              <span className="text-xs">Email</span>
                                            </div>
                                            <p className="font-medium text-xs">{student.email}</p>
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-1 text-gray-500 mb-1">
                                              <UserCircle className="w-3 h-3" />
                                              <span className="text-xs">Username</span>
                                            </div>
                                            <p className="font-medium text-xs">{student.username}</p>
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-1 text-gray-500 mb-1">
                                              <Calendar className="w-3 h-3" />
                                              <span className="text-xs">Admission</span>
                                            </div>
                                            <p className="font-medium text-xs">{student.admission_date}</p>
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-1 text-gray-500 mb-1">
                                              <Users className="w-3 h-3" />
                                              <span className="text-xs">Parent</span>
                                            </div>
                                            <p className="font-medium text-xs">
                                              {student.parent_name ? (
                                                <span className="text-green-600">{student.parent_name}</span>
                                              ) : (
                                                <span className="text-gray-400">Not linked</span>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}