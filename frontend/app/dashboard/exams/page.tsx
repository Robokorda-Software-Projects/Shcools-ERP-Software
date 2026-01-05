'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { getCurrentTerm, getTermLabel, getDefaultExamDate } from '@/lib/term-utils'
import { 
  FileText, CheckCircle, Clock, ChevronDown, ChevronUp, 
  Download, Users, Search, UserCircle, BookOpen, GraduationCap,
  Lock, Unlock, Settings, CalendarClock, Send, Trash2, Plus, Edit
} from 'lucide-react'
import Link from 'next/link'

interface Exam {
  id: string
  title: string
  description: string
  exam_date: string
  total_marks: number
  class_id: string
  class_name: string
  subject_id: string
  subject_name: string
  is_submitted: boolean
  exam_paper_url: string | null
  graded_count: number
  total_students: number
}

interface TeacherWithExams {
  id: string
  full_name: string
  username: string
  exams: Exam[]
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

interface MarkingPeriod {
  id: string
  term: string
  academic_year: string
  start_date: string
  end_date: string
  is_active: boolean
  results_published: boolean
}

interface ClassSubjectOption {
  class_id: string
  subject_id: string
  class_name: string
  subject_name: string
  teacher_id: string
  teacher_name: string
}

export default function AdminExamsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [teachersWithExams, setTeachersWithExams] = useState<TeacherWithExams[]>([])
  const [markingPeriod, setMarkingPeriod] = useState<MarkingPeriod | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTerm, setCurrentTerm] = useState(getTermLabel())
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'pending' | 'grading'>('all')
  
  // Expanded states
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null)
  const [expandedExam, setExpandedExam] = useState<string | null>(null)
  const [studentResults, setStudentResults] = useState<StudentResult[]>([])
  
  // Add Exam Dialog state
  const [isAddExamDialogOpen, setIsAddExamDialogOpen] = useState(false)
  const [classSubjectOptions, setClassSubjectOptions] = useState<ClassSubjectOption[]>([])
  const [selectedClassSubject, setSelectedClassSubject] = useState('')
  const [newExamTitle, setNewExamTitle] = useState('')
  const [newExamDate, setNewExamDate] = useState('')
  const [newExamMarks, setNewExamMarks] = useState('100')
  const [isCreatingExam, setIsCreatingExam] = useState(false)
  
  // Publish dialog state
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && !['school_admin', 'super_admin'].includes(profile.role)) {
      // Redirect teachers to their exams page
      if (profile.role === 'teacher') {
        router.push('/dashboard/teacher-exams')
      } else {
        router.push('/dashboard')
        toast.error('Access denied - Admin only')
      }
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.school_id) {
      loadData()
    }
  }, [profile])

  const loadData = async () => {
    setLoading(true)
    try {
      // Get current term info
      const termInfo = getCurrentTerm()
      setCurrentTerm(getTermLabel(termInfo))

      // Check for active marking period
      const { data: periods } = await supabase
        .from('exam_marking_periods')
        .select('*')
        .eq('school_id', profile?.school_id)
        .order('created_at', { ascending: false })
        .limit(1)

      console.log('Exams page - Marking periods loaded:', {
        adminSchoolId: profile?.school_id,
        periodsFound: periods,
        firstPeriod: periods?.[0]
      })

      if (periods && periods.length > 0) {
        setMarkingPeriod(periods[0])
      } else {
        setMarkingPeriod(null)
      }

      // Load all teachers with their assignments
      const { data: teachersData } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .eq('role', 'teacher')
        .eq('school_id', profile?.school_id)
        .order('full_name')

      // For each teacher, get their assignments and exams
      const teachersWithExamsData: TeacherWithExams[] = []

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

        // Get exams for this teacher (created by them or for their classes)
        const classIds = assignments?.map(a => a.class_id) || []
        
        if (classIds.length === 0) {
          teachersWithExamsData.push({
            id: teacher.id,
            full_name: teacher.full_name,
            username: teacher.username,
            exams: [],
            totalClasses: 0,
            totalSubjects: 0
          })
          continue
        }

        const { data: examsData } = await supabase
          .from('exams')
          .select(`
            id, title, description, exam_date, total_marks, 
            class_id, subject_id, created_by,
            exam_paper_url, exam_paper_name, is_submitted, submitted_at,
            classes(grade_level, section),
            subjects(name)
          `)
          .eq('school_id', profile?.school_id)
          .eq('created_by', teacher.id)
          .order('exam_date', { ascending: false })

        // Get grading counts
        const examsWithCounts: Exam[] = await Promise.all(
          (examsData || []).map(async (exam: any) => {
            const { count: totalCount } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('class_id', exam.class_id)
            
            const { count: gradedCount } = await supabase
              .from('exam_results')
              .select('*', { count: 'exact', head: true })
              .eq('exam_id', exam.id)
              .not('marks_obtained', 'is', null)

            return {
              id: exam.id,
              title: exam.title,
              description: exam.description,
              exam_date: exam.exam_date,
              total_marks: exam.total_marks,
              class_id: exam.class_id,
              class_name: `${exam.classes?.grade_level || ''} ${exam.classes?.section || ''}`,
              subject_id: exam.subject_id,
              subject_name: exam.subjects?.name || 'Unknown',
              is_submitted: exam.is_submitted || false,
              exam_paper_url: exam.exam_paper_url || null,
              graded_count: gradedCount || 0,
              total_students: totalCount || 0
            }
          })
        )

        teachersWithExamsData.push({
          id: teacher.id,
          full_name: teacher.full_name,
          username: teacher.username,
          exams: examsWithCounts,
          totalClasses: uniqueClasses.size,
          totalSubjects: uniqueSubjects.size
        })
      }

      // Sort by number of exams (teachers with exams first)
      teachersWithExamsData.sort((a, b) => b.exams.length - a.exams.length)

      setTeachersWithExams(teachersWithExamsData)
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentResults = async (examId: string, classId: string) => {
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, profiles!students_user_id_fkey(full_name)')
        .eq('class_id', classId)
        .order('profiles(full_name)')

      const { data: resultsData } = await supabase
        .from('exam_results')
        .select('*')
        .eq('exam_id', examId)

      const results: StudentResult[] = (studentsData || []).map((student: any) => {
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
      setExpandedExam(null)
    } else {
      setExpandedTeacher(teacherId)
      setExpandedExam(null)
    }
  }

  const handleExpandExam = async (examId: string, classId: string) => {
    if (expandedExam === examId) {
      setExpandedExam(null)
      setStudentResults([])
    } else {
      setExpandedExam(examId)
      await loadStudentResults(examId, classId)
    }
  }

  const handlePublishResults = async () => {
    if (!markingPeriod) {
      console.log('No marking period to publish')
      return
    }

    try {
      setIsPublishing(true)
      
      console.log('Publishing results for:', {
        markingPeriodId: markingPeriod.id,
        markingPeriodSchoolId: (markingPeriod as any).school_id,
        term: markingPeriod.term,
        adminSchoolId: profile?.school_id
      })

      const { data, error } = await supabase
        .from('exam_marking_periods')
        .update({
          results_published: true,
          published_at: new Date().toISOString(),
          published_by: profile?.id,
          is_active: false
        })
        .eq('id', markingPeriod.id)
        .select()

      if (error) {
        console.error('Publish error:', error)
        throw error
      }
      
      console.log('Publish result:', data)

      toast.success('Results published! Students and parents can now view them.')
      setIsPublishDialogOpen(false)
      await loadData()
    } catch (error: any) {
      console.error('Publish failed:', error)
      toast.error('Failed to publish results')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUnpublishResults = async () => {
    if (!markingPeriod) return

    try {
      const { error } = await supabase
        .from('exam_marking_periods')
        .update({
          results_published: false,
          published_at: null,
          published_by: null
        })
        .eq('id', markingPeriod.id)

      if (error) throw error

      toast.success('Results unpublished. Students and parents can no longer view them.')
      await loadData()
    } catch (error: any) {
      toast.error('Failed to unpublish results')
    }
  }

  const handleDeleteExam = async (examId: string, examTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${examTitle}"? This will also delete all associated marks.`)) {
      return
    }

    try {
      // First delete all exam results
      const { error: resultsError } = await supabase
        .from('exam_results')
        .delete()
        .eq('exam_id', examId)

      if (resultsError) throw resultsError

      // Then delete the exam
      const { error: examError } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId)

      if (examError) throw examError

      toast.success('Exam deleted successfully')
      await loadData()
    } catch (error: any) {
      console.error('Delete exam error:', error)
      toast.error('Failed to delete exam: ' + error.message)
    }
  }

  const loadClassSubjectOptions = async () => {
    try {
      // First get all classes for this school
      const { data: classesData } = await supabase
        .from('classes')
        .select('id')
        .eq('school_id', profile?.school_id)

      const classIds = (classesData || []).map(c => c.id)
      
      if (classIds.length === 0) {
        setClassSubjectOptions([])
        return
      }

      const { data, error } = await supabase
        .from('class_subject_assignments')
        .select(`
          class_id,
          subject_id,
          teacher_id,
          classes(grade_level, section),
          subjects(name),
          profiles:teacher_id(full_name)
        `)
        .in('class_id', classIds)

      if (error) throw error

      const options: ClassSubjectOption[] = (data || [])
        .filter((item: any) => item.classes && item.subjects)
        .map((item: any) => ({
          class_id: item.class_id,
          subject_id: item.subject_id,
          class_name: `${item.classes?.grade_level || ''} ${item.classes?.section || ''}`.trim(),
          subject_name: item.subjects?.name || 'Unknown',
          teacher_id: item.teacher_id,
          teacher_name: item.profiles?.full_name || 'Unassigned'
        }))

      setClassSubjectOptions(options)
      console.log('Loaded class-subject options:', options.length)
    } catch (error: any) {
      console.error('Error loading class-subject options:', error)
    }
  }

  const handleAddExam = async () => {
    if (!selectedClassSubject || !newExamTitle || !newExamDate) {
      toast.error('Please fill all required fields')
      return
    }

    const selected = classSubjectOptions.find(
      opt => `${opt.class_id}|${opt.subject_id}` === selectedClassSubject
    )

    if (!selected) {
      toast.error('Invalid class-subject selection')
      return
    }

    try {
      setIsCreatingExam(true)

      // Check if exam already exists
      const { data: existing } = await supabase
        .from('exams')
        .select('id')
        .eq('class_id', selected.class_id)
        .eq('subject_id', selected.subject_id)
        .eq('school_id', profile?.school_id)
        .eq('title', newExamTitle)
        .single()

      if (existing) {
        toast.error('An exam with this title already exists for this class and subject')
        return
      }

      const { error } = await supabase.from('exams').insert({
        title: newExamTitle,
        description: `Exam for ${selected.subject_name} - ${selected.class_name}`,
        exam_date: newExamDate,
        total_marks: parseInt(newExamMarks),
        class_id: selected.class_id,
        subject_id: selected.subject_id,
        school_id: profile?.school_id,
        created_by: selected.teacher_id || profile?.id,
        is_submitted: false
      })

      if (error) throw error

      toast.success('Exam created successfully')
      setIsAddExamDialogOpen(false)
      setSelectedClassSubject('')
      setNewExamTitle('')
      setNewExamDate('')
      setNewExamMarks('100')
      await loadData()
    } catch (error: any) {
      console.error('Error creating exam:', error)
      toast.error('Failed to create exam: ' + error.message)
    } finally {
      setIsCreatingExam(false)
    }
  }

  const openAddExamDialog = async () => {
    await loadClassSubjectOptions()
    const termInfo = getCurrentTerm()
    const defaultTitle = `End of ${termInfo.termName} Exam`
    setNewExamTitle(defaultTitle)
    setNewExamDate(getDefaultExamDate(termInfo))
    setIsAddExamDialogOpen(true)
  }

  // Filter teachers based on search and status filter
  const filteredTeachers = teachersWithExams.map(teacher => {
    // First filter exams by status
    let filteredExams = teacher.exams
    if (statusFilter === 'submitted') {
      filteredExams = teacher.exams.filter(e => e.is_submitted)
    } else if (statusFilter === 'pending') {
      filteredExams = teacher.exams.filter(e => !e.is_submitted && e.graded_count === 0)
    } else if (statusFilter === 'grading') {
      filteredExams = teacher.exams.filter(e => !e.is_submitted && e.graded_count > 0 && e.graded_count < e.total_students)
    }
    
    return { ...teacher, exams: filteredExams }
  }).filter(teacher => {
    // Then filter by search query
    if (!searchQuery) return teacher.exams.length > 0 || statusFilter === 'all'
    const query = searchQuery.toLowerCase()
    return (teacher.full_name.toLowerCase().includes(query) ||
      teacher.username.toLowerCase().includes(query) ||
      teacher.exams.some(e => 
        e.title.toLowerCase().includes(query) ||
        e.class_name.toLowerCase().includes(query) ||
        e.subject_name.toLowerCase().includes(query)
      )) && (teacher.exams.length > 0 || statusFilter === 'all')
  })

  // Stats
  const totalExams = teachersWithExams.reduce((sum, t) => sum + t.exams.length, 0)
  const submittedExams = teachersWithExams.reduce((sum, t) => sum + t.exams.filter(e => e.is_submitted).length, 0)
  const pendingExams = totalExams - submittedExams
  const fullyGradedExams = teachersWithExams.reduce((sum, t) => 
    sum + t.exams.filter(e => e.graded_count === e.total_students && e.total_students > 0).length, 0)

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Exams Management">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) return null

  return (
    <DashboardLayout title="Exams Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">End of Term Exams</h1>
            <p className="text-gray-500">
              View exam progress by teacher • <Badge variant="outline" className="ml-1">{currentTerm}</Badge>
            </p>
          </div>
          <Button onClick={openAddExamDialog} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Exam
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Exams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalExams}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Submitted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{submittedExams}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Pending Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingExams}</div>
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
              <div className="text-2xl font-bold text-blue-600">{teachersWithExams.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Marking Period Status Banner */}
        {markingPeriod ? (
          <Card className={`${
            markingPeriod.results_published 
              ? 'bg-blue-50 border-blue-200' 
              : markingPeriod.is_active 
                ? 'bg-green-50 border-green-200' 
                : 'bg-amber-50 border-amber-200'
          }`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    markingPeriod.results_published 
                      ? 'bg-blue-100' 
                      : markingPeriod.is_active 
                        ? 'bg-green-100' 
                        : 'bg-amber-100'
                  }`}>
                    {markingPeriod.results_published ? (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    ) : markingPeriod.is_active ? (
                      <Unlock className="h-5 w-5 text-green-600" />
                    ) : (
                      <Lock className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${
                      markingPeriod.results_published 
                        ? 'text-blue-800' 
                        : markingPeriod.is_active 
                          ? 'text-green-800' 
                          : 'text-amber-800'
                    }`}>
                      {markingPeriod.term} {markingPeriod.academic_year}
                      {markingPeriod.results_published && ' - Results Published ✓'}
                      {!markingPeriod.results_published && markingPeriod.is_active && ' - Marking Open'}
                      {!markingPeriod.results_published && !markingPeriod.is_active && ' - Marking Closed'}
                    </p>
                    <p className={`text-sm ${
                      markingPeriod.results_published 
                        ? 'text-blue-600' 
                        : markingPeriod.is_active 
                          ? 'text-green-600' 
                          : 'text-amber-600'
                    }`}>
                      {markingPeriod.results_published 
                        ? 'Students and parents can view their exam results' 
                        : markingPeriod.is_active 
                          ? `Teachers can enter marks until ${new Date(markingPeriod.end_date).toLocaleDateString()}`
                          : 'Open the marking period to allow teachers to enter marks'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Publish/Unpublish Button - Always visible */}
                  {markingPeriod.results_published ? (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleUnpublishResults}
                    >
                      <Lock className="h-4 w-4 mr-1" />
                      Unpublish
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setIsPublishDialogOpen(true)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Publish
                    </Button>
                  )}
                  <Link href="/dashboard/exam-periods">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Periods
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-800">
                      No Marking Period Set
                    </p>
                    <p className="text-sm text-amber-600">
                      Create and open a marking period to allow marks entry.
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/exam-periods">
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    <CalendarClock className="h-4 w-4 mr-2" />
                    Create Period
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

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
                onValueChange={(value: 'all' | 'submitted' | 'pending' | 'grading') => setStatusFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  <SelectItem value="submitted">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Submitted
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
                  : statusFilter !== 'all'
                    ? `No exams with status "${statusFilter === 'submitted' ? 'Submitted' : statusFilter === 'grading' ? 'In Progress' : 'Not Started'}"`
                    : 'No teachers found. Assign teachers to classes first.'}
              </CardContent>
            </Card>
          ) : (
            filteredTeachers.map((teacher) => {
              const isExpanded = expandedTeacher === teacher.id
              const submittedCount = teacher.exams.filter(e => e.is_submitted).length
              const gradedCount = teacher.exams.filter(e => e.graded_count === e.total_students && e.total_students > 0).length

              return (
                <Card key={teacher.id} className="overflow-hidden">
                  {/* Teacher Header */}
                  <CardHeader 
                    className="py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleExpandTeacher(teacher.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
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
                            {teacher.exams.length} exams
                          </div>
                          <div className="flex gap-2 mt-1">
                            {submittedCount > 0 && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                {submittedCount} submitted
                              </Badge>
                            )}
                            {teacher.exams.length - submittedCount > 0 && (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                {teacher.exams.length - submittedCount} pending
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Teacher's Exams List */}
                  {isExpanded && (
                    <CardContent className="border-t pt-4 space-y-3 bg-gray-50">
                      {teacher.exams.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">
                          No exams assigned yet. Exams are created when teacher is assigned to classes.
                        </p>
                      ) : (
                        teacher.exams.map((exam) => {
                          const isExamExpanded = expandedExam === exam.id
                          const gradingProgress = exam.total_students > 0 
                            ? (exam.graded_count / exam.total_students) * 100 
                            : 0

                          return (
                            <Card key={exam.id} className="bg-white">
                              <CardHeader 
                                className="py-3 cursor-pointer hover:bg-gray-50"
                                onClick={() => handleExpandExam(exam.id, exam.class_id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <div>
                                      <p className="font-medium">{exam.title}</p>
                                      <p className="text-xs text-gray-500">
                                        {exam.class_name} • {exam.subject_name}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {currentTerm}
                                    </Badge>
                                    {exam.is_submitted ? (
                                      <Badge className="bg-green-100 text-green-800 text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Submitted
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Pending
                                      </Badge>
                                    )}
                                    {exam.exam_paper_url && (
                                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                                        PDF
                                      </Badge>
                                    )}
                                    {isExamExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </div>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Marks entered</span>
                                    <span>{exam.graded_count}/{exam.total_students}</span>
                                  </div>
                                  <Progress value={gradingProgress} className="h-1.5" />
                                </div>
                              </CardHeader>

                              {isExamExpanded && (
                                <CardContent className="pt-0 pb-3 border-t">
                                  {/* Exam details */}
                                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                                    <div>
                                      <span className="text-gray-500">Exam Date:</span>{' '}
                                      {new Date(exam.exam_date).toLocaleDateString()}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Total Marks:</span>{' '}
                                      {exam.total_marks}
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2 mb-3">
                                    {exam.exam_paper_url && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          window.open(exam.exam_paper_url!, '_blank')
                                        }}
                                      >
                                        <Download className="w-4 h-4 mr-2" />
                                        View Exam Paper
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteExam(exam.id, exam.title)
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Exam
                                    </Button>
                                  </div>

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
                                                  ? `${result.marks_obtained}/${exam.total_marks}` 
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

        {/* Publish Results Dialog */}
        <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish Exam Results</DialogTitle>
              <DialogDescription asChild>
                <div>
                  Are you sure you want to publish results for {markingPeriod?.term} {markingPeriod?.academic_year}?
                  <div className="mt-3 text-sm">
                    <p className="font-medium mb-2">Once published:</p>
                    <ul className="list-disc ml-5 space-y-1">
                      <li>Students and parents can view exam results</li>
                      <li>The marking period will be automatically closed</li>
                      <li>You can unpublish later if needed</li>
                    </ul>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPublishDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePublishResults}
                disabled={isPublishing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPublishing ? 'Publishing...' : 'Publish Results'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Exam Dialog */}
        <Dialog open={isAddExamDialogOpen} onOpenChange={setIsAddExamDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Exam</DialogTitle>
              <DialogDescription>
                Create a new exam for a class and subject
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Class & Subject *</Label>
                <Select value={selectedClassSubject} onValueChange={setSelectedClassSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class and subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {classSubjectOptions.map((opt) => (
                      <SelectItem 
                        key={`${opt.class_id}|${opt.subject_id}`} 
                        value={`${opt.class_id}|${opt.subject_id}`}
                      >
                        {opt.class_name} - {opt.subject_name} ({opt.teacher_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Exam Title *</Label>
                <Input
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  placeholder="e.g., End of Term 1 Exam"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Exam Date *</Label>
                  <Input
                    type="date"
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Total Marks</Label>
                  <Input
                    type="number"
                    value={newExamMarks}
                    onChange={(e) => setNewExamMarks(e.target.value)}
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddExamDialogOpen(false)} disabled={isCreatingExam}>
                Cancel
              </Button>
              <Button onClick={handleAddExam} disabled={isCreatingExam}>
                {isCreatingExam ? 'Creating...' : 'Create Exam'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
