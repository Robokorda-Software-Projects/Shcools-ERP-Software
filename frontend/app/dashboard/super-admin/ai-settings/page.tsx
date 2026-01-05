'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Settings, Brain, Save, Eye, EyeOff, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

interface SystemSettings {
  id: string
  openai_api_key: string | null
  ai_model: string
  ai_parsing_enabled: boolean
  ai_fallback_threshold: number
  max_ai_requests_per_day: number
}

const AISettingsPage = () => {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (!authLoading && profile?.role !== 'super_admin') {
      router.push('/dashboard')
      toast.error('Access denied: Super Admin only')
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      loadSettings()
    }
  }, [profile])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single()

      if (error) {
        // Create default settings if none exist
        const { data: newSettings, error: insertError } = await supabase
          .from('system_settings')
          .insert([{
            ai_parsing_enabled: false,
            ai_model: 'gpt-4o-mini',
            ai_fallback_threshold: 0.6,
            max_ai_requests_per_day: 100
          }])
          .select()
          .single()

        if (insertError) throw insertError
        setSettings(newSettings)
      } else {
        setSettings(data)
      }
    } catch (error: any) {
      console.error('Error loading settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          openai_api_key: settings.openai_api_key,
          ai_model: settings.ai_model,
          ai_parsing_enabled: settings.ai_parsing_enabled,
          ai_fallback_threshold: settings.ai_fallback_threshold,
          max_ai_requests_per_day: settings.max_ai_requests_per_day,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)

      if (error) throw error

      toast.success('AI settings saved successfully!')
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const testAPIKey = async () => {
    if (!settings?.openai_api_key) {
      toast.error('Please enter an API key first')
      return
    }

    setTesting(true)
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${settings.openai_api_key}`
        }
      })

      if (response.ok) {
        toast.success('✅ API key is valid!', {
          description: 'Connection to OpenAI successful'
        })
      } else {
        throw new Error('Invalid API key')
      }
    } catch (error) {
      toast.error('❌ API key is invalid', {
        description: 'Please check your OpenAI API key'
      })
    } finally {
      setTesting(false)
    }
  }

  if (loading || authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (profile?.role !== 'super_admin') {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-600" />
              AI Parsing Settings
            </h1>
            <p className="text-gray-600 mt-1">
              Configure AI-powered file parsing for complex student enrollment files
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            Super Admin Only
          </Badge>
        </div>

        {/* Main Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              OpenAI Configuration
            </CardTitle>
            <CardDescription>
              Configure OpenAI API access for AI-assisted file parsing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Enable/Disable AI Parsing */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <Label className="text-base font-semibold">Enable AI Parsing</Label>
                <p className="text-sm text-gray-600 mt-1">
                  Allow users to use AI for parsing complex CSV/Excel files
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(s => s ? {...s, ai_parsing_enabled: !s.ai_parsing_enabled} : null)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings?.ai_parsing_enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                aria-label="Toggle AI parsing"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.ai_parsing_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-base font-semibold">
                OpenAI API Key *
              </Label>
              <p className="text-sm text-gray-600">
                Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a>
              </p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={settings?.openai_api_key || ''}
                    onChange={(e) => setSettings(s => s ? {...s, openai_api_key: e.target.value} : null)}
                    placeholder="sk-proj-..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={testAPIKey}
                  disabled={testing || !settings?.openai_api_key}
                >
                  {testing ? 'Testing...' : 'Test Key'}
                </Button>
              </div>
            </div>

            {/* AI Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model" className="text-base font-semibold">
                AI Model
              </Label>
              <p className="text-sm text-gray-600">
                Choose the OpenAI model for parsing (gpt-4o-mini recommended for cost efficiency)
              </p>
              <Select
                value={settings?.ai_model}
                onValueChange={(value) => setSettings(s => s ? {...s, ai_model: value} : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Recommended - Fast & Cheap)</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o (More Accurate)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Cheapest)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-lg">Advanced Settings</h3>
              
              <div className="space-y-2">
                <Label htmlFor="threshold">AI Fallback Threshold (0.0 - 1.0)</Label>
                <p className="text-sm text-gray-600">
                  Confidence threshold to trigger AI parsing automatically
                </p>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings?.ai_fallback_threshold}
                  onChange={(e) => setSettings(s => s ? {...s, ai_fallback_threshold: parseFloat(e.target.value)} : null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxRequests">Max AI Requests Per Day</Label>
                <p className="text-sm text-gray-600">
                  Limit daily API calls to control costs
                </p>
                <Input
                  id="maxRequests"
                  type="number"
                  min="1"
                  max="1000"
                  value={settings?.max_ai_requests_per_day}
                  onChange={(e) => setSettings(s => s ? {...s, max_ai_requests_per_day: parseInt(e.target.value)} : null)}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving || !settings?.openai_api_key}
                className="px-6"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              <p><strong>1. Deterministic Parsing First:</strong> System tries standard parsing</p>
              <p><strong>2. AI Fallback:</strong> If file is complex, suggests AI parsing</p>
              <p><strong>3. User Choice:</strong> User clicks &quot;Use AI-Assisted Parsing&quot;</p>
              <p><strong>4. AI Analysis:</strong> OpenAI analyzes file structure</p>
              <p><strong>5. Smart Results:</strong> AI detects headers, class, and maps columns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                Cost Considerations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              <p><strong>GPT-4o-mini:</strong> ~$0.0001 per file (recommended)</p>
              <p><strong>GPT-4o:</strong> ~$0.0005 per file (more accurate)</p>
              <p><strong>Estimation:</strong> 1000 files/month ≈ $0.10 - $0.50</p>
              <p className="text-xs text-gray-600 pt-2 border-t">
                Actual costs depend on file size. Set daily limits to control spending.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AISettingsPage
