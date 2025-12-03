'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, School, MapPin, Phone, Mail } from 'lucide-react'
import type { School as SchoolType } from '@/lib/supabase'

export default function SchoolsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schools, setSchools] = useState<SchoolType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  
  const [schoolName, setSchoolName] = useState('')
  const [address, setAddress] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile?.role !== 'super_admin') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      loadSchools()
    }
  }, [profile])

  const loadSchools = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load schools')
      console.error(error)
    } else {
      setSchools(data || [])
    }
    setLoading(false)
  }

  const generateSchoolCode = (name: string) => {
    const prefix = name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 4)
    
    const randomNum = Math.floor(Math.random() * 900) + 100
    return `${prefix}${randomNum.toString().padStart(3, '0')}`
  }

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const schoolCode = generateSchoolCode(schoolName)

    const { error } = await supabase
      .from('schools')
      .insert({
        school_code: schoolCode,
        name: schoolName,
        address: address,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        levels_offered: ['Form 1', 'Form 2', 'Form 3', 'Form 4']
      })

    if (error) {
      toast.error('Failed to create school', {
        description: error.message,
      })
    } else {
      toast.success('School created successfully!', {
        description: `School code: ${schoolCode}`,
      })
      setDialogOpen(false)
      setSchoolName('')
      setAddress('')
      setContactEmail('')
      setContactPhone('')
      loadSchools()
    }
    setSubmitting(false)
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Schools Management">
        <div>Loading...</div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'super_admin') {
    return null
  }

  return (
    <DashboardLayout title="Schools Management">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Manage all schools in the system</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create School
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New School</DialogTitle>
                <DialogDescription>
                  Add a new school to the system. School code will be auto-generated.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSchool} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="schoolName">School Name *</Label>
                    <Input
                      id="schoolName"
                      placeholder="e.g., Churchill High School"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="e.g., 123 Main Street, Harare"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="admin@school.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      placeholder="+263..."
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create School'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-linear-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">Total Schools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{schools.length}</div>
            </CardContent>
          </Card>
        </div>

        {schools.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <School className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">No schools found</p>
              <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First School
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Schools</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school) => (
                    <TableRow key={school.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {school.school_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{school.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-3 h-3 mr-1" />
                          {school.address || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {school.contact_email && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Mail className="w-3 h-3 mr-1" />
                              {school.contact_email}
                            </div>
                          )}
                          {school.contact_phone && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Phone className="w-3 h-3 mr-1" />
                              {school.contact_phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
