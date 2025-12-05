'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { UserCircle, BookOpen, ChevronDown, ChevronUp, GraduationCap, TrendingUp } from 'lucide-react'

interface Child {
  id: string
  user_id: string
  username: string
  full_name: string
  class_id: string
  grade_level: string
  section: string
  school_name: string
  average_grade: number | null
  total_exams: number
}

interface Subject {
  subject_id: string
  subject_name: string
  exam_count: number
  average_percentage: number | null
  best_grade: string | null
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

export default function ChildrenGradesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [examResults, setExamResults] = useState<ExamResult[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedChild, setExpandedChild] = useState<string | null>(null)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile?.role !== 'parent') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'parent') {
      loadData()
    }
  }, [profile])

  const loadData = async () => {
    setLoading(true)

    const { data: childrenData } = await supabase
      .from('students')
      .select(`
        id,
        user_id,
        class_id,
        profiles!students_user_id_fkey(username, full_name),
        classes(grade_level, section, school_id, schools(name))
      `)
      .eq('parent_id', profile?.id)

    const childrenWithStats = await Promise.all(
      (childrenData || []).map(async (child: any) => {
        const { data: resultsData } = await supabase
          .from('exam_results')
          .select('percentage, grade')
          .eq('student_id', child.id)
          .not('percentage', 'is', null)

        const avgGrade = resultsData && resultsData.length > 0
          ? resultsData.reduce((sum, r) => sum + (r.percentage || 0), 0) / resultsData.length
          : null

        return {
          id: child.id,
          user_id: child.user_id,
          username: child.profiles?.username || 'Unknown',
          full_name: child.profiles?.full_name || 'Unknown',
          class_id: child.class_id,
          grade_level: child.classes?.grade_level || 'N/A',
          section: child.classes?.section || '',
          school_name: child.classes?.schools?.name || 'Unknown',
          average_grade: avgGrade,
          total_exams: resultsData?.length || 0
        }
      })
    )

    setChildren(childrenWithStats)
    setLoading(false)
  }

  const loadSubjects = async (childId: string) => {
    const { data: resultsData } = await supabase
      .from('exam_results')
      .select(`
        percentage,
        grade,
        exams(subject_id, subjects(name))
      `)
      .eq('student_id', childId)
      .not('percentage', 'is', null)

    const subjectMap = new Map<string, { name: string; percentages: number[]; grades: string[] }>()

    resultsData?.forEach((result: any) => {
      const subjectId = result.exams?.subject_id
      const subjectName = result.exams?.subjects?.name
      if (!subjectId || !subjectName) return

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, { name: subjectName, percentages: [], grades: [] })
      }
      subjectMap.get(subjectId)!.percentages.push(result.percentage)
      subjectMap.get(subjectId)!.grades.push(result.grade)
    })

    const subjectsArray: Subject[] = Array.from(subjectMap.entries()).map(([subjectId, data]) => ({
      subject_id: subjectId,
      subject_name: data.name,
      exam_count: data.percentages.length,
      average_percentage: data.percentages.reduce((sum, p) => sum + p, 0) / data.percentages.length,
      best_grade: data.grades.sort()[0]
    }))

    setSubjects(subjectsArray)
  }

  const loadExamResults = async (childId: string, subjectId: string) => {
    const { data: resultsData } = await supabase
      .from('exam_results')
      .select(`
        marks_obtained,
        percentage,
        grade,
        exams(id, title, exam_date, total_marks, subject_id, subjects(name))
      `)
      .eq('student_id', childId)
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
      })) || []

    setExamResults(filtered)
  }

  const handleChildClick = async (childId: string) => {
    if (expandedChild === childId) {
      setExpandedChild(null)
      setSubjects([])
    } else {
      setExpandedChild(childId)
      await loadSubjects(childId)
    }
  }

  const handleSubjectClick = async (childId: string, subjectId: string) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null)
      setExamResults([])
    } else {
      setExpandedSubject(subjectId)
      await loadExamResults(childId, subjectId)
    }
  }

  const filteredChildren = children.filter(child => {
    if (selectedChild !== 'all' && child.id !== selectedChild) return false
    return true
  })

  if (authLoading || loading) {
    return <DashboardLayout title="My Children's Grades"><div>Loading...</div></DashboardLayout>
  }

  if (children.length === 0) {
    return (
      <DashboardLayout title="My Children's Grades">
        <Card>
          <CardContent className="py-12 text-center">
            <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No children linked to your account</p>
            <p className="text-sm text-gray-400">Please contact the school to link your children</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="My Children's Grades">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">View your children's academic performance</p>
        </div>

        {children.length > 1 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Select Child</Label>
                  <Select value={selectedChild} onValueChange={setSelectedChild}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Children</SelectItem>
                      {children.map((child) => <SelectItem key={child.id} value={child.id}>{child.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject Filter</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map((subj) => <SelectItem key={subj.subject_id} value={subj.subject_id}>{subj.subject_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">Total Children</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold">{filteredChildren.length}</div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">Average Grade</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {filteredChildren.filter(c => c.average_grade !== null).length > 0
                  ? (filteredChildren.reduce((sum, c) => sum + (c.average_grade || 0), 0) / filteredChildren.filter(c => c.average_grade !== null).length).toFixed(1) + '%'
                  : 'N/A'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">Total Exams</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold">{filteredChildren.reduce((sum, c) => sum + c.total_exams, 0)}</div></CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {filteredChildren.map((child) => {
            const isExpanded = expandedChild === child.id

            return (
              <div key={child.id}>
                <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => handleChildClick(child.id)}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <UserCircle className="w-12 h-12 text-gray-400" />
                        <div>
                          <CardTitle className="text-xl">{child.full_name}</CardTitle>
                          <p className="text-sm text-gray-500">{child.username}</p>
                          <p className="text-sm text-gray-500">{child.grade_level} {child.section} - {child.school_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="font-bold text-lg">{child.average_grade !== null ? child.average_grade.toFixed(1) + '%' : 'N/A'}</span>
                          </div>
                          <p className="text-xs text-gray-500">{child.total_exams} exams</p>
                        </div>
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {isExpanded && subjects.length > 0 && (
                  <div className="ml-8 mt-2 space-y-2">
                    {subjects.filter(subj => selectedSubject === 'all' || subj.subject_id === selectedSubject).map((subject) => {
                      const isSubjectExpanded = expandedSubject === subject.subject_id

                      return (
                        <Card key={subject.subject_id} className="cursor-pointer hover:shadow-md" onClick={(e) => { e.stopPropagation(); handleSubjectClick(child.id, subject.subject_id) }}>
                          <CardHeader className="py-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <BookOpen className="w-6 h-6 text-blue-500" />
                                <div>
                                  <CardTitle className="text-base">{subject.subject_name}</CardTitle>
                                  <p className="text-xs text-gray-500">{subject.exam_count} exams</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="text-lg">{subject.average_percentage?.toFixed(1)}%</Badge>
                                <Badge className={
                                  subject.best_grade === 'A' ? 'bg-green-100 text-green-800' :
                                  subject.best_grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                  subject.best_grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }>{subject.best_grade || 'N/A'}</Badge>
                                {isSubjectExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </CardHeader>

                          {isSubjectExpanded && (
                            <CardContent className="border-t pt-3">
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
                    })}
                  </div>
                )}

                {isExpanded && subjects.length === 0 && (
                  <Card className="ml-8 mt-2">
                    <CardContent className="py-6 text-center text-gray-500">
                      No exam results available yet
                    </CardContent>
                  </Card>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}