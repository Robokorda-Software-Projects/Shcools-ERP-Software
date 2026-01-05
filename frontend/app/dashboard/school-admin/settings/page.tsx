/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  School, 
  Save, 
  Upload,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Calendar,
  User,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Stamp,
  PenTool,
  FileSignature,
  Key,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface SchoolSettings {
  id: string
  name: string
  school_code: string
  school_type: string
  status: string
  logo_url: string | null
  address: string | null
  phone: string | null
  contact_email: string | null
  website: string | null
  principal_name: string | null
  principal_email: string | null
  principal_phone: string | null
  school_motto: string | null
  established_year: number | null
  registration_number: string | null
  curriculum: string | null
  total_capacity: number | null
  current_term: string | null
  academic_year: string | null
  // Report Card Signatures & Stamps
  school_stamp_url: string | null
  principal_signature_url: string | null
  admin_signature_url: string | null
  enrollment_officer_signature_url: string | null
}

export default function SchoolSettingsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  
  // Signature/Stamp upload states
  const [stampPreview, setStampPreview] = useState<string | null>(null)
  const [principalSigPreview, setPrincipalSigPreview] = useState<string | null>(null)
  const [adminSigPreview, setAdminSigPreview] = useState<string | null>(null)
  const [enrollmentSigPreview, setEnrollmentSigPreview] = useState<string | null>(null)
  const [uploadingSignature, setUploadingSignature] = useState<string | null>(null)

  // Password/Username change states
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingCredentials, setChangingCredentials] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'school_admin') {
      router.push('/dashboard')
      toast.error('Access denied - School administrators only')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.school_id) {
      loadSchoolSettings()
    }
  }, [profile])

  const loadSchoolSettings = async () => {
    if (!profile?.school_id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', profile.school_id)
        .single()

      if (error) throw error
      setSchoolSettings(data)
      if (data?.logo_url) {
        setLogoPreview(data.logo_url)
      }
      if (data?.school_stamp_url) {
        setStampPreview(data.school_stamp_url)
      }
      if (data?.principal_signature_url) {
        setPrincipalSigPreview(data.principal_signature_url)
      }
      if (data?.admin_signature_url) {
        setAdminSigPreview(data.admin_signature_url)
      }
      if (data?.enrollment_officer_signature_url) {
        setEnrollmentSigPreview(data.enrollment_officer_signature_url)
      }
    } catch (error: any) {
      console.error('Error loading school settings:', error)
      toast.error('Failed to load school settings')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof SchoolSettings, value: string | number | null) => {
    if (!schoolSettings) return
    setSchoolSettings({ ...schoolSettings, [field]: value })
    setHasChanges(true)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB')
      return
    }

    try {
      setUploadingLogo(true)

      // Create a preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to Supabase Storage with timestamp for cache busting
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const fileName = `${profile?.school_id}/logo_${timestamp}.${fileExt}`

      // Delete old logo files first
      const { data: existingFiles } = await supabase.storage
        .from('school-assets')
        .list(`${profile?.school_id}`, { search: 'logo' })
      
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.filter(f => f.name.startsWith('logo')).map(f => `${profile?.school_id}/${f.name}`)
        if (filesToDelete.length > 0) {
          await supabase.storage.from('school-assets').remove(filesToDelete)
        }
      }

      const { data, error } = await supabase.storage
        .from('school-assets')
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('school-assets')
        .getPublicUrl(fileName)

      const logoUrl = urlData.publicUrl
      handleInputChange('logo_url', logoUrl)
      toast.success('Logo uploaded successfully')
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      toast.error('Failed to upload logo. You may need to save the URL manually.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSignatureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'stamp' | 'principal' | 'admin' | 'enrollment'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG recommended for signatures)')
      return
    }

    // Validate file size (max 1MB for signatures)
    if (file.size > 1 * 1024 * 1024) {
      toast.error('Image must be less than 1MB')
      return
    }

    const fieldMap = {
      stamp: { field: 'school_stamp_url', preview: setStampPreview, name: 'stamp' },
      principal: { field: 'principal_signature_url', preview: setPrincipalSigPreview, name: 'principal-signature' },
      admin: { field: 'admin_signature_url', preview: setAdminSigPreview, name: 'admin-signature' },
      enrollment: { field: 'enrollment_officer_signature_url', preview: setEnrollmentSigPreview, name: 'enrollment-signature' }
    }

    const config = fieldMap[type]

    try {
      setUploadingSignature(type)

      // Create a preview
      const reader = new FileReader()
      reader.onload = (e) => {
        config.preview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to Supabase Storage with timestamp for cache busting
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const fileName = `${profile?.school_id}/${config.name}_${timestamp}.${fileExt}`

      // Delete old files first
      const { data: existingFiles } = await supabase.storage
        .from('school-assets')
        .list(`${profile?.school_id}`, { search: config.name })
      
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.filter(f => f.name.startsWith(config.name)).map(f => `${profile?.school_id}/${f.name}`)
        if (filesToDelete.length > 0) {
          await supabase.storage.from('school-assets').remove(filesToDelete)
        }
      }

      const { error } = await supabase.storage
        .from('school-assets')
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('school-assets')
        .getPublicUrl(fileName)

      const url = urlData.publicUrl
      handleInputChange(config.field as keyof SchoolSettings, url)
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`)
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error)
      toast.error(`Failed to upload ${type}. Please try again.`)
    } finally {
      setUploadingSignature(null)
    }
  }

  const handleChangeCredentials = async () => {
    if (!user) return

    // Validation
    if (newUsername && newUsername.length < 3) {
      toast.error('Username must be at least 3 characters')
      return
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        toast.error('Password must be at least 6 characters')
        return
      }
      if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
      if (!currentPassword) {
        toast.error('Current password is required to change password')
        return
      }
    }

    if (!newUsername && !newPassword) {
      toast.error('Please enter a new username or password')
      return
    }

    try {
      setChangingCredentials(true)

      // Verify current password first if changing password
      if (newPassword && currentPassword) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: currentPassword
        })

        if (verifyError) {
          toast.error('Current password is incorrect')
          setChangingCredentials(false)
          return
        }
      }

      // Update username in profiles table
      if (newUsername) {
        // Check if username already exists
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', newUsername)
          .neq('id', profile?.id)
          .single()

        if (existingUser) {
          toast.error('Username already taken')
          setChangingCredentials(false)
          return
        }

        const { error: usernameError } = await supabase
          .from('profiles')
          .update({ username: newUsername })
          .eq('id', profile?.id)

        if (usernameError) throw usernameError
      }

      // Update password
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        })

        if (passwordError) throw passwordError
      }

      toast.success('Credentials updated successfully!', {
        description: newPassword ? 'Please login again with your new password' : undefined
      })

      // Clear form
      setNewUsername('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordSection(false)

      // If password was changed, sign out and redirect to login
      if (newPassword) {
        await supabase.auth.signOut()
        router.push('/login')
      }
    } catch (error: any) {
      console.error('Error changing credentials:', error)
      toast.error('Failed to update credentials')
    } finally {
      setChangingCredentials(false)
    }
  }

  const handleSave = async () => {
    if (!schoolSettings || !profile?.school_id) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('schools')
        .update({
          name: schoolSettings.name,
          school_type: schoolSettings.school_type,
          logo_url: schoolSettings.logo_url,
          address: schoolSettings.address,
          phone: schoolSettings.phone,
          contact_email: schoolSettings.contact_email,
          website: schoolSettings.website,
          principal_name: schoolSettings.principal_name,
          principal_email: schoolSettings.principal_email,
          principal_phone: schoolSettings.principal_phone,
          school_motto: schoolSettings.school_motto,
          established_year: schoolSettings.established_year,
          registration_number: schoolSettings.registration_number,
          curriculum: schoolSettings.curriculum,
          total_capacity: schoolSettings.total_capacity,
          current_term: schoolSettings.current_term,
          academic_year: schoolSettings.academic_year,
          // Report card signatures and stamps
          school_stamp_url: schoolSettings.school_stamp_url,
          principal_signature_url: schoolSettings.principal_signature_url,
          admin_signature_url: schoolSettings.admin_signature_url,
          enrollment_officer_signature_url: schoolSettings.enrollment_officer_signature_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.school_id)

      if (error) throw error

      toast.success('School settings saved successfully!')
      setHasChanges(false)
    } catch (error: any) {
      console.error('Error saving school settings:', error)
      toast.error('Failed to save school settings')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) return null

  return (
    <DashboardLayout 
      title="School Settings"
    >
      <div className="space-y-6">
        {/* Back Button & Save */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/school-admin">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* School Logo & Name */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="w-5 h-5 text-blue-600" />
              School Identity
            </CardTitle>
            <CardDescription>
              Your school&apos;s name, logo, and branding information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-8">
              {/* Logo Upload */}
              <div className="space-y-4">
                <Label>School Logo</Label>
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="School Logo" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                      {uploadingLogo ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </div>
                    <input 
                      id="logo-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                  </Label>
                  <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                </div>
              </div>

              {/* Name & Details */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">School Name *</Label>
                    <Input
                      id="name"
                      value={schoolSettings?.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter school name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="school_code">School Code *</Label>
                    <Input
                      id="school_code"
                      value={schoolSettings?.school_code || ''}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="school_motto">School Motto</Label>
                  <Input
                    id="school_motto"
                    value={schoolSettings?.school_motto || ''}
                    onChange={(e) => handleInputChange('school_motto', e.target.value)}
                    placeholder='e.g., "Excellence in Education"'
                  />
                </div>

                <div>
                  <Label htmlFor="logo_url">Logo URL (if external)</Label>
                  <Input
                    id="logo_url"
                    value={schoolSettings?.logo_url || ''}
                    onChange={(e) => {
                      handleInputChange('logo_url', e.target.value)
                      setLogoPreview(e.target.value)
                    }}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use this if you have an external logo URL</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              Contact Information
            </CardTitle>
            <CardDescription>
              How parents and visitors can reach the school
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone Number
                </Label>
                <Input
                  id="phone"
                  value={schoolSettings?.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+263 772 123 456"
                />
              </div>
              <div>
                <Label htmlFor="contact_email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> School Email
                </Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={schoolSettings?.contact_email || ''}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  placeholder="info@school.co.zw"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Physical Address
              </Label>
              <Textarea
                id="address"
                value={schoolSettings?.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="123 Main Street, Harare, Zimbabwe"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> Website
              </Label>
              <Input
                id="website"
                value={schoolSettings?.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.yourschool.co.zw"
              />
            </div>
          </CardContent>
        </Card>

        {/* Principal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              Principal Information
            </CardTitle>
            <CardDescription>
              School head/principal details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="principal_name">Principal Name</Label>
                <Input
                  id="principal_name"
                  value={schoolSettings?.principal_name || ''}
                  onChange={(e) => handleInputChange('principal_name', e.target.value)}
                  placeholder="Mr. John Moyo"
                />
              </div>
              <div>
                <Label htmlFor="principal_email">Principal Email</Label>
                <Input
                  id="principal_email"
                  type="email"
                  value={schoolSettings?.principal_email || ''}
                  onChange={(e) => handleInputChange('principal_email', e.target.value)}
                  placeholder="principal@school.co.zw"
                />
              </div>
              <div>
                <Label htmlFor="principal_phone">Principal Phone</Label>
                <Input
                  id="principal_phone"
                  value={schoolSettings?.principal_phone || ''}
                  onChange={(e) => handleInputChange('principal_phone', e.target.value)}
                  placeholder="+263 772 000 000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* School Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              School Details
            </CardTitle>
            <CardDescription>
              Additional school information and statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="school_type">School Type</Label>
                <Select 
                  value={schoolSettings?.school_type || ''} 
                  onValueChange={(value) => handleInputChange('school_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select school type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primary">Primary School</SelectItem>
                    <SelectItem value="Secondary">Secondary School</SelectItem>
                    <SelectItem value="Combined">Combined (Primary & Secondary)</SelectItem>
                    <SelectItem value="High">High School</SelectItem>
                    <SelectItem value="Junior">Junior School</SelectItem>
                    <SelectItem value="Preparatory">Preparatory School</SelectItem>
                    <SelectItem value="Boarding">Boarding School</SelectItem>
                    <SelectItem value="Day">Day School</SelectItem>
                    <SelectItem value="Mixed">Mixed (Day & Boarding)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="established_year">Established Year</Label>
                <Input
                  id="established_year"
                  type="number"
                  value={schoolSettings?.established_year || ''}
                  onChange={(e) => handleInputChange('established_year', parseInt(e.target.value) || null)}
                  placeholder="1990"
                />
              </div>
              <div>
                <Label htmlFor="registration_number">Registration Number</Label>
                <Input
                  id="registration_number"
                  value={schoolSettings?.registration_number || ''}
                  onChange={(e) => handleInputChange('registration_number', e.target.value)}
                  placeholder="REG-2024-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="curriculum">Curriculum</Label>
                <Select 
                  value={schoolSettings?.curriculum || ''} 
                  onValueChange={(value) => handleInputChange('curriculum', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select curriculum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZIMSEC">ZIMSEC</SelectItem>
                    <SelectItem value="Cambridge">Cambridge (IGCSE/AS/A-Level)</SelectItem>
                    <SelectItem value="ZIMSEC & Cambridge">ZIMSEC & Cambridge (Hybrid)</SelectItem>
                    <SelectItem value="IB">International Baccalaureate (IB)</SelectItem>
                    <SelectItem value="National Curriculum">Zimbabwe National Curriculum</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="total_capacity">Total Capacity</Label>
                <Input
                  id="total_capacity"
                  type="number"
                  value={schoolSettings?.total_capacity || ''}
                  onChange={(e) => handleInputChange('total_capacity', parseInt(e.target.value) || null)}
                  placeholder="500"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Input
                  id="status"
                  value={schoolSettings?.status || ''}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Year Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Academic Period
            </CardTitle>
            <CardDescription>
              Current academic year and term settings for fee tracking and student management.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="academic_year">Academic Year</Label>
                <Select 
                  value={schoolSettings?.academic_year || ''} 
                  onValueChange={(value) => handleInputChange('academic_year', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() - 1 + i
                      return (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="current_term">Current Term</Label>
                <Select 
                  value={schoolSettings?.current_term || ''} 
                  onValueChange={(value) => handleInputChange('current_term', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select current term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1 (January - April)</SelectItem>
                    <SelectItem value="Term 2">Term 2 (May - August)</SelectItem>
                    <SelectItem value="Term 3">Term 3 (September - December)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Card Signatures & Stamps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-purple-600" />
              Report Card Signatures & Stamps
            </CardTitle>
            <CardDescription>
              Upload official signatures and stamps that will appear on student report cards (E-Reports).
              Use transparent PNG images for best results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* School Stamp */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Stamp className="w-4 h-4" />
                  Official School Stamp
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {stampPreview ? (
                    <div className="relative">
                      <img 
                        src={stampPreview} 
                        alt="School Stamp" 
                        className="h-24 w-auto mx-auto object-contain"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => document.getElementById('stamp-upload')?.click()}
                        disabled={uploadingSignature === 'stamp'}
                      >
                        {uploadingSignature === 'stamp' ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Upload className="w-4 h-4 mr-1" />
                        )}
                        Replace
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer py-6"
                      onClick={() => document.getElementById('stamp-upload')?.click()}
                    >
                      <Stamp className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload school stamp</p>
                      <p className="text-xs text-gray-400">PNG with transparent background recommended</p>
                    </div>
                  )}
                  <input
                    id="stamp-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSignatureUpload(e, 'stamp')}
                  />
                </div>
              </div>

              {/* Principal Signature */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <PenTool className="w-4 h-4" />
                  Principal/Head Signature
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {principalSigPreview ? (
                    <div className="relative">
                      <img 
                        src={principalSigPreview} 
                        alt="Principal Signature" 
                        className="h-16 w-auto mx-auto object-contain"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => document.getElementById('principal-sig-upload')?.click()}
                        disabled={uploadingSignature === 'principal'}
                      >
                        {uploadingSignature === 'principal' ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Upload className="w-4 h-4 mr-1" />
                        )}
                        Replace
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer py-6"
                      onClick={() => document.getElementById('principal-sig-upload')?.click()}
                    >
                      <PenTool className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload principal signature</p>
                    </div>
                  )}
                  <input
                    id="principal-sig-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSignatureUpload(e, 'principal')}
                  />
                </div>
              </div>

              {/* Admin Signature */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <PenTool className="w-4 h-4" />
                  School Admin Signature
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {adminSigPreview ? (
                    <div className="relative">
                      <img 
                        src={adminSigPreview} 
                        alt="Admin Signature" 
                        className="h-16 w-auto mx-auto object-contain"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => document.getElementById('admin-sig-upload')?.click()}
                        disabled={uploadingSignature === 'admin'}
                      >
                        {uploadingSignature === 'admin' ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Upload className="w-4 h-4 mr-1" />
                        )}
                        Replace
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer py-6"
                      onClick={() => document.getElementById('admin-sig-upload')?.click()}
                    >
                      <PenTool className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload admin signature</p>
                    </div>
                  )}
                  <input
                    id="admin-sig-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSignatureUpload(e, 'admin')}
                  />
                </div>
              </div>

              {/* Enrollment Officer Signature */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <PenTool className="w-4 h-4" />
                  Enrollment Officer Signature
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {enrollmentSigPreview ? (
                    <div className="relative">
                      <img 
                        src={enrollmentSigPreview} 
                        alt="Enrollment Officer Signature" 
                        className="h-16 w-auto mx-auto object-contain"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => document.getElementById('enrollment-sig-upload')?.click()}
                        disabled={uploadingSignature === 'enrollment'}
                      >
                        {uploadingSignature === 'enrollment' ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Upload className="w-4 h-4 mr-1" />
                        )}
                        Replace
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer py-6"
                      onClick={() => document.getElementById('enrollment-sig-upload')?.click()}
                    >
                      <PenTool className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload enrollment officer signature</p>
                    </div>
                  )}
                  <input
                    id="enrollment-sig-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSignatureUpload(e, 'enrollment')}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security: Username & Password Change */}
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-600" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Change your username or password
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                <Key className="w-4 h-4 mr-2" />
                {showPasswordSection ? 'Cancel' : 'Change Credentials'}
              </Button>
            </div>
          </CardHeader>

          {showPasswordSection && (
            <CardContent>
              <div className="space-y-6 max-w-2xl">
                {/* Current Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Current Credentials</p>
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">Email:</span> {profile?.email || user?.email}
                  </p>
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">Email:</span> {user?.email}
                  </p>
                </div>

                {/* New Username */}
                <div className="space-y-2">
                  <Label htmlFor="new-username">New Username (optional)</Label>
                  <Input
                    id="new-username"
                    type="text"
                    placeholder="Leave empty to keep current username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    disabled={changingCredentials}
                  />
                  <p className="text-xs text-gray-500">
                    Username must be at least 3 characters
                  </p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-4">
                    Change Password (optional - leave empty to keep current password)
                  </p>

                  {/* Current Password */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="current-password">Current Password *</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={changingCredentials}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter new password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={changingCredentials}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={changingCredentials}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>⚠️ Important:</strong> If you change your password, you will be logged out and need to login again with your new credentials.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordSection(false)
                      setNewUsername('')
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    disabled={changingCredentials}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleChangeCredentials}
                    disabled={changingCredentials || (!newUsername && !newPassword)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {changingCredentials ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>
                    ) : (
                      <><Key className="w-4 h-4 mr-2" /> Update Credentials</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Save Button (Bottom) */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {saving ? 'Saving Changes...' : 'Save All Changes'}
          </Button>
        </div>

        
      </div>
    </DashboardLayout>
  )
}
