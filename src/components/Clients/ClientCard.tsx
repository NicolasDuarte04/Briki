// /src/components/Clients/ClientCard.tsx
'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, User, Shield } from 'lucide-react';
import { PinButton } from '@/components/Workspace/PinButton';
import type { DecryptedClient } from '@/lib/clientsDb';

interface ClientCardProps {
  client: DecryptedClient;
  /** Whether this client is pinned by the user */
  isPinned?: boolean;
}

export function ClientCard({ client, isPinned = false }: ClientCardProps) {
  const t = useTranslations('clients.card');
  const locale = useLocale();
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <Card className="hover:shadow-lg transition-shadow h-full relative group overflow-hidden">
      <Link href={`/workspace/clients/${client.id}`} className="block h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 w-full overflow-hidden">
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="font-semibold text-lg truncate max-w-full" title={client.name}>
                  {client.name}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3 shrink-0" />
                  <span>{t('encryptedData')}</span>
                </div>
              </div>
            </div>
            {/* Pin button - stops propagation to prevent Link activation */}
            <div className="shrink-0 flex-nowrap">
              <PinButton
                entityId={client.id}
                entityType="client"
                isPinned={isPinned}
              />
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
              <span className="italic">{t('noEmail')}</span>
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
              <span className="italic">{t('noPhone')}</span>
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
              <span className="italic">{t('noAddress')}</span>
            </div>
          )}
          
          {/* Completeness badge */}
          <div className="pt-2">
            {[client.email, client.phone, client.address].filter(Boolean).length === 3 ? (
              <Badge variant="default" className="text-xs">
                {t('profileComplete')}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {t('profileIncomplete')}
              </Badge>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-3 border-t text-xs text-muted-foreground">
          {t('created')} {formatDate(client.createdAt)}
        </CardFooter>
      </Link>
    </Card>
  );
}
