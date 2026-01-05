'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { FileText, Calendar, Clock, Upload, CheckCircle, AlertTriangle, Download, FileCheck } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'

interface Assignment {
  id: string
  title: string
  description: string
  due_date: string
  total_marks: number
  subject_name: string
  teacher_name: string
  file_url: string | null
  file_name: string | null
  submission_id: string | null
  submission_file_url: string | null
  submitted_at: string | null
  marks_obtained: number | null
  feedback: string | null
}

export default function StudentAssignmentsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submissionNote, setSubmissionNote] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

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
      loadAssignments()
    }
  }, [profile])

  const loadAssignments = async () => {
    if (!profile?.id) return

    setLoading(true)
    try {
      // Get student info to find class_id and student record ID
      const { data: studentData } = await supabase
        .from('students')
        .select('id, class_id')
        .eq('user_id', profile.id)
        .single()

      if (!studentData) {
        toast.error('Student record not found')
        return
      }

      // Fetch assignments for student's class
      const { data: assignmentsData, error } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          description,
          due_date,
          total_marks,
          file_url,
          file_name,
          subjects(name),
          profiles!assignments_created_by_fkey(full_name),
          assignment_submissions(
            id,
            student_id,
            submission_file_url,
            submitted_at,
            marks_obtained,
            feedback
          )
        `)
        .eq('class_id', studentData.class_id)
        .order('due_date', { ascending: true })

      if (error) throw error

      const formatted: Assignment[] = (assignmentsData || []).map((a: any) => {
        // Find submission for this student
        const submission = a.assignment_submissions?.find((s: any) => s.student_id === studentData.id)
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          due_date: a.due_date,
          total_marks: a.total_marks,
          subject_name: a.subjects?.name || 'Unknown',
          teacher_name: a.profiles?.full_name || 'Unknown',
          file_url: a.file_url,
          file_name: a.file_name,
          submission_id: submission?.id || null,
          submission_file_url: submission?.submission_file_url || null,
          submitted_at: submission?.submitted_at || null,
          marks_obtained: submission?.marks_obtained ?? null,
          feedback: submission?.feedback || null
        }
      })

      setAssignments(formatted)
    } catch (error: any) {
      console.error('Error loading assignments:', error)
      toast.error('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const openSubmitDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setSubmissionNote('')
    setSelectedFile(null)
    setIsSubmitDialogOpen(true)
  }

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !selectedFile) {
      toast.error('Please select a file to submit')
      return
    }

    if (!profile?.id) return

    setSubmitting(true)
    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${selectedAssignment.id}_${profile.id}_${Date.now()}.${fileExt}`
      const filePath = `assignment-submissions/${profile.school_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Get student record
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', profile.id)
        .single()

      if (!studentData) throw new Error('Student record not found')

      // Submit assignment
      if (selectedAssignment.submission_id) {
        // Update existing submission
        const { error: updateError } = await supabase
          .from('assignment_submissions')
          .update({
            submission_file_url: publicUrl,
            submission_file_name: selectedFile.name,
            submitted_at: new Date().toISOString()
          })
          .eq('id', selectedAssignment.submission_id)

        if (updateError) throw updateError
      } else {
        // Create new submission
        const { error: insertError } = await supabase
          .from('assignment_submissions')
          .insert({
            assignment_id: selectedAssignment.id,
            student_id: studentData.id,
            submission_file_url: publicUrl,
            submission_file_name: selectedFile.name,
            submitted_at: new Date().toISOString()
          })

        if (insertError) throw insertError
      }

      toast.success('Assignment submitted successfully!')
      setIsSubmitDialogOpen(false)
      loadAssignments()
    } catch (error: any) {
      console.error('Error submitting assignment:', error)
      toast.error('Failed to submit assignment')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.marks_obtained !== null) {
      return <Badge className="bg-purple-500"><FileCheck className="w-3 h-3 mr-1" />Graded</Badge>
    }
    if (assignment.submitted_at) {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Submitted</Badge>
    }
    if (isPast(new Date(assignment.due_date)) && !isToday(new Date(assignment.due_date))) {
      return <Badge className="bg-red-500"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>
    }
    return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="My Assignments">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading assignments...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'student') return null

  const pendingCount = assignments.filter(a => !a.submitted_at).length
  const submittedCount = assignments.filter(a => a.submitted_at && a.marks_obtained === null).length
  const gradedCount = assignments.filter(a => a.marks_obtained !== null).length

  return (
    <DashboardLayout title="My Assignments">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-xs text-gray-500 mt-1">assignments to submit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Submitted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{submittedCount}</div>
              <p className="text-xs text-gray-500 mt-1">awaiting grading</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Graded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{gradedCount}</div>
              <p className="text-xs text-gray-500 mt-1">completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Assignments List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              All Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No assignments found</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Total Marks</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{assignment.title}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">{assignment.description}</p>
                            <p className="text-xs text-gray-400 mt-1">By: {assignment.teacher_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{assignment.subject_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className={isPast(new Date(assignment.due_date)) && !assignment.submitted_at ? 'text-red-600 font-medium' : ''}>
                              {format(new Date(assignment.due_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{assignment.total_marks}</TableCell>
                        <TableCell>{getStatusBadge(assignment)}</TableCell>
                        <TableCell>
                          {assignment.marks_obtained !== null ? (
                            <div>
                              <div>
                                <span className="font-bold text-lg text-green-600">{assignment.marks_obtained}</span>
                                <span className="text-gray-500">/{assignment.total_marks}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                ({((assignment.marks_obtained / assignment.total_marks) * 100).toFixed(0)}%)
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment.feedback ? (
                            <p className="text-sm text-gray-600 max-w-xs line-clamp-2" title={assignment.feedback}>
                              {assignment.feedback}
                            </p>
                          ) : assignment.marks_obtained !== null ? (
                            <span className="text-gray-400 text-sm">No feedback</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {assignment.file_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(assignment.file_url!, '_blank')}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            )}
                            {!assignment.submitted_at && (
                              <Button
                                size="sm"
                                onClick={() => openSubmitDialog(assignment)}
                                disabled={isPast(new Date(assignment.due_date)) && !isToday(new Date(assignment.due_date))}
                              >
                                <Upload className="w-3 h-3 mr-1" />
                                Submit
                              </Button>
                            )}
                            {assignment.submitted_at && assignment.submission_file_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(assignment.submission_file_url!, '_blank')}
                              >
                                <FileCheck className="w-3 h-3 mr-1" />
                                View Submission
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Dialog */}
        <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Assignment</DialogTitle>
              <DialogDescription>
                {selectedAssignment?.title} - {selectedAssignment?.subject_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Upload File (PDF, Images)</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: PDF, JPG, PNG (Max 10MB)
                </p>
              </div>

              <div>
                <Label>Submission Note (Optional)</Label>
                <Textarea
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="Add any comments or notes about your submission..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              {selectedAssignment?.due_date && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Due Date:</strong> {format(new Date(selectedAssignment.due_date), 'MMMM dd, yyyy')}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitAssignment} disabled={submitting || !selectedFile}>
                {submitting ? 'Submitting...' : 'Submit Assignment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
