// =====================================================
// SUPER ADMIN DASHBOARD
// app/dashboard/schools/page.tsx
// =====================================================

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// Simple fallback Alert components (used when the project's shared Alert component is missing)
function Alert({ children, className = '' }: { children?: any; className?: string }) {
  return <div className={`rounded-md p-3 bg-gray-50 border ${className}`}>{children}</div>
}
const AlertTitle = ({ children }: { children?: any }) => <div className="font-medium">{children}</div>
const AlertDescription = ({ children }: { children?: any }) => <div className="text-sm text-gray-500 mt-1">{children}</div>

import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Plus, 
  School, 
  Users, 
  GraduationCap, 
  UserCog, 
  Building2,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  User,
  Calendar,
  BookOpen,
  BarChart3,
  MoreHorizontal,
  Key,
  Send,
  AlertCircle,
  CheckCircle,
  Mail as MailIcon,
  ShieldAlert,
  DollarSign,
  Clock,
  Award,
  FileText,
  Layers,
  X
} from 'lucide-react'
import Link from 'next/link'

interface School {
  id: string
  name: string
  school_code: string
  school_type: string
  status: string
  created_at: string
  logo_url: string | null
  address: string | null
  phone: string | null
  contact_email: string | null
  principal_name: string | null
  principal_email: string | null
  principal_phone: string | null
  established_year: number | null
  total_capacity: number | null
  current_enrollment: number | null
  subscription_tier: string | null
  subscription_expires_at: string | null
  school_motto: string | null
  registration_number: string | null
  curriculum: string | null
}
interface SchoolAdmin {
  id: string
  full_name: string
  email: string
  username: string
  phone_number: string | null
  account_status: string
  last_login_at: string | null
}

interface SchoolWithStats extends School {
  stats: {
    total_students: number
    male_students: number
    female_students: number
    total_classes: number
    total_teachers: number
    total_subjects: number
    school_admin: SchoolAdmin | null
  }
}

interface CreateSchoolForm {
  name: string
  school_type: string
  address: string
  phone: string
  contact_email: string
  principal_name: string
  principal_email: string
  principal_phone: string
  established_year: number | string
  total_capacity: number | string
  subscription_tier: string
  admin_full_name: string
  admin_email: string
  admin_phone: string
  school_motto: string
  registration_number: string
  curriculum: string
  logo_file: File | null
}

interface EditSchoolForm extends Partial<School> {
  logo_file?: File | null
}

interface EditAdminForm {
  full_name: string
  email: string
  phone_number: string
  account_status: string
}

interface TeacherDetails {
  id: string
  full_name: string
  email: string
  phone_number: string | null
  account_status: string
  subjects: { id: string; name: string; code: string }[]
}

interface ClassDetails {
  id: string
  name: string
  grade_level: string
  academic_year: string
  student_count: number
  class_teacher: string | null
}

interface SubjectDetails {
  id: string
  name: string
  code: string
  department: string | null
  is_mandatory: boolean
}

interface StudentDetails {
  id: string
  full_name: string
  admission_number: string
  gender: string
  class_name: string | null
  guardian_name: string | null
  guardian_phone: string | null
}

interface SchoolFullDetails extends SchoolWithStats {
  teachers: TeacherDetails[]
  classes: ClassDetails[]
  subjects: SubjectDetails[]
  students: StudentDetails[]
  finances: {
    subscription_fee: number
    amount_paid: number
    balance_due: number
    last_payment_date: string | null
    next_payment_due: string | null
    payment_status: 'paid' | 'partial' | 'overdue' | 'pending'
  }
}

export default function SchoolsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SchoolsPageContent />
    </Suspense>
  )
}

function SchoolsPageContent() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [schools, setSchools] = useState<SchoolWithStats[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dialogs state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithStats | null>(null)
  const [viewSchoolDetails, setViewSchoolDetails] = useState<SchoolFullDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // Forms state
  const [createFormData, setCreateFormData] = useState<CreateSchoolForm>({
    name: '',
    school_type: 'Primary',
    address: '',
    phone: '',
    contact_email: '',
    principal_name: '',
    principal_email: '',
    principal_phone: '',
    established_year: new Date().getFullYear(),
    total_capacity: 1000,
    subscription_tier: 'basic',
    admin_full_name: '',
    admin_email: '',
    admin_phone: '',
    school_motto: '',
    registration_number: '',
    curriculum: '',
    logo_file: null
  })

  const [editFormData, setEditFormData] = useState<EditSchoolForm>({})
  const [adminFormData, setAdminFormData] = useState<EditAdminForm>({
    full_name: '',
    email: '',
    phone_number: '',
    account_status: 'active'
  })

  const [submitting, setSubmitting] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSchoolType, setFilterSchoolType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile?.role !== 'super_admin') {
      toast.error('Access denied')
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  // Handle URL params for opening create dialog
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'create' && profile?.role === 'super_admin') {
      setCreateDialogOpen(true)
      // Clear the URL param after opening
      router.replace('/dashboard/schools')
    }
  }, [searchParams, profile, router])

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      loadSchools()
    }
  }, [profile])

  const loadSchools = async () => {
    try {
      setLoading(true)
      
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false })

      if (schoolsError) throw schoolsError

      const schoolsWithStats = await Promise.all(
        (schoolsData || []).map(async (school) => {
          // Get student stats
          const { data: students } = await supabase
            .from('students')
            .select('id, gender')
            .eq('school_id', school.id)
            .eq('student_status', 'active')

          // Get class count
          const { count: classCount } = await supabase
            .from('classes')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', school.id)

          // Get teacher count
          const { count: teacherCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', school.id)
            .eq('role', 'teacher')

          // Get subject count
          const { count: subjectCount } = await supabase
            .from('subjects')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', school.id)

          // Get school admin
          const { data: adminData } = await supabase
            .from('profiles')
            .select('id, full_name, email, username, phone_number, account_status, last_login_at')
            .eq('school_id', school.id)
            .eq('role', 'school_admin')
            .maybeSingle()

          return {
            ...school,
            stats: {
              total_students: students?.length || 0,
              male_students: students?.filter(s => s.gender === 'Male').length || 0,
              female_students: students?.filter(s => s.gender === 'Female').length || 0,
              total_classes: classCount || 0,
              total_teachers: teacherCount || 0,
              total_subjects: subjectCount || 0,
              school_admin: adminData || null
            }
          }
        })
      )

      setSchools(schoolsWithStats)
    } catch (error: any) {
      console.error('Error loading schools:', error)
      toast.error('Failed to load schools')
    } finally {
      setLoading(false)
    }
  }

  // Load comprehensive school details for view dialog
  const loadSchoolDetails = async (school: SchoolWithStats) => {
    try {
      setLoadingDetails(true)
      setSelectedSchool(school)
      setViewDialogOpen(true)

      // Get teachers with their subjects
      const { data: teachersData } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone_number,
          account_status,
          teacher_subjects (
            subjects (
              id,
              name,
              code
            )
          )
        `)
        .eq('school_id', school.id)
        .eq('role', 'teacher')

      const teachers: TeacherDetails[] = (teachersData || []).map((t: any) => ({
        id: t.id,
        full_name: t.full_name,
        email: t.email,
        phone_number: t.phone_number,
        account_status: t.account_status,
        subjects: t.teacher_subjects?.map((ts: any) => ts.subjects).filter(Boolean) || []
      }))

      // Get classes with student count and class teacher
      const { data: classesData } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          grade_level,
          academic_year,
          class_teacher_id,
          profiles!classes_class_teacher_id_fkey (
            full_name
          )
        `)
        .eq('school_id', school.id)

      const classesWithCounts = await Promise.all(
        (classesData || []).map(async (cls: any) => {
          const { count } = await supabase
            .from('student_classes')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)

          return {
            id: cls.id,
            name: cls.name,
            grade_level: cls.grade_level,
            academic_year: cls.academic_year,
            student_count: count || 0,
            class_teacher: cls.profiles?.full_name || null
          }
        })
      )

      // Get subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, code, department, is_mandatory')
        .eq('school_id', school.id)

      const subjects: SubjectDetails[] = (subjectsData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        department: s.department,
        is_mandatory: s.is_mandatory
      }))

      // Get students with class and guardian info
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          full_name,
          admission_number,
          gender,
          guardian_name,
          guardian_phone,
          student_status
        `)
        .eq('school_id', school.id)
        .limit(100) // Limit for performance

      console.log('Students query result:', { count: studentsData?.length, error: studentsError, sample: studentsData?.[0] })

      const students: StudentDetails[] = (studentsData || []).map((s: any) => ({
        id: s.id,
        full_name: s.full_name,
        admission_number: s.admission_number,
        gender: s.gender,
        class_name: null, // Will load separately if needed
        guardian_name: s.guardian_name,
        guardian_phone: s.guardian_phone
      }))

      // Get Robokorda subscription/payment data for this school
      let finances = {
        subscription_fee: 0,
        amount_paid: 0,
        balance_due: 0,
        last_payment_date: null as string | null,
        next_payment_due: null as string | null,
        payment_status: 'pending' as 'paid' | 'partial' | 'overdue' | 'pending'
      }

      try {
        // Check for school_subscriptions table (Robokorda payments)
        const { data: subscriptionData } = await supabase
          .from('school_subscriptions')
          .select('*')
          .eq('school_id', school.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (subscriptionData) {
          finances = {
            subscription_fee: subscriptionData.subscription_fee || 0,
            amount_paid: subscriptionData.amount_paid || 0,
            balance_due: (subscriptionData.subscription_fee || 0) - (subscriptionData.amount_paid || 0),
            last_payment_date: subscriptionData.last_payment_date,
            next_payment_due: subscriptionData.next_payment_due,
            payment_status: subscriptionData.payment_status || 'pending'
          }
        } else {
          // Calculate based on subscription tier if no payment records
          const tierPrices: { [key: string]: number } = {
            'basic': 99,
            'standard': 199,
            'premium': 399,
            'enterprise': 999
          }
          finances.subscription_fee = tierPrices[school.subscription_tier || 'basic'] || 99
          finances.balance_due = finances.subscription_fee
        }
      } catch (e) {
        // Subscription table might not exist yet
        console.log('School subscriptions table not available')
        // Set default based on tier
        const tierPrices: { [key: string]: number } = {
          'basic': 99,
          'standard': 199,
          'premium': 399,
          'enterprise': 999
        }
        finances.subscription_fee = tierPrices[school.subscription_tier || 'basic'] || 99
        finances.balance_due = finances.subscription_fee
      }

      setViewSchoolDetails({
        ...school,
        teachers,
        classes: classesWithCounts,
        subjects,
        students,
        finances
      })

    } catch (error: any) {
      console.error('Error loading school details:', error)
      toast.error('Failed to load school details')
    } finally {
      setLoadingDetails(false)
    }
  }

  const generateSchoolCode = (schoolName: string, schoolType: string): string => {
    // Extract initials from school name
    const initials = schoolName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3)
    
    // Get current year
    const year = new Date().getFullYear().toString().substring(2)
    
    // Generate random 4-digit number
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    
    // School type code
    const typeCode = schoolType === 'Primary' ? 'PR' : 'SC'
    
    return `${initials}${typeCode}${year}${randomNum}`
  }


const handleCreateSchool = async (e: React.FormEvent) => {
  e.preventDefault()
  setSubmitting(true)

  try {
    // Generate school code
    const schoolCode = generateSchoolCode(createFormData.name, createFormData.school_type)

    // Upload logo if provided
    let logoUrl = null
    if (createFormData.logo_file) {
      const fileExt = createFormData.logo_file.name.split('.').pop()
      const fileName = `${schoolCode}-logo-${Date.now()}.${fileExt}`
      const filePath = `school-logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(filePath, createFormData.logo_file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('school-assets')
        .getPublicUrl(filePath)

      logoUrl = urlData.publicUrl
    }

    // Create school
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: createFormData.name,
        school_code: schoolCode,
        school_type: createFormData.school_type,
        address: createFormData.address,
        phone: createFormData.phone,
        contact_email: createFormData.contact_email,
        principal_name: createFormData.principal_name,
        principal_email: createFormData.principal_email,
        principal_phone: createFormData.principal_phone,
        established_year: typeof createFormData.established_year === 'string' ? parseInt(createFormData.established_year) : createFormData.established_year,
        total_capacity: typeof createFormData.total_capacity === 'string' ? parseInt(createFormData.total_capacity) : createFormData.total_capacity,
        subscription_tier: createFormData.subscription_tier,
        logo_url: logoUrl,
        status: 'active',
        current_enrollment: 0,
        school_motto: createFormData.school_motto,
        registration_number: createFormData.registration_number,
        curriculum: createFormData.curriculum
      })
      .select()
      .single()

    if (schoolError) throw schoolError

    // Generate admin username and password
    const adminUsername = `${schoolCode}-ADM-${Math.floor(10000 + Math.random() * 90000)}`
    const tempPassword = `Admin@${schoolCode}123`

    // Create admin user via API
    const adminResponse = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: createFormData.admin_email,
        password: tempPassword,
        full_name: createFormData.admin_full_name,
        phone: createFormData.admin_phone,
        school_id: schoolData.id,
        username: adminUsername
      })
    })

    const adminResult = await adminResponse.json()

    if (!adminResponse.ok) {
      console.error('Admin creation failed:', adminResult)
      throw new Error(adminResult.error || 'Failed to create admin user')
    }

    console.log('✅ Admin created successfully:', adminResult)

    // Send welcome emails
    const adminData = {
      email: createFormData.admin_email,
      full_name: createFormData.admin_full_name,
      username: adminUsername,
      phone_number: createFormData.admin_phone
    }
    
    await sendWelcomeEmails(schoolData, adminData, tempPassword)

    toast.success('School created successfully!', {
      description: `School Code: ${schoolCode}. Admin username: ${adminUsername}. Emails sent.`
    })

    // Reset form
    setCreateFormData({
      name: '',
      school_type: 'Primary',
      address: '',
      phone: '',
      contact_email: '',
      principal_name: '',
      principal_email: '',
      principal_phone: '',
      established_year: new Date().getFullYear(),
      total_capacity: 1000,
      subscription_tier: 'basic',
      admin_full_name: '',
      admin_email: '',
      admin_phone: '',
      school_motto: '',
      registration_number: '',
      curriculum: '',
      logo_file: null
    })
    setCreateDialogOpen(false)
    loadSchools()

  } catch (error: any) {
    console.error('Error creating school:', error)
    toast.error('Failed to create school', { description: error.message })
  } finally {
    setSubmitting(false)
  }
}

// Replace your handleAssignAdmin function with this updated version

const handleAssignAdmin = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!selectedSchool) return

  setSubmitting(true)

  try {
    // Check if admin email already exists in profiles
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, role, school_id')
      .eq('email', adminFormData.email)
      .maybeSingle()

    if (checkError) throw checkError

    if (existingUser) {
      // User already exists, just update their role and school
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'school_admin',
          school_id: selectedSchool.id,
          full_name: adminFormData.full_name,
          phone_number: adminFormData.phone_number,
          account_status: adminFormData.account_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)

      if (updateError) throw updateError

      // Send notification email
      await sendAdminAssignedEmail(
        selectedSchool,
        {
          email: adminFormData.email,
          full_name: adminFormData.full_name,
          username: existingUser.email.split('@')[0]
        }
      )

      toast.success('Existing user assigned as school admin!')
    } else {
      // Create new admin user
      const adminUsername = `${selectedSchool.school_code}-ADM-${Math.floor(10000 + Math.random() * 90000)}`
      const tempPassword = `Admin@${selectedSchool.school_code}123`

      // Create admin user via API
      const adminResponse = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminFormData.email,
          password: tempPassword,
          full_name: adminFormData.full_name,
          phone: adminFormData.phone_number,
          school_id: selectedSchool.id,
          username: adminUsername
        })
      })

      const adminResult = await adminResponse.json()

      if (!adminResponse.ok) {
        console.error('Admin creation failed:', adminResult)
        throw new Error(adminResult.error || 'Failed to create admin user')
      }

      console.log('✅ Admin created successfully:', adminResult)

      // Send welcome email
      await sendWelcomeEmails(
        selectedSchool,
        {
          email: adminFormData.email,
          full_name: adminFormData.full_name,
          username: adminUsername,
          phone_number: adminFormData.phone_number
        },
        tempPassword
      )

      toast.success('School admin assigned successfully!', {
        description: `Login details sent to ${adminFormData.email}`
      })
    }

    setAdminDialogOpen(false)
    setSelectedSchool(null)
    setAdminFormData({
      full_name: '',
      email: '',
      phone_number: '',
      account_status: 'active'
    })
    loadSchools()

  } catch (error: any) {
    console.error('Error assigning admin:', error)
    toast.error('Failed to assign admin', { 
      description: error.message || 'Please check the email and try again'
    })
  } finally {
    setSubmitting(false)
  }
}

  const handleEditSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSchool) return

    setSubmitting(true)

    try {
      const updates: any = {
        name: editFormData.name || selectedSchool.name,
        school_type: editFormData.school_type || selectedSchool.school_type,
        address: editFormData.address || selectedSchool.address,
        phone: editFormData.phone || selectedSchool.phone,
        contact_email: editFormData.contact_email || selectedSchool.contact_email,
        principal_name: editFormData.principal_name || selectedSchool.principal_name,
        principal_email: editFormData.principal_email || selectedSchool.principal_email,
        principal_phone: editFormData.principal_phone || selectedSchool.principal_phone,
        established_year: typeof editFormData.established_year === 'string' ? parseInt(editFormData.established_year) : editFormData.established_year || selectedSchool.established_year,
        total_capacity: typeof editFormData.total_capacity === 'string' ? parseInt(editFormData.total_capacity) : editFormData.total_capacity || selectedSchool.total_capacity,
        subscription_tier: editFormData.subscription_tier || selectedSchool.subscription_tier,
        status: editFormData.status || selectedSchool.status,
        school_motto: editFormData.school_motto || selectedSchool.school_motto,
        registration_number: editFormData.registration_number || selectedSchool.registration_number,
        curriculum: editFormData.curriculum || selectedSchool.curriculum,
        updated_at: new Date().toISOString()
      }

      // Upload new logo if provided
      if (editFormData.logo_file) {
        const fileExt = editFormData.logo_file.name.split('.').pop()
        const fileName = `${selectedSchool.school_code}-logo-${Date.now()}.${fileExt}`
        const filePath = `school-logos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('school-assets')
          .upload(filePath, editFormData.logo_file)

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('school-assets')
            .getPublicUrl(filePath)
          updates.logo_url = urlData.publicUrl
        }
      }

      const { error } = await supabase
        .from('schools')
        .update(updates)
        .eq('id', selectedSchool.id)

      if (error) throw error

      toast.success('School updated successfully!')
      setEditDialogOpen(false)
      setSelectedSchool(null)
      setEditFormData({})
      loadSchools()

    } catch (error: any) {
      console.error('Error updating school:', error)
      toast.error('Failed to update school', { description: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  

  const sendWelcomeEmails = async (
    schoolData: any,
    adminData: any,
    adminPassword: string
  ) => {
    try {
      setSendingEmail(true)
      
      // Send email to school admin
      const adminEmailResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: adminData.email,
          subject: 'Welcome to SmartSchools ERP - School Admin Account Created',
          template: 'welcome-admin',
          data: {
            adminName: adminData.full_name,
            schoolName: schoolData.name,
            schoolCode: schoolData.school_code,
            username: adminData.username,
            password: adminPassword,
            loginUrl: `${window.location.origin}/login`,
            supportEmail: 'support@robokorda.dev'
          }
        })
      })

      const adminEmailResult = await adminEmailResponse.json()
      
      if (adminEmailResponse.ok) {
        console.log('Admin email sent successfully:', adminEmailResult)
        toast.success('Welcome email sent to school admin')
      } else {
        console.error('Failed to send admin email:', adminEmailResult)
        toast.warning('School created but admin email could not be sent')
      }

      // Send email to principal if email exists
      if (schoolData.principal_email) {
        const principalEmailResponse = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: schoolData.principal_email,
            subject: `Welcome to SmartSchools ERP - ${schoolData.name} Registration`,
            template: 'welcome-principal',
            data: {
              principalName: schoolData.principal_name,
              schoolName: schoolData.name,
              schoolCode: schoolData.school_code,
              adminName: adminData.full_name,
              adminEmail: adminData.email,
              adminPhone: adminData.phone_number,
              supportEmail: 'support@robokorda.dev'
            }
          })
        })

        const principalEmailResult = await principalEmailResponse.json()
        
        if (principalEmailResponse.ok) {
          console.log('Principal email sent successfully:', principalEmailResult)
          toast.success('Welcome email sent to principal')
        } else {
          console.error('Failed to send principal email:', principalEmailResult)
        }
      }
    } catch (error) {
      console.error('Error sending emails:', error)
      toast.warning('School created but emails could not be sent')
    } finally {
      setSendingEmail(false)
    }
  }

  const sendAdminAssignedEmail = async (
    schoolData: any,
    adminData: any
  ) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: adminData.email,
          subject: 'SmartSchools ERP - Admin Role Assigned',
          template: 'admin-assigned',
          data: {
            adminName: adminData.full_name,
            schoolName: schoolData.name,
            schoolCode: schoolData.school_code,
            loginUrl: `${window.location.origin}/login`,
            supportEmail: 'support@robokorda.dev'
          }
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        console.log('Admin assigned email sent successfully:', result)
        toast.success('Notification email sent to admin')
      } else {
        console.error('Failed to send admin assigned email:', result)
      }
    } catch (error) {
      console.error('Error sending admin assigned email:', error)
    }
  }



  // Key fixes for page.tsx - Only the fixed functions

// Fix 1: Update handleDeleteSchool to handle foreign key constraints
const handleDeleteSchool = async (schoolId: string, schoolName: string) => {
  if (!confirm(`Are you sure you want to delete ${schoolName}? This will also delete all related data (students, teachers, classes, admins, etc.). This action cannot be undone.`)) {
    return
  }

  try {
    setLoading(true)
    
    // Delete in correct order to respect foreign key constraints
    
    // 0. First, get all users (profiles) linked to this school so we can delete their auth accounts
    const { data: schoolProfiles } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('school_id', schoolId)
      .neq('role', 'super_admin')  // Never delete super_admin
    
    console.log('Profiles to delete:', schoolProfiles)

    // 1. Delete audit logs (references school_id)
    const { error: auditError } = await supabase
      .from('system_audit_log')
      .delete()
      .eq('school_id', schoolId)
    
    if (auditError) console.warn('Error deleting audit logs:', auditError)

    // 2. Delete students
    const { error: studentsError } = await supabase
      .from('students')
      .delete()
      .eq('school_id', schoolId)
    
    if (studentsError) console.warn('Error deleting students:', studentsError)

    // 3. Delete classes
    const { error: classesError } = await supabase
      .from('classes')
      .delete()
      .eq('school_id', schoolId)
    
    if (classesError) console.warn('Error deleting classes:', classesError)

    // 4. Delete subjects
    const { error: subjectsError } = await supabase
      .from('subjects')
      .delete()
      .eq('school_id', schoolId)
    
    if (subjectsError) console.warn('Error deleting subjects:', subjectsError)

    // 5. Delete profiles linked to this school (except super_admin)
    const { error: profilesDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('school_id', schoolId)
      .neq('role', 'super_admin')
    
    if (profilesDeleteError) console.warn('Error deleting profiles:', profilesDeleteError)

    // 6. Delete auth users for the profiles we found
    if (schoolProfiles && schoolProfiles.length > 0) {
      for (const profile of schoolProfiles) {
        try {
          const response = await fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: profile.id })
          })
          const result = await response.json()
          if (!response.ok) {
            console.warn('Failed to delete auth user:', profile.id, result)
          } else {
            console.log('✅ Deleted auth user:', profile.id)
          }
        } catch (err) {
          console.warn('Error deleting auth user:', profile.id, err)
        }
      }
    }

    // 7. Finally, delete the school
    const { error: schoolError } = await supabase
      .from('schools')
      .delete()
      .eq('id', schoolId)

    if (schoolError) throw schoolError

    toast.success('School and all related users deleted successfully')
    loadSchools()
  } catch (error: any) {
    console.error('Error deleting school:', error)
    toast.error('Failed to delete school', { description: error.message })
  } finally {
    setLoading(false)
  }
}

// Fix 2: Update handleResendCredentials to properly handle errors
const handleResendCredentials = async (school: SchoolWithStats) => {
  if (!school.stats.school_admin) {
    toast.error('No school admin assigned')
    return
  }

  setSendingEmail(true)

  try {
    // Generate new temporary password
    const tempPassword = `Admin@${school.school_code}${Math.floor(100 + Math.random() * 900)}`

    console.log('🔄 Resetting password for:', school.stats.school_admin.email)

    // Reset password via API
    const resetResponse = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: school.stats.school_admin.id,
        password: tempPassword
      })
    })

    // Check content type before parsing
    const contentType = resetResponse.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await resetResponse.text()
      console.error('❌ Non-JSON response:', textResponse)
      throw new Error('Server returned invalid response. Please check server logs.')
    }

    const resetResult = await resetResponse.json()

    if (!resetResponse.ok) {
      console.error('Password reset failed:', resetResult)
      throw new Error(resetResult.error || 'Failed to reset password')
    }

    console.log('✅ Password reset successfully')

    // Send email with credentials
    console.log('📧 Sending credentials email...')
    const emailResponse = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: school.stats.school_admin.email,
        subject: 'SmartSchools ERP - Login Credentials',
        template: 'credentials-reset',
        data: {
          adminName: school.stats.school_admin.full_name,
          schoolName: school.name,
          username: school.stats.school_admin.username,
          password: tempPassword,
          loginUrl: `${window.location.origin}/login`
        }
      })
    })

    // Check content type for email response
    const emailContentType = emailResponse.headers.get('content-type')
    if (!emailContentType || !emailContentType.includes('application/json')) {
      const emailTextResponse = await emailResponse.text()
      console.error('❌ Email API returned non-JSON:', emailTextResponse)
      throw new Error('Email service configuration error. Please check EmailJS settings.')
    }

    const emailResult = await emailResponse.json()

    if (emailResponse.ok) {
      console.log('✅ Credentials email sent:', emailResult)
      toast.success('Credentials sent successfully!', {
        description: `Email sent to ${school.stats.school_admin.email}`
      })
    } else {
      console.error('❌ Email failed:', emailResult)
      throw new Error(emailResult.error || 'Failed to send email')
    }

  } catch (error: any) {
    console.error('❌ Error resending credentials:', error)
    toast.error('Failed to send credentials', { 
      description: error.message || 'Please check server configuration and try again'
    })
  } finally {
    setSendingEmail(false)
  }
}

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCreateFormData({
        ...createFormData,
        logo_file: e.target.files[0]
      })
    }
  }

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditFormData({
        ...editFormData,
        logo_file: e.target.files[0]
      })
    }
  }

  const openEditDialog = (school: SchoolWithStats) => {
    setSelectedSchool(school)
    setEditFormData({
      name: school.name,
      school_type: school.school_type,
      address: school.address || '',
      phone: school.phone || '',
      contact_email: school.contact_email || '',
      principal_name: school.principal_name || '',
      principal_email: school.principal_email || '',
      principal_phone: school.principal_phone || '',
      established_year: school.established_year,
      total_capacity: school.total_capacity,
      subscription_tier: school.subscription_tier || 'basic',
      status: school.status,
      school_motto: school.school_motto || '',
      registration_number: school.registration_number || '',
      curriculum: school.curriculum || ''
    })
    setEditDialogOpen(true)
  }

  const openAdminDialog = (school: SchoolWithStats) => {
    setSelectedSchool(school)
    if (school.stats.school_admin) {
      setAdminFormData({
        full_name: school.stats.school_admin.full_name,
        email: school.stats.school_admin.email,
        phone_number: school.stats.school_admin.phone_number || '',
        account_status: school.stats.school_admin.account_status
      })
    } else {
      setAdminFormData({
        full_name: '',
        email: '',
        phone_number: '',
        account_status: 'active'
      })
    }
    setAdminDialogOpen(true)
  }

  const filteredSchools = schools.filter(school => {
    if (searchQuery && !school.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !school.school_code.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (filterSchoolType !== 'all' && school.school_type !== filterSchoolType) {
      return false
    }
    if (filterStatus !== 'all' && school.status !== filterStatus) {
      return false
    }
    return true
  })

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Schools Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading schools...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Schools Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Schools</h1>
            <p className="text-gray-600">Manage all schools in the system</p>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create School
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Register New School</DialogTitle>
                  <DialogDescription>Add a new school to the platform</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSchool} className="space-y-6">
                  <Tabs defaultValue="school-info" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="school-info">School Information</TabsTrigger>
                      <TabsTrigger value="admin-info">Admin Information</TabsTrigger>
                      <TabsTrigger value="additional">Additional Details</TabsTrigger>
                    </TabsList>
                    
                    {/* School Information Tab */}
                    <TabsContent value="school-info" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>School Name *</Label>
                          <Input
                            placeholder="e.g., St. Mary's High School"
                            value={createFormData.name}
                            onChange={(e) => setCreateFormData({...createFormData, name: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>School Type *</Label>
                          <Select 
                            value={createFormData.school_type} 
                            onValueChange={(value) => setCreateFormData({...createFormData, school_type: value})}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Primary">Primary School</SelectItem>
                              <SelectItem value="Secondary">Secondary School</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Contact Email *</Label>
                          <Input
                            type="email"
                            placeholder="info@school.com"
                            value={createFormData.contact_email}
                            onChange={(e) => setCreateFormData({...createFormData, contact_email: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone Number *</Label>
                          <Input
                            placeholder="+1234567890"
                            value={createFormData.phone}
                            onChange={(e) => setCreateFormData({...createFormData, phone: e.target.value})}
                            required
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Address *</Label>
                          <Input
                            placeholder="123 School Street, City, Country"
                            value={createFormData.address}
                            onChange={(e) => setCreateFormData({...createFormData, address: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>School Logo</Label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 mb-2">
                              Upload school logo (PNG, JPG, max 5MB)
                            </p>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="cursor-pointer"
                            />
                            {createFormData.logo_file && (
                              <p className="text-sm text-green-600 mt-2">
                                Selected: {createFormData.logo_file.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>School Code Preview</Label>
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-sm font-mono font-bold">
                              {createFormData.name 
                                ? generateSchoolCode(createFormData.name, createFormData.school_type)
                                : 'SCH-PR20240001'
                              }
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Auto-generated based on school name and type
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Admin Information Tab */}
                    <TabsContent value="admin-info" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Admin Full Name *</Label>
                          <Input
                            placeholder="John Doe"
                            value={createFormData.admin_full_name}
                            onChange={(e) => setCreateFormData({...createFormData, admin_full_name: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Admin Email *</Label>
                          <Input
                            type="email"
                            placeholder="admin@school.com"
                            value={createFormData.admin_email}
                            onChange={(e) => setCreateFormData({...createFormData, admin_email: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Admin Phone *</Label>
                          <Input
                            placeholder="+1234567890"
                            value={createFormData.admin_phone}
                            onChange={(e) => setCreateFormData({...createFormData, admin_phone: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Subscription Tier *</Label>
                          <Select 
                            value={createFormData.subscription_tier} 
                            onValueChange={(value) => setCreateFormData({...createFormData, subscription_tier: value})}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Admin Account Preview</Label>
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Login Credentials</AlertTitle>
                            <AlertDescription>
                              <p className="text-sm">
                                <strong>Username:</strong> {
                                  createFormData.name 
                                    ? `${generateSchoolCode(createFormData.name, createFormData.school_type)}-ADM-#####`
                                    : 'SCH-PR20240001-ADM-#####'
                                }
                              </p>
                              <p className="text-sm mt-1">
                                <strong>Password:</strong> Admin@SchoolCode123
                              </p>
                              <p className="text-xs text-blue-600 mt-2">
                                These credentials will be sent to the admin's email
                              </p>
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Additional Details Tab */}
                    <TabsContent value="additional" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Principal Name *</Label>
                          <Input
                            placeholder="Principal's full name"
                            value={createFormData.principal_name}
                            onChange={(e) => setCreateFormData({...createFormData, principal_name: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Principal Email</Label>
                          <Input
                            type="email"
                            placeholder="principal@school.com"
                            value={createFormData.principal_email}
                            onChange={(e) => setCreateFormData({...createFormData, principal_email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Principal Phone</Label>
                          <Input
                            placeholder="+1234567890"
                            value={createFormData.principal_phone}
                            onChange={(e) => setCreateFormData({...createFormData, principal_phone: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Established Year</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 1995"
                            value={createFormData.established_year}
                            onChange={(e) => setCreateFormData({...createFormData, established_year: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Total Capacity</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 1000"
                            value={createFormData.total_capacity}
                            onChange={(e) => setCreateFormData({...createFormData, total_capacity: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Registration Number</Label>
                          <Input
                            placeholder="School registration number"
                            value={createFormData.registration_number}
                            onChange={(e) => setCreateFormData({...createFormData, registration_number: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Curriculum</Label>
                          <Select 
                            value={createFormData.curriculum} 
                            onValueChange={(value) => setCreateFormData({...createFormData, curriculum: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select curriculum" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ZIMSEC">ZIMSEC</SelectItem>
                              <SelectItem value="Zambian">Zambian Curriculum</SelectItem>
                              <SelectItem value="Cambridge">Cambridge</SelectItem>
                              <SelectItem value="IB">International Baccalaureate</SelectItem>
                              <SelectItem value="American">American Curriculum</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>School Motto</Label>
                          <Textarea
                            placeholder="School motto or vision statement"
                            value={createFormData.school_motto}
                            onChange={(e) => setCreateFormData({...createFormData, school_motto: e.target.value})}
                            rows={3}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Alert>
                    <MailIcon className="h-4 w-4" />
                    <AlertTitle>Email Notifications</AlertTitle>
                    <AlertDescription>
                      Welcome emails will be automatically sent to both the school admin and principal.
                    </AlertDescription>
                  </Alert>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Creating School...' : 'Create School & Admin Account'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search schools..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>School Type</Label>
                <Select value={filterSchoolType} onValueChange={setFilterSchoolType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSearchQuery('')
                    setFilterSchoolType('all')
                    setFilterStatus('all')
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <School className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Schools</p>
                  <p className="text-2xl font-bold">{filteredSchools.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold">
                    {filteredSchools.reduce((sum, school) => sum + school.stats.total_students, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <UserCog className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">School Admins</p>
                  <p className="text-2xl font-bold">
                    {filteredSchools.filter(s => s.stats.school_admin).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Classes</p>
                  <p className="text-2xl font-bold">
                    {filteredSchools.reduce((sum, school) => sum + school.stats.total_classes, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schools Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Schools</CardTitle>
            <CardDescription>View and manage all registered schools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>School Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {school.logo_url ? (
                            <img 
                              src={school.logo_url} 
                              alt={school.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <School className="h-5 w-5 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{school.name}</p>
                            <p className="text-xs text-gray-500">
                              {school.principal_name || 'No principal assigned'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {school.school_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={school.school_type === 'Primary' ? 'default' : 'secondary'}>
                          {school.school_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{school.stats.total_students}</p>
                          <div className="flex gap-2 text-xs text-gray-500">
                            <span>♂ {school.stats.male_students}</span>
                            <span>♀ {school.stats.female_students}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {school.stats.school_admin ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {school.stats.school_admin.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{school.stats.school_admin.full_name}</p>
                              <p className="text-xs text-gray-500">{school.stats.school_admin.email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-yellow-600 text-sm">No Admin</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            school.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : school.status === 'suspended'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {school.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadSchoolDetails(school)}
                            title="View School Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(school)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAdminDialog(school)}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                          {school.stats.school_admin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendCredentials(school)}
                              disabled={sendingEmail}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSchool(school.id, school.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredSchools.length === 0 && (
                <div className="text-center py-12">
                  <School className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-4 text-gray-500">No schools found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit School Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit School: {selectedSchool?.name}</DialogTitle>
              <DialogDescription>Update school information</DialogDescription>
            </DialogHeader>
            {selectedSchool && (
              <form onSubmit={handleEditSchool} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>School Name *</Label>
                    <Input
                      value={editFormData.name || selectedSchool.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>School Type *</Label>
                    <Select 
                      value={editFormData.school_type || selectedSchool.school_type}
                      onValueChange={(value) => setEditFormData({...editFormData, school_type: value})}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Primary">Primary School</SelectItem>
                        <SelectItem value="Secondary">Secondary School</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email *</Label>
                    <Input
                      type="email"
                      value={editFormData.contact_email || selectedSchool.contact_email || ''}
                      onChange={(e) => setEditFormData({...editFormData, contact_email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input
                      value={editFormData.phone || selectedSchool.phone || ''}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                      required
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={editFormData.address || selectedSchool.address || ''}
                      onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Principal Name</Label>
                    <Input
                      value={editFormData.principal_name || selectedSchool.principal_name || ''}
                      onChange={(e) => setEditFormData({...editFormData, principal_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Principal Email</Label>
                    <Input
                      type="email"
                      value={editFormData.principal_email || selectedSchool.principal_email || ''}
                      onChange={(e) => setEditFormData({...editFormData, principal_email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Principal Phone</Label>
                    <Input
                      value={editFormData.principal_phone || selectedSchool.principal_phone || ''}
                      onChange={(e) => setEditFormData({...editFormData, principal_phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>School Logo</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {selectedSchool.logo_url && !editFormData.logo_file && (
                        <div className="mb-4">
                          <img 
                            src={selectedSchool.logo_url} 
                            alt="Current logo" 
                            className="h-20 mx-auto rounded-lg"
                          />
                          <p className="text-xs text-gray-500 mt-2">Current logo</p>
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mb-2">
                        {editFormData.logo_file ? 'New logo selected' : 'Upload new logo (optional)'}
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleEditFileChange}
                        className="cursor-pointer"
                      />
                      {editFormData.logo_file && (
                        <p className="text-sm text-green-600 mt-2">
                          Selected: {editFormData.logo_file.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>School Code</Label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <p className="text-sm font-mono font-bold">{selectedSchool.school_code}</p>
                      <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Established Year</Label>
                    <Input
                      type="number"
                      value={editFormData.established_year || selectedSchool.established_year || ''}
                      onChange={(e) => setEditFormData({...editFormData, established_year: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Capacity</Label>
                    <Input
                      type="number"
                      value={editFormData.total_capacity || selectedSchool.total_capacity || ''}
                      onChange={(e) => setEditFormData({...editFormData, total_capacity: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subscription Tier</Label>
                    <Select 
                      value={editFormData.subscription_tier || selectedSchool.subscription_tier || 'basic'}
                      onValueChange={(value) => setEditFormData({...editFormData, subscription_tier: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={editFormData.status || selectedSchool.status}
                      onValueChange={(value) => setEditFormData({...editFormData, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Registration Number</Label>
                    <Input
                      value={editFormData.registration_number || selectedSchool.registration_number || ''}
                      onChange={(e) => setEditFormData({...editFormData, registration_number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Curriculum</Label>
                    <Select 
                      value={editFormData.curriculum || selectedSchool.curriculum || ''}
                      onValueChange={(value) => setEditFormData({...editFormData, curriculum: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select curriculum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ZIMSEC">ZIMSEC</SelectItem>
                        <SelectItem value="Zambian">Zambian Curriculum</SelectItem>
                        <SelectItem value="Cambridge">Cambridge</SelectItem>
                        <SelectItem value="IB">International Baccalaureate</SelectItem>
                        <SelectItem value="American">American Curriculum</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>School Motto</Label>
                    <Textarea
                      value={editFormData.school_motto || selectedSchool.school_motto || ''}
                      onChange={(e) => setEditFormData({...editFormData, school_motto: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update School'}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Assign/Edit Admin Dialog */}
        <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedSchool?.stats.school_admin ? 'Edit School Admin' : 'Assign School Admin'}
              </DialogTitle>
              <DialogDescription>
                {selectedSchool?.stats.school_admin 
                  ? 'Update school admin information'
                  : 'Assign a school admin to ' + selectedSchool?.name
                }
              </DialogDescription>
            </DialogHeader>
            {selectedSchool && (
              <form onSubmit={handleAssignAdmin} className="space-y-4">
                <div className="space-y-2">
                  <Label>Admin Full Name *</Label>
                  <Input
                    placeholder="John Doe"
                    value={adminFormData.full_name}
                    onChange={(e) => setAdminFormData({...adminFormData, full_name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Admin Email *</Label>
                  <Input
                    type="email"
                    placeholder="admin@school.com"
                    value={adminFormData.email}
                    onChange={(e) => setAdminFormData({...adminFormData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Admin Phone *</Label>
                  <Input
                    placeholder="+1234567890"
                    value={adminFormData.phone_number}
                    onChange={(e) => setAdminFormData({...adminFormData, phone_number: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Status</Label>
                  <Select 
                    value={adminFormData.account_status}
                    onValueChange={(value) => setAdminFormData({...adminFormData, account_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {!selectedSchool.stats.school_admin && (
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertTitle>Credentials will be generated</AlertTitle>
                    <AlertDescription>
                      A username and password will be auto-generated and sent to the admin's email.
                    </AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting 
                    ? selectedSchool.stats.school_admin ? 'Updating...' : 'Assigning...'
                    : selectedSchool.stats.school_admin ? 'Update Admin' : 'Assign Admin'
                  }
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Comprehensive School View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[1400px] max-h-[95vh] overflow-hidden p-0" showCloseButton={false}>
            <DialogTitle className="sr-only">
              {viewSchoolDetails?.name || 'School'} Details
            </DialogTitle>
            {loadingDetails ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                  <p className="mt-4 text-gray-600">Loading school details...</p>
                </div>
              </div>
            ) : viewSchoolDetails ? (
              <div className="flex flex-col h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 border-4 border-white/30">
                        <AvatarImage src={viewSchoolDetails.logo_url || ''} />
                        <AvatarFallback className="bg-white/20 text-white text-2xl">
                          {viewSchoolDetails.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h1 className="text-2xl font-bold">{viewSchoolDetails.name}</h1>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="secondary" className="bg-white/20 text-white border-0">
                            {viewSchoolDetails.school_code}
                          </Badge>
                          <Badge 
                            className={
                              viewSchoolDetails.status === 'active' 
                                ? 'bg-green-500 text-white border-0' 
                                : 'bg-yellow-500 text-white border-0'
                            }
                          >
                            {viewSchoolDetails.status}
                          </Badge>
                          <Badge variant="secondary" className="bg-white/20 text-white border-0">
                            {viewSchoolDetails.school_type}
                          </Badge>
                        </div>
                        {viewSchoolDetails.school_motto && (
                          <p className="text-blue-100 mt-2 italic">"{viewSchoolDetails.school_motto}"</p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setViewDialogOpen(false)}
                      className="text-white hover:bg-white/20"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* Quick Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{viewSchoolDetails.stats.total_students}</div>
                      <div className="text-xs text-blue-100">Students</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{viewSchoolDetails.stats.total_teachers}</div>
                      <div className="text-xs text-blue-100">Teachers</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{viewSchoolDetails.stats.total_classes}</div>
                      <div className="text-xs text-blue-100">Classes</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{viewSchoolDetails.stats.total_subjects}</div>
                      <div className="text-xs text-blue-100">Subjects</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">
                        {viewSchoolDetails.established_year || 'N/A'}
                      </div>
                      <div className="text-xs text-blue-100">Established</div>
                    </div>
                  </div>
                </div>

                {/* Content with Tabs */}
                <div className="flex-1 overflow-y-auto p-6">
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-6 mb-6">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="admin">Admin</TabsTrigger>
                      <TabsTrigger value="teachers">Teachers</TabsTrigger>
                      <TabsTrigger value="students">Students</TabsTrigger>
                      <TabsTrigger value="classes">Classes</TabsTrigger>
                      <TabsTrigger value="finances">Finances</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* School Info Card */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Building2 className="h-5 w-5" />
                              School Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-start gap-3">
                              <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                              <div>
                                <p className="text-sm font-medium">Address</p>
                                <p className="text-sm text-gray-600">{viewSchoolDetails.address || 'Not specified'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Phone className="h-4 w-4 text-gray-400 mt-1" />
                              <div>
                                <p className="text-sm font-medium">Phone</p>
                                <p className="text-sm text-gray-600">{viewSchoolDetails.phone || 'Not specified'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Mail className="h-4 w-4 text-gray-400 mt-1" />
                              <div>
                                <p className="text-sm font-medium">Email</p>
                                <p className="text-sm text-gray-600">{viewSchoolDetails.contact_email || 'Not specified'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <FileText className="h-4 w-4 text-gray-400 mt-1" />
                              <div>
                                <p className="text-sm font-medium">Registration Number</p>
                                <p className="text-sm text-gray-600">{viewSchoolDetails.registration_number || 'Not specified'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <BookOpen className="h-4 w-4 text-gray-400 mt-1" />
                              <div>
                                <p className="text-sm font-medium">Curriculum</p>
                                <p className="text-sm text-gray-600">{viewSchoolDetails.curriculum || 'Not specified'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Calendar className="h-4 w-4 text-gray-400 mt-1" />
                              <div>
                                <p className="text-sm font-medium">Added to System</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(viewSchoolDetails.created_at).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Principal Info Card */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Award className="h-5 w-5" />
                              Principal Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-16 w-16">
                                <AvatarFallback className="bg-purple-100 text-purple-700">
                                  {viewSchoolDetails.principal_name?.substring(0, 2).toUpperCase() || 'PR'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-lg">{viewSchoolDetails.principal_name || 'Not assigned'}</p>
                                <p className="text-sm text-gray-500">School Principal</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Mail className="h-4 w-4 text-gray-400 mt-1" />
                              <div>
                                <p className="text-sm font-medium">Email</p>
                                <p className="text-sm text-gray-600">{viewSchoolDetails.principal_email || 'Not specified'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Phone className="h-4 w-4 text-gray-400 mt-1" />
                              <div>
                                <p className="text-sm font-medium">Phone</p>
                                <p className="text-sm text-gray-600">{viewSchoolDetails.principal_phone || 'Not specified'}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Student Demographics */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <GraduationCap className="h-5 w-5" />
                              Student Demographics
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-3xl font-bold text-blue-700">{viewSchoolDetails.stats.total_students}</div>
                                <div className="text-sm text-gray-600">Total</div>
                              </div>
                              <div className="text-center p-4 bg-sky-50 rounded-lg">
                                <div className="text-3xl font-bold text-sky-700">{viewSchoolDetails.stats.male_students}</div>
                                <div className="text-sm text-gray-600">Male</div>
                              </div>
                              <div className="text-center p-4 bg-pink-50 rounded-lg">
                                <div className="text-3xl font-bold text-pink-700">{viewSchoolDetails.stats.female_students}</div>
                                <div className="text-sm text-gray-600">Female</div>
                              </div>
                            </div>
                            <div className="mt-4">
                              <div className="flex justify-between text-sm mb-1">
                                <span>Capacity Utilization</span>
                                <span>{viewSchoolDetails.total_capacity ? Math.round((viewSchoolDetails.stats.total_students / viewSchoolDetails.total_capacity) * 100) : 0}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${viewSchoolDetails.total_capacity ? Math.min((viewSchoolDetails.stats.total_students / viewSchoolDetails.total_capacity) * 100, 100) : 0}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {viewSchoolDetails.stats.total_students} of {viewSchoolDetails.total_capacity || 0} capacity
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Subscription Info */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Layers className="h-5 w-5" />
                              Subscription
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Tier</span>
                              <Badge className="capitalize">{viewSchoolDetails.subscription_tier || 'basic'}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Expires</span>
                              <span className="text-sm font-medium">
                                {viewSchoolDetails.subscription_expires_at 
                                  ? new Date(viewSchoolDetails.subscription_expires_at).toLocaleDateString()
                                  : 'Never'
                                }
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Admin Tab */}
                    <TabsContent value="admin">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5" />
                            School Administrator
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {viewSchoolDetails.stats.school_admin ? (
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                  <AvatarFallback className="bg-green-100 text-green-700 text-xl">
                                    {viewSchoolDetails.stats.school_admin.full_name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-xl">{viewSchoolDetails.stats.school_admin.full_name}</p>
                                  <Badge 
                                    className={
                                      viewSchoolDetails.stats.school_admin.account_status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }
                                  >
                                    {viewSchoolDetails.stats.school_admin.account_status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <User className="h-4 w-4 text-gray-400 mt-1" />
                                  <div>
                                    <p className="text-sm font-medium">Username</p>
                                    <p className="text-sm text-gray-600">{viewSchoolDetails.stats.school_admin.username}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <Mail className="h-4 w-4 text-gray-400 mt-1" />
                                  <div>
                                    <p className="text-sm font-medium">Email</p>
                                    <p className="text-sm text-gray-600">{viewSchoolDetails.stats.school_admin.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <Phone className="h-4 w-4 text-gray-400 mt-1" />
                                  <div>
                                    <p className="text-sm font-medium">Phone</p>
                                    <p className="text-sm text-gray-600">{viewSchoolDetails.stats.school_admin.phone_number || 'Not specified'}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <Clock className="h-4 w-4 text-gray-400 mt-1" />
                                  <div>
                                    <p className="text-sm font-medium">Last Login</p>
                                    <p className="text-sm text-gray-600">
                                      {viewSchoolDetails.stats.school_admin.last_login_at 
                                        ? new Date(viewSchoolDetails.stats.school_admin.last_login_at).toLocaleString()
                                        : 'Never'
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <UserCog className="h-12 w-12 mx-auto text-gray-400" />
                              <p className="mt-4 text-gray-500">No admin assigned to this school</p>
                              <Button 
                                className="mt-4" 
                                onClick={() => {
                                  setViewDialogOpen(false)
                                  openAdminDialog(viewSchoolDetails)
                                }}
                              >
                                Assign Admin
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Teachers Tab */}
                    <TabsContent value="teachers">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Users className="h-5 w-5" />
                              Teachers ({viewSchoolDetails.teachers.length})
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {viewSchoolDetails.teachers.length > 0 ? (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Subjects</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {viewSchoolDetails.teachers.map((teacher) => (
                                    <TableRow key={teacher.id}>
                                      <TableCell className="font-medium">{teacher.full_name}</TableCell>
                                      <TableCell>{teacher.email}</TableCell>
                                      <TableCell>{teacher.phone_number || '-'}</TableCell>
                                      <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                          {teacher.subjects.length > 0 ? (
                                            teacher.subjects.slice(0, 3).map((subject) => (
                                              <Badge key={subject.id} variant="secondary" className="text-xs">
                                                {subject.name}
                                              </Badge>
                                            ))
                                          ) : (
                                            <span className="text-gray-400 text-sm">No subjects</span>
                                          )}
                                          {teacher.subjects.length > 3 && (
                                            <Badge variant="secondary" className="text-xs">
                                              +{teacher.subjects.length - 3}
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge 
                                          className={
                                            teacher.account_status === 'active'
                                              ? 'bg-green-100 text-green-800'
                                              : 'bg-yellow-100 text-yellow-800'
                                          }
                                        >
                                          {teacher.account_status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <Users className="h-12 w-12 mx-auto text-gray-400" />
                              <p className="mt-4 text-gray-500">No teachers registered at this school</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Students Tab */}
                    <TabsContent value="students">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <GraduationCap className="h-5 w-5" />
                              Students ({viewSchoolDetails.stats.total_students})
                            </span>
                          </CardTitle>
                          <CardDescription>
                            Showing first 100 students
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {viewSchoolDetails.students.length > 0 ? (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Admission #</TableHead>
                                    <TableHead>Gender</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Guardian</TableHead>
                                    <TableHead>Guardian Phone</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {viewSchoolDetails.students.map((student) => (
                                    <TableRow key={student.id}>
                                      <TableCell className="font-medium">{student.full_name}</TableCell>
                                      <TableCell>{student.admission_number}</TableCell>
                                      <TableCell>
                                        <Badge variant="secondary">
                                          {student.gender === 'Male' ? '♂️' : '♀️'} {student.gender}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{student.class_name || '-'}</TableCell>
                                      <TableCell>{student.guardian_name || '-'}</TableCell>
                                      <TableCell>{student.guardian_phone || '-'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <GraduationCap className="h-12 w-12 mx-auto text-gray-400" />
                              <p className="mt-4 text-gray-500">No students enrolled at this school</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Classes Tab */}
                    <TabsContent value="classes">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Classes */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Layers className="h-5 w-5" />
                              Classes ({viewSchoolDetails.classes.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {viewSchoolDetails.classes.length > 0 ? (
                              <div className="space-y-3">
                                {viewSchoolDetails.classes.map((cls) => (
                                  <div key={cls.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                      <p className="font-medium">{cls.name}</p>
                                      <p className="text-sm text-gray-500">
                                        {cls.grade_level} • {cls.academic_year}
                                      </p>
                                      {cls.class_teacher && (
                                        <p className="text-xs text-gray-400">Teacher: {cls.class_teacher}</p>
                                      )}
                                    </div>
                                    <Badge variant="secondary">{cls.student_count} students</Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Layers className="h-12 w-12 mx-auto text-gray-400" />
                                <p className="mt-4 text-gray-500">No classes created</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Subjects */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <BookOpen className="h-5 w-5" />
                              Subjects ({viewSchoolDetails.subjects.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {viewSchoolDetails.subjects.length > 0 ? (
                              <div className="space-y-3">
                                {viewSchoolDetails.subjects.map((subject) => (
                                  <div key={subject.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                      <p className="font-medium">{subject.name}</p>
                                      <p className="text-sm text-gray-500">
                                        Code: {subject.code}
                                        {subject.department && ` • ${subject.department}`}
                                      </p>
                                    </div>
                                    {subject.is_mandatory && (
                                      <Badge className="bg-blue-100 text-blue-800">Mandatory</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <BookOpen className="h-12 w-12 mx-auto text-gray-400" />
                                <p className="mt-4 text-gray-500">No subjects created</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Finances Tab */}
                    <TabsContent value="finances">
                      <div className="space-y-6">
                        {/* Robokorda Subscription Header */}
                        <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-medium opacity-90">Robokorda ERP Subscription</h3>
                                <p className="text-3xl font-bold mt-1">
                                  {viewSchoolDetails.subscription_tier?.toUpperCase() || 'BASIC'} Plan
                                </p>
                              </div>
                              <Badge 
                                className={
                                  viewSchoolDetails.finances.payment_status === 'paid' 
                                    ? 'bg-green-500 text-white border-0 text-lg px-4 py-2'
                                    : viewSchoolDetails.finances.payment_status === 'partial'
                                    ? 'bg-yellow-500 text-white border-0 text-lg px-4 py-2'
                                    : viewSchoolDetails.finances.payment_status === 'overdue'
                                    ? 'bg-red-500 text-white border-0 text-lg px-4 py-2'
                                    : 'bg-gray-500 text-white border-0 text-lg px-4 py-2'
                                }
                              >
                                {viewSchoolDetails.finances.payment_status === 'paid' ? '✓ Paid' 
                                  : viewSchoolDetails.finances.payment_status === 'partial' ? '⚠ Partial'
                                  : viewSchoolDetails.finances.payment_status === 'overdue' ? '✗ Overdue'
                                  : '⏳ Pending'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Payment Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <DollarSign className="h-10 w-10 mx-auto text-blue-600" />
                                <div className="text-3xl font-bold text-blue-700 mt-2">
                                  ${viewSchoolDetails.finances.subscription_fee.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">Subscription Fee</div>
                                <div className="text-xs text-gray-400">per billing period</div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <CheckCircle className="h-10 w-10 mx-auto text-green-600" />
                                <div className="text-3xl font-bold text-green-700 mt-2">
                                  ${viewSchoolDetails.finances.amount_paid.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">Amount Paid</div>
                                {viewSchoolDetails.finances.last_payment_date && (
                                  <div className="text-xs text-gray-400">
                                    Last: {new Date(viewSchoolDetails.finances.last_payment_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <AlertCircle className="h-10 w-10 mx-auto text-red-600" />
                                <div className="text-3xl font-bold text-red-700 mt-2">
                                  ${viewSchoolDetails.finances.balance_due.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">Balance Due</div>
                                {viewSchoolDetails.finances.next_payment_due && (
                                  <div className="text-xs text-gray-400">
                                    Due: {new Date(viewSchoolDetails.finances.next_payment_due).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Subscription Details */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              Subscription Details
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span className="text-gray-600">Subscription Tier</span>
                                  <Badge className="capitalize">{viewSchoolDetails.subscription_tier || 'basic'}</Badge>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span className="text-gray-600">Subscription Status</span>
                                  <Badge 
                                    className={
                                      viewSchoolDetails.status === 'active' 
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }
                                  >
                                    {viewSchoolDetails.status}
                                  </Badge>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span className="text-gray-600">Expires On</span>
                                  <span className="font-medium">
                                    {viewSchoolDetails.subscription_expires_at 
                                      ? new Date(viewSchoolDetails.subscription_expires_at).toLocaleDateString()
                                      : 'Never / Lifetime'
                                    }
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span className="text-gray-600">School Registered</span>
                                  <span className="font-medium">
                                    {new Date(viewSchoolDetails.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span className="text-gray-600">Students Enrolled</span>
                                  <span className="font-medium">{viewSchoolDetails.stats.total_students}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span className="text-gray-600">Active Teachers</span>
                                  <span className="font-medium">{viewSchoolDetails.stats.total_teachers}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Pricing Tiers Reference */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Layers className="h-5 w-5" />
                              Robokorda ERP Pricing Tiers
                            </CardTitle>
                            <CardDescription>
                              Upgrade or downgrade based on school needs
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className={`p-4 rounded-lg border-2 ${viewSchoolDetails.subscription_tier === 'basic' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                <div className="font-semibold">Basic</div>
                                <div className="text-2xl font-bold text-blue-600">$99</div>
                                <div className="text-xs text-gray-500">per month</div>
                              </div>
                              <div className={`p-4 rounded-lg border-2 ${viewSchoolDetails.subscription_tier === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                <div className="font-semibold">Standard</div>
                                <div className="text-2xl font-bold text-blue-600">$199</div>
                                <div className="text-xs text-gray-500">per month</div>
                              </div>
                              <div className={`p-4 rounded-lg border-2 ${viewSchoolDetails.subscription_tier === 'premium' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                <div className="font-semibold">Premium</div>
                                <div className="text-2xl font-bold text-blue-600">$399</div>
                                <div className="text-xs text-gray-500">per month</div>
                              </div>
                              <div className={`p-4 rounded-lg border-2 ${viewSchoolDetails.subscription_tier === 'enterprise' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                <div className="font-semibold">Enterprise</div>
                                <div className="text-2xl font-bold text-blue-600">$999</div>
                                <div className="text-xs text-gray-500">per month</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <p className="text-gray-500">No school data available</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}