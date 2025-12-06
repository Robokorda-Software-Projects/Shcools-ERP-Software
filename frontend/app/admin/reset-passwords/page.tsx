'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ResetResult {
  email: string
  username?: string
  role?: string
  success: boolean
  error?: string
}

export default function ResetPasswordsPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ResetResult[]>([])
  const [completed, setCompleted] = useState(false)

  const handleResetAllPasswords = async () => {
    setLoading(true)
    setResults([])
    setCompleted(false)

    try {
      const response = await fetch('/api/admin/reset-passwords', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error('Failed to reset passwords', {
          description: data.error || 'An error occurred',
        })
        setLoading(false)
        return
      }

      setResults(data.results || [])
      setCompleted(true)

      const successCount = (data.results || []).filter((r: ResetResult) => r.success).length
      const totalCount = data.results?.length || 0

      toast.success(`Password reset complete!`, {
        description: `${successCount} of ${totalCount} accounts updated successfully.`,
      })
    } catch (error: any) {
      toast.error('Error', {
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const successCount = results.filter((r) => r.success).length
  const failureCount = results.filter((r) => !r.success).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Reset Test Account Passwords</CardTitle>
            <CardDescription>
              This will reset passwords for all test accounts to their defaults and mark emails as confirmed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!completed ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 font-medium">⚠️ Warning</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    This will reset all test account passwords. Existing sessions will remain active but new logins
                    will require the new passwords.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-medium">Default Passwords</p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Teachers: <code className="bg-white px-2 py-1 rounded">Teacher123!</code></li>
                    <li>• Students: <code className="bg-white px-2 py-1 rounded">Student123!</code></li>
                    <li>• Admins: <code className="bg-white px-2 py-1 rounded">Admin123!</code></li>
                    <li>• Parents: <code className="bg-white px-2 py-1 rounded">Parent123!</code></li>
                  </ul>
                </div>

                <Button
                  onClick={handleResetAllPasswords}
                  disabled={loading}
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting passwords...
                    </>
                  ) : (
                    'Reset All Test Passwords'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700 font-medium">✓ Successful</p>
                    <p className="text-2xl font-bold text-green-900">{successCount}</p>
                  </div>
                  {failureCount > 0 && (
                    <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-700 font-medium">✗ Failed</p>
                      <p className="text-2xl font-bold text-red-900">{failureCount}</p>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b px-4 py-3">
                    <h3 className="font-semibold text-sm">Reset Results</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {results.map((result, idx) => (
                      <div key={idx} className="border-b last:border-b-0 px-4 py-3 flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{result.email}</p>
                          {result.username && (
                            <p className="text-xs text-gray-600 mt-1">Username: {result.username}</p>
                          )}
                          {result.error && (
                            <p className="text-xs text-red-600 mt-1">{result.error}</p>
                          )}
                        </div>
                        {result.success ? (
                          <Badge className="bg-green-100 text-green-800 ml-2">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Success
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 ml-2">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={() => setCompleted(false)} variant="outline" className="w-full">
                  Reset Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
