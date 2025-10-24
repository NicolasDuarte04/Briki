// src/config/navigation.ts
/**
 * Configuración centralizada de navegación para el workspace.
 * Single source of truth para los links del sidebar.
 */

import { 
  getDashboardHome,
  pathForCases,
  pathForClients,
  getProfilePath,
  pathForAgent,
} from '@/lib/routes/workspace';
import type { Locale } from '@/lib/routes/workspace';
import { LayoutDashboard, Briefcase, Users, User, Bot, BookOpen } from 'lucide-react';

/**
 * Returns workspace navigation links for a given locale
 * @param locale - Current locale (en | es)
 */
export function getWorkspaceLinks(locale: Locale) {
  return [
    { 
      label: locale === 'es' ? 'Panel' : 'Dashboard',
      href: getDashboardHome(locale),
      matchPath: '/dashboard', // For active state detection
      icon: LayoutDashboard
    },
    { 
      label: locale === 'es' ? 'Agente' : 'Agent',
      href: pathForAgent(locale),
      matchPath: '/agent', // Matches /agent and /agent/<id>
      icon: Bot
    },
    { 
      label: locale === 'es' ? 'Casos' : 'Cases',
      href: pathForCases(locale),
      matchPath: '/workspace/cases', // Matches /workspace/cases and nested routes
      icon: Briefcase
    },
    { 
      label: locale === 'es' ? 'Clientes' : 'Clients',
      href: pathForClients(locale),
      matchPath: '/workspace/clients', // Matches /workspace/clients and nested routes
      icon: Users
    },
    { 
      label: locale === 'es' ? 'Perfil' : 'Profile',
      href: getProfilePath(locale),
      matchPath: '/profile',
      icon: User
    },
    // --- NUEVA ENTRADA ---
    { 
      label: 'Recursos',
      href: '/#how', // Apunta a sección de landing
      matchPath: '/#how',
      icon: BookOpen
    }
  ];
}

// Legacy export for backward compatibility (defaults to Spanish)
export const workspaceLinks = getWorkspaceLinks('es');