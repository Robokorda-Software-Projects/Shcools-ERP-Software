'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername')
    const savedPassword = localStorage.getItem('rememberedPassword')
    const wasRemembered = localStorage.getItem('rememberMe') === 'true'
    
    if (wasRemembered && savedUsername && savedPassword) {
      setUsername(savedUsername)
      setPassword(savedPassword)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Looking up username:', username)
      
      // First, get the email from username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email, username, role')
        .eq('username', username)
        .single()

      console.log('Profile lookup result:', { profileData, profileError })

      if (profileError) {
        console.error('Profile lookup error details:', profileError)
        toast.error('Login failed', {
          description: `Error: ${profileError.message || 'Username not found'}`,
        })
        setLoading(false)
        return
      }

      if (!profileData) {
        toast.error('Login failed', {
          description: 'Invalid username',
        })
        setLoading(false)
        return
      }

      console.log('Found profile, attempting auth with email:', profileData.email)

      // Then login with email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password: password,
      })

      console.log('Auth result:', { authData, authError })

      if (authError) {
        console.error('Auth error details:', authError)
        toast.error('Login failed', {
          description: authError.message || 'Invalid password',
        })
        setLoading(false)
        return
      }

      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username)
        localStorage.setItem('rememberedPassword', password)
        localStorage.setItem('rememberMe', 'true')
      } else {
        localStorage.removeItem('rememberedUsername')
        localStorage.removeItem('rememberedPassword')
        localStorage.removeItem('rememberMe')
      }

      toast.success('Login successful!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error('Login failed', {
        description: 'An unexpected error occurred',
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-blue-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold bg-linear-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            School ERP
          </CardTitle>
          <CardDescription className="text-base">
            Enter your credentials to access your account
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
                className="h-11"
                autoComplete="username"
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
                className="h-11"
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember" 
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={loading}
              />
              <Label 
                htmlFor="remember" 
                className="text-sm font-normal cursor-pointer"
              >
                Remember me
              </Label>
            </div>
            <Button type="submit" className="w-full h-11 text-base bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-center text-sm text-gray-600">
              Need help? Contact your administrator
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
