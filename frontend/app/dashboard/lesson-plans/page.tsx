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
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, Loader2, FileText, Download, Eye, Trash2, Upload, Filter, X, Calendar } from 'lucide-react'

interface LessonPlan {
  id: string
  title: string
  description: string
  document_type: 'lesson_plan' | 'syllabus' | 'scheme_of_work' | 'notes' | 'worksheet' | 'reference'
  subject_id: string
  class_id: string
  file_url: string
  file_name: string
  period_start: string
  period_end: string
  uploaded_by: string
  uploaded_at: string
  teacher_name: string
  subject_name: string
  class_name: string
  school_id: string
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

interface TeacherClassSubject {
  id: string
  class_id: string
  subject_id: string
  class_name: string
  subject_name: string
}

export default function LessonPlansPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([])
  const [filteredPlans, setFilteredPlans] = useState<LessonPlan[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [teacherClassSubjects, setTeacherClassSubjects] = useState<TeacherClassSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Filters
  const [filterType, setFilterType] = useState<string>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [filterClass, setFilterClass] = useState<string>('all')

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: 'lesson_plan',
    class_subject_id: '',
    period_start: '',
    period_end: '',
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
  }, [lessonPlans, filterType, filterSubject, filterClass])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch subjects (for filters)
      let subjectQuery = supabase.from('subjects').select('id, name').order('name')
      if (profile?.role !== 'super_admin' && profile?.school_id) {
        subjectQuery = subjectQuery.eq('school_id', profile.school_id)
      }
      const { data: subjectData } = await subjectQuery
      setSubjects(subjectData || [])

      // Fetch classes (for filters)
      let classQuery = supabase
        .from('classes')
        .select('id, grade_level, section')
        .order('grade_level')
      if (profile?.role !== 'super_admin' && profile?.school_id) {
        classQuery = classQuery.eq('school_id', profile.school_id)
      }
      const { data: classData } = await classQuery
      setClasses(classData || [])

      // For teachers, load their assigned class-subjects
      if (profile?.role === 'teacher') {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('class_subject_assignments')
          .select(`
            id,
            class_id,
            subject_id,
            subjects(name),
            classes(grade_level, section)
          `)
          .eq('teacher_id', profile.id)

        if (!assignmentsError && assignmentsData) {
          const classSubjects: TeacherClassSubject[] = assignmentsData.map((a: any) => ({
            id: a.id,
            class_id: a.class_id,
            subject_id: a.subject_id,
            class_name: `${a.classes?.grade_level || ''} ${a.classes?.section || ''}`.trim(),
            subject_name: a.subjects?.name || 'Unknown'
          }))
          setTeacherClassSubjects(classSubjects)
        }
      }

      // Fetch lesson plans
      await fetchLessonPlans()
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchLessonPlans = async () => {
    try {
      // Build query based on role
      let query = supabase
        .from('lesson_plans')
        .select(`
          *,
          profiles!lesson_plans_uploaded_by_fkey(full_name),
          subjects(name),
          classes(grade_level, section)
        `)
        .order('uploaded_at', { ascending: false })

      // Teachers can only see their own documents
      if (profile?.role === 'teacher') {
        query = query.eq('uploaded_by', profile.id)
      }
      // School admins see all documents from their school
      else if (profile?.role === 'school_admin' && profile?.school_id) {
        query = query.eq('school_id', profile.school_id)
      }

      const { data, error } = await query

      if (error) throw error

      const transformedPlans: LessonPlan[] = (data || []).map((plan: any) => ({
        id: plan.id,
        title: plan.title,
        description: plan.description,
        document_type: plan.document_type,
        subject_id: plan.subject_id,
        class_id: plan.class_id,
        file_url: plan.file_url,
        file_name: plan.file_name,
        period_start: plan.period_start,
        period_end: plan.period_end,
        uploaded_by: plan.uploaded_by,
        uploaded_at: plan.uploaded_at,
        teacher_name: plan.profiles?.full_name || 'Unknown',
        subject_name: plan.subjects?.name || 'Unknown',
        class_name: `${plan.classes?.grade_level || ''} ${plan.classes?.section || ''}`,
        school_id: plan.school_id,
      }))

      setLessonPlans(transformedPlans)
    } catch (error: any) {
      console.error('Error fetching lesson plans:', error)
      toast.error('Failed to load lesson plans')
    }
  }

  const applyFilters = () => {
    let filtered = [...lessonPlans]

    if (filterType !== 'all') {
      filtered = filtered.filter(plan => plan.document_type === filterType)
    }

    if (filterSubject !== 'all') {
      filtered = filtered.filter(plan => plan.subject_id === filterSubject)
    }

    if (filterClass !== 'all') {
      filtered = filtered.filter(plan => plan.class_id === filterClass)
    }

    setFilteredPlans(filtered)
  }

  const clearFilters = () => {
    setFilterType('all')
    setFilterSubject('all')
    setFilterClass('all')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file')
        return
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const uploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      toast.error('Please select a PDF file')
      return
    }

    if (!formData.class_subject_id) {
      toast.error('Please select a class and subject')
      return
    }

    let class_id: string
    let subject_id: string

    if (profile?.role === 'teacher') {
      // For teachers, get from the class_subject_assignments
      const selectedClassSubject = teacherClassSubjects.find(cs => cs.id === formData.class_subject_id)
      if (!selectedClassSubject) {
        toast.error('Invalid class-subject selection')
        return
      }
      class_id = selectedClassSubject.class_id
      subject_id = selectedClassSubject.subject_id
    } else {
      // For admins, parse from the pipe-separated format
      const parts = formData.class_subject_id.split('|')
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        toast.error('Please select both class and subject')
        return
      }
      class_id = parts[0]
      subject_id = parts[1]
    }

    try {
      setUploading(true)

      // Upload file to Supabase Storage
      const fileExt = 'pdf'
      const fileName = `${Date.now()}_${formData.title.replace(/[^a-z0-9]/gi, '_')}.${fileExt}`
      const filePath = `lesson-plans/${profile?.school_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Save to database
      const { error: dbError } = await supabase.from('lesson_plans').insert({
        title: formData.title,
        description: formData.description,
        document_type: formData.document_type,
        subject_id: subject_id,
        class_id: class_id,
        file_url: urlData.publicUrl,
        file_name: selectedFile.name,
        period_start: formData.period_start || null,
        period_end: formData.period_end || null,
        uploaded_by: profile?.id,
        school_id: profile?.school_id,
      })

      if (dbError) throw dbError

      toast.success('Document uploaded successfully!')
      setDialogOpen(false)
      resetForm()
      fetchLessonPlans()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Failed to upload document: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      document_type: 'lesson_plan',
      class_subject_id: '',
      period_start: '',
      period_end: '',
    })
    setSelectedFile(null)
  }

  const deletePlan = async (id: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/documents/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage.from('documents').remove([filePath])
      }

      const { error } = await supabase.from('lesson_plans').delete().eq('id', id)
      if (error) throw error

      toast.success('Document deleted successfully')
      fetchLessonPlans()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error('Failed to delete document')
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'lesson_plan': return '📚 Lesson Plan'
      case 'scheme_of_work': return '📋 Scheme of Work'
      case 'notes': return '📝 Subject Notes'
      case 'syllabus': return '📄 Syllabus'
      case 'worksheet': return '✏️ Worksheet'
      case 'reference': return '📖 Reference'
      default: return type
    }
  }

  const getDocumentTypeBadge = (type: string) => {
    switch (type) {
      case 'lesson_plan': return 'bg-blue-500'
      case 'scheme_of_work': return 'bg-purple-500'
      case 'notes': return 'bg-green-500'
      case 'syllabus': return 'bg-indigo-500'
      case 'worksheet': return 'bg-yellow-500'
      case 'reference': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Lesson Plans & Documents">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) return null

  const canUpload = ['teacher', 'school_admin', 'super_admin'].includes(profile?.role || '')
  const hasActiveFilters = filterType !== 'all' || filterSubject !== 'all' || filterClass !== 'all'

  return (
    <DashboardLayout title="Lesson Plans & Documents">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lessonPlans.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Lesson Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lessonPlans.filter(p => p.document_type === 'lesson_plan').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {lessonPlans.filter(p => p.document_type === 'notes').length}
              </div>
              <p className="text-xs text-gray-500">Visible to students/parents</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Syllabi & More</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lessonPlans.filter(p => ['syllabus', 'scheme_of_work', 'worksheet', 'reference'].includes(p.document_type)).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Teaching Documents</CardTitle>
                <CardDescription>
                  Upload and manage lesson plans, syllabi, and schemes of work
                  {hasActiveFilters && (
                    <span className="text-blue-600 ml-2">
                      (Showing {filteredPlans.length} of {lessonPlans.length})
                    </span>
                  )}
                </CardDescription>
              </div>
              {canUpload && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Upload Teaching Document</DialogTitle>
                      <DialogDescription>
                        Upload lesson plans, notes, syllabus, worksheets, or schemes of work (PDF only, max 10MB)
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={uploadDocument} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Document Type *</Label>
                        <Select
                          value={formData.document_type}
                          onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                          disabled={uploading}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lesson_plan">📚 Lesson Plan (Admin/Teachers Only)</SelectItem>
                            <SelectItem value="scheme_of_work">📋 Scheme of Work (Admin/Teachers Only)</SelectItem>
                            <SelectItem value="notes">📝 Subject Notes (Students & Parents Can View)</SelectItem>
                            <SelectItem value="syllabus">📄 Syllabus (Students & Parents Can View)</SelectItem>
                            <SelectItem value="worksheet">✏️ Worksheet (Students & Parents Can View)</SelectItem>
                            <SelectItem value="reference">📖 Reference Material (Students & Parents Can View)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          <strong>Admin Only:</strong> Lesson Plans & Schemes of Work | <strong>Students & Parents:</strong> Notes, Syllabus, Worksheets, References
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g., Mathematics Q1 Lesson Plan"
                          required
                          disabled={uploading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Brief description of the document"
                          disabled={uploading}
                          rows={3}
                        />
                      </div>

                      {profile?.role === 'teacher' ? (
                        <div className="space-y-2">
                          <Label>Class & Subject *</Label>
                          <Select
                            value={formData.class_subject_id}
                            onValueChange={(value) => setFormData({ ...formData, class_subject_id: value })}
                            disabled={uploading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select class and subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {teacherClassSubjects.map((cs) => (
                                <SelectItem key={cs.id} value={cs.id}>
                                  {cs.class_name} - {cs.subject_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Subject *</Label>
                            <Select
                              value={formData.class_subject_id?.split('|')[1] || ''}
                              onValueChange={(value) => {
                                const currentClass = formData.class_subject_id?.split('|')[0] || ''
                                setFormData({ ...formData, class_subject_id: `${currentClass}|${value}` })
                              }}
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
                              value={formData.class_subject_id?.split('|')[0] || ''}
                              onValueChange={(value) => {
                                const currentSubject = formData.class_subject_id?.split('|')[1] || ''
                                setFormData({ ...formData, class_subject_id: `${value}|${currentSubject}` })
                              }}
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
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Period Start</Label>
                          <Input
                            type="date"
                            value={formData.period_start}
                            onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                            disabled={uploading}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Period End</Label>
                          <Input
                            type="date"
                            value={formData.period_end}
                            onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                            disabled={uploading}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Upload PDF File *</Label>
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
                          Upload Document
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-[200px]">
                <Label>Document Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="lesson_plan">Lesson Plans</SelectItem>
                    <SelectItem value="scheme_of_work">Schemes of Work</SelectItem>
                    <SelectItem value="notes">Subject Notes</SelectItem>
                    <SelectItem value="syllabus">Syllabi</SelectItem>
                    <SelectItem value="worksheet">Worksheets</SelectItem>
                    <SelectItem value="reference">Reference Materials</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Documents Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      {hasActiveFilters
                        ? 'No documents match your filters'
                        : 'No documents uploaded yet. Upload your first document!'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <Badge className={getDocumentTypeBadge(plan.document_type)}>
                          {getDocumentTypeLabel(plan.document_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{plan.title}</TableCell>
                      <TableCell>{plan.subject_name}</TableCell>
                      <TableCell>{plan.class_name}</TableCell>
                      <TableCell>
                        {plan.period_start && plan.period_end ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(plan.period_start).toLocaleDateString()} - 
                            {new Date(plan.period_end).toLocaleDateString()}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{plan.teacher_name}</span>
                          {plan.uploaded_by === profile?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(plan.uploaded_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(plan.file_url, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement('a')
                              a.href = plan.file_url
                              a.download = plan.file_name
                              a.click()
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {plan.uploaded_by === profile?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletePlan(plan.id, plan.file_url)}
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}