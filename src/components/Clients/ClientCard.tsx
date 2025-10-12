// /src/components/Clients/ClientCard.tsx
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, User, Shield } from 'lucide-react';
import type { DecryptedClient } from '@/lib/clientsDb';

interface ClientCardProps {
  client: DecryptedClient;
}

export function ClientCard({ client }: ClientCardProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <Link href={`/workspace/clients/${client.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {client.name}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>Datos cifrados</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {client.email ? (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground truncate">{client.email}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/50">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="italic">Sin email</span>
            </div>
          )}
          
          {client.phone ? (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{client.phone}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/50">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span className="italic">Sin teléfono</span>
            </div>
          )}
          
          {client.address ? (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground line-clamp-2">{client.address}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/50">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="italic">Sin dirección</span>
            </div>
          )}
          
          {/* Completeness badge */}
          <div className="pt-2">
            {[client.email, client.phone, client.address].filter(Boolean).length === 3 ? (
              <Badge variant="default" className="text-xs">
                Perfil Completo
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Perfil Incompleto
              </Badge>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-3 border-t text-xs text-muted-foreground">
          Creado {formatDate(client.createdAt)}
        </CardFooter>
      </Card>
    </Link>
  );
}
