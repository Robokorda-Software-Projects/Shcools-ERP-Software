'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Calendar, CheckCircle, XCircle, Clock, Filter, Download } from 'lucide-react'
import { format, subDays, addDays, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns'

interface AttendanceRecord {
  id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  remarks: string | null
  marked_by: string
  marked_by_name: string
}

interface AttendanceStats {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  percentage: number
}

interface ChildOption {
  id: string
  name: string
  className: string
}

export default function StudentAttendancePage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterPeriod, setFilterPeriod] = useState<'last10' | 'month' | 'custom'>('last10')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Multi-child support for parents
  const [children, setChildren] = useState<ChildOption[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && profile.role !== 'student' && profile.role !== 'parent') {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  // Load children list for parents
  useEffect(() => {
    const loadChildren = async () => {
      if (profile?.role === 'parent') {
        const { data: childrenData } = await supabase
          .from('students')
          .select(`
            id,
            profiles!students_user_id_fkey(full_name),
            classes(grade_level, section)
          `)
          .eq('parent_id', profile.id)

        if (childrenData && childrenData.length > 0) {
          const formattedChildren = childrenData.map((child: any) => ({
            id: child.id,
            name: child.profiles?.full_name || 'Unknown',
            className: child.classes ? `${child.classes.grade_level} ${child.classes.section}` : 'N/A'
          }))
          setChildren(formattedChildren)
          // Select first child by default
          if (!selectedChildId) {
            setSelectedChildId(formattedChildren[0].id)
          }
        }
      }
    }
    
    if (profile?.role === 'parent') {
      loadChildren()
    }
  }, [profile])

  useEffect(() => {
    if (profile?.role === 'student') {
      loadAttendance()
    } else if (profile?.role === 'parent' && selectedChildId) {
      loadAttendance()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, filterPeriod, startDate, endDate, selectedChildId])

  const loadAttendance = async () => {
    if (!profile?.id) return

    setLoading(true)
    try {
      let studentData

      // If parent, use selected child; if student, get own data
      if (profile.role === 'parent') {
        if (!selectedChildId) {
          setLoading(false)
          return
        }
        const { data: childData } = await supabase
          .from('students')
          .select('id, class_id')
          .eq('id', selectedChildId)
          .single()
        
        studentData = childData
      } else {
        const { data: ownData } = await supabase
          .from('students')
          .select('id, class_id')
          .eq('user_id', profile.id)
          .single()
        
        studentData = ownData
      }

      if (!studentData) {
        toast.error('Student record not found')
        setLoading(false)
        return
      }

      // Determine date range based on filter
      let dateStart: string
      let dateEnd: string
      const today = new Date()

      if (filterPeriod === 'last10') {
        // Past 5 days, today, next 4 days (as requested)
        dateStart = format(subDays(today, 5), 'yyyy-MM-dd')
        dateEnd = format(addDays(today, 4), 'yyyy-MM-dd')
      } else if (filterPeriod === 'month') {
        dateStart = format(startOfMonth(today), 'yyyy-MM-dd')
        dateEnd = format(endOfMonth(today), 'yyyy-MM-dd')
      } else {
        dateStart = startDate
        dateEnd = endDate
      }

      // Fetch attendance records - use student record ID, not profile ID
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select(`
          id,
          date,
          status,
          remarks,
          marked_by,
          profiles!attendance_marked_by_fkey(full_name)
        `)
        .eq('student_id', studentData.id)
        .eq('class_id', studentData.class_id)
        .gte('date', dateStart)
        .lte('date', dateEnd)
        .order('date', { ascending: false })

      if (error) throw error

      const records: AttendanceRecord[] = (attendanceData || []).map((a: any) => ({
        id: a.id,
        date: a.date,
        status: a.status,
        remarks: a.remarks,
        marked_by: a.marked_by,
        marked_by_name: a.profiles?.full_name || 'Unknown'
      }))

      setAttendance(records)
      calculateStats(records)
    } catch (error: any) {
      console.error('Error loading attendance:', error)
      toast.error('Failed to load attendance records')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (records: AttendanceRecord[]) => {
    const total = records.length
    const present = records.filter(r => r.status === 'present').length
    const absent = records.filter(r => r.status === 'absent').length
    const late = records.filter(r => r.status === 'late').length
    const excused = records.filter(r => r.status === 'excused').length
    const percentage = total > 0 ? (present / total) * 100 : 0

    setStats({ total, present, absent, late, excused, percentage })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Present</Badge>
      case 'absent':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Absent</Badge>
      case 'late':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Late</Badge>
      case 'excused':
        return <Badge className="bg-blue-500">Excused</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const isDateInFuture = (date: string) => {
    return isAfter(new Date(date), new Date())
  }

  const selectedChild = children.find(c => c.id === selectedChildId)
  const pageTitle = profile?.role === 'parent' 
    ? `${selectedChild?.name || "My Child"}'s Attendance` 
    : 'My Attendance'

  if (authLoading || loading) {
    return (
      <DashboardLayout title={pageTitle}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading attendance...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || (profile?.role !== 'student' && profile?.role !== 'parent')) return null

  return (
    <DashboardLayout title={pageTitle}>
      <div className="space-y-6">
        {/* Child Selector for Parents */}
        {profile?.role === 'parent' && children.length > 1 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <Label className="font-medium">Select Child:</Label>
                <Select value={selectedChildId || ''} onValueChange={setSelectedChildId}>
                  <SelectTrigger className="w-64 bg-white">
                    <SelectValue placeholder="Select a child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name} ({child.className})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Attendance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.percentage.toFixed(1)}%</div>
                <p className="text-xs text-gray-500 mt-1">{stats.present} of {stats.total} days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Present</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                <p className="text-xs text-gray-500 mt-1">days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Absent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                <p className="text-xs text-gray-500 mt-1">days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Late</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
                <p className="text-xs text-gray-500 mt-1">days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Excused</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.excused}</div>
                <p className="text-xs text-gray-500 mt-1">days</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter Attendance
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>Period</Label>
                <Select value={filterPeriod} onValueChange={(v: any) => setFilterPeriod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last10">Last 10 Days</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filterPeriod === 'custom' && (
                <>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={loadAttendance}>
                      Apply Filter
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Attendance Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No attendance records found for this period</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Marked By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow 
                        key={record.id}
                        className={isDateInFuture(record.date) ? 'bg-gray-50 opacity-60' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {format(new Date(record.date), 'MMM dd, yyyy')}
                            {isDateInFuture(record.date) && (
                              <Badge variant="outline" className="text-xs">Future</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(record.date), 'EEEE')}</TableCell>
                        <TableCell>
                          {isDateInFuture(record.date) ? (
                            <Badge variant="outline">Not Yet</Badge>
                          ) : (
                            getStatusBadge(record.status)
                          )}
                        </TableCell>
                        <TableCell>
                          {record.remarks || <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell>{record.marked_by_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">About Attendance</h3>
                <p className="text-sm text-blue-700">
                  Your attendance is marked daily by your class teacher. If you notice any discrepancies, 
                  please contact your class teacher immediately. Regular attendance is crucial for your 
                  academic success.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
