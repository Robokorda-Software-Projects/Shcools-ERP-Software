'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserPlus, FileText, GraduationCap } from 'lucide-react'
import Link from 'next/link'

export default function StudentsPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students Management</h1>
          <p className="text-gray-600 mt-2">Manage student enrollment, records, and information</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/dashboard/students/enrolled">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Enrolled Students
                </CardTitle>
                <CardDescription>View and manage enrolled students</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Browse, edit, and manage all enrolled students in the system</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/students/enroll-new">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Enroll New Student
                </CardTitle>
                <CardDescription>Add a new student individually</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Create a new student account and enroll them in classes</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/students/bulk-enroll">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Bulk Enrollment
                </CardTitle>
                <CardDescription>Import multiple students at once</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Upload CSV file to enroll multiple students simultaneously</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
