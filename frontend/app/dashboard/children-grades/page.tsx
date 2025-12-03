'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react'

interface Child {
  id: string
  user_id: string
  full_name: string
  username: string
  roll_number: string
  grade_level: string
  section: string
  class_id: string
}

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

interface ChildWithResults extends Child {
  results: ExamResult[]
  stats: {
    totalExams: number
    averagePercentage: string
    highestGrade: string | null
    lowestGrade: string | null
  }
}

export default function ParentGradesViewPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [children, setChildren] = useState<ChildWithResults[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChild, setSelectedChild] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile && profile.role === 'parent') {
      fetchChildrenAndGrades()
    }
  }, [profile])

  const fetchChildrenAndGrades = async () => {
    try {
      setLoading(true)

      console.log('=== FETCHING CHILDREN ===')
      console.log('Parent ID:', profile?.id)

      const { data: childrenData, error: childrenError } = await supabase
        .from('students')
        .select('id, user_id, roll_number, class_id, profiles!students_user_id_fkey(full_name, username), classes(grade_level, section)')
        .eq('parent_id', profile?.id)

      console.log('Children data:', childrenData)
      console.log('Children error:', childrenError)

      if (childrenError) throw childrenError

      if (!childrenData || childrenData.length === 0) {
        toast.info('No children linked to your account yet.')
        setLoading(false)
        return
      }

      const childrenWithResults = await Promise.all(
        childrenData.map(async (child: any) => {
          console.log(`\n=== PROCESSING CHILD: ${child.profiles?.full_name} ===`)
          console.log('Student ID:', child.id)

          const { data: resultsData, error: resultsError } = await supabase
            .from('exam_results')
            .select('exam_id, marks_obtained, percentage, grade, remarks, graded_at')
            .eq('student_id', child.id)

          console.log('Results data:', resultsData)
          console.log('Results error:', resultsError)

          if (resultsError) {
            console.error('Error fetching results:', resultsError)
          }

          if (!resultsData || resultsData.length === 0) {
            console.log('No results found for this student')
            return {
              id: child.id,
              user_id: child.user_id,
              full_name: child.profiles?.full_name || 'Unknown',
              username: child.profiles?.username || 'Unknown',
              roll_number: child.roll_number,
              grade_level: child.classes?.grade_level || 'Unknown',
              section: child.classes?.section || '',
              class_id: child.class_id,
              results: [],
              stats: { totalExams: 0, averagePercentage: '0', highestGrade: null, lowestGrade: null },
            }
          }

          console.log(`Found ${resultsData.length} results`)

          const examIds = resultsData.map(r => r.exam_id)
          console.log('Exam IDs:', examIds)

          const { data: examsData, error: examsError } = await supabase
            .from('exams')
            .select('id, title, exam_date, total_marks, subject_id')
            .in('id', examIds)

          console.log('Exams data:', examsData)
          console.log('Exams error:', examsError)

          const subjectIds = examsData?.map(e => e.subject_id).filter(Boolean) || []
          console.log('Subject IDs:', subjectIds)

          const { data: subjectsData, error: subjectsError } = await supabase
            .from('subjects')
            .select('id, name')
            .in('id', subjectIds)

          console.log('Subjects data:', subjectsData)
          console.log('Subjects error:', subjectsError)

          const results: ExamResult[] = resultsData.map((result) => {
            const exam = examsData?.find(e => e.id === result.exam_id)
            const subject = subjectsData?.find(s => s.id === exam?.subject_id)

            console.log('Building result:', {
              exam_id: result.exam_id,
              exam_title: exam?.title,
              subject_name: subject?.name,
              marks: result.marks_obtained,
              grade: result.grade,
            })

            return {
              exam_id: result.exam_id,
              exam_title: exam?.title || 'Unknown Exam',
              subject_name: subject?.name || 'Unknown Subject',
              exam_date: exam?.exam_date || '',
              total_marks: exam?.total_marks || 0,
              marks_obtained: parseFloat(result.marks_obtained),
              percentage: parseFloat(result.percentage),
              grade: result.grade,
              remarks: result.remarks,
              graded_at: result.graded_at,
            }
          }).sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime())

          console.log('Final results array:', results)

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

          console.log('Stats:', stats)

          return {
            id: child.id,
            user_id: child.user_id,
            full_name: child.profiles?.full_name || 'Unknown',
            username: child.profiles?.username || 'Unknown',
            roll_number: child.roll_number,
            grade_level: child.classes?.grade_level || 'Unknown',
            section: child.classes?.section || '',
            class_id: child.class_id,
            results,
            stats,
          }
        })
      )

      console.log('\n=== FINAL CHILDREN WITH RESULTS ===')
      console.log(childrenWithResults)

      setChildren(childrenWithResults)
      
      if (childrenWithResults.length > 0) {
        setSelectedChild(childrenWithResults[0].id)
      }
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load grades')
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: 'bg-green-500', B: 'bg-blue-500', C: 'bg-yellow-500',
      D: 'bg-orange-500', E: 'bg-red-400', F: 'bg-red-600',
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
      <DashboardLayout title="Children Grades">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) return null

  if (profile?.role !== 'parent') {
    return (
      <DashboardLayout title="Children Grades">
        <Card><CardContent className="pt-6"><p className="text-gray-600">This page is only for parents.</p></CardContent></Card>
      </DashboardLayout>
    )
  }

  if (children.length === 0) {
    return (
      <DashboardLayout title="Children Grades">
        <Card>
          <CardHeader><CardTitle>My Children</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Children Linked</h3>
              <p className="text-gray-600">Contact school administration.</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Children Grades">
      <Card>
        <CardHeader><CardTitle>Academic Performance</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={selectedChild || ''} onValueChange={setSelectedChild}>
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${children.length}, 1fr)` }}>
              {children.map((child) => (
                <TabsTrigger key={child.id} value={child.id}>{child.full_name}</TabsTrigger>
              ))}
            </TabsList>

            {children.map((child) => (
              <TabsContent key={child.id} value={child.id} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-lg">{child.full_name}</h3>
                    <p className="text-sm text-gray-600">{child.grade_level} {child.section} - Roll: {child.roll_number}</p>
                  </div>
                  <Badge variant="outline">{child.username}</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{child.stats.totalExams}</div></CardContent></Card>
                  <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Average</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{child.stats.averagePercentage}%</div></CardContent></Card>
                  <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Highest</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{child.stats.highestGrade || 'N/A'}</div></CardContent></Card>
                  <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Lowest</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{child.stats.lowestGrade || 'N/A'}</div></CardContent></Card>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead><TableHead>Subject</TableHead><TableHead>Date</TableHead>
                      <TableHead className="text-right">Marks</TableHead><TableHead className="text-right">%</TableHead>
                      <TableHead>Grade</TableHead><TableHead>Trend</TableHead><TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {child.results.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8">No results yet</TableCell></TableRow>
                    ) : (
                      child.results.map((result) => (
                        <TableRow key={result.exam_id}>
                          <TableCell className="font-medium">{result.exam_title}</TableCell>
                          <TableCell>{result.subject_name}</TableCell>
                          <TableCell>{new Date(result.exam_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">{result.marks_obtained}/{result.total_marks}</TableCell>
                          <TableCell className="text-right">{result.percentage.toFixed(1)}%</TableCell>
                          <TableCell><Badge className={getGradeColor(result.grade)}>{result.grade}</Badge></TableCell>
                          <TableCell>{getPerformanceTrend(result.percentage)}</TableCell>
                          <TableCell>{result.remarks || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}