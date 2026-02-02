'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Suspense } from 'react'
import { useTranslations } from 'next-intl'

function VerifyContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const t = useTranslations('auth.verify')

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Mail className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('title')}</CardTitle>
          <CardDescription className="text-base">
            {t('subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="font-medium text-foreground">{email || t('emailPlaceholder')}</p>
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            {t('instructions')}
          </p>
          
          <div className="space-y-2">
            <Button className="w-full" variant="outline" asChild>
              <Link href="/login">{t('backToLogin')}</Link>
            </Button>
          </div>
          
          <p className="text-center text-xs text-muted-foreground">
            {t('noEmail')}{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              {t('tryAgain')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  )
}
