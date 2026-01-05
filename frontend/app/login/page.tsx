'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, School, GraduationCap, Users, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [schools, setSchools] = useState<any[]>([])
  const [currentSchoolIndex, setCurrentSchoolIndex] = useState(0)
  const { signIn, user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  // Load schools for the carousel
  useEffect(() => {
    const loadSchools = async () => {
      const { data } = await supabase
        .from('schools')
        .select('id, name, logo_url')
        .eq('status', 'active')
        .order('name')
      
      if (data) {
        setSchools(data)
      }
    }
    loadSchools()
  }, [])

  // Animate school logos carousel
  useEffect(() => {
    if (schools.length > 0) {
      const interval = setInterval(() => {
        setCurrentSchoolIndex((prev) => (prev + 1) % schools.length)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [schools.length])

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && profile) {
      router.replace('/dashboard')
    }
  }, [user, profile, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Lookup email from username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email, username')
        .ilike('username', username.trim())
        .maybeSingle()

      if (profileError) {
        toast.error('Login failed', {
          description: profileError.message || 'Username not found',
        })
        setLoading(false)
        return
      }

      if (!profileData) {
        toast.error('Login failed', {
          description: 'Username not found. Please check your username.',
        })
        setLoading(false)
        return
      }

      // Sign in
      const { error: signInError } = await signIn(profileData.email, password)

      if (signInError) {
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
      await new Promise(resolve => setTimeout(resolve, 500))
      router.replace('/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error('Login failed', {
        description: error.message,
      })
      setLoading(false)
    }
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="w-full py-4 px-6 bg-white/80 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                SmartSchools Africa
              </h1>
              <p className="text-xs text-gray-600">by Robokorda Africa</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-blue-600" />
              <span>{schools.length} Partner Schools</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
          {/* Left Side - Features & School Partners */}
          <div className="space-y-8 hidden md:block">
            {/* Welcome Section */}
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-gray-900">
                Welcome to the Future of
                <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  School Management
                </span>
              </h2>
              <p className="text-lg text-gray-600">
                Empowering education institutions across Africa with innovative technology solutions
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Student Management</h3>
                <p className="text-sm text-gray-600">Comprehensive enrollment and tracking</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Academic Records</h3>
                <p className="text-sm text-gray-600">Digital report cards and grades</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <School className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Multi-School Support</h3>
                <p className="text-sm text-gray-600">Manage multiple institutions</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Teacher Portal</h3>
                <p className="text-sm text-gray-600">Efficient classroom management</p>
              </div>
            </div>

            {/* School Partners Showcase */}
            {schools.length > 0 && (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4 text-center">
                  Our Partner Schools
                </h3>
                <div className="relative h-24 flex items-center justify-center overflow-hidden">
                  {schools.map((school, index) => (
                    <div
                      key={school.id}
                      className={`absolute transition-all duration-700 ${
                        index === currentSchoolIndex
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 scale-75'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {school.logo_url ? (
                          <div className="relative w-16 h-16 bg-white rounded-full shadow-md p-2">
                            <Image
                              src={school.logo_url}
                              alt={school.name}
                              fill
                              className="object-contain p-1"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
                            <School className="w-8 h-8 text-white" />
                          </div>
                        )}
                        <p className="text-sm font-medium text-gray-900">{school.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Indicator dots */}
                <div className="flex justify-center gap-2 mt-4">
                  {schools.slice(0, 5).map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentSchoolIndex % 5
                          ? 'w-8 bg-blue-600'
                          : 'w-1.5 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Login Form */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
                <CardDescription className="text-center">
                  Enter your credentials to access your dashboard
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
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>

                {/* Mobile School Partners */}
                {schools.length > 0 && (
                  <div className="md:hidden mt-6 pt-6 border-t">
                    <p className="text-xs text-center text-gray-500 mb-3">
                      Trusted by {schools.length} schools across Africa
                    </p>
                    <div className="flex justify-center gap-2 flex-wrap">
                      {schools.slice(0, 4).map((school) => (
                        <div
                          key={school.id}
                          className="w-10 h-10 bg-white rounded-full shadow-sm p-1.5 border border-gray-200"
                        >
                          {school.logo_url ? (
                            <Image
                              src={school.logo_url}
                              alt={school.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <School className="w-full h-full text-gray-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 bg-white/80 backdrop-blur-sm border-t">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center md:text-left">
                <p className="text-sm font-semibold text-gray-900">SmartSchools Africa</p>
                <p className="text-xs text-gray-600">A Robokorda Africa Initiative</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs text-gray-600">
              <span>© {new Date().getFullYear()} Robokorda Africa</span>
              <span className="hidden md:inline">•</span>
              <span>All Rights Reserved</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 text-xs text-gray-500">
              <span className="font-medium">Powered by</span>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold">
                  Robokorda Africa
                </span>
                <span className="text-gray-400">×</span>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-semibold">
                  SmartSchools Project
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
