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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Settings, Save, RefreshCw, GraduationCap, Users, FileText, DollarSign } from 'lucide-react'

interface EnrollmentSettings {
  id?: string
  school_id: string
  class_assignment_method: string
  allow_manual_override: boolean
  use_grade_based_placement: boolean
  use_ai_placement: boolean
  require_birth_certificate: boolean
  require_parent_id: boolean
  require_student_id: boolean
  require_fee_slip: boolean
  require_previous_school_report: boolean
  username_format: string
  password_format: string
  minimum_fee_percentage: number
  allow_enrollment_without_payment: boolean
  notify_parent_on_enrollment: boolean
  notify_admin_on_enrollment: boolean
  send_welcome_email: boolean
  allow_bulk_upload: boolean
  bulk_upload_skip_fee_slip: boolean
}

const defaultSettings: Partial<EnrollmentSettings> = {
  class_assignment_method: 'auto_grade_based',
  allow_manual_override: true,
  use_grade_based_placement: true,
  use_ai_placement: false,
  require_birth_certificate: true,
  require_parent_id: true,
  require_student_id: false,
  require_fee_slip: true,
  require_previous_school_report: false,
  username_format: 'surname_birthyear',
  password_format: 'id_number',
  minimum_fee_percentage: 0,
  allow_enrollment_without_payment: false,
  notify_parent_on_enrollment: true,
  notify_admin_on_enrollment: true,
  send_welcome_email: true,
  allow_bulk_upload: true,
  bulk_upload_skip_fee_slip: true
}

const EnrollmentSettingsPage = () => {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<EnrollmentSettings | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile && !['school_admin', 'super_admin'].includes(profile.role)) {
      router.push('/dashboard')
      toast.error('Access denied - Admins only')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.school_id) {
      loadSettings()
    }
  }, [profile])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('enrollment_settings')
        .select('*')
        .eq('school_id', profile?.school_id)
        .single()

      if (data) {
        setSettings(data)
      } else {
        // Create default settings
        setSettings({
          school_id: profile?.school_id || '',
          ...defaultSettings
        } as EnrollmentSettings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setSettings({
        school_id: profile?.school_id || '',
        ...defaultSettings
      } as EnrollmentSettings)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    try {
      setSaving(true)
      
      console.log('=== SAVING ENROLLMENT SETTINGS ===')
      console.log('Settings to save:', JSON.stringify(settings, null, 2))
      console.log('Has ID (update mode):', !!settings.id)

      if (settings.id) {
        // Update existing
        console.log('Updating existing settings with ID:', settings.id)
        const { data, error } = await supabase
          .from('enrollment_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)
          .select()

        console.log('Update result - Data:', data, 'Error:', error)
        if (error) throw error
      } else {
        // Insert new - make sure school_id is set
        const settingsToInsert = {
          ...settings,
          school_id: profile?.school_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        console.log('Inserting new settings:', JSON.stringify(settingsToInsert, null, 2))
        
        const { data, error } = await supabase
          .from('enrollment_settings')
          .insert([settingsToInsert])
          .select()
          .single()

        console.log('Insert result - Data:', data, 'Error:', error)
        if (error) throw error
        setSettings(data)
      }

      console.log('=== SAVE SUCCESSFUL ===')
      toast.success('Enrollment settings saved!')
    } catch (error: any) {
      console.error('=== SAVE FAILED ===')
      console.error('Error saving settings:', error)
      console.error('Error message:', error?.message)
      console.error('Error details:', error?.details)
      console.error('Error hint:', error?.hint)
      toast.error(`Failed to save settings: ${error?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof EnrollmentSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null)
  }

  if (authLoading || loading) {
    return <DashboardLayout title="Loading..."><div className="p-8">Loading...</div></DashboardLayout>
  }

  if (!user || !profile || !settings) return null

  return (
    <DashboardLayout title="Enrollment Settings">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="w-8 h-8 text-blue-600" />
              Enrollment Settings
            </h1>
            <p className="text-gray-600">Configure how enrollment officers enroll students</p>
          </div>
          <Button onClick={saveSettings} disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
          </Button>
        </div>

        {/* Class Assignment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Class Assignment Rules
            </CardTitle>
            <CardDescription>
              How should students be assigned to classes during enrollment?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Assignment Method */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Class Assignment Method</Label>
              <Select 
                value={settings.class_assignment_method}
                onValueChange={(v) => updateSetting('class_assignment_method', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_grade_based">
                    <div className="flex items-center gap-2">
                      <span>📊 Grade-Based (Automatic)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="random">
                    <div className="flex items-center gap-2">
                      <span>🎲 Random Assignment</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="capacity_based">
                    <div className="flex items-center gap-2">
                      <span>📦 Capacity-Based (Fill classes evenly)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <span>✋ Manual Only (Officer decides)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <div className="text-sm text-gray-600 mt-2 p-3 bg-gray-50 rounded-lg">
                {settings.class_assignment_method === 'auto_grade_based' && (
                  <p>📊 <strong>Grade-Based:</strong> Students are automatically placed in classes based on their previous grades. Higher grades = better classes (lower class_rank).</p>
                )}
                {settings.class_assignment_method === 'random' && (
                  <p>🎲 <strong>Random:</strong> Students are randomly assigned to available classes with space. Best for new primary school students.</p>
                )}
                {settings.class_assignment_method === 'capacity_based' && (
                  <p>📦 <strong>Capacity-Based:</strong> Classes are filled evenly. Students go to classes with the most available space.</p>
                )}
                {settings.class_assignment_method === 'manual' && (
                  <p>✋ <strong>Manual Only:</strong> Enrollment officer must manually select the class for each student. No automatic suggestions.</p>
                )}
              </div>
            </div>

            {/* Manual Override */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-semibold">Allow Manual Override</Label>
                <p className="text-sm text-gray-600">
                  Let enrollment officers change the automatically assigned class
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_manual_override}
                onChange={(e) => updateSetting('allow_manual_override', e.target.checked)}
                className="w-5 h-5"
              />
            </div>

            {/* Grade-Based Placement Details */}
            {settings.class_assignment_method === 'auto_grade_based' && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-blue-900">Grade-Based Placement Rules</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>• <strong>80%+ average:</strong> Best class (class_rank = 1)</p>
                  <p>• <strong>60-79% average:</strong> Middle classes</p>
                  <p>• <strong>40-59% average:</strong> Lower-middle classes</p>
                  <p>• <strong>Below 40%:</strong> Last class (highest class_rank)</p>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  💡 Make sure to set <code>class_rank</code> for each class (1 = best, higher = lower performing)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Required Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Required Documents
            </CardTitle>
            <CardDescription>
              What documents must be provided during enrollment?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'require_birth_certificate', label: 'Birth Certificate', desc: 'Student birth certificate copy' },
              { key: 'require_student_id', label: 'Student ID/Passport', desc: 'Student national ID or passport' },
              { key: 'require_parent_id', label: 'Parent ID', desc: 'Parent/guardian national ID copy' },
              { key: 'require_fee_slip', label: 'Fee Payment Slip', desc: 'Proof of fee payment' },
              { key: 'require_previous_school_report', label: 'Previous School Report', desc: 'Report card from previous school' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-semibold">{item.label}</Label>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings[item.key as keyof EnrollmentSettings] as boolean}
                  onChange={(e) => updateSetting(item.key as keyof EnrollmentSettings, e.target.checked)}
                  className="w-5 h-5"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Fee Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Fee Payment Rules
            </CardTitle>
            <CardDescription>
              Configure fee requirements for enrollment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Minimum Fee Percentage Required</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.minimum_fee_percentage}
                  onChange={(e) => updateSetting('minimum_fee_percentage', parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
                <span>%</span>
              </div>
              <p className="text-sm text-gray-600">
                {settings.minimum_fee_percentage === 0 
                  ? 'Any payment amount is accepted'
                  : `Student must pay at least ${settings.minimum_fee_percentage}% of total fees`}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label className="font-semibold">Allow Enrollment Without Payment</Label>
                <p className="text-sm text-gray-600">Enroll students even if no fee payment is made</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_enrollment_without_payment}
                onChange={(e) => updateSetting('allow_enrollment_without_payment', e.target.checked)}
                className="w-5 h-5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Username/Password Format */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Account Credentials Format
            </CardTitle>
            <CardDescription>
              How student and parent usernames/passwords are generated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username Format</Label>
              <Select 
                value={settings.username_format}
                onValueChange={(v) => updateSetting('username_format', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surname_birthyear">Surname + Birth Year (sedze2003)</SelectItem>
                  <SelectItem value="email">Email Address</SelectItem>
                  <SelectItem value="firstname_surname">Firstname + Surname (wilsonsedze)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Password Format</Label>
              <Select 
                value={settings.password_format}
                onValueChange={(v) => updateSetting('password_format', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id_number">ID Number without dashes (732987414r42)</SelectItem>
                  <SelectItem value="random">Random 8-character password</SelectItem>
                  <SelectItem value="birthdate">Birth date (20030515)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-sm">
              <p className="font-semibold text-green-900 mb-2">Example Credentials:</p>
              <p className="text-green-800">
                Student: <span className="font-mono">sedze2003</span> / <span className="font-mono">732987414r42</span>
              </p>
              <p className="text-green-800">
                Parent: <span className="font-mono">sedze1982</span> / <span className="font-mono">730876606e12</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>What notifications to send after enrollment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'notify_parent_on_enrollment', label: 'Notify Parent on Enrollment', desc: 'Send email/SMS to parent with credentials' },
              { key: 'notify_admin_on_enrollment', label: 'Notify Admin on Enrollment', desc: 'Send notification to school admin' },
              { key: 'send_welcome_email', label: 'Send Welcome Email', desc: 'Send welcome email with login instructions' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-semibold">{item.label}</Label>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings[item.key as keyof EnrollmentSettings] as boolean}
                  onChange={(e) => updateSetting(item.key as keyof EnrollmentSettings, e.target.checked)}
                  className="w-5 h-5"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bulk Upload Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Bulk Upload Settings</CardTitle>
            <CardDescription>Configure CSV/Excel bulk enrollment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label className="font-semibold">Allow Bulk Upload</Label>
                <p className="text-sm text-gray-600">Enable CSV/Excel bulk student enrollment</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_bulk_upload}
                onChange={(e) => updateSetting('allow_bulk_upload', e.target.checked)}
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label className="font-semibold">Skip Fee Slip for Bulk Uploads</Label>
                <p className="text-sm text-gray-600">Don't require fee slip when uploading via CSV</p>
              </div>
              <input
                type="checkbox"
                checked={settings.bulk_upload_skip_fee_slip}
                onChange={(e) => updateSetting('bulk_upload_skip_fee_slip', e.target.checked)}
                className="w-5 h-5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button at Bottom */}
        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving} size="lg" className="bg-green-600 hover:bg-green-700">
            {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save All Settings</>}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default EnrollmentSettingsPage
