'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  X
} from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      ]
    }

    if (role === 'teacher') {
      return [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/classes', icon: GraduationCap, label: 'Classes' },
        { href: '/dashboard/students', icon: Users, label: 'Students' },
        { href: '/dashboard/exams', icon: FileText, label: 'Exams' },
        { href: '/dashboard/lesson-plans', icon: BookOpen, label: 'Lesson Plans' },
        { href: '/dashboard/assignments', icon: FileText, label: 'Assignments' },
        { href: '/dashboard/attendance', icon: Users, label: 'Attendance' },
      ]
    }

    if (role === 'student') {
      return [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/my-grades', icon: BookOpen, label: 'My Grades' },
      ]
    }

    if (role === 'parent') {
      return [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/children-grades', icon: BookOpen, label: "Children's Grades" },
      ]
    }

    return []
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const handleNavClick = () => {
    setSidebarOpen(false) // Close sidebar on mobile after clicking a link
  }

  const navItems = getNavItems()
  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          <h1 className="text-lg font-semibold">{title || 'Dashboard'}</h1>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-blue-600 text-white text-xs">{initials}</AvatarFallback>
        </Avatar>
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
          fixed lg:static top-0 left-0 h-screen lg:h-auto bg-white border-r border-gray-200 z-50
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:z-auto
          w-64 flex flex-col
        `}
      >
        {/* Logo/Brand */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 px-4">
          <h1 className="text-xl font-bold text-gray-800">Eschools ERP</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-600 text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {profile?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pt-16 lg:pt-0 overflow-y-auto">
        <div className="p-4 lg:p-8">
          {/* Desktop Title */}
          {title && (
            <div className="hidden lg:block mb-6">
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
