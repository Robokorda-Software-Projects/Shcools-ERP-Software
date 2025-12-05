'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { BookOpen, ChevronDown, ChevronUp, TrendingUp, Award, FileText } from 'lucide-react'

interface Subject {
  subject_id: string
  subject_name: string
  exam_count: number
  average_percentage: number | null
  best_grade: string | null
  total_marks_obtained: number
  total_marks_possible: number
}

interface ExamResult {
  exam_id: string
  exam_title: string
  exam_date: string
  total_marks: number
  marks_obtained: number
  percentage: number
  grade: string
  subject_name: string
}

export default function MyGradesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [examResults, setExamResults] = useState<ExamResult[]>([])
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile?.role !== 'student') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'student') {
      loadData()
    }
  }, [profile])

  const loadData = async () => {
    setLoading(true)

    const { data: studentData } = await supabase
      .from('students')
      .select(`
        id,
        class_id,
        classes(grade_level, section, school_id, schools(name))
      `)
      .eq('user_id', profile?.id)
      .single()

    setStudentInfo(studentData)

    if (studentData) {
      const { data: resultsData } = await supabase
        .from('exam_results')
        .select(`
          marks_obtained,
          percentage,
          grade,
          exams(id, title, exam_date, total_marks, subject_id, subjects(name))
        `)
        .eq('student_id', studentData.id)
        .not('marks_obtained', 'is', null)

      const subjectMap = new Map<string, { 
        name: string
        percentages: number[]
        grades: string[]
        marksObtained: number[]
        marksPossible: number[]
      }>()

      resultsData?.forEach((result: any) => {
        const subjectId = result.exams?.subject_id
        const subjectName = result.exams?.subjects?.name
        if (!subjectId || !subjectName) return

        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, { 
            name: subjectName, 
            percentages: [], 
            grades: [],
            marksObtained: [],
            marksPossible: []
          })
        }
        const subject = subjectMap.get(subjectId)!
        subject.percentages.push(result.percentage)
        subject.grades.push(result.grade)
        subject.marksObtained.push(result.marks_obtained)
        subject.marksPossible.push(result.exams?.total_marks)
      })

      const subjectsArray: Subject[] = Array.from(subjectMap.entries()).map(([subjectId, data]) => ({
        subject_id: subjectId,
        subject_name: data.name,
        exam_count: data.percentages.length,
        average_percentage: data.percentages.reduce((sum, p) => sum + p, 0) / data.percentages.length,
        best_grade: data.grades.sort()[0],
        total_marks_obtained: data.marksObtained.reduce((sum, m) => sum + m, 0),
        total_marks_possible: data.marksPossible.reduce((sum, m) => sum + m, 0)
      }))

      setSubjects(subjectsArray)
    }

    setLoading(false)
  }

  const loadExamResults = async (subjectId: string) => {
    if (!studentInfo) return

    const { data: resultsData } = await supabase
      .from('exam_results')
      .select(`
        marks_obtained,
        percentage,
        grade,
        exams(id, title, exam_date, total_marks, subject_id, subjects(name))
      `)
      .eq('student_id', studentInfo.id)
      .not('marks_obtained', 'is', null)

    const filtered = resultsData
      ?.filter((r: any) => r.exams?.subject_id === subjectId)
      .map((r: any) => ({
        exam_id: r.exams?.id,
        exam_title: r.exams?.title,
        exam_date: r.exams?.exam_date,
        total_marks: r.exams?.total_marks,
        marks_obtained: r.marks_obtained,
        percentage: r.percentage,
        grade: r.grade,
        subject_name: r.exams?.subjects?.name
      }))
      .sort((a: any, b: any) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime()) || []

    setExamResults(filtered)
  }

  const handleSubjectClick = async (subjectId: string) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null)
      setExamResults([])
    } else {
      setExpandedSubject(subjectId)
      await loadExamResults(subjectId)
    }
  }

  const filteredSubjects = subjects.filter(subject => {
    if (filterSubject !== 'all' && subject.subject_id !== filterSubject) return false
    if (searchQuery && !subject.subject_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const overallAverage = subjects.length > 0
    ? subjects.reduce((sum, s) => sum + (s.average_percentage || 0), 0) / subjects.length
    : 0

  const totalExams = subjects.reduce((sum, s) => sum + s.exam_count, 0)

  const bestSubject = subjects.length > 0
    ? subjects.reduce((best, current) => 
        (current.average_percentage || 0) > (best.average_percentage || 0) ? current : best
      )
    : null

  if (authLoading || loading) {
    return <DashboardLayout title="My Grades"><div>Loading...</div></DashboardLayout>
  }

  if (!studentInfo) {
    return (
      <DashboardLayout title="My Grades">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No student record found</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="My Grades">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">My Academic Performance</h1>
            <p className="text-gray-600">
              {studentInfo.classes?.grade_level} {studentInfo.classes?.section} - {studentInfo.classes?.schools?.name}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Subject</Label>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subj) => <SelectItem key={subj.subject_id} value={subj.subject_id}>{subj.subject_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Search</Label>
                <Input placeholder="Search subjects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Overall Average</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{overallAverage.toFixed(1)}%</div>
              <p className="text-xs opacity-80 mt-1">Across all subjects</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Exams</CardTitle>
              <FileText className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{totalExams}</div>
              <p className="text-xs opacity-80 mt-1">Completed this term</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Best Subject</CardTitle>
              <Award className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bestSubject?.subject_name || 'N/A'}</div>
              <p className="text-xs opacity-80 mt-1">
                {bestSubject ? `${bestSubject.average_percentage?.toFixed(1)}%` : 'No data'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Subject Performance</h2>
          <div className="space-y-2">
            {filteredSubjects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No exam results available yet
                </CardContent>
              </Card>
            ) : (
              filteredSubjects.map((subject) => {
                const isExpanded = expandedSubject === subject.subject_id

                return (
                  <Card key={subject.subject_id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => handleSubjectClick(subject.subject_id)}>
                    <CardHeader className="py-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <BookOpen className="w-8 h-8 text-blue-500" />
                          <div>
                            <CardTitle className="text-lg">{subject.subject_name}</CardTitle>
                            <p className="text-sm text-gray-500">{subject.exam_count} exams completed</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-2xl font-bold">{subject.average_percentage?.toFixed(1)}%</div>
                            <p className="text-xs text-gray-500">{subject.total_marks_obtained}/{subject.total_marks_possible} marks</p>
                          </div>
                          <Badge className={
                            subject.best_grade === 'A' ? 'bg-green-100 text-green-800 text-lg' :
                            subject.best_grade === 'B' ? 'bg-blue-100 text-blue-800 text-lg' :
                            subject.best_grade === 'C' ? 'bg-yellow-100 text-yellow-800 text-lg' :
                            subject.best_grade === 'D' ? 'bg-orange-100 text-orange-800 text-lg' :
                            'bg-red-100 text-red-800 text-lg'
                          }>{subject.best_grade || 'N/A'}</Badge>
                          {isExpanded ? <ChevronUp /> : <ChevronDown />}
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="border-t pt-4">
                        <h3 className="text-sm font-semibold mb-3">Exam History</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Exam</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Marks</TableHead>
                              <TableHead>Percentage</TableHead>
                              <TableHead>Grade</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {examResults.map((result) => (
                              <TableRow key={result.exam_id}>
                                <TableCell className="font-medium">{result.exam_title}</TableCell>
                                <TableCell className="text-sm text-gray-500">{result.exam_date}</TableCell>
                                <TableCell>{result.marks_obtained}/{result.total_marks}</TableCell>
                                <TableCell>{result.percentage.toFixed(1)}%</TableCell>
                                <TableCell>
                                  <Badge className={
                                    result.grade === 'A' ? 'bg-green-100 text-green-800' :
                                    result.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                    result.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                    result.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                                  }>{result.grade}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    )}
                  </Card>
                )
              })
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}