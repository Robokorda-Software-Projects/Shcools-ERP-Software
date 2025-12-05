'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Link2, Users } from 'lucide-react'

export default function ParentsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [parents, setParents] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedParent, setSelectedParent] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
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
    
    // Load all parents
    const { data: parentsData, error: parentsError } = await supabase
      .from('profiles')
      .select('id, username, full_name, email')
      .eq('role', 'parent')
      .order('full_name')

    if (parentsError) {
      toast.error('Failed to load parents')
      console.error(parentsError)
    } else {
      const parentsWithCount = await Promise.all(
        (parentsData || []).map(async (parent) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', parent.id)
          return { ...parent, children_count: count || 0 }
        })
      )
      setParents(parentsWithCount)
    }

    // Load all students
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        user_id,
        parent_id,
        profiles!students_user_id_fkey(full_name, username),
        classes(grade_level, section)
      `)

    if (studentsError) {
      toast.error('Failed to load students')
      console.error(studentsError)
    } else {
      const transformed = (studentsData || []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        full_name: s.profiles?.full_name || 'Unknown',
        username: s.profiles?.username || 'Unknown',
        grade_level: s.classes?.grade_level || 'Unknown',
        section: s.classes?.section || '',
        parent_id: s.parent_id
      }))
      setStudents(transformed)
    }
    
    setLoading(false)
  }

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { error } = await supabase
      .from('students')
      .update({ parent_id: selectedParent })
      .eq('id', selectedStudent)

    if (error) {
      toast.error('Failed to link parent', { description: error.message })
    } else {
      toast.success('Parent linked successfully!')
      setDialogOpen(false)
      setSelectedParent('')
      setSelectedStudent('')
      loadData()
    }
    setSubmitting(false)
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Parent Management">
        <div>Loading...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Parent Management">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Manage parent accounts and link them to students</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Link2 className="w-4 h-4 mr-2" />
                Link Parent to Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link Parent to Student</DialogTitle>
                <DialogDescription>
                  Select a parent and student to create the relationship
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleLink} className="space-y-4">
                <div className="space-y-2">
                  <Label>Parent</Label>
                  <Select value={selectedParent} onValueChange={setSelectedParent} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent>
                      {parents.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name} ({p.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name} ({s.grade_level} {s.section})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                  {submitting ? 'Linking...' : 'Link Parent and Student'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-linear-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">Total Parents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{parents.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-green-500 to-green-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">Parents with Children</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{parents.filter(p => p.children_count > 0).length}</div>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{students.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Parents</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Children</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No parents found
                    </TableCell>
                  </TableRow>
                ) : (
                  parents.map((parent) => (
                    <TableRow key={parent.id}>
                      <TableCell className="font-medium">{parent.username}</TableCell>
                      <TableCell>{parent.full_name}</TableCell>
                      <TableCell>{parent.email}</TableCell>
                      <TableCell>
                        <Badge>{parent.children_count}</Badge>
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
            <CardTitle>All Students</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Parent Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.username}</TableCell>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell>{student.grade_level} {student.section}</TableCell>
                      <TableCell>
                        {student.parent_id ? (
                          <Badge className="bg-green-100 text-green-800">Linked</Badge>
                        ) : (
                          <Badge variant="outline">Not Linked</Badge>
                        )}
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
