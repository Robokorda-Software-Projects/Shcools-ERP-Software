/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Calendar, Clock, CheckCircle, AlertTriangle, 
  Lock, Unlock, Send, RefreshCw, Edit
} from 'lucide-react'

interface MarkingPeriod {
  id: string
  term: string
  academic_year: string
  start_date: string
  end_date: string
  is_active: boolean
  results_published: boolean
  published_at: string | null
  created_at: string
}

interface SchoolSettings {
  current_term: string | null
  academic_year: string | null
}

export default function ExamPeriodsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [periods, setPeriods] = useState<MarkingPeriod[]>([])
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<MarkingPeriod | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const TERMS = ['Term 1', 'Term 2', 'Term 3']

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && !['school_admin', 'super_admin'].includes(profile.role)) {
      router.push('/dashboard')
      toast.error('Access denied')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.school_id) {
      loadData()
    }
  }, [profile])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load school settings to get current term
      const { data: schoolData } = await supabase
        .from('schools')
        .select('current_term, academic_year')
        .eq('id', profile?.school_id)
        .single()

      setSchoolSettings(schoolData || { current_term: null, academic_year: null })

      // Load or initialize marking periods for current academic year
      const currentYear = schoolData?.academic_year || new Date().getFullYear().toString()
      
      const { data: periodsData, error } = await supabase
        .from('exam_marking_periods')
        .select('*')
        .eq('school_id', profile?.school_id)
        .eq('academic_year', currentYear)
        .order('term')

      if (error) throw error

      // If no periods exist, create them
      if (!periodsData || periodsData.length === 0) {
        await initializeTerms(currentYear)
        return loadData() // Reload after initialization
      }

      // Auto-close periods that have passed their deadline
      await autoClosePeriods(periodsData)

      setPeriods(periodsData || [])
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error('Failed to load marking periods')
    } finally {
      setLoading(false)
    }
  }

  const initializeTerms = async (year: string) => {
    const currentYear = parseInt(year)
    const terms = [
      {
        term: 'Term 1',
        start_date: `${currentYear}-01-15`,
        end_date: `${currentYear}-04-20`
      },
      {
        term: 'Term 2',
        start_date: `${currentYear}-05-10`,
        end_date: `${currentYear}-08-20`
      },
      {
        term: 'Term 3',
        start_date: `${currentYear}-09-10`,
        end_date: `${currentYear}-12-15`
      }
    ]

    const termRecords = terms.map(t => ({
      school_id: profile?.school_id,
      term: t.term,
      academic_year: year,
      start_date: t.start_date,
      end_date: t.end_date,
      is_active: false,
      results_published: false,
      created_by: profile?.id
    }))

    const { error } = await supabase
      .from('exam_marking_periods')
      .insert(termRecords)

    if (error) {
      console.error('Error initializing terms:', error)
      toast.error('Failed to initialize marking periods')
    }
  }

  const autoClosePeriods = async (periods: MarkingPeriod[]) => {
    const now = new Date()
    const periodsToClose = periods.filter(p => {
      if (!p.is_active) return false
      const endDate = new Date(p.end_date)
      return endDate < now
    })

    if (periodsToClose.length > 0) {
      const updates = periodsToClose.map(p => 
        supabase
          .from('exam_marking_periods')
          .update({ is_active: false })
          .eq('id', p.id)
      )

      await Promise.all(updates)
      console.log(`Auto-closed ${periodsToClose.length} expired marking period(s)`)
    }
  }

  const openEditDialog = (period: MarkingPeriod) => {
    setSelectedPeriod(period)
    setStartDate(period.start_date)
    setEndDate(period.end_date)
    setIsEditDialogOpen(true)
  }

  const handleUpdatePeriod = async () => {
    if (!selectedPeriod || !startDate || !endDate) {
      toast.error('Please fill all fields')
      return
    }

    if (new Date(endDate) <= new Date(startDate)) {
      toast.error('End date must be after start date')
      return
    }

    try {
      setIsSaving(true)

      const { error } = await supabase
        .from('exam_marking_periods')
        .update({
          start_date: startDate,
          end_date: endDate
        })
        .eq('id', selectedPeriod.id)

      if (error) throw error

      toast.success('Marking period updated')
      setIsEditDialogOpen(false)
      setSelectedPeriod(null)
      await loadData()
    } catch (error: any) {
      console.error('Error updating period:', error)
      toast.error('Failed to update period')
    } finally {
      setIsSaving(false)
    }
  }

  const togglePeriodActive = async (period: MarkingPeriod) => {
    // Check if trying to open a period
    if (!period.is_active) {
      // Check if current school term matches this period
      if (schoolSettings?.current_term && !period.term.includes(schoolSettings.current_term)) {
        toast.error(`Cannot open ${period.term}. Current school term is ${schoolSettings.current_term}. Please update school settings first.`)
        return
      }

      // Check if deadline has passed
      const now = new Date()
      const endDate = new Date(period.end_date)
      if (endDate < now) {
        // Allow reopening but show warning
        const confirm = window.confirm(
          `The deadline for ${period.term} has passed (${new Date(period.end_date).toLocaleDateString()}).\n\nDo you want to reopen it anyway? This allows late submissions.`
        )
        if (!confirm) return
      }

      // Deactivate all other periods
      await supabase
        .from('exam_marking_periods')
        .update({ is_active: false })
        .eq('school_id', profile?.school_id)
    }

    try {
      const { error } = await supabase
        .from('exam_marking_periods')
        .update({ is_active: !period.is_active })
        .eq('id', period.id)

      if (error) throw error

      toast.success(period.is_active ? 'Marking period closed' : 'Marking period opened')
      await loadData()
    } catch (error: any) {
      toast.error('Failed to update period')
    }
  }

  const openPublishDialog = (period: MarkingPeriod) => {
    setSelectedPeriod(period)
    setIsPublishDialogOpen(true)
  }

  const handlePublishResults = async () => {
    if (!selectedPeriod) return

    try {
      setIsSaving(true)

      const { error } = await supabase
        .from('exam_marking_periods')
        .update({
          results_published: true,
          published_at: new Date().toISOString(),
          published_by: profile?.id,
          is_active: false // Close the period when publishing
        })
        .eq('id', selectedPeriod.id)

      if (error) throw error

      toast.success('Results published! Students and parents can now view them.')
      setIsPublishDialogOpen(false)
      setSelectedPeriod(null)
      await loadData()
    } catch (error: any) {
      toast.error('Failed to publish results')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDepublishResults = async (period: MarkingPeriod) => {
    try {
      const { error } = await supabase
        .from('exam_marking_periods')
        .update({
          results_published: false,
          published_at: null,
          published_by: null
        })
        .eq('id', period.id)

      if (error) throw error

      toast.success('Results unpublished. Students and parents can no longer view them.')
      await loadData()
    } catch (error: any) {
      toast.error('Failed to unpublish results')
    }
  }

  const getPeriodStatus = (period: MarkingPeriod) => {
    if (period.results_published) return 'published'
    if (period.is_active) {
      const now = new Date()
      const endDate = new Date(period.end_date)
      if (endDate < now) return 'expired'
      return 'open'
    }
    return 'closed'
  }

  const getStatusBadge = (period: MarkingPeriod) => {
    const status = getPeriodStatus(period)
    switch (status) {
      case 'open':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Open</Badge>
      case 'closed':
        return <Badge variant="outline" className="text-gray-600">Closed</Badge>
      case 'expired':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-300">Expired - Reopen?</Badge>
      case 'published':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Published</Badge>
      default:
        return null
    }
  }

  const isTermAllowed = (term: string) => {
    if (!schoolSettings?.current_term) return true // If no term set, allow all
    return term.includes(schoolSettings.current_term)
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Exam Marking Periods">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !['school_admin', 'super_admin'].includes(profile?.role || '')) {
    return null
  }

  return (
    <DashboardLayout title="Exam Marking Periods">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exam Marking Periods</h1>
            <p className="text-sm text-gray-500 mt-1">
              Control when teachers can enter exam marks
            </p>
          </div>
          <Button onClick={loadData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Current School Term Info */}
        {schoolSettings && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Current School Term: {schoolSettings.current_term || 'Not set'}
                  </p>
                  <p className="text-xs text-blue-700">
                    Academic Year: {schoolSettings.academic_year || 'Not set'} • 
                    You can only open marking periods for the current term
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Marking Periods */}
        <Card>
          <CardHeader>
            <CardTitle>All Marking Periods</CardTitle>
            <CardDescription>
              Three fixed terms per academic year. Open/close periods, edit dates, and publish results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => {
                  const status = getPeriodStatus(period)
                  const termAllowed = isTermAllowed(period.term)
                  
                  return (
                    <TableRow key={period.id} className={!termAllowed ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{period.term}</TableCell>
                      <TableCell>{period.academic_year}</TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(period)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(period)}
                            className="gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            Edit Dates
                          </Button>
                          
                          {status !== 'published' && (
                            <Button
                              variant={period.is_active ? "destructive" : "default"}
                              size="sm"
                              onClick={() => togglePeriodActive(period)}
                              disabled={!termAllowed && !period.is_active}
                              className="gap-1"
                            >
                              {period.is_active ? (
                                <><Lock className="h-4 w-4" /> Close</>
                              ) : (
                                <><Unlock className="h-4 w-4" /> Open</>
                              )}
                            </Button>
                          )}
                          
                          {period.is_active && !period.results_published && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openPublishDialog(period)}
                              className="gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <Send className="h-4 w-4" />
                              Publish
                            </Button>
                          )}
                          
                          {period.results_published && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDepublishResults(period)}
                              className="gap-1"
                            >
                              <Lock className="h-4 w-4" />
                              Unpublish
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Period Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {selectedPeriod?.term} Dates</DialogTitle>
              <DialogDescription>
                Update the marking period dates for {selectedPeriod?.term}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="start">Start Date</Label>
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end">End Date (Deadline)</Label>
                <Input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePeriod} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Publish Dialog */}
        <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish Results</DialogTitle>
              <DialogDescription asChild>
                <div>
                  Are you sure you want to publish results for {selectedPeriod?.term}?
                  <div className="mt-3 text-sm">
                    <p className="font-medium mb-2">Once published:</p>
                    <ul className="list-disc ml-5 space-y-1">
                      <li>Students and parents can view exam results</li>
                      <li>The marking period will be automatically closed</li>
                      <li>You can unpublish later if needed</li>
                    </ul>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPublishDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePublishResults} 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? 'Publishing...' : 'Publish Results'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
