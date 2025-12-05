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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, School, Users, GraduationCap, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react'

interface School {
  id: string
  name: string
  school_code: string
  school_type: string
  class_count: number
}

interface Class {
  id: string
  grade_level: string
  section: string
  academic_year: string
  school_id: string
  school_name: string
  student_count: number
  expanded: boolean
}

export default function ClassesPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null)
  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  
  // Filters
  const [filterSchoolType, setFilterSchoolType] = useState<string>('all')
  const [filterSchool, setFilterSchool] = useState<string>('all')
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [filterSection, setFilterSection] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [section, setSection] = useState('')
  const [academicYear, setAcademicYear] = useState('2025')
  const [submitting, setSubmitting] = useState(false)

  const gradeLevels = [
    'ECD A', 'ECD B', 'ECD C',
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7',
    'Form 1', 'Form 2', 'Form 3', 'Form 4',
    'Lower 6', 'Upper 6'
  ]

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

    // Load schools
    const { data: schoolsData, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, school_code, school_type')
      .order('school_type', { ascending: true })
      .order('name', { ascending: true })

    if (schoolsError) {
      toast.error('Failed to load schools')
      console.error(schoolsError)
    } else {
      // Count classes per school
      const schoolsWithCount = await Promise.all(
        (schoolsData || []).map(async (school) => {
          const { count } = await supabase
            .from('classes')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', school.id)
          return { ...school, class_count: count || 0 }
        })
      )
      setSchools(schoolsWithCount)
    }

    // Load classes with student counts
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select(`
        id,
        grade_level,
        section,
        academic_year,
        school_id,
        schools(name)
      `)
      .order('grade_level', { ascending: true })
      .order('section', { ascending: true })

    if (classesError) {
      toast.error('Failed to load classes')
      console.error(classesError)
    } else {
      const classesWithCount = await Promise.all(
        (classesData || []).map(async (cls: any) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
          return {
            id: cls.id,
            grade_level: cls.grade_level,
            section: cls.section,
            academic_year: cls.academic_year,
            school_id: cls.school_id,
            school_name: cls.schools?.name || 'Unknown',
            student_count: count || 0,
            expanded: false
          }
        })
      )
      setClasses(classesWithCount)
    }

    setLoading(false)
  }

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { error } = await supabase
      .from('classes')
      .insert({
        school_id: selectedSchoolId,
        grade_level: gradeLevel,
        section: section,
        academic_year: academicYear
      })

    if (error) {
      toast.error('Failed to create class', { description: error.message })
    } else {
      toast.success('Class created successfully!')
      setDialogOpen(false)
      setSelectedSchoolId('')
      setGradeLevel('')
      setSection('')
      loadData()
    }
    setSubmitting(false)
  }

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to delete ${className}? This will unlink all students from this class.`)) {
      return
    }

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)

    if (error) {
      toast.error('Failed to delete class', { description: error.message })
    } else {
      toast.success('Class deleted successfully!')
      loadData()
    }
  }

  // Filtered data
  const filteredSchools = schools.filter(school => {
    if (filterSchoolType !== 'all' && school.school_type !== filterSchoolType) return false
    return true
  })

  const filteredClasses = classes.filter(cls => {
    if (filterSchool !== 'all' && cls.school_id !== filterSchool) return false
    if (filterGrade !== 'all' && cls.grade_level !== filterGrade) return false
    if (filterSection !== 'all' && cls.section !== filterSection) return false
    if (searchQuery && !cls.grade_level.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !cls.section.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Get unique values for cascading filters
  const availableGrades = [...new Set(filteredClasses.map(c => c.grade_level))]
  const availableSections = [...new Set(filteredClasses.map(c => c.section))]

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Classes Management">
        <div>Loading...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Classes Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Manage classes across all schools</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>Add a new class to a school</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div className="space-y-2">
                  <Label>School *</Label>
                  <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name} ({school.school_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grade Level *</Label>
                  <Select value={gradeLevel} onValueChange={setGradeLevel} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade level" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeLevels.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section *</Label>
                  <Input
                    placeholder="e.g., A, B, Science, Arts"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Academic Year *</Label>
                  <Input
                    placeholder="e.g., 2025"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Class'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <Label>School</Label>
                <Select value={filterSchool} onValueChange={setFilterSchool}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {filteredSchools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade Level</Label>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {availableGrades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {availableSections.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Search</Label>
                <Input
                  placeholder="Search classes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">Total Schools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{filteredSchools.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">Total Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{filteredClasses.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium opacity-90">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {filteredClasses.reduce((sum, cls) => sum + cls.student_count, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* School Cards Grouped by Type */}
        <div className="space-y-6">
          {['Primary', 'Secondary'].map((schoolType) => {
            const schoolsOfType = filteredSchools.filter(s => s.school_type === schoolType)
            if (schoolsOfType.length === 0) return null

            return (
              <div key={schoolType}>
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <GraduationCap className="mr-2" />
                  {schoolType} Schools
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schoolsOfType.map((school) => {
                    const schoolClasses = filteredClasses.filter(c => c.school_id === school.id)
                    const isExpanded = expandedSchool === school.id

                    return (
                      <div key={school.id} className="space-y-2">
                        <Card 
                          className="cursor-pointer hover:shadow-lg transition-all"
                          onClick={() => setExpandedSchool(isExpanded ? null : school.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{school.name}</CardTitle>
                                <p className="text-sm text-gray-500">{school.school_code}</p>
                              </div>
                              {isExpanded ? <ChevronUp /> : <ChevronDown />}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-gray-600">
                                <School className="w-4 h-4 mr-2" />
                                <span className="text-sm">{schoolClasses.length} Classes</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Users className="w-4 h-4 mr-2" />
                                <span className="text-sm">
                                  {schoolClasses.reduce((sum, c) => sum + c.student_count, 0)} Students
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Expanded Classes */}
                        {isExpanded && schoolClasses.length > 0 && (
                          <div className="ml-4 space-y-2 animate-in slide-in-from-top">
                            {schoolClasses.map((cls) => {
                              const isClassExpanded = expandedClass === cls.id

                              return (
                                <Card 
                                  key={cls.id}
                                  className="cursor-pointer hover:shadow-md transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedClass(isClassExpanded ? null : cls.id)
                                  }}
                                >
                                  <CardHeader className="py-3">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <CardTitle className="text-base">
                                          {cls.grade_level} {cls.section}
                                        </CardTitle>
                                        <p className="text-xs text-gray-500">Academic Year: {cls.academic_year}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge>{cls.student_count} students</Badge>
                                        {isClassExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </div>
                                    </div>
                                  </CardHeader>

                                  {/* Expanded Class Details */}
                                  {isClassExpanded && (
                                    <CardContent className="space-y-3 border-t pt-3">
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                          <span className="text-gray-500">Grade:</span>
                                          <p className="font-medium">{cls.grade_level}</p>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Section:</span>
                                          <p className="font-medium">{cls.section}</p>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Year:</span>
                                          <p className="font-medium">{cls.academic_year}</p>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Students:</span>
                                          <p className="font-medium">{cls.student_count}</p>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 pt-2">
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toast.info('Edit functionality coming soon')
                                          }}
                                        >
                                          <Edit className="w-3 h-3 mr-1" />
                                          Edit
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="destructive"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteClass(cls.id, `${cls.grade_level} ${cls.section}`)
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3 mr-1" />
                                          Delete
                                        </Button>
                                      </div>
                                    </CardContent>
                                  )}
                                </Card>
                              )
                            })}
                          </div>
                        )}

                        {isExpanded && schoolClasses.length === 0 && (
                          <Card className="ml-4">
                            <CardContent className="py-6 text-center text-gray-500">
                              No classes found for this school
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
