/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft, UserPlus, CheckCircle2, FileText, Printer, Upload,
  AlertCircle, Clock, Settings, RefreshCw, GraduationCap, School
} from 'lucide-react'
import Link from 'next/link'

// African countries for nationality
const AFRICAN_COUNTRIES = [
  { value: 'Zimbabwe', label: 'Zimbabwe' },
  { value: 'South Africa', label: 'South Africa' },
  { value: 'Zambia', label: 'Zambia' },
  { value: 'Botswana', label: 'Botswana' },
  { value: 'Malawi', label: 'Malawi' },
  { value: 'Mozambique', label: 'Mozambique' },
  { value: 'DRC', label: 'DRC (Congo)' },
  { value: 'Lesotho', label: 'Lesotho' },
  { value: 'Eswatini', label: 'Eswatini (Swaziland)' },
  { value: 'Other', label: 'Other' }
]

// Common African occupations
const AFRICAN_OCCUPATIONS = [
  'Teacher', 'Nurse', 'Doctor', 'Engineer', 'Accountant', 'Lawyer',
  'Farmer', 'Business Owner', 'Civil Servant', 'Police Officer',
  'Driver', 'Security Guard', 'Shop Keeper', 'Mechanic', 'Electrician',
  'Plumber', 'Carpenter', 'Tailor', 'Hairdresser', 'Chef/Cook',
  'Miner', 'Construction Worker', 'Bank Employee', 'IT Professional',
  'Sales Representative', 'Domestic Worker', 'Cleaner', 'Vendor',
  'Unemployed', 'Retired', 'Other'
]

// Common medical conditions and diseases
const MEDICAL_CONDITIONS = [
  { value: 'none', label: 'None' },
  { value: 'asthma', label: 'Asthma' },
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'epilepsy', label: 'Epilepsy' },
  { value: 'allergies', label: 'Allergies (Food/Drug)' },
  { value: 'heart_condition', label: 'Heart Condition' },
  { value: 'sickle_cell', label: 'Sickle Cell Disease' },
  { value: 'adhd', label: 'ADHD' },
  { value: 'autism', label: 'Autism Spectrum Disorder' },
  { value: 'visual_impairment', label: 'Visual Impairment' },
  { value: 'hearing_impairment', label: 'Hearing Impairment' },
  { value: 'physical_disability', label: 'Physical Disability' },
  { value: 'chronic_illness', label: 'Chronic Illness' },
  { value: 'other', label: 'Other (Specify below)' }
]

// Curricula available in African schools
const CURRICULA = [
  { value: 'zimsec', label: 'ZIMSEC (Zimbabwe)' },
  { value: 'cambridge', label: 'Cambridge (IGCSE/A-Level)' },
  { value: 'ib', label: 'International Baccalaureate (IB)' },
  { value: 'south_african', label: 'South African Curriculum (CAPS)' },
  { value: 'local_national', label: 'Local National Curriculum' }
]

// Entry status types
type EntryStatus = 
  | 'new_primary'           // New student starting Grade 1
  | 'transfer_primary'      // Transferring to middle primary (Grade 2-7)
  | 'grade7_to_form1'       // Grade 7 graduate entering Form 1
  | 'transfer_secondary'    // Transferring to secondary (Form 2-4)
  | 'olevel_to_alevel'      // O-Level graduate entering A-Level

interface EnrollmentSettings {
  class_assignment_method: string
  allow_manual_override: boolean
  require_previous_grades: boolean
  require_fee_slip: boolean
  require_birth_certificate: boolean
  require_student_id: boolean
  require_parent_id: boolean
  require_previous_school_report: boolean
  minimum_fee_percentage: number
}

interface StudentData {
  fullName: string
  gender: string
  birthDate: string
  nationality: string
  idNumber: string
  birthCertificateNumber: string
  address: string
  medicalConditions: string
  medicalConditionsDetails: string
  previousSchool: string
  curriculum: string
}

interface ParentData {
  fullName: string
  birthDate: string
  idNumber: string
  phoneNumber: string
  email: string
  address: string
  relationship: string
  occupation: string
  employer: string
}

interface PreviousGrade {
  subject: string
  marks: number
  grade: string
  unit?: number  // ZIMSEC: 1-9 (1=best)
}

interface EnrollmentData {
  entryStatus: EntryStatus | ''
  gradeLevel: string
  student: StudentData
  parent: ParentData
  previousGrades: PreviousGrade[]
  classId: string
  className: string
  recommendedClassId: string
  recommendedClassName: string
  useManualClass: boolean
  feePaid: number
  selectedSubjectIds: string[]  // Subject IDs selected for the student
}

interface EnrollmentResult {
  studentId: string
  studentUsername: string
  studentPassword: string
  parentUsername: string
  parentPassword: string
  enrollmentNumber: string
  admissionNumber: string
  className: string
  classTeacher: string
  subjects: string[]
}

// Zimbabwe Grade 7 subjects
const GRADE_7_SUBJECTS = [
  'Mathematics',
  'English',
  'Shona/Ndebele',
  'General Paper',
  'Agriculture',
  'Science'
]

// Zimbabwe O-Level core subjects
const OLEVEL_SUBJECTS = [
  'Mathematics',
  'English Language',
  'Shona/Ndebele',
  'Combined Science',
  'Geography',
  'History',
  'Commerce',
  'Accounts',
  'Agriculture'
]

const CompleteStudentEnrollment = () => {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [schoolInfo, setSchoolInfo] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classSubjects, setClassSubjects] = useState<any[]>([]) // Subjects assigned to selected class
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false)
  const [currentDate, setCurrentDate] = useState('')
  const [enrollmentSettings, setEnrollmentSettings] = useState<EnrollmentSettings | null>(null)
  
  const [enrollmentResult, setEnrollmentResult] = useState<EnrollmentResult | null>(null)
  const [feeSlipFile, setFeeSlipFile] = useState<File | null>(null)
  const [showPrintLetter, setShowPrintLetter] = useState(false)
  
  // Document uploads based on school settings
  const [birthCertificateFile, setBirthCertificateFile] = useState<File | null>(null)
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null)
  const [parentIdFile, setParentIdFile] = useState<File | null>(null)
  const [previousSchoolReportFile, setPreviousSchoolReportFile] = useState<File | null>(null)
  
  const [formData, setFormData] = useState<EnrollmentData>({
    entryStatus: '',
    gradeLevel: '',
    student: {
      fullName: '',
      gender: '',
      birthDate: '',
      nationality: 'Zimbabwe',
      idNumber: '',
      birthCertificateNumber: '',
      address: '',
      medicalConditions: 'none',
      medicalConditionsDetails: '',
      previousSchool: '',
      curriculum: ''
    },
    parent: {
      fullName: '',
      birthDate: '',
      idNumber: '',
      phoneNumber: '',
      email: '',
      address: '',
      relationship: 'parent',
      occupation: '',
      employer: ''
    },
    previousGrades: [],
    classId: '',
    className: '',
    recommendedClassId: '',
    recommendedClassName: '',
    useManualClass: false,
    feePaid: 0,
    selectedSubjectIds: []
  })

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<{
    studentDob?: string
    studentId?: string
    parentDob?: string
    parentId?: string
    parentPhone?: string
    parentEmail?: string
  }>({})

  // ========== VALIDATION FUNCTIONS ==========

  // Validate Zimbabwe ID Number format: XX-XXXXXXX-X-XX (e.g., 73-2987414-R-42)
  const validateZimbabweId = (id: string): { valid: boolean; error?: string } => {
    if (!id || id.trim() === '') {
      return { valid: false, error: 'ID number is required' }
    }

    // Remove spaces and normalize
    const normalized = id.trim().toUpperCase()
    
    // Zimbabwe ID format: DD-NNNNNNN-L-DD where:
    // DD = district code (2 digits)
    // NNNNNNN = 7-digit number
    // L = letter (typically M, F, or region code)
    // DD = check digits (2 digits)
    const zimIdRegex = /^(\d{2})-?(\d{6,7})-?([A-Z])-?(\d{2})$/
    
    // Also accept birth certificate format: various formats
    const birthCertRegex = /^[A-Z0-9\-\/]{5,20}$/

    if (zimIdRegex.test(normalized)) {
      return { valid: true }
    }

    if (birthCertRegex.test(normalized)) {
      // Accept as birth certificate
      return { valid: true }
    }

    return { 
      valid: false, 
      error: 'Invalid ID format. Use: 00-0000000-X-00 or valid birth certificate number' 
    }
  }

  // Validate date of birth
  const validateDob = (dob: string, type: 'student' | 'parent'): { valid: boolean; error?: string } => {
    if (!dob) {
      return { valid: false, error: 'Date of birth is required' }
    }

    const birthDate = new Date(dob)
    const today = new Date()
    
    // Check if date is valid
    if (isNaN(birthDate.getTime())) {
      return { valid: false, error: 'Invalid date format' }
    }

    // Check if date is in the future
    if (birthDate > today) {
      return { valid: false, error: 'Date of birth cannot be in the future' }
    }

    // Calculate age
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    if (type === 'student') {
      // Student age validation based on entry status
      if (formData.entryStatus === 'new_primary') {
        // Grade 1 entry: typically 5-8 years old
        if (age < 4) {
          return { valid: false, error: 'Student too young for Grade 1 (minimum 4 years)' }
        }
        if (age > 10) {
          return { valid: false, error: 'Student may be too old for Grade 1 entry (age: ' + age + ')' }
        }
      } else if (formData.entryStatus === 'grade7_to_form1') {
        // Form 1 entry: typically 12-15 years old
        if (age < 10) {
          return { valid: false, error: 'Student too young for Form 1 (minimum 10 years)' }
        }
        if (age > 20) {
          return { valid: false, error: 'Please verify age for Form 1 entry (age: ' + age + ')' }
        }
      } else if (formData.entryStatus === 'olevel_to_alevel') {
        // A-Level entry: typically 16-20 years old
        if (age < 14) {
          return { valid: false, error: 'Student too young for A-Level (minimum 14 years)' }
        }
        if (age > 25) {
          return { valid: false, error: 'Please verify age for A-Level entry (age: ' + age + ')' }
        }
      } else {
        // General student: 4-25 years
        if (age < 4) {
          return { valid: false, error: 'Student must be at least 4 years old' }
        }
        if (age > 25) {
          return { valid: false, error: 'Please verify student age (age: ' + age + ')' }
        }
      }
    } else {
      // Parent age validation: must be at least 18 years old, typically 25-80
      if (age < 18) {
        return { valid: false, error: 'Parent/Guardian must be at least 18 years old' }
      }
      if (age > 100) {
        return { valid: false, error: 'Please verify date of birth' }
      }
    }

    return { valid: true }
  }

  // Validate phone number (Zimbabwe format)
  const validatePhone = (phone: string): { valid: boolean; error?: string } => {
    if (!phone || phone.trim() === '') {
      return { valid: false, error: 'Phone number is required' }
    }

    // Remove spaces, dashes, and + for checking
    const cleaned = phone.replace(/[\s\-\(\)]/g, '')
    
    // Zimbabwe phone formats:
    // +263 7X XXX XXXX (mobile)
    // +263 4 XXX XXXX (Harare landline)
    // 07X XXX XXXX (mobile without country code)
    // 04 XXX XXXX (Harare landline without country code)
    const zimMobileRegex = /^(\+?263|0)7[0-9]{8}$/
    const zimLandlineRegex = /^(\+?263|0)[2-9][0-9]{6,8}$/
    const genericPhoneRegex = /^\+?[0-9]{8,15}$/

    if (zimMobileRegex.test(cleaned) || zimLandlineRegex.test(cleaned) || genericPhoneRegex.test(cleaned)) {
      return { valid: true }
    }

    return { 
      valid: false, 
      error: 'Invalid phone format. Use: +263 7X XXX XXXX or 07X XXX XXXX' 
    }
  }

  // Validate email
  const validateEmail = (email: string): { valid: boolean; error?: string } => {
    if (!email || email.trim() === '') {
      return { valid: false, error: 'Email is required' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' }
    }

    return { valid: true }
  }

  // Validate all student fields
  const validateStudentFields = (): boolean => {
    const errors: typeof validationErrors = {}

    const dobResult = validateDob(formData.student.birthDate, 'student')
    if (!dobResult.valid) {
      errors.studentDob = dobResult.error
    }

    const idResult = validateZimbabweId(formData.student.idNumber)
    if (!idResult.valid) {
      errors.studentId = idResult.error
    }

    setValidationErrors(prev => ({ ...prev, ...errors }))
    return Object.keys(errors).length === 0
  }

  // Validate all parent fields
  const validateParentFields = (): boolean => {
    const errors: typeof validationErrors = {}

    const dobResult = validateDob(formData.parent.birthDate, 'parent')
    if (!dobResult.valid) {
      errors.parentDob = dobResult.error
    }

    const idResult = validateZimbabweId(formData.parent.idNumber)
    if (!idResult.valid) {
      errors.parentId = idResult.error
    }

    const phoneResult = validatePhone(formData.parent.phoneNumber)
    if (!phoneResult.valid) {
      errors.parentPhone = phoneResult.error
    }

    const emailResult = validateEmail(formData.parent.email)
    if (!emailResult.valid) {
      errors.parentEmail = emailResult.error
    }

    setValidationErrors(prev => ({ ...prev, ...errors }))
    return Object.keys(errors).length === 0
  }

  // Clear specific validation error
  const clearValidationError = (field: keyof typeof validationErrors) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }

  const totalSteps = 6

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString())
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && !['enrollment_officer', 'school_admin', 'super_admin'].includes(profile.role)) {
      router.push('/dashboard')
      toast.error('Access denied - Enrollment officers only')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.school_id) {
      loadData()
    }
  }, [profile])

  // Auto-calculate recommended class when grades change
  useEffect(() => {
    if (formData.gradeLevel && classes.length > 0) {
      calculateRecommendedClass()
    }
  }, [formData.previousGrades, formData.gradeLevel, formData.entryStatus, classes])

  // Load class subjects when classId changes
  useEffect(() => {
    if (formData.classId) {
      loadClassSubjects(formData.classId)
    } else {
      setClassSubjects([])
      setFormData(prev => ({ ...prev, selectedSubjectIds: [] }))
    }
  }, [formData.classId])

  const loadData = async () => {
    try {
      // Load school info with additional details for the letter including signatures
      const { data: school } = await supabase
        .from('schools')
        .select('id, name, school_code, logo_url, school_type, address, phone, contact_email, school_motto, principal_name, principal_email, school_stamp_url, principal_signature_url, enrollment_officer_signature_url')
        .eq('id', profile?.school_id)
        .single()

      setSchoolInfo(school)

      // Load classes with student counts
      const { data: classesData } = await supabase
        .from('classes')
        .select(`
          *,
          class_teacher:profiles!classes_class_teacher_id_fkey(full_name)
        `)
        .eq('school_id', profile?.school_id)
        .order('class_rank', { ascending: true })

      // Get student counts for each class
      if (classesData) {
        const classesWithCounts = await Promise.all(classesData.map(async (cls) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
          
          return { ...cls, student_count: count || 0 }
        }))
        setClasses(classesWithCounts)
      }

      // Load subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', profile?.school_id)

      setSubjects(subjectsData || [])

      // Load enrollment settings - FORCE FRESH FETCH
      const { data: settings, error: settingsError } = await supabase
        .from('enrollment_settings')
        .select('*')
        .eq('school_id', profile?.school_id)
        .single()

      console.log('RAW enrollment settings from DB:', settings, 'Error:', settingsError)

      if (settings && !settingsError) {
        // Use ACTUAL database values - explicitly check for boolean false
        const loadedSettings = {
          class_assignment_method: settings.class_assignment_method || 'auto_grade_based',
          allow_manual_override: settings.allow_manual_override === true,
          require_previous_grades: settings.require_previous_school_report === true,
          require_fee_slip: settings.require_fee_slip === true,
          require_birth_certificate: settings.require_birth_certificate === true,
          require_student_id: settings.require_student_id === true,
          require_parent_id: settings.require_parent_id === true,
          require_previous_school_report: settings.require_previous_school_report === true,
          minimum_fee_percentage: settings.minimum_fee_percentage || 0
        }
        setEnrollmentSettings(loadedSettings)
        console.log('Processed enrollment settings:', loadedSettings)
      } else {
        // Default settings if none exist
        console.log('No settings found, using defaults')
        setEnrollmentSettings({
          class_assignment_method: 'auto_grade_based',
          allow_manual_override: true,
          require_previous_grades: true,
          require_fee_slip: true,
          require_birth_certificate: true,
          require_student_id: true,
          require_parent_id: true,
          require_previous_school_report: true,
          minimum_fee_percentage: 0
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const generateUsername = (fullName: string, birthDate: string): string => {
    const surname = fullName.split(' ').pop()?.toLowerCase() || 'user'
    const year = birthDate.split('-')[0]
    return `${surname}${year}`
  }

  const normalizeIdNumber = (idNumber: string): string => {
    return idNumber.toLowerCase().replace(/[-\s\/]/g, '')
  }

  const getStudentUsername = (): string => {
    if (!formData.student.fullName || !formData.student.birthDate) return ''
    return generateUsername(formData.student.fullName, formData.student.birthDate)
  }

  const getStudentPassword = (): string => {
    if (!formData.student.idNumber) return ''
    return normalizeIdNumber(formData.student.idNumber)
  }

  const getParentUsername = (): string => {
    if (!formData.parent.fullName || !formData.parent.birthDate) return ''
    return generateUsername(formData.parent.fullName, formData.parent.birthDate)
  }

  const getParentPassword = (): string => {
    if (!formData.parent.idNumber) return ''
    return normalizeIdNumber(formData.parent.idNumber)
  }

  const calculateAveragePercentage = (): number => {
    if (formData.previousGrades.length === 0) return 0
    const validGrades = formData.previousGrades.filter(g => g.marks > 0)
    if (validGrades.length === 0) return 0
    const total = validGrades.reduce((sum, g) => sum + g.marks, 0)
    return total / validGrades.length
  }

  const calculateAverageUnit = (): number => {
    if (formData.previousGrades.length === 0) return 0
    const validGrades = formData.previousGrades.filter(g => g.unit !== undefined && g.unit > 0)
    if (validGrades.length === 0) return 0
    const total = validGrades.reduce((sum, g) => sum + (g.unit || 0), 0)
    return total / validGrades.length
  }

  // Check if all required documents are uploaded
  const areRequiredDocumentsUploaded = (): boolean => {
    if (!enrollmentSettings) return false
    
    const checks = []
    
    if (enrollmentSettings.require_birth_certificate && !birthCertificateFile) checks.push(false)
    if (enrollmentSettings.require_student_id && !studentIdFile) checks.push(false)
    if (enrollmentSettings.require_parent_id && !parentIdFile) checks.push(false)
    if (enrollmentSettings.require_previous_school_report && !previousSchoolReportFile) checks.push(false)
    // Note: fee_slip is validated separately in Step 6, not here
    
    console.log('Document validation checks:', {
      require_birth_certificate: enrollmentSettings.require_birth_certificate,
      has_birth_certificate: !!birthCertificateFile,
      require_student_id: enrollmentSettings.require_student_id,
      has_student_id: !!studentIdFile,
      require_parent_id: enrollmentSettings.require_parent_id,
      has_parent_id: !!parentIdFile,
      require_previous_school_report: enrollmentSettings.require_previous_school_report,
      has_previous_school_report: !!previousSchoolReportFile,
      checks_failed: checks,
      result: checks.every(check => check !== false)
    })
    
    return checks.every(check => check !== false)
  }

  // Check if grade level is A-Level (Lower 6 or Upper 6)
  const isALevelGrade = (gradeLevel: string): boolean => {
    return gradeLevel.toLowerCase().includes('lower 6') || gradeLevel.toLowerCase().includes('upper 6')
  }

  // Load subjects assigned to a class
  const loadClassSubjects = async (classId: string) => {
    if (!classId) {
      setClassSubjects([])
      return
    }
    
    setIsLoadingSubjects(true)
    try {
      const { data, error } = await supabase
        .from('class_subject_assignments')
        .select(`
          id,
          subject_id,
          subjects (id, name, code)
        `)
        .eq('class_id', classId)
      
      if (error) throw error
      
      const subjectsList = (data || []).map((item: any) => ({
        id: item.subject_id,
        name: item.subjects?.name || 'Unknown',
        code: item.subjects?.code || ''
      }))
      
      setClassSubjects(subjectsList)
      
      // For O-Level (non A-Level), auto-select all subjects
      const gradeLevel = formData.gradeLevel
      if (!isALevelGrade(gradeLevel)) {
        setFormData(prev => ({
          ...prev,
          selectedSubjectIds: subjectsList.map((s: any) => s.id),
          isALevel: false
        }))
      } else {
        // For A-Level, user selects manually, clear previous selections
        setFormData(prev => ({
          ...prev,
          selectedSubjectIds: [],
          isALevel: true
        }))
      }
    } catch (error) {
      console.error('Error loading class subjects:', error)
      setClassSubjects([])
    } finally {
      setIsLoadingSubjects(false)
    }
  }

  const calculateRecommendedClass = () => {
    if (!formData.gradeLevel || classes.length === 0) return

    // Filter classes for EXACT grade level match
    // e.g., "Form 1" should only match "Form 1", not "Form 10" or "Form 12"
    const gradeClasses = classes.filter(c => {
      const classGrade = c.grade_level.toLowerCase().trim()
      const selectedGrade = formData.gradeLevel.toLowerCase().trim()
      // Exact match for the grade level
      return classGrade === selectedGrade
    })

    console.log('Grade Level:', formData.gradeLevel)
    console.log('Filtered classes for this grade:', gradeClasses.map(c => `${c.grade_level} ${c.section}`))

    if (gradeClasses.length === 0) {
      console.log('No classes found for grade level:', formData.gradeLevel)
      return
    }

    let recommendedClass = null
    const method = enrollmentSettings?.class_assignment_method || 'random'
    console.log('Assignment method:', method)

    // If manual assignment, don't auto-recommend - just set useManualClass to true
    if (method === 'manual') {
      setFormData(prev => ({
        ...prev,
        useManualClass: true,
        recommendedClassId: '',
        recommendedClassName: ''
      }))
      return
    }

    if (method === 'random' || formData.entryStatus === 'new_primary') {
      // Random: pick a random class from those with available space
      const classesWithSpace = gradeClasses.filter(c => (c.student_count || 0) < (c.max_capacity || 40))
      if (classesWithSpace.length > 0) {
        const randomIndex = Math.floor(Math.random() * classesWithSpace.length)
        recommendedClass = classesWithSpace[randomIndex]
      } else {
        // All full, just pick first
        recommendedClass = gradeClasses[0]
      }
    } else if (method === 'auto_grade_based') {
      // Grade-based: rank classes by class_rank (1 = best)
      const avgPercentage = calculateAveragePercentage()
      const sortedClasses = [...gradeClasses].sort((a, b) => 
        (a.class_rank || 999) - (b.class_rank || 999)
      )

      if (avgPercentage >= 80) {
        recommendedClass = sortedClasses[0]
      } else if (avgPercentage >= 60) {
        recommendedClass = sortedClasses[Math.floor(sortedClasses.length / 3)] || sortedClasses[0]
      } else if (avgPercentage >= 40) {
        recommendedClass = sortedClasses[Math.floor(sortedClasses.length * 2 / 3)] || sortedClasses[0]
      } else {
        recommendedClass = sortedClasses[sortedClasses.length - 1]
      }
    } else {
      // Capacity-based
      recommendedClass = gradeClasses.find(c => 
        (c.student_count || 0) < (c.max_capacity || 40)
      ) || gradeClasses[0]
    }

    if (recommendedClass) {
      setFormData(prev => ({
        ...prev,
        recommendedClassId: recommendedClass.id,
        recommendedClassName: `${recommendedClass.grade_level} ${recommendedClass.section}`,
        classId: prev.useManualClass ? prev.classId : recommendedClass.id,
        className: prev.useManualClass ? prev.className : `${recommendedClass.grade_level} ${recommendedClass.section}`
      }))
    }
  }

  const initializeGradesForEntryStatus = () => {
    let subjectList: string[] = []

    if (formData.entryStatus === 'grade7_to_form1') {
      subjectList = GRADE_7_SUBJECTS
    } else if (formData.entryStatus === 'olevel_to_alevel') {
      // For Lower 6: Show O-Level subjects (entering A-Level)
      // For Upper 6: Show A-Level subjects from previous school (3-4 subjects)
      if (formData.gradeLevel === 'Upper 6') {
        // Upper 6 students need their Lower 6 / previous school A-Level combination
        subjectList = ['Subject 1', 'Subject 2', 'Subject 3'] // They will edit these
      } else {
        // Lower 6: Need O-Level results
        subjectList = OLEVEL_SUBJECTS
      }
    } else if (formData.entryStatus === 'transfer_secondary') {
      subjectList = subjects.map(s => s.name).slice(0, 8)
      if (subjectList.length === 0) {
        subjectList = ['Mathematics', 'English', 'Science', 'Geography', 'History']
      }
    } else if (formData.entryStatus === 'transfer_primary') {
      subjectList = ['Mathematics', 'English', 'Shona/Ndebele', 'Environmental Science']
    }

    const grades = subjectList.map(subject => ({
      subject,
      marks: 0,
      grade: '',
      unit: undefined as number | undefined
    }))

    setFormData(prev => ({ ...prev, previousGrades: grades }))
  }

  const updateGrade = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      previousGrades: prev.previousGrades.map((g, i) => 
        i === index ? { ...g, [field]: value } : g
      )
    }))
  }

  const deleteGrade = (index: number) => {
    setFormData(prev => ({
      ...prev,
      previousGrades: prev.previousGrades.filter((_, i) => i !== index)
    }))
  }

  const getGradeLevelOptions = () => {
    switch (formData.entryStatus) {
      case 'new_primary':
        return [{ value: 'Grade 1', label: 'Grade 1' }]
      case 'transfer_primary':
        return [
          { value: 'Grade 2', label: 'Grade 2' },
          { value: 'Grade 3', label: 'Grade 3' },
          { value: 'Grade 4', label: 'Grade 4' },
          { value: 'Grade 5', label: 'Grade 5' },
          { value: 'Grade 6', label: 'Grade 6' },
          { value: 'Grade 7', label: 'Grade 7' }
        ]
      case 'grade7_to_form1':
        return [{ value: 'Form 1', label: 'Form 1' }]
      case 'transfer_secondary':
        return [
          { value: 'Form 2', label: 'Form 2' },
          { value: 'Form 3', label: 'Form 3' },
          { value: 'Form 4', label: 'Form 4' }
        ]
      case 'olevel_to_alevel':
        return [
          { value: 'Lower 6', label: 'Lower 6' },
          { value: 'Upper 6', label: 'Upper 6' }
        ]
      default:
        return []
    }
  }

  // Get entry status options based on school type
  const getEntryStatusOptions = () => {
    const schoolType = schoolInfo?.school_type?.toLowerCase() || 'combined'
    
    if (schoolType === 'primary') {
      return [
        { value: 'new_primary', label: '🎒 New to School (Starting Grade 1)', desc: 'First time attending any school' },
        { value: 'transfer_primary', label: '📚 Transfer Student (Grade 2-7)', desc: 'Coming from another primary school' }
      ]
    } else if (schoolType === 'secondary') {
      return [
        { value: 'grade7_to_form1', label: '🎓 Grade 7 Graduate → Form 1', desc: 'Completed Grade 7, starting Form 1' },
        { value: 'transfer_secondary', label: '🏫 Transfer Student (Form 2-4)', desc: 'Coming from another secondary school' },
        { value: 'olevel_to_alevel', label: '📖 O-Level Graduate → A-Level', desc: 'Completed O-Levels, starting A-Level' }
      ]
    } else {
      // Combined school - show all options
      return [
        { value: 'new_primary', label: '🎒 New to School (Starting Grade 1)', desc: 'First time attending any school' },
        { value: 'transfer_primary', label: '📚 Transfer to Primary (Grade 2-7)', desc: 'Coming from another primary school' },
        { value: 'grade7_to_form1', label: '🎓 Grade 7 Graduate → Form 1', desc: 'Completed Grade 7, starting Form 1' },
        { value: 'transfer_secondary', label: '🏫 Transfer to Secondary (Form 2-4)', desc: 'Coming from another secondary school' },
        { value: 'olevel_to_alevel', label: '📖 O-Level Graduate → A-Level', desc: 'Completed O-Levels, starting A-Level' }
      ]
    }
  }

  // Convert percentage to grade based on curriculum
  const percentageToGrade = (percentage: number, curriculum?: string): string => {
    const curr = curriculum || formData.student.curriculum || 'zimsec'
    
    if (curr === 'cambridge' || curr === 'ib') {
      // Cambridge/IB grading: A*, A, B, C, D, E, U
      if (percentage >= 90) return 'A*'
      if (percentage >= 80) return 'A'
      if (percentage >= 70) return 'B'
      if (percentage >= 60) return 'C'
      if (percentage >= 50) return 'D'
      if (percentage >= 40) return 'E'
      return 'U'
    } else if (curr === 'south_african') {
      // South African CAPS grading: 7, 6, 5, 4, 3, 2, 1
      if (percentage >= 80) return '7'
      if (percentage >= 70) return '6'
      if (percentage >= 60) return '5'
      if (percentage >= 50) return '4'
      if (percentage >= 40) return '3'
      if (percentage >= 30) return '2'
      return '1'
    } else {
      // ZIMSEC/Local: A, B, C, D, E, F
      if (percentage >= 80) return 'A'
      if (percentage >= 70) return 'B'
      if (percentage >= 60) return 'C'
      if (percentage >= 50) return 'D'
      if (percentage >= 40) return 'E'
      return 'F'
    }
  }

  // Check if curriculum uses units (like ZIMSEC Grade 7)
  const curriculumUsesUnits = (): boolean => {
    const curr = formData.student.curriculum
    // Only ZIMSEC Grade 7 uses units
    return (curr === 'zimsec' || curr === '' || !curr) && formData.entryStatus === 'grade7_to_form1'
  }

  // Get grading scale description based on curriculum
  const getGradingScaleDescription = (): string => {
    const curr = formData.student.curriculum || 'zimsec'
    
    if (curriculumUsesUnits()) {
      return 'ZIMSEC Units: 1-9 (1=Excellent, 9=Fail)'
    }
    
    if (curr === 'cambridge' || curr === 'ib') {
      return 'Cambridge/IB: A*=90%+, A=80%+, B=70%+, C=60%+, D=50%+, E=40%+, U=Below 40%'
    } else if (curr === 'south_african') {
      return 'CAPS: 7=80%+, 6=70%+, 5=60%+, 4=50%+, 3=40%+, 2=30%+, 1=Below 30%'
    } else {
      return 'ZIMSEC/Local: A=80%+, B=70%+, C=60%+, D=50%+, E=40%+, F=Below 40%'
    }
  }

  // Calculate total ZIMSEC units and convert to percentage
  const calculateZimsecTotal = (): { totalUnits: number, percentage: number, grade: string } => {
    const validGrades = formData.previousGrades.filter(g => g.unit && g.unit > 0)
    if (validGrades.length === 0) return { totalUnits: 0, percentage: 0, grade: 'N/A' }
    
    const totalUnits = validGrades.reduce((sum, g) => sum + (g.unit || 0), 0)
    // Convert units to percentage: Lower units = better (1=best, 9=worst)
    // Average unit of 1-3 = 80-100%, 4-5 = 60-79%, 6-7 = 40-59%, 8-9 = 0-39%
    const avgUnit = totalUnits / validGrades.length
    let percentage = 0
    if (avgUnit <= 3) percentage = 100 - ((avgUnit - 1) * 10)
    else if (avgUnit <= 5) percentage = 80 - ((avgUnit - 3) * 10)
    else if (avgUnit <= 7) percentage = 60 - ((avgUnit - 5) * 10)
    else percentage = 40 - ((avgUnit - 7) * 10)
    
    return {
      totalUnits,
      percentage: Math.round(percentage),
      grade: percentageToGrade(percentage)
    }
  }

  const needsPreviousGrades = (): boolean => {
    return ['grade7_to_form1', 'transfer_secondary', 'olevel_to_alevel', 'transfer_primary'].includes(formData.entryStatus)
  }

  const handleFeeSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setFeeSlipFile(file)
  }

  const handleEnroll = async () => {
    try {
      setLoading(true)

      if (!formData.student.fullName || !formData.student.birthDate) {
        toast.error('Student name and birth date are required')
        return
      }

      if (!formData.parent.fullName || !formData.parent.idNumber || !formData.parent.birthDate) {
        toast.error('Parent name, ID and birth date are required')
        return
      }

      if (!formData.classId) {
        toast.error('Class selection is required')
        return
      }

      // Upload fee slip
      let feeSlipUrl = null
      if (feeSlipFile) {
        const timestamp = Date.now()
        const { data, error } = await supabase.storage
          .from('fee-slips')
          .upload(`${profile?.school_id}/${timestamp}-${feeSlipFile.name}`, feeSlipFile)
        
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('fee-slips').getPublicUrl(data.path)
          feeSlipUrl = urlData.publicUrl
        }
      }

      // Upload documents to student-documents bucket
      const documentUrls: {
        birth_certificate_url?: string
        student_id_url?: string
        parent_id_url?: string
        previous_school_report_url?: string
      } = {}

      const timestamp = Date.now()
      const schoolId = profile?.school_id || 'unknown'

      // Upload birth certificate
      if (birthCertificateFile) {
        const { data, error } = await supabase.storage
          .from('student-documents')
          .upload(`${schoolId}/${timestamp}-birth-cert-${birthCertificateFile.name}`, birthCertificateFile)
        
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('student-documents').getPublicUrl(data.path)
          documentUrls.birth_certificate_url = urlData.publicUrl
        } else {
          console.error('Birth certificate upload error:', error)
        }
      }

      // Upload student ID
      if (studentIdFile) {
        const { data, error } = await supabase.storage
          .from('student-documents')
          .upload(`${schoolId}/${timestamp}-student-id-${studentIdFile.name}`, studentIdFile)
        
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('student-documents').getPublicUrl(data.path)
          documentUrls.student_id_url = urlData.publicUrl
        } else {
          console.error('Student ID upload error:', error)
        }
      }

      // Upload parent ID
      if (parentIdFile) {
        const { data, error } = await supabase.storage
          .from('student-documents')
          .upload(`${schoolId}/${timestamp}-parent-id-${parentIdFile.name}`, parentIdFile)
        
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('student-documents').getPublicUrl(data.path)
          documentUrls.parent_id_url = urlData.publicUrl
        } else {
          console.error('Parent ID upload error:', error)
        }
      }

      // Upload previous school report
      if (previousSchoolReportFile) {
        const { data, error } = await supabase.storage
          .from('student-documents')
          .upload(`${schoolId}/${timestamp}-report-${previousSchoolReportFile.name}`, previousSchoolReportFile)
        
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('student-documents').getPublicUrl(data.path)
          documentUrls.previous_school_report_url = urlData.publicUrl
        } else {
          console.error('Previous report upload error:', error)
        }
      }

      const requestBody = {
        student: formData.student,
        parent: formData.parent,
        classId: formData.classId,
        className: formData.className,
        formName: formData.gradeLevel,
        previousGrades: formData.previousGrades,
        entryStatus: formData.entryStatus,
        gradeLevel: formData.gradeLevel,
        feePaid: formData.feePaid,
        feeSlipUrl,
        documentUrls, // Add document URLs to request
        schoolId: profile?.school_id,
        enrolledBy: profile?.id,
        selectedSubjectIds: formData.selectedSubjectIds, // Add selected subjects
        isALevel: isALevelGrade(formData.gradeLevel) // Flag if A-Level student
      }

      console.log('=== SENDING ENROLLMENT REQUEST ===')
      console.log('Request body:', JSON.stringify(requestBody, null, 2))
      console.log('Document URLs:', documentUrls)
      console.log('==================================')

      const response = await fetch('/api/admin/enroll-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        // Clone response to read body multiple times if needed
        const responseText = await response.text()
        let errorMessage = 'Enrollment failed'
        try {
          const errorJson = JSON.parse(responseText)
          errorMessage = errorJson.message || errorMessage
        } catch {
          console.error('API returned non-JSON response:', responseText.substring(0, 200))
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      setEnrollmentResult(result)
      toast.success('Student enrolled successfully!')

    } catch (error: any) {
      console.error('Enrollment error:', error)
      toast.error(error.message || 'Enrollment failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEnrollAnother = () => {
    setCurrentStep(1)
    setEnrollmentResult(null)
    setFormData({
      entryStatus: '',
      gradeLevel: '',
      student: {
        fullName: '', gender: '', birthDate: '', nationality: 'Zimbabwe',
        idNumber: '', birthCertificateNumber: '', address: '', medicalConditions: 'none', medicalConditionsDetails: '', previousSchool: '',
        curriculum: ''
      },
      parent: {
        fullName: '', birthDate: '', idNumber: '', phoneNumber: '', email: '',
        address: '', relationship: 'parent', occupation: '', employer: ''
      },
      previousGrades: [],
      classId: '', className: '', recommendedClassId: '', recommendedClassName: '',
      useManualClass: false, feePaid: 0,
      selectedSubjectIds: []
    })
    setFeeSlipFile(null)
  }

  if (authLoading) {
    return <DashboardLayout title="Loading..."><div className="p-8">Loading...</div></DashboardLayout>
  }

  if (!user || !profile) return null

  // Print Letter View - Professional Enrollment Confirmation Letter
  if (showPrintLetter && enrollmentResult) {
    const printLetter = () => {
      window.print()
    }

    return (
      <>
        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-letter, .print-letter * {
              visibility: visible;
            }
            .print-letter {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20mm;
              background: white !important;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
          }
        `}</style>

        {/* Back button - hidden on print */}
        <div className="no-print fixed top-4 left-4 z-50 flex gap-2">
          <Button onClick={() => setShowPrintLetter(false)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={printLetter} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" /> Print Letter
          </Button>
        </div>

        {/* Professional Letter */}
        <div className="print-letter min-h-screen bg-white p-8 max-w-4xl mx-auto">
          {/* Letterhead */}
          <div className="border-b-4 border-blue-800 pb-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {schoolInfo?.logo_url ? (
                  <img 
                    src={schoolInfo.logo_url} 
                    alt={schoolInfo.name} 
                    className="w-20 h-20 object-contain"
                  />
                ) : (
                  <div className="w-20 h-20 bg-blue-800 rounded-full flex items-center justify-center">
                    <School className="w-10 h-10 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-blue-900 uppercase tracking-wide">
                    {schoolInfo?.name || 'School Name'}
                  </h1>
                  {schoolInfo?.school_motto && (
                    <p className="text-sm italic text-gray-600">&quot;{schoolInfo.school_motto}&quot;</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {schoolInfo?.school_type} School • Code: {schoolInfo?.school_code}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-600">
                {schoolInfo?.address && <p>{schoolInfo.address}</p>}
                {schoolInfo?.phone && <p>Tel: {schoolInfo.phone}</p>}
                {schoolInfo?.contact_email && <p>Email: {schoolInfo.contact_email}</p>}
              </div>
            </div>
          </div>

          {/* Date and Reference */}
          <div className="flex justify-between mb-8 text-sm">
            <div>
              <p className="font-semibold">Reference: {enrollmentResult.enrollmentNumber}</p>
            </div>
            <div className="text-right">
              <p>{new Date().toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>

          {/* Recipient */}
          <div className="mb-8">
            <p className="font-semibold">{formData.parent.relationship === 'parent' ? 'Mr./Mrs.' : ''} {formData.parent.fullName}</p>
            <p className="text-gray-600">{formData.parent.address || formData.student.address}</p>
          </div>

          {/* Salutation */}
          <div className="mb-6">
            <p>Dear {formData.parent.relationship === 'parent' ? 'Parent' : formData.parent.relationship?.charAt(0).toUpperCase() + formData.parent.relationship?.slice(1)}/Guardian,</p>
          </div>

          {/* Subject */}
          <div className="mb-6">
            <p className="font-bold text-lg text-center border-b border-t py-3 bg-gray-50">
              RE: ENROLLMENT CONFIRMATION FOR {formData.student.fullName.toUpperCase()}
            </p>
          </div>

          {/* Body */}
          <div className="space-y-4 text-justify leading-relaxed">
            <p>
              We are delighted to inform you that your {formData.parent.relationship === 'parent' ? 'child' : 'ward'}, 
              <strong> {formData.student.fullName}</strong>, has been successfully enrolled at{' '}
              <strong>{schoolInfo?.name}</strong> for the {new Date().getFullYear()} academic year.
            </p>

            <p>
              Please find below the enrollment details and login credentials for our School Management Portal.
            </p>

            {/* Enrollment Details Box */}
            <div className="border-2 border-gray-300 rounded-lg p-4 my-6 bg-gray-50">
              <h3 className="font-bold text-blue-900 mb-4 border-b pb-2">📋 ENROLLMENT DETAILS</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Student Name:</span>
                  <span className="font-semibold">{formData.student.fullName}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Admission Number:</span>
                  <span className="font-semibold font-mono text-blue-700">{enrollmentResult.admissionNumber}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Class Assigned:</span>
                  <span className="font-semibold">{enrollmentResult.className}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Class Teacher:</span>
                  <span className="font-semibold">{enrollmentResult.classTeacher || 'TBA'}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Enrollment Date:</span>
                  <span className="font-semibold">{currentDate}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Fee Payment:</span>
                  <span className="font-semibold text-green-700">USD {formData.feePaid} (Received)</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Entry Status:</span>
                  <span className="font-semibold">{formData.gradeLevel}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Gender:</span>
                  <span className="font-semibold">{formData.student.gender}</span>
                </div>
              </div>
            </div>

            {/* Login Credentials Box */}
            <div className="border-2 border-blue-400 rounded-lg p-4 my-6 bg-blue-50">
              <h3 className="font-bold text-blue-900 mb-4 border-b border-blue-300 pb-2">🔐 SCHOOL PORTAL LOGIN CREDENTIALS</h3>
              <p className="text-sm text-gray-700 mb-4">
                Please use the following credentials to access our online School Management Portal.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" /> Student Account
                  </p>
                  <div className="space-y-2 font-mono text-sm">
                    <p>Username: <span className="font-bold bg-yellow-100 px-2 py-1 rounded">{enrollmentResult.studentUsername}</span></p>
                    <p>Password: <span className="font-bold bg-yellow-100 px-2 py-1 rounded">{enrollmentResult.studentPassword}</span></p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <UserPlus className="w-5 h-5" /> Parent/Guardian Account
                  </p>
                  <div className="space-y-2 font-mono text-sm">
                    <p>Username: <span className="font-bold bg-yellow-100 px-2 py-1 rounded">{enrollmentResult.parentUsername}</span></p>
                    <p>Password: <span className="font-bold bg-yellow-100 px-2 py-1 rounded">{enrollmentResult.parentPassword}</span></p>
                  </div>
                </div>
              </div>
            </div>

            <p>
              Through our portal, you will be able to:
            </p>
            <ul className="list-disc ml-8 space-y-1 text-sm">
              <li>View your child&apos;s academic progress and grades</li>
              <li>View your child&apos;s E-Report Card at the end of term</li>
              <li>Access class timetables and school calendar</li>
              <li>Communicate with teachers and school administration</li>
              <li>View and pay school fees online</li>
              <li>Receive important announcements and notices</li>
            </ul>

            <p className="mt-6">
              We look forward to a fruitful partnership with you in nurturing and educating your child. 
              Should you have any questions or require further assistance, please do not hesitate to 
              contact the school administration.
            </p>

            <p className="mt-6">
              Welcome to the <strong>{schoolInfo?.name}</strong> family!
            </p>
          </div>

          {/* Signature Section */}
          <div className="mt-12">
            <p>Yours faithfully,</p>
            
            {/* Three columns: Enrollment Officer, Stamp, Principal */}
            <div className="grid grid-cols-3 gap-6 mt-8 items-end">
              {/* Enrollment Officer Signature */}
              <div className="text-center">
                {schoolInfo?.enrollment_officer_signature_url ? (
                  <img 
                    src={schoolInfo.enrollment_officer_signature_url} 
                    alt="Enrollment Officer Signature"
                    className="h-16 mx-auto object-contain mb-2"
                  />
                ) : (
                  <div className="h-16 border-b-2 border-gray-300 mb-2"></div>
                )}
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-semibold text-sm">Enrollment Officer</p>
                  <p className="text-xs text-gray-600">{profile?.full_name || 'Enrollment Officer'}</p>
                </div>
              </div>
              
              {/* School Stamp */}
              <div className="text-center flex items-center justify-center">
                {schoolInfo?.school_stamp_url ? (
                  <div className="transform -rotate-12 opacity-90">
                    <img 
                      src={schoolInfo.school_stamp_url} 
                      alt="School Stamp"
                      className="w-28 h-28 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 border-4 border-gray-800 rounded-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-800">OFFICIAL</p>
                      <p className="text-xs font-bold text-gray-800">STAMP</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* School Head/Principal Signature */}
              <div className="text-center">
                {schoolInfo?.principal_signature_url ? (
                  <img 
                    src={schoolInfo.principal_signature_url} 
                    alt="Principal Signature"
                    className="h-16 mx-auto object-contain mb-2"
                  />
                ) : (
                  <div className="h-16 border-b-2 border-gray-300 mb-2"></div>
                )}
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-semibold text-sm">School Head / Principal</p>
                  <p className="text-xs text-gray-600">{schoolInfo?.principal_name || 'School Principal'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-4 border-t-2 border-gray-300 text-center text-xs text-gray-500">
            <p>This is an official document from {schoolInfo?.name}.</p>
            
            <p className="mt-3 text-gray-400">
              Powered by <strong>Robokorda Africa</strong> | {schoolInfo?.name} © {new Date().getFullYear()} All Rights Reserved
            </p>
          </div>

          
        </div>
      </>
    )
  }

  // Success Screen
  if (enrollmentResult) {
    return (
      <DashboardLayout title="Enrollment Successful">
        <div className="max-w-4xl mx-auto">
          <Card className="border-green-300 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
                <div>
                  <CardTitle className="text-green-800 text-2xl">Enrollment Complete!</CardTitle>
                  <CardDescription className="text-green-700">
                    Enrollment #: {enrollmentResult.enrollmentNumber}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-bold mb-3">📋 Enrollment Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-600">Student:</span> <strong>{formData.student.fullName}</strong></div>
                  <div><span className="text-gray-600">Admission No:</span> <strong className="font-mono text-blue-700">{enrollmentResult.admissionNumber}</strong></div>
                  <div><span className="text-gray-600">Class:</span> <strong>{enrollmentResult.className}</strong></div>
                  <div><span className="text-gray-600">Class Teacher:</span> <strong>{enrollmentResult.classTeacher}</strong></div>
                  <div><span className="text-gray-600">Parent:</span> <strong>{formData.parent.fullName}</strong></div>
                  <div><span className="text-gray-600">Date:</span> <strong>{currentDate}</strong></div>
                  <div><span className="text-gray-600">Fee Paid:</span> <strong>USD {formData.feePaid}</strong></div>
                  <div><span className="text-gray-600">Gender:</span> <strong>{formData.student.gender}</strong></div>
                </div>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-lg">
                <h3 className="font-bold text-yellow-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Login Credentials (Give to Parent!)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs uppercase font-bold text-gray-600 mb-2">👨‍🎓 STUDENT</p>
                    <div className="font-mono text-sm space-y-1">
                      <p>Username: <span className="text-blue-600 font-bold">{enrollmentResult.studentUsername}</span></p>
                      <p>Password: <span className="text-red-600 font-bold">{enrollmentResult.studentPassword}</span></p>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs uppercase font-bold text-gray-600 mb-2">👨‍👩‍👧 PARENT</p>
                    <div className="font-mono text-sm space-y-1">
                      <p>Username: <span className="text-blue-600 font-bold">{enrollmentResult.parentUsername}</span></p>
                      <p>Password: <span className="text-red-600 font-bold">{enrollmentResult.parentPassword}</span></p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setShowPrintLetter(true)} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Printer className="w-4 h-4 mr-2" /> Print Enrollment Letter
                </Button>
                <Button onClick={handleEnrollAnother} className="flex-1 bg-green-600 hover:bg-green-700">
                  <UserPlus className="w-4 h-4 mr-2" /> Enroll Another
                </Button>
                <Link href="/dashboard/students/enrolled" className="flex-1">
                  <Button variant="outline" className="w-full">View All Students</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // Main Form
  return (
    <DashboardLayout title="Student Enrollment">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/students/enrolled">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <UserPlus className="w-8 h-8 text-green-600" />
                New Student Enrollment
              </h1>
              <p className="text-gray-600">{schoolInfo?.name} • {currentDate}</p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">Step {currentStep}/{totalSteps}</Badge>
          </div>

          <div className="flex gap-2 mt-4">
            {[1,2,3,4,5].map(step => (
              <div key={step} className={`flex-1 h-2 rounded-full ${step <= currentStep ? 'bg-green-600' : 'bg-gray-200'}`} />
            ))}
          </div>

          {enrollmentSettings && (
            <div className="mt-3 text-xs text-gray-500 flex items-center gap-2 flex-wrap">
              <Settings className="w-3 h-3" />
              <span>Settings:</span>
              <Badge variant="outline" className="text-xs">
                {enrollmentSettings.class_assignment_method === 'auto_grade_based' && '📊 Grade-Based'}
                {enrollmentSettings.class_assignment_method === 'random' && '🎲 Random'}
                {enrollmentSettings.class_assignment_method === 'manual' && '✋ Manual'}
                {enrollmentSettings.class_assignment_method === 'capacity_based' && '📦 Capacity'}
              </Badge>
              <Badge variant={enrollmentSettings.allow_manual_override ? "default" : "destructive"} className="text-xs">
                {enrollmentSettings.allow_manual_override ? '✅ Override ON' : '🚫 Override OFF'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={loadData} className="text-xs h-6 px-2">
                🔄 Refresh
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && '📝 Entry Status & Student Information'}
              {currentStep === 2 && '👨‍👩‍👧 Parent/Guardian Information'}
              {currentStep === 3 && '📚 Previous Grades & Academic History'}
              {currentStep === 4 && '🎓 Class Assignment'}
              {currentStep === 5 && '📄 Required Documents'}
              {currentStep === 6 && '💰 Fee Payment & Submission'}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <Label className="text-base font-semibold">Entry Status <span className="text-red-500">*</span></Label>
                  <p className="text-sm text-gray-600 mb-3">What stage is this student entering? (Filtered by school type: {schoolInfo?.school_type || 'Combined'})</p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {getEntryStatusOptions().map(opt => (
                      <div 
                        key={opt.value}
                        onClick={() => setFormData(prev => ({ ...prev, entryStatus: opt.value as EntryStatus, gradeLevel: '', previousGrades: [] }))}
                        className={`p-3 border rounded-lg cursor-pointer ${ formData.entryStatus === opt.value ? 'border-blue-500 bg-blue-100' : 'border-gray-200 hover:border-blue-300'}`}
                      >
                        <span className="font-medium">{opt.label}</span>
                        <p className="text-xs text-gray-600 mt-1">{opt.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {formData.entryStatus && (
                  <div className="space-y-2">
                    <Label>Grade/Form Level <span className="text-red-500">*</span></Label>
                    <Select 
                      value={formData.gradeLevel}
                      onValueChange={(v) => {
                        setFormData(prev => ({ ...prev, gradeLevel: v }))
                        if (needsPreviousGrades()) setTimeout(initializeGradesForEntryStatus, 100)
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select grade/form level" /></SelectTrigger>
                      <SelectContent>
                        {getGradeLevelOptions().map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.gradeLevel && (
                  <>
                    <div className="border-t pt-6"><h3 className="font-semibold mb-4">Student Personal Details</h3></div>

                    <div className="space-y-2">
                      <Label>Full Name <span className="text-red-500">*</span></Label>
                      <Input placeholder="e.g., Wilson Sedze" value={formData.student.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, student: { ...prev.student, fullName: e.target.value } }))} className="text-lg" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Gender <span className="text-red-500">*</span></Label>
                        <Select value={formData.student.gender} onValueChange={(v) => setFormData(prev => ({ ...prev, student: { ...prev.student, gender: v } }))}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Birth <span className="text-red-500">*</span></Label>
                        <Input 
                          type="date" 
                          value={formData.student.birthDate}
                          className={validationErrors.studentDob ? 'border-red-500' : ''}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, student: { ...prev.student, birthDate: e.target.value } }))
                            clearValidationError('studentDob')
                            // Live validation
                            const result = validateDob(e.target.value, 'student')
                            if (!result.valid) {
                              setValidationErrors(prev => ({ ...prev, studentDob: result.error }))
                            }
                          }} 
                        />
                        {validationErrors.studentDob && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {validationErrors.studentDob}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>ID/Birth Certificate <span className="text-red-500">*</span></Label>
                        <Input 
                          placeholder="e.g., 73-2987414-R-42" 
                          value={formData.student.idNumber}
                          className={validationErrors.studentId ? 'border-red-500' : ''}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, student: { ...prev.student, idNumber: e.target.value } }))
                            clearValidationError('studentId')
                          }}
                          onBlur={(e) => {
                            // Validate on blur
                            const result = validateZimbabweId(e.target.value)
                            if (!result.valid) {
                              setValidationErrors(prev => ({ ...prev, studentId: result.error }))
                            }
                          }}
                        />
                        {validationErrors.studentId && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {validationErrors.studentId}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">Format: 00-0000000-X-00 (ID) or birth certificate number</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Nationality</Label>
                        <Select value={formData.student.nationality} onValueChange={(v) => setFormData(prev => ({ ...prev, student: { ...prev.student, nationality: v } }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {AFRICAN_COUNTRIES.map(country => (
                              <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Home Address</Label>
                      <Textarea placeholder="e.g., 123 Main Street, Harare" value={formData.student.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, student: { ...prev.student, address: e.target.value } }))} rows={2} />
                    </div>

                    <div className="space-y-2">
                      <Label>Medical Conditions</Label>
                      <Select 
                        value={formData.student.medicalConditions} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, student: { ...prev.student, medicalConditions: v } }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MEDICAL_CONDITIONS.map(condition => (
                            <SelectItem key={condition.value} value={condition.value}>
                              {condition.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(formData.student.medicalConditions !== 'none' && formData.student.medicalConditions !== '') && (
                        <Textarea 
                          placeholder="Please provide details about the medical condition, medications, allergies, or special care instructions..."
                          value={formData.student.medicalConditionsDetails}
                          onChange={(e) => setFormData(prev => ({ ...prev, student: { ...prev.student, medicalConditionsDetails: e.target.value } }))}
                          rows={3}
                          className="mt-2"
                        />
                      )}
                      <p className="text-xs text-gray-500">Select any known medical conditions for proper student care</p>
                    </div>

                    {formData.entryStatus !== 'new_primary' && (
                      <>
                        <div className="space-y-2">
                          <Label>Previous School</Label>
                          <Input placeholder="e.g., XYZ Primary School" value={formData.student.previousSchool}
                            onChange={(e) => setFormData(prev => ({ ...prev, student: { ...prev.student, previousSchool: e.target.value } }))} />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Curriculum <span className="text-red-500">*</span></Label>
                          <Select value={formData.student.curriculum} onValueChange={(v) => setFormData(prev => ({ ...prev, student: { ...prev.student, curriculum: v } }))}>
                            <SelectTrigger><SelectValue placeholder="Select curriculum (required)" /></SelectTrigger>
                            <SelectContent>
                              {CURRICULA.map(curr => (
                                <SelectItem key={curr.value} value={curr.value}>{curr.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-600">Required to match grading system with previous school</p>
                        </div>
                      </>
                    )}

                    {formData.student.fullName && formData.student.birthDate && formData.student.idNumber && (
                      <div className="bg-gray-50 p-3 rounded-lg border text-sm">
                        <p className="font-semibold mb-2">📱 Generated Student Credentials:</p>
                        <p>Username: <span className="font-mono text-blue-600">{getStudentUsername()}</span></p>
                        <p>Password: <span className="font-mono text-red-600">{getStudentPassword()}</span></p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-base">Parent/Guardian Full Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g., James Sedze" value={formData.parent.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, parent: { ...prev.parent, fullName: e.target.value } }))} className="text-lg" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Birth <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date" 
                      value={formData.parent.birthDate}
                      className={validationErrors.parentDob ? 'border-red-500' : ''}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, parent: { ...prev.parent, birthDate: e.target.value } }))
                        clearValidationError('parentDob')
                        // Live validation
                        const result = validateDob(e.target.value, 'parent')
                        if (!result.valid) {
                          setValidationErrors(prev => ({ ...prev, parentDob: result.error }))
                        }
                      }} 
                    />
                    {validationErrors.parentDob && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {validationErrors.parentDob}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>ID Number <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder="e.g., 73-0876606-E-12" 
                      value={formData.parent.idNumber}
                      className={validationErrors.parentId ? 'border-red-500' : ''}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, parent: { ...prev.parent, idNumber: e.target.value } }))
                        clearValidationError('parentId')
                      }}
                      onBlur={(e) => {
                        const result = validateZimbabweId(e.target.value)
                        if (!result.valid) {
                          setValidationErrors(prev => ({ ...prev, parentId: result.error }))
                        }
                      }}
                    />
                    {validationErrors.parentId && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {validationErrors.parentId}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">Format: 00-0000000-X-00</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder="e.g., +263 77 123 4567" 
                      value={formData.parent.phoneNumber}
                      className={validationErrors.parentPhone ? 'border-red-500' : ''}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, parent: { ...prev.parent, phoneNumber: e.target.value } }))
                        clearValidationError('parentPhone')
                      }}
                      onBlur={(e) => {
                        const result = validatePhone(e.target.value)
                        if (!result.valid) {
                          setValidationErrors(prev => ({ ...prev, parentPhone: result.error }))
                        }
                      }}
                    />
                    {validationErrors.parentPhone && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {validationErrors.parentPhone}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">Format: +263 7X XXX XXXX</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address <span className="text-red-500">*</span></Label>
                    <Input 
                      type="email" 
                      placeholder="e.g., james@email.com" 
                      value={formData.parent.email}
                      className={validationErrors.parentEmail ? 'border-red-500' : ''}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, parent: { ...prev.parent, email: e.target.value } }))
                        clearValidationError('parentEmail')
                      }}
                      onBlur={(e) => {
                        const result = validateEmail(e.target.value)
                        if (!result.valid) {
                          setValidationErrors(prev => ({ ...prev, parentEmail: result.error }))
                        }
                      }}
                    />
                    {validationErrors.parentEmail && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {validationErrors.parentEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Relationship <span className="text-red-500">*</span></Label>
                    <Select value={formData.parent.relationship} onValueChange={(v) => setFormData(prev => ({ ...prev, parent: { ...prev.parent, relationship: v } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="uncle">Uncle</SelectItem>
                        <SelectItem value="aunt">Aunt</SelectItem>
                        <SelectItem value="grandparent">Grandparent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Occupation</Label>
                    <Select value={formData.parent.occupation} onValueChange={(v) => setFormData(prev => ({ ...prev, parent: { ...prev.parent, occupation: v } }))}>
                      <SelectTrigger><SelectValue placeholder="Select occupation" /></SelectTrigger>
                      <SelectContent>
                        {AFRICAN_OCCUPATIONS.map(job => (
                          <SelectItem key={job} value={job}>{job}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea placeholder="e.g., 456 Oak Avenue, Harare" value={formData.parent.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, parent: { ...prev.parent, address: e.target.value } }))} rows={2} />
                </div>

                {formData.parent.fullName && formData.parent.birthDate && formData.parent.idNumber && (
                  <div className="bg-gray-50 p-3 rounded-lg border text-sm">
                    <p className="font-semibold mb-2">📱 Generated Parent Credentials:</p>
                    <p>Username: <span className="font-mono text-blue-600">{getParentUsername()}</span></p>
                    <p>Password: <span className="font-mono text-red-600">{getParentPassword()}</span></p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {!needsPreviousGrades() ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <GraduationCap className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                    <h3 className="font-semibold text-blue-900 mb-2">No Previous Grades Required</h3>
                    <p className="text-sm text-blue-800">
                      {formData.entryStatus === 'new_primary' 
                        ? 'New Grade 1 students do not require previous grades. Class will be assigned based on capacity.'
                        : 'Previous grades are not required for this entry type.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">
                        {formData.entryStatus === 'grade7_to_form1' && `📝 Grade 7 Results (${formData.student.curriculum === 'ZIMSEC' ? 'ZIMSEC Units' : formData.student.curriculum + ' Grades'})`}
                        {formData.entryStatus === 'olevel_to_alevel' && formData.gradeLevel === 'Lower 6' && '📝 O-Level Results (For Lower 6 Entry)'}
                        {formData.entryStatus === 'olevel_to_alevel' && formData.gradeLevel === 'Upper 6' && '📝 Previous A-Level Combination (Lower 6 Results)'}
                        {formData.entryStatus === 'transfer_secondary' && '📝 Previous School Results'}
                        {formData.entryStatus === 'transfer_primary' && '📝 Previous School Results'}
                      </h3>
                      <p className="text-sm text-blue-800">
                        {formData.entryStatus === 'grade7_to_form1' && formData.student.curriculum === 'ZIMSEC'
                          ? 'Enter ZIMSEC units (1-9, where 1=best, 9=worst). Total units and grade will be calculated automatically.'
                          : formData.gradeLevel === 'Upper 6'
                            ? 'Enter the 3-4 A-Level subjects from previous school with their percentages. You can add/remove subjects.'
                            : `Enter percentage marks. Grades will be calculated automatically based on ${formData.student.curriculum || 'ZIMSEC'} grading scale.`}
                      </p>
                      {formData.student.curriculum && formData.student.curriculum !== 'ZIMSEC' && (
                        <p className="text-xs text-blue-700 mt-2">
                          {formData.student.curriculum === 'Cambridge' && 'Cambridge: A* (90%+), A (80%+), B (70%+), C (60%+), D (50%+), E (40%+), F (30%+), G (20%+), U (below 20%)'}
                          {formData.student.curriculum === 'IB' && 'IB: 7 (90%+), 6 (80%+), 5 (70%+), 4 (60%+), 3 (50%+), 2 (40%+), 1 (below 40%)'}
                          {formData.student.curriculum === 'South African' && 'CAPS: 7 (80%+), 6 (70%+), 5 (60%+), 4 (50%+), 3 (40%+), 2 (30%+), 1 (below 30%)'}
                          {formData.student.curriculum === 'Local National' && 'Local: A (80%+), B (70%+), C (60%+), D (50%+), E (40%+), F (below 40%)'}
                        </p>
                      )}
                    </div>

                    {formData.entryStatus === 'grade7_to_form1' && formData.student.curriculum === 'ZIMSEC' && formData.previousGrades.some(g => g.unit && g.unit > 0) && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="font-semibold text-green-900">
                          Total Units: {calculateZimsecTotal().totalUnits} | 
                          Estimated Percentage: {calculateZimsecTotal().percentage}% | 
                          Grade: {calculateZimsecTotal().grade}
                        </p>
                        <p className="text-xs text-green-800 mt-1">Based on average unit performance</p>
                      </div>
                    )}

                    {(formData.entryStatus !== 'grade7_to_form1' || formData.student.curriculum !== 'ZIMSEC') && formData.previousGrades.some(g => g.marks > 0) && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="font-semibold text-green-900">
                          Average: {calculateAveragePercentage().toFixed(1)}% | 
                          Grade: {percentageToGrade(calculateAveragePercentage(), formData.student.curriculum)}
                        </p>
                        <p className="text-xs text-green-800 mt-1">{formData.student.curriculum || 'ZIMSEC'} grading scale</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {formData.previousGrades.map((grade, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded border">
                          <div className="col-span-4">
                            <Label className="text-xs">Subject</Label>
                            <Input value={grade.subject} onChange={(e) => updateGrade(idx, 'subject', e.target.value)} placeholder="Subject" />
                          </div>
                          <div className="col-span-1 flex items-end">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deleteGrade(idx)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-5"
                              title="Remove subject"
                            >
                              ✖
                            </Button>
                          </div>
                          
                          {formData.entryStatus === 'grade7_to_form1' && formData.student.curriculum === 'ZIMSEC' ? (
                            // ZIMSEC: Units only (1-9)
                            <>
                              <div className="col-span-3">
                                <Label className="text-xs">Unit (1-9)</Label>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  max="9" 
                                  value={grade.unit || ''} 
                                  onChange={(e) => {
                                    const unit = parseInt(e.target.value) || 0
                                    if (unit >= 1 && unit <= 9) {
                                      updateGrade(idx, 'unit', unit)
                                    }
                                  }} 
                                  placeholder="1-9" 
                                  className="text-center font-bold"
                                />
                              </div>
                              <div className="col-span-4 text-center text-xs text-gray-600">
                                <p className="mt-3">1-3=Excellent, 4-5=Good, 6-7=Average, 8-9=Poor</p>
                              </div>
                            </>
                          ) : (
                            // Percentage: Auto-generate grade based on curriculum
                            <>
                              <div className="col-span-3">
                                <Label className="text-xs">Percentage (%)</Label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="100" 
                                  value={grade.marks || ''} 
                                  onChange={(e) => {
                                    const marks = parseInt(e.target.value) || 0
                                    updateGrade(idx, 'marks', marks)
                                    updateGrade(idx, 'grade', percentageToGrade(marks, formData.student.curriculum))
                                  }} 
                                  placeholder="%" 
                                />
                              </div>
                              <div className="col-span-3">
                                <Label className="text-xs">Grade ({formData.student.curriculum || 'Auto'})</Label>
                                <Input 
                                  value={grade.grade} 
                                  readOnly
                                  className="bg-gray-100 text-center font-bold"
                                  placeholder={formData.student.curriculum === 'IB' ? '1-7' : formData.student.curriculum === 'South African' ? '1-7' : 'A-F'}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button variant="outline" onClick={() => setFormData(prev => ({ ...prev, previousGrades: [...prev.previousGrades, { subject: '', marks: 0, grade: '' }] }))}>
                      + Add Subject
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* STEP 4 */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {/* Show recommended class only if there is one (not manual mode) */}
                {formData.recommendedClassId && (
                  <div className={`p-4 rounded-lg border-2 ${!formData.useManualClass ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          Recommended Class: {formData.recommendedClassName}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {enrollmentSettings?.class_assignment_method === 'auto_grade_based' 
                            ? `Based on average grade of ${calculateAveragePercentage().toFixed(1)}%`
                            : enrollmentSettings?.class_assignment_method === 'random'
                              ? 'Randomly assigned from available classes'
                              : enrollmentSettings?.class_assignment_method === 'capacity_based'
                                ? 'Based on class capacity (filling evenly)'
                                : 'Manual assignment'}
                        </p>
                      </div>
                      {!formData.useManualClass && <Badge className="bg-green-600">Selected</Badge>}
                    </div>
                  </div>
                )}

                {/* Show "Manual Mode" message when assignment method is manual */}
                {enrollmentSettings?.class_assignment_method === 'manual' && (
                  <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-50">
                    <div className="flex items-center gap-2">
                      <School className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-lg">Manual Class Assignment</h3>
                        <p className="text-sm text-gray-600">Please select a class from the list below</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show manual override checkbox if allowed (and not already in manual mode) */}
                {enrollmentSettings?.allow_manual_override && enrollmentSettings?.class_assignment_method !== 'manual' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="manual-override" checked={formData.useManualClass}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          useManualClass: e.target.checked,
                          classId: e.target.checked ? '' : prev.recommendedClassId,
                          className: e.target.checked ? '' : prev.recommendedClassName
                        }))}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="manual-override" className="cursor-pointer">Override: Select a different class manually</Label>
                    </div>
                  </div>
                )}

                {/* Show class selector when using manual class (either from override or manual mode) */}
                {(formData.useManualClass || enrollmentSettings?.class_assignment_method === 'manual') && (
                  <div className="space-y-2">
                    <Label>Select Class {enrollmentSettings?.class_assignment_method === 'manual' ? '' : '(Manual Override)'}</Label>
                    <Select value={formData.classId} onValueChange={(v) => {
                      const cls = classes.find(c => c.id === v)
                      setFormData(prev => ({ ...prev, classId: v, className: cls ? `${cls.grade_level} ${cls.section}` : '' }))
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classes.filter(c => {
                          // Exact match for grade level
                          const classGrade = c.grade_level.toLowerCase().trim()
                          const selectedGrade = formData.gradeLevel.toLowerCase().trim()
                          return classGrade === selectedGrade
                        }).map(cls => {
                          const isFull = (cls.student_count || 0) >= (cls.max_capacity || 40)
                          return (
                            <SelectItem key={cls.id} value={cls.id} disabled={isFull}>
                              {cls.grade_level} {cls.section} ({cls.student_count || 0}/{cls.max_capacity || 40}){isFull && ' - FULL'}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.classId && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    {(() => {
                      const cls = classes.find(c => c.id === formData.classId)
                      if (!cls) return null
                      const pct = ((cls.student_count || 0) / (cls.max_capacity || 40)) * 100
                      return (
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="font-semibold">{cls.grade_level} {cls.section}</span>
                            <span>{cls.student_count || 0} / {cls.max_capacity || 40} students</span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-3">
                            <div className={`h-3 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          {cls.class_teacher?.full_name && <p className="text-sm text-gray-600 mt-2">Class Teacher: {cls.class_teacher.full_name}</p>}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Subjects Section */}
                {formData.classId && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">📚 Class Subjects</h3>
                      {isLoadingSubjects && <span className="text-sm text-gray-500">Loading...</span>}
                    </div>
                    
                    {!isLoadingSubjects && classSubjects.length === 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <p className="text-yellow-800">No subjects have been assigned to this class yet. Please contact the school admin.</p>
                      </div>
                    )}
                    
                    {!isLoadingSubjects && classSubjects.length > 0 && (
                      <>
                        {/* A-Level: Manual subject selection */}
                        {isALevelGrade(formData.gradeLevel) ? (
                          <div className="space-y-3">
                            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                              <p className="text-purple-800 text-sm">
                                <strong>A-Level Subject Selection:</strong> Please select at least 3 subjects you will be studying.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {classSubjects.map((subject: any) => (
                                <label 
                                  key={subject.id} 
                                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    formData.selectedSubjectIds.includes(subject.id) 
                                      ? 'bg-purple-100 border-purple-500' 
                                      : 'bg-white border-gray-200 hover:border-purple-300'
                                  }`}
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={formData.selectedSubjectIds.includes(subject.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData(prev => ({
                                          ...prev,
                                          selectedSubjectIds: [...prev.selectedSubjectIds, subject.id]
                                        }))
                                      } else {
                                        setFormData(prev => ({
                                          ...prev,
                                          selectedSubjectIds: prev.selectedSubjectIds.filter(id => id !== subject.id)
                                        }))
                                      }
                                    }}
                                    className="w-4 h-4"
                                  />
                                  <span className="font-medium">{subject.name}</span>
                                  {subject.code && <span className="text-xs text-gray-500">({subject.code})</span>}
                                </label>
                              ))}
                            </div>
                            <p className="text-sm text-gray-600">
                              Selected: <strong>{formData.selectedSubjectIds.length}</strong> subject(s)
                              {formData.selectedSubjectIds.length < 3 && (
                                <span className="text-red-500 ml-2">⚠️ Minimum 3 subjects required</span>
                              )}
                            </p>
                          </div>
                        ) : (
                          /* O-Level: Auto-assigned subjects (display only) */
                          <div className="space-y-3">
                            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                              <p className="text-green-800 text-sm">
                                <strong>Auto-assigned Subjects:</strong> All class subjects will be assigned to this student.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {classSubjects.map((subject: any) => (
                                <div 
                                  key={subject.id} 
                                  className="flex items-center gap-2 p-3 rounded-lg border bg-green-50 border-green-300"
                                >
                                  <span className="text-green-600">✓</span>
                                  <span className="font-medium">{subject.name}</span>
                                  {subject.code && <span className="text-xs text-gray-500">({subject.code})</span>}
                                </div>
                              ))}
                            </div>
                            <p className="text-sm text-gray-600">
                              Total: <strong>{classSubjects.length}</strong> subject(s) will be assigned
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: Required Documents */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">📄 Document Submission</h3>
                  <p className="text-sm text-blue-800">
                    Please upload all required documents as configured by your school admin. 
                    All documents marked with <span className="text-red-500 font-bold">*</span> are mandatory.
                  </p>
                </div>

                {/* Check if ANY documents are required */}
                {!enrollmentSettings?.require_birth_certificate && 
                 !enrollmentSettings?.require_student_id && 
                 !enrollmentSettings?.require_parent_id && 
                 !enrollmentSettings?.require_previous_school_report ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-green-900 mb-2">No Documents Required</h3>
                    <p className="text-sm text-green-700">
                      Your school admin has not configured any mandatory document uploads for enrollment.
                      You may proceed to the next step.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Birth Certificate */}
                    {enrollmentSettings?.require_birth_certificate && (
                  <div className={`border-2 border-dashed rounded-lg p-6 ${
                    birthCertificateFile ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'
                  }`}>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf" 
                      onChange={(e) => setBirthCertificateFile(e.target.files?.[0] || null)} 
                      className="hidden" 
                      id="birth-cert" 
                    />
                    <label htmlFor="birth-cert" className="cursor-pointer block text-center">
                      {birthCertificateFile ? (
                        <div>
                          <FileText className="w-10 h-10 text-green-600 mx-auto mb-2" />
                          <p className="font-semibold text-green-700">✅ {birthCertificateFile.name}</p>
                          <p className="text-sm text-green-600">Click to change file</p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-10 h-10 text-red-500 mx-auto mb-2" />
                          <p className="font-semibold text-red-700">
                            Birth Certificate <span className="text-red-500">*</span>
                          </p>
                          <p className="text-sm text-red-600">Click to upload (Image or PDF)</p>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                {/* Student ID Document */}
                {enrollmentSettings?.require_student_id && (
                  <div className={`border-2 border-dashed rounded-lg p-6 ${
                    studentIdFile ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'
                  }`}>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf" 
                      onChange={(e) => setStudentIdFile(e.target.files?.[0] || null)} 
                      className="hidden" 
                      id="student-id" 
                    />
                    <label htmlFor="student-id" className="cursor-pointer block text-center">
                      {studentIdFile ? (
                        <div>
                          <FileText className="w-10 h-10 text-green-600 mx-auto mb-2" />
                          <p className="font-semibold text-green-700">✅ {studentIdFile.name}</p>
                          <p className="text-sm text-green-600">Click to change file</p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-10 h-10 text-red-500 mx-auto mb-2" />
                          <p className="font-semibold text-red-700">
                            Student ID Document <span className="text-red-500">*</span>
                          </p>
                          <p className="text-sm text-red-600">Click to upload (Image or PDF)</p>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                {/* Parent ID Document */}
                {enrollmentSettings?.require_parent_id && (
                  <div className={`border-2 border-dashed rounded-lg p-6 ${
                    parentIdFile ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'
                  }`}>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf" 
                      onChange={(e) => setParentIdFile(e.target.files?.[0] || null)} 
                      className="hidden" 
                      id="parent-id" 
                    />
                    <label htmlFor="parent-id" className="cursor-pointer block text-center">
                      {parentIdFile ? (
                        <div>
                          <FileText className="w-10 h-10 text-green-600 mx-auto mb-2" />
                          <p className="font-semibold text-green-700">✅ {parentIdFile.name}</p>
                          <p className="text-sm text-green-600">Click to change file</p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-10 h-10 text-red-500 mx-auto mb-2" />
                          <p className="font-semibold text-red-700">
                            Parent/Guardian ID <span className="text-red-500">*</span>
                          </p>
                          <p className="text-sm text-red-600">Click to upload (Image or PDF)</p>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                {/* Previous School Report */}
                {enrollmentSettings?.require_previous_school_report && (
                  <div className={`border-2 border-dashed rounded-lg p-6 ${
                    previousSchoolReportFile ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'
                  }`}>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf" 
                      onChange={(e) => setPreviousSchoolReportFile(e.target.files?.[0] || null)} 
                      className="hidden" 
                      id="prev-report" 
                    />
                    <label htmlFor="prev-report" className="cursor-pointer block text-center">
                      {previousSchoolReportFile ? (
                        <div>
                          <FileText className="w-10 h-10 text-green-600 mx-auto mb-2" />
                          <p className="font-semibold text-green-700">✅ {previousSchoolReportFile.name}</p>
                          <p className="text-sm text-green-600">Click to change file</p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-10 h-10 text-red-500 mx-auto mb-2" />
                          <p className="font-semibold text-red-700">
                            Previous School Report <span className="text-red-500">*</span>
                          </p>
                          <p className="text-sm text-red-600">Click to upload (Image or PDF)</p>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                {/* Validation message */}
                {!areRequiredDocumentsUploaded() && (
                  <div className="bg-red-50 border border-red-300 p-4 rounded-lg">
                    <p className="text-sm text-red-800 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Missing Required Documents
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      Please upload all required documents before proceeding to payment.
                    </p>
                  </div>
                )}
                  </>
                )}
              </div>
            )}

            {/* STEP 6: Fee Payment */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  feeSlipFile ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'
                }`}>
                  <input type="file" accept="image/*,application/pdf" onChange={handleFeeSlipChange} className="hidden" id="fee-slip" required />
                  <label htmlFor="fee-slip" className="cursor-pointer block">
                    {feeSlipFile ? (
                      <div>
                        <FileText className="w-10 h-10 text-green-600 mx-auto mb-2" />
                        <p className="font-semibold text-green-700">✅ {feeSlipFile.name}</p>
                        <p className="text-sm text-green-600">Click to change file</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-10 h-10 text-red-500 mx-auto mb-2" />
                        <p className="font-semibold text-red-700">⚠️ Fee Payment Slip (REQUIRED)</p>
                        <p className="text-sm text-red-600">Click to upload image or PDF proof of payment</p>
                      </div>
                    )}
                  </label>
                </div>

                <div className="space-y-2">
                  <Label>Amount Paid (USD)</Label>
                  <Input type="number" min="0" value={formData.feePaid}
                    onChange={(e) => setFormData(prev => ({ ...prev, feePaid: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
                </div>

                <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                  <h3 className="font-bold">📋 Enrollment Summary</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-600">Student:</span> <strong>{formData.student.fullName}</strong></div>
                    <div><span className="text-gray-600">Username:</span> <span className="font-mono">{getStudentUsername()}</span></div>
                    <div><span className="text-gray-600">Parent:</span> <strong>{formData.parent.fullName}</strong></div>
                    <div><span className="text-gray-600">Username:</span> <span className="font-mono">{getParentUsername()}</span></div>
                    <div><span className="text-gray-600">Class:</span> <strong>{formData.className}</strong></div>
                    <div><span className="text-gray-600">Entry:</span> <strong>{formData.gradeLevel}</strong></div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-300 p-3 rounded-lg">
                  <p className="text-sm text-yellow-900">
                    <strong>⚠️</strong> Fee slip upload is mandatory. You cannot proceed without uploading proof of payment.
                  </p>
                </div>
                
                {!feeSlipFile && (
                  <div className="bg-red-50 border border-red-300 p-3 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">❌ Missing Required Document</p>
                    <p className="text-sm text-red-700">Please upload the fee payment slip before enrolling the student.</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1} className="flex-1">
                ← Previous
              </Button>

              {currentStep < 6 ? (
                <Button 
                  onClick={() => {
                    // Validate before proceeding
                    if (currentStep === 1) {
                      if (!validateStudentFields()) {
                        toast.error('Please fix validation errors before proceeding')
                        return
                      }
                    }
                    if (currentStep === 2) {
                      if (!validateParentFields()) {
                        toast.error('Please fix validation errors before proceeding')
                        return
                      }
                    }
                    if (currentStep === 4) {
                      // Validate A-Level subject selection
                      if (isALevelGrade(formData.gradeLevel) && formData.selectedSubjectIds.length < 3) {
                        toast.error('A-Level students must select at least 3 subjects')
                        return
                      }
                    }
                    if (currentStep === 5) {
                      if (!areRequiredDocumentsUploaded()) {
                        toast.error('Please upload all required documents before proceeding')
                        return
                      }
                    }
                    setCurrentStep(currentStep + 1)
                  }} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={
                    (currentStep === 1 && (!formData.entryStatus || !formData.gradeLevel || !formData.student.fullName || !formData.student.birthDate || !formData.student.idNumber || !formData.student.gender)) ||
                    (currentStep === 2 && (!formData.parent.fullName || !formData.parent.idNumber || !formData.parent.birthDate || !formData.parent.phoneNumber || !formData.parent.email)) ||
                    (currentStep === 4 && formData.classId && isALevelGrade(formData.gradeLevel) && formData.selectedSubjectIds.length < 3) ||
                    (currentStep === 5 && !areRequiredDocumentsUploaded()) ||
                    Object.keys(validationErrors).length > 0
                  }>
                  Next →
                </Button>
              ) : (
                <Button onClick={handleEnroll} disabled={loading || !formData.classId || !feeSlipFile} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {loading ? <><Clock className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Complete Enrollment</>}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default CompleteStudentEnrollment
