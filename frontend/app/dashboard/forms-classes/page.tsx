'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  GraduationCap, 
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  RefreshCw,
  User,
  Calendar,
  Layers,
  BookOpen
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ClassData {
  id: string
  school_id: string
  grade_level: string  // e.g., "Form 1", "Form 2"
  section: string      // e.g., "A", "Blue", "Red"
  academic_year: string
  class_teacher_id: string | null
  class_teacher?: {
    id: string
    full_name: string
  }
  student_count?: number
  subject_count?: number
  created_at: string
}

interface Teacher {
  id: string
  full_name: string
}

interface Subject {
  id: string
  name: string
  code: string
}

interface ClassSubjectAssignment {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string | null
}

interface NewClassForm {
  grade_level: string
  section: string
  academic_year: string
  class_teacher_id: string
}

// Zimbabwean school forms - Updated with Lower 6/Upper 6 streams
const GRADE_LEVELS = [
  'Form 1',
  'Form 2', 
  'Form 3',
  'Form 4',
  'Lower 6 Arts',
  'Lower 6 Commercials',
  'Lower 6 Sciences',
  'Upper 6 Arts',
  'Upper 6 Commercials',
  'Upper 6 Sciences'
]

// Common section names
const SECTION_SUGGESTIONS = ['A', 'B', 'C', 'D', 'E', 'Red', 'Blue', 'Green', 'Yellow', 'Orange']

export default function FormsClassesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [classes, setClasses] = useState<ClassData[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubjectsDialogOpen, setIsSubjectsDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null)
  const [classSubjects, setClassSubjects] = useState<string[]>([]) // IDs of assigned subjects
  const [isSaving, setIsSaving] = useState(false)
  
  const currentYear = new Date().getFullYear()
  const [newClass, setNewClass] = useState<NewClassForm>({
    grade_level: '',
    section: '',
    academic_year: `${currentYear}`,
    class_teacher_id: ''
  })

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
    if (profile?.school_id || profile?.role === 'super_admin') {
      loadClasses()
      loadTeachers()
      loadSubjects()
    }
  }, [profile])

  const loadClasses = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('classes')
        .select(`
          *,
          class_teacher:profiles!classes_class_teacher_id_fkey(id, full_name)
        `)
        .order('grade_level', { ascending: true })
        .order('section', { ascending: true })

      if (profile?.school_id) {
        query = query.eq('school_id', profile.school_id)
      }

      const { data, error } = await query

      if (error) throw error

      // Get student counts and subject counts for each class
      const classesWithCounts = await Promise.all((data || []).map(async (cls) => {
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('school_id', cls.school_id)
          .eq('student_status', 'active')

        const { count: subjectCount } = await supabase
          .from('class_subject_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)

        return {
          ...cls,
          student_count: studentCount || 0,
          subject_count: subjectCount || 0
        }
      }))

      setClasses(classesWithCounts)
    } catch (error: any) {
      console.error('Error loading classes:', error)
      toast.error('Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  const loadTeachers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'teacher')
        .order('full_name')

      if (profile?.school_id) {
        query = query.eq('school_id', profile.school_id)
      }

      const { data, error } = await query

      if (error) throw error
      setTeachers(data || [])
    } catch (error: any) {
      console.error('Error loading teachers:', error)
    }
  }

  const loadSubjects = async () => {
    try {
      let query = supabase
        .from('subjects')
        .select('id, name, code')
        .order('name')

      if (profile?.school_id) {
        query = query.eq('school_id', profile.school_id)
      }

      const { data, error } = await query

      if (error) throw error
      setSubjects(data || [])
    } catch (error: any) {
      console.error('Error loading subjects:', error)
    }
  }

  const openSubjectsDialog = async (classData: ClassData) => {
    setSelectedClass(classData)
    
    // Load current subjects for this class
    const { data, error } = await supabase
      .from('class_subject_assignments')
      .select('subject_id')
      .eq('class_id', classData.id)
    
    if (!error && data) {
      setClassSubjects(data.map(d => d.subject_id))
    } else {
      setClassSubjects([])
    }
    
    setIsSubjectsDialogOpen(true)
  }

  const handleSubjectToggle = (subjectId: string) => {
    setClassSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  const saveClassSubjects = async () => {
    if (!selectedClass) return

    try {
      setIsSaving(true)

      // Get existing assignments
      const { data: existing } = await supabase
        .from('class_subject_assignments')
        .select('id, subject_id')
        .eq('class_id', selectedClass.id)

      const existingSubjectIds = existing?.map(e => e.subject_id) || []
      
      // Subjects to add
      const toAdd = classSubjects.filter(id => !existingSubjectIds.includes(id))
      
      // Subjects to remove
      const toRemove = existingSubjectIds.filter(id => !classSubjects.includes(id))

      // Remove subjects
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('class_subject_assignments')
          .delete()
          .eq('class_id', selectedClass.id)
          .in('subject_id', toRemove)

        if (deleteError) throw deleteError
      }

      // Add new subjects
      if (toAdd.length > 0) {
        const newAssignments = toAdd.map(subjectId => ({
          class_id: selectedClass.id,
          subject_id: subjectId,
          created_by: profile?.id
        }))

        const { error: insertError } = await supabase
          .from('class_subject_assignments')
          .insert(newAssignments)

        if (insertError) throw insertError
      }

      toast.success(`Updated subjects for ${selectedClass.grade_level} ${selectedClass.section}`)
      setIsSubjectsDialogOpen(false)
      await loadClasses()
    } catch (error: any) {
      console.error('Error saving class subjects:', error)
      toast.error('Failed to update subjects')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddClass = async () => {
    if (!profile?.school_id) {
      toast.error('No school associated with your account')
      return
    }

    if (!newClass.grade_level) {
      toast.error('Please select a form/grade level')
      return
    }
    if (!newClass.section.trim()) {
      toast.error('Please enter a section name')
      return
    }

    try {
      setIsSaving(true)

      // Check if class already exists
      const { data: existing } = await supabase
        .from('classes')
        .select('id')
        .eq('school_id', profile.school_id)
        .eq('grade_level', newClass.grade_level)
        .eq('section', newClass.section.trim())
        .eq('academic_year', newClass.academic_year)
        .single()

      if (existing) {
        toast.error(`${newClass.grade_level} ${newClass.section} already exists for ${newClass.academic_year}`)
        setIsSaving(false)
        return
      }

      const { error } = await supabase
        .from('classes')
        .insert({
          school_id: profile.school_id,
          grade_level: newClass.grade_level,
          section: newClass.section.trim(),
          academic_year: newClass.academic_year,
          class_teacher_id: newClass.class_teacher_id || null
        })

      if (error) throw error

      toast.success(`${newClass.grade_level} ${newClass.section} created successfully!`)
      
      setNewClass({
        grade_level: '',
        section: '',
        academic_year: `${currentYear}`,
        class_teacher_id: ''
      })
      setIsAddDialogOpen(false)
      await loadClasses()

    } catch (error: any) {
      console.error('Error adding class:', error)
      toast.error(error.message || 'Failed to create class')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditClass = async () => {
    if (!selectedClass) return

    try {
      setIsSaving(true)

      const { error } = await supabase
        .from('classes')
        .update({
          grade_level: newClass.grade_level,
          section: newClass.section.trim(),
          academic_year: newClass.academic_year,
          class_teacher_id: newClass.class_teacher_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedClass.id)

      if (error) throw error

      toast.success('Class updated successfully!')
      setIsEditDialogOpen(false)
      setSelectedClass(null)
      await loadClasses()

    } catch (error: any) {
      console.error('Error updating class:', error)
      toast.error(error.message || 'Failed to update class')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClass = async (classData: ClassData) => {
    if (classData.student_count && classData.student_count > 0) {
      toast.error(`Cannot delete ${classData.grade_level} ${classData.section} - it has ${classData.student_count} students enrolled`)
      return
    }

    if (!confirm(`Are you sure you want to delete ${classData.grade_level} ${classData.section}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classData.id)

      if (error) throw error

      toast.success(`${classData.grade_level} ${classData.section} deleted`)
      await loadClasses()
    } catch (error: any) {
      console.error('Error deleting class:', error)
      toast.error('Failed to delete class')
    }
  }

  const openEditDialog = (classData: ClassData) => {
    setSelectedClass(classData)
    setNewClass({
      grade_level: classData.grade_level,
      section: classData.section,
      academic_year: classData.academic_year,
      class_teacher_id: classData.class_teacher_id || ''
    })
    setIsEditDialogOpen(true)
  }

  // Get list of teacher IDs already assigned as class teachers
  const assignedClassTeacherIds = new Set(
    classes
      .filter(c => c.class_teacher_id)
      .map(c => c.class_teacher_id as string)
  )

  // Available teachers for Add dialog (exclude those already assigned)
  const availableTeachersForAdd = teachers.filter(t => !assignedClassTeacherIds.has(t.id))

  // Available teachers for Edit dialog (include current class teacher, exclude others)
  const getAvailableTeachersForEdit = () => {
    if (!selectedClass) return teachers
    return teachers.filter(t => 
      t.id === selectedClass.class_teacher_id || !assignedClassTeacherIds.has(t.id)
    )
  }

  // Filter classes
  const filteredClasses = classes.filter(c => {
    const matchesSearch = 
      c.grade_level.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.class_teacher?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGrade = gradeFilter === 'all' || c.grade_level === gradeFilter
    return matchesSearch && matchesGrade
  })

  // Group by grade level for display
  const groupedClasses = GRADE_LEVELS.reduce((acc, level) => {
    acc[level] = filteredClasses.filter(c => c.grade_level === level)
    return acc
  }, {} as Record<string, ClassData[]>)

  // Stats
  const stats = {
    total: classes.length,
    totalStudents: classes.reduce((sum, c) => sum + (c.student_count || 0), 0),
    withTeacher: classes.filter(c => c.class_teacher_id).length,
    grades: [...new Set(classes.map(c => c.grade_level))].length
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Forms & Classes">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading classes...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout title="Forms & Classes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Forms & Classes</h1>
            <p className="text-sm text-gray-500">Manage forms, sections, and class teachers</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Class</DialogTitle>
                <DialogDescription>
                  Create a new form/section for your school
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Form/Grade Level *</Label>
                  <Select
                    value={newClass.grade_level}
                    onValueChange={(value) => setNewClass(prev => ({ ...prev, grade_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Section Name *</Label>
                  <Input
                    id="section"
                    placeholder="e.g., A, B, Red, Blue"
                    value={newClass.section}
                    onChange={(e) => setNewClass(prev => ({ ...prev, section: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-1">
                    {SECTION_SUGGESTIONS.map(s => (
                      <Button
                        key={s}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setNewClass(prev => ({ ...prev, section: s }))}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Select
                    value={newClass.academic_year}
                    onValueChange={(value) => setNewClass(prev => ({ ...prev, academic_year: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={`${currentYear - 1}`}>{currentYear - 1}</SelectItem>
                      <SelectItem value={`${currentYear}`}>{currentYear}</SelectItem>
                      <SelectItem value={`${currentYear + 1}`}>{currentYear + 1}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Class Teacher (Optional)</Label>
                  <Select
                    value={newClass.class_teacher_id || 'none'}
                    onValueChange={(value) => setNewClass(prev => ({ ...prev, class_teacher_id: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No class teacher</SelectItem>
                      {availableTeachersForAdd.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {teachers.length === 0 && (
                    <p className="text-xs text-amber-600">No teachers found. Add teachers in Staff Management first.</p>
                  )}
                  {teachers.length > 0 && availableTeachersForAdd.length === 0 && (
                    <p className="text-xs text-amber-600">All teachers are already assigned as class teachers.</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleAddClass} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Class
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Classes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Layers className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Students</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">With Class Teacher</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.withTeacher}</p>
                </div>
                <User className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Forms/Grades</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.grades}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by class name or teacher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  {GRADE_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadClasses}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Classes Grid by Form */}
        {filteredClasses.length > 0 ? (
          <div className="space-y-6">
            {GRADE_LEVELS.map(level => {
              const levelClasses = groupedClasses[level]
              if (!levelClasses || levelClasses.length === 0) return null

              return (
                <Card key={level}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                      {level}
                      <Badge variant="secondary" className="ml-2">{levelClasses.length} sections</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {levelClasses.map(cls => (
                        <div
                          key={cls.id}
                          className="border rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {cls.grade_level} {cls.section}
                              </h3>
                              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <Calendar className="h-3 w-3" />
                                {cls.academic_year}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openEditDialog(cls)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openSubjectsDialog(cls)}>
                                  <BookOpen className="h-4 w-4 mr-2" />
                                  Manage Subjects ({cls.subject_count || 0})
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/students/enrolled?class_id=${cls.id}`)}>
                                  <Users className="h-4 w-4 mr-2" />
                                  View Students ({cls.student_count || 0})
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteClass(cls)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">
                                {cls.class_teacher?.full_name || 'No class teacher assigned'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">
                                {cls.student_count || 0} students
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <BookOpen className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">
                                {cls.subject_count || 0} subjects
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <GraduationCap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery || gradeFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first class'}
                </p>
                {!searchQuery && gradeFilter === 'all' && (
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Class
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
              <DialogDescription>
                Update class details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Form/Grade Level *</Label>
                <Select
                  value={newClass.grade_level}
                  onValueChange={(value) => setNewClass(prev => ({ ...prev, grade_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_section">Section Name *</Label>
                <Input
                  id="edit_section"
                  placeholder="e.g., A, B, Red, Blue"
                  value={newClass.section}
                  onChange={(e) => setNewClass(prev => ({ ...prev, section: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select
                  value={newClass.academic_year}
                  onValueChange={(value) => setNewClass(prev => ({ ...prev, academic_year: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={`${currentYear - 1}`}>{currentYear - 1}</SelectItem>
                    <SelectItem value={`${currentYear}`}>{currentYear}</SelectItem>
                    <SelectItem value={`${currentYear + 1}`}>{currentYear + 1}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Class Teacher</Label>
                <Select
                  value={newClass.class_teacher_id || 'none'}
                  onValueChange={(value) => setNewClass(prev => ({ ...prev, class_teacher_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No class teacher</SelectItem>
                    {getAvailableTeachersForEdit().map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleEditClass} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Subjects Dialog */}
        <Dialog open={isSubjectsDialogOpen} onOpenChange={setIsSubjectsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Subjects</DialogTitle>
              <DialogDescription>
                {selectedClass && `Assign subjects to ${selectedClass.grade_level} ${selectedClass.section}`}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {subjects.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No subjects found.</p>
                  <p className="text-sm text-gray-400">Please add subjects in Subjects Management first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">
                      {classSubjects.length} of {subjects.length} subjects selected
                    </span>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setClassSubjects(subjects.map(s => s.id))}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setClassSubjects([])}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
                    {subjects.map(subject => (
                      <div
                        key={subject.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          classSubjects.includes(subject.id)
                            ? 'bg-blue-50 border-blue-300'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSubjectToggle(subject.id)}
                      >
                        <Checkbox
                          checked={classSubjects.includes(subject.id)}
                          onCheckedChange={() => handleSubjectToggle(subject.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{subject.name}</p>
                          {subject.code && (
                            <p className="text-xs text-gray-500">{subject.code}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSubjectsDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={saveClassSubjects} disabled={isSaving || subjects.length === 0}>
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Save Subjects
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
