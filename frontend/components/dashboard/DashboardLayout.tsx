'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  LayoutDashboard, 
  School, 
  GraduationCap, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  UserCog,
  Link2,
  BookOpen,
  Menu,
  X,
  Bell,
  HelpCircle,
  Home,
  BarChart3,
  CalendarDays,
  Download,
  Upload,
  MessageSquare,
  Star,
  Award,
  Trophy,
  Shield,
  Globe,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null)
  const [schoolName, setSchoolName] = useState<string>('SmartSchools')
  const [notifications] = useState(0)

  useEffect(() => {
    if (profile?.school_id) {
      loadSchoolInfo()
    }
  }, [profile])

  const loadSchoolInfo = async () => {
    if (!profile?.school_id) return

    try {
      const { data } = await supabase
        .from('schools')
        .select('name, school_code, school_type')
        .eq('id', profile.school_id)
        .single()

      if (data) {
        setSchoolName(data.name)
        // Set logo based on school type
        const logoPath = data.school_type === 'Primary' 
          ? '/images/logos/schools/example-primary/logo.png'
          : '/images/logos/schools/example-secondary/logo.png'
        setSchoolLogo(logoPath)
      }
    } catch (error) {
      console.error('Error loading school info:', error)
    }
  }

  const getNavItems = () => {
    const role = profile?.role

    if (role === 'super_admin') {
      return [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/schools', icon: School, label: 'Schools' },
        { href: '/dashboard/classes', icon: GraduationCap, label: 'Classes' },
        { href: '/dashboard/teacher-assignments', icon: UserCog, label: 'Teacher Assignments' },
        { href: '/dashboard/students', icon: Users, label: 'Students' },
        { href: '/dashboard/parents', icon: Link2, label: 'Parent Management' },
        { href: '/dashboard/exams', icon: FileText, label: 'Exams' },
        { href: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
      ]
    }

    if (role === 'school_admin') {
      return [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/classes', icon: GraduationCap, label: 'Classes' },
        { href: '/dashboard/teacher-assignments', icon: UserCog, label: 'Teacher Assignments' },
        { href: '/dashboard/students', icon: Users, label: 'Students' },
        { href: '/dashboard/parents', icon: Link2, label: 'Parent Management' },
        { href: '/dashboard/exams', icon: FileText, label: 'Exams' },
        { href: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
        { href: '/dashboard/calendar', icon: CalendarDays, label: 'Calendar' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
      ]
    }

    if (role === 'teacher') {
      return [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/classes', icon: GraduationCap, label: 'My Classes' },
        { href: '/dashboard/attendance', icon: Users, label: 'Attendance' },
        { href: '/dashboard/assignments', icon: FileText, label: 'Assignments' },
        { href: '/dashboard/lesson-plans', icon: BookOpen, label: 'Lesson Plans' },
        { href: '/dashboard/exams', icon: FileText, label: 'Exams' },
      ]
    }

    if (role === 'student') {
      return [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/my-grades', icon: BookOpen, label: 'My Grades' },
        { href: '/dashboard/assignments', icon: FileText, label: 'Assignments' },
        { href: '/dashboard/timetable', icon: CalendarDays, label: 'Timetable' },
        { href: '/dashboard/resources', icon: Download, label: 'Resources' },
      ]
    }

    if (role === 'parent') {
      return [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/children-grades', icon: BookOpen, label: "Children's Grades" },
        { href: '/dashboard/attendance', icon: Users, label: 'Attendance' },
        { href: '/dashboard/communications', icon: MessageSquare, label: 'Communications' },
      ]
    }

    return []
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const handleNavClick = () => {
    setSidebarOpen(false)
  }

  const navItems = getNavItems()
  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-white hover:bg-white/20"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          <div className="flex items-center gap-2">
            {schoolLogo ? (
              <div className="relative h-8 w-8">
                <Image
                  src={schoolLogo}
                  alt={schoolName}
                  fill
                  className="rounded-md object-contain"
                />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-md bg-white/20 flex items-center justify-center">
                <School className="h-5 w-5" />
              </div>
            )}
            <h1 className="text-lg font-semibold">{title || 'Dashboard'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 relative"
          >
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs flex items-center justify-center">
                {notifications}
              </span>
            )}
          </Button>
          <Avatar className="h-8 w-8 border-2 border-white/30">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static top-0 left-0 h-screen lg:h-auto bg-white shadow-xl z-50
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:z-auto
          w-72 flex flex-col
        `}
      >
        {/* Logo/Brand Section */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {schoolLogo ? (
              <div className="relative h-15 w-15 mt-2 mb-2">
                <Image
                  src={schoolLogo}
                  alt={schoolName}
                  fill
                  className="rounded-lg object-contain border-2 border-blue/30 shadow-lg"
                />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center shadow-lg">
                <GraduationCap className="h-7 w-7 text-blue-700" />
              </div>
            )}
            <div>
              <h1 className="text-m font-bold text-black leading-tight">{schoolName}</h1>
              <div className="flex items-center gap-1">
                
                <span className="text-[10px] text-blue-300">Powered by Robokorda</span>
              </div>
            </div>
          </div>
          <Shield className="h-5 w-5 text-white/70" />
        </div>

        

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Main Menu</p>
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-l-4 border-blue-600 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-200'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.label === 'Assignments' && (
                    <span className="h-5 w-5 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center">
                      3
                    </span>
                  )}
                  {item.label === 'Exams & Tests' && (
                    <span className="h-5 w-5 rounded-full bg-orange-100 text-orange-600 text-xs flex items-center justify-center">
                      2
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-12 w-12 border-2 border-white shadow-md">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {profile?.full_name}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-500 truncate capitalize">
                  {profile?.role?.replace('_', ' ')}
                </p>
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Robokorda Footer */}
        <div className="border-t border-gray-200 p-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8">
                <Image
                  src="/images/logos/robokorda/logo.png"
                  alt="Robokorda"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">Robokorda Africa</p>
                <p className="text-[10px] text-gray-500">Empowering Education</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.open('https://robokorda.co.zw', '_blank')}
            >
              <Globe className="h-3 w-3 text-blue-600" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pt-16 lg:pt-0 overflow-y-auto">
        {/* Top Bar */}
        <div className="hidden lg:flex items-center justify-between p-6 pb-2">
          <div>
            {title && (
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Home className="h-3 w-3 text-gray-400" />
              <span className="text-sm text-gray-500">
                Dashboard / <span className="text-blue-600 font-medium">{title}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </Button>
            <div className="h-8 w-px bg-gray-300"></div>
            
          </div>
        </div>

        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-gray-200 bg-white">
          <div className="p-6">
            
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <a href="https://www.robokorda.com/" className="text-sm text-gray-600 hover:text-blue-600">Privacy Policy</a>
                  <a href="https://www.robokorda.com/" className="text-sm text-gray-600 hover:text-blue-600">Terms of Service</a>
                  <a href="https://www.robokorda.com/product-details/" className="text-sm text-gray-600 hover:text-blue-600">Support</a>
                  <a href="https://www.robokorda.com/product-details/" className="text-sm text-gray-600 hover:text-blue-600">Contact</a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    © {new Date().getFullYear()} Robokorda Africa. All rights reserved.
                  </span>
                  <Badge variant="outline" className="text-xs">
                    v1.0.0
                  </Badge>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                   Designed and developed with ❤️ for African schools
                </p>
              </div>
            
          </div>
        </footer>
      </main>
    </div>
  )
}