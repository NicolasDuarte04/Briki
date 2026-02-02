'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function AuthErrorPage() {
  const t = useTranslations('auth.error')

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('title')}</CardTitle>
          <CardDescription className="text-base">
            {t('subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            {t('description')}
          </p>
          
          <div className="space-y-2">
            <Button className="w-full" asChild>
              <Link href="/register">{t('signUpAgain')}</Link>
            </Button>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/login">{t('goToLogin')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
