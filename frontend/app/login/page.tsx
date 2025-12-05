'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('=== LOGIN ATTEMPT ===')
      console.log('Username entered:', username)
      console.log('Supabase client:', supabase)

      // Test if supabase is working
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)

      console.log('Supabase test query:', { testData, testError })

      // Lookup email from username
      console.log('Looking up username:', username)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email, username')
        .eq('username', username)
        .single()

      console.log('=== PROFILE LOOKUP RESULT ===')
      console.log('profileData:', profileData)
      console.log('profileError:', profileError)
      console.log('profileError type:', typeof profileError)
      console.log('profileError keys:', profileError ? Object.keys(profileError) : 'null')

      if (profileError) {
        console.error('Profile error details:', JSON.stringify(profileError, null, 2))
        toast.error('Login failed', {
          description: profileError.message || 'Username not found',
        })
        setLoading(false)
        return
      }

      if (!profileData) {
        console.error('No profile data returned')
        toast.error('Login failed', {
          description: 'Username not found',
        })
        setLoading(false)
        return
      }

      console.log('Found profile, email:', profileData.email)

      // Sign in
      const { error: signInError } = await signIn(profileData.email, password)

      if (signInError) {
        console.error('Sign in error:', signInError)
        toast.error('Login failed', {
          description: signInError.message,
        })
        setLoading(false)
        return
      }

      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username)
      } else {
        localStorage.removeItem('rememberedUsername')
      }

      toast.success('Login successful!')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Catch block error:', error)
      toast.error('Login failed', {
        description: error.message,
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Eschools ERP</CardTitle>
          <CardDescription className="text-center">
            Enter your username and password to login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="e.g., SA-00000001"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Remember me
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
