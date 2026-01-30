// /src/components/Clients/ClientForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Shield } from 'lucide-react';
import type { DecryptedClient } from '@/lib/clientsDb';

interface ClientFormProps {
  orgId: string;
  client?: DecryptedClient; // Si se proporciona, es modo edición
}

export function ClientForm({ orgId, client }: ClientFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const isEditMode = !!client;
  
  const resetForm = () => {
    const form = document.getElementById('client-form') as HTMLFormElement;
    if (form) {
      form.reset();
    }
    setError(null);
    setSuccess(null);
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const endpoint = isEditMode 
        ? `/api/clients/${client.id}/update`
        : '/api/clients/create';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgId,
          name: formData.get('name'),
          email: formData.get('email') || undefined,
          phone: formData.get('phone') || undefined,
          address: formData.get('address') || undefined,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar el cliente');
      }
      
      const data = await response.json();
      const clientId = isEditMode ? client.id : data.id;
      
      setSuccess(isEditMode ? '¡Cliente actualizado exitosamente!' : '¡Cliente creado exitosamente!');
      if (!isEditMode) {
        resetForm();
      }
      
      // Redirigir después de 2 segundos para que el usuario vea el mensaje
      setTimeout(() => {
        router.push(`/${locale}/workspace/clients/${clientId}`);
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      
      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 text-sm">Cifrado Automático</h3>
            <p className="text-xs text-blue-700 mt-1">
              Todos los datos que ingreses serán automáticamente cifrados antes de ser almacenados en la base de datos.
            </p>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
          <CardDescription>
            Los campos marcados con * son obligatorios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre Completo *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ej: Juan Pérez García"
              defaultValue={client?.name}
              required
              autoFocus={!isEditMode}
            />
            <p className="text-xs text-muted-foreground">
              Nombre completo del cliente o empresa
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ejemplo@correo.com"
              defaultValue={client?.email || ''}
            />
            <p className="text-xs text-muted-foreground">
              Email principal de contacto
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+52 (555) 123-4567"
              defaultValue={client?.phone || ''}
            />
            <p className="text-xs text-muted-foreground">
              Número de teléfono con código de país
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              name="address"
              placeholder="Calle Principal #123, Col. Centro, Ciudad, CP 12345"
              rows={3}
              defaultValue={client?.address || ''}
            />
            <p className="text-xs text-muted-foreground">
              Dirección completa del cliente
            </p>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditMode ? 'Guardando...' : 'Creando...'}
            </>
          ) : (
            isEditMode ? 'Guardar Cambios' : 'Crear Cliente'
          )}
        </Button>
      </div>
    </form>
  );
}
