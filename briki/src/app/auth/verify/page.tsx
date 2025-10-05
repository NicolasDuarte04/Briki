'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Mail } from 'lucide-react'

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Mail className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription className="text-base">
            We've sent a confirmation link to:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="font-medium text-gray-900">{email || 'your email address'}</p>
          </div>
          
          <p className="text-center text-sm text-gray-600">
            Click the link in your email to verify your account and get started with Briki.
          </p>
          
          <div className="space-y-2">
            <Button className="w-full" variant="outline" asChild>
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
          
          <p className="text-center text-xs text-gray-500">
            Didn't receive an email? Check your spam folder or{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              try signing up again
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}