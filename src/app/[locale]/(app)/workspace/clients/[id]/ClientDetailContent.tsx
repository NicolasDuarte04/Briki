// /src/app/[locale]/(app)/workspace/clients/[id]/ClientDetailContent.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2, Shield, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { DecryptedClient } from '@/lib/clientsDb';

interface ClientDetailContentProps {
  client: DecryptedClient;
  clientId: string;
  orgId: string;
}

export function ClientDetailContent({ client, clientId, orgId }: ClientDetailContentProps) {
  const {
    deleteDialogOpen,
    setDeleteDialogOpen,
    isDeleting,
    handleDeleteClick,
    handleDeleteConfirm
  } = useDeleteConfirmation({
    deleteApiEndpoint: `/api/clients/${clientId}/delete`,
    redirectPath: '/workspace/clients',
    itemName: 'cliente'
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/workspace/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {client.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Información cifrada en la base de datos
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/workspace/clients/${clientId}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-2"
              onClick={() => handleDeleteClick(clientId)}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
        
        {/* Client Information Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.email ? (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{client.email}</div>
                    <a 
                      href={`mailto:${client.email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Enviar correo
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="text-muted-foreground italic">No registrado</div>
                  </div>
                </div>
              )}
              
              {client.phone ? (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Teléfono</div>
                    <div className="font-medium">{client.phone}</div>
                    <a 
                      href={`tel:${client.phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Llamar
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Teléfono</div>
                    <div className="text-muted-foreground italic">No registrado</div>
                  </div>
                </div>
              )}
              
              {client.address ? (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Dirección</div>
                    <div className="font-medium">{client.address}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Dirección</div>
                    <div className="text-muted-foreground italic">No registrada</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Registro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Creado:</span>
                <span className="font-medium">{formatDate(client.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Última actualización:</span>
                <span className="font-medium">{formatDate(client.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 text-sm">Seguridad de Datos</h3>
                <p className="text-xs text-blue-700 mt-1">
                  Todos los datos personales de este cliente están cifrados en la base de datos usando encriptación AES-256. 
                  Solo los miembros autorizados de tu organización pueden acceder a esta información.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        itemName={client.name}
        itemType="cliente"
      />
    </>
  );
}
