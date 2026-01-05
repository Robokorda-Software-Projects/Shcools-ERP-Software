'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Plus, FileText, CheckCircle, Clock, Save, Upload, 
  Trash2, RefreshCw, Send, ChevronDown, ChevronUp,
  ClipboardList, WifiOff, Wifi, CloudOff, AlertTriangle
} from 'lucide-react'

// Offline storage key
const OFFLINE_STORAGE_KEY = 'test_grades_offline_queue'

interface OfflineGradeEntry {
  testId: string
  grades: StudentGrade[]
  timestamp: number
  schoolId: string
}

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
  test_paper_name: string | null
  is_published: boolean
  published_at: string | null
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
  result_id: string | null
}

interface ClassSubject {
  class_id: string
  class_name: string
  subject_id: string
  subject_name: string
}

export default function TeacherTestsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [tests, setTests] = useState<Test[]>([])
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTest, setExpandedTest] = useState<string | null>(null)
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([])
  const [savingGrades, setSavingGrades] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'offline' | 'error'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [hasOfflineData, setHasOfflineData] = useState(false)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentTestIdRef = useRef<string | null>(null)
  const pendingGradesRef = useRef<{ testId: string; grades: StudentGrade[] } | null>(null)
  
  // Create test dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [testTitle, setTestTitle] = useState('')
  const [testDescription, setTestDescription] = useState('')
  const [testType, setTestType] = useState('monthly')
  const [testDate, setTestDate] = useState('')
  const [totalMarks, setTotalMarks] = useState('')
  const [selectedClassSubject, setSelectedClassSubject] = useState('')
  const [creating, setCreating] = useState(false)
  
  // Upload states
  const [uploadingPaper, setUploadingPaper] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const TEST_TYPES = [
    { value: 'weekly', label: 'Weekly Test' },
    { value: 'monthly', label: 'Monthly Test' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'mid-term', label: 'Mid-Term Test' },
    { value: 'other', label: 'Other' }
  ]

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
        setTests([])
        setClassSubjects([])
        setLoading(false)
        return
      }

      // Build class-subject combinations
      const cs: ClassSubject[] = assignments.map((a: any) => ({
        class_id: a.class_id,
        class_name: `${a.classes.grade_level} ${a.classes.section}`,
        subject_id: a.subject_id,
        subject_name: a.subjects.name
      }))
      setClassSubjects(cs)

      // Get teacher's tests
      const { data: testsData } = await supabase
        .from('term_tests')
        .select(`
          id, title, description, test_type, test_date, total_marks,
          class_id, subject_id, test_paper_url, test_paper_name,
          is_published, published_at,
          classes(grade_level, section),
          subjects(name)
        `)
        .eq('teacher_id', profile?.id)
        .order('test_date', { ascending: false })

      // Get counts for each test
      const testsWithCounts = await Promise.all(
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
            test_paper_url: test.test_paper_url,
            test_paper_name: test.test_paper_name,
            is_published: test.is_published || false,
            published_at: test.published_at,
            graded_count: gradedCount || 0,
            total_students: totalCount || 0
          }
        })
      )

      setTests(testsWithCounts)
    } catch (error: any) {
      console.error('Error loading tests:', error)
      toast.error('Failed to load tests')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentGrades = async (testId: string, classId: string) => {
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, profiles!students_user_id_fkey(username, full_name)')
      .eq('class_id', classId)
      .eq('student_status', 'active')
      .order('profiles(full_name)')

    const { data: resultsData } = await supabase
      .from('term_test_results')
      .select('*')
      .eq('test_id', testId)

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
        result_id: result?.id || null
      }
    })

    setStudentGrades(grades)
  }

  // Save to localStorage for offline support
  const saveToOfflineQueue = useCallback((testId: string, grades: StudentGrade[]) => {
    if (!profile?.school_id) return
    
    try {
      const existingData = localStorage.getItem(OFFLINE_STORAGE_KEY)
      const queue: OfflineGradeEntry[] = existingData ? JSON.parse(existingData) : []
      
      // Remove any existing entry for this test and add new one
      const filteredQueue = queue.filter(entry => entry.testId !== testId)
      filteredQueue.push({
        testId,
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
              test_id: entry.testId,
              student_id: sg.student_id,
              marks_obtained: sg.marks_obtained,
              percentage: sg.percentage,
              grade: sg.grade,
              comment: sg.comment || null,
              graded_by: profile.id,
              graded_at: new Date().toISOString()
            }
            
            await supabase
              .from('term_test_results')
              .upsert(gradeData, { 
                onConflict: 'test_id,student_id',
                ignoreDuplicates: false 
              })
          }
          successCount++
        } catch (err) {
          console.error('Failed to sync test:', entry.testId, err)
        }
      }
      
      // Clear the queue after successful sync
      localStorage.removeItem(OFFLINE_STORAGE_KEY)
      setHasOfflineData(false)
      setAutoSaveStatus('saved')
      setLastSaved(new Date())
      
      if (successCount > 0) {
        toast.success(`Your offline test marks have been saved to the database! (${successCount} test${successCount > 1 ? 's' : ''} synced)`, {
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
  const performAutoSave = useCallback(async (testId: string, grades: StudentGrade[]) => {
    if (!profile?.id || grades.length === 0) return
    
    // If offline, save to localStorage instead
    if (!navigator.onLine) {
      saveToOfflineQueue(testId, grades)
      return
    }
    
    setAutoSaveStatus('saving')
    try {
      for (const sg of grades) {
        if (sg.marks_obtained === null) continue
        
        const gradeData = {
          test_id: testId,
          student_id: sg.student_id,
          marks_obtained: sg.marks_obtained,
          percentage: sg.percentage,
          grade: sg.grade,
          comment: sg.comment || null,
          graded_by: profile.id,
          graded_at: new Date().toISOString()
        }

        if (sg.result_id) {
          await supabase.from('term_test_results').update(gradeData).eq('id', sg.result_id)
        } else {
          const { data } = await supabase
            .from('term_test_results')
            .upsert({
              ...gradeData
            }, { 
              onConflict: 'test_id,student_id',
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
      saveToOfflineQueue(testId, grades)
    }
  }, [profile?.id, saveToOfflineQueue])

  // Trigger autosave with debounce - passes data directly like attendance page
  const triggerAutoSave = useCallback((testId: string, grades: StudentGrade[]) => {
    // Clear existing timeout
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    
    // Store pending grades for reference
    pendingGradesRef.current = { testId, grades }
    setAutoSaveStatus('pending')
    
    // Set new timeout for 1 second after last change
    autoSaveTimerRef.current = setTimeout(async () => {
      await performAutoSave(testId, grades)
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
        const { testId, grades } = pendingGradesRef.current
        saveToOfflineQueue(testId, grades)
      }
    }
  }, [profile?.id, saveToOfflineQueue])

  const handleCreateTest = async () => {
    if (!testTitle || !testDate || !totalMarks || !selectedClassSubject) {
      toast.error('Please fill all required fields')
      return
    }

    const [classId, subjectId] = selectedClassSubject.split('|')

    setCreating(true)
    try {
      const { error } = await supabase
        .from('term_tests')
        .insert({
          school_id: profile?.school_id,
          class_id: classId,
          subject_id: subjectId,
          teacher_id: profile?.id,
          title: testTitle,
          description: testDescription,
          test_type: testType,
          test_date: testDate,
          total_marks: parseInt(totalMarks),
          is_published: false
        })

      if (error) throw error

      toast.success('Test created successfully!')
      setIsCreateDialogOpen(false)
      resetForm()
      await loadData()
    } catch (error: any) {
      console.error('Error creating test:', error)
      toast.error(error.message || 'Failed to create test')
    } finally {
      setCreating(false)
    }
  }

  const handleMarksChange = (studentId: string, marks: string, test: Test) => {
    const marksNum = marks === '' ? null : parseFloat(marks)
    
    if (marksNum !== null && (marksNum < 0 || marksNum > test.total_marks)) {
      return
    }

    let percentage: number | null = null
    let grade: string | null = null
    
    if (marksNum !== null) {
      percentage = (marksNum / test.total_marks) * 100
      if (percentage >= 90) grade = 'A'
      else if (percentage >= 80) grade = 'B'
      else if (percentage >= 70) grade = 'C'
      else if (percentage >= 60) grade = 'D'
      else if (percentage >= 50) grade = 'E'
      else grade = 'F'
    }

    // Create updated grades array with the new data
    const updatedGrades = studentGrades.map(sg => 
      sg.student_id === studentId 
        ? { ...sg, marks_obtained: marksNum, percentage, grade }
        : sg
    )
    
    // Update state
    setStudentGrades(updatedGrades)
    
    // Trigger autosave with the NEW data directly (like attendance)
    if (currentTestIdRef.current) {
      triggerAutoSave(currentTestIdRef.current, updatedGrades)
    }
  }

  const handleCommentChange = (studentId: string, comment: string) => {
    // Create updated grades array with the new comment
    const updatedGrades = studentGrades.map(sg => 
      sg.student_id === studentId 
        ? { ...sg, comment }
        : sg
    )
    
    // Update state
    setStudentGrades(updatedGrades)
    
    // Trigger autosave with the NEW data directly
    if (currentTestIdRef.current) {
      triggerAutoSave(currentTestIdRef.current, updatedGrades)
    }
  }

  const handleSaveGrades = async (testId: string) => {
    // Clear any pending autosave
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    pendingGradesRef.current = null

    // If offline, save to localStorage
    if (!navigator.onLine) {
      saveToOfflineQueue(testId, studentGrades)
      return
    }

    setSavingGrades(true)
    setAutoSaveStatus('saving')
    try {
      for (const sg of studentGrades) {
        if (sg.marks_obtained === null) continue
        
        const gradeData = {
          test_id: testId,
          student_id: sg.student_id,
          marks_obtained: sg.marks_obtained,
          percentage: sg.percentage,
          grade: sg.grade,
          comment: sg.comment || null,
          graded_by: profile?.id,
          graded_at: new Date().toISOString()
        }

        if (sg.result_id) {
          await supabase.from('term_test_results').update(gradeData).eq('id', sg.result_id)
        } else {
          await supabase.from('term_test_results').insert(gradeData)
        }
      }
      setAutoSaveStatus('saved')
      setLastSaved(new Date())
      toast.success('Marks saved!')
      await loadData()
      setTimeout(() => setAutoSaveStatus('idle'), 3000)
    } catch (error: unknown) {
      toast.error('Failed to save marks')
      console.error(error)
      setAutoSaveStatus('error')
      // Save to offline queue on error
      saveToOfflineQueue(testId, studentGrades)
    }
    setSavingGrades(false)
  }

  const handleUploadPaper = async (test: Test) => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    setUploadingPaper(true)
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${test.id}_${Date.now()}.${fileExt}`
      const filePath = `test-papers/${profile?.school_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      await supabase
        .from('term_tests')
        .update({
          test_paper_url: publicUrl,
          test_paper_name: selectedFile.name
        })
        .eq('id', test.id)

      toast.success('Test paper uploaded!')
      setSelectedFile(null)
      await loadData()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Failed to upload test paper')
    } finally {
      setUploadingPaper(false)
    }
  }

  const handlePublishTest = async (test: Test) => {
    if (test.graded_count < test.total_students) {
      toast.error('Please enter marks for all students before publishing')
      return
    }

    try {
      await supabase
        .from('term_tests')
        .update({
          is_published: true,
          published_at: new Date().toISOString()
        })
        .eq('id', test.id)

      toast.success('Test published! Students and parents can now view marks.')
      await loadData()
    } catch (error: any) {
      toast.error('Failed to publish test')
    }
  }

  const handleDeleteTest = async (testId: string, testTitle: string) => {
    if (!confirm(`Delete "${testTitle}"? All marks will be deleted.`)) return
    
    try {
      await supabase.from('term_tests').delete().eq('id', testId)
      toast.success('Test deleted!')
      await loadData()
    } catch (error: any) {
      toast.error('Failed to delete test')
    }
  }

  const handleExpandTest = (testId: string, classId: string) => {
    const isExpanding = expandedTest !== testId
    setExpandedTest(isExpanding ? testId : null)
    
    if (isExpanding) {
      currentTestIdRef.current = testId
      setAutoSaveStatus('idle')
      setLastSaved(null)
      loadStudentGrades(testId, classId)
    } else {
      currentTestIdRef.current = null
    }
  }

  const resetForm = () => {
    setTestTitle('')
    setTestDescription('')
    setTestType('monthly')
    setTestDate('')
    setTotalMarks('')
    setSelectedClassSubject('')
  }

  const getTestTypeLabel = (type: string) => {
    return TEST_TYPES.find(t => t.value === type)?.label || type
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Term Tests">
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

  return (
    <DashboardLayout title="Term Tests">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Term Tests</h1>
            <p className="text-sm text-gray-500">Create and manage tests for your classes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <ClipboardList className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">Term Tests are Published Automatically</p>
                <p className="text-sm text-blue-600">
                  Once you publish a test, students and parents can immediately view the marks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{tests.length}</div>
              <p className="text-xs text-gray-600">Total Tests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-700">
                {tests.filter(t => t.is_published).length}
              </div>
              <p className="text-xs text-gray-600">Published</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-orange-700">
                {tests.filter(t => !t.is_published).length}
              </div>
              <p className="text-xs text-gray-600">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-blue-700">
                {tests.filter(t => t.graded_count === t.total_students && t.total_students > 0).length}
              </div>
              <p className="text-xs text-gray-600">Fully Graded</p>
            </CardContent>
          </Card>
        </div>

        {/* Tests List */}
        <div className="space-y-4">
          {tests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tests created yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Create your first test to track student progress
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test
                </Button>
              </CardContent>
            </Card>
          ) : (
            tests.map((test) => {
              const isExpanded = expandedTest === test.id
              const isComplete = test.graded_count === test.total_students && test.total_students > 0
              
              return (
                <Card key={test.id} className={test.is_published ? 'border-green-200 bg-green-50/30' : ''}>
                  <CardHeader 
                    className="py-4 cursor-pointer"
                    onClick={() => handleExpandTest(test.id, test.class_id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          test.is_published ? 'bg-green-100' : 'bg-orange-100'
                        }`}>
                          <ClipboardList className={`h-5 w-5 ${test.is_published ? 'text-green-600' : 'text-orange-600'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{test.title}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            {test.class_name} • {test.subject_name} • {new Date(test.test_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{getTestTypeLabel(test.test_type)}</Badge>
                        <Badge variant="outline">{test.total_marks} marks</Badge>
                        {test.is_published ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />Published
                          </Badge>
                        ) : isComplete ? (
                          <Badge className="bg-blue-100 text-blue-800">
                            <CheckCircle className="w-3 h-3 mr-1" />Ready
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 mr-1" />{test.graded_count}/{test.total_students}
                          </Badge>
                        )}
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="border-t pt-4 space-y-4">
                      {/* Test Paper Upload */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Upload className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium text-sm">Test Paper (PDF/Image)</p>
                            {test.test_paper_url ? (
                              <a 
                                href={test.test_paper_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {test.test_paper_name || 'View uploaded file'}
                              </a>
                            ) : (
                              <p className="text-xs text-gray-500">No file uploaded (optional)</p>
                            )}
                          </div>
                        </div>
                        {!test.is_published && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              className="max-w-48"
                            />
                            <Button 
                              size="sm" 
                              onClick={() => handleUploadPaper(test)}
                              disabled={!selectedFile || uploadingPaper}
                            >
                              {uploadingPaper ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Upload'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {!test.is_published && (
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
                              onClick={() => handleSaveGrades(test.id)} 
                              disabled={savingGrades || autoSaveStatus === 'saving'}
                              variant="outline"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              {savingGrades ? 'Saving...' : 'Save Now'}
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handlePublishTest(test)}
                              className="bg-green-600 hover:bg-green-700"
                              disabled={!isComplete}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Publish
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteTest(test.id, test.title)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
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
                                  {test.is_published ? (
                                    <span>{sg.marks_obtained ?? '-'}</span>
                                  ) : (
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      max={test.total_marks}
                                      value={sg.marks_obtained ?? ''} 
                                      onChange={(e) => handleMarksChange(sg.student_id, e.target.value, test)} 
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

        {/* Create Test Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Test</DialogTitle>
              <DialogDescription>Add a new term test for your class</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Test Title *</Label>
                <Input
                  placeholder="e.g., End of Month Test - October"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of the test..."
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Test Type *</Label>
                  <Select value={testType} onValueChange={setTestType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Total Marks *</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 50"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Test Date *</Label>
                <Input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Class & Subject *</Label>
                <Select value={selectedClassSubject} onValueChange={setSelectedClassSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class and subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {classSubjects.map(cs => (
                      <SelectItem 
                        key={`${cs.class_id}|${cs.subject_id}`} 
                        value={`${cs.class_id}|${cs.subject_id}`}
                      >
                        {cs.class_name} - {cs.subject_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTest} disabled={creating}>
                {creating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
