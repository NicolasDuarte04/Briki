'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryDef } from '@/lib/insurance-categories';
import type { CategoryFieldDef } from '@/lib/insurance-categories';

// ─── Props ───────────────────────────────────────────────────────────────────

interface DynamicCategoryFieldsProps {
  /** Currently selected insurance category id (e.g. 'trdm', 'salud') */
  categoryId: string;
  /** Current values of all dynamic fields for this category */
  values: Record<string, string | number | boolean | null>;
  /** Called when any field value changes */
  onChange: (fieldId: string, value: string | number | boolean | null) => void;
  /** Whether the form is in a disabled / processing state */
  disabled?: boolean;
  /** Currently selected coverages (from categoryData.selected_coverages) */
  selectedCoverages: string[];
  /** Called to toggle a suggested coverage on/off */
  onToggleCoverage: (coverage: string) => void;
}

// ─── Individual Field Renderer ───────────────────────────────────────────────

const CategoryField = React.memo(({
  field,
  value,
  onChange,
  disabled,
  t,
  categoryId,
}: {
  field: CategoryFieldDef;
  value: string | number | boolean | null;
  onChange: (fieldId: string, value: string | number | boolean | null) => void;
  disabled?: boolean;
  t: (key: string) => string;
  categoryId: string;
}) => {
  const labelKey = `categoryFields.${categoryId}.${field.id}`;
  const placeholderKey = `categoryFields.${categoryId}.${field.id}_placeholder`;
  const label = t(labelKey);
  const placeholder = t(placeholderKey);

  switch (field.type) {
    case 'number':
      return (
        <div className="space-y-2">
          <Label className="text-sm">{label}</Label>
          <Input
            type="number"
            placeholder={placeholder}
            min={field.min}
            max={field.max}
            step={field.step ?? (field.isCurrency ? 0.01 : 1)}
            value={value !== null && value !== undefined ? String(value) : ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v || v === '') {
                onChange(field.id, null);
                return;
              }
              const num = parseFloat(v);
              if (!isNaN(num) && isFinite(num)) {
                onChange(field.id, num);
              }
            }}
            disabled={disabled}
            className={cn(field.isCurrency && 'font-mono')}
          />
        </div>
      );

    case 'text':
      return (
        <div className="space-y-2">
          <Label className="text-sm">{label}</Label>
          <Input
            type="text"
            placeholder={placeholder}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled}
          />
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-2">
          <Label className="text-sm">{label}</Label>
          <Textarea
            placeholder={placeholder}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            rows={3}
            disabled={disabled}
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="space-y-2">
          <Label className="text-sm">{label}</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange(field.id, true)}
              disabled={disabled}
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium rounded-md border transition-all duration-200",
                value === true
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-input hover:bg-accent",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {t('form.booleanYes')}
            </button>
            <button
              type="button"
              onClick={() => onChange(field.id, false)}
              disabled={disabled}
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium rounded-md border transition-all duration-200",
                value === false
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-input hover:bg-accent",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {t('form.booleanNo')}
            </button>
          </div>
        </div>
      );

    case 'select':
      return (
        <div className="space-y-2">
          <Label className="text-sm">{label}</Label>
          <Select
            value={typeof value === 'string' ? value : ''}
            onValueChange={(v) => onChange(field.id, v)}
            disabled={disabled ?? false}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder || label} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(`categoryFields.${categoryId}.${opt.labelKey}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    default:
      return null;
  }
});
CategoryField.displayName = 'CategoryField';

// ─── Main Component ──────────────────────────────────────────────────────────

export const DynamicCategoryFields = React.memo(({
  categoryId,
  values,
  onChange,
  disabled,
  selectedCoverages,
  onToggleCoverage,
}: DynamicCategoryFieldsProps) => {
  const tCaseBrief = useTranslations('workspace.caseBrief');

  const categoryDef = useMemo(() => getCategoryDef(categoryId), [categoryId]);

  if (!categoryDef) return null;

  return (
    <div className="space-y-6">
      {/* ✅ Category Description / Tooltip */}
      <div className="flex items-start gap-3 p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {tCaseBrief('form.categoryInfoTitle')}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            {tCaseBrief(`categoryDescriptions.${categoryId}`)}
          </p>
        </div>
      </div>

      {/* ✅ Dynamic Fields */}
      {categoryDef.fields.length > 0 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {tCaseBrief('form.dynamicFieldsTitle')}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tCaseBrief('form.dynamicFieldsDescription')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryDef.fields.map((field) => (
              <div
                key={field.id}
                className={cn(
                  // Textarea and long fields span full width
                  (field.type === 'textarea') && 'md:col-span-2'
                )}
              >
                <CategoryField
                  field={field}
                  value={values[field.id] ?? null}
                  onChange={onChange}
                  disabled={disabled ?? false}
                  t={tCaseBrief}
                  categoryId={categoryId}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ Suggested Coverages */}
      {categoryDef.suggestedCoverages.length > 0 && (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {tCaseBrief('form.suggestedCoveragesTitle')}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tCaseBrief('form.suggestedCoveragesDescription')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryDef.suggestedCoverages.map((coverageKey) => {
              // Resolve the display name via i18n
              const coverageName = tCaseBrief(`suggestedCoverages.${categoryId}.${coverageKey}`);
              const isSelected = selectedCoverages.includes(coverageName);

              return (
                <button
                  key={coverageKey}
                  type="button"
                  onClick={() => onToggleCoverage(coverageName)}
                  disabled={disabled}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-all duration-200",
                    isSelected
                      ? "bg-primary/10 text-primary border-primary/30 font-medium"
                      : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-foreground",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isSelected ? (
                    <X className="h-3 w-3" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  {coverageName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
DynamicCategoryFields.displayName = 'DynamicCategoryFields';
