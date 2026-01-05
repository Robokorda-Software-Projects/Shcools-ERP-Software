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
import { FileText, Download, Search, Filter, BookOpen, Calendar, Users, User } from 'lucide-react'
import { format } from 'date-fns'

interface Child {
  id: string
  full_name: string
  class_id: string
  class_name: string
}

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
  child_name: string
  class_name: string
}

export default function ParentResourcesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [children, setChildren] = useState<Child[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [filteredResources, setFilteredResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterChild, setFilterChild] = useState<string>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [subjects, setSubjects] = useState<string[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'parent') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'parent') {
      loadResources()
    }
  }, [profile])

  useEffect(() => {
    filterResourcesList()
  }, [resources, searchTerm, filterChild, filterSubject, filterType])

  const loadResources = async () => {
    if (!profile?.id) return

    setLoading(true)
    try {
      // Get all children linked to this parent
      const { data: childrenData, error: childrenError } = await supabase
        .from('students')
        .select(`
          id,
          class_id,
          profiles!students_user_id_fkey(full_name),
          classes(grade_level, section)
        `)
        .eq('parent_id', profile.id)

      if (childrenError) throw childrenError

      if (!childrenData || childrenData.length === 0) {
        setChildren([])
        setResources([])
        setLoading(false)
        return
      }

      // Format children data
      const formattedChildren: Child[] = childrenData.map((c: any) => ({
        id: c.id,
        full_name: c.profiles?.full_name || 'Unknown',
        class_id: c.class_id,
        class_name: c.classes ? `${c.classes.grade_level} ${c.classes.section}` : 'Unknown'
      }))
      setChildren(formattedChildren)

      // Get all class IDs
      const classIds = formattedChildren.map(c => c.class_id)

      // Fetch documents for all children's classes - ONLY notes, syllabus, worksheets (not lesson plans/schemes)
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
          class_id,
          subjects(name),
          profiles!lesson_plans_uploaded_by_fkey(full_name)
        `)
        .in('class_id', classIds)
        .in('document_type', ['notes', 'syllabus', 'worksheet', 'reference'])
        .order('uploaded_at', { ascending: false })

      if (error) throw error

      // Format resources with child info
      const formatted: Resource[] = (documentsData || []).map((d: any) => {
        const child = formattedChildren.find(c => c.class_id === d.class_id)
        return {
          id: d.id,
          title: d.title,
          description: d.description,
          document_type: d.document_type,
          file_url: d.file_url,
          file_name: d.file_name,
          uploaded_at: d.uploaded_at,
          subject_name: d.subjects?.name || 'General',
          teacher_name: d.profiles?.full_name || 'Unknown',
          child_name: child?.full_name || 'Unknown',
          class_name: child?.class_name || 'Unknown'
        }
      })

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

  const filterResourcesList = () => {
    let filtered = [...resources]

    // Filter by child
    if (filterChild !== 'all') {
      filtered = filtered.filter(r => {
        const child = children.find(c => c.id === filterChild)
        return child && r.child_name === child.full_name
      })
    }

    // Filter by subject
    if (filterSubject !== 'all') {
      filtered = filtered.filter(r => r.subject_name === filterSubject)
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.document_type === filterType)
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(term) ||
        r.subject_name.toLowerCase().includes(term) ||
        r.teacher_name.toLowerCase().includes(term)
      )
    }

    setFilteredResources(filtered)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'notes': return 'Notes'
      case 'syllabus': return 'Syllabus'
      case 'worksheet': return 'Worksheet'
      case 'reference': return 'Reference'
      default: return type
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'notes': return 'bg-blue-100 text-blue-800'
      case 'syllabus': return 'bg-purple-100 text-purple-800'
      case 'worksheet': return 'bg-green-100 text-green-800'
      case 'reference': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDownload = (fileUrl: string, fileName: string) => {
    window.open(fileUrl, '_blank')
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Children's Resources">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading resources...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'parent') return null

  return (
    <DashboardLayout title="Children's Resources">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{resources.length}</div>
              <p className="text-xs text-gray-500 mt-1">Available for download</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Children</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{children.length}</div>
              <p className="text-xs text-gray-500 mt-1">Enrolled children</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{subjects.length}</div>
              <p className="text-xs text-gray-500 mt-1">With materials</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {resources.filter(r => r.document_type === 'notes').length}
              </div>
              <p className="text-xs text-gray-500 mt-1">Teacher notes</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle className="text-base">Filter Resources</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filterChild} onValueChange={setFilterChild}>
                <SelectTrigger>
                  <SelectValue placeholder="All Children" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Children</SelectItem>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="syllabus">Syllabus</SelectItem>
                  <SelectItem value="worksheet">Worksheets</SelectItem>
                  <SelectItem value="reference">References</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Resources Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Learning Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No children linked</p>
                <p className="text-sm">Contact the school to link your children's accounts</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No resources found</p>
                <p className="text-sm">Teachers haven't uploaded any notes or materials yet</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>For Child</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Teacher</TableHead>
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
                              <p className="text-xs text-gray-500 truncate max-w-xs">
                                {resource.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm">{resource.child_name}</p>
                              <p className="text-xs text-gray-500">{resource.class_name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{resource.subject_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeBadgeColor(resource.document_type)}>
                            {getTypeLabel(resource.document_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {resource.teacher_name}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {format(new Date(resource.uploaded_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleDownload(resource.file_url, resource.file_name)}
                          >
                            <Download className="h-4 w-4 mr-1" />
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
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">About Resources</h3>
                <p className="text-sm text-blue-700">
                  This page shows notes, syllabi, worksheets, and other learning materials shared by 
                  your children's teachers. You can download these resources to help support your 
                  children's learning at home.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
