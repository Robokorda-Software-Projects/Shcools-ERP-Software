'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

/**
 * Dashboard Router
 * 
 * This page redirects users to their role-specific dashboard:
 * - super_admin → /dashboard/super-admin
 * - school_admin → /dashboard/school-admin
 * - enrollment_officer → /dashboard/enrollment-officer
 * - bursar → /dashboard/bursar (uses enrollment-officer for now)
 * - teacher → /dashboard/teacher
 * - student → /dashboard/student
 * - parent → /dashboard/parent
 */
export default function DashboardRouterPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (!authLoading && profile) {
      // Route to role-specific dashboard
      switch (profile.role) {
        case 'super_admin':
          router.replace('/dashboard/super-admin')
          break
        case 'school_admin':
          router.replace('/dashboard/school-admin')
          break
        case 'enrollment_officer':
          router.replace('/dashboard/enrollment-officer')
          break
        case 'teacher':
          router.replace('/dashboard/teacher')
          break
        case 'student':
          router.replace('/dashboard/student')
          break
        case 'parent':
          router.replace('/dashboard/parent')
          break
        default:
          // Unknown role, stay on loading state
          console.error('Unknown role:', profile.role)
      }
    }
  }, [user, profile, authLoading, router])

  // Show loading state while redirecting
  return (
    <DashboardLayout title="Dashboard">
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    </DashboardLayout>
  )
}