// /src/components/Clients/ClientList.tsx
'use client';

import { useState } from 'react';
import { ClientCard } from './ClientCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Search, Users } from 'lucide-react';
import type { DecryptedClient } from '@/lib/clientsDb';
import { useTranslations } from 'next-intl';

interface ClientListProps {
  clients: DecryptedClient[];
  orgId: string;
  /** Set of pinned client IDs */
  pinnedClientIds?: Set<string>;
}

export function ClientList({ clients, orgId, pinnedClientIds = new Set() }: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const t = useTranslations('clients.list');
  
  // Filtrar clientes por término de búsqueda
  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phone?.toLowerCase().includes(searchLower)
    );
  });
  
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {t('showingCount', { count: filteredClients.length, total: clients.length })}
      </div>
      
      {/* Clients Grid */}
      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <ClientCard 
              key={client.id} 
              client={client} 
              isPinned={pinnedClientIds.has(client.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchTerm
              ? t('noResults')
              : t('emptyDescription')}
          </p>
          {!searchTerm && (
            <Button asChild className="mt-4">
              <Link href="/workspace/clients/new">
                {t('createFirst')}
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
