'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  CheckCircle, Clock, ChevronDown, ChevronUp, 
  Download, Users, Search, GraduationCap, BookOpen,
  ClipboardList
} from 'lucide-react'

interface Test {
  id: string
  title: string
  description: string
  test_type: string
  test_date: string
  total_marks: number
  class_id: string
  class_name: string
  subject_id: string
  subject_name: string
  test_paper_url: string | null
  is_published: boolean
  published_at: string | null
  graded_count: number
  total_students: number
}

interface TeacherWithTests {
  id: string
  full_name: string
  username: string
  tests: Test[]
  totalClasses: number
  totalSubjects: number
}

interface StudentResult {
  student_id: string
  student_name: string
  marks_obtained: number | null
  percentage: number | null
  grade: string | null
}

export default function AdminTestsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [teachersWithTests, setTeachersWithTests] = useState<TeacherWithTests[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'grading' | 'pending'>('all')
  const [testTypeFilter, setTestTypeFilter] = useState<string>('all')
  
  // Expanded states
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null)
  const [expandedTest, setExpandedTest] = useState<string | null>(null)
  const [studentResults, setStudentResults] = useState<StudentResult[]>([])

  const TEST_TYPES = [
    { value: 'weekly', label: 'Weekly Test' },
    { value: 'monthly', label: 'Monthly Test' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'mid-term', label: 'Mid-Term Test' },
    { value: 'other', label: 'Other' }
  ]

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && !['school_admin', 'super_admin'].includes(profile.role)) {
      router.push('/dashboard')
      toast.error('Access denied - Admin only')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.school_id) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load all teachers with their assignments
      const { data: teachersData } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .eq('role', 'teacher')
        .eq('school_id', profile?.school_id)
        .order('full_name')

      // For each teacher, get their assignments and tests
      const teachersWithTestsData: TeacherWithTests[] = []

      for (const teacher of teachersData || []) {
        // Get teacher's assignments
        const { data: assignments } = await supabase
          .from('class_subject_assignments')
          .select(`
            class_id,
            subject_id,
            classes(id, grade_level, section),
            subjects(id, name)
          `)
          .eq('teacher_id', teacher.id)

        // Get unique classes and subjects
        const uniqueClasses = new Set(assignments?.map(a => a.class_id))
        const uniqueSubjects = new Set(assignments?.map(a => a.subject_id))

        // Get tests for this teacher
        const { data: testsData } = await supabase
          .from('term_tests')
          .select(`
            id, title, description, test_type, test_date, total_marks, 
            class_id, subject_id, test_paper_url, test_paper_name,
            is_published, published_at,
            classes(grade_level, section),
            subjects(name)
          `)
          .eq('school_id', profile?.school_id)
          .eq('teacher_id', teacher.id)
          .order('test_date', { ascending: false })

        // Get grading counts
        const testsWithCounts: Test[] = await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (testsData || []).map(async (test: any) => {
            const { count: totalCount } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('class_id', test.class_id)
              .eq('student_status', 'active')
            
            const { count: gradedCount } = await supabase
              .from('term_test_results')
              .select('*', { count: 'exact', head: true })
              .eq('test_id', test.id)
              .not('marks_obtained', 'is', null)

            return {
              id: test.id,
              title: test.title,
              description: test.description,
              test_type: test.test_type,
              test_date: test.test_date,
              total_marks: test.total_marks,
              class_id: test.class_id,
              class_name: `${test.classes?.grade_level || ''} ${test.classes?.section || ''}`,
              subject_id: test.subject_id,
              subject_name: test.subjects?.name || 'Unknown',
              test_paper_url: test.test_paper_url || null,
              is_published: test.is_published || false,
              published_at: test.published_at || null,
              graded_count: gradedCount || 0,
              total_students: totalCount || 0
            }
          })
        )

        teachersWithTestsData.push({
          id: teacher.id,
          full_name: teacher.full_name,
          username: teacher.username,
          tests: testsWithCounts,
          totalClasses: uniqueClasses.size,
          totalSubjects: uniqueSubjects.size
        })
      }

      // Sort by number of tests (teachers with tests first)
      teachersWithTestsData.sort((a, b) => b.tests.length - a.tests.length)

      setTeachersWithTests(teachersWithTestsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load tests')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentResults = async (testId: string, classId: string) => {
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, profiles!students_user_id_fkey(full_name)')
        .eq('class_id', classId)
        .eq('student_status', 'active')
        .order('profiles(full_name)')

      const { data: resultsData } = await supabase
        .from('term_test_results')
        .select('*')
        .eq('test_id', testId)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: StudentResult[] = (studentsData || []).map((student: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = resultsData?.find((r: any) => r.student_id === student.id)
        return {
          student_id: student.id,
          student_name: student.profiles?.full_name || 'Unknown',
          marks_obtained: result?.marks_obtained || null,
          percentage: result?.percentage || null,
          grade: result?.grade || null
        }
      })

      setStudentResults(results)
    } catch (error) {
      console.error('Error loading results:', error)
    }
  }

  const handleExpandTeacher = (teacherId: string) => {
    if (expandedTeacher === teacherId) {
      setExpandedTeacher(null)
      setExpandedTest(null)
    } else {
      setExpandedTeacher(teacherId)
      setExpandedTest(null)
    }
  }

  const handleExpandTest = async (testId: string, classId: string) => {
    if (expandedTest === testId) {
      setExpandedTest(null)
      setStudentResults([])
    } else {
      setExpandedTest(testId)
      await loadStudentResults(testId, classId)
    }
  }

  const getTestTypeLabel = (type: string) => {
    return TEST_TYPES.find(t => t.value === type)?.label || type
  }

  // Filter teachers based on search and status filter
  const filteredTeachers = teachersWithTests.map(teacher => {
    // First filter tests by status and type
    let filteredTests = teacher.tests
    
    if (statusFilter === 'published') {
      filteredTests = teacher.tests.filter(t => t.is_published)
    } else if (statusFilter === 'pending') {
      filteredTests = teacher.tests.filter(t => !t.is_published && t.graded_count === 0)
    } else if (statusFilter === 'grading') {
      filteredTests = teacher.tests.filter(t => !t.is_published && t.graded_count > 0 && t.graded_count < t.total_students)
    }

    if (testTypeFilter !== 'all') {
      filteredTests = filteredTests.filter(t => t.test_type === testTypeFilter)
    }
    
    return { ...teacher, tests: filteredTests }
  }).filter(teacher => {
    // Then filter by search query
    if (!searchQuery) return teacher.tests.length > 0 || statusFilter === 'all'
    const query = searchQuery.toLowerCase()
    return (teacher.full_name.toLowerCase().includes(query) ||
      teacher.username.toLowerCase().includes(query) ||
      teacher.tests.some(t => 
        t.title.toLowerCase().includes(query) ||
        t.class_name.toLowerCase().includes(query) ||
        t.subject_name.toLowerCase().includes(query)
      )) && (teacher.tests.length > 0 || statusFilter === 'all')
  })

  // Stats
  const totalTests = teachersWithTests.reduce((sum, t) => sum + t.tests.length, 0)
  const publishedTests = teachersWithTests.reduce((sum, t) => sum + t.tests.filter(test => test.is_published).length, 0)
  const pendingTests = totalTests - publishedTests

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Tests Management">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) return null

  return (
    <DashboardLayout title="Tests Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Class Tests & Quizzes</h1>
            <p className="text-gray-500">
              View test progress by teacher
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Total Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Published
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{publishedTests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingTests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Teachers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{teachersWithTests.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by teacher name, class, or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select 
                value={statusFilter} 
                onValueChange={(value: 'all' | 'published' | 'pending' | 'grading') => setStatusFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Published
                    </span>
                  </SelectItem>
                  <SelectItem value="grading">
                    <span className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-blue-600" />
                      In Progress
                    </span>
                  </SelectItem>
                  <SelectItem value="pending">
                    <span className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-yellow-600" />
                      Not Started
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={testTypeFilter} 
                onValueChange={setTestTypeFilter}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Test Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {TEST_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Teacher Cards */}
        <div className="space-y-4">
          {filteredTeachers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                {searchQuery 
                  ? 'No teachers match your search' 
                  : statusFilter !== 'all' || testTypeFilter !== 'all'
                    ? 'No tests match the selected filters'
                    : 'No tests found. Teachers can create tests from their dashboard.'}
              </CardContent>
            </Card>
          ) : (
            filteredTeachers.map((teacher) => {
              const isExpanded = expandedTeacher === teacher.id
              const publishedCount = teacher.tests.filter(t => t.is_published).length

              return (
                <Card key={teacher.id} className="overflow-hidden">
                  {/* Teacher Header */}
                  <CardHeader 
                    className="py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleExpandTeacher(teacher.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                          {teacher.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{teacher.full_name}</CardTitle>
                          <p className="text-sm text-gray-500">@{teacher.username}</p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-4 w-4" />
                              {teacher.totalClasses} classes
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              {teacher.totalSubjects} subjects
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {teacher.tests.length} tests
                          </div>
                          <div className="flex gap-2 mt-1">
                            {publishedCount > 0 && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                {publishedCount} published
                              </Badge>
                            )}
                            {teacher.tests.length - publishedCount > 0 && (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                {teacher.tests.length - publishedCount} pending
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Teacher's Tests List */}
                  {isExpanded && (
                    <CardContent className="border-t pt-4 space-y-3 bg-gray-50">
                      {teacher.tests.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">
                          No tests created yet.
                        </p>
                      ) : (
                        teacher.tests.map((test) => {
                          const isTestExpanded = expandedTest === test.id
                          const gradingProgress = test.total_students > 0 
                            ? (test.graded_count / test.total_students) * 100 
                            : 0

                          return (
                            <Card key={test.id} className="bg-white">
                              <CardHeader 
                                className="py-3 cursor-pointer hover:bg-gray-50"
                                onClick={() => handleExpandTest(test.id, test.class_id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <ClipboardList className="w-4 h-4 text-purple-600" />
                                    <div>
                                      <p className="font-medium">{test.title}</p>
                                      <p className="text-xs text-gray-500">
                                        {test.class_name} • {test.subject_name}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {getTestTypeLabel(test.test_type)}
                                    </Badge>
                                    {test.is_published ? (
                                      <Badge className="bg-green-100 text-green-800 text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Published
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Pending
                                      </Badge>
                                    )}
                                    {test.test_paper_url && (
                                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                                        PDF
                                      </Badge>
                                    )}
                                    {isTestExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </div>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Marks entered</span>
                                    <span>{test.graded_count}/{test.total_students}</span>
                                  </div>
                                  <Progress value={gradingProgress} className="h-1.5" />
                                </div>
                              </CardHeader>

                              {isTestExpanded && (
                                <CardContent className="pt-0 pb-3 border-t">
                                  {/* Test details */}
                                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                                    <div>
                                      <span className="text-gray-500">Test Date:</span>{' '}
                                      {new Date(test.test_date).toLocaleDateString()}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Total Marks:</span>{' '}
                                      {test.total_marks}
                                    </div>
                                  </div>
                                  
                                  {test.test_paper_url && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mb-3"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        window.open(test.test_paper_url!, '_blank')
                                      }}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      View Test Paper
                                    </Button>
                                  )}

                                  {/* Student Results */}
                                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="text-xs">Student</TableHead>
                                          <TableHead className="text-xs text-center">Marks</TableHead>
                                          <TableHead className="text-xs text-center">%</TableHead>
                                          <TableHead className="text-xs text-center">Grade</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {studentResults.length === 0 ? (
                                          <TableRow>
                                            <TableCell colSpan={4} className="text-center text-gray-500 text-sm">
                                              No students
                                            </TableCell>
                                          </TableRow>
                                        ) : (
                                          studentResults.map((result) => (
                                            <TableRow key={result.student_id}>
                                              <TableCell className="text-sm">{result.student_name}</TableCell>
                                              <TableCell className="text-center text-sm">
                                                {result.marks_obtained !== null 
                                                  ? `${result.marks_obtained}/${test.total_marks}` 
                                                  : <span className="text-gray-400">-</span>}
                                              </TableCell>
                                              <TableCell className="text-center text-sm">
                                                {result.percentage !== null 
                                                  ? `${result.percentage.toFixed(0)}%` 
                                                  : '-'}
                                              </TableCell>
                                              <TableCell className="text-center">
                                                {result.grade ? (
                                                  <Badge className={`text-xs ${
                                                    result.grade === 'A' ? 'bg-green-100 text-green-800' :
                                                    result.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                                    result.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                                    result.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-red-100 text-red-800'
                                                  }`}>
                                                    {result.grade}
                                                  </Badge>
                                                ) : '-'}
                                              </TableCell>
                                            </TableRow>
                                          ))
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </CardContent>
                              )}
                            </Card>
                          )
                        })
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
