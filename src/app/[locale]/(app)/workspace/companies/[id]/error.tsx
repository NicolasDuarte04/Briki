// /src/app/[locale]/(app)/workspace/companies/[id]/error.tsx
'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CompanyDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Company detail error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Error al cargar la empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Ocurrió un error al cargar los detalles de la empresa. 
            Esto puede deberse a un problema de conexión o a que la empresa no existe.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto">
              {error.message}
            </pre>
          )}
          
          <div className="flex gap-2">
            <Button onClick={reset}>
              Intentar de nuevo
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
