'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Trophy, TrendingUp, TrendingDown, Minus, BookOpen, Award, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface TestResult {
  id: string
  test_title: string
  test_type: string
  test_date: string
  subject_name: string
  marks_obtained: number
  total_marks: number
  percentage: number
  grade: string
  comment: string | null
  is_published: boolean
  test_paper_url: string | null
  test_paper_name: string | null
}

interface SubjectStats {
  subject_name: string
  total_tests: number
  average_percentage: number
  highest: number
  lowest: number
  trend: 'up' | 'down' | 'stable'
}

export default function StudentGradesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [results, setResults] = useState<TestResult[]>([])
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([])
  const [loading, setLoading] = useState(true)
  const [overallAverage, setOverallAverage] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'student') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'student') {
      loadGrades()
    }
  }, [profile])

  const loadGrades = async () => {
    if (!profile?.id) return

    setLoading(true)
    try {
      // Get student record
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', profile.id)
        .single()

      if (!studentData) {
        toast.error('Student record not found')
        return
      }

      // Fetch only PUBLISHED test results
      const { data: resultsData, error } = await supabase
        .from('term_test_results')
        .select(`
          id,
          marks_obtained,
          percentage,
          grade,
          comment,
          term_tests!inner(
            id,
            title,
            test_type,
            test_date,
            total_marks,
            is_published,
            test_paper_url,
            test_paper_name,
            subjects(name)
          )
        `)
        .eq('student_id', studentData.id)
        .eq('term_tests.is_published', true)
        .order('term_tests(test_date)', { ascending: false })

      if (error) throw error

      const formatted: TestResult[] = (resultsData || []).map((r: any) => ({
        id: r.id,
        test_title: r.term_tests.title,
        test_type: r.term_tests.test_type,
        test_date: r.term_tests.test_date,
        subject_name: r.term_tests.subjects?.name || 'Unknown',
        marks_obtained: r.marks_obtained,
        total_marks: r.term_tests.total_marks,
        percentage: r.percentage,
        grade: r.grade,
        comment: r.comment,
        is_published: r.term_tests.is_published,
        test_paper_url: r.term_tests.test_paper_url,
        test_paper_name: r.term_tests.test_paper_name
      }))

      setResults(formatted)
      calculateStats(formatted)
    } catch (error: any) {
      console.error('Error loading grades:', error)
      toast.error('Failed to load grades')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (results: TestResult[]) => {
    // Calculate overall average
    if (results.length > 0) {
      const sum = results.reduce((acc, r) => acc + r.percentage, 0)
      setOverallAverage(sum / results.length)
    }

    // Group by subject
    const subjectMap = new Map<string, TestResult[]>()
    results.forEach(r => {
      if (!subjectMap.has(r.subject_name)) {
        subjectMap.set(r.subject_name, [])
      }
      subjectMap.get(r.subject_name)!.push(r)
    })

    // Calculate subject stats
    const stats: SubjectStats[] = Array.from(subjectMap.entries()).map(([subject, tests]) => {
      const percentages = tests.map(t => t.percentage)
      const average = percentages.reduce((a, b) => a + b, 0) / percentages.length
      const highest = Math.max(...percentages)
      const lowest = Math.min(...percentages)

      // Determine trend (compare first half vs second half)
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (tests.length >= 4) {
        const mid = Math.floor(tests.length / 2)
        const firstHalfAvg = tests.slice(0, mid).reduce((a, t) => a + t.percentage, 0) / mid
        const secondHalfAvg = tests.slice(mid).reduce((a, t) => a + t.percentage, 0) / (tests.length - mid)
        if (secondHalfAvg > firstHalfAvg + 5) trend = 'up'
        else if (secondHalfAvg < firstHalfAvg - 5) trend = 'down'
      }

      return {
        subject_name: subject,
        total_tests: tests.length,
        average_percentage: average,
        highest,
        lowest,
        trend
      }
    })

    setSubjectStats(stats.sort((a, b) => b.average_percentage - a.average_percentage))
  }

  const getGradeBadgeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500'
      case 'B': return 'bg-blue-500'
      case 'C': return 'bg-yellow-500'
      case 'D': return 'bg-orange-500'
      case 'E': return 'bg-red-400'
      case 'F': return 'bg-red-600'
      default: return 'bg-gray-500'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />
      default: return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="My Grades">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading grades...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'student') return null

  return (
    <DashboardLayout title="My Grades (Term Tests)">
      <div className="space-y-6">
        {/* Overall Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Overall Average</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{overallAverage.toFixed(1)}%</div>
              <p className="text-xs text-gray-500 mt-1">{results.length} tests published</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{subjectStats.length}</div>
              <p className="text-xs text-gray-500 mt-1">with published grades</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{results.length}</div>
              <p className="text-xs text-gray-500 mt-1">completed & graded</p>
            </CardContent>
          </Card>
        </div>

        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Subject Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subjectStats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No published grades available yet</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Tests</TableHead>
                      <TableHead>Average</TableHead>
                      <TableHead>Highest</TableHead>
                      <TableHead>Lowest</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectStats.map((stat) => (
                      <TableRow key={stat.subject_name}>
                        <TableCell className="font-medium">{stat.subject_name}</TableCell>
                        <TableCell>{stat.total_tests}</TableCell>
                        <TableCell>
                          <span className="font-bold text-lg">{stat.average_percentage.toFixed(1)}%</span>
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">{stat.highest.toFixed(0)}%</TableCell>
                        <TableCell className="text-red-600 font-medium">{stat.lowest.toFixed(0)}%</TableCell>
                        <TableCell>{getTrendIcon(stat.trend)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              All Term Test Results
            </CardTitle>
            <p className="text-sm text-gray-500 mt-2">
              Only published test results are shown here. For exam grades, check your E-Report.
            </p>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No test results available yet</p>
                <p className="text-sm mt-2">Your teacher will publish test results soon</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead className="text-right">Paper</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{result.test_title}</p>
                            <p className="text-xs text-gray-500 capitalize">{result.test_type.replace('-', ' ')}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{result.subject_name}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(result.test_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <span className="font-medium">{result.marks_obtained}</span>
                          <span className="text-gray-500">/{result.total_marks}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-lg">{result.percentage.toFixed(1)}%</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getGradeBadgeColor(result.grade)}>{result.grade}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-600 max-w-xs line-clamp-2">
                            {result.comment || '-'}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          {result.test_paper_url ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(result.test_paper_url!, '_blank')}
                              title={result.test_paper_name || 'Download test paper'}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">About Grades</h3>
                <p className="text-sm text-blue-700">
                  This page shows your term test results that have been published by your teachers. 
                  For your full exam report card with all subjects and final grades, please visit the 
                  <strong> E-Report</strong> section.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
