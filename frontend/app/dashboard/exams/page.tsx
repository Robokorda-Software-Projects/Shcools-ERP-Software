'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, FileText, Calendar, ChevronDown, ChevronUp, Trash2, CheckCircle, Clock, Save } from 'lucide-react'

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
  result_id: string | null
}

export default function TeacherExamsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedExam, setExpandedExam] = useState<string | null>(null)
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([])
  const [savingGrades, setSavingGrades] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [examTitle, setExamTitle] = useState('')
  const [examDescription, setExamDescription] = useState('')
  const [examDate, setExamDate] = useState('')
  const [totalMarks, setTotalMarks] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'teacher') {
      loadData()
    }
  }, [profile])

  const loadData = async () => {
    setLoading(true)

    try {
      // Get teacher's classes
      const { data: classAssignments } = await supabase
        .from('class_subject_assignments')
        .select(`
          class_id,
          subject_id,
          classes!inner(id, grade_level, section, school_id),
          subjects(id, name)
        `)
        .eq('teacher_id', profile?.id)
        .eq('classes.school_id', profile?.school_id)

      // Build unique classes and subjects lists
      const classesMap = new Map()
      const subjectsMap = new Map()

      classAssignments?.forEach((assignment: any) => {
        const cls = assignment.classes
        if (cls && !classesMap.has(cls.id)) {
          classesMap.set(cls.id, {
            id: cls.id,
            grade_level: cls.grade_level,
            section: cls.section,
            school_id: cls.school_id
          })
        }

        const subj = assignment.subjects
        if (subj && !subjectsMap.has(subj.id)) {
          subjectsMap.set(subj.id, {
            id: subj.id,
            name: subj.name
          })
        }
      })

      setClasses(Array.from(classesMap.values()))
      setSubjects(Array.from(subjectsMap.values()))

      // Get teacher's exams (only those created by this teacher)
      const classIds = Array.from(classesMap.keys())
      
      if (classIds.length > 0) {
        const { data: examsData } = await supabase
          .from('exams')
          .select(`
            id, title, description, exam_date, total_marks, 
            class_id, subject_id,
            classes(grade_level, section),
            subjects(name)
          `)
          .eq('created_by', profile?.id) // Only show exams created by this teacher
          .eq('school_id', profile?.school_id)
          .in('class_id', classIds)
          .order('exam_date', { ascending: false })

        const examsWithCounts = await Promise.all(
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
              graded_count: gradedCount || 0,
              total_students: totalCount || 0
            }
          })
        )

        setExams(examsWithCounts)
      }
    } catch (error) {
      console.error('Error loading exams:', error)
      toast.error('Failed to load exams')
    }

    setLoading(false)
  }

  const loadStudentGrades = async (examId: string, classId: string) => {
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, profiles!students_user_id_fkey(username, full_name)')
      .eq('class_id', classId)
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
        marks_obtained: result?.marks_obtained || null,
        percentage: result?.percentage || null,
        grade: result?.grade || null,
        result_id: result?.id || null
      }
    })

    setStudentGrades(grades)
  }

  const handleMarksChange = (studentId: string, marks: string, totalMarks: number) => {
    const marksNum = parseFloat(marks) || 0
    const percentage = (marksNum / totalMarks) * 100
    let grade = 'F'
    if (percentage >= 90) grade = 'A'
    else if (percentage >= 80) grade = 'B'
    else if (percentage >= 70) grade = 'C'
    else if (percentage >= 60) grade = 'D'
    else if (percentage >= 50) grade = 'E'

    setStudentGrades(prev => prev.map(sg => 
      sg.student_id === studentId ? { ...sg, marks_obtained: marksNum, percentage, grade } : sg
    ))
  }

  const handleSaveGrades = async (examId: string) => {
    setSavingGrades(true)
    try {
      for (const sg of studentGrades) {
        if (sg.marks_obtained === null) continue
        
        const gradeData = {
          exam_id: examId,
          student_id: sg.student_id,
          marks_obtained: sg.marks_obtained,
          percentage: sg.percentage,
          grade: sg.grade,
          graded_by: profile?.id,
          graded_at: new Date().toISOString()
        }

        if (sg.result_id) {
          await supabase.from('exam_results').update(gradeData).eq('id', sg.result_id)
        } else {
          await supabase.from('exam_results').insert(gradeData)
        }
      }
      toast.success('Grades saved successfully!')
      loadData()
      setExpandedExam(null)
    } catch (error: any) {
      toast.error('Failed to save grades')
      console.error(error)
    }
    setSavingGrades(false)
  }

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    const { error } = await supabase.from('exams').insert({
      title: examTitle,
      description: examDescription,
      exam_date: examDate,
      total_marks: parseInt(totalMarks),
      school_id: profile?.school_id,
      class_id: selectedClassId,
      subject_id: selectedSubjectId,
      created_by: profile?.id
    })

    if (error) {
      toast.error('Failed to create exam')
      console.error(error)
    } else {
      toast.success('Exam created successfully!')
      setDialogOpen(false)
      setExamTitle('')
      setExamDescription('')
      setExamDate('')
      setTotalMarks('')
      setSelectedClassId('')
      setSelectedSubjectId('')
      loadData()
    }
    setSubmitting(false)
  }

  const handleDeleteExam = async (examId: string, examTitle: string) => {
    if (!confirm(`Delete "${examTitle}"? All grades will be deleted.`)) return
    
    const { error } = await supabase.from('exams').delete().eq('id', examId)
    if (error) {
      toast.error('Failed to delete exam')
    } else {
      toast.success('Exam deleted!')
      loadData()
    }
  }

  const handleExpandExam = (examId: string, classId: string) => {
    const isExpanding = expandedExam !== examId
    setExpandedExam(isExpanding ? examId : null)
    
    if (isExpanding) {
      loadStudentGrades(examId, classId)
    }
  }

  const filteredExams = exams.filter(exam => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      exam.title.toLowerCase().includes(query) ||
      exam.class_name.toLowerCase().includes(query) ||
      exam.subject_name.toLowerCase().includes(query)
    )
  })

  if (authLoading || loading) {
    return <DashboardLayout title="My Exams"><div>Loading...</div></DashboardLayout>
  }

  if (profile?.role !== 'teacher') {
    return <DashboardLayout title="My Exams"><div>Access denied</div></DashboardLayout>
  }

  return (
    <DashboardLayout title="My Exams">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Create and manage exams for your classes</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />Create Exam
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Exam</DialogTitle>
                <DialogDescription>Add a new exam for your class</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateExam} className="space-y-4">
                <div>
                  <Label>Exam Title *</Label>
                  <Input 
                    placeholder="e.g., Mid-Term Mathematics" 
                    value={examTitle} 
                    onChange={(e) => setExamTitle(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input 
                    placeholder="Brief description" 
                    value={examDescription} 
                    onChange={(e) => setExamDescription(e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Exam Date *</Label>
                  <Input 
                    type="date" 
                    value={examDate} 
                    onChange={(e) => setExamDate(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <Label>Total Marks *</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g., 100" 
                    value={totalMarks} 
                    onChange={(e) => setTotalMarks(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <Label>Class *</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId} required>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((cls: any) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.grade_level} {cls.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject *</Label>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} required>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((subj: any) => (
                        <SelectItem key={subj.id} value={subj.id}>
                          {subj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Exam'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label>Search Exams</Label>
              <Input
                placeholder="Search by title, class, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">Total Exams</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold">{filteredExams.length}</div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">Fully Graded</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold">{filteredExams.filter(e => e.graded_count === e.total_students && e.total_students > 0).length}</div></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardHeader><CardTitle className="text-sm font-medium opacity-90">Pending Grading</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold">{filteredExams.filter(e => e.graded_count < e.total_students).length}</div></CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {filteredExams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                {searchQuery ? 'No exams match your search' : 'No exams created yet. Click "Create Exam" to get started.'}
              </CardContent>
            </Card>
          ) : (
            filteredExams.map((exam) => {
              const isExpanded = expandedExam === exam.id
              
              return (
                <Card 
                  key={exam.id} 
                  className="cursor-pointer hover:shadow-md transition-all"
                >
                  <CardHeader 
                    className="py-4"
                    onClick={() => handleExpandExam(exam.id, exam.class_id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg">{exam.title}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            {exam.class_name} • {exam.subject_name} • {exam.exam_date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{exam.total_marks} marks</Badge>
                        {exam.graded_count === exam.total_students && exam.total_students > 0 ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />Graded
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 mr-1" />{exam.graded_count}/{exam.total_students}
                          </Badge>
                        )}
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="space-y-4 border-t pt-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold">Enter Student Grades</p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handleSaveGrades(exam.id) }} 
                            disabled={savingGrades}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            {savingGrades ? 'Saving...' : 'Save Grades'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam.id, exam.title) }}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />Delete
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student Name</TableHead>
                              <TableHead>Username</TableHead>
                              <TableHead className="w-32">Marks</TableHead>
                              <TableHead>Percentage</TableHead>
                              <TableHead>Grade</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentGrades.map((sg) => (
                              <TableRow key={sg.student_id}>
                                <TableCell className="font-medium">{sg.student_name}</TableCell>
                                <TableCell className="text-sm text-gray-500">{sg.username}</TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    max={exam.total_marks} 
                                    value={sg.marks_obtained || ''} 
                                    onChange={(e) => handleMarksChange(sg.student_id, e.target.value, exam.total_marks)} 
                                    className="w-24"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </TableCell>
                                <TableCell>
                                  {sg.percentage !== null ? `${sg.percentage.toFixed(1)}%` : '-'}
                                </TableCell>
                                <TableCell>
                                  {sg.grade && (
                                    <Badge className={
                                      sg.grade === 'A' ? 'bg-green-100 text-green-800' :
                                      sg.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                      sg.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                      sg.grade === 'D' ? 'bg-orange-100 text-orange-800' :
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
      </div>
    </DashboardLayout>
  )
}