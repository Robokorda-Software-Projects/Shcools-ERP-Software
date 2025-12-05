'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
//import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { 
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  CalendarIcon,
  Filter,
  Search,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  Users,
  GraduationCap,
  AlertCircle
} from 'lucide-react'
import { format, addDays, isAfter, isBefore } from 'date-fns'

interface Assignment {
  id: string
  title: string
  description: string
  class_id: string
  teacher_id: string
  due_date: string
  total_points: number
  attachment_url?: string
  created_at: string
  status?: 'draft' | 'published' | 'closed'
}

interface Class {
  id: string
  class_name: string
  grade_level: string
  section: string
}

interface Submission {
  id: string
  student_id: string
  assignment_id: string
  submission_date: string
  attachment_url?: string
  grade?: number
  feedback?: string
  status: 'submitted' | 'graded' | 'late' | 'missing'
  student?: {
    full_name: string
    student_id: string
  }
}

export default function AssignmentsPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    total_points: 100,
    attachment: null as File | null,
    status: 'draft' as 'draft' | 'published'
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (profile?.role === 'teacher' && user) {
      fetchTeacherClasses()
    }
  }, [profile, user])

  useEffect(() => {
    if (selectedClass) {
      fetchAssignments()
      fetchSubmissions()
    }
  }, [selectedClass])

  const fetchTeacherClasses = async () => {
    try {
      setLoadingData(true)
      
      // For demo - in real app, query classes assigned to teacher
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('grade_level', { ascending: true })

      if (error) throw error
      setClasses(data || [])
      
      if (data && data.length > 0 && !selectedClass) {
        setSelectedClass(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      toast.error('Failed to load classes')
    } finally {
      setLoadingData(false)
    }
  }

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', selectedClass)
        .order('due_date', { ascending: true })

      if (error) throw error
      setAssignments(data || [])
    } catch (error) {
      console.error('Error fetching assignments:', error)
      toast.error('Failed to load assignments')
    }
  }

  const fetchSubmissions = async () => {
    try {
      // This would join with students table in real implementation
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignments.map(a => a.id))

      if (error) throw error
      setSubmissions(data || [])
    } catch (error) {
      console.error('Error fetching submissions:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, attachment: e.target.files![0] }))
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      class_id: selectedClass || '',
      due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      total_points: 100,
      attachment: null,
      status: 'draft'
    })
    setEditingAssignment(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.class_id) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      let attachmentUrl = ''
      
      // Upload file if exists
      if (formData.attachment) {
        const fileExt = formData.attachment.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(fileName, formData.attachment)

        if (uploadError) throw uploadError
        
        const { data: urlData } = supabase.storage
          .from('assignments')
          .getPublicUrl(fileName)
        
        attachmentUrl = urlData.publicUrl
      }

      const assignmentData = {
        title: formData.title,
        description: formData.description,
        class_id: formData.class_id,
        teacher_id: user?.id,
        due_date: formData.due_date,
        total_points: formData.total_points,
        attachment_url: attachmentUrl || null,
        status: formData.status,
        created_at: new Date().toISOString()
      }

      if (editingAssignment) {
        // Update existing assignment
        const { error } = await supabase
          .from('assignments')
          .update(assignmentData)
          .eq('id', editingAssignment.id)

        if (error) throw error
        toast.success('Assignment updated successfully!')
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('assignments')
          .insert([assignmentData])

        if (error) throw error
        toast.success('Assignment created successfully!')
      }

      setIsDialogOpen(false)
      resetForm()
      fetchAssignments()
    } catch (error) {
      console.error('Error saving assignment:', error)
      toast.error('Failed to save assignment')
    }
  }

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment)
    setFormData({
      title: assignment.title,
      description: assignment.description,
      class_id: assignment.class_id,
      due_date: assignment.due_date.split('T')[0],
      total_points: assignment.total_points,
      attachment: null,
      status: assignment.status as 'draft' | 'published' || 'draft'
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!assignmentToDelete) return

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentToDelete)

      if (error) throw error

      toast.success('Assignment deleted successfully!')
      setAssignmentToDelete(null)
      setIsDeleteDialogOpen(false)
      fetchAssignments()
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast.error('Failed to delete assignment')
    }
  }

  const getSubmissionStats = (assignmentId: string) => {
    const assignmentSubmissions = submissions.filter(s => s.assignment_id === assignmentId)
    const total = assignmentSubmissions.length
    const submitted = assignmentSubmissions.filter(s => s.status !== 'missing').length
    const graded = assignmentSubmissions.filter(s => s.status === 'graded').length
    
    return { total, submitted, graded }
  }

  const getAssignmentStatus = (assignment: Assignment) => {
    const now = new Date()
    const dueDate = new Date(assignment.due_date)
    
    if (assignment.status === 'draft') return 'draft'
    if (assignment.status === 'closed') return 'closed'
    if (isAfter(now, dueDate)) return 'overdue'
    return 'active'
  }

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filterStatus === 'all') return matchesSearch
    
    const status = getAssignmentStatus(assignment)
    return matchesSearch && status === filterStatus
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800 border-green-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      closed: 'bg-blue-100 text-blue-800 border-blue-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  if (loading || loadingData) {
    return (
      <DashboardLayout title="Assignments">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'teacher') {
    return (
      <DashboardLayout title="Assignments">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-gray-600">This page is only accessible to teachers.</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  const selectedClassInfo = classes.find(c => c.id === selectedClass)

  return (
    <DashboardLayout title="Assignments Management">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
            <p className="text-gray-600 mt-1">Create and manage student assignments</p>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Assignment
          </Button>
        </div>

        {/* Filters Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Class Selector */}
              <div className="space-y-2">
                <Label htmlFor="class-select">Select Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.grade_level} - {cls.class_name} ({cls.section})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search Assignments</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by title..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status-filter">Filter by Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignments</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center justify-center">
                <Card className="w-full border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{assignments.length}</div>
                    <div className="text-sm text-gray-600">Total Assignments</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Assignments</CardTitle>
                <CardDescription>
                  {selectedClassInfo && `${selectedClassInfo.grade_level} - ${selectedClassInfo.class_name} (${selectedClassInfo.section})`}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {filteredAssignments.length} assignments
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No assignments found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery ? 'Try a different search term' : 'Create your first assignment to get started'}
                </p>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assignment
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignments.map((assignment) => {
                      const status = getAssignmentStatus(assignment)
                      const stats = getSubmissionStats(assignment.id)
                      
                      return (
                        <TableRow key={assignment.id} className="group hover:bg-gray-50">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{assignment.title}</div>
                              <div className="text-sm text-gray-500 line-clamp-1">
                                {assignment.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-gray-400" />
                              <span>{format(new Date(assignment.due_date), 'MMM dd, yyyy')}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{assignment.total_points} points</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(status)}>
                              {status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="h-3 w-3 text-green-600" />
                                <span className="text-green-600">{stats.submitted} submitted</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-3 w-3 text-blue-600" />
                                <span className="text-blue-600">{stats.graded} graded</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => router.push(`/dashboard/assignments/${assignment.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(assignment)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setAssignmentToDelete(assignment.id)
                                  setIsDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
              <CardDescription>Assignments due soon</CardDescription>
            </CardHeader>
            <CardContent>
              {assignments
                .filter(a => {
                  const dueDate = new Date(a.due_date)
                  const now = new Date()
                  const weekFromNow = addDays(now, 7)
                  return isAfter(dueDate, now) && isBefore(dueDate, weekFromNow)
                })
                .slice(0, 5)
                .map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <div className="font-medium">{assignment.title}</div>
                      <div className="text-sm text-gray-500">
                        Due {format(new Date(assignment.due_date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    <Badge variant="outline">{assignment.total_points} pts</Badge>
                  </div>
                ))}
              {assignments.filter(a => {
                const dueDate = new Date(a.due_date)
                const now = new Date()
                const weekFromNow = addDays(now, 7)
                return isAfter(dueDate, now) && isBefore(dueDate, weekFromNow)
              }).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No upcoming deadlines
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Grading */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Grading</CardTitle>
              <CardDescription>Submissions needing attention</CardDescription>
            </CardHeader>
            <CardContent>
              {submissions
                .filter(s => s.status === 'submitted')
                .slice(0, 5)
                .map((submission) => (
                  <div key={submission.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <div className="font-medium">
                        {submission.student?.full_name || 'Student'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Student ID: {submission.student?.student_id || 'N/A'}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      Needs grading
                    </Badge>
                  </div>
                ))}
              {submissions.filter(s => s.status === 'submitted').length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No submissions pending grading
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
            </DialogTitle>
            <DialogDescription>
              {editingAssignment 
                ? 'Update the assignment details below.' 
                : 'Fill in the details to create a new assignment.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Title */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title *
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Enter assignment title"
                  required
                />
              </div>

              {/* Class */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="class_id" className="text-right">
                  Class *
                </Label>
                <Select 
                  value={formData.class_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, class_id: value }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.grade_level} - {cls.class_name} ({cls.section})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Provide assignment instructions and details"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Due Date */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="due_date" className="text-right">
                    Due Date *
                  </Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                {/* Points */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="total_points" className="text-right">
                    Points *
                  </Label>
                  <Input
                    id="total_points"
                    name="total_points"
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.total_points}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
              </div>

              {/* Attachment */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="attachment" className="text-right">
                  Attachment
                </Label>
                <div className="col-span-3">
                  <Input
                    id="attachment"
                    type="file"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {formData.attachment && (
                    <p className="text-sm text-gray-500 mt-2">
                      Selected: {formData.attachment.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'draft' | 'published') => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Publish Now</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this assignment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setAssignmentToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}