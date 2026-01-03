'use client';

import { 
  Search, 
  Folder, 
  FileText, 
  Users, 
  Clock,
  MoreHorizontal,
  ChevronRight,
  Circle
} from 'lucide-react';
import { useSafeTranslations } from '@/hooks/useSafeTranslations';

// Mock sidebar items factory
const createSidebarItems = (t: any) => [
  { id: 1, label: t('sidebarItems.activeCases'), icon: Folder, count: 12, active: true },
  { id: 2, label: t('sidebarItems.documents'), icon: FileText, count: 48, active: false },
  { id: 3, label: t('sidebarItems.clients'), icon: Users, count: 24, active: false },
  { id: 4, label: t('sidebarItems.recent'), icon: Clock, count: null, active: false },
];

// Mock case cards factory
const createCaseCards = (t: any) => [
  {
    id: 1,
    title: 'Póliza de vida corporativa',
    client: 'Tech Solutions Inc.',
    status: t('caseStatus.inReview'),
    statusColor: 'rgba(59, 130, 246, 0.6)',
    updated: '2h',
    priority: 'high',
  },
  {
    id: 2,
    title: 'Renovación seguro de salud',
    client: 'Familia Martínez',
    status: t('caseStatus.pending'),
    statusColor: 'rgba(234, 179, 8, 0.6)',
    updated: '5h',
    priority: 'medium',
  },
  {
    id: 3,
    title: 'Análisis de cobertura auto',
    client: 'Transportes del Norte',
    status: t('caseStatus.completed'),
    statusColor: 'rgba(34, 197, 94, 0.6)',
    updated: '1d',
    priority: 'low',
  },
  {
    id: 4,
    title: 'Comparación de pólizas',
    client: 'Constructora ABC',
    status: t('caseStatus.inProgress'),
    statusColor: 'rgba(59, 130, 246, 0.6)',
    updated: '3h',
    priority: 'high',
  },
];

export function LandingWorkspaceDemo() {
  const { t } = useSafeTranslations('landing.demos.workspace');
  const sidebarItems = createSidebarItems(t);
  const caseCards = createCaseCards(t);
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
      {/* Window chrome header */}
      <div 
        className="absolute top-0 left-0 right-0 h-8 flex items-center px-3 z-20"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Traffic lights (Cursor-style dots) */}
        <div className="flex items-center gap-1.5">
          <div 
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
          />
          <div 
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
          />
          <div 
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
          />
        </div>
      </div>

      {/* Main content area - starts below chrome */}
      <div className="w-full h-full flex pt-8">
        {/* Left sidebar */}
        <div 
          className="w-48 flex flex-col overflow-hidden"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            borderRight: '0.5px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {/* Sidebar items */}
          <div className="flex-1 overflow-auto p-2 pt-3">
            <div className="space-y-0.5">
              {sidebarItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md px-2 py-1.5 transition-colors cursor-pointer flex items-center justify-between group"
                  style={{
                    backgroundColor: item.active 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <item.icon 
                      className="w-3.5 h-3.5 flex-shrink-0" 
                      style={{ 
                        color: item.active 
                          ? 'var(--briki-text)' 
                          : 'var(--briki-text-muted)' 
                      }}
                      strokeWidth={2}
                    />
                    <span 
                      className="text-[11px] leading-tight truncate"
                      style={{ 
                        color: item.active 
                          ? 'var(--briki-text)' 
                          : 'var(--briki-text-muted)' 
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  {item.count !== null && (
                    <span 
                      className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--briki-text-subtle)',
                      }}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top header with search and team pill */}
          <div 
            className="px-4 py-2.5 flex items-center justify-between gap-3"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {/* Search bar */}
            <div 
              className="flex-1 max-w-md flex items-center gap-2 px-2.5 py-1.5 rounded-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '0.5px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Search 
                className="w-3.5 h-3.5 flex-shrink-0" 
                style={{ color: 'var(--briki-text-subtle)' }}
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                className="flex-1 bg-transparent border-none outline-none text-[11px]"
                style={{ 
                  color: 'var(--briki-text-muted)',
                  caretColor: 'var(--briki-primary)',
                }}
                disabled
              />
            </div>

            {/* Team pill */}
            <div 
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '0.5px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Users 
                className="w-3.5 h-3.5" 
                style={{ color: 'var(--briki-text-muted)' }}
                strokeWidth={2}
              />
              <span 
                className="text-[11px]"
                style={{ color: 'var(--briki-text-muted)' }}
              >
                {t('teamName')}
              </span>
            </div>
          </div>

          {/* Cases list */}
          <div className="flex-1 overflow-auto p-4">
            {/* Section header */}
            <div className="mb-3 flex items-center justify-between">
              <h3 
                className="text-[11px] font-medium"
                style={{ color: 'var(--briki-text)' }}
              >
                {t('sectionTitle')}
              </h3>
              <button
                className="text-[10px] px-2 py-1 rounded-md transition-colors"
                style={{
                  color: 'var(--briki-text-subtle)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {t('viewAll')}
              </button>
            </div>

            {/* Case cards grid */}
            <div className="space-y-2">
              {caseCards.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="rounded-md p-3 transition-all cursor-pointer group"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '0.5px solid rgba(255, 255, 255, 0.08)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 
                        className="text-[11px] font-medium leading-tight mb-1"
                        style={{ color: 'var(--briki-text)' }}
                      >
                        {caseItem.title}
                      </h4>
                      <p 
                        className="text-[9px] leading-tight"
                        style={{ color: 'var(--briki-text-subtle)' }}
                      >
                        {caseItem.client}
                      </p>
                    </div>
                    <button
                      className="p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                      style={{
                        color: 'var(--briki-text-subtle)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>

                  {/* Card footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Circle 
                        className="w-1.5 h-1.5 fill-current" 
                        style={{ color: caseItem.statusColor }}
                        strokeWidth={0}
                      />
                      <span 
                        className="text-[9px]"
                        style={{ color: 'var(--briki-text-muted)' }}
                      >
                        {caseItem.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-[9px]"
                        style={{ color: 'var(--briki-text-subtle)' }}
                      >
                        {caseItem.updated}
                      </span>
                      <ChevronRight 
                        className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" 
                        style={{ color: 'var(--briki-text-subtle)' }}
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

