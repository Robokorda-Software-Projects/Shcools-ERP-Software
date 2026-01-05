'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { getTermLabel } from '@/lib/term-utils'
import { 
  FileText, CheckCircle, Clock, Save, Upload, 
  AlertTriangle, Lock, Send, RefreshCw, Sparkles,
  ChevronDown, ChevronUp, WifiOff, Wifi, CloudOff
} from 'lucide-react'

// Offline storage key
const OFFLINE_STORAGE_KEY = 'exam_grades_offline_queue'

interface OfflineGradeEntry {
  examId: string
  grades: StudentGrade[]
  timestamp: number
  schoolId: string
}

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
  exam_paper_url: string | null
  is_submitted: boolean
  submitted_at: string | null
  graded_count: number
  total_students: number
}

interface StudentGrade {
  student_id: string
  student_name: string
  username: string
  marks_obtained: number | null
  percentage: number | null
  grade: string | null
  comment: string
  comment_type: 'manual' | 'auto'
  result_id: string | null
}

interface MarkingPeriod {
  id: string
  term: string
  academic_year: string
  start_date: string
  end_date: string
  is_active: boolean
}

export default function TeacherExamMarksPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [exams, setExams] = useState<Exam[]>([])
  const [markingPeriod, setMarkingPeriod] = useState<MarkingPeriod | null>(null)
  const [currentTerm] = useState(getTermLabel())
  const [loading, setLoading] = useState(true)
  const [expandedExam, setExpandedExam] = useState<string | null>(null)
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([])
  const [savingGrades, setSavingGrades] = useState(false)
  const [commentMode, setCommentMode] = useState<'manual' | 'auto' | 'mixed'>('manual')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'offline' | 'error'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [hasOfflineData, setHasOfflineData] = useState(false)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentExamIdRef = useRef<string | null>(null)
  const pendingGradesRef = useRef<{ examId: string; grades: StudentGrade[] } | null>(null)
  
  // Upload states
  const [uploadingPaper, setUploadingPaper] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // Submit dialog
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [examToSubmit, setExamToSubmit] = useState<Exam | null>(null)
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Check for offline data on mount
  useEffect(() => {
    const checkOfflineData = () => {
      try {
        const offlineData = localStorage.getItem(OFFLINE_STORAGE_KEY)
        if (offlineData) {
          const queue: OfflineGradeEntry[] = JSON.parse(offlineData)
          setHasOfflineData(queue.length > 0)
        }
      } catch {
        // Ignore localStorage errors
      }
    }
    checkOfflineData()
  }, [])

  // Network status detection and auto-sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Back online! Syncing your saved data...', { icon: <Wifi className="w-4 h-4" /> })
      syncOfflineData()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('You are offline. Changes will be saved locally.', { icon: <WifiOff className="w-4 h-4" /> })
    }
    
    // Check initial status
    setIsOnline(navigator.onLine)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'teacher') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'teacher') {
      loadData()
    }
  }, [profile])

  const loadData = async () => {
    setLoading(true)
    try {
      // Check for active marking period (only show if not past end date)
      const { data: periods } = await supabase
        .from('exam_marking_periods')
        .select('*')
        .eq('school_id', profile?.school_id)
        .eq('is_active', true)
        .limit(1)

      if (periods && periods.length > 0) {
        const period = periods[0]
        const endDate = new Date(period.end_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Only set active period if end date hasn't passed
        if (endDate >= today) {
          setMarkingPeriod(period)
        } else {
          setMarkingPeriod(null)
        }
      } else {
        setMarkingPeriod(null)
      }

      // Get teacher's class-subject assignments
      const { data: assignments } = await supabase
        .from('class_subject_assignments')
        .select(`
          class_id,
          subject_id,
          classes!inner(id, grade_level, section),
          subjects!inner(id, name)
        `)
        .eq('teacher_id', profile?.id)

      if (!assignments || assignments.length === 0) {
        setExams([])
        setLoading(false)
        return
      }

      // Build array of class-subject pairs this teacher is assigned to
      const teacherAssignments = assignments.map((a: any) => ({
        class_id: a.class_id,
        subject_id: a.subject_id
      }))

      // Get exams for the teacher's assigned class-subject combinations
      const classIds = [...new Set(teacherAssignments.map(a => a.class_id))]
      const subjectIds = [...new Set(teacherAssignments.map(a => a.subject_id))]

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
        .in('class_id', classIds)
        .in('subject_id', subjectIds)
        .order('exam_date', { ascending: false })

      // Filter to only exams matching teacher's exact assignments
      const teacherExams = (examsData || []).filter((exam: any) => 
        teacherAssignments.some(a => 
          a.class_id === exam.class_id && a.subject_id === exam.subject_id
        )
      )

      // Get counts for each exam
      const examsWithCounts = await Promise.all(
        teacherExams.map(async (exam: any) => {
          const { count: totalCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', exam.class_id)
            .eq('student_status', 'active')

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
            exam_paper_url: exam.exam_paper_url || null,
            is_submitted: exam.is_submitted || false,
            submitted_at: exam.submitted_at || null,
            graded_count: gradedCount || 0,
            total_students: totalCount || 0
          }
        })
      )

      setExams(examsWithCounts)
    } catch (error: any) {
      console.error('Error loading exams:', error)
      toast.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentGrades = async (examId: string, classId: string) => {
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, profiles!students_user_id_fkey(username, full_name)')
      .eq('class_id', classId)
      .eq('student_status', 'active')
      .order('profiles(full_name)')

    const { data: resultsData } = await supabase
      .from('exam_results')
      .select('*')
      .eq('exam_id', examId)

    const grades: StudentGrade[] = (studentsData || []).map((student: any) => {
      const result = resultsData?.find(r => r.student_id === student.id)
      return {
        student_id: student.id,
        student_name: student.profiles?.full_name || 'Unknown',
        username: student.profiles?.username || 'Unknown',
        marks_obtained: result?.marks_obtained ?? null,
        percentage: result?.percentage ?? null,
        grade: result?.grade ?? null,
        comment: result?.comment || '',
        comment_type: result?.comment_type || 'manual',
        result_id: result?.id || null
      }
    })

    setStudentGrades(grades)
  }

  // Save to localStorage for offline support
  const saveToOfflineQueue = useCallback((examId: string, grades: StudentGrade[]) => {
    if (!profile?.school_id) return
    
    try {
      const existingData = localStorage.getItem(OFFLINE_STORAGE_KEY)
      const queue: OfflineGradeEntry[] = existingData ? JSON.parse(existingData) : []
      
      // Remove any existing entry for this exam and add new one
      const filteredQueue = queue.filter(entry => entry.examId !== examId)
      filteredQueue.push({
        examId,
        grades: grades.filter(g => g.marks_obtained !== null),
        timestamp: Date.now(),
        schoolId: profile.school_id
      })
      
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(filteredQueue))
      setHasOfflineData(true)
      setAutoSaveStatus('offline')
      toast.info('Saved to device memory. Will sync when online.', { 
        icon: <CloudOff className="w-4 h-4" />,
        duration: 3000
      })
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }, [profile?.school_id])

  // Sync offline data when back online
  const syncOfflineData = useCallback(async () => {
    if (!profile?.id) return
    
    try {
      const offlineData = localStorage.getItem(OFFLINE_STORAGE_KEY)
      if (!offlineData) return
      
      const queue: OfflineGradeEntry[] = JSON.parse(offlineData)
      if (queue.length === 0) return
      
      setAutoSaveStatus('saving')
      let successCount = 0
      
      for (const entry of queue) {
        try {
          for (const sg of entry.grades) {
            if (sg.marks_obtained === null) continue
            
            const gradeData = {
              exam_id: entry.examId,
              student_id: sg.student_id,
              marks_obtained: sg.marks_obtained,
              percentage: sg.percentage,
              grade: sg.grade,
              comment: sg.comment || null,
              comment_type: sg.comment_type,
              graded_by: profile.id,
              graded_at: new Date().toISOString()
            }
            
            await supabase
              .from('exam_results')
              .upsert(gradeData, { 
                onConflict: 'exam_id,student_id',
                ignoreDuplicates: false 
              })
          }
          successCount++
        } catch (err) {
          console.error('Failed to sync exam:', entry.examId, err)
        }
      }
      
      // Clear the queue after successful sync
      localStorage.removeItem(OFFLINE_STORAGE_KEY)
      setHasOfflineData(false)
      setAutoSaveStatus('saved')
      setLastSaved(new Date())
      
      if (successCount > 0) {
        toast.success(`Your offline exam marks have been saved to the database! (${successCount} exam${successCount > 1 ? 's' : ''} synced)`, {
          icon: <CheckCircle className="w-4 h-4" />,
          duration: 5000
        })
      }
      
      // Reload data to get fresh state
      await loadData()
      
      setTimeout(() => setAutoSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to sync offline data:', error)
      setAutoSaveStatus('error')
    }
  }, [profile?.id])

  // Perform the actual save to database
  const performAutoSave = useCallback(async (examId: string, grades: StudentGrade[]) => {
    if (!markingPeriod || !profile?.id || grades.length === 0) return
    
    // If offline, save to localStorage instead
    if (!navigator.onLine) {
      saveToOfflineQueue(examId, grades)
      return
    }
    
    setAutoSaveStatus('saving')
    try {
      // Process all grades that have marks
      for (const sg of grades) {
        if (sg.marks_obtained === null) continue
        
        const gradeData = {
          exam_id: examId,
          student_id: sg.student_id,
          marks_obtained: sg.marks_obtained,
          percentage: sg.percentage,
          grade: sg.grade,
          comment: sg.comment || null,
          comment_type: sg.comment_type,
          graded_by: profile.id,
          graded_at: new Date().toISOString()
        }

        if (sg.result_id) {
          // Update existing record
          await supabase.from('exam_results').update(gradeData).eq('id', sg.result_id)
        } else {
          // Insert new record and update the local result_id
          const { data } = await supabase
            .from('exam_results')
            .upsert({
              ...gradeData
            }, { 
              onConflict: 'exam_id,student_id',
              ignoreDuplicates: false 
            })
            .select('id')
            .single()
          
          if (data) {
            // Update the result_id in the current grades state
            setStudentGrades(prev => prev.map(g => 
              g.student_id === sg.student_id ? { ...g, result_id: data.id } : g
            ))
          }
        }
      }
      
      setLastSaved(new Date())
      setAutoSaveStatus('saved')
      pendingGradesRef.current = null
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle')
      }, 3000)
    } catch (error) {
      console.error('Autosave failed:', error)
      // Save to offline queue if network error
      saveToOfflineQueue(examId, grades)
    }
  }, [markingPeriod, profile?.id, saveToOfflineQueue])

  // Trigger autosave with debounce - passes data directly like attendance page
  const triggerAutoSave = useCallback((examId: string, grades: StudentGrade[]) => {
    // Clear existing timeout
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    
    // Store pending grades for reference
    pendingGradesRef.current = { examId, grades }
    setAutoSaveStatus('pending')
    
    // Set new timeout for 1 second after last change
    autoSaveTimerRef.current = setTimeout(async () => {
      await performAutoSave(examId, grades)
    }, 1000)
  }, [performAutoSave])

  // Cleanup timeout on unmount and save pending changes
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      // Save any pending changes before unmount
      if (pendingGradesRef.current && profile?.id) {
        const { examId, grades } = pendingGradesRef.current
        saveToOfflineQueue(examId, grades)
      }
    }
  }, [profile?.id, saveToOfflineQueue])

  const generateAutoComment = (marks: number, totalMarks: number, _grade: string): string => {
    const percentage = (marks / totalMarks) * 100
    
    if (percentage >= 90) {
      return "Outstanding performance! Excellent understanding of the subject matter."
    } else if (percentage >= 80) {
      return "Very good work! Shows strong grasp of concepts with minor areas for improvement."
    } else if (percentage >= 70) {
      return "Good effort. Demonstrates solid understanding but could benefit from more practice."
    } else if (percentage >= 60) {
      return "Satisfactory performance. More focus and revision needed to improve."
    } else if (percentage >= 50) {
      return "Needs improvement. Additional support and effort required to meet expectations."
    } else {
      return "Below expectations. Requires significant attention and remedial support."
    }
  }

  const handleMarksChange = (studentId: string, marks: string, exam: Exam) => {
    const marksNum = marks === '' ? null : parseFloat(marks)
    
    if (marksNum !== null && (marksNum < 0 || marksNum > exam.total_marks)) {
      return
    }

    let percentage: number | null = null
    let grade: string | null = null
    let comment = ''
    
    if (marksNum !== null) {
      percentage = (marksNum / exam.total_marks) * 100
      if (percentage >= 90) grade = 'A'
      else if (percentage >= 80) grade = 'B'
      else if (percentage >= 70) grade = 'C'
      else if (percentage >= 60) grade = 'D'
      else if (percentage >= 50) grade = 'E'
      else grade = 'F'

      if (commentMode === 'auto') {
        comment = generateAutoComment(marksNum, exam.total_marks, grade)
      }
    }

    // Create updated grades array with the new data
    const updatedGrades = studentGrades.map(sg => 
      sg.student_id === studentId 
        ? { 
            ...sg, 
            marks_obtained: marksNum, 
            percentage, 
            grade,
            comment: commentMode === 'auto' ? comment : sg.comment,
            comment_type: commentMode === 'auto' ? 'auto' : sg.comment_type
          } 
        : sg
    )
    
    // Update state
    setStudentGrades(updatedGrades)
    
    // Trigger autosave with the NEW data directly (like attendance)
    if (currentExamIdRef.current) {
      triggerAutoSave(currentExamIdRef.current, updatedGrades)
    }
  }

  const handleCommentChange = (studentId: string, comment: string) => {
    // Create updated grades array with the new comment
    const updatedGrades = studentGrades.map(sg => 
      sg.student_id === studentId 
        ? { ...sg, comment, comment_type: 'manual' as const }
        : sg
    )
    
    // Update state
    setStudentGrades(updatedGrades)
    
    // Trigger autosave with the NEW data directly
    if (currentExamIdRef.current) {
      triggerAutoSave(currentExamIdRef.current, updatedGrades)
    }
  }

  const applyAutoCommentsToAll = (exam: Exam) => {
    setStudentGrades(prev => prev.map(sg => {
      if (sg.marks_obtained !== null && sg.grade) {
        return {
          ...sg,
          comment: generateAutoComment(sg.marks_obtained, exam.total_marks, sg.grade),
          comment_type: 'auto' as const
        }
      }
      return sg
    }))
    toast.success('Auto comments applied to all students')
  }

  const handleSaveGrades = async (examId: string) => {
    if (!markingPeriod) {
      toast.error('Marking period is closed')
      return
    }

    // Clear any pending autosave
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    pendingGradesRef.current = null

    // If offline, save to localStorage
    if (!navigator.onLine) {
      saveToOfflineQueue(examId, studentGrades)
      return
    }

    setSavingGrades(true)
    setAutoSaveStatus('saving')
    try {
      for (const sg of studentGrades) {
        if (sg.marks_obtained === null) continue
        
        const gradeData = {
          exam_id: examId,
          student_id: sg.student_id,
          marks_obtained: sg.marks_obtained,
          percentage: sg.percentage,
          grade: sg.grade,
          comment: sg.comment || null,
          comment_type: sg.comment_type,
          graded_by: profile?.id,
          graded_at: new Date().toISOString()
        }

        if (sg.result_id) {
          await supabase.from('exam_results').update(gradeData).eq('id', sg.result_id)
        } else {
          await supabase.from('exam_results').insert(gradeData)
        }
      }
      setAutoSaveStatus('saved')
      setLastSaved(new Date())
      toast.success('Grades saved successfully!')
      await loadData()
      setTimeout(() => setAutoSaveStatus('idle'), 3000)
    } catch (error: unknown) {
      toast.error('Failed to save grades')
      console.error(error)
      setAutoSaveStatus('error')
      // Save to offline queue on error
      saveToOfflineQueue(examId, studentGrades)
    }
    setSavingGrades(false)
  }

  const handleUploadPaper = async (exam: Exam) => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    setUploadingPaper(true)
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${exam.id}_${Date.now()}.${fileExt}`
      const filePath = `exam-papers/${profile?.school_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Update the exam record with the paper URL
      const { error: updateError } = await supabase
        .from('exams')
        .update({
          exam_paper_url: publicUrl,
          exam_paper_name: selectedFile.name
        })
        .eq('id', exam.id)

      if (updateError) throw updateError

      toast.success('Exam paper uploaded!')
      setSelectedFile(null)
      await loadData()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Failed to upload exam paper')
    } finally {
      setUploadingPaper(false)
    }
  }

  const openSubmitDialog = (exam: Exam) => {
    setExamToSubmit(exam)
    setConfirmChecked(false)
    setIsSubmitDialogOpen(true)
  }

  const handleSubmitExam = async () => {
    if (!examToSubmit || !confirmChecked) return

    // Validation checks
    if (!examToSubmit.exam_paper_url) {
      toast.error('Please upload the exam paper before submitting')
      return
    }

    if (examToSubmit.graded_count < examToSubmit.total_students) {
      toast.error(`Please enter marks for all students (${examToSubmit.graded_count}/${examToSubmit.total_students} completed)`)
      return
    }

    setSubmitting(true)
    try {
      // Update the exam as submitted
      const { error: updateError } = await supabase
        .from('exams')
        .update({
          is_submitted: true,
          submitted_at: new Date().toISOString(),
          submitted_by: profile?.id
        })
        .eq('id', examToSubmit.id)

      if (updateError) throw updateError

      toast.success('Exam marks submitted successfully!')
      setIsSubmitDialogOpen(false)
      setExamToSubmit(null)
      await loadData()
    } catch (error: any) {
      toast.error('Failed to submit exam')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExpandExam = (examId: string, classId: string) => {
    const isExpanding = expandedExam !== examId
    setExpandedExam(isExpanding ? examId : null)
    
    if (isExpanding) {
      currentExamIdRef.current = examId
      setAutoSaveStatus('idle')
      setLastSaved(null)
      loadStudentGrades(examId, classId)
    } else {
      currentExamIdRef.current = null
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Exam Marks Entry">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'teacher') return null

  // Marking period closed
  if (!markingPeriod) {
    return (
      <DashboardLayout title="Exam Marks Entry">
        <div className="max-w-2xl mx-auto mt-12">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-8 pb-8 text-center">
              <Lock className="h-16 w-16 mx-auto text-amber-600 mb-4" />
              <h2 className="text-xl font-bold text-amber-800 mb-2">Exam Grading Period Closed</h2>
              <p className="text-amber-600 mb-4">
                The exam marks entry period is currently closed. Please wait for your school admin to open the marking period.
              </p>
              <p className="text-sm text-amber-500">
                You will be notified when the marking period opens.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Exam Marks Entry">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">End of Term Exams</h1>
            <p className="text-sm text-gray-500">
              Enter marks for your assigned exams • <Badge variant="outline" className="ml-1">{currentTerm}</Badge>
            </p>
          </div>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Marking Period Banner */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">
                  {markingPeriod.term} {markingPeriod.academic_year} - Marking Open
                </p>
                <p className="text-sm text-green-600">
                  Closes on {new Date(markingPeriod.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{exams.length}</div>
              <p className="text-xs text-gray-600">Total Exams</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-700">
                {exams.filter(e => e.is_submitted).length}
              </div>
              <p className="text-xs text-gray-600">Submitted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-orange-700">
                {exams.filter(e => !e.is_submitted).length}
              </div>
              <p className="text-xs text-gray-600">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-blue-700">
                {exams.filter(e => e.graded_count === e.total_students && e.total_students > 0).length}
              </div>
              <p className="text-xs text-gray-600">Fully Graded</p>
            </CardContent>
          </Card>
        </div>

        {/* Exams List */}
        <div className="space-y-4">
          {exams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No exams assigned</h3>
                <p className="text-sm text-gray-500">
                  Exams will appear here when the admin creates them for your classes
                </p>
              </CardContent>
            </Card>
          ) : (
            exams.map((exam) => {
              const isExpanded = expandedExam === exam.id
              const isComplete = exam.graded_count === exam.total_students && exam.total_students > 0
              
              return (
                <Card key={exam.id} className={exam.is_submitted ? 'border-green-200 bg-green-50/30' : ''}>
                  <CardHeader 
                    className="py-4 cursor-pointer"
                    onClick={() => handleExpandExam(exam.id, exam.class_id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          exam.is_submitted ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <FileText className={`h-5 w-5 ${exam.is_submitted ? 'text-green-600' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{exam.title}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            {exam.class_name} • {exam.subject_name} • {new Date(exam.exam_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{exam.total_marks} marks</Badge>
                        {exam.is_submitted ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />Submitted
                          </Badge>
                        ) : isComplete ? (
                          <Badge className="bg-blue-100 text-blue-800">
                            <CheckCircle className="w-3 h-3 mr-1" />Complete
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 mr-1" />{exam.graded_count}/{exam.total_students}
                          </Badge>
                        )}
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="border-t pt-4 space-y-4">
                      {/* Exam Paper Upload */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Upload className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium text-sm">Exam Paper (PDF)</p>
                            {exam.exam_paper_url ? (
                              <a 
                                href={exam.exam_paper_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View uploaded file
                              </a>
                            ) : (
                              <p className="text-xs text-gray-500">No file uploaded</p>
                            )}
                          </div>
                        </div>
                        {!exam.is_submitted && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              className="max-w-48"
                            />
                            <Button 
                              size="sm" 
                              onClick={() => handleUploadPaper(exam)}
                              disabled={!selectedFile || uploadingPaper}
                            >
                              {uploadingPaper ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Upload'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Comment Mode Selection */}
                      {!exam.is_submitted && (
                        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                            <div>
                              <p className="font-medium text-sm">Comments Mode</p>
                              <p className="text-xs text-gray-500">Choose how to generate student comments</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select value={commentMode} onValueChange={(v) => setCommentMode(v as any)}>
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="auto">Auto (Beta)</SelectItem>
                                <SelectItem value="mixed">Mixed</SelectItem>
                              </SelectContent>
                            </Select>
                            {commentMode !== 'manual' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => applyAutoCommentsToAll(exam)}
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                Apply Auto
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {!exam.is_submitted && (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-medium">Enter Student Marks</p>
                            {/* Network & Autosave indicator */}
                            {!isOnline && (
                              <span className="text-xs text-orange-600 flex items-center gap-1">
                                <WifiOff className="w-3 h-3" />
                                Offline Mode
                              </span>
                            )}
                            {autoSaveStatus === 'saving' && (
                              <span className="text-xs text-blue-600 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Saving...
                              </span>
                            )}
                            {autoSaveStatus === 'pending' && (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Pending...
                              </span>
                            )}
                            {autoSaveStatus === 'saved' && lastSaved && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Saved {lastSaved.toLocaleTimeString()}
                              </span>
                            )}
                            {autoSaveStatus === 'offline' && (
                              <span className="text-xs text-orange-600 flex items-center gap-1">
                                <CloudOff className="w-3 h-3" />
                                Saved to device
                              </span>
                            )}
                            {autoSaveStatus === 'error' && (
                              <span className="text-xs text-red-600 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Save failed
                              </span>
                            )}
                            {hasOfflineData && isOnline && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={syncOfflineData}
                                className="text-xs h-6 px-2"
                              >
                                <Wifi className="w-3 h-3 mr-1" />
                                Sync offline data
                              </Button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveGrades(exam.id)} 
                              disabled={savingGrades || autoSaveStatus === 'saving'}
                              variant="outline"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              {savingGrades ? 'Saving...' : 'Save Now'}
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => openSubmitDialog(exam)}
                              className="bg-green-600 hover:bg-green-700"
                              disabled={!isComplete || !exam.exam_paper_url}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Submit
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Grades Table */}
                      <div className="border rounded-lg max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead className="w-24">Marks</TableHead>
                              <TableHead className="w-20">%</TableHead>
                              <TableHead className="w-16">Grade</TableHead>
                              <TableHead>Comment</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentGrades.map((sg) => (
                              <TableRow key={sg.student_id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{sg.student_name}</p>
                                    <p className="text-xs text-gray-500">{sg.username}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {exam.is_submitted ? (
                                    <span>{sg.marks_obtained ?? '-'}</span>
                                  ) : (
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      max={exam.total_marks}
                                      value={sg.marks_obtained ?? ''} 
                                      onChange={(e) => handleMarksChange(sg.student_id, e.target.value, exam)} 
                                      className="w-20"
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  {sg.percentage !== null ? `${sg.percentage.toFixed(0)}%` : '-'}
                                </TableCell>
                                <TableCell>
                                  {sg.grade && (
                                    <Badge className={
                                      sg.grade === 'A' ? 'bg-green-100 text-green-800' :
                                      sg.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                      sg.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                      sg.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                      sg.grade === 'E' ? 'bg-orange-100 text-orange-800' :
                                      'bg-red-100 text-red-800'
                                    }>
                                      {sg.grade}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {exam.is_submitted ? (
                                    <span className="text-sm text-gray-600">{sg.comment || '-'}</span>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        value={sg.comment}
                                        onChange={(e) => handleCommentChange(sg.student_id, e.target.value)}
                                        placeholder="Add comment..."
                                        className="text-sm"
                                      />
                                      {sg.comment_type === 'auto' && (
                                        <Badge variant="outline" className="text-xs shrink-0">AI</Badge>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })
          )}
        </div>

        {/* Submit Confirmation Dialog */}
        <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-green-600" />
                Submit Exam Marks
              </DialogTitle>
              <DialogDescription>
                Confirm that all marks are correct before submitting
              </DialogDescription>
            </DialogHeader>
            {examToSubmit && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">{examToSubmit.title}</p>
                  <p className="text-sm text-gray-600">
                    {examToSubmit.class_name} • {examToSubmit.subject_name}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-green-600">
                      ✓ {examToSubmit.graded_count} students graded
                    </span>
                    {examToSubmit.exam_paper_url && (
                      <span className="text-green-600">✓ Exam paper uploaded</span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Once submitted, marks cannot be edited. Please verify all entries are correct.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Checkbox
                    id="confirm"
                    checked={confirmChecked}
                    onCheckedChange={(checked) => setConfirmChecked(checked === true)}
                  />
                  <label htmlFor="confirm" className="text-sm cursor-pointer">
                    I confirm that all marks entered are correct and verified
                  </label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitExam}
                disabled={!confirmChecked || submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Marks
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
