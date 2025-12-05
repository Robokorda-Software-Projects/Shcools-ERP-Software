'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover'
import { 
  CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Download, 
  Save,
  Filter,
  Search
} from 'lucide-react'
import { format } from 'date-fns'

interface Student {
  id: string
  student_id: string
  full_name: string
  email: string
  class_id: string
}

interface Class {
  id: string
  class_name: string
  grade_level: string
  section: string
  teacher_id?: string
}

interface AttendanceRecord {
  id?: string
  student_id: string
  class_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  reason?: string
}

export default function AttendancePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (profile?.role === 'teacher' && user) {
      fetchTeacherClasses()
    }
  }, [profile, user])

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents()
      fetchAttendanceRecords()
    }
  }, [selectedClass, selectedDate])

  const fetchTeacherClasses = async () => {
    try {
      setLoadingData(true)
      
      // For demo purposes - in real app, you would query classes assigned to teacher
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('user_id')
        .eq('user_id', user?.id)
        .single()

      let query = supabase
        .from('classes')
        .select('*')
        .order('grade_level', { ascending: true })

      // If teacher exists, filter by teacher_id
      if (teacherData) {
        query = query.eq('teacher_id', teacherData.user_id)
      }

      const { data, error } = await query

      if (error) throw error
      setClasses(data || [])
      
      // Auto-select first class if available
      if (data && data.length > 0 && !selectedClass) {
        setSelectedClass(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      toast.error('Failed to load classes')
    } finally {
      setLoadingData(false)
    }
  }

  const fetchClassStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', selectedClass)
        .order('full_name', { ascending: true })

      if (error) throw error

      // Initialize attendance records for each student
      const initialAttendance: AttendanceRecord[] = (data || []).map(student => ({
        student_id: student.id,
        class_id: selectedClass,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status: 'present' // Default to present
      }))

      setStudents(data || [])
      setAttendance(initialAttendance)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
    }
  }

  const fetchAttendanceRecords = async () => {
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd')
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('date', dateString)

      if (error) throw error

      if (data && data.length > 0) {
        setAttendance(data)
      }
    } catch (error) {
      console.error('Error fetching attendance:', error)
    }
  }

  const handleAttendanceChange = (studentId: string, status: AttendanceRecord['status']) => {
    setAttendance(prev => {
      const existingIndex = prev.findIndex(record => 
        record.student_id === studentId && 
        record.date === format(selectedDate, 'yyyy-MM-dd')
      )

      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = { ...updated[existingIndex], status }
        return updated
      }

      return [...prev, {
        student_id: studentId,
        class_id: selectedClass,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status
      }]
    })
  }

  const saveAttendance = async () => {
    if (!selectedClass) {
      toast.error('Please select a class first')
      return
    }

    if (attendance.length === 0) {
      toast.error('No attendance records to save')
      return
    }

    setIsSaving(true)
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd')
      
      // Delete existing records for this date and class
      await supabase
        .from('attendance')
        .delete()
        .eq('class_id', selectedClass)
        .eq('date', dateString)

      // Insert new records
      const { error } = await supabase
        .from('attendance')
        .insert(attendance.map(record => ({
          ...record,
          date: dateString
        })))

      if (error) throw error

      toast.success('Attendance saved successfully!')
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('Failed to save attendance')
    } finally {
      setIsSaving(false)
    }
  }

  const generateReport = () => {
    const csvContent = [
      ['Student ID', 'Name', 'Date', 'Status'],
      ...attendance.map(record => {
        const student = students.find(s => s.id === record.student_id)
        return [
          student?.student_id || '',
          student?.full_name || '',
          record.date,
          record.status.toUpperCase()
        ]
      })
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${format(selectedDate, 'yyyy-MM-dd')}.csv`
    a.click()
    
    toast.success('Report generated successfully!')
  }

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusCount = (status: AttendanceRecord['status']) => {
    return attendance.filter(record => record.status === status).length
  }

  const getStatusColor = (status: AttendanceRecord['status']) => {
    const colors = {
      present: 'bg-green-100 text-green-800 border-green-200',
      absent: 'bg-red-100 text-red-800 border-red-200',
      late: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      excused: 'bg-blue-100 text-blue-800 border-blue-200'
    }
    return colors[status]
  }

  if (loading || loadingData) {
    return (
      <DashboardLayout title="Attendance">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || profile?.role !== 'teacher') {
    return (
      <DashboardLayout title="Attendance">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-gray-600">This page is only accessible to teachers.</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  const selectedClassInfo = classes.find(c => c.id === selectedClass)

  return (
    <DashboardLayout title="Attendance Management">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Register</h1>
            <p className="text-gray-600 mt-1">Mark and manage student attendance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generateReport} disabled={attendance.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={saveAttendance} disabled={isSaving || attendance.length === 0}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Class Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.grade_level} - {cls.class_name} ({cls.section})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search Students</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    className="pl-10 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Stats */}
            {selectedClassInfo && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{getStatusCount('present')}</div>
                    <div className="text-sm text-gray-600">Present</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{getStatusCount('absent')}</div>
                    <div className="text-sm text-gray-600">Absent</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-yellow-600">{getStatusCount('late')}</div>
                    <div className="text-sm text-gray-600">Late</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{getStatusCount('excused')}</div>
                    <div className="text-sm text-gray-600">Excused</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Table */}
        {selectedClass ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance Register</CardTitle>
                  <CardDescription>
                    {selectedClassInfo && `${selectedClassInfo.grade_level} - ${selectedClassInfo.class_name} (${selectedClassInfo.section})`}
                    {' • '}
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  {filteredStudents.length} Students
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No students found in this class.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student, index) => {
                        const record = attendance.find(a => a.student_id === student.id)
                        const status = record?.status || 'present'

                        return (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-mono">{student.student_id}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span>{student.full_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={`px-3 py-1 ${getStatusColor(status)}`}>
                                {status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant={status === 'present' ? 'default' : 'outline'}
                                  className="h-8 px-3"
                                  onClick={() => handleAttendanceChange(student.id, 'present')}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Present
                                </Button>
                                <Button
                                  size="sm"
                                  variant={status === 'absent' ? 'destructive' : 'outline'}
                                  className="h-8 px-3"
                                  onClick={() => handleAttendanceChange(student.id, 'absent')}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Absent
                                </Button>
                                <Button
                                  size="sm"
                                  variant={status === 'late' ? 'outline' : 'outline'}
                                  className="h-8 px-3 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                  onClick={() => handleAttendanceChange(student.id, 'late')}
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Late
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Class Selected</h3>
                <p className="text-gray-600 mb-4">Please select a class to view attendance records.</p>
                {classes.length === 0 && (
                  <p className="text-sm text-gray-500">
                    You are not assigned to any classes. Contact your administrator.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common attendance tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => {
                  // Mark all as present
                  setAttendance(prev => 
                    prev.map(record => ({ ...record, status: 'present' }))
                  )
                  toast.info('All students marked as present')
                }}
                disabled={attendance.length === 0}
              >
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <span>Mark All Present</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => setSelectedDate(new Date())}
              >
                <CalendarIcon className="h-8 w-8 text-blue-600" />
                <span>Today's Date</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => {
                  const yesterday = new Date(selectedDate)
                  yesterday.setDate(yesterday.getDate() - 1)
                  setSelectedDate(yesterday)
                }}
              >
                <CalendarIcon className="h-8 w-8 text-gray-600" />
                <span>Previous Day</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => {
                  const tomorrow = new Date(selectedDate)
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  setSelectedDate(tomorrow)
                }}
              >
                <CalendarIcon className="h-8 w-8 text-gray-600" />
                <span>Next Day</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}