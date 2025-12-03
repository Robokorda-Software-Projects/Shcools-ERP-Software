'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, FileText, Loader2, Edit, Filter, X, Search } from 'lucide-react'

interface ExamWithDetails {
  id: string
  title: string
  description: string
  exam_date: string
  total_marks: number
  created_at: string
  class_id: string
  subject_id: string
  grade_level?: string
  section?: string
  subject_name?: string
  school_name?: string
  creator_name?: string
}

interface StudentGrade {
  student_id: string
  student_name: string
  roll_number: string
  marks_obtained: number | null
  percentage: number | null
  grade: string | null
}

export default function ExamsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [exams, setExams] = useState<ExamWithDetails[]>([])
  const [filteredExams, setFilteredExams] = useState<ExamWithDetails[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [gradesDialogOpen, setGradesDialogOpen] = useState(false)
  const [selectedExam, setSelectedExam] = useState<ExamWithDetails | null>(null)
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([])
  const [filteredStudentGrades, setFilteredStudentGrades] = useState<StudentGrade[]>([])
  const [savingGrades, setSavingGrades] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Filter states
  const [filterClass, setFilterClass] = useState<string>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    exam_date: '',
    total_marks: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [profile])

  useEffect(() => {
    applyFilters()
  }, [exams, filterClass, filterSubject, searchQuery])

  useEffect(() => {
    applyStudentSearch()
  }, [studentGrades, studentSearchQuery])

  const applyFilters = () => {
    let filtered = [...exams]

    // Filter by class
    if (filterClass !== 'all') {
      filtered = filtered.filter(exam => exam.class_id === filterClass)
    }

    // Filter by subject
    if (filterSubject !== 'all') {
      filtered = filtered.filter(exam => exam.subject_id === filterSubject)
    }

    // Search by title
    if (searchQuery.trim()) {
      filtered = filtered.filter(exam => 
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredExams(filtered)
  }

  const applyStudentSearch = () => {
    if (studentSearchQuery.trim()) {
      const filtered = studentGrades.filter(sg =>
        sg.student_name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        sg.roll_number.toLowerCase().includes(studentSearchQuery.toLowerCase())
      )
      setFilteredStudentGrades(filtered)
    } else {
      setFilteredStudentGrades(studentGrades)
    }
  }

  const clearFilters = () => {
    setFilterClass('all')
    setFilterSubject('all')
    setSearchQuery('')
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch classes
      let classQuery = supabase.from('classes').select('id, grade_level, section, school_id').order('grade_level')
      if (profile?.role !== 'super_admin' && profile?.school_id) {
        classQuery = classQuery.eq('school_id', profile.school_id)
      }
      const { data: classData, error: classError } = await classQuery
      if (classError) throw classError
      setClasses(classData || [])

      // Fetch subjects
      let subjectQuery = supabase.from('subjects').select('*').order('name')
      if (profile?.role !== 'super_admin' && profile?.school_id) {
        subjectQuery = subjectQuery.eq('school_id', profile.school_id)
      }
      const { data: subjectData, error: subjectError } = await subjectQuery
      if (subjectError) throw subjectError
      setSubjects(subjectData || [])

      // Fetch exams
      let examQuery = supabase
        .from('exams')
        .select('id, title, description, exam_date, total_marks, class_id, subject_id, created_by, created_at')
        .order('exam_date', { ascending: false })

      if (profile?.role !== 'super_admin' && profile?.school_id) {
        examQuery = examQuery.eq('school_id', profile.school_id)
      }

      const { data: examData, error: examError } = await examQuery
      if (examError) throw examError

      // Enrich exam data
      const enrichedExams = await Promise.all(
        (examData || []).map(async (exam) => {
          const classInfo = classData?.find(c => c.id === exam.class_id)
          const subjectInfo = subjectData?.find(s => s.id === exam.subject_id)
          
          const { data: creatorData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', exam.created_by)
            .single()

          return {
            ...exam,
            grade_level: classInfo?.grade_level || 'Unknown',
            section: classInfo?.section || '',
            subject_name: subjectInfo?.name || 'Unknown',
            creator_name: creatorData?.full_name || 'Unknown'
          }
        })
      )

      setExams(enrichedExams)
      setFilteredExams(enrichedExams)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  const createExam = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)

      const selectedClass = classes.find(c => c.id === formData.class_id)
      const schoolId = selectedClass?.school_id || profile?.school_id

      const { error } = await supabase.from('exams').insert({
        title: formData.title,
        description: formData.description,
        class_id: formData.class_id,
        subject_id: formData.subject_id,
        exam_date: formData.exam_date,
        total_marks: parseInt(formData.total_marks),
        school_id: schoolId,
        created_by: profile?.id
      })

      if (error) throw error

      toast.success('Exam created successfully!')
      setCreateDialogOpen(false)
      setFormData({ title: '', description: '', class_id: '', subject_id: '', exam_date: '', total_marks: '' })
      fetchData()
    } catch (error: any) {
      console.error('Error creating exam:', error)
      toast.error('Failed to create exam')
    } finally {
      setSubmitting(false)
    }
  }

  const openGradesDialog = async (exam: ExamWithDetails) => {
    try {
      setSelectedExam(exam)
      setStudentSearchQuery('')
      
      // Fetch students in this class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, roll_number, profiles!students_user_id_fkey(full_name)')
        .eq('class_id', exam.class_id)
        .order('roll_number')

      if (studentsError) throw studentsError

      // Fetch existing grades
      const { data: gradesData } = await supabase
        .from('exam_results')
        .select('student_id, marks_obtained, percentage, grade')
        .eq('exam_id', exam.id)

      const grades: StudentGrade[] = (studentsData || []).map((student: any) => {
        const existingGrade = gradesData?.find(g => g.student_id === student.id)
        return {
          student_id: student.id,
          student_name: student.profiles?.full_name || 'Unknown',
          roll_number: student.roll_number,
          marks_obtained: existingGrade?.marks_obtained || null,
          percentage: existingGrade?.percentage || null,
          grade: existingGrade?.grade || null
        }
      })

      setStudentGrades(grades)
      setFilteredStudentGrades(grades)
      setGradesDialogOpen(true)
    } catch (error: any) {
      console.error('Error loading grades:', error)
      toast.error('Failed to load student grades')
    }
  }

  const updateMarks = (studentId: string, marks: string) => {
    const marksNum = parseFloat(marks) || 0
    const percentage = selectedExam ? (marksNum / selectedExam.total_marks) * 100 : 0
    
    let grade = 'F'
    if (percentage >= 90) grade = 'A'
    else if (percentage >= 80) grade = 'B'
    else if (percentage >= 70) grade = 'C'
    else if (percentage >= 60) grade = 'D'
    else if (percentage >= 50) grade = 'E'

    setStudentGrades(prev => prev.map(sg => 
      sg.student_id === studentId 
        ? { ...sg, marks_obtained: marksNum, percentage, grade }
        : sg
    ))
  }

  const saveGrades = async () => {
    if (!selectedExam) return

    try {
      setSavingGrades(true)

      const gradesWithMarks = studentGrades.filter(sg => sg.marks_obtained !== null)

      for (const studentGrade of gradesWithMarks) {
        const { error } = await supabase.from('exam_results').upsert({
          exam_id: selectedExam.id,
          student_id: studentGrade.student_id,
          marks_obtained: studentGrade.marks_obtained,
          percentage: studentGrade.percentage,
          grade: studentGrade.grade,
          graded_by: profile?.id,
          graded_at: new Date().toISOString()
        }, { onConflict: 'exam_id,student_id' })

        if (error) throw error
      }

      toast.success('Grades saved successfully!')
      setGradesDialogOpen(false)
    } catch (error: any) {
      console.error('Error saving grades:', error)
      toast.error('Failed to save grades')
    } finally {
      setSavingGrades(false)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Exams">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) return null

  const canManage = ['super_admin', 'school_admin', 'teacher'].includes(profile?.role || '')
  const hasActiveFilters = filterClass !== 'all' || filterSubject !== 'all' || searchQuery.trim() !== ''

  return (
    <DashboardLayout title="Exams">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Exams</CardTitle>
              <CardDescription>
                Manage examinations and grades
                {hasActiveFilters && (
                  <span className="text-blue-600 ml-2">
                    (Showing {filteredExams.length} of {exams.length})
                  </span>
                )}
              </CardDescription>
            </div>
            {canManage && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Exam
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Exam</DialogTitle>
                    <DialogDescription>Add examination details</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createExam} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Class *</Label>
                      <Select value={formData.class_id} onValueChange={(value) => setFormData({...formData, class_id: value})} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.grade_level} {cls.section}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      <Select value={formData.subject_id} onValueChange={(value) => setFormData({...formData, subject_id: value})} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Exam Date *</Label>
                      <Input type="date" value={formData.exam_date} onChange={(e) => setFormData({...formData, exam_date: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Marks *</Label>
                      <Input type="number" value={formData.total_marks} onChange={(e) => setFormData({...formData, total_marks: e.target.value})} required />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Exam
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Section */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Search Exams</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-[200px]">
              <Label>Filter by Class</Label>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.grade_level} {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Label>Filter by Subject</Label>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Exams Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Marks</TableHead>
                <TableHead>Created By</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    {hasActiveFilters ? 'No exams match your filters' : 'No exams found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredExams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.title}</TableCell>
                    <TableCell>{exam.grade_level} {exam.section}</TableCell>
                    <TableCell>{exam.subject_name}</TableCell>
                    <TableCell>{new Date(exam.exam_date).toLocaleDateString()}</TableCell>
                    <TableCell>{exam.total_marks}</TableCell>
                    <TableCell>{exam.creator_name}</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openGradesDialog(exam)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Enter Grades
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Grades Entry Dialog */}
      <Dialog open={gradesDialogOpen} onOpenChange={setGradesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Enter Grades: {selectedExam?.title}</DialogTitle>
            <DialogDescription>
              {selectedExam?.grade_level} {selectedExam?.section} - Total Marks: {selectedExam?.total_marks}
            </DialogDescription>
          </DialogHeader>
          
          {/* Student Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search students by name or roll number..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Students Table */}
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Marks Obtained</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudentGrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      {studentSearchQuery ? 'No students match your search' : 'No students found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudentGrades.map((sg) => (
                    <TableRow key={sg.student_id}>
                      <TableCell>{sg.roll_number}</TableCell>
                      <TableCell>{sg.student_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={selectedExam?.total_marks}
                          value={sg.marks_obtained || ''}
                          onChange={(e) => updateMarks(sg.student_id, e.target.value)}
                          className="w-24"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>{sg.percentage?.toFixed(1) || '-'}%</TableCell>
                      <TableCell>
                        {sg.grade && (
                          <Badge className={
                            sg.grade === 'A' ? 'bg-green-500' :
                            sg.grade === 'B' ? 'bg-blue-500' :
                            sg.grade === 'C' ? 'bg-yellow-500' :
                            sg.grade === 'D' ? 'bg-orange-500' :
                            sg.grade === 'E' ? 'bg-red-400' : 'bg-red-600'
                          }>
                            {sg.grade}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              {studentGrades.filter(sg => sg.marks_obtained !== null).length} of {studentGrades.length} graded
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setGradesDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveGrades} disabled={savingGrades} className="bg-blue-600 hover:bg-blue-700">
                {savingGrades && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Grades
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
