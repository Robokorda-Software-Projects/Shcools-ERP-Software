'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect to the main exams management page
export default function SchoolAdminExamsPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/dashboard/exams')
  }, [router])

  return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  )
}
