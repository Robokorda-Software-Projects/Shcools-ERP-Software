'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { FileText, Download, Search, Filter, BookOpen, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface Resource {
  id: string
  title: string
  description: string | null
  document_type: string
  file_url: string
  file_name: string
  uploaded_at: string
  subject_name: string
  teacher_name: string
}

export default function StudentResourcesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [resources, setResources] = useState<Resource[]>([])
  const [filteredResources, setFilteredResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [subjects, setSubjects] = useState<string[]>([])

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
      loadResources()
    }
  }, [profile])

  useEffect(() => {
    filterResources()
  }, [resources, searchTerm, filterSubject, filterType])

  const loadResources = async () => {
    if (!profile?.id) return

    setLoading(true)
    try {
      // Get student info to find class_id
      const { data: studentData } = await supabase
        .from('students')
        .select('class_id')
        .eq('user_id', profile.id)
        .single()

      if (!studentData) {
        toast.error('Student record not found')
        return
      }

      // Fetch documents - ONLY notes/syllabus, NOT lesson plans or schemes of work
      const { data: documentsData, error } = await supabase
        .from('lesson_plans')
        .select(`
          id,
          title,
          description,
          document_type,
          file_url,
          file_name,
          uploaded_at,
          subjects(name),
          profiles!lesson_plans_uploaded_by_fkey(full_name)
        `)
        .eq('class_id', studentData.class_id)
        .in('document_type', ['notes', 'syllabus', 'worksheet', 'reference'])
        .order('uploaded_at', { ascending: false })

      if (error) throw error

      const formatted: Resource[] = (documentsData || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        document_type: d.document_type,
        file_url: d.file_url,
        file_name: d.file_name,
        uploaded_at: d.uploaded_at,
        subject_name: d.subjects?.name || 'General',
        teacher_name: d.profiles?.full_name || 'Unknown'
      }))

      setResources(formatted)

      // Extract unique subjects
      const uniqueSubjects = Array.from(new Set(formatted.map(r => r.subject_name))).sort()
      setSubjects(uniqueSubjects)
    } catch (error: any) {
      console.error('Error loading resources:', error)
      toast.error('Failed to load resources')
    } finally {
      setLoading(false)
    }
  }

  const filterResources = () => {
    let filtered = resources

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Subject filter
    if (filterSubject !== 'all') {
      filtered = filtered.filter(r => r.subject_name === filterSubject)
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.document_type === filterType)
    }

    setFilteredResources(filtered)
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      notes: 'Notes',
      syllabus: 'Syllabus',
      worksheet: 'Worksheet',
      reference: 'Reference Material'
    }
    return labels[type] || type
  }

  const getDocumentTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      notes: 'bg-blue-500',
      syllabus: 'bg-purple-500',
      worksheet: 'bg-green-500',
      reference: 'bg-orange-500'
    }
    return colors[type] || 'bg-gray-500'
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Study Resources">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading resources...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'student') return null

  return (
    <DashboardLayout title="Study Resources">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{resources.length}</div>
              <p className="text-xs text-gray-500 mt-1">available to you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{subjects.length}</div>
              <p className="text-xs text-gray-500 mt-1">with resources</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Filtered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{filteredResources.length}</div>
              <p className="text-xs text-gray-500 mt-1">matching filters</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Input
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="notes">Notes</SelectItem>
                    <SelectItem value="syllabus">Syllabus</SelectItem>
                    <SelectItem value="worksheet">Worksheet</SelectItem>
                    <SelectItem value="reference">Reference Material</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Study Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredResources.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No resources found</p>
                {(searchTerm || filterSubject !== 'all' || filterType !== 'all') && (
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                )}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResources.map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{resource.title}</p>
                            {resource.description && (
                              <p className="text-sm text-gray-500 line-clamp-1">{resource.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">{resource.file_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{resource.subject_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDocumentTypeBadge(resource.document_type)}>
                            {getDocumentTypeLabel(resource.document_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                              {resource.teacher_name.charAt(0)}
                            </div>
                            <span className="text-sm">{resource.teacher_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(resource.uploaded_at), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => window.open(resource.file_url, '_blank')}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">About Study Resources</h3>
                <p className="text-sm text-blue-700">
                  Your teachers upload notes, syllabus, worksheets, and reference materials here to help 
                  you study. Download and review these materials regularly to stay on top of your coursework. 
                  If you need additional resources, please ask your subject teacher.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
