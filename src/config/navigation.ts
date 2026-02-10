// src/config/navigation.ts
/**
 * Configuración centralizada de navegación para el workspace.
 * Single source of truth para los links del sidebar.
 * 
 * Estructura jerárquica con secciones y submenús:
 * - MENÚ: Panel (con subítems), Pólizas
 * - SOPORTE: Perfil, Soporte
 * - OTROS: Recursos
 */

import { 
  getDashboardHome,
  pathForCases,
  pathForClients,
  pathForCompanies,
  getProfilePath,
  pathForAgent,
  pathForPolicies,
  pathForPoliciesOverview,
  pathForPoliciesAnalysis,
  pathForPoliciesUpload,
  pathForQuotes,
  pathForQuotesOverview,
  pathForQuotesAnalysis,
  pathForQuotesUpload,
} from '@/lib/routes/workspace';
import type { Locale } from '@/lib/routes/workspace';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  User, 
  Bot, 
  BookOpen,
  FileText,
  HelpCircle,
  MoreHorizontal,
  BarChart3,
  FileSearch,
  Upload,
  Building2,
  Receipt,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

export interface SubNavItem {
  label: string;
  href: string;
  matchPath: string;
  icon: LucideIcon;
}

export interface NavItem {
  label: string;
  href: string;
  matchPath: string;
  icon: LucideIcon;
  subItems?: SubNavItem[];
  disabled?: boolean;
}

export interface NavSection {
  id: 'menu' | 'support' | 'others';
  title: string;
  items: NavItem[];
}

// =============================================================================
// TRADUCCIONES DE SECCIONES
// =============================================================================

const sectionTitles: Record<NavSection['id'], Record<Locale, string>> = {
  menu: { es: 'Menú', en: 'Menu' },
  support: { es: 'Soporte', en: 'Support' },
  others: { es: 'Otros', en: 'Others' },
};

// =============================================================================
// FUNCIÓN PRINCIPAL: getWorkspaceSections
// =============================================================================

/**
 * Returns workspace navigation sections organized hierarchically.
 * @param locale - Current locale (en | es)
 */
export function getWorkspaceSections(locale: Locale): NavSection[] {
  return [
    // =========================================================================
    // SECCIÓN: MENÚ
    // =========================================================================
    {
      id: 'menu',
      title: sectionTitles.menu[locale],
      items: [
        {
          label: locale === 'es' ? 'Panel' : 'Dashboard',
          href: getDashboardHome(locale),
          matchPath: '/dashboard',
          icon: LayoutDashboard,
          // Subítems desplegables al hover (Casos, Clientes, Empresas)
          subItems: [
            {
              label: locale === 'es' ? 'Casos' : 'Cases',
              href: pathForCases(locale),
              matchPath: '/workspace/cases',
              icon: Briefcase,
            },
            {
              label: locale === 'es' ? 'Clientes' : 'Clients',
              href: pathForClients(locale),
              matchPath: '/workspace/clients',
              icon: Users,
            },
            {
              label: locale === 'es' ? 'Empresas' : 'Companies',
              href: pathForCompanies(locale),
              matchPath: '/workspace/companies',
              icon: Building2,
            },
          ],
        },
        {
          label: locale === 'es' ? 'Pólizas' : 'Policies',
          href: pathForPolicies(locale),
          matchPath: '/policies',
          icon: FileText,
          // ✅ Subítems desplegables para el dashboard de pólizas
          subItems: [
            {
              label: locale === 'es' ? 'Resumen' : 'Overview',
              href: pathForPoliciesOverview(locale),
              matchPath: '/policies/overview',
              icon: BarChart3,
            },
            {
              label: locale === 'es' ? 'Análisis' : 'Analysis',
              href: pathForPoliciesAnalysis(locale),
              matchPath: '/policies/analysis',
              icon: FileSearch,
            },
            {
              label: locale === 'es' ? 'Subir Póliza' : 'Upload Policy',
              href: pathForPoliciesUpload(locale),
              matchPath: '/policies/upload',
              icon: Upload,
            },
          ],
        },
        // ✅ COTIZACIONES: Nueva sección análoga a Pólizas
        {
          label: locale === 'es' ? 'Cotizaciones' : 'Quotes',
          href: pathForQuotes(locale),
          matchPath: '/quotes',
          icon: Receipt,
          subItems: [
            {
              label: locale === 'es' ? 'Resumen' : 'Overview',
              href: pathForQuotesOverview(locale),
              matchPath: '/quotes/overview',
              icon: BarChart3,
            },
            {
              label: locale === 'es' ? 'Análisis' : 'Analysis',
              href: pathForQuotesAnalysis(locale),
              matchPath: '/quotes/analysis',
              icon: FileSearch,
            },
            {
              label: locale === 'es' ? 'Subir Cotización' : 'Upload Quote',
              href: pathForQuotesUpload(locale),
              matchPath: '/quotes/upload',
              icon: Upload,
            },
          ],
        },
        // ✅ AGENTE: Ahora debajo de Dashboard, Policies y Quotes
        {
          label: locale === 'es' ? 'Agente' : 'Agent',
          href: pathForAgent(locale),
          matchPath: '/agent',
          icon: Bot,
        },
      ],
    },
    // =========================================================================
    // SECCIÓN: SOPORTE
    // =========================================================================
    {
      id: 'support',
      title: sectionTitles.support[locale],
      items: [
        {
          label: locale === 'es' ? 'Perfil' : 'Profile',
          href: getProfilePath(locale),
          matchPath: '/profile',
          icon: User,
        },
        {
          label: locale === 'es' ? 'Soporte' : 'Support',
          href: '#', // Desconectado por ahora
          matchPath: '/support',
          icon: HelpCircle,
          disabled: true,
        },
      ],
    },
    // =========================================================================
    // SECCIÓN: OTROS
    // =========================================================================
    {
      id: 'others',
      title: sectionTitles.others[locale],
      items: [
        {
          label: 'Recursos',
          href: '/#how', // Apunta a sección de landing (desconectado)
          matchPath: '/#how',
          icon: BookOpen,
          disabled: true,
        },
      ],
    },
  ];
}

// =============================================================================
// LEGACY EXPORTS (Backward Compatibility)
// =============================================================================

/**
 * Returns flat workspace navigation links for a given locale.
 * @deprecated Use getWorkspaceSections() instead for new implementations.
 * @param locale - Current locale (en | es)
 */
export function getWorkspaceLinks(locale: Locale) {
  return [
    { 
      label: locale === 'es' ? 'Panel' : 'Dashboard',
      href: getDashboardHome(locale),
      matchPath: '/dashboard',
      icon: LayoutDashboard
    },
    // ✅ AGENTE: Después de Dashboard
    { 
      label: locale === 'es' ? 'Agente' : 'Agent',
      href: pathForAgent(locale),
      matchPath: '/agent',
      icon: Bot
    },
    { 
      label: locale === 'es' ? 'Casos' : 'Cases',
      href: pathForCases(locale),
      matchPath: '/workspace/cases',
      icon: Briefcase
    },
    { 
      label: locale === 'es' ? 'Clientes' : 'Clients',
      href: pathForClients(locale),
      matchPath: '/workspace/clients',
      icon: Users
    },
    { 
      label: locale === 'es' ? 'Perfil' : 'Profile',
      href: getProfilePath(locale),
      matchPath: '/profile',
      icon: User
    },
    { 
      label: 'Recursos',
      href: '/#how',
      matchPath: '/#how',
      icon: BookOpen
    }
  ];
}

// Legacy export for backward compatibility (defaults to Spanish)
export const workspaceLinks = getWorkspaceLinks('es');

// Export section icon for collapsed state
export { MoreHorizontal as SectionCollapsedIcon };
