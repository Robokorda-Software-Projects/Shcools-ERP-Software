'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2, Calendar, CheckCircle, XCircle, Clock, Download, Upload, Users, TrendingUp } from 'lucide-react'

interface Student {
  id: string
  roll_number: string
  full_name: string
  user_id: string
}

interface AttendanceRecord {
  id: string
  student_id: string
  class_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  remarks: string | null
  marked_by: string
  marked_at: string
  student_name: string
  roll_number: string
}

interface ClassInfo {
  id: string
  grade_level: string
  section: string
  student_count: number
}

interface AttendanceStats {
  totalDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  attendanceRate: number
}

export default function AttendanceRegisterPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Map<string, string>>(new Map())
  const [remarks, setRemarks] = useState<Map<string, string>>(new Map())
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [viewDate, setViewDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState<string>('mark')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [studentStats, setStudentStats] = useState<AttendanceStats | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (profile) {
      fetchClasses()
    }
  }, [profile])

  useEffect(() => {
    if (selectedClass) {
      fetchStudents()
      checkExistingAttendance()
    }
  }, [selectedClass, selectedDate])

  useEffect(() => {
    if (selectedClass && activeTab === 'history') {
      fetchAttendanceHistory()
    }
  }, [selectedClass, viewDate, activeTab])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('classes')
        .select('id, grade_level, section')
        .order('grade_level')

      // Filter by school or teacher assignment
      if (profile?.role === 'teacher') {
        // If teacher, show only their assigned classes
        query = query.eq('class_teacher_id', profile.id)
      } else if (profile?.role !== 'super_admin' && profile?.school_id) {
        query = query.eq('school_id', profile.school_id)
      }

      const { data: classData, error } = await query

      if (error) throw error

      // Get student count for each class
      const classesWithCount = await Promise.all(
        (classData || []).map(async (cls) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)

          return {
            id: cls.id,
            grade_level: cls.grade_level,
            section: cls.section,
            student_count: count || 0,
          }
        })
      )

      setClasses(classesWithCount)
      if (classesWithCount.length > 0) {
        setSelectedClass(classesWithCount[0].id)
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error)
      toast.error('Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, roll_number, user_id, profiles!students_user_id_fkey(full_name)')
        .eq('class_id', selectedClass)
        .order('roll_number')

      if (error) throw error

      const studentsList: Student[] = (data || []).map((s: any) => ({
        id: s.id,
        roll_number: s.roll_number,
        full_name: s.profiles?.full_name || 'Unknown',
        user_id: s.user_id,
      }))

      setStudents(studentsList)
    } catch (error: any) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
    }
  }

  const checkExistingAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, status, remarks')
        .eq('class_id', selectedClass)
        .eq('date', selectedDate)

      if (error) throw error

      const attendanceMap = new Map<string, string>()
      const remarksMap = new Map<string, string>()

      data?.forEach((record: any) => {
        attendanceMap.set(record.student_id, record.status)
        if (record.remarks) {
          remarksMap.set(record.student_id, record.remarks)
        }
      })

      setAttendance(attendanceMap)
      setRemarks(remarksMap)
    } catch (error: any) {
      console.error('Error checking attendance:', error)
    }
  }

  const fetchAttendanceHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          student_id,
          class_id,
          date,
          status,
          remarks,
          marked_by,
          marked_at,
          students!attendance_student_id_fkey(
            roll_number,
            profiles!students_user_id_fkey(full_name)
          )
        `)
        .eq('class_id', selectedClass)
        .eq('date', viewDate)
        .order('students(roll_number)')

      if (error) throw error

      const records: AttendanceRecord[] = (data || []).map((record: any) => ({
        id: record.id,
        student_id: record.student_id,
        class_id: record.class_id,
        date: record.date,
        status: record.status,
        remarks: record.remarks,
        marked_by: record.marked_by,
        marked_at: record.marked_at,
        student_name: record.students?.profiles?.full_name || 'Unknown',
        roll_number: record.students?.roll_number || 'N/A',
      }))

      setAttendanceHistory(records)
    } catch (error: any) {
      console.error('Error fetching attendance history:', error)
      toast.error('Failed to load attendance history')
    }
  }

  const markAttendance = (studentId: string, status: string) => {
    const newAttendance = new Map(attendance)
    newAttendance.set(studentId, status)
    setAttendance(newAttendance)
  }

  const markAllPresent = () => {
    const newAttendance = new Map<string, string>()
    students.forEach(student => {
      newAttendance.set(student.id, 'present')
    })
    setAttendance(newAttendance)
    toast.success('Marked all students as present')
  }

  const setRemark = (studentId: string, remark: string) => {
    const newRemarks = new Map(remarks)
    if (remark.trim()) {
      newRemarks.set(studentId, remark)
    } else {
      newRemarks.delete(studentId)
    }
    setRemarks(newRemarks)
  }

  const saveAttendance = async () => {
    if (attendance.size === 0) {
      toast.error('Please mark attendance for at least one student')
      return
    }

    try {
      setSaving(true)

      // Prepare attendance records
      const attendanceRecords = Array.from(attendance.entries()).map(([studentId, status]) => ({
        student_id: studentId,
        class_id: selectedClass,
        date: selectedDate,
        status: status,
        remarks: remarks.get(studentId) || null,
        marked_by: profile?.id,
        school_id: profile?.school_id,
      }))

      // Delete existing records for this date/class
      await supabase
        .from('attendance')
        .delete()
        .eq('class_id', selectedClass)
        .eq('date', selectedDate)

      // Insert new records
      const { error } = await supabase.from('attendance').insert(attendanceRecords)

      if (error) throw error

      toast.success('Attendance saved successfully!')
      setAttendance(new Map())
      setRemarks(new Map())
    } catch (error: any) {
      console.error('Error saving attendance:', error)
      toast.error('Failed to save attendance: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const fetchStudentStats = async (studentId: string) => {
    try {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      const startDate = startOfMonth.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId)
        .gte('date', startDate)

      if (error) throw error

      const totalDays = data?.length || 0
      const presentDays = data?.filter(r => r.status === 'present').length || 0
      const absentDays = data?.filter(r => r.status === 'absent').length || 0
      const lateDays = data?.filter(r => r.status === 'late').length || 0
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0

      setStudentStats({
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        attendanceRate,
      })
    } catch (error: any) {
      console.error('Error fetching student stats:', error)
    }
  }

  const exportAttendancePDF = async () => {
    // This is a placeholder - you'll need to implement PDF generation
    // You can use libraries like jsPDF or pdfmake
    toast.info('PDF export feature coming soon!')
    
    // Example: Create CSV export instead
    const csvData = attendanceHistory.map(record => ({
      'Roll Number': record.roll_number,
      'Student Name': record.student_name,
      'Date': record.date,
      'Status': record.status,
      'Remarks': record.remarks || '',
    }))

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${selectedClass}_${viewDate}.csv`
    a.click()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500">Present</Badge>
      case 'absent':
        return <Badge className="bg-red-500">Absent</Badge>
      case 'late':
        return <Badge className="bg-yellow-500">Late</Badge>
      case 'excused':
        return <Badge className="bg-blue-500">Excused</Badge>
      default:
        return <Badge variant="outline">Not Marked</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'late':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'excused':
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      default:
        return null
    }
  }

  const getTodayStats = () => {
    const total = students.length
    const marked = attendance.size
    const present = Array.from(attendance.values()).filter(s => s === 'present').length
    const absent = Array.from(attendance.values()).filter(s => s === 'absent').length
    const late = Array.from(attendance.values()).filter(s => s === 'late').length

    return { total, marked, present, absent, late }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Attendance Register">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !profile) return null

  const stats = getTodayStats()
  const selectedClassInfo = classes.find(c => c.id === selectedClass)

  return (
    <DashboardLayout title="Attendance Register">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Present
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Absent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Late
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Register</CardTitle>
            <CardDescription>
              Mark daily attendance for your classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
                <TabsTrigger value="history">View History</TabsTrigger>
              </TabsList>

              {/* Mark Attendance Tab */}
              <TabsContent value="mark" className="space-y-4">
                {/* Class and Date Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Select Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.grade_level} {cls.section} ({cls.student_count} students)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={markAllPresent}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark All Present
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                {stats.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {stats.marked} / {stats.total} marked</span>
                      <span>{Math.round((stats.marked / stats.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(stats.marked / stats.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Students List */}
                {students.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No students found in this class
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Roll</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Quick Mark</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.roll_number}
                            </TableCell>
                            <TableCell>{student.full_name}</TableCell>
                            <TableCell>
                              {getStatusBadge(attendance.get(student.id) || '')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={attendance.get(student.id) === 'present' ? 'default' : 'outline'}
                                  onClick={() => markAttendance(student.id, 'present')}
                                  className={attendance.get(student.id) === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={attendance.get(student.id) === 'absent' ? 'default' : 'outline'}
                                  onClick={() => markAttendance(student.id, 'absent')}
                                  className={attendance.get(student.id) === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={attendance.get(student.id) === 'late' ? 'default' : 'outline'}
                                  onClick={() => markAttendance(student.id, 'late')}
                                  className={attendance.get(student.id) === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Add remarks..."
                                value={remarks.get(student.id) || ''}
                                onChange={(e) => setRemark(student.id, e.target.value)}
                                className="w-full"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAttendance(new Map())
                          setRemarks(new Map())
                        }}
                      >
                        Clear All
                      </Button>
                      <Button
                        onClick={saveAttendance}
                        disabled={saving || attendance.size === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Attendance
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Select Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.grade_level} {cls.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>View Date</Label>
                    <Input
                      type="date"
                      value={viewDate}
                      onChange={(e) => setViewDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={exportAttendancePDF}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                {attendanceHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No attendance records found for this date
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Marked At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceHistory.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.roll_number}
                          </TableCell>
                          <TableCell>{record.student_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(record.status)}
                              {getStatusBadge(record.status)}
                            </div>
                          </TableCell>
                          <TableCell>{record.remarks || '-'}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(record.marked_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}