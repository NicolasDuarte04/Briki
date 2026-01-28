// src/components/Policies/index.ts
/**
 * Exportaciones centralizadas de componentes de Pólizas
 */

// Componentes principales de gestión de pólizas
export { PolicyCard } from './PolicyCard';
export type { PolicyCardData, PolicyCardProps } from './PolicyCard';

export { PolicyList } from './PolicyList';
export type { PolicyListProps } from './PolicyList';

export { PolicyUploadForm } from './PolicyUploadForm';

export { OrgPolicySelector } from './OrgPolicySelector';
export type { LinkablePolicy } from './OrgPolicySelector';

// Charts (usando react-apexcharts)
export { MonthlyActivityChart, ConfidenceGauge, DistributionChart } from './charts';
