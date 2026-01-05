'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  UserPlus,
  Search,
  Mail,
  Phone,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Send,
  GraduationCap,
  ClipboardCheck,
  UserCog,
  Shield,
  Filter,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Key,
  Calendar
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

type StaffRole = 'teacher' | 'enrollment_officer'

interface StaffMember {
  id: string
  user_id: string
  email: string
  full_name: string
  role: StaffRole
  phone?: string
  employee_id?: string
  department?: string
  status: 'active' | 'inactive' | 'pending'
  created_at: string
  last_login?: string
}

interface NewStaffForm {
  full_name: string
  email: string
  phone: string
  role: StaffRole
  ec_number: string
  id_number: string  // Format: 71-712882414-G-42, stored as 712882414G42
}

export default function StaffManagementPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const [newStaff, setNewStaff] = useState<NewStaffForm>({
    full_name: '',
    email: '',
    phone: '',
    role: 'teacher',
    ec_number: '',
    id_number: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'school_admin') {
      router.push('/dashboard')
      toast.error('Access denied')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'school_admin' && profile.school_id) {
      loadStaff()
    }
  }, [profile])

  useEffect(() => {
    // Check if we should open add dialog from URL
    if (searchParams.get('action') === 'add') {
      setIsAddDialogOpen(true)
    }
  }, [searchParams])

  const loadStaff = async () => {
    if (!profile?.school_id) return

    try {
      setLoading(true)

      // Load all staff (teachers and enrollment officers)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('school_id', profile.school_id)
        .in('role', ['teacher', 'enrollment_officer'])
        .order('created_at', { ascending: false })

      if (error) throw error

      const staffMembers: StaffMember[] = (data || []).map(p => ({
        id: p.id,
        user_id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: p.role as StaffRole,
        phone: p.phone_number || undefined,
        employee_id: p.id_number || undefined,
        department: undefined, // Not in DB yet
        status: p.account_status === 'active' ? 'active' as const : 'inactive' as const,
        created_at: p.created_at,
        last_login: p.last_login_at || undefined
      }))

      setStaff(staffMembers)
    } catch (error: any) {
      console.error('Error loading staff:', error)
      toast.error('Failed to load staff members')
    } finally {
      setLoading(false)
    }
  }

  // Format ID number: "71-712882414-G-42" → "712882414G42"
  const formatIdForPassword = (idNumber: string): string => {
    // Remove all dashes and spaces, keep only alphanumeric
    return idNumber.replace(/[-\s]/g, '')
  }

  // Validate ID number format (Zimbabwean format: XX-XXXXXXX-X-XX)
  const isValidIdFormat = (idNumber: string): boolean => {
    // Accept formats like: 71-712882414-G-42 or just the numbers
    const cleaned = idNumber.replace(/[-\s]/g, '')
    return cleaned.length >= 10 && /^[0-9A-Za-z]+$/.test(cleaned)
  }

  const handleAddStaff = async () => {
    if (!profile?.school_id) return

    // Validate form
    if (!newStaff.full_name.trim()) {
      toast.error('Please enter the staff member\'s full name')
      return
    }
    if (!newStaff.ec_number.trim()) {
      toast.error('Please enter the EC Number (this will be their username)')
      return
    }
    if (!newStaff.id_number.trim()) {
      toast.error('Please enter the ID Number (this will be their password)')
      return
    }
    if (!isValidIdFormat(newStaff.id_number)) {
      toast.error('Invalid ID Number format. Example: 71-712882414-G-42')
      return
    }
    if (!newStaff.role) {
      toast.error('Please select a role')
      return
    }

    try {
      setIsSaving(true)

      // Username = EC Number, Password = ID Number (formatted)
      const username = newStaff.ec_number.trim().toUpperCase()
      const password = formatIdForPassword(newStaff.id_number)

      // Create user via admin API
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newStaff.email || `${username.toLowerCase()}@staff.local`,
          password: password,
          full_name: newStaff.full_name,
          role: newStaff.role,
          school_id: profile.school_id,
          username: username,
          phone: newStaff.phone || null,
          employee_id: username, // Store EC Number
          id_number: password    // Store formatted ID
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user')
      }

      // No email sending - credentials are EC Number and ID
      toast.success(`${getRoleDisplayName(newStaff.role)} added successfully!`)
      toast.info(`Username: ${username} | Password: Their ID Number`, { duration: 8000 })

      // Reset form and close dialog
      setNewStaff({
        full_name: '',
        email: '',
        phone: '',
        role: 'teacher',
        ec_number: '',
        id_number: ''
      })
      setIsAddDialogOpen(false)
      
      // Reload staff list
      await loadStaff()

    } catch (error: any) {
      console.error('Error adding staff:', error)
      toast.error(error.message || 'Failed to add staff member')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteStaff = async (staffMember: StaffMember) => {
    if (!confirm(`Are you sure you want to remove ${staffMember.full_name}? This action cannot be undone.`)) {
      return
    }

    try {
      // Delete user via admin API (handles both auth and profile)
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: staffMember.user_id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      toast.success(`${staffMember.full_name} has been removed`)
      await loadStaff()
    } catch (error: any) {
      console.error('Error deleting staff:', error)
      toast.error(error.message || 'Failed to remove staff member')
    }
  }

  const getRoleDisplayName = (role: StaffRole): string => {
    switch (role) {
      case 'teacher': return 'Teacher'
      case 'enrollment_officer': return 'Enrollment Officer'
      default: return role
    }
  }

  const getRoleBadgeColor = (role: StaffRole): string => {
    switch (role) {
      case 'teacher': return 'bg-blue-100 text-blue-800'
      case 'enrollment_officer': return 'bg-teal-100 text-teal-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: StaffRole) => {
    switch (role) {
      case 'teacher': return <GraduationCap className="h-4 w-4" />
      case 'enrollment_officer': return <ClipboardCheck className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  // Filter staff based on search and filters
  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (s.employee_id && s.employee_id.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesRole = roleFilter === 'all' || s.role === roleFilter
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  // Stats
  const stats = {
    total: staff.length,
    teachers: staff.filter(s => s.role === 'teacher').length,
    enrollmentOfficers: staff.filter(s => s.role === 'enrollment_officer').length
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Staff Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading staff...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'school_admin') {
    return null
  }

  return (
    <DashboardLayout title="Staff Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-sm text-gray-500">Manage teachers, enrollment officers, and bursars</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>
                  Register a teacher, enrollment officer, or bursar. Their EC Number will be their username and ID Number will be their password.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={newStaff.role}
                    onValueChange={(value: StaffRole) => setNewStaff(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-blue-600" />
                          Teacher
                        </div>
                      </SelectItem>
                      <SelectItem value="enrollment_officer">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-teal-600" />
                          Enrollment Officer
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="e.g., John Moyo"
                    value={newStaff.full_name}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ec_number">EC Number * <span className="text-xs text-gray-500">(Username)</span></Label>
                    <Input
                      id="ec_number"
                      placeholder="e.g., EC83721"
                      value={newStaff.ec_number}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, ec_number: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id_number">ID Number * <span className="text-xs text-gray-500">(Password)</span></Label>
                    <Input
                      id="id_number"
                      placeholder="e.g., 71-712882414-G-42"
                      value={newStaff.id_number}
                      onChange={(e) => setNewStaff(prev => ({ ...prev, id_number: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="e.g., +263 77 123 4567"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address <span className="text-xs text-gray-500">(Optional)</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g., john.moyo@school.co.zw"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleAddStaff} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Staff
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Staff</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Teachers</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.teachers}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Enrollment Officers</p>
                  <p className="text-2xl font-bold text-teal-600">{stats.enrollmentOfficers}</p>
                </div>
                <ClipboardCheck className="h-8 w-8 text-teal-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or EC number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="enrollment_officer">Enrollment Officers</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadStaff}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Staff Table */}
        <Card>
          <CardContent className="pt-0 pb-0">
            {filteredStaff.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>EC Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gray-100 text-gray-700">
                              {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            {member.department && (
                              <p className="text-xs text-gray-500">{member.department}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(member.role)}>
                          <span className="flex items-center gap-1">
                            {getRoleIcon(member.role)}
                            {getRoleDisplayName(member.role)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-600">{member.email}</span>
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-600">{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {member.employee_id || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status === 'active' ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {new Date(member.created_at).toLocaleDateString()}
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
                            <DropdownMenuItem onClick={() => {
                              setSelectedStaff(member)
                              setIsViewDialogOpen(true)
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteStaff(member)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery || roleFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first staff member'}
                </p>
                {!searchQuery && roleFilter === 'all' && (
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Staff Member
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Staff Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Staff Details</DialogTitle>
            </DialogHeader>
            {selectedStaff && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-gray-100 text-gray-700 text-xl">
                      {selectedStaff.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedStaff.full_name}</h3>
                    <Badge className={getRoleBadgeColor(selectedStaff.role)}>
                      {getRoleDisplayName(selectedStaff.role)}
                    </Badge>
                  </div>
                </div>

                {/* Login Credentials */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-2">Login Credentials</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Username (EC Number)</p>
                      <p className="font-mono font-medium text-blue-800">{selectedStaff.employee_id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Password</p>
                      <p className="font-mono font-medium text-blue-800">Their ID Number</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium">{selectedStaff.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium">{selectedStaff.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <Badge variant={selectedStaff.status === 'active' ? 'default' : 'secondary'}>
                      {selectedStaff.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-500">Joined</p>
                    <p className="font-medium">{new Date(selectedStaff.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
