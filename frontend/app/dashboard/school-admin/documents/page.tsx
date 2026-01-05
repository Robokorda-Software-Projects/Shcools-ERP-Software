'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { FileText, Download, Eye, Filter, X, BookOpen, FileSpreadsheet, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface LessonPlan {
  id: string
  title: string
  description: string
  document_type: string
  subject_id: string
  subject_name: string
  class_id: string
  class_name: string
  file_url: string
  file_name: string
  uploaded_by: string
  uploaded_by_name: string
  uploaded_at: string
  period_range: string
}

interface Teacher {
  id: string
  full_name: string
}

interface Subject {
  id: string
  name: string
}

export default function SchoolAdminDocumentsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [documents, setDocuments] = useState<LessonPlan[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<LessonPlan[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [filterTeacher, setFilterTeacher] = useState('')
  const [filterDocType, setFilterDocType] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const DOCUMENT_TYPES = [
    { value: 'lesson-plan', label: 'Lesson Plan', icon: FileText },
    { value: 'scheme-of-work', label: 'Scheme of Work', icon: BookOpen },
    { value: 'syllabus', label: 'Syllabus', icon: FileSpreadsheet },
  ]

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'school_admin') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.school_id) {
      loadData()
    }
  }, [profile])

  useEffect(() => {
    applyFilters()
  }, [documents, filterTeacher, filterDocType, filterSubject, searchTerm])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load teachers from school
      const { data: teacherData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('school_id', profile?.school_id)
        .eq('role', 'teacher')
        .order('full_name')

      setTeachers(teacherData || [])

      // Load subjects
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('school_id', profile?.school_id)
        .order('name')

      setSubjects(subjectData || [])

      // Load all lesson plans/documents from school
      const { data: documentData, error } = await supabase
        .from('lesson_plans')
        .select(`
          *,
          profiles!lesson_plans_uploaded_by_fkey(full_name),
          subjects(name),
          classes(grade_level, section)
        `)
        .eq('school_id', profile?.school_id)
        .order('uploaded_at', { ascending: false })

      if (error) throw error

      const transformed: LessonPlan[] = (documentData || []).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        document_type: doc.document_type,
        subject_id: doc.subject_id,
        subject_name: doc.subjects?.name || 'N/A',
        class_id: doc.class_id,
        class_name: doc.classes ? `${doc.classes.grade_level} ${doc.classes.section}` : 'N/A',
        file_url: doc.file_url,
        file_name: doc.file_name,
        uploaded_by: doc.uploaded_by,
        uploaded_by_name: doc.profiles?.full_name || 'Unknown',
        uploaded_at: doc.uploaded_at,
        period_range: doc.period_range || 'N/A'
      }))

      setDocuments(transformed)
    } catch (error: any) {
      console.error('Error loading documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...documents]

    // Filter by teacher
    if (filterTeacher) {
      filtered = filtered.filter(doc => doc.uploaded_by === filterTeacher)
    }

    // Filter by document type
    if (filterDocType) {
      filtered = filtered.filter(doc => doc.document_type === filterDocType)
    }

    // Filter by subject
    if (filterSubject) {
      filtered = filtered.filter(doc => doc.subject_id === filterSubject)
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(term) ||
        doc.description.toLowerCase().includes(term) ||
        doc.subject_name.toLowerCase().includes(term) ||
        doc.uploaded_by_name.toLowerCase().includes(term)
      )
    }

    setFilteredDocuments(filtered)
  }

  const clearFilters = () => {
    setFilterTeacher('')
    setFilterDocType('')
    setFilterSubject('')
    setSearchTerm('')
  }

  const getDocumentTypeLabel = (type: string) => {
    const docType = DOCUMENT_TYPES.find(dt => dt.value === type)
    return docType?.label || type
  }

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'lesson-plan':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'scheme-of-work':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'syllabus':
        return 'bg-green-100 text-green-700 border-green-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const handleDownload = (url: string, fileName: string) => {
    window.open(url, '_blank')
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Teaching Documents">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="inline-block h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-gray-600">Loading documents...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'school_admin') {
    return null
  }

  const activeFiltersCount = [filterTeacher, filterDocType, filterSubject, searchTerm].filter(Boolean).length

  return (
    <DashboardLayout title="Teaching Documents">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/school-admin">
              <Button variant="outline" className="gap-2 mb-3">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Teaching Documents</h1>
            <p className="text-sm text-gray-500 mt-1">
              View all lesson plans, schemes of work, and syllabuses uploaded by teachers
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">{filteredDocuments.length}</p>
            <p className="text-sm text-gray-600">Total Documents</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary">{activeFiltersCount} active</Badge>
                )}
              </CardTitle>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Teacher Filter */}
              <div>
                <Label htmlFor="teacher">Teacher</Label>
                <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="All teachers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teachers</SelectItem>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Type Filter */}
              <div>
                <Label htmlFor="doctype">Document Type</Label>
                <Select value={filterDocType} onValueChange={setFilterDocType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {DOCUMENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Filter */}
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Documents ({filteredDocuments.length})</CardTitle>
            <CardDescription>
              All teaching documents uploaded by teachers. View-only access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 font-medium">No documents found</p>
                <p className="text-sm text-gray-500 mt-1">
                  {activeFiltersCount > 0 
                    ? 'Try adjusting your filters' 
                    : 'Teachers haven\'t uploaded any documents yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Badge className={getDocumentTypeColor(doc.document_type)}>
                            {getDocumentTypeLabel(doc.document_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{doc.title}</p>
                            {doc.description && (
                              <p className="text-xs text-gray-500 mt-1">{doc.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-700">{doc.subject_name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-700">{doc.class_name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600">{doc.period_range}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-700">{doc.uploaded_by_name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(doc.file_url, '_blank')}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc.file_url, doc.file_name)}
                              className="gap-1"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
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
      </div>
    </DashboardLayout>
  )
}
