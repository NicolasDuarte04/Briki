'use client';

import Image from 'next/image';
import { 
  FileText, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle, 
  Shield, 
  FileCheck,
  AlertCircle,
  ArrowRight,
  Copy
} from 'lucide-react';
import { useSafeTranslations } from '@/hooks/useSafeTranslations';

// Mock activity items factory
const createActivityItems = (t: any) => ({
  inProgress: [
    { id: 1, label: t('activities.analyzingPolicy'), status: 'active', progress: 65 },
    { id: 2, label: t('activities.extractingExclusions'), status: 'active', progress: 40 },
    { id: 3, label: t('activities.generatingSummary'), status: 'pending', progress: 0 },
  ],
  completed: [
    { id: 4, label: t('activities.documentProcessed'), status: 'done' },
    { id: 5, label: t('activities.coverageIdentified'), status: 'done' },
  ],
});

// Mock conversation messages factory
const createConversationMessages = () => [
  {
    id: 1,
    role: 'user',
    content: 'Analiza esta póliza de vida y dame un resumen de cobertura, exclusiones y recomendaciones para el cliente.',
    timestamp: '10:24',
  },
  {
    id: 2,
    role: 'assistant',
    content: 'Entendido. Procesando la póliza de vida. Voy a extraer la información clave y generar un análisis completo.',
    timestamp: '10:24',
  },
];

// Mock result rows factory (Cursor-style file change rows)
const createResultRows = () => [
  { 
    id: 1, 
    icon: FileCheck, 
    label: 'Resumen de cobertura', 
    detail: 'Cobertura principal: $500,000 · Beneficiarios: 2',
    status: 'ready' 
  },
  { 
    id: 2, 
    icon: AlertTriangle, 
    label: 'Exclusiones clave', 
    detail: '4 exclusiones identificadas · Riesgo medio',
    status: 'ready' 
  },
  { 
    id: 3, 
    icon: Shield, 
    label: 'Análisis de riesgos', 
    detail: 'Perfil de riesgo: Bajo · Recomendado',
    status: 'ready' 
  },
  { 
    id: 4, 
    icon: FileText, 
    label: 'Recomendación final', 
    detail: 'Póliza adecuada para perfil del cliente',
    status: 'processing' 
  },
];

export function LandingAgentDemo() {
  const { t } = useSafeTranslations('landing.demos.agent');
  const activityItems = createActivityItems(t);
  const conversationMessages = createConversationMessages();
  const resultRows = createResultRows();
  return (
    <div 
      className="w-full max-w-[900px] mx-auto h-full rounded-lg overflow-hidden flex text-sm relative"
      style={{ 
        backgroundColor: 'var(--briki-bg)',
        boxShadow: `
          0 0 0 0.5px rgba(255, 255, 255, 0.06),
          0 1px 1px rgba(0, 0, 0, 0.12),
          0 2px 4px rgba(0, 0, 0, 0.14),
          0 4px 8px rgba(0, 0, 0, 0.16),
          0 8px 16px rgba(0, 0, 0, 0.18),
          0 16px 32px rgba(0, 0, 0, 0.20)
        `,
        border: '0.5px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Left activity sidebar */}
      <div 
        className="w-56 flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          borderRight: '0.5px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Sidebar header */}
        <div 
          className="px-3 py-2.5"
          style={{
            borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex items-center gap-2">
            <span 
              className="text-[11px] font-medium"
              style={{ color: 'var(--briki-text)' }}
            >
              {t('analysisInProgress')}
            </span>
          </div>
        </div>

        {/* Activity list */}
        <div className="flex-1 overflow-auto p-2">
          {/* In Progress */}
          <div className="mb-4">
            <div 
              className="text-[9px] uppercase tracking-wider px-2 py-1.5 mb-1"
              style={{ color: 'var(--briki-text-subtle)', opacity: 0.7 }}
            >
              {t('inProgressSection')}
            </div>
            <div className="space-y-1">
              {activityItems.inProgress.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md px-2 py-2 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: item.status === 'active' 
                      ? 'rgba(59, 130, 246, 0.08)' 
                      : 'rgba(255, 255, 255, 0.03)',
                    border: item.status === 'active'
                      ? '0.5px solid rgba(59, 130, 246, 0.2)'
                      : '0.5px solid rgba(255, 255, 255, 0.05)',
                  }}
                  onMouseEnter={(e) => {
                    if (item.status !== 'active') {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (item.status !== 'active') {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    }
                  }}
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    {item.status === 'active' ? (
                      <Loader2 
                        className="w-3 h-3 mt-0.5 flex-shrink-0 animate-spin" 
                        style={{ color: 'var(--briki-primary)' }}
                        strokeWidth={2}
                      />
                    ) : (
                      <div 
                        className="w-3 h-3 mt-0.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      />
                    )}
                    <span 
                      className="text-[10px] leading-tight flex-1"
                      style={{ 
                        color: item.status === 'active' 
                          ? 'var(--briki-text)' 
                          : 'var(--briki-text-muted)' 
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  {item.status === 'active' && item.progress > 0 && (
                    <div 
                      className="h-1 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${item.progress}%`,
                          backgroundColor: 'var(--briki-primary)',
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Completed */}
          <div>
            <div 
              className="text-[9px] uppercase tracking-wider px-2 py-1.5 mb-1"
              style={{ color: 'var(--briki-text-subtle)', opacity: 0.7 }}
            >
              {t('readySection')}
            </div>
            <div className="space-y-1">
              {activityItems.completed.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md px-2 py-1.5 flex items-center gap-2 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '0.5px solid rgba(255, 255, 255, 0.04)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  <CheckCircle2 
                    className="w-3 h-3 flex-shrink-0" 
                    style={{ color: 'var(--briki-text-muted)' }}
                    strokeWidth={2}
                  />
                  <span 
                    className="text-[10px] leading-tight"
                    style={{ color: 'var(--briki-text-muted)' }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main conversation panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Conversation header */}
        <div 
          className="px-4 py-2.5 flex items-center justify-between"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div>
              <h3 
                className="text-[11px] font-medium leading-tight"
                style={{ color: 'var(--briki-text)' }}
              >
                {t('analysisTitle')}
              </h3>
              <p 
                className="text-[9px] leading-tight"
                style={{ color: 'var(--briki-text-subtle)' }}
              >
                {t('clientInfo')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded-md text-[10px] transition-colors"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--briki-text-muted)',
                border: '0.5px solid rgba(255, 255, 255, 0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
              }}
            >
              {t('exportButton')}
            </button>
          </div>
        </div>

        {/* Conversation messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {conversationMessages.map((message) => (
            <div key={message.id} className="flex gap-3">
              {/* Avatar */}
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0"
                style={{
                  background: message.role === 'user' 
                    ? 'linear-gradient(135deg, rgba(100, 116, 139, 0.3), rgba(71, 85, 105, 0.3))'
                    : 'transparent',
                  color: message.role === 'user' 
                    ? 'var(--briki-primary-foreground)'
                    : 'transparent',
                  border: message.role === 'user'
                    ? '0.5px solid rgba(255, 255, 255, 0.1)'
                    : 'none',
                }}
              >
                {message.role === 'user' ? (
                  'ET'
                ) : (
                  <Image
                    src="/brand/briki-logo-2.png"
                    alt="Briki"
                    width={14}
                    height={14}
                    className="object-contain"
                  />
                )}
              </div>

              {/* Message content */}
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span 
                    className="text-[10px] font-medium"
                    style={{ color: 'var(--briki-text)' }}
                  >
                    {message.role === 'user' ? t('userRole') : t('agentRole')}
                  </span>
                  <span 
                    className="text-[9px]"
                    style={{ color: 'var(--briki-text-subtle)' }}
                  >
                    {message.timestamp}
                  </span>
                </div>
                <p 
                  className="text-[11px] leading-relaxed"
                  style={{ color: 'var(--briki-text-muted)' }}
                >
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {/* Result rows (Cursor-style) */}
          <div 
            className="rounded-md overflow-hidden"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '0.5px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {resultRows.map((row, idx) => (
              <div
                key={row.id}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer"
                style={{
                  borderBottom: idx < resultRows.length - 1 
                    ? '0.5px solid rgba(255, 255, 255, 0.06)' 
                    : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Icon */}
                <div 
                  className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: row.status === 'ready'
                      ? 'rgba(34, 197, 94, 0.08)'
                      : 'rgba(59, 130, 246, 0.08)',
                    border: row.status === 'ready'
                      ? '0.5px solid rgba(34, 197, 94, 0.2)'
                      : '0.5px solid rgba(59, 130, 246, 0.2)',
                  }}
                >
                  {row.status === 'processing' ? (
                    <Loader2 
                      className="w-3.5 h-3.5 animate-spin" 
                      style={{ color: 'var(--briki-primary)' }}
                      strokeWidth={2}
                    />
                  ) : (
                    <row.icon 
                      className="w-3.5 h-3.5" 
                      style={{ color: 'var(--briki-text-muted)' }}
                      strokeWidth={2}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div 
                    className="text-[10px] font-medium leading-tight mb-0.5"
                    style={{ color: 'var(--briki-text)' }}
                  >
                    {row.label}
                  </div>
                  <div 
                    className="text-[9px] leading-tight truncate"
                    style={{ color: 'var(--briki-text-subtle)' }}
                  >
                    {row.detail}
                  </div>
                </div>

                {/* Status indicator */}
                {row.status === 'ready' && (
                  <ArrowRight 
                    className="w-3.5 h-3.5 flex-shrink-0" 
                    style={{ color: 'var(--briki-text-subtle)' }}
                    strokeWidth={2}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Structured output */}
      <div 
        className="w-72 flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderLeft: '0.5px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Panel header */}
        <div 
          className="px-3 py-2.5 flex items-center justify-between"
          style={{
            borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span 
            className="text-[11px] font-medium"
            style={{ color: 'var(--briki-text)' }}
          >
            {t('resultTitle')}
          </span>
          <button
            className="p-1 rounded transition-colors"
            style={{
              color: 'var(--briki-text-subtle)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'var(--briki-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--briki-text-subtle)';
            }}
          >
            <Copy className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {/* Riesgos */}
          <div 
            className="rounded-md p-3"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '0.5px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle 
                className="w-3.5 h-3.5" 
                style={{ color: 'var(--briki-text-muted)' }}
                strokeWidth={2}
              />
              <span 
                className="text-[10px] font-medium"
                style={{ color: 'var(--briki-text)' }}
              >
                {t('resultSections.identifiedRisks')}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <div 
                  className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: 'var(--briki-text-subtle)' }}
                />
                <span 
                  className="text-[9px] leading-tight"
                  style={{ color: 'var(--briki-text-muted)' }}
                >
                  {t('risks.extremeSports')}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div 
                  className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: 'var(--briki-text-subtle)' }}
                />
                <span 
                  className="text-[9px] leading-tight"
                  style={{ color: 'var(--briki-text-muted)' }}
                >
                  {t('risks.waitingPeriod')}
                </span>
              </div>
            </div>
          </div>

          {/* Cobertura */}
          <div 
            className="rounded-md p-3"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '0.5px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield 
                className="w-3.5 h-3.5" 
                style={{ color: 'var(--briki-text-muted)' }}
                strokeWidth={2}
              />
              <span 
                className="text-[10px] font-medium"
                style={{ color: 'var(--briki-text)' }}
              >
                {t('resultSections.mainCoverage')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[9px]">
                <span style={{ color: 'var(--briki-text-subtle)' }}>{t('coverage.insuredAmount')}</span>
                <span 
                  className="font-medium"
                  style={{ color: 'var(--briki-text)' }}
                >
                  $500,000
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span style={{ color: 'var(--briki-text-subtle)' }}>{t('coverage.monthlyPremium')}</span>
                <span 
                  className="font-medium"
                  style={{ color: 'var(--briki-text)' }}
                >
                  $375
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span style={{ color: 'var(--briki-text-subtle)' }}>{t('coverage.beneficiaries')}</span>
                <span 
                  className="font-medium"
                  style={{ color: 'var(--briki-text)' }}
                >
                  2 {t('coverage.designated')}
                </span>
              </div>
            </div>
          </div>

          {/* Exclusiones */}
          <div 
            className="rounded-md p-3"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '0.5px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle 
                className="w-3.5 h-3.5" 
                style={{ color: 'var(--briki-text-muted)' }}
                strokeWidth={2}
              />
              <span 
                className="text-[10px] font-medium"
                style={{ color: 'var(--briki-text)' }}
              >
                {t('resultSections.keyExclusions')}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <div 
                  className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: 'var(--briki-text-subtle)' }}
                />
                <span 
                  className="text-[9px] leading-tight"
                  style={{ color: 'var(--briki-text-muted)' }}
                >
                  {t('exclusions.suicideFirstYears')}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div 
                  className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: 'var(--briki-text-subtle)' }}
                />
                <span 
                  className="text-[9px] leading-tight"
                  style={{ color: 'var(--briki-text-muted)' }}
                >
                  {t('exclusions.preexisting')}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div 
                  className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: 'var(--briki-text-subtle)' }}
                />
                <span 
                  className="text-[9px] leading-tight"
                  style={{ color: 'var(--briki-text-muted)' }}
                >
                  {t('exclusions.highRisk')}
                </span>
              </div>
            </div>
          </div>

          {/* Próximos pasos */}
          <div 
            className="rounded-md p-3"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.06)',
              border: '0.5px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileCheck 
                className="w-3.5 h-3.5" 
                style={{ color: 'var(--briki-primary)' }}
                strokeWidth={2}
              />
              <span 
                className="text-[10px] font-medium"
                style={{ color: 'var(--briki-text)' }}
              >
                {t('resultSections.nextSteps')}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <div 
                  className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: 'var(--briki-primary)' }}
                />
                <span 
                  className="text-[9px] leading-tight"
                  style={{ color: 'var(--briki-text-muted)' }}
                >
                  {t('nextStepsItems.reviewExclusions')}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div 
                  className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: 'var(--briki-primary)' }}
                />
                <span 
                  className="text-[9px] leading-tight"
                  style={{ color: 'var(--briki-text-muted)' }}
                >
                  {t('nextStepsItems.confirmBeneficiaries')}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div 
                  className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: 'var(--briki-primary)' }}
                />
                <span 
                  className="text-[9px] leading-tight"
                  style={{ color: 'var(--briki-text-muted)' }}
                >
                  {t('nextStepsItems.generateProposal')}
                </span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            className="w-full rounded-md px-3 py-2 text-[10px] font-medium transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--briki-primary-surface)',
              color: 'var(--briki-primary)',
              border: '0.5px solid var(--briki-primary-border)',
              boxShadow: '0 0.5px 1px rgba(0, 0, 0, 0.08)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.12)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--briki-primary-surface)';
              e.currentTarget.style.boxShadow = '0 0.5px 1px rgba(0, 0, 0, 0.08)';
            }}
          >
            <FileCheck className="w-3.5 h-3.5" strokeWidth={2} />
            {t('generateProposalButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

