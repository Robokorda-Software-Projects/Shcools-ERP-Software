/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { 
  Download, Upload, Check, AlertCircle, FileText, Eye, ArrowRight, 
  RefreshCw, CheckCircle2, XCircle, ArrowLeft, ChevronRight, Sparkles, Brain
} from 'lucide-react'
import Link from 'next/link'
import { shouldUseAIParsing, formatAIResults } from '@/lib/ai-parser'

interface ColumnMapping {
  fileColumn: string
  systemField: string
  required: boolean
  matched: boolean
}

interface ParsedData {
  headers: string[]
  rows: any[]
  preview: any[]
  detectedClass?: string | null
}

interface BulkUpload {
  id: string
  file_name: string
  total_rows: number
  successful_rows: number
  failed_rows: number
  upload_status: string
  created_at: string
  errors: any[]
}

// System fields that can be mapped
const SYSTEM_FIELDS = [
  { value: 'skip', label: '-- Skip Column --', required: false },
  { value: 'student_full_name', label: 'Student Full Name *', required: true },
  { value: 'student_gender', label: 'Student Gender *', required: true },
  { value: 'student_birth_date', label: 'Student Birth Date *', required: true },
  { value: 'student_nationality', label: 'Student Nationality', required: false },
  { value: 'student_id_number', label: 'Student ID Number *', required: true },
  { value: 'student_birth_certificate', label: 'Student Birth Certificate', required: false },
  { value: 'student_address', label: 'Student Address', required: false },
  { value: 'student_medical_conditions', label: 'Medical Conditions', required: false },
  { value: 'student_previous_school', label: 'Previous School', required: false },
  { value: 'parent_full_name', label: 'Parent Full Name *', required: true },
  { value: 'parent_id_number', label: 'Parent ID Number *', required: true },
  { value: 'parent_birth_date', label: 'Parent Birth Date *', required: true },
  { value: 'parent_phone', label: 'Parent Phone *', required: true },
  { value: 'parent_email', label: 'Parent Email *', required: true },
  { value: 'parent_address', label: 'Parent Address', required: false },
  { value: 'parent_relationship', label: 'Parent Relationship', required: false },
  { value: 'parent_occupation', label: 'Parent Occupation', required: false },
  { value: 'class_name', label: 'Class Name *', required: true },
  { value: 'grade_level', label: 'Grade Level *', required: true },
  { value: 'fee_amount', label: 'Fee Amount Paid', required: false },
  { value: 'notes', label: 'Notes/Comments', required: false }
]

const BulkEnrollmentPage = () => {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  
  const [currentStep, setCurrentStep] = useState(1) // 1: Upload, 2: Map, 3: Review, 4: Process
  const [bulkUploads, setBulkUploads] = useState<BulkUpload[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState(false)
  const [processResults, setProcessResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [useAI, setUseAI] = useState(false)
  const [aiParsing, setAiParsing] = useState(false)
  const [parsingMethod, setParsingMethod] = useState<'deterministic' | 'ai'>('deterministic')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && !['enrollment_officer', 'school_admin', 'super_admin'].includes(profile.role)) {
      router.push('/dashboard')
      toast.error('Access denied')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.school_id) {
      loadBulkUploads()
    }
  }, [profile])

  const loadBulkUploads = async () => {
    try {
      const { data } = await supabase
        .from('bulk_enrollment_uploads')
        .select('*')
        .eq('school_id', profile?.school_id)
        .order('created_at', { ascending: false})
        .limit(10)

      setBulkUploads(data || [])
    } catch (error) {
      console.error('Error loading uploads:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `Full Name,Gender,Birth Date,Nationality,Student ID,Birth Certificate,Address,Medical Conditions,Previous School,Parent Name,Parent ID,Parent Birth Date,Parent Phone,Parent Email,Parent Address,Parent Relationship,Grade Level,Class,Fee Amount,Notes
John Doe,Male,2010-05-15,Zimbabwe,73-2987414-R-42,ZW123456,123 Main St Harare,None,XYZ Primary,Jane Doe,73-0876606-E-12,1980-03-20,+263771234567,jane@email.com,123 Main St Harare,parent,Form 1,Form 1A,500,Good student
Mary Smith,Female,2011-08-22,Zimbabwe,73-2456789-F-34,ZW234567,789 Oak Ave Bulawayo,Asthma,ABC Primary,Robert Smith,73-1234567-M-56,1978-06-15,+263772345678,robert@email.com,789 Oak Ave Bulawayo,parent,Form 1,Form 1B,500,Needs inhaler
Tendai Moyo,Male,2009-12-10,Zimbabwe,73-3456789-M-78,ZW345678,456 Park Rd Harare,,Central School,Grace Moyo,73-2345678-F-90,1982-11-05,+263773456789,grace@email.com,456 Park Rd Harare,parent,Form 2,Form 2A,500,`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_enrollment_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Template downloaded!')
  }

  // Enhanced CSV parser that handles class names in file structure
  const parseCSV = (text: string, fileName: string): ParsedData => {
    const allLines = text.split('\n').filter(line => line.trim())
    if (allLines.length === 0) throw new Error('File is empty')
    
    // Detect class name from filename (e.g., "Form1A.csv", "2A_Class.csv", "Grade_3_Blue.csv")
    const fileClassMatch = fileName.match(/(?:Form|Grade|Class)[\s_-]*(\d+[A-Za-z]*)/i) || 
                          fileName.match(/(\d+[A-Z])\D/i)
    const detectedClass = fileClassMatch ? fileClassMatch[1].trim() : null
    
    // Find header row (skip class name rows like "FORM 1A" or section markers)
    let headerRowIndex = 0
    let detectedClassFromContent = detectedClass
    
    for (let i = 0; i < Math.min(10, allLines.length); i++) {
      const line = allLines[i]
      const cols = line.split(',').map(c => c.trim())
      
      // Check if this looks like a class name row (1-3 columns, contains "Form" or "Grade")
      if (cols.length <= 3 && /^(Form|Grade|Class)\s+\d+[A-Za-z]*$/i.test(cols[0])) {
        detectedClassFromContent = cols[0].trim()
        continue
      }
      
      // Check if this looks like a header row (has common field names)
      const commonHeaders = ['name', 'gender', 'date', 'birth', 'parent', 'phone', 'email', 'address', 'id', 'student']
      const matchCount = cols.filter(col => 
        commonHeaders.some(h => col.toLowerCase().includes(h))
      ).length
      
      if (matchCount >= 3) {
        headerRowIndex = i
        break
      }
    }
    
    const lines = allLines.slice(headerRowIndex)
    const headers = lines[0].split(',').map(h => h.trim())
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      
      // If we detected a class from file/content, parse and add both fields
      if (detectedClassFromContent) {
        // Try to split into grade_level and section
        const classMatch = detectedClassFromContent.match(/^(Form|Grade|Class)?\s*(\d+)\s*([A-Za-z]+)?$/i)
        
        if (classMatch) {
          const [, prefix, number, section] = classMatch
          const gradeLevel = `${prefix || 'Form'} ${number}`.trim()
          const sectionName = section || 'A'
          
          row['__detected_grade__'] = gradeLevel
          row['__detected_section__'] = sectionName
        } else {
          // Fallback: use full string as class name
          row['__detected_class__'] = detectedClassFromContent
        }
      }
      
      return row
    })

    return {
      headers,
      rows,
      detectedClass: detectedClassFromContent,
      preview: rows.slice(0, 5) // First 5 rows for preview
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file. Excel support coming soon!')
      return
    }

    setSelectedFile(file)

    try {
      const text = await file.text()
      const parsed = parseCSV(text, file.name)
      
      // Check if deterministic parsing has low confidence
      const needsAI = shouldUseAIParsing(text, parsed)
      
      if (needsAI && !useAI) {
        // Suggest AI parsing
        setParsedData(parsed)
        setUseAI(true)
        toast.warning('File structure is complex. We recommend AI-assisted parsing for better accuracy.', {
          duration: 6000
        })
        setCurrentStep(2)
        return
      }

      setParsedData(parsed)
      
      // Auto-detect column mappings
      const autoMappings = autoDetectMappings(parsed.headers, parsed.detectedClass)
      setColumnMappings(autoMappings)
      setParsingMethod('deterministic')
      
      const classInfo = parsed.detectedClass ? ` (Class: ${parsed.detectedClass})` : ''
      toast.success(`File loaded: ${parsed.rows.length} rows detected${classInfo}`)
      setCurrentStep(2) // Move to mapping step
    } catch (error: any) {
      toast.error('Failed to parse file: ' + error.message)
      setSelectedFile(null)
    }
  }

  // AI-assisted parsing function
  const handleAIParsing = async () => {
    if (!selectedFile) return

    setAiParsing(true)
    try {
      const text = await selectedFile.text()
      const lines = text.split('\n').filter(l => l.trim())
      
      const response = await fetch('/api/admin/ai-parse-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent: text,
          fileName: selectedFile.name,
          fileType: 'csv',
          firstRows: lines.slice(0, 20)
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'AI parsing failed')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'AI analysis failed')
      }

      // Format AI results
      const aiFormatted = formatAIResults(result)
      
      if (!aiFormatted) {
        throw new Error('Failed to format AI results')
      }

      // Extract actual data rows based on AI analysis
      const dataStartRow = result.analysis.dataRows.startRow
      const dataEndRow = result.analysis.dataRows.endRow
      const allLines = text.split('\n')
      const dataLines = allLines.slice(dataStartRow, dataEndRow + 1)
      
      // Reparse with AI guidance
      const aiParsed = parseCSVWithAIGuidance(dataLines, result.analysis)
      
      setParsedData(aiParsed)
      setColumnMappings(aiFormatted.suggestedMappings)
      setParsingMethod('ai')
      setUseAI(false)
      
      toast.success(`✨ AI analysis complete! Found ${aiParsed.rows.length} students`, {
        description: result.analysis.fileStructure
      })
      
      setCurrentStep(2)
    } catch (error: any) {
      console.error('AI parsing error:', error)
      toast.error('AI parsing failed: ' + error.message)
    } finally {
      setAiParsing(false)
    }
  }

  // Parse CSV with AI guidance
  const parseCSVWithAIGuidance = (lines: string[], aiAnalysis: any): ParsedData => {
    const headers = aiAnalysis.headerRow.headers
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const row: any = {}
      headers.forEach((header: string, index: number) => {
        row[header] = values[index] || ''
      })
      
      // Add detected class if found
      if (aiAnalysis.classDetection.detected) {
        const className = `${aiAnalysis.classDetection.gradeLevel} ${aiAnalysis.classDetection.section}`.trim()
        row['__detected_class__'] = className
      }
      
      return row
    })

    return {
      headers,
      rows,
      detectedClass: aiAnalysis.classDetection.detected 
        ? `${aiAnalysis.classDetection.gradeLevel} ${aiAnalysis.classDetection.section}`.trim()
        : null,
      preview: rows.slice(0, 5)
    }
  }

  // Intelligent auto-detection of column mappings
  const autoDetectMappings = (headers: string[], detectedClass?: string | null): Record<string, string> => {
    const mappings: Record<string, string> = {}
    
    // If we detected a class, parse it and add virtual columns
    if (detectedClass) {
      // Try to split "FORM 2B" into grade_level and section
      const classMatch = detectedClass.match(/^(Form|Grade|Class)?\s*(\d+)\s*([A-Za-z]+)?$/i)
      
      if (classMatch) {
        const [, prefix, number, section] = classMatch
        const gradeLevel = `${prefix || 'Form'} ${number}`.trim()
        const sectionName = section || 'A'
        
        // Add virtual columns for both grade_level and class_name
        mappings['__detected_grade__'] = 'grade_level'
        mappings['__detected_section__'] = 'class_name'
        
        console.log(`[Auto-mapping] Detected class "${detectedClass}" split into grade="${gradeLevel}", section="${sectionName}"`)
      } else {
        // If can't split, use as class_name only
        mappings['__detected_class__'] = 'class_name'
      }
    }
    
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase().replace(/[_\s]/g, '')
      
      // Student fields
      if (lowerHeader.includes('studentname') || lowerHeader.includes('fullname') || lowerHeader === 'name') {
        mappings[header] = 'student_full_name'
      } else if (lowerHeader.includes('gender') || lowerHeader.includes('sex')) {
        mappings[header] = 'student_gender'
      } else if (lowerHeader.includes('birthdate') || lowerHeader.includes('dateofbirth') || lowerHeader.includes('dob')) {
        mappings[header] = 'student_birth_date'
      } else if (lowerHeader.includes('nationality') || lowerHeader.includes('country')) {
        mappings[header] = 'student_nationality'
      } else if ((lowerHeader.includes('student') && lowerHeader.includes('id')) || lowerHeader.includes('idnumber')) {
        mappings[header] = 'student_id_number'
      } else if (lowerHeader.includes('birthcertificate') || lowerHeader === 'birthcert') {
        mappings[header] = 'student_birth_certificate'
      } else if (lowerHeader.includes('address') && !lowerHeader.includes('parent')) {
        mappings[header] = 'student_address'
      } else if (lowerHeader.includes('medical') || lowerHeader.includes('condition') || lowerHeader.includes('illness')) {
        mappings[header] = 'student_medical_conditions'
      } else if (lowerHeader.includes('previousschool') || lowerHeader.includes('oldschool')) {
        mappings[header] = 'student_previous_school'
      }
      // Parent fields
      else if (lowerHeader.includes('parentname') || lowerHeader.includes('guardianname')) {
        mappings[header] = 'parent_full_name'
      } else if (lowerHeader.includes('parentid') || lowerHeader.includes('guardianid')) {
        mappings[header] = 'parent_id_number'
      } else if (lowerHeader.includes('parentbirth') || lowerHeader.includes('guardianbirth')) {
        mappings[header] = 'parent_birth_date'
      } else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('contact')) {
        mappings[header] = 'parent_phone'
      } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
        mappings[header] = 'parent_email'
      } else if (lowerHeader.includes('parentaddress') || lowerHeader.includes('guardianaddress')) {
        mappings[header] = 'parent_address'
      } else if (lowerHeader.includes('relationship') || lowerHeader.includes('relation')) {
        mappings[header] = 'parent_relationship'
      } else if (lowerHeader.includes('occupation') || lowerHeader.includes('job')) {
        mappings[header] = 'parent_occupation'
      }
      // Class fields
      else if (lowerHeader.includes('class') && !lowerHeader.includes('grade')) {
        mappings[header] = 'class_name'
      } else if (lowerHeader.includes('grade') || lowerHeader.includes('form') || lowerHeader.includes('level')) {
        mappings[header] = 'grade_level'
      } else if (lowerHeader.includes('fee') || lowerHeader.includes('amount') || lowerHeader.includes('payment')) {
        mappings[header] = 'fee_amount'
      } else if (lowerHeader.includes('note') || lowerHeader.includes('comment') || lowerHeader.includes('remark')) {
        mappings[header] = 'notes'
      } else {
        mappings[header] = 'skip' // Unknown columns
      }
    })
    
    return mappings
  }

  const handleMappingChange = (fileColumn: string, systemField: string) => {
    // Prevent duplicate mappings (except 'skip')
    if (systemField !== 'skip') {
      const existingMapping = Object.entries(columnMappings).find(
        ([col, field]) => field === systemField && col !== fileColumn
      )
      if (existingMapping) {
        toast.error(`${systemField} is already mapped to "${existingMapping[0]}"`)
        return
      }
    }
    
    setColumnMappings(prev => ({
      ...prev,
      [fileColumn]: systemField
    }))
  }

  const validateMappings = (): boolean => {
    const requiredFields = SYSTEM_FIELDS.filter(f => f.required).map(f => f.value)
    const mappedFields = Object.values(columnMappings).filter(v => v !== 'skip')
    
    const missingFields = requiredFields.filter(rf => !mappedFields.includes(rf))
    
    if (missingFields.length > 0) {
      const missingLabels = SYSTEM_FIELDS
        .filter(f => missingFields.includes(f.value))
        .map(f => f.label)
      toast.error(`Missing required fields: ${missingLabels.join(', ')}`)
      return false
    }
    
    return true
  }

  const handleProcessUpload = async () => {
    if (!validateMappings() || !parsedData || !selectedFile) {
      return
    }

    try {
      setProcessing(true)
      setCurrentStep(4) // Move to processing step

      // Transform data based on mappings
      const transformedData = parsedData.rows.map((row, index) => {
        const transformed: any = { rowNumber: index + 2 } // +2 for header and 1-indexed
        
        Object.entries(columnMappings).forEach(([fileCol, systemField]) => {
          if (systemField !== 'skip') {
            transformed[systemField] = row[fileCol]
          }
        })
        
        return transformed
      })

      // Send to API
      const response = await fetch('/api/admin/bulk-enroll-mapped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: transformedData,
          schoolId: profile?.school_id,
          enrolledBy: profile?.id,
          fileName: selectedFile.name
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Upload failed')
      }

      const result = await response.json()
      setProcessResults(result)
      
      toast.success(`✅ Enrolled ${result.successful} students successfully!`)
      
      if (result.failed > 0) {
        toast.error(`⚠️ ${result.failed} rows had errors`)
      }
      
      // Reload upload history
      await loadBulkUploads()

    } catch (error: any) {
      console.error('Processing error:', error)
      toast.error(error.message || 'Processing failed')
      setCurrentStep(3) // Go back to review
    } finally {
      setProcessing(false)
    }
  }

  const resetUpload = () => {
    setCurrentStep(1)
    setSelectedFile(null)
    setParsedData(null)
    setColumnMappings({})
    setProcessResults(null)
  }

  if (authLoading || loading) {
    return <DashboardLayout title="Loading..."><div>Loading...</div></DashboardLayout>
  }

  if (!user || !profile) {
    return null
  }

  return (
    <DashboardLayout title="Bulk Student Enrollment">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bulk Student Enrollment</h1>
            <p className="text-gray-600">Upload and map student data from any CSV format</p>
          </div>
          <Link href="/dashboard/students/enrolled">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Students
            </Button>
          </Link>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Upload File', icon: Upload },
                { num: 2, label: 'Map Columns', icon: RefreshCw },
                { num: 3, label: 'Review Data', icon: Eye },
                { num: 4, label: 'Process', icon: CheckCircle2 }
              ].map((step, index) => (
                <React.Fragment key={step.num}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      currentStep >= step.num 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {currentStep > step.num ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <step.icon className="w-6 h-6" />
                      )}
                    </div>
                    <p className={`text-sm font-medium ${
                      currentStep >= step.num ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                  {index < 3 && (
                    <ChevronRight className={`w-6 h-6 mx-2 ${
                      currentStep > step.num ? 'text-green-600' : 'text-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* STEP 1: Upload File */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Step 1: Upload Your CSV File
              </CardTitle>
              <CardDescription>
                Upload a CSV file with student data. Don&apos;t worry about column names - we&apos;ll help you map them!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">💡 Smart Column Mapping System:</h3>
                <ul className="text-sm text-blue-900 space-y-2 list-disc list-inside">
                  <li><strong>Any column names work!</strong> Your CSV can have columns like &quot;Name&quot;, &quot;Student Name&quot;, &quot;Full Name&quot;, etc.</li>
                  <li><strong>Auto-detection:</strong> System intelligently suggests field mappings</li>
                  <li><strong>Manual override:</strong> You can change any mapping in the next step</li>
                  <li><strong>Preview before processing:</strong> See exactly what will be imported</li>
                  <li><strong>Different schools, different formats:</strong> Each school can use their own CSV structure</li>
                </ul>
              </div>

              {/* File Format Support */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-3">📊 Supported File Formats:</h3>
                <ul className="text-sm text-green-900 space-y-2 list-disc list-inside">
                  <li><strong>Simple CSV:</strong> Standard CSV with headers in first row</li>
                  <li><strong>Class in filename:</strong> e.g., &quot;Form1A.csv&quot; or &quot;Grade_2B_students.csv&quot; - we&apos;ll auto-detect the class</li>
                  <li><strong>Section headers:</strong> Files with &quot;FORM 1A&quot; row followed by headers - we skip to the actual data</li>
                  <li><strong>Note:</strong> Excel multi-sheet support coming soon!</li>
                </ul>
              </div>

              {/* Download Template */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample Template
                </Button>
              </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer block">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="font-semibold text-lg mb-2">
                  Click to select CSV file or drag & drop
                </p>
                <p className="text-sm text-gray-500">Supports any CSV format with student data</p>
              </label>
            </div>

              {/* Important Notes */}
              <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg">
                <p className="font-semibold text-yellow-900 flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  Tips for Best Results
                </p>
                <ul className="text-sm text-yellow-900 space-y-1 list-disc list-inside">
                  <li>Ensure dates are in YYYY-MM-DD format (e.g., 2010-05-15)</li>
                  <li>Phone numbers with country code (e.g., +263771234567)</li>
                  <li>Gender as Male/Female</li>
                  <li>One student per row</li>
                  <li>No empty rows in the middle of data</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Map Columns */}
        {currentStep === 2 && parsedData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Step 2: Map Your Columns to System Fields
                    {parsingMethod === 'ai' && (
                      <Badge variant="secondary" className="ml-2">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI-Powered
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    We&apos;ve detected {parsedData.headers.length} columns. Map them to the correct fields or skip unused columns.
                  </CardDescription>
                </div>
                
                {/* AI Parsing Toggle */}
                {useAI && (
                  <Button
                    variant="default"
                    onClick={handleAIParsing}
                    disabled={aiParsing}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {aiParsing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        AI Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Use AI-Assisted Parsing
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* AI Suggestion Alert */}
              {useAI && (
                <div className="bg-purple-50 border border-purple-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-purple-900 mb-2">
                        🤖 Complex File Structure Detected
                      </p>
                      <p className="text-sm text-purple-800 mb-3">
                        Our AI can analyze this file and automatically:
                      </p>
                      <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside mb-3">
                        <li>Find the actual data headers (skipping title rows)</li>
                        <li>Detect class information from any location</li>
                        <li>Identify the exact data range</li>
                        <li>Map columns with high accuracy</li>
                      </ul>
                      <p className="text-xs text-purple-700">
                        <strong>Note:</strong> AI parsing uses OpenAI and may incur costs. Your admin has configured this feature.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-detection Notice */}
              {!useAI && parsingMethod === 'deterministic' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-900">
                    ✅ <strong>Auto-detection complete!</strong> We&apos;ve suggested mappings based on your column names. 
                    Please review and adjust if needed. Required fields are marked with *.
                  </p>
                </div>
              )}

              {/* AI Success Notice */}
              {parsingMethod === 'ai' && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-300 rounded-lg p-4">
                  <p className="text-sm text-purple-900">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    <strong>AI analysis complete!</strong> We&apos;ve intelligently mapped your columns and detected the file structure. 
                    Please review the mappings below.
                  </p>
                </div>
              )}

              {/* Class Auto-Detection Alert */}
              {parsedData.detectedClass && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    🎓 <strong>Class auto-detected!</strong> We found &quot;{parsedData.detectedClass}&quot; from your file. 
                    All students will be assigned to this class automatically.
                  </p>
                </div>
              )}

              {/* Column Mapping Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold">Your File Column Name</TableHead>
                      <TableHead className="font-bold">Maps To System Field</TableHead>
                      <TableHead className="font-bold">Sample Data in your File</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.headers.map((header, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {header}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={columnMappings[header] || 'skip'}
                            onValueChange={(value) => handleMappingChange(header, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SYSTEM_FIELDS.map(field => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {parsedData.preview[0]?.[header] || '(empty)'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button
                  onClick={() => {
                    if (validateMappings()) {
                      setCurrentStep(3)
                    }
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Continue to Review <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Review Data */}
        {currentStep === 3 && parsedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Step 3: Review Data Preview
              </CardTitle>
              <CardDescription>
                Preview the first 5 students to be enrolled. Verify the data is correct before processing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-700">{parsedData.rows.length}</p>
                  <p className="text-sm text-blue-600">Total Students</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-700">
                    {Object.values(columnMappings).filter(v => v !== 'skip' && SYSTEM_FIELDS.find(f => f.value === v)?.required).length}
                  </p>
                  <p className="text-sm text-green-600">Required Fields Mapped</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-purple-700">
                    {Object.values(columnMappings).filter(v => v !== 'skip').length}
                  </p>
                  <p className="text-sm text-purple-600">Total Fields Mapped</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-gray-700">
                    {Object.values(columnMappings).filter(v => v === 'skip').length}
                  </p>
                  <p className="text-sm text-gray-600">Columns Skipped</p>
                </div>
              </div>

              {/* Preview Table */}
              <div>
                <h3 className="font-semibold mb-3">Data Preview (First 5 Rows):</h3>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Row</th>
                        {Object.entries(columnMappings)
                          .filter(([_, systemField]) => systemField !== 'skip')
                          .map(([fileCol, systemField]) => (
                            <th key={fileCol} className="p-2 text-left">
                              {SYSTEM_FIELDS.find(f => f.value === systemField)?.label || systemField}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.preview.map((row, index) => (
                        <tr key={index} className="border-t hover:bg-gray-50">
                          <td className="p-2 font-medium">{index + 1}</td>
                          {Object.entries(columnMappings)
                            .filter(([_, systemField]) => systemField !== 'skip')
                            .map(([fileCol]) => (
                              <td key={fileCol} className="p-2">
                                {row[fileCol] || <span className="text-gray-400 italic">(empty)</span>}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg">
                <p className="text-sm text-yellow-900">
                  ⚠️ <strong>Ready to process?</strong> This will create {parsedData.rows.length} student accounts 
                  and their parent accounts. Make sure the data is correct before proceeding.
                </p>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Mapping
                </Button>
                <Button
                  onClick={handleProcessUpload}
                  disabled={processing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      Process {parsedData.rows.length} Students <CheckCircle2 className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Processing Results */}
        {currentStep === 4 && processResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Processing Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Results Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <p className="text-4xl font-bold text-blue-700">{processResults.total}</p>
                  <p className="text-sm text-blue-600 mt-2">Total Rows</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-4xl font-bold text-green-700">{processResults.successful}</p>
                  <p className="text-sm text-green-600 mt-2">Successfully Enrolled</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-4xl font-bold text-red-700">{processResults.failed}</p>
                  <p className="text-sm text-red-600 mt-2">Failed</p>
                </div>
              </div>

              {/* Error Details */}
              {processResults.errors && processResults.errors.length > 0 && (
                <div className="border rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-900 mb-3">❌ Errors Found:</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {processResults.errors.map((error: any, index: number) => (
                      <div key={index} className="bg-white p-3 rounded border border-red-200 text-sm">
                        <p className="font-medium text-red-800">Row {error.row}: {error.student_name || 'Unknown'}</p>
                        <p className="text-red-600">{error.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetUpload}
                  className="flex-1"
                >
                  Upload Another File
                </Button>
                <Link href="/dashboard/students/enrolled" className="flex-1">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    View Enrolled Students
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload History */}
        {currentStep === 1 && bulkUploads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Upload History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left p-3">File Name</th>
                      <th className="text-center p-3">Total</th>
                      <th className="text-center p-3">Success</th>
                      <th className="text-center p-3">Failed</th>
                      <th className="text-center p-3">Status</th>
                      <th className="text-right p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkUploads.map((upload) => (
                      <tr key={upload.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{upload.file_name}</td>
                        <td className="p-3 text-center">{upload.total_rows}</td>
                        <td className="p-3 text-center">
                          <Badge className="bg-green-100 text-green-800">
                            {upload.successful_rows}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          {upload.failed_rows > 0 && (
                            <Badge className="bg-red-100 text-red-800">
                              {upload.failed_rows}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Badge 
                            variant="outline"
                            className={
                              upload.upload_status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {upload.upload_status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-gray-500 text-xs">
                          {new Date(upload.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

export default BulkEnrollmentPage
