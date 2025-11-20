'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
          <CardDescription className="text-base">
            There was a problem confirming your email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-gray-600">
            The confirmation link may have expired or been used already. Please try signing up or logging in again.
          </p>
          
          <div className="space-y-2">
            <Button className="w-full" asChild>
              <Link href="/register">Sign up again</Link>
            </Button>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/login">Go to login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
