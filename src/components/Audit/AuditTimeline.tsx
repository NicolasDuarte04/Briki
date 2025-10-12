'use client';

import { Badge } from '@/components/ui/badge';

interface AuditLogItem {
  id: string;
  action: string;
  actor: string;
  tool?: string | null;
  payloadHash?: string | null;
  payload?: any;
  createdAt: string | Date;
}

export function AuditTimeline({ logs }: { logs: AuditLogItem[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay actividad registrada para este caso
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="border-l-2 border-primary pl-4">
          <div className="flex items-center gap-2">
            <div className="font-medium">{log.action}</div>
            {log.tool && <Badge variant="outline">{log.tool}</Badge>}
          </div>
          <div className="text-sm text-muted-foreground">
            {log.actor} • {new Date(log.createdAt).toLocaleString()}
          </div>
          {log.payload && (
            <pre className="mt-2 bg-muted p-3 rounded text-xs overflow-auto">
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}


