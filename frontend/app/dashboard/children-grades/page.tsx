/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { UserCircle, BookOpen, ChevronDown, ChevronUp, FileText, Download, Upload, Calendar, TrendingUp } from 'lucide-react'

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
  total_assessments: number
}

interface Subject {
  subject_id: string
  subject_name: string
  assessment_count: number
  average_percentage: number | null
}

interface Assignment {
  id: string
  title: string
  due_date: string
  total_marks: number
  subject_name: string
  assignment_file_url: string | null
  submission_file_url: string | null
  submitted_at: string | null
  marks_obtained: number | null
  type: 'assignment'
}

interface TermTest {
  id: string
  title: string
  date: string
  total_marks: number
  subject_name: string
  test_paper_url: string | null
  marks_obtained: number | null
  type: 'test'
}

type Assessment = Assignment | TermTest

export default function ChildrenGradesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
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
        // Get assignment submissions
        const { data: assignmentsData } = await supabase
          .from('assignment_submissions')
          .select('marks_obtained')
          .eq('student_id', child.id)
          .not('marks_obtained', 'is', null)

        // Get term test results
        const { data: testResultsData } = await supabase
          .from('term_test_results')
          .select('marks_obtained, term_tests(total_marks)')
          .eq('student_id', child.id)

        // Calculate combined average
        let totalPercentage = 0
        let totalCount = 0

        if (assignmentsData && assignmentsData.length > 0) {
          assignmentsData.forEach((a: any) => {
            if (a.marks_obtained !== null) {
              totalCount++
              totalPercentage += a.marks_obtained // Assignments already in percentage
            }
          })
        }

        if (testResultsData && testResultsData.length > 0) {
          testResultsData.forEach((result: any) => {
            const testData = Array.isArray(result.term_tests) ? result.term_tests[0] : result.term_tests
            const totalMarks = testData?.total_marks || 100
            const percentage = (result.marks_obtained / totalMarks) * 100
            totalPercentage += percentage
            totalCount++
          })
        }

        const avgGrade = totalCount > 0 ? totalPercentage / totalCount : null

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
          total_assessments: totalCount
        }
      })
    )

    setChildren(childrenWithStats)
    setLoading(false)
  }

  const loadSubjects = async (childId: string) => {
    // Get assignments for this child
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select(`
        id,
        subject_id,
        subjects(name),
        assignment_submissions!inner(marks_obtained, student_id)
      `)
      .eq('assignment_submissions.student_id', childId)

    // Get term tests for this child
    const { data: testsData } = await supabase
      .from('term_test_results')
      .select(`
        marks_obtained,
        term_tests(subject_id, total_marks, subjects(name))
      `)
      .eq('student_id', childId)

    const subjectMap = new Map<string, { name: string; percentages: number[]; count: number }>()

    // Add assignments to subject map
    assignmentsData?.forEach((assignment: any) => {
      const subjectId = assignment.subject_id
      const subjectName = assignment.subjects?.name
      if (!subjectId || !subjectName) return

      const submission = assignment.assignment_submissions?.find((s: any) => s.student_id === childId)
      if (submission && submission.marks_obtained !== null) {
        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, { name: subjectName, percentages: [], count: 0 })
        }
        subjectMap.get(subjectId)!.percentages.push(submission.marks_obtained)
        subjectMap.get(subjectId)!.count++
      }
    })

    // Add term tests to subject map
    testsData?.forEach((result: any) => {
      const testData = Array.isArray(result.term_tests) ? result.term_tests[0] : result.term_tests
      const subjectId = testData?.subject_id
      const subjectName = testData?.subjects?.name
      const totalMarks = testData?.total_marks || 100
      
      if (!subjectId || !subjectName) return

      const percentage = (result.marks_obtained / totalMarks) * 100

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, { name: subjectName, percentages: [], count: 0 })
      }
      subjectMap.get(subjectId)!.percentages.push(percentage)
      subjectMap.get(subjectId)!.count++
    })

    const subjectsArray: Subject[] = Array.from(subjectMap.entries()).map(([subjectId, data]) => ({
      subject_id: subjectId,
      subject_name: data.name,
      assessment_count: data.count,
      average_percentage: data.percentages.length > 0 
        ? data.percentages.reduce((sum, p) => sum + p, 0) / data.percentages.length 
        : null
    }))

    setSubjects(subjectsArray)
  }

  const loadAssessments = async (childId: string, subjectId: string) => {
    const allAssessments: Assessment[] = []

    // Get assignments
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        due_date,
        total_marks,
        file_url,
        subjects(name),
        assignment_submissions!inner(
          submission_file_url,
          submitted_at,
          marks_obtained,
          student_id
        )
      `)
      .eq('subject_id', subjectId)
      .eq('assignment_submissions.student_id', childId)

    assignmentsData?.forEach((a: any) => {
      const submission = a.assignment_submissions?.find((s: any) => s.student_id === childId)
      if (submission) {
        allAssessments.push({
          id: a.id,
          title: a.title,
          due_date: a.due_date,
          total_marks: a.total_marks,
          subject_name: a.subjects?.name || 'Unknown',
          assignment_file_url: a.file_url,
          submission_file_url: submission.submission_file_url,
          submitted_at: submission.submitted_at,
          marks_obtained: submission.marks_obtained,
          type: 'assignment'
        })
      }
    })

    // Get term tests for this subject
    const { data: testsData } = await supabase
      .from('term_test_results')
      .select(`
        marks_obtained,
        term_tests(
          id,
          title,
          test_date,
          total_marks,
          test_paper_url,
          subject_id,
          subjects(name)
        )
      `)
      .eq('student_id', childId)

    testsData?.forEach((result: any) => {
      const testData = Array.isArray(result.term_tests) ? result.term_tests[0] : result.term_tests
      // Filter by subject_id in JavaScript
      if (testData && testData.subject_id === subjectId && testData.subjects?.name) {
        allAssessments.push({
          id: testData.id,
          title: testData.title || 'Term Test',
          date: testData.test_date,
          total_marks: testData.total_marks || 100,
          subject_name: testData.subjects.name,
          test_paper_url: testData.test_paper_url,
          marks_obtained: result.marks_obtained,
          type: 'test'
        })
      }
    })

    // Sort by date (newest first)
    allAssessments.sort((a, b) => {
      const dateA = 'due_date' in a ? a.due_date : a.date
      const dateB = 'due_date' in b ? b.due_date : b.date
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

    setAssessments(allAssessments)
  }

  const handleChildClick = async (childId: string) => {
    if (expandedChild === childId) {
      setExpandedChild(null)
      setSubjects([])
      setExpandedSubject(null)
      setAssessments([])
    } else {
      setExpandedChild(childId)
      await loadSubjects(childId)
    }
  }

  const handleSubjectClick = async (childId: string, subjectId: string) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null)
      setAssessments([])
    } else {
      setExpandedSubject(subjectId)
      await loadAssessments(childId, subjectId)
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
          <p className="text-gray-600">View your children&apos;s academic performance</p>
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
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">Total Assessments</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold">{filteredChildren.reduce((sum, c) => sum + c.total_assessments, 0)}</div></CardContent>
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
                          <p className="text-xs text-gray-500">{child.total_assessments} assessments</p>
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
                                  <p className="text-xs text-gray-500">{subject.assessment_count} assessments</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="text-lg">{subject.average_percentage?.toFixed(1)}%</Badge>
                                {isSubjectExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </CardHeader>

                          {isSubjectExpanded && (
                            <CardContent className="border-t pt-3">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Assignment File</TableHead>
                                    <TableHead>Submission</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {assessments.map((assessment) => (
                                    <TableRow key={`${assessment.type}-${assessment.id}`}>
                                      <TableCell>
                                        {assessment.type === 'assignment' ? (
                                          <Badge className="bg-blue-100 text-blue-800">📝 Assignment</Badge>
                                        ) : (
                                          <Badge className="bg-purple-100 text-purple-800">📊 Test</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {assessment.title}
                                      </TableCell>
                                      <TableCell className="text-sm text-gray-500">
                                        {new Date('due_date' in assessment ? assessment.due_date : assessment.date).toLocaleDateString('en-US', { 
                                          year: 'numeric', 
                                          month: 'short', 
                                          day: 'numeric' 
                                        })}
                                      </TableCell>
                                      <TableCell>
                                        {assessment.type === 'assignment' && assessment.assignment_file_url ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              window.open(assessment.assignment_file_url!, '_blank')
                                            }}
                                          >
                                            📥 Assignment
                                          </Button>
                                        ) : assessment.type === 'test' && assessment.test_paper_url ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              window.open(assessment.test_paper_url!, '_blank')
                                            }}
                                          >
                                            📥 Test Paper
                                          </Button>
                                        ) : (
                                          <span className="text-gray-400">No file</span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {assessment.type === 'assignment' && assessment.submission_file_url ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="bg-green-50"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              window.open(assessment.submission_file_url!, '_blank')
                                            }}
                                          >
                                            📄 View Submission
                                          </Button>
                                        ) : (
                                          <span className="text-gray-400">No submission</span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {assessment.marks_obtained !== null ? (
                                          <span className="font-semibold">{assessment.marks_obtained}/{assessment.total_marks}</span>
                                        ) : (
                                          <span className="text-gray-400">Not graded</span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {assessment.marks_obtained !== null ? (
                                          <Badge className="bg-blue-100 text-blue-800">✓ Graded</Badge>
                                        ) : (
                                          <Badge className="bg-yellow-100 text-yellow-800">⏳ Pending</Badge>
                                        )}
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
                      No assignments or tests available yet
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