'use client';

import { Search, FileText, Users, FolderOpen, BarChart3, FileCheck } from 'lucide-react';
import Image from 'next/image';
import { useSafeTranslations } from '@/hooks/useSafeTranslations';

// Mock case data factory
const createMockCases = (t: any) => [
  {
    id: 1,
    client: 'María González',
    type: t('caseTypes.life'),
    status: t('caseStatus.active'),
    updated: '2m',
    premium: '$4,500/año',
    selected: true,
  },
  {
    id: 2,
    client: 'Carlos Rodríguez',
    type: t('caseTypes.auto'),
    status: t('caseStatus.pending'),
    updated: '15m',
    premium: '$2,800/año',
    selected: false,
  },
  {
    id: 3,
    client: 'Ana Martínez',
    type: t('caseTypes.home'),
    status: t('caseStatus.active'),
    updated: '1h',
    premium: '$1,200/año',
    selected: false,
  },
  {
    id: 4,
    client: 'Roberto Silva',
    type: t('caseTypes.health'),
    status: t('caseStatus.active'),
    updated: '3h',
    premium: '$6,800/año',
    selected: false,
  },
  {
    id: 5,
    client: 'Laura Fernández',
    type: t('caseTypes.life'),
    status: t('caseStatus.inReview'),
    updated: '5h',
    premium: '$3,900/año',
    selected: false,
  },
];

// Nav items factory
const createNavItems = (t: any) => [
  { icon: FolderOpen, label: t('navItems.cases'), active: true },
  { icon: Users, label: t('navItems.clients'), active: false },
  { icon: FileText, label: t('navItems.documents'), active: false },
  { icon: BarChart3, label: t('navItems.compare'), active: false },
  { icon: FileCheck, label: t('navItems.proposals'), active: false },
];

export function LandingDashboardDemo() {
  const { t } = useSafeTranslations('landing.demos.dashboard');
  const mockCases = createMockCases(t);
  const navItems = createNavItems(t);
  return (
    <div 
      className="w-full max-w-[1200px] mx-auto h-full rounded-lg overflow-hidden flex flex-col text-sm relative"
      style={{ 
        backgroundColor: 'var(--briki-bg)',
        // Layered shadows for depth - multiple subtle layers instead of one heavy shadow
        boxShadow: `
          0 0 0 0.5px rgba(255, 255, 255, 0.06),
          0 1px 1px rgba(0, 0, 0, 0.12),
          0 2px 4px rgba(0, 0, 0, 0.14),
          0 4px 8px rgba(0, 0, 0, 0.16),
          0 8px 16px rgba(0, 0, 0, 0.18),
          0 16px 32px rgba(0, 0, 0, 0.20)
        `,
        // Subtle inner highlight for glass effect
        border: '0.5px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Window chrome - macOS style header */}
      <div 
        className="flex items-center px-4 py-2 relative rounded-[10px]"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(20px)',
          borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
          // Inner highlight on chrome
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        }}
      >
        {/* macOS traffic lights */}
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              boxShadow: 'inset 0 0.5px 1px rgba(0, 0, 0, 0.3)'
            }}
          />
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.30)',
              boxShadow: 'inset 0 0.5px 1px rgba(0, 0, 0, 0.3)'
            }}
          />
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.35)',
              boxShadow: 'inset 0 0.5px 1px rgba(0, 0, 0, 0.3)'
            }}
          />
        </div>
        
        {/* Window title - centered */}
        <div 
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-medium"
          style={{ color: 'rgba(255, 255, 255, 0.6)' }}
        >
          Briki
        </div>
      </div>
      
      {/* Topbar */}
      <div 
        className="flex items-center justify-between px-5 py-2.5 backdrop-blur-sm" 
        style={{ 
          backgroundColor: 'var(--briki-bg)',
          borderBottom: '1px solid var(--briki-border-subtle)',
          borderRadius: '10px'
        }}
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center">
            <Image 
              src="/brand/briki-logo-2.png" 
              alt="Briki logo" 
              width={20} 
              height={20}
              className="opacity-90"
            />
          </div>
          <span style={{ color: 'var(--briki-text)' }} className="font-medium text-sm tracking-tight">
            Briki
          </span>
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 max-w-lg mx-8">
          <div className="relative w-full">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5" 
              style={{ color: 'var(--briki-text-subtle)' }}
            />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-md pl-9 pr-3 py-1.5 text-[11px] focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--briki-surface-1)',
                border: '1px solid var(--briki-border-subtle)',
                color: 'var(--briki-text-muted)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--briki-primary-border)';
                e.currentTarget.style.backgroundColor = 'var(--briki-surface-2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--briki-border-subtle)';
                e.currentTarget.style.backgroundColor = 'var(--briki-surface-1)';
              }}
              readOnly
            />
          </div>
        </div>

        {/* Right: User pill */}
        <div 
          className="flex items-center gap-2 rounded-full px-2.5 py-1"
          style={{
            backgroundColor: 'var(--briki-surface-1)',
            border: '1px solid var(--briki-border-subtle)'
          }}
        >
          <div 
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium"
            style={{
              background: 'linear-gradient(135deg, var(--briki-primary), var(--briki-info))',
              color: 'var(--briki-primary-foreground)'
            }}
          >
            BT
          </div>
          <span style={{ color: 'var(--briki-text-muted)' }} className="text-xs hidden sm:inline">
            {t('teamName')}
          </span>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div 
          className="w-14 md:w-48 flex flex-col gap-0.5 p-1.5" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            borderRight: '1px solid rgba(255, 255, 255, 0.02)'
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.label}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all text-[10px]"
              style={
                item.active
                  ? {
                      backgroundColor: 'var(--briki-primary-surface)',
                      color: 'var(--briki-primary)',
                      border: '1px solid var(--briki-primary-border)',
                    }
                  : {
                      color: 'var(--briki-text-muted)',
                      border: '1px solid transparent',
                    }
              }
              onMouseEnter={(e) => {
                if (!item.active) {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.35)';
                  e.currentTarget.style.color = 'var(--briki-text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!item.active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--briki-text-muted)';
                }
              }}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
              <span className="hidden md:inline font-normal">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Cases list */}
          <div className="flex-1 overflow-auto">
            <div className="p-5 lg:p-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.20)' }}>
              {/* Header with filters */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-normal" style={{ color: 'var(--briki-text)' }}>
                  {t('casesTitle')}
                </h2>
                <div className="flex items-center gap-2">
                  <button 
                    className="px-2 py-0.5 rounded-md text-[10px] font-normal flex items-center gap-1.5"
                    style={{
                      backgroundColor: 'var(--briki-primary-surface)',
                      color: 'var(--briki-primary)',
                      border: '1px solid var(--briki-primary-border)',
                    }}
                  >
                    <span>{t('filterActive')}</span>
                    <span className="relative flex h-1.5 w-1.5">
                      <span 
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ backgroundColor: 'var(--briki-primary)' }}
                      ></span>
                      <span 
                        className="relative inline-flex rounded-full h-1.5 w-1.5"
                        style={{ backgroundColor: 'var(--briki-primary)' }}
                      ></span>
                    </span>
                  </button>
                  <button 
                    className="px-2 py-0.5 rounded-md text-[10px] font-normal transition-colors"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      color: 'var(--briki-text-muted)',
                      border: '1px solid var(--briki-border-subtle)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
                    }}
                  >
                    {t('filterPending')}
                  </button>
                </div>
              </div>

              {/* Cases table */}
              <div className="space-y-1">
                {mockCases.map((case_) => {
                  const getStatusStyle = (status: string) => {
                    if (status === t('caseStatus.active')) {
                      return {
                        backgroundColor: 'rgba(34, 197, 94, 0.00)',
                        color: 'rgba(34, 197, 94, 0.55)',
                        border: '1px solid rgba(34, 197, 94, 0.15)',
                      };
                    } else if (status === t('caseStatus.pending')) {
                      return {
                        backgroundColor: 'rgba(251, 191, 36, 0.00)',
                        color: 'rgba(251, 191, 36, 0.60)',
                        border: '1px solid rgba(251, 191, 36, 0.15)',
                      };
                    } else {
                      return {
                        backgroundColor: 'rgba(59, 130, 246, 0.00)',
                        color: 'rgba(59, 130, 246, 0.55)',
                        border: '1px solid rgba(59, 130, 246, 0.15)',
                      };
                    }
                  };

                  return (
                    <div
                      key={case_.id}
                      className="group rounded-md transition-all cursor-pointer"
                      style={
                        case_.selected
                          ? {
                              backgroundColor: 'var(--briki-primary-surface)',
                              border: '1px solid var(--briki-primary-border)',
                            }
                          : {
                              backgroundColor: 'rgba(0, 0, 0, 0.25)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!case_.selected) {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.35)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!case_.selected) {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                        }
                      }}
                    >
                      <div className="px-3 py-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 
                                className="text-[10px] font-normal truncate leading-tight" 
                                style={{ color: 'var(--briki-text)' }}
                              >
                                {case_.client}
                              </h3>
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-normal"
                                style={getStatusStyle(case_.status)}
                              >
                                {case_.status}
                              </span>
                            </div>
                            <div 
                              className="flex items-center gap-2.5 text-[9px] leading-tight"
                              style={{ color: 'var(--briki-text-subtle)' }}
                            >
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" strokeWidth={1.5} />
                                {case_.type}
                              </span>
                              <span>•</span>
                              <span style={{ color: 'var(--briki-text-muted)' }}>{case_.premium}</span>
                              <span>•</span>
                              <span>{t('updatedAgo', { time: case_.updated })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right panel - Case preview */}
          <div 
            className="w-full lg:w-72 xl:w-80 overflow-auto"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.02)'
            }}
          >
            <div className="p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}>
              <div className="mb-5">
                <h3 className="font-normal text-[11px] mb-1 leading-tight" style={{ color: 'var(--briki-text)' }}>
                  María González
                </h3>
                <p className="text-[9px] leading-tight" style={{ color: 'var(--briki-text-subtle)' }}>
                  {t('detailsSection.lifeInsurance')} · {t('caseStatus.active')}
                </p>
              </div>

              {/* Case details */}
              <div className="space-y-4 mb-6">
                <div 
                  className="rounded-md p-3"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.07)'
                  }}
                >
                  <div 
                    className="text-[9px] mb-1 uppercase tracking-wider leading-none"
                    style={{ color: 'var(--briki-text-subtle)', opacity: 0.7 }}
                  >
                    {t('detailsSection.annualPremium')}
                  </div>
                  <div className="font-normal text-xs leading-tight" style={{ color: 'var(--briki-text)' }}>
                    $4,500
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] leading-tight">
                    <span style={{ color: 'var(--briki-text-subtle)' }}>{t('detailsSection.insurer')}</span>
                    <span style={{ color: 'var(--briki-text-muted)' }}>MetLife</span>
                  </div>
                  <div className="flex justify-between text-[10px] leading-tight">
                    <span style={{ color: 'var(--briki-text-subtle)' }}>{t('detailsSection.policy')}</span>
                    <span className="font-mono text-[9px]" style={{ color: 'var(--briki-text-muted)' }}>
                      VID-2024-0891
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] leading-tight">
                    <span style={{ color: 'var(--briki-text-subtle)' }}>{t('detailsSection.validity')}</span>
                    <span style={{ color: 'var(--briki-text-muted)' }}>12 {t('detailsSection.months')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] leading-tight">
                    <span style={{ color: 'var(--briki-text-subtle)' }}>{t('detailsSection.renewal')}</span>
                    <span style={{ color: 'var(--briki-text-muted)' }}>15 Ene 2026</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <h4 
                  className="text-[9px] font-normal mb-3 uppercase tracking-wider leading-none"
                  style={{ color: 'var(--briki-text-subtle)', opacity: 0.7 }}
                >
                  {t('quickActions.title')}
                </h4>
                <button 
                  className="w-full rounded-md px-2.5 py-1.5 text-[10px] font-normal transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--briki-primary-surface)',
                    color: 'var(--briki-primary)',
                    border: '1px solid var(--briki-primary-border)',
                    boxShadow: '0 0.5px 1px rgba(0, 0, 0, 0.08)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--briki-primary-surface)';
                    e.currentTarget.style.boxShadow = '0 0.5px 1px rgba(0, 0, 0, 0.08)';
                  }}
                >
                  <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {t('quickActions.analyzePolicy')}
                </button>
                <button 
                  className="w-full rounded-md px-2.5 py-1.5 text-[10px] font-normal transition-colors flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    color: 'var(--briki-text-muted)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.35)';
                  }}
                >
                  <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {t('quickActions.comparePlans')}
                </button>
                <button 
                  className="w-full rounded-md px-2.5 py-1.5 text-[10px] font-normal transition-colors flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    color: 'var(--briki-text-muted)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.35)';
                  }}
                >
                  <FileCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {t('quickActions.generateProposal')}
                </button>
              </div>

              {/* Recent activity */}
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h4 
                  className="text-[9px] font-normal mb-3 uppercase tracking-wider leading-none"
                  style={{ color: 'var(--briki-text-subtle)', opacity: 0.7 }}
                >
                  {t('recentActivity.title')}
                </h4>
                <div className="space-y-2.5">
                  <div className="flex gap-2.5">
                    <div 
                      className="w-1 h-1 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: 'var(--briki-primary)' }}
                    ></div>
                    <div>
                      <div className="text-[10px] leading-tight" style={{ color: 'var(--briki-text-muted)' }}>
                        {t('recentActivity.clientReviewed')}
                      </div>
                      <div className="text-[9px] mt-0.5 leading-tight" style={{ color: 'var(--briki-text-subtle)' }}>
                        {t('recentActivity.timeAgo.minutes', { count: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <div 
                      className="w-1 h-1 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: 'var(--briki-success)' }}
                    ></div>
                    <div>
                      <div className="text-[10px] leading-tight" style={{ color: 'var(--briki-text-muted)' }}>
                        {t('recentActivity.documentsUpdated')}
                      </div>
                      <div className="text-[9px] mt-0.5 leading-tight" style={{ color: 'var(--briki-text-subtle)' }}>
                        {t('recentActivity.timeAgo.hours', { count: 1 })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <div 
                      className="w-1 h-1 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: 'var(--briki-text-subtle)' }}
                    ></div>
                    <div>
                      <div className="text-[10px] leading-tight" style={{ color: 'var(--briki-text-muted)' }}>
                        {t('recentActivity.caseCreated')}
                      </div>
                      <div className="text-[9px] mt-0.5 leading-tight" style={{ color: 'var(--briki-text-subtle)' }}>
                        {t('recentActivity.timeAgo.days', { count: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

