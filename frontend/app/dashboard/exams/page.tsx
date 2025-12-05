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
import { Plus, School, FileText, Calendar, ChevronDown, ChevronUp, Edit, Trash2, CheckCircle, Clock, Save, GraduationCap } from 'lucide-react'

interface School {
  id: string
  name: string
  school_code: string
  school_type: string
  exam_count: number
}

interface Exam {
  id: string
  title: string
  description: string
  exam_date: string
  total_marks: number
  school_id: string
  school_name: string
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

export default function ExamsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null)
  const [expandedExam, setExpandedExam] = useState<string | null>(null)
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([])
  const [savingGrades, setSavingGrades] = useState(false)
  
  const [filterSchoolType, setFilterSchoolType] = useState<string>('all')
  const [filterSchool, setFilterSchool] = useState<string>('all')
  const [filterClass, setFilterClass] = useState<string>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [examTitle, setExamTitle] = useState('')
  const [examDescription, setExamDescription] = useState('')
  const [examDate, setExamDate] = useState('')
  const [totalMarks, setTotalMarks] = useState('')
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile) {
      loadData()
    }
  }, [profile])

  const loadData = async () => {
    setLoading(true)

    let schoolsQuery = supabase.from('schools').select('id, name, school_code, school_type').order('school_type').order('name')
    if (profile?.role === 'school_admin' && profile?.school_id) {
      schoolsQuery = schoolsQuery.eq('id', profile.school_id)
    }

    const { data: schoolsData } = await schoolsQuery
    const schoolsWithCount = await Promise.all(
      (schoolsData || []).map(async (school) => {
        const { count } = await supabase.from('exams').select('*', { count: 'exact', head: true }).eq('school_id', school.id)
        return { ...school, exam_count: count || 0 }
      })
    )
    setSchools(schoolsWithCount)

    let classesQuery = supabase.from('classes').select('id, grade_level, section, school_id').order('grade_level')
    if (profile?.role === 'school_admin' && profile?.school_id) {
      classesQuery = classesQuery.eq('school_id', profile.school_id)
    }
    const { data: classesData } = await classesQuery
    setClasses(classesData || [])

    let subjectsQuery = supabase.from('subjects').select('id, name, school_id').order('name')
    if (profile?.role === 'school_admin' && profile?.school_id) {
      subjectsQuery = subjectsQuery.eq('school_id', profile.school_id)
    }
    const { data: subjectsData } = await subjectsQuery
    setSubjects(subjectsData || [])

    let examsQuery = supabase.from('exams').select('id, title, description, exam_date, total_marks, school_id, class_id, subject_id, schools(name, school_type), classes(grade_level, section), subjects(name)').order('exam_date', { ascending: false })
    if (profile?.role === 'school_admin' && profile?.school_id) {
      examsQuery = examsQuery.eq('school_id', profile.school_id)
    } else if (profile?.role === 'teacher') {
      examsQuery = examsQuery.eq('created_by', profile.id)
    }

    const { data: examsData } = await examsQuery
    const examsWithCounts = await Promise.all(
      (examsData || []).map(async (exam: any) => {
        const { count: totalCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('class_id', exam.class_id)
        const { count: gradedCount } = await supabase.from('exam_results').select('*', { count: 'exact', head: true }).eq('exam_id', exam.id).not('marks_obtained', 'is', null)
        return {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          exam_date: exam.exam_date,
          total_marks: exam.total_marks,
          school_id: exam.school_id,
          school_name: exam.schools?.name || 'Unknown',
          school_type: exam.schools?.school_type || 'Unknown',
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
    setLoading(false)
  }

  const loadStudentGrades = async (examId: string, classId: string) => {
    const { data: studentsData } = await supabase.from('students').select('id, profiles!students_user_id_fkey(username, full_name)').eq('class_id', classId)
    const { data: resultsData } = await supabase.from('exam_results').select('*').eq('exam_id', examId)

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
    } catch (error: any) {
      toast.error('Failed to save grades')
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
      school_id: selectedSchoolId,
      class_id: selectedClassId,
      subject_id: selectedSubjectId,
      created_by: profile?.id
    })
    if (error) {
      toast.error('Failed to create exam')
    } else {
      toast.success('Exam created successfully!')
      setDialogOpen(false)
      setExamTitle('')
      setExamDescription('')
      setExamDate('')
      setTotalMarks('')
      setSelectedSchoolId('')
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

  const filteredExams = exams.filter(exam => {
    if (filterSchoolType !== 'all' && exam.school_type !== filterSchoolType) return false
    if (filterSchool !== 'all' && exam.school_id !== filterSchool) return false
    if (filterClass !== 'all' && exam.class_id !== filterClass) return false
    if (filterSubject !== 'all' && exam.subject_id !== filterSubject) return false
    if (searchQuery && !exam.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const filteredSchools = schools.filter(school => {
    if (filterSchoolType !== 'all' && school.school_type !== filterSchoolType) return false
    return filteredExams.some(exam => exam.school_id === school.id)
  })

  const availableClasses = [...new Set(filteredExams.map(e => e.class_id))]
  const availableSubjects = [...new Set(filteredExams.map(e => e.subject_id))]

  if (authLoading || loading) {
    return <DashboardLayout title="Exams Management"><div>Loading...</div></DashboardLayout>
  }

  return (
    <DashboardLayout title="Exams Management">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Manage exams and enter grades</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />Create Exam
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Exam</DialogTitle><DialogDescription>Add a new exam for a class</DialogDescription></DialogHeader>
              <form onSubmit={handleCreateExam} className="space-y-4">
                <div><Label>Exam Title *</Label><Input placeholder="e.g., Mid-Term Mathematics" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} required /></div>
                <div><Label>Description</Label><Input placeholder="Brief description" value={examDescription} onChange={(e) => setExamDescription(e.target.value)} /></div>
                <div><Label>Exam Date *</Label><Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} required /></div>
                <div><Label>Total Marks *</Label><Input type="number" placeholder="e.g., 100" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} required /></div>
                <div><Label>School *</Label>
                  <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId} required>
                    <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                    <SelectContent>{schools.map((school) => <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Class *</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId} required>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>{classes.filter(c => c.school_id === selectedSchoolId).map((cls: any) => <SelectItem key={cls.id} value={cls.id}>{cls.grade_level} {cls.section}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Subject *</Label>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} required>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>{subjects.filter(s => s.school_id === selectedSchoolId).map((subj: any) => <SelectItem key={subj.id} value={subj.id}>{subj.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Creating...' : 'Create Exam'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div><Label>School Type</Label>
                <Select value={filterSchoolType} onValueChange={setFilterSchoolType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>School</Label>
                <Select value={filterSchool} onValueChange={setFilterSchool}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {filteredSchools.map((school) => <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Class</Label>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.filter(c => availableClasses.includes(c.id)).map((cls: any) => <SelectItem key={cls.id} value={cls.id}>{cls.grade_level} {cls.section}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Subject</Label>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.filter(s => availableSubjects.includes(s.id)).map((subj: any) => <SelectItem key={subj.id} value={subj.id}>{subj.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Search</Label><Input placeholder="Exam title..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
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

        <div className="space-y-6">
          {['Primary', 'Secondary'].map((schoolType) => {
            const schoolsOfType = filteredSchools.filter(s => s.school_type === schoolType)
            if (schoolsOfType.length === 0) return null

            return (
              <div key={schoolType}>
                <h2 className="text-2xl font-bold mb-4 flex items-center"><GraduationCap className="mr-2" />{schoolType} Schools</h2>
                <div className="space-y-4">
                  {schoolsOfType.map((school) => {
                    const schoolExams = filteredExams.filter(e => e.school_id === school.id)
                    const isExpanded = expandedSchool === school.id

                    return (
                      <div key={school.id}>
                        <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setExpandedSchool(isExpanded ? null : school.id)}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div><CardTitle className="text-lg flex items-center"><School className="w-5 h-5 mr-2" />{school.name}</CardTitle><p className="text-sm text-gray-500">{school.school_code}</p></div>
                              <div className="flex items-center gap-2"><Badge>{schoolExams.length} Exams</Badge>{isExpanded ? <ChevronUp /> : <ChevronDown />}</div>
                            </div>
                          </CardHeader>
                        </Card>

                        {isExpanded && schoolExams.length > 0 && (
                          <div className="ml-4 mt-2 space-y-2 animate-in slide-in-from-top">
                            {schoolExams.map((exam) => {
                              const isExamExpanded = expandedExam === exam.id
                              return (
                                <Card key={exam.id} className="cursor-pointer hover:shadow-md transition-all">
                                  <CardHeader className="py-3" onClick={(e) => {
                                    e.stopPropagation()
                                    if (!isExamExpanded) loadStudentGrades(exam.id, exam.class_id)
                                    setExpandedExam(isExamExpanded ? null : exam.id)
                                  }}>
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <CardTitle className="text-base flex items-center"><FileText className="w-4 h-4 mr-2" />{exam.title}</CardTitle>
                                        <p className="text-xs text-gray-500 mt-1">{exam.class_name} - {exam.subject_name} - {exam.exam_date}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">{exam.total_marks} marks</Badge>
                                        {exam.graded_count === exam.total_students && exam.total_students > 0 ? (
                                          <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Graded</Badge>
                                        ) : (
                                          <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />{exam.graded_count}/{exam.total_students}</Badge>
                                        )}
                                        {isExamExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </div>
                                    </div>
                                  </CardHeader>

                                  {isExamExpanded && (
                                    <CardContent className="space-y-3 border-t pt-3">
                                      <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm font-medium">Enter Grades</p>
                                        <div className="flex gap-2">
                                          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSaveGrades(exam.id) }} disabled={savingGrades}>
                                            <Save className="w-3 h-3 mr-1" />{savingGrades ? 'Saving...' : 'Save Grades'}
                                          </Button>
                                          <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam.id, exam.title) }}>
                                            <Trash2 className="w-3 h-3 mr-1" />Delete Exam
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="max-h-96 overflow-y-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Student</TableHead>
                                              <TableHead>Username</TableHead>
                                              <TableHead>Marks</TableHead>
                                              <TableHead>Percentage</TableHead>
                                              <TableHead>Grade</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {studentGrades.map((sg) => (
                                              <TableRow key={sg.student_id}>
                                                <TableCell>{sg.student_name}</TableCell>
                                                <TableCell className="text-xs text-gray-500">{sg.username}</TableCell>
                                                <TableCell>
                                                  <Input type="number" min="0" max={exam.total_marks} value={sg.marks_obtained || ''} 
                                                    onChange={(e) => handleMarksChange(sg.student_id, e.target.value, exam.total_marks)} 
                                                    className="w-20" onClick={(e) => e.stopPropagation()} />
                                                </TableCell>
                                                <TableCell>{sg.percentage !== null ? `${sg.percentage.toFixed(1)}%` : '-'}</TableCell>
                                                <TableCell>
                                                  {sg.grade && (
                                                    <Badge className={
                                                      sg.grade === 'A' ? 'bg-green-100 text-green-800' :
                                                      sg.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                                      sg.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                                      sg.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                                      'bg-red-100 text-red-800'
                                                    }>{sg.grade}</Badge>
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
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}