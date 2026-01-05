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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { getCurrentTerm, getDefaultExamDate } from '@/lib/term-utils'
import { Plus, Trash2, BookOpen, UserCircle, Search, RefreshCw, Users, Edit, X, AlertTriangle, FileText } from 'lucide-react'

interface Teacher {
  id: string
  full_name: string
  username: string
  assignments: Assignment[]
}

interface Assignment {
  id: string
  class_id: string
  subject_id: string
  class_name: string
  subject_name: string
  subject_code: string
  teacher_id?: string
  teacher_name?: string
}

interface ClassData {
  id: string
  grade_level: string
  section: string
}

interface Subject {
  id: string
  name: string
  code: string
}

interface ConflictInfo {
  class_id: string
  class_name: string
  existing_teacher_id: string
  existing_teacher_name: string
  existing_assignment_id: string
}

interface ConflictResolution {
  conflicts: ConflictInfo[]
  availableClasses: ClassData[]
  subjectName: string
  formLevel: string
}

export default function TeacherAssignmentsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<ClassData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Conflict resolution state
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution | null>(null)
  const [selectedConflictsToReassign, setSelectedConflictsToReassign] = useState<string[]>([])
  const [pendingAssignmentData, setPendingAssignmentData] = useState<{
    teacherId: string
    subjectId: string
    availableClasses: ClassData[]
    isEditMode: boolean
  } | null>(null)
  
  // Form states for new assignment
  const [newTeacherId, setNewTeacherId] = useState('')
  const [newSubjectId, setNewSubjectId] = useState('')
  const [newClassId, setNewClassId] = useState('')
  const [assignmentType, setAssignmentType] = useState<'class' | 'form'>('class')
  const [selectedFormLevel, setSelectedFormLevel] = useState('')

  // Form levels for Zimbabwe
  const FORM_LEVELS = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6']

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && !['school_admin', 'super_admin'].includes(profile.role)) {
      router.push('/dashboard')
      toast.error('Access denied')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.school_id) {
      loadData()
    }
  }, [profile])

  // Auto-create end of term exam when a teacher is assigned to a class/subject
  const autoCreateExam = async (
    teacherId: string,
    classId: string,
    subjectId: string,
    className: string,
    subjectName: string
  ) => {
    try {
      const currentTerm = getCurrentTerm()
      const examDate = getDefaultExamDate(currentTerm)
      const examTitle = `${className} ${subjectName} End of ${currentTerm.termName} Exam`
      
      // Check if exam already exists for this class, subject, and term
      const { data: existingExam } = await supabase
        .from('exams')
        .select('id')
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('school_id', profile?.school_id)
        .ilike('title', `%${currentTerm.termName}%`)
        .single()
      
      if (existingExam) {
        // Exam already exists, update the created_by if needed
        console.log(`Exam already exists for ${className} ${subjectName} ${currentTerm.termName}`)
        return
      }
      
      // Create the exam
      const { error } = await supabase.from('exams').insert({
        title: examTitle,
        description: `End of term examination for ${subjectName} - ${className}`,
        exam_date: examDate,
        total_marks: 100,
        class_id: classId,
        subject_id: subjectId,
        school_id: profile?.school_id,
        created_by: teacherId,
        is_submitted: false
      })
      
      if (error) {
        console.error('Error auto-creating exam:', error)
      } else {
        console.log(`Auto-created exam: ${examTitle}`)
      }
    } catch (error) {
      console.error('Error in autoCreateExam:', error)
    }
  }

  const bulkCreateMissingExams = async () => {
    try {
      setIsSaving(true)
      toast.info('Creating missing exams... This may take a moment.')

      // Get all class-subject assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('class_subject_assignments')
        .select(`
          teacher_id,
          class_id,
          subject_id,
          classes!inner(id, grade_level, section, school_id),
          subjects!inner(id, name)
        `)
        .eq('classes.school_id', profile?.school_id)

      if (assignmentsError) throw assignmentsError

      if (!assignments || assignments.length === 0) {
        toast.info('No assignments found')
        return
      }

      let created = 0
      let skipped = 0

      // Process each assignment
      for (const assignment of assignments) {
        const cls = assignment.classes as any
        const subj = assignment.subjects as any
        
        const currentTerm = getCurrentTerm()
        const examTitle = `${cls.grade_level} ${cls.section} ${subj.name} End of ${currentTerm.termName} Exam`
        
        // Check if exam exists
        const { data: existingExam } = await supabase
          .from('exams')
          .select('id')
          .eq('class_id', assignment.class_id)
          .eq('subject_id', assignment.subject_id)
          .eq('school_id', profile?.school_id)
          .ilike('title', `%${currentTerm.termName}%`)
          .single()

        if (!existingExam) {
          // Create the exam
          const examDate = getDefaultExamDate(currentTerm)
          const { error } = await supabase.from('exams').insert({
            title: examTitle,
            description: `End of term examination for ${subj.name} - ${cls.grade_level} ${cls.section}`,
            exam_date: examDate,
            total_marks: 100,
            class_id: assignment.class_id,
            subject_id: assignment.subject_id,
            school_id: profile?.school_id,
            created_by: assignment.teacher_id,
            is_submitted: false
          })

          if (error) {
            console.error('Error creating exam:', error)
          } else {
            created++
          }
        } else {
          skipped++
        }
      }

      toast.success(`Created ${created} new exams. ${skipped} already existed.`)
      await loadData()
    } catch (error: any) {
      console.error('Error bulk creating exams:', error)
      toast.error('Failed to create exams')
    } finally {
      setIsSaving(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // Load teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .eq('role', 'teacher')
        .eq('school_id', profile?.school_id)
        .order('full_name')

      if (teachersError) throw teachersError

      // Load subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('school_id', profile?.school_id)
        .order('name')

      if (subjectsError) throw subjectsError
      setSubjects(subjectsData || [])

      // Load classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, grade_level, section')
        .eq('school_id', profile?.school_id)
        .order('grade_level')
        .order('section')

      if (classesError) throw classesError
      setClasses(classesData || [])

      // Load assignments for each teacher
      const teachersWithAssignments = await Promise.all(
        (teachersData || []).map(async (teacher) => {
          const { data: assignments } = await supabase
            .from('class_subject_assignments')
            .select(`
              id,
              class_id,
              subject_id,
              classes(grade_level, section),
              subjects(name, code)
            `)
            .eq('teacher_id', teacher.id)

          return {
            ...teacher,
            assignments: (assignments || []).map((a: any) => ({
              id: a.id,
              class_id: a.class_id,
              subject_id: a.subject_id,
              class_name: `${a.classes?.grade_level} ${a.classes?.section}`,
              subject_name: a.subjects?.name || '',
              subject_code: a.subjects?.code || ''
            }))
          }
        })
      )

      setTeachers(teachersWithAssignments)
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAssignment = async () => {
    if (!newTeacherId) {
      toast.error('Please select a teacher')
      return
    }
    if (!newSubjectId) {
      toast.error('Please select a subject')
      return
    }

    try {
      setIsSaving(true)

      if (assignmentType === 'class') {
        if (!newClassId) {
          toast.error('Please select a class')
          return
        }

        // Check if this class+subject is already assigned to ANY teacher
        const { data: existingAssignment } = await supabase
          .from('class_subject_assignments')
          .select(`
            id,
            teacher_id,
            profiles!class_subject_assignments_teacher_id_fkey(full_name)
          `)
          .eq('subject_id', newSubjectId)
          .eq('class_id', newClassId)
          .single()

        if (existingAssignment) {
          const existingTeacherName = (existingAssignment as any).profiles?.full_name || 'Another teacher'
          if (existingAssignment.teacher_id === newTeacherId) {
            toast.error('This teacher already has this assignment')
          } else {
            toast.error(`${existingTeacherName} is already assigned to this class for this subject`)
          }
          return
        }

        const { error } = await supabase
          .from('class_subject_assignments')
          .insert({
            teacher_id: newTeacherId,
            subject_id: newSubjectId,
            class_id: newClassId,
            created_by: profile?.id
          })

        if (error) throw error

        const cls = classes.find(c => c.id === newClassId)
        const subj = subjects.find(s => s.id === newSubjectId)
        
        // Auto-create end of term exam
        if (cls && subj) {
          await autoCreateExam(
            newTeacherId,
            newClassId,
            newSubjectId,
            `${cls.grade_level} ${cls.section}`,
            subj.name
          )
        }
        
        toast.success(`Assigned to ${subj?.name} - ${cls?.grade_level} ${cls?.section}`)

      } else {
        // Form level - assign to all classes in that form
        if (!selectedFormLevel) {
          toast.error('Please select a form level')
          return
        }

        const formClasses = classes.filter(c => c.grade_level === selectedFormLevel)
        if (formClasses.length === 0) {
          toast.error(`No classes found for ${selectedFormLevel}`)
          return
        }

        // Check for conflicts - classes already assigned to other teachers
        const conflicts: ConflictInfo[] = []
        const availableClasses: ClassData[] = []

        for (const cls of formClasses) {
          const { data: existingAssignment } = await supabase
            .from('class_subject_assignments')
            .select(`
              id,
              teacher_id,
              profiles!class_subject_assignments_teacher_id_fkey(full_name)
            `)
            .eq('subject_id', newSubjectId)
            .eq('class_id', cls.id)
            .single()

          if (existingAssignment) {
            if (existingAssignment.teacher_id !== newTeacherId) {
              conflicts.push({
                class_id: cls.id,
                class_name: `${cls.grade_level} ${cls.section}`,
                existing_teacher_id: existingAssignment.teacher_id,
                existing_teacher_name: (existingAssignment as any).profiles?.full_name || 'Unknown',
                existing_assignment_id: existingAssignment.id
              })
            }
            // If same teacher, skip silently
          } else {
            availableClasses.push(cls)
          }
        }

        // If there are conflicts, show conflict resolution dialog
        if (conflicts.length > 0) {
          const subj = subjects.find(s => s.id === newSubjectId)
          setConflictResolution({
            conflicts,
            availableClasses,
            subjectName: subj?.name || '',
            formLevel: selectedFormLevel
          })
          setPendingAssignmentData({
            teacherId: newTeacherId,
            subjectId: newSubjectId,
            availableClasses,
            isEditMode: false
          })
          setSelectedConflictsToReassign([])
          setIsConflictDialogOpen(true)
          setIsSaving(false)
          return
        }

        // No conflicts - proceed with assignment
        let addedCount = 0
        const subj = subjects.find(s => s.id === newSubjectId)
        for (const cls of availableClasses) {
          const { error } = await supabase
            .from('class_subject_assignments')
            .insert({
              teacher_id: newTeacherId,
              subject_id: newSubjectId,
              class_id: cls.id,
              created_by: profile?.id
            })
          if (!error) {
            addedCount++
            // Auto-create end of term exam
            if (subj) {
              await autoCreateExam(
                newTeacherId,
                cls.id,
                newSubjectId,
                `${cls.grade_level} ${cls.section}`,
                subj.name
              )
            }
          }
        }

        toast.success(`Assigned to ${subj?.name} for all ${selectedFormLevel} classes (${addedCount} added)`)
      }

      resetForm()
      setIsAddDialogOpen(false)
      await loadData()

    } catch (error: any) {
      console.error('Error creating assignment:', error)
      toast.error(error.message || 'Failed to create assignment')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddAssignmentForTeacher = async () => {
    if (!selectedTeacher) return
    if (!newSubjectId) {
      toast.error('Please select a subject')
      return
    }

    try {
      setIsSaving(true)

      if (assignmentType === 'class') {
        if (!newClassId) {
          toast.error('Please select a class')
          return
        }

        // Check if this class+subject is already assigned to ANY teacher
        const { data: existingAssignment } = await supabase
          .from('class_subject_assignments')
          .select(`
            id,
            teacher_id,
            profiles!class_subject_assignments_teacher_id_fkey(full_name)
          `)
          .eq('subject_id', newSubjectId)
          .eq('class_id', newClassId)
          .single()

        if (existingAssignment) {
          const existingTeacherName = (existingAssignment as any).profiles?.full_name || 'Another teacher'
          if (existingAssignment.teacher_id === selectedTeacher.id) {
            toast.error('This teacher already has this assignment')
          } else {
            toast.error(`${existingTeacherName} is already assigned to this class for this subject`)
          }
          return
        }

        const { error } = await supabase
          .from('class_subject_assignments')
          .insert({
            teacher_id: selectedTeacher.id,
            subject_id: newSubjectId,
            class_id: newClassId,
            created_by: profile?.id
          })

        if (error) throw error

        const cls = classes.find(c => c.id === newClassId)
        const subj = subjects.find(s => s.id === newSubjectId)
        
        // Auto-create end of term exam
        if (cls && subj) {
          await autoCreateExam(
            selectedTeacher.id,
            newClassId,
            newSubjectId,
            `${cls.grade_level} ${cls.section}`,
            subj.name
          )
        }
        
        toast.success(`Added ${subj?.name} - ${cls?.grade_level} ${cls?.section}`)

      } else {
        if (!selectedFormLevel) {
          toast.error('Please select a form level')
          return
        }

        const formClasses = classes.filter(c => c.grade_level === selectedFormLevel)
        
        // Check for conflicts
        const conflicts: ConflictInfo[] = []
        const availableClasses: ClassData[] = []

        for (const cls of formClasses) {
          const { data: existingAssignment } = await supabase
            .from('class_subject_assignments')
            .select(`
              id,
              teacher_id,
              profiles!class_subject_assignments_teacher_id_fkey(full_name)
            `)
            .eq('subject_id', newSubjectId)
            .eq('class_id', cls.id)
            .single()

          if (existingAssignment) {
            if (existingAssignment.teacher_id !== selectedTeacher.id) {
              conflicts.push({
                class_id: cls.id,
                class_name: `${cls.grade_level} ${cls.section}`,
                existing_teacher_id: existingAssignment.teacher_id,
                existing_teacher_name: (existingAssignment as any).profiles?.full_name || 'Unknown',
                existing_assignment_id: existingAssignment.id
              })
            }
          } else {
            availableClasses.push(cls)
          }
        }

        // If there are conflicts, show conflict resolution dialog
        if (conflicts.length > 0) {
          const subj = subjects.find(s => s.id === newSubjectId)
          setConflictResolution({
            conflicts,
            availableClasses,
            subjectName: subj?.name || '',
            formLevel: selectedFormLevel
          })
          setPendingAssignmentData({
            teacherId: selectedTeacher.id,
            subjectId: newSubjectId,
            availableClasses,
            isEditMode: true
          })
          setSelectedConflictsToReassign([])
          setIsConflictDialogOpen(true)
          setIsSaving(false)
          return
        }

        // No conflicts - proceed
        let addedCount = 0
        const subj = subjects.find(s => s.id === newSubjectId)
        for (const cls of availableClasses) {
          const { error } = await supabase
            .from('class_subject_assignments')
            .insert({
              teacher_id: selectedTeacher.id,
              subject_id: newSubjectId,
              class_id: cls.id,
              created_by: profile?.id
            })
          if (!error) {
            addedCount++
            // Auto-create end of term exam
            if (subj) {
              await autoCreateExam(
                selectedTeacher.id,
                cls.id,
                newSubjectId,
                `${cls.grade_level} ${cls.section}`,
                subj.name
              )
            }
          }
        }

        toast.success(`Added ${subj?.name} to all ${selectedFormLevel} classes (${addedCount} added)`)
      }

      // Refresh selected teacher's assignments
      await refreshSelectedTeacher()

      setNewSubjectId('')
      setNewClassId('')
      setSelectedFormLevel('')
      await loadData()

    } catch (error: any) {
      console.error('Error:', error)
      toast.error('Failed to add assignment')
    } finally {
      setIsSaving(false)
    }
  }

  const refreshSelectedTeacher = async () => {
    if (!selectedTeacher) return
    
    const { data: assignments } = await supabase
      .from('class_subject_assignments')
      .select(`
        id,
        class_id,
        subject_id,
        classes(grade_level, section),
        subjects(name, code)
      `)
      .eq('teacher_id', selectedTeacher.id)

    setSelectedTeacher({
      ...selectedTeacher,
      assignments: (assignments || []).map((a: any) => ({
        id: a.id,
        class_id: a.class_id,
        subject_id: a.subject_id,
        class_name: `${a.classes?.grade_level} ${a.classes?.section}`,
        subject_name: a.subjects?.name || '',
        subject_code: a.subjects?.code || ''
      }))
    })
  }

  const handleConflictResolution = async () => {
    if (!pendingAssignmentData || !conflictResolution) return

    try {
      setIsSaving(true)

      // First, reassign selected conflicts (remove from other teachers)
      for (const classId of selectedConflictsToReassign) {
        const conflict = conflictResolution.conflicts.find(c => c.class_id === classId)
        if (conflict) {
          // Delete the existing assignment
          await supabase
            .from('class_subject_assignments')
            .delete()
            .eq('id', conflict.existing_assignment_id)
        }
      }

      // Now create new assignments for available classes + reassigned classes
      const classesToAssign = [
        ...pendingAssignmentData.availableClasses,
        ...conflictResolution.conflicts
          .filter(c => selectedConflictsToReassign.includes(c.class_id))
          .map(c => classes.find(cls => cls.id === c.class_id)!)
          .filter(Boolean)
      ]

      let addedCount = 0
      const subj = subjects.find(s => s.id === pendingAssignmentData.subjectId)
      for (const cls of classesToAssign) {
        const { error } = await supabase
          .from('class_subject_assignments')
          .insert({
            teacher_id: pendingAssignmentData.teacherId,
            subject_id: pendingAssignmentData.subjectId,
            class_id: cls.id,
            created_by: profile?.id
          })
        if (!error) {
          addedCount++
          // Auto-create end of term exam
          if (subj) {
            await autoCreateExam(
              pendingAssignmentData.teacherId,
              cls.id,
              pendingAssignmentData.subjectId,
              `${cls.grade_level} ${cls.section}`,
              subj.name
            )
          }
        }
      }

      const skippedCount = conflictResolution.conflicts.length - selectedConflictsToReassign.length
      
      if (addedCount > 0) {
        toast.success(`Assigned ${addedCount} class(es). ${skippedCount > 0 ? `Skipped ${skippedCount} conflict(s).` : ''}`)
      } else if (skippedCount > 0) {
        toast.info(`Skipped all ${skippedCount} conflicting classes`)
      }

      // Close dialogs and refresh
      setIsConflictDialogOpen(false)
      setConflictResolution(null)
      setPendingAssignmentData(null)
      
      if (pendingAssignmentData.isEditMode) {
        await refreshSelectedTeacher()
      } else {
        setIsAddDialogOpen(false)
        resetForm()
      }
      
      await loadData()

    } catch (error: any) {
      console.error('Error resolving conflicts:', error)
      toast.error('Failed to complete assignment')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('class_subject_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      toast.success('Assignment removed')

      // Update selected teacher if in edit mode
      if (selectedTeacher) {
        setSelectedTeacher({
          ...selectedTeacher,
          assignments: selectedTeacher.assignments.filter(a => a.id !== assignmentId)
        })
      }

      await loadData()
    } catch (error: any) {
      toast.error('Failed to remove assignment')
    }
  }

  const resetForm = () => {
    setNewTeacherId('')
    setNewSubjectId('')
    setNewClassId('')
    setSelectedFormLevel('')
    setAssignmentType('class')
  }

  const openEditDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    resetForm()
    setIsEditDialogOpen(true)
  }

  // Filter teachers
  const filteredTeachers = teachers.filter(t => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return t.full_name.toLowerCase().includes(query) ||
           t.username.toLowerCase().includes(query) ||
           t.assignments.some(a => 
             a.subject_name.toLowerCase().includes(query) ||
             a.class_name.toLowerCase().includes(query)
           )
  })

  // Stats
  const stats = {
    totalTeachers: teachers.length,
    assignedTeachers: teachers.filter(t => t.assignments.length > 0).length,
    totalAssignments: teachers.reduce((sum, t) => sum + t.assignments.length, 0)
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Teacher Assignments">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout title="Teacher Assignments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teacher Assignments</h1>
            <p className="text-sm text-gray-500">Assign teachers to subjects and classes</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={bulkCreateMissingExams}
              disabled={isSaving}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {isSaving ? 'Creating...' : 'Create Missing Exams'}
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Teachers</p>
                  <p className="text-2xl font-bold">{stats.totalTeachers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">With Assignments</p>
                  <p className="text-2xl font-bold text-green-600">{stats.assignedTeachers}</p>
                </div>
                <UserCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Assignments</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalAssignments}</p>
                </div>
                <BookOpen className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by teacher, subject, or class..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Teachers Table */}
        <Card>
          <CardContent className="pt-0 pb-0">
            {filteredTeachers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Subjects & Classes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <UserCircle className="h-6 w-6 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium">{teacher.full_name}</p>
                            <p className="text-xs text-gray-500">{teacher.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {teacher.assignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {teacher.assignments.slice(0, 5).map((a) => (
                              <Badge key={a.id} variant="secondary" className="text-xs">
                                {a.subject_name} - {a.class_name}
                              </Badge>
                            ))}
                            {teacher.assignments.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{teacher.assignments.length - 5} more
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No assignments yet</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(teacher)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No teachers found</h3>
                <p className="text-sm text-gray-500">
                  {teachers.length === 0 
                    ? 'Add teachers in Staff Management first'
                    : 'No matching results'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Assignment Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Assignment</DialogTitle>
              <DialogDescription>Assign a teacher to teach a subject</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Teacher *</Label>
                <Select value={newTeacherId} onValueChange={setNewTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={assignmentType} onValueChange={(v) => setAssignmentType(v as 'class' | 'form')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class">Specific Class</SelectItem>
                    <SelectItem value="form">All classes in a Form</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {assignmentType === 'class' ? (
                <div className="space-y-2">
                  <Label>Class *</Label>
                  <Select value={newClassId} onValueChange={setNewClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.grade_level} {c.section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Form Level *</Label>
                  <Select value={selectedFormLevel} onValueChange={setSelectedFormLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORM_LEVELS.map(f => (
                        <SelectItem key={f} value={f}>{f} ({classes.filter(c => c.grade_level === f).length} classes)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    This will assign the subject to all classes in the selected form
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddAssignment} disabled={isSaving}>
                {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Teacher Assignments Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                {selectedTeacher?.full_name}
              </DialogTitle>
              <DialogDescription>
                Manage teaching assignments for this teacher
              </DialogDescription>
            </DialogHeader>

            {selectedTeacher && (
              <div className="space-y-6 py-4">
                {/* Current Assignments */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Current Assignments ({selectedTeacher.assignments.length})</h3>
                  {selectedTeacher.assignments.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedTeacher.assignments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">{a.subject_code}</Badge>
                            <div>
                              <p className="font-medium text-sm">{a.subject_name}</p>
                              <p className="text-xs text-gray-500">{a.class_name}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveAssignment(a.id)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                      No assignments yet
                    </p>
                  )}
                </div>

                {/* Add New Assignment */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3">Add New Assignment</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select value={assignmentType} onValueChange={(v) => setAssignmentType(v as 'class' | 'form')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="class">Specific Class</SelectItem>
                          <SelectItem value="form">All Form Classes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {assignmentType === 'class' ? (
                      <div className="space-y-2">
                        <Label>Class</Label>
                        <Select value={newClassId} onValueChange={setNewClassId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.grade_level} {c.section}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Form Level</Label>
                        <Select value={selectedFormLevel} onValueChange={setSelectedFormLevel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select form" />
                          </SelectTrigger>
                          <SelectContent>
                            {FORM_LEVELS.map(f => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-end">
                      <Button 
                        onClick={handleAddAssignmentForTeacher} 
                        disabled={isSaving}
                        className="w-full"
                      >
                        {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Conflict Resolution Dialog */}
        <Dialog open={isConflictDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsConflictDialogOpen(false)
            setConflictResolution(null)
            setPendingAssignmentData(null)
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Assignment Conflicts Detected
              </DialogTitle>
              <DialogDescription>
                Some classes already have a teacher assigned for this subject
              </DialogDescription>
            </DialogHeader>

            {conflictResolution && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-800">
                    {conflictResolution.subjectName} - {conflictResolution.formLevel}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    {conflictResolution.conflicts.length} conflict(s) found, {conflictResolution.availableClasses.length} class(es) available
                  </p>
                </div>

                {/* Available Classes */}
                {conflictResolution.availableClasses.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2">
                      ✓ Will be assigned ({conflictResolution.availableClasses.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {conflictResolution.availableClasses.map(cls => (
                        <Badge key={cls.id} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {cls.grade_level} {cls.section}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conflicts */}
                <div>
                  <h4 className="text-sm font-medium text-amber-700 mb-2">
                    Conflicts - Select to reassign from other teachers:
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {conflictResolution.conflicts.map((conflict) => (
                      <div
                        key={conflict.class_id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedConflictsToReassign.includes(conflict.class_id)
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          setSelectedConflictsToReassign(prev =>
                            prev.includes(conflict.class_id)
                              ? prev.filter(id => id !== conflict.class_id)
                              : [...prev, conflict.class_id]
                          )
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedConflictsToReassign.includes(conflict.class_id)}
                            onCheckedChange={(checked) => {
                              setSelectedConflictsToReassign(prev =>
                                checked
                                  ? [...prev, conflict.class_id]
                                  : prev.filter(id => id !== conflict.class_id)
                              )
                            }}
                          />
                          <div>
                            <p className="font-medium text-sm">{conflict.class_name}</p>
                            <p className="text-xs text-gray-500">
                              Currently: {conflict.existing_teacher_name}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                  <strong>Note:</strong> Checked classes will be reassigned to the new teacher. Unchecked classes will keep their current teacher.
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsConflictDialogOpen(false)
                  setConflictResolution(null)
                  setPendingAssignmentData(null)
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConflictResolution} 
                disabled={isSaving}
              >
                {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                {conflictResolution?.availableClasses.length === 0 && selectedConflictsToReassign.length === 0
                  ? 'No Classes Selected'
                  : `Proceed (${(conflictResolution?.availableClasses.length || 0) + selectedConflictsToReassign.length} classes)`
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
