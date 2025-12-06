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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Plus, 
  Loader2, 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  Upload, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Edit
} from 'lucide-react'

interface Assignment {
  id: string
  title: string
  description: string
  subject_id: string
  class_id: string
  file_url: string
  file_name: string
  due_date: string
  total_marks: number
  created_by: string
  created_at: string
  teacher_name: string
  subject_name: string
  class_name: string
  school_id: string
  submission_count?: number
  graded_count?: number
}

interface Subject {
  id: string
  name: string
}

interface Class {
  id: string
  grade_level: string
  section: string
}

interface Submission {
  id: string
  assignment_id: string
  student_id: string
  student_name: string
  roll_number: string
  submission_file_url: string | null
  submission_file_name: string | null
  submitted_at: string | null
  marks_obtained: number | null
  feedback: string | null
  graded_by: string | null
  graded_at: string | null
  status: 'pending' | 'submitted' | 'graded'
}

export default function AssignmentsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [filterClass, setFilterClass] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<string>('active')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    class_id: '',
    due_date: '',
    total_marks: '100',
  })

  const [gradingData, setGradingData] = useState<Map<string, { marks: string; feedback: string }>>(new Map())

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
    fetchAssignments()
  }, [activeTab, filterSubject, filterClass, filterStatus])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch subjects
      let subjectQuery = supabase.from('subjects').select('id, name').order('name')
      if (profile?.role !== 'super_admin' && profile?.school_id) {
        subjectQuery = subjectQuery.eq('school_id', profile.school_id)
      }
      const { data: subjectData } = await subjectQuery
      setSubjects(subjectData || [])

      // Fetch classes
      let classQuery = supabase
        .from('classes')
        .select('id, grade_level, section')
        .order('grade_level')
      if (profile?.role !== 'super_admin' && profile?.school_id) {
        classQuery = classQuery.eq('school_id', profile.school_id)
      }
      const { data: classData } = await classQuery
      setClasses(classData || [])

      await fetchAssignments()
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignments = async () => {
    try {
      let query = supabase
        .from('assignments')
        .select(`
          *,
          profiles!assignments_created_by_fkey(full_name),
          subjects(name),
          classes(grade_level, section)
        `)
        .order('created_at', { ascending: false })

      // Filter by teacher
      if (profile?.role === 'teacher') {
        query = query.eq('created_by', profile.id)
      }

      // Apply filters
      if (filterSubject !== 'all') {
        query = query.eq('subject_id', filterSubject)
      }
      if (filterClass !== 'all') {
        query = query.eq('class_id', filterClass)
      }

      const { data, error } = await query

      if (error) throw error

      // Get submission counts
      const assignmentsWithCounts = await Promise.all(
        (data || []).map(async (assignment: any) => {
          const { count: submissionCount } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id)
            .not('submitted_at', 'is', null)

          const { count: gradedCount } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id)
            .not('marks_obtained', 'is', null)

          return {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            subject_id: assignment.subject_id,
            class_id: assignment.class_id,
            file_url: assignment.file_url,
            file_name: assignment.file_name,
            due_date: assignment.due_date,
            total_marks: assignment.total_marks,
            created_by: assignment.created_by,
            created_at: assignment.created_at,
            teacher_name: assignment.profiles?.full_name || 'Unknown',
            subject_name: assignment.subjects?.name || 'Unknown',
            class_name: `${assignment.classes?.grade_level || ''} ${assignment.classes?.section || ''}`,
            school_id: assignment.school_id,
            submission_count: submissionCount || 0,
            graded_count: gradedCount || 0,
          }
        })
      )

      // Filter by status
      let filteredAssignments = assignmentsWithCounts
      if (activeTab === 'active') {
        filteredAssignments = filteredAssignments.filter(
          a => new Date(a.due_date) >= new Date()
        )
      } else if (activeTab === 'past') {
        filteredAssignments = filteredAssignments.filter(
          a => new Date(a.due_date) < new Date()
        )
      }

      setAssignments(filteredAssignments)
    } catch (error: any) {
      console.error('Error fetching assignments:', error)
      toast.error('Failed to load assignments')
    }
  }

  const fetchSubmissions = async (assignmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          students!assignment_submissions_student_id_fkey(
            roll_number,
            profiles!students_user_id_fkey(full_name)
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false })

      if (error) throw error

      const submissionsList: Submission[] = (data || []).map((sub: any) => ({
        id: sub.id,
        assignment_id: sub.assignment_id,
        student_id: sub.student_id,
        student_name: sub.students?.profiles?.full_name || 'Unknown',
        roll_number: sub.students?.roll_number || 'N/A',
        submission_file_url: sub.submission_file_url,
        submission_file_name: sub.submission_file_name,
        submitted_at: sub.submitted_at,
        marks_obtained: sub.marks_obtained,
        feedback: sub.feedback,
        graded_by: sub.graded_by,
        graded_at: sub.graded_at,
        status: sub.marks_obtained !== null ? 'graded' : (sub.submitted_at ? 'submitted' : 'pending'),
      }))

      setSubmissions(submissionsList)
    } catch (error: any) {
      console.error('Error fetching submissions:', error)
      toast.error('Failed to load submissions')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      toast.error('Please select a PDF file')
      return
    }

    if (!formData.subject_id || !formData.class_id) {
      toast.error('Please select subject and class')
      return
    }

    try {
      setUploading(true)

      // Upload file to Supabase Storage
      const fileExt = 'pdf'
      const fileName = `${Date.now()}_${formData.title.replace(/[^a-z0-9]/gi, '_')}.${fileExt}`
      const filePath = `assignments/${profile?.school_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Save to database
      const { data: assignmentData, error: dbError } = await supabase
        .from('assignments')
        .insert({
          title: formData.title,
          description: formData.description,
          subject_id: formData.subject_id,
          class_id: formData.class_id,
          file_url: urlData.publicUrl,
          file_name: selectedFile.name,
          due_date: formData.due_date,
          total_marks: parseInt(formData.total_marks),
          created_by: profile?.id,
          school_id: profile?.school_id,
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Create submission records for all students in the class
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', formData.class_id)

      if (students && students.length > 0) {
        const submissionRecords = students.map(student => ({
          assignment_id: assignmentData.id,
          student_id: student.id,
        }))

        await supabase.from('assignment_submissions').insert(submissionRecords)
      }

      toast.success('Assignment created successfully!')
      setDialogOpen(false)
      resetForm()
      fetchAssignments()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Failed to create assignment: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const deleteAssignment = async (id: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this assignment? All submissions will be lost.')) return

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/documents/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage.from('documents').remove([filePath])
      }

      const { error } = await supabase.from('assignments').delete().eq('id', id)
      if (error) throw error

      toast.success('Assignment deleted successfully')
      fetchAssignments()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error('Failed to delete assignment')
    }
  }

  const gradeSubmission = async (submissionId: string, studentId: string) => {
    const grading = gradingData.get(studentId)
    if (!grading || !grading.marks) {
      toast.error('Please enter marks')
      return
    }

    const marks = parseFloat(grading.marks)
    if (isNaN(marks) || marks < 0 || marks > (selectedAssignment?.total_marks || 100)) {
      toast.error(`Marks must be between 0 and ${selectedAssignment?.total_marks}`)
      return
    }

    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          marks_obtained: marks,
          feedback: grading.feedback || null,
          graded_by: profile?.id,
          graded_at: new Date().toISOString(),
        })
        .eq('id', submissionId)

      if (error) throw error

      toast.success('Submission graded successfully!')
      fetchSubmissions(selectedAssignment!.id)
      
      // Clear grading data for this student
      const newGradingData = new Map(gradingData)
      newGradingData.delete(studentId)
      setGradingData(newGradingData)
    } catch (error: any) {
      console.error('Grading error:', error)
      toast.error('Failed to grade submission')
    }
  }

  const updateGradingData = (studentId: string, field: 'marks' | 'feedback', value: string) => {
    const newData = new Map(gradingData)
    const current = newData.get(studentId) || { marks: '', feedback: '' }
    newData.set(studentId, { ...current, [field]: value })
    setGradingData(newData)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      subject_id: '',
      class_id: '',
      due_date: '',
      total_marks: '100',
    })
    setSelectedFile(null)
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDueDateBadge = (dueDate: string) => {
    const days = getDaysUntilDue(dueDate)
    if (days < 0) {
      return <Badge variant="destructive">Overdue</Badge>
    } else if (days === 0) {
      return <Badge className="bg-orange-500">Due Today</Badge>
    } else if (days <= 3) {
      return <Badge className="bg-yellow-500">Due in {days} days</Badge>
    } else {
      return <Badge variant="outline">Due in {days} days</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Not Submitted</Badge>
      case 'submitted':
        return <Badge className="bg-blue-500">Submitted</Badge>
      case 'graded':
        return <Badge className="bg-green-500">Graded</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Assignments">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) return null

  const canCreate = ['teacher', 'school_admin', 'super_admin'].includes(profile?.role || '')

  return (
    <DashboardLayout title="Assignments">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {assignments.filter(a => new Date(a.due_date) >= new Date()).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Past Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {assignments.filter(a => new Date(a.due_date) < new Date()).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending Grading</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {assignments.reduce((acc, a) => acc + (a.submission_count || 0) - (a.graded_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Assignments</CardTitle>
                <CardDescription>
                  Create and manage assignments for your classes
                </CardDescription>
              </div>
              {canCreate && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Assignment</DialogTitle>
                      <DialogDescription>
                        Upload assignment details and PDF file
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={createAssignment} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g., Chapter 5 Exercises"
                          required
                          disabled={uploading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Assignment instructions and details..."
                          disabled={uploading}
                          rows={4}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Subject *</Label>
                          <Select
                            value={formData.subject_id}
                            onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                            disabled={uploading}
                          >
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
                          <Label>Class *</Label>
                          <Select
                            value={formData.class_id}
                            onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                            disabled={uploading}
                          >
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
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Due Date *</Label>
                          <Input
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            disabled={uploading}
                            required
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Total Marks *</Label>
                          <Input
                            type="number"
                            value={formData.total_marks}
                            onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
                            disabled={uploading}
                            required
                            min="1"
                            max="1000"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Upload Assignment PDF *</Label>
                        <Input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileSelect}
                          disabled={uploading}
                          required
                        />
                        {selectedFile && (
                          <p className="text-sm text-green-600">
                            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setDialogOpen(false)
                            resetForm()
                          }}
                          disabled={uploading}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
                          {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create Assignment
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="active">Active Assignments</TabsTrigger>
                <TabsTrigger value="past">Past Assignments</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                  <div className="w-[200px]">
                    <Label>Subject</Label>
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

                  <div className="w-[200px]">
                    <Label>Class</Label>
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
                </div>

                {/* Assignments Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                          No assignments found. Create your first assignment!
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.title}</TableCell>
                          <TableCell>{assignment.subject_name}</TableCell>
                          <TableCell>{assignment.class_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {new Date(assignment.due_date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{assignment.total_marks}</TableCell>
                          <TableCell>
                            <Button
                              variant="link"
                              className="p-0 h-auto"
                              onClick={() => {
                                setSelectedAssignment(assignment)
                                fetchSubmissions(assignment.id)
                                setSubmissionsDialogOpen(true)
                              }}
                            >
                              {assignment.graded_count}/{assignment.submission_count || 0} graded
                            </Button>
                          </TableCell>
                          <TableCell>{getDueDateBadge(assignment.due_date)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(assignment.file_url, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const a = document.createElement('a')
                                  a.href = assignment.file_url
                                  a.download = assignment.file_name
                                  a.click()
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {assignment.created_by === profile?.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteAssignment(assignment.id, assignment.file_url)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Submissions Dialog */}
        <Dialog open={submissionsDialogOpen} onOpenChange={setSubmissionsDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Submissions: {selectedAssignment?.title}</DialogTitle>
              <DialogDescription>
                Total Marks: {selectedAssignment?.total_marks} | 
                Due: {selectedAssignment && new Date(selectedAssignment.due_date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500">
                        No submissions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.roll_number}</TableCell>
                        <TableCell>{submission.student_name}</TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell className="text-sm">
                          {submission.submitted_at
                            ? new Date(submission.submitted_at).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {submission.submission_file_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(submission.submission_file_url!, '_blank')}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.status === 'graded' ? (
                            <span className="font-medium">
                              {submission.marks_obtained}/{selectedAssignment?.total_marks}
                            </span>
                          ) : submission.status === 'submitted' ? (
                            <Input
                              type="number"
                              placeholder="0"
                              className="w-20"
                              min="0"
                              max={selectedAssignment?.total_marks}
                              value={gradingData.get(submission.student_id)?.marks || ''}
                              onChange={(e) => updateGradingData(submission.student_id, 'marks', e.target.value)}
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.status === 'graded' ? (
                            <span className="text-sm">{submission.feedback || 'No feedback'}</span>
                          ) : submission.status === 'submitted' ? (
                            <Input
                              placeholder="Feedback..."
                              className="w-full"
                              value={gradingData.get(submission.student_id)?.feedback || ''}
                              onChange={(e) => updateGradingData(submission.student_id, 'feedback', e.target.value)}
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.status === 'submitted' && (
                            <Button
                              size="sm"
                              onClick={() => gradeSubmission(submission.id, submission.student_id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Grade
                            </Button>
                          )}
                          {submission.status === 'graded' && (
                            <Badge variant="secondary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Graded
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                Graded: {submissions.filter(s => s.status === 'graded').length} / {submissions.length}
              </div>
              <Button variant="outline" onClick={() => setSubmissionsDialogOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}