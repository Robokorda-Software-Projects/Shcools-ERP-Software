'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  BookOpen, 
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  Hash,
  GraduationCap,
  Users
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Subject {
  id: string
  school_id: string
  name: string
  code: string
  created_at: string
  teacher_count?: number
  class_count?: number
}

interface NewSubjectForm {
  name: string
  code: string
}

// Common Zimbabwe secondary school subjects
const SUBJECT_SUGGESTIONS = [
  { name: 'Mathematics', code: 'MATH' },
  { name: 'English Language', code: 'ENG' },
  { name: 'Shona', code: 'SHO' },
  { name: 'Ndebele', code: 'NDE' },
  { name: 'Physics', code: 'PHY' },
  { name: 'Chemistry', code: 'CHEM' },
  { name: 'Biology', code: 'BIO' },
  { name: 'Geography', code: 'GEO' },
  { name: 'History', code: 'HIST' },
  { name: 'Commerce', code: 'COM' },
  { name: 'Accounts', code: 'ACC' },
  { name: 'Economics', code: 'ECON' },
  { name: 'Computer Science', code: 'CS' },
  { name: 'Agriculture', code: 'AGRIC' },
  { name: 'Religious Education', code: 'RE' },
  { name: 'Physical Education', code: 'PE' },
  { name: 'Art', code: 'ART' },
  { name: 'Music', code: 'MUS' },
  { name: 'Technical Graphics', code: 'TG' },
  { name: 'Fashion & Fabrics', code: 'FF' },
  { name: 'Food & Nutrition', code: 'FN' },
  { name: 'Woodwork', code: 'WW' },
  { name: 'Metalwork', code: 'MW' },
  { name: 'French', code: 'FRE' },
  { name: 'Portuguese', code: 'POR' }
]

export default function SubjectsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const [newSubject, setNewSubject] = useState<NewSubjectForm>({
    name: '',
    code: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && !['school_admin', 'super_admin'].includes(profile.role)) {
      router.push('/dashboard')
      toast.error('Access denied')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.school_id || profile?.role === 'super_admin') {
      loadSubjects()
    }
  }, [profile])

  const loadSubjects = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true })

      if (profile?.school_id) {
        query = query.eq('school_id', profile.school_id)
      }

      const { data, error } = await query

      if (error) throw error

      // Get assignment counts for each subject
      const subjectsWithCounts = await Promise.all((data || []).map(async (subject) => {
        // Count teachers assigned to this subject
        const { count: teacherCount } = await supabase
          .from('teacher_subject_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', subject.id)

        // Count classes this subject is taught in
        const { count: classCount } = await supabase
          .from('class_subject_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', subject.id)

        return {
          ...subject,
          teacher_count: teacherCount || 0,
          class_count: classCount || 0
        }
      }))

      setSubjects(subjectsWithCounts)
    } catch (error: any) {
      console.error('Error loading subjects:', error)
      toast.error('Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSubject = async () => {
    if (!profile?.school_id) {
      toast.error('No school associated with your account')
      return
    }

    if (!newSubject.name.trim()) {
      toast.error('Please enter the subject name')
      return
    }
    if (!newSubject.code.trim()) {
      toast.error('Please enter the subject code')
      return
    }

    try {
      setIsSaving(true)

      // Check if subject already exists
      const { data: existing } = await supabase
        .from('subjects')
        .select('id')
        .eq('school_id', profile.school_id)
        .or(`name.ilike.${newSubject.name.trim()},code.ilike.${newSubject.code.trim()}`)
        .single()

      if (existing) {
        toast.error('A subject with this name or code already exists')
        setIsSaving(false)
        return
      }

      const { error } = await supabase
        .from('subjects')
        .insert({
          school_id: profile.school_id,
          name: newSubject.name.trim(),
          code: newSubject.code.trim().toUpperCase()
        })

      if (error) throw error

      toast.success(`${newSubject.name} added successfully!`)
      
      setNewSubject({ name: '', code: '' })
      setIsAddDialogOpen(false)
      await loadSubjects()

    } catch (error: any) {
      console.error('Error adding subject:', error)
      toast.error(error.message || 'Failed to add subject')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditSubject = async () => {
    if (!selectedSubject) return

    try {
      setIsSaving(true)

      const { error } = await supabase
        .from('subjects')
        .update({
          name: newSubject.name.trim(),
          code: newSubject.code.trim().toUpperCase()
        })
        .eq('id', selectedSubject.id)

      if (error) throw error

      toast.success('Subject updated successfully!')
      setIsEditDialogOpen(false)
      setSelectedSubject(null)
      await loadSubjects()

    } catch (error: any) {
      console.error('Error updating subject:', error)
      toast.error(error.message || 'Failed to update subject')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSubject = async (subject: Subject) => {
    if ((subject.teacher_count || 0) > 0 || (subject.class_count || 0) > 0) {
      toast.error(`Cannot delete ${subject.name} - it has ${subject.teacher_count} teacher(s) and ${subject.class_count} class(es) assigned`)
      return
    }

    if (!confirm(`Are you sure you want to delete ${subject.name}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subject.id)

      if (error) throw error

      toast.success(`${subject.name} deleted`)
      await loadSubjects()
    } catch (error: any) {
      console.error('Error deleting subject:', error)
      toast.error('Failed to delete subject')
    }
  }

  const openEditDialog = (subject: Subject) => {
    setSelectedSubject(subject)
    setNewSubject({
      name: subject.name,
      code: subject.code
    })
    setIsEditDialogOpen(true)
  }

  const addSuggestedSubject = async (suggestion: { name: string, code: string }) => {
    if (!profile?.school_id) {
      toast.error('No school associated with your account')
      return
    }

    try {
      setIsSaving(true)

      // Check if subject already exists
      const exists = subjects.some(s => 
        s.name.toLowerCase() === suggestion.name.toLowerCase() || 
        s.code.toLowerCase() === suggestion.code.toLowerCase()
      )

      if (exists) {
        toast.error(`${suggestion.name} already exists`)
        return
      }

      const { error } = await supabase
        .from('subjects')
        .insert({
          school_id: profile.school_id,
          name: suggestion.name,
          code: suggestion.code
        })

      if (error) throw error

      toast.success(`${suggestion.name} added!`)
      await loadSubjects()

    } catch (error: any) {
      console.error('Error adding subject:', error)
      toast.error(error.message || 'Failed to add subject')
    } finally {
      setIsSaving(false)
    }
  }

  const addAllSuggestions = async () => {
    if (!profile?.school_id) return

    try {
      setIsSaving(true)

      // Get existing subjects
      const { data: existing } = await supabase
        .from('subjects')
        .select('name, code')
        .eq('school_id', profile.school_id)

      const existingNames = new Set((existing || []).map(s => s.name.toLowerCase()))
      const existingCodes = new Set((existing || []).map(s => s.code.toLowerCase()))

      // Filter out duplicates
      const newSubjects = SUBJECT_SUGGESTIONS.filter(s => 
        !existingNames.has(s.name.toLowerCase()) && !existingCodes.has(s.code.toLowerCase())
      )

      if (newSubjects.length === 0) {
        toast.info('All suggested subjects already exist')
        return
      }

      const { error } = await supabase
        .from('subjects')
        .insert(newSubjects.map(s => ({
          school_id: profile.school_id,
          name: s.name,
          code: s.code
        })))

      if (error) throw error

      toast.success(`Added ${newSubjects.length} subjects!`)
      await loadSubjects()

    } catch (error: any) {
      console.error('Error adding subjects:', error)
      toast.error('Failed to add subjects')
    } finally {
      setIsSaving(false)
      setShowSuggestions(false)
    }
  }

  // Filter subjects
  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Stats
  const stats = {
    total: subjects.length,
    withTeachers: subjects.filter(s => (s.teacher_count || 0) > 0).length,
    inClasses: subjects.filter(s => (s.class_count || 0) > 0).length
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Manage Subjects">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading subjects...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout title="Manage Subjects">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Subjects</h1>
            <p className="text-sm text-gray-500">Add and manage subjects taught at your school</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Quick Add
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Subject</DialogTitle>
                  <DialogDescription>
                    Add a subject to your school curriculum
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Subject Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Mathematics"
                      value={newSubject.name}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code">Subject Code *</Label>
                    <Input
                      id="code"
                      placeholder="e.g., MATH"
                      value={newSubject.code}
                      onChange={(e) => setNewSubject(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      maxLength={10}
                    />
                    <p className="text-xs text-gray-500">Short code for timetables and reports (max 10 characters)</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddSubject} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subject
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Add Suggestions Panel */}
        {showSuggestions && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Quick Add Subjects</span>
                <Button 
                  size="sm" 
                  onClick={addAllSuggestions}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add All
                </Button>
              </CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_SUGGESTIONS.map((s, idx) => {
                  const exists = subjects.some(sub => 
                    sub.name.toLowerCase() === s.name.toLowerCase() || 
                    sub.code.toLowerCase() === s.code.toLowerCase()
                  )
                  return (
                    <Button
                      key={idx}
                      variant={exists ? "secondary" : "outline"}
                      size="sm"
                      disabled={exists}
                      onClick={() => addSuggestedSubject(s)}
                      className={exists ? 'opacity-50' : ''}
                    >
                      {s.name}
                      {exists && <span className="ml-1 text-xs">(Added)</span>}
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Subjects</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">With Teachers</p>
                  <p className="text-2xl font-bold text-green-600">{stats.withTeachers}</p>
                </div>
                <Users className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">In Classes</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.inClasses}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" onClick={loadSubjects}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Table */}
        <Card>
          <CardContent className="pt-0 pb-0">
            {filteredSubjects.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Teachers</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                          </div>
                          <span className="font-medium">{subject.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {subject.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={subject.teacher_count ? 'text-green-600 font-medium' : 'text-gray-400'}>
                          {subject.teacher_count || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={subject.class_count ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                          {subject.class_count || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {new Date(subject.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditDialog(subject)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteSubject(subject)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search'
                    : 'Get started by adding subjects to your school'}
                </p>
                {!searchQuery && (
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={() => setShowSuggestions(true)}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Quick Add
                    </Button>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Subject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
              <DialogDescription>
                Update subject details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Subject Name *</Label>
                <Input
                  id="edit_name"
                  placeholder="e.g., Mathematics"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_code">Subject Code *</Label>
                <Input
                  id="edit_code"
                  placeholder="e.g., MATH"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  maxLength={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleEditSubject} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
