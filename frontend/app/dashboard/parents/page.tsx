'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { EDGE_FUNCTIONS } from '@/lib/edgeFunctions'
import { toast } from 'sonner'
import { Loader2, UserPlus, Link2, X } from 'lucide-react'

interface Parent {
  id: string
  full_name: string
  username: string
  email: string
  school_id: string
  school_name: string
  children_count: number
}

interface Student {
  id: string
  user_id: string
  full_name: string
  username: string
  roll_number: string
  grade_level: string
  section: string
  parent_id: string | null
  parent_name: string | null
  school_id: string
}

export default function ParentManagementPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [parents, setParents] = useState<Parent[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [creating, setCreating] = useState(false)
  const [linking, setLinking] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    school_id: profile?.school_id || '',
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({ ...prev, school_id: profile.school_id || '' }))
      fetchData()
    }
  }, [profile])

  const fetchData = async () => {
    try {
      setLoading(true)

      let parentQuery = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          email,
          school_id,
          schools!inner(name)
        `)
        .eq('role', 'parent')
        .order('full_name')

      if (profile?.role !== 'super_admin' && profile?.school_id) {
        parentQuery = parentQuery.eq('school_id', profile.school_id)
      }

      const { data: parentData, error: parentError } = await parentQuery
      if (parentError) throw parentError

      const parentsWithCount = await Promise.all(
        (parentData || []).map(async (parent: any) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', parent.id)

          return {
            id: parent.id,
            full_name: parent.full_name,
            username: parent.username,
            email: parent.email,
            school_id: parent.school_id,
            school_name: parent.schools?.name || 'Unknown',
            children_count: count || 0,
          }
        })
      )

      setParents(parentsWithCount)

      let studentQuery = supabase
        .from('students')
        .select(`
          id,
          user_id,
          roll_number,
          parent_id,
          profiles!students_user_id_fkey(full_name, username),
          parent:profiles!students_parent_id_fkey(full_name),
          classes!inner(
            grade_level,
            section,
            school_id
          )
        `)
        .order('roll_number')

      if (profile?.role !== 'super_admin' && profile?.school_id) {
        studentQuery = studentQuery.eq('classes.school_id', profile.school_id)
      }

      const { data: studentData, error: studentError } = await studentQuery
      if (studentError) throw studentError

      const transformedStudents = studentData?.map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        full_name: s.profiles?.full_name || 'Unknown',
        username: s.profiles?.username || 'Unknown',
        roll_number: s.roll_number,
        grade_level: s.classes?.grade_level || 'Unknown',
        section: s.classes?.section || '',
        parent_id: s.parent_id,
        parent_name: s.parent?.full_name || null,
        school_id: s.classes?.school_id || '',
      })) || []

      setStudents(transformedStudents)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const generateParentUsername = async (schoolId: string) => {
    const { data: school } = await supabase
      .from('schools')
      .select('school_code')
      .eq('id', schoolId)
      .single()

    if (!school) throw new Error('School not found')

    const { data: parents } = await supabase
      .from('profiles')
      .select('username')
      .eq('role', 'parent')
      .eq('school_id', schoolId)
      .like('username', `${school.school_code}-PR-%`)

    const nextNumber = (parents?.length || 0) + 1
    return `${school.school_code}-PR-${String(nextNumber).padStart(8, '0')}`
  }

  const createParent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!EDGE_FUNCTIONS.CREATE_PARENT_USER || EDGE_FUNCTIONS.CREATE_PARENT_USER.includes('YOUR_EDGE')) {
      toast.error('Edge Function URL not configured. Please update lib/edgeFunctions.ts')
      return
    }

    try {
      setCreating(true)

      const username = await generateParentUsername(formData.school_id)

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No active session. Please log in again.')
      }

      const response = await fetch(EDGE_FUNCTIONS.CREATE_PARENT_USER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          username: username,
          school_id: formData.school_id,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to create parent')
      }

      toast.success(`Parent created! Username: ${username}`)
      setCreateDialogOpen(false)
      setFormData({
        full_name: '',
        email: '',
        password: '',
        school_id: profile?.school_id || '',
      })
      
      await fetchData()
      
    } catch (error: any) {
      console.error('Create parent error:', error)
      
      if (error.message.includes('already exists')) {
        toast.error(error.message)
      } else if (error.message.includes('Edge Function URL')) {
        toast.error('Configuration error. Check console for details.')
      } else {
        toast.error(`Failed to create parent: ${error.message}`)
      }
    } finally {
      setCreating(false)
    }
  }

  const linkParentToStudent = async (parentId: string) => {
    if (!selectedStudent) return

    try {
      setLinking(true)

      const { error } = await supabase
        .from('students')
        .update({ parent_id: parentId })
        .eq('id', selectedStudent.id)

      if (error) throw error

      toast.success('Parent linked successfully!')
      setLinkDialogOpen(false)
      setSelectedStudent(null)
      await fetchData()
    } catch (error: any) {
      console.error('Error linking parent:', error)
      toast.error('Failed to link parent')
    } finally {
      setLinking(false)
    }
  }

  const unlinkParent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ parent_id: null })
        .eq('id', studentId)

      if (error) throw error

      toast.success('Parent unlinked!')
      await fetchData()
    } catch (error: any) {
      console.error('Error unlinking parent:', error)
      toast.error('Failed to unlink parent')
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Parent Management">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) {
    return null
  }

  const canManage = ['super_admin', 'school_admin'].includes(profile?.role || '')

  if (!canManage) {
    return (
      <DashboardLayout title="Parent Management">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">You do not have permission to manage parents.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Parent Management">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Parent Accounts</CardTitle>
                <CardDescription>Create and manage parent accounts</CardDescription>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Parent
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Parent Account</DialogTitle>
                    <DialogDescription>Username will be auto-generated</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createParent} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                        disabled={creating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        disabled={creating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={6}
                        disabled={creating}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-700">
                        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Parent
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  {profile.role === 'super_admin' && <TableHead>School</TableHead>}
                  <TableHead>Children</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      No parents found
                    </TableCell>
                  </TableRow>
                ) : (
                  parents.map((parent) => (
                    <TableRow key={parent.id}>
                      <TableCell className="font-medium">{parent.full_name}</TableCell>
                      <TableCell>{parent.username}</TableCell>
                      <TableCell>{parent.email}</TableCell>
                      {profile.role === 'super_admin' && <TableCell>{parent.school_name}</TableCell>}
                      <TableCell>
                        <Badge variant="secondary">{parent.children_count} children</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student-Parent Links</CardTitle>
            <CardDescription>Link students to parent accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell>{student.roll_number}</TableCell>
                      <TableCell>{student.grade_level} {student.section}</TableCell>
                      <TableCell>
                        {student.parent_name ? (
                          <Badge variant="secondary">{student.parent_name}</Badge>
                        ) : (
                          <Badge variant="outline">Not Linked</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {student.parent_id ? (
                          <Button variant="ghost" size="sm" onClick={() => unlinkParent(student.id)}>
                            <X className="h-4 w-4 mr-1" />
                            Unlink
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student)
                              setLinkDialogOpen(true)
                            }}
                          >
                            <Link2 className="h-4 w-4 mr-1" />
                            Link Parent
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Parent to Student</DialogTitle>
              <DialogDescription>Select parent for {selectedStudent?.full_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Parent</Label>
                <Select onValueChange={(value) => linkParentToStudent(value)} disabled={linking}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose parent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.filter((p) => p.school_id === selectedStudent?.school_id).map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.full_name} ({parent.username})
                      </SelectItem>
                    ))}
                    {parents.filter((p) => p.school_id === selectedStudent?.school_id).length === 0 && (
                      <SelectItem value="none" disabled>
                        No parents available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {linking && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}