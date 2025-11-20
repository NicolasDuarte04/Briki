'use client';

import dynamic from 'next/dynamic';

// Importaciones dinámicas para componentes client-side
const PdfUploader = dynamic(() => import('@/components/Upload/PdfUploader').then(mod => ({ default: mod.PdfUploader })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted h-32 rounded-lg"></div>
});

const AuditTimeline = dynamic(() => import('@/components/Audit/AuditTimeline').then(mod => ({ default: mod.AuditTimeline })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted h-16 rounded-lg"></div>
});

interface CaseDetailClientProps {
  caseId: string;
  orgId: string;
  auditLogs: any[];
  type?: 'uploader' | 'timeline';
}

export function CaseDetailClient({ caseId, orgId, auditLogs, type = 'uploader' }: CaseDetailClientProps) {
  if (type === 'uploader') {
    return <PdfUploader caseId={caseId} orgId={orgId} />;
  }
  
  if (type === 'timeline') {
    return <AuditTimeline logs={auditLogs} />;
  }
  
  return null;
}
