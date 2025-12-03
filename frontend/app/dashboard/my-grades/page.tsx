'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ExamResult {
  exam_id: string
  exam_title: string
  subject_name: string
  exam_date: string
  total_marks: number
  marks_obtained: number
  percentage: number
  grade: string
  remarks: string | null
  graded_at: string | null
}

export default function StudentGradesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [results, setResults] = useState<ExamResult[]>([])
  const [loading, setLoading] = useState(true)
  const [studentInfo, setStudentInfo] = useState<any>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile && profile.role === 'student') {
      fetchGrades()
    }
  }, [profile])

  const fetchGrades = async () => {
    try {
      setLoading(true)

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          roll_number,
          classes(
            grade_level,
            section
          )
        `)
        .eq('user_id', profile?.id)
        .single()

      if (studentError) throw studentError
      if (!studentData) {
        toast.error('Student record not found')
        return
      }

      setStudentInfo(studentData)

      const { data: resultsData, error: resultsError } = await supabase
        .from('exam_results')
        .select(`
          exam_id,
          marks_obtained,
          percentage,
          grade,
          remarks,
          graded_at,
          exams!inner(
            title,
            exam_date,
            total_marks,
            subjects(name)
          )
        `)
        .eq('student_id', studentData.id)
        .order('exams(exam_date)', { ascending: false })

      if (resultsError) throw resultsError

      const transformedResults = resultsData?.map((r: any) => ({
        exam_id: r.exam_id,
        exam_title: r.exams.title,
        subject_name: r.exams.subjects?.name || 'Unknown',
        exam_date: r.exams.exam_date,
        total_marks: r.exams.total_marks,
        marks_obtained: parseFloat(r.marks_obtained),
        percentage: parseFloat(r.percentage),
        grade: r.grade,
        remarks: r.remarks,
        graded_at: r.graded_at,
      })) || []

      setResults(transformedResults)
    } catch (error: any) {
      console.error('Error fetching grades:', error)
      toast.error('Failed to load grades')
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalExams: results.length,
    averagePercentage: results.length > 0
      ? (results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(2)
      : '0',
    highestGrade: results.length > 0
      ? ['A', 'B', 'C', 'D', 'E', 'F'][Math.min(...results.map(r => ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(r.grade)))]
      : null,
    lowestGrade: results.length > 0
      ? ['A', 'B', 'C', 'D', 'E', 'F'][Math.max(...results.map(r => ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(r.grade)))]
      : null,
  }

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: 'bg-green-500',
      B: 'bg-blue-500',
      C: 'bg-yellow-500',
      D: 'bg-orange-500',
      E: 'bg-red-400',
      F: 'bg-red-600',
    }
    return colors[grade] || 'bg-gray-500'
  }

  const getPerformanceTrend = (percentage: number) => {
    if (percentage >= 75) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (percentage >= 50) return <Minus className="h-4 w-4 text-yellow-600" />
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="My Grades">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) {
    return null
  }

  if (profile?.role !== 'student') {
    return (
      <DashboardLayout title="My Grades">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">This page is only accessible to students.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="My Grades">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>My Exam Results</CardTitle>
            <CardDescription>
              {studentInfo && (
                <span>
                  {studentInfo.classes?.grade_level} {studentInfo.classes?.section} - Roll: {studentInfo.roll_number}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalExams}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averagePercentage}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Highest Grade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.highestGrade || 'N/A'}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Lowest Grade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.lowestGrade || 'N/A'}</div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Marks</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        No exam results available yet. Your grades will appear here once exams are graded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map((result) => (
                      <TableRow key={result.exam_id}>
                        <TableCell className="font-medium">{result.exam_title}</TableCell>
                        <TableCell>{result.subject_name}</TableCell>
                        <TableCell>{new Date(result.exam_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-medium">
                          {result.marks_obtained} / {result.total_marks}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {result.percentage.toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <Badge className={getGradeColor(result.grade)}>{result.grade}</Badge>
                        </TableCell>
                        <TableCell>{getPerformanceTrend(result.percentage)}</TableCell>
                        <TableCell className="text-sm text-gray-600">{result.remarks || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Grading Scale</h4>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">A</Badge>
                  <span className="text-gray-600">90-100%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500">B</Badge>
                  <span className="text-gray-600">80-89%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-500">C</Badge>
                  <span className="text-gray-600">70-79%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-500">D</Badge>
                  <span className="text-gray-600">60-69%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-400">E</Badge>
                  <span className="text-gray-600">50-59%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600">F</Badge>
                  <span className="text-gray-600">&lt;50%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}