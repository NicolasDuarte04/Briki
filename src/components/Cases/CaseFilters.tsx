// /src/components/Cases/CaseFilters.tsx
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';

interface CaseFiltersProps {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
}

export function CaseFilters({
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
}: CaseFiltersProps) {
  const t = useTranslations('cases.filters');

  return (
    <div className="flex gap-2">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allStatuses')}</SelectItem>
          <SelectItem value="draft">{t('draft')}</SelectItem>
          <SelectItem value="active">{t('active')}</SelectItem>
          <SelectItem value="completed">{t('completed')}</SelectItem>
          <SelectItem value="archived">{t('archived')}</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('priority')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allPriorities')}</SelectItem>
          <SelectItem value="low">{t('low')}</SelectItem>
          <SelectItem value="medium">{t('medium')}</SelectItem>
          <SelectItem value="high">{t('high')}</SelectItem>
          <SelectItem value="urgent">{t('urgent')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
