'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus, X, DollarSign, User, FileText, Shield, LinkIcon, Building2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PdfUploader } from '@/components/Upload/PdfUploader';
import { OrgDocumentSelector } from '@/components/Common/OrgDocumentSelector';
import { useUI } from '@/lib/ui/state';
import { useClientValidation } from '@/hooks/useClientValidation';
import { useCompanyValidation } from '@/hooks/useCompanyValidation';
import { createCaseIfNeeded } from '@/lib/case-actions';
import { ClientValidationModal } from '@/components/Workspace/ClientValidationModal';
import { useRouter } from 'next/navigation';
import type { CaseBrief } from '@/lib/types';
import { DynamicCategoryFields } from '@/components/Cases/DynamicCategoryFields';
import { ANALYSIS_REASONS, getCategoriesForSubjectType, isCategoryValidForSubjectType } from '@/lib/insurance-categories';

// Define el tipo para uploads temporales
export type TempUpload = {
  id: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  pageCount?: number;
  charactersExtracted?: number;
  fileHash?: string;
  extractedText?: string;
  isExistingArtifact?: boolean; // ✅ CORRECCIÓN: Flag para identificar pólizas ya persistidas (no eliminables)
  /** Document role for comparison: baseline (current policy) or challenger (new proposals) */
  documentRole?: 'baseline' | 'challenger';
};

// Define el tipo para opciones de cliente
export type ClientOption = {
  id: string;
  name: string;
};

// Define el tipo para opciones de empresa
export type CompanyOption = {
  id: string;
  name: string;
};

// Tipo para el sujeto del caso: cliente (persona física) o empresa (persona jurídica)
export type SubjectType = 'client' | 'company';

// Define la interfaz de los datos que el formulario manejará
export type CaseBriefData = {
  // ✅ FASE CATEGORÍAS: Motivo del análisis (obligatorio)
  analysis_reason: string;
  // Nuevos campos del Brief detallado
  insurance_category: string;
  max_budget: number | null;
  budget_currency: 'COP' | 'USD';
  client_profile: string;
  notes: string;
  // Campos existentes que se mantendrán
  clientName: string;
  employees: number | null;
  freeText: string;
  // ✅ FASE CATEGORÍAS: Datos dinámicos de la categoría seleccionada
  // Incluye selected_coverages: string[] para coberturas sugeridas por categoría
  categoryData: Record<string, string | number | boolean | string[] | null>;
  // Uploads temporales
  tempUploads?: TempUpload[];
  // ✅ FASE POLICY_LINKS: Pólizas de organización a vincular
  linkedPolicyIds?: string[];
  // ✅ FIX DEFECTO 4: Cotizaciones de organización a vincular
  linkedQuoteIds?: string[];
};

interface BriefFormProps {
  onSubmit: (data: CaseBriefData) => Promise<void>;
  onApprove?: () => Promise<void>; // Nueva prop para aprobación con validación
  initialNotes?: string;
  isSubmitting: boolean;
  initialData?: any; // Datos del caso para modo edición (puede incluir artifacts)
  mode?: 'create' | 'edit';
  orgId?: string;
}

// ✅ FASE CATEGORÍAS: Las categorías ahora son dinámicas basadas en subjectType
// Se importan desde insurance-categories.ts: getCategoriesForSubjectType()

// ✅ CORRECCIÓN CRÍTICA: Memoizar categorías para evitar re-renders
// Ahora recibe subjectType además de t para renderizar categorías condicionales
const MemoizedSelectItems = React.memo(({ t, subjectType }: { t: (key: string) => string; subjectType: SubjectType }) => {
  const categories = getCategoriesForSubjectType(subjectType);
  return (
    <>
      {categories.map((value) => (
        <SelectItem key={value} value={value}>
          {t(`categories.${value}`)}
        </SelectItem>
      ))}
    </>
  );
});

// ✅ CORRECCIÓN: Función de comparación para BriefForm
const briefFormAreEqual = (prevProps: BriefFormProps, nextProps: BriefFormProps): boolean => {
  return (
    prevProps.isSubmitting === nextProps.isSubmitting &&
    prevProps.mode === nextProps.mode &&
    prevProps.orgId === nextProps.orgId &&
    prevProps.initialNotes === nextProps.initialNotes &&
    JSON.stringify(prevProps.initialData) === JSON.stringify(nextProps.initialData)
  );
};

const BriefForm = React.memo(({ onSubmit, onApprove, initialNotes = '', isSubmitting, initialData, mode = 'create', orgId }: BriefFormProps) => {
  const router = useRouter();
  const locale = useLocale();
  
  // i18n translations
  const tCaseBrief = useTranslations('workspace.caseBrief');

  // ✅ CORRECCIÓN: Usar selectores individuales para evitar loops infinitos (sin useShallow)
  const brief = useUI((state) => state.brief);
  const setBrief = useUI((state) => state.setBrief);
  const landingDataPending = useUI((state) => state.landingDataPending);
  const setLandingDataPending = useUI((state) => state.setLandingDataPending);
  const currentCaseId = useUI((state) => state.currentCaseId);
  const setCurrentCaseId = useUI((state) => state.setCurrentCaseId);
  const setInitialMessage = useUI((state) => state.setInitialMessage);

  const caseApproving = useUI((state) => state.caseApproving);
  const caseResolvingClient = useUI((state) => state.caseResolvingClient);
  const isBriefValid = useUI((state) => state.isBriefValid);
  const shouldShowApprovalButtons = useUI((state) => state.shouldShowApprovalButtons);
  const areApprovalButtonsEnabled = useUI((state) => state.areApprovalButtonsEnabled);
  const approvalPhase = useUI((state) => state.approvalPhase);

  // ✅ FASE 5: Hook para validación con modal
  const { validateAndResolveClient, isLoading: isClientValidationLoading, modalState, setModalState } = useClientValidation(true);

  // ✅ FASE 3: CORRECCIÓN DE INICIALIZACIÓN
  // Solo usar el 'brief' global como fallback SI estamos en un caso existente.
  // Para 'new-thread-placeholder', NO usar brief (evitar contaminación).
  const shouldUseBriefFallback = !!currentCaseId && currentCaseId !== 'new-thread-placeholder';

  // Estado para todos los campos del formulario
  const [formData, setFormData] = useState<CaseBriefData>({
    // Prioridad 1: initialData (cargado de BD en modo 'edit')
    // Prioridad 2: brief global (si estamos en un caso existente)
    // Prioridad 3: Valor por defecto vacío (si es 'new-thread-placeholder')
    analysis_reason: initialData?.analysis_reason || (shouldUseBriefFallback ? brief?.analysis_reason : '') || '',
    insurance_category: initialData?.insurance_category || (shouldUseBriefFallback ? brief?.insurance_category : '') || '',
    max_budget: initialData?.max_budget ?? (shouldUseBriefFallback ? brief?.max_budget : null) ?? null,
    budget_currency: initialData?.budget_currency || (shouldUseBriefFallback ? brief?.budget_currency : 'COP') || 'COP',
    client_profile: initialData?.client_profile || (shouldUseBriefFallback ? brief?.client_profile : '') || '',
    // ✅ SIMPLIFICACIÓN: Cargar freeText desde brief para autocompletar "Notas Adicionales" (desde LandingPage)
    // Prioridad: initialNotes > brief.freeText > ''
    notes: initialNotes || (brief?.freeText && brief.freeText.trim() !== '' ? brief.freeText : ''),
    // initialNotes viene del primer mensaje de landing
    clientName: initialData?.clientName || (shouldUseBriefFallback ? brief?.clientName : '') || '',
    employees: initialData?.employees ?? (shouldUseBriefFallback ? brief?.employees : null) ?? null,
    freeText: initialData?.briefData?.freeText || (shouldUseBriefFallback ? brief?.freeText : '') || '',
    categoryData: initialData?.briefData?.categoryData || (shouldUseBriefFallback ? brief?.categoryData : {}) || {},
  });

  // ✅ CORRECCIÓN: Estado para guardar datos iniciales en modo edición (para detección de cambios)
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<CaseBriefData | null>(null);
  const [initialArtifactCount, setInitialArtifactCount] = useState<number>(0);
  
  // ✅ CORRECCIÓN: Capturar snapshot inicial cuando se entra a modo edición
  useEffect(() => {
    if (mode === 'edit' && initialData && !initialFormSnapshot) {
      const snapshot: CaseBriefData = {
        analysis_reason: initialData.analysis_reason || '',
        insurance_category: initialData.insurance_category || '',
        max_budget: initialData.max_budget ?? null,
        budget_currency: initialData.budget_currency || 'COP',
        client_profile: initialData.client_profile || '',
        notes: initialData.briefData?.freeText || '',
        clientName: initialData.clientName || '',
        employees: initialData.employees ?? null,
        freeText: initialData.briefData?.freeText || '',
        categoryData: initialData.briefData?.categoryData || {},
      };
      setInitialFormSnapshot(snapshot);
      setInitialArtifactCount(initialData.artifacts?.length || 0);
      console.log('📸 [BriefForm] Snapshot inicial capturado para detección de cambios');
    }
  }, [mode, initialData, initialFormSnapshot]);

  // ✅ FASE 4: Limpiar formData SIEMPRE cuando currentCaseId cambia a null (navegación a new-thread-placeholder)
  // Los datos de Landing se cargarán después de la limpieza en otro useEffect
  useEffect(() => {
    console.log('🔍 [BriefForm] Checking reset condition:', { currentCaseId });
    if (!currentCaseId || currentCaseId === 'new-thread-placeholder') {
      console.log('🧹 [BriefForm] RESET TRIGGERED for new-thread-placeholder');

      // ✅ CORRECCIÓN REGRESIÓN: Solo resetear si NO hay consistencia de estado
      const currentState = useUI.getState();
      if (!currentState.caseApproved) {
        useUI.getState().setApprovalPhase('pending');
        useUI.getState().setCaseApproved(false);
        console.log('✅ [BriefForm] Approval phase reset to PENDING (Clean Slate)');
      } else {
        console.log('⚠️ [BriefForm] NO resetear aprobación: el caso ya está aprobado en localStorage');
      }

      setFormData({
        analysis_reason: '',
        insurance_category: '',
        max_budget: null,
        budget_currency: 'COP',
        client_profile: '',
        notes: '',
        clientName: '',
        employees: null,
        freeText: '',
        categoryData: {},
      });
    }
  }, [currentCaseId]);

  // ✅ FASE 4: Cargar datos de Landing desde brief (HomeClient ya los cargó temporalmente)
  // Leer desde brief.freeText y brief.tempUploads en lugar de landingDataPending directamente
  useEffect(() => {
    if (!currentCaseId || currentCaseId === 'new-thread-placeholder') {
      // Solo cargar si hay landingDataPending (indica que vienen datos de Landing)
      // Y si brief tiene los datos (HomeClient ya los cargó temporalmente)
      if (landingDataPending) {
        const briefFreeText = brief?.freeText;
        const briefTempUploads = (brief as any)?.tempUploads;

        // Cargar freeText desde brief a formData.notes
        if (briefFreeText && briefFreeText.trim() !== '') {
          console.log('📝 [BriefForm] Cargando notes desde brief.freeText (datos de Landing):', briefFreeText.substring(0, 50) + '...');
          setFormData(prev => {
            if (prev.notes !== briefFreeText) {
              return { ...prev, notes: briefFreeText };
            }
            return prev;
          });
        }

        // Cargar tempUploads desde brief
        if (briefTempUploads && Array.isArray(briefTempUploads) && briefTempUploads.length > 0) {
          console.log('📎 [BriefForm] Cargando tempUploads desde brief.tempUploads (datos de Landing):', briefTempUploads.length, 'archivos');
          setTempUploads(briefTempUploads);
        }

        // ✅ FASE 4: Eliminar datos del brief global y del flag después de cargar
        // IMPORTANTE: Hacer esto en un setTimeout para asegurar que los datos se carguen primero
        setTimeout(() => {
          setBrief({
            freeText: '',
            tempUploads: []
          } as any);
          setLandingDataPending(null);
          console.log('✅ [BriefForm] Datos de Landing cargados y eliminados del brief global y flag');
        }, 100);
      }
    }
  }, [landingDataPending, brief, currentCaseId, setBrief, setLandingDataPending]);

  // ❌ ELIMINADO: Cálculo local de isBriefValid
  // ✅ CORRECCIÓN CRÍTICA: Usar isBriefValid del estado global (ya declarado arriba)
  // Esto asegura sincronización perfecta con los otros botones
  // La función isBriefValid() del estado global lee brief.insurance_category
  // IMPORTANTE: brief.insurance_category se actualiza en tiempo real cuando se selecciona

  // ✅ CORRECCIÓN CRÍTICA: Convertir artifacts a tempUploads INMEDIATAMENTE al inicializar el estado
  // Esto evita que se muestren los artifacts en su formato original antes de la conversión
  const convertArtifactsToTempUploads = useCallback((artifacts: any[]): TempUpload[] => {
    if (!Array.isArray(artifacts) || artifacts.length === 0) return [];

    return artifacts
      .filter((artifact: any) => artifact.sourceType === 'pdf' && artifact.fileId)
      .map((artifact: any) => {
        const provenance = artifact.provenance || {};
        return {
          id: artifact.id,
          storagePath: artifact.fileId,
          fileName: artifact.fileName || 'Sin nombre',
          fileSize: provenance.fileSize || 0,
          pageCount: provenance.pageCount || undefined,
          charactersExtracted: provenance.charactersExtracted || undefined,
          fileHash: provenance.fileHash || undefined,
          extractedText: artifact.contentText || undefined,
          isExistingArtifact: true, // ✅ CORRECCIÓN: Marcar como póliza existente (no eliminable)
        };
      });
  }, []);

  // ✅ CORRECCIÓN CRÍTICA FASE 2.2: Inicializar tempUploads directamente desde artifacts si estamos en modo edición
  // Esto asegura que los artifacts se conviertan ANTES del primer render
  // Usar JSON.stringify para comparar artifacts de manera estable y evitar recálculos innecesarios
  const artifactsKey = useMemo(() => {
    if (mode === 'edit' && initialData?.artifacts) {
      const artifacts = Array.isArray(initialData.artifacts) ? initialData.artifacts : [];
      if (artifacts.length > 0) {
        // Crear una clave estable basada en los IDs de los artifacts
        return artifacts.map((a: any) => a.id || a.fileId).filter(Boolean).sort().join(',');
      }
    }
    return '';
  }, [mode, initialData?.artifacts]);

  const initialTempUploads = useMemo(() => {
    if (mode === 'edit' && initialData?.artifacts && artifactsKey) {
      const artifacts = Array.isArray(initialData.artifacts) ? initialData.artifacts : [];
      if (artifacts.length > 0) {
        const converted = convertArtifactsToTempUploads(artifacts);
        if (converted.length > 0) {
          console.log('✅ [BriefForm] Inicializando tempUploads desde artifacts (ANTES del primer render):', converted.length);
          return converted;
        }
      }
    }
    return [];
  }, [mode, artifactsKey, convertArtifactsToTempUploads]);

  // Estado para uploads temporales - inicializado con artifacts convertidos si estamos en modo edición
  const [tempUploads, setTempUploads] = useState<TempUpload[]>(initialTempUploads);

  // ✅ FASE POLICY_LINKS: Estado para pólizas de organización seleccionadas
  const [selectedOrgPolicyIds, setSelectedOrgPolicyIds] = useState<string[]>([]);
  // ✅ FASE ORG_DOCUMENTS: Estado para cotizaciones de organización seleccionadas
  const [selectedOrgQuoteIds, setSelectedOrgQuoteIds] = useState<string[]>([]);

  // ✅ CORRECCIÓN: Detectar si hay cambios en el formulario respecto al snapshot inicial
  // Esto permite mostrar/ocultar el botón "Actualizar Caso" solo cuando hay modificaciones
  // NOTA: Este useMemo DEBE estar DESPUÉS de la declaración de tempUploads para evitar TDZ error
  const hasFormChanges = useMemo(() => {
    // Solo aplicar detección de cambios en modo edición
    if (mode !== 'edit' || !initialFormSnapshot) return false;
    
    // Comparar campos editables (excluir insurance_category y clientName que están bloqueados)
    const editableFieldsChanged = 
      formData.max_budget !== initialFormSnapshot.max_budget ||
      formData.budget_currency !== initialFormSnapshot.budget_currency ||
      formData.client_profile !== initialFormSnapshot.client_profile ||
      formData.notes !== initialFormSnapshot.notes ||
      formData.employees !== initialFormSnapshot.employees;
    
    // Detectar si se añadieron nuevos tempUploads (pólizas)
    // Los tempUploads nuevos NO tienen isExistingArtifact = true
    const newUploadsCount = tempUploads.filter(u => !u.isExistingArtifact).length;
    const hasNewUploads = newUploadsCount > 0;
    
    return editableFieldsChanged || hasNewUploads;
  }, [mode, formData, initialFormSnapshot, tempUploads]);

  // ✅ CORRECCIÓN CRÍTICA: Sincronizar automáticamente formData con brief global cuando se va a aprobar
  // Esto asegura que cuando se hace click en "Aprobar" o "Aprobar y Continuar Análisis",
  // todos los datos del formulario estén disponibles en el brief global ANTES de aprobar
  useEffect(() => {
    // Detectar cuando se inicia el proceso de aprobación (caseApproving o caseResolvingClient cambian a true)
    if (caseApproving || caseResolvingClient) {
      console.log('🔄 [BriefForm] Detectado inicio de aprobación, sincronizando formData con brief global...');

      // Capturar TODOS los datos del formulario en el momento actual
      const finalFreeText = formData.notes || formData.freeText || '';

      const briefUpdate: Partial<CaseBrief> = {
        insurance_category: formData.insurance_category,
        max_budget: formData.max_budget ?? null,
        budget_currency: formData.budget_currency || 'COP',
        client_profile: formData.client_profile || '',
        clientName: formData.clientName || '',
        employees: formData.employees ?? null,
        freeText: finalFreeText, // ✅ CORRECCIÓN: Usar finalFreeText que prioriza notes
        tempUploads: tempUploads || [], // ✅ CRÍTICO: Incluir tempUploads (pueden venir del Landing)
        // ✅ FASE CLIENTE/EMPRESA: Preservar campos de empresa en sincronización
        subjectType: subjectType,
        companyName: selectedCompany?.name || '',
        selectedCompanyId: selectedCompany?.id || null,
      };

      console.log('📝 [BriefForm] Sincronizando brief global con TODOS los datos del formulario:', {
        ...briefUpdate,
        freeText: briefUpdate.freeText?.substring(0, 50) + '...',
        tempUploadsCount: briefUpdate.tempUploads?.length || 0,
        subjectType: briefUpdate.subjectType,
        companyName: briefUpdate.companyName,
      });

      // Sincronizar con el estado global
      setBrief(briefUpdate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // ✅ SOLO los flags booleanos como triggers. formData, tempUploads, subjectType, selectedCompany
    // se leen como valores capturados por closure, NO como triggers de re-ejecución.
    // Incluirlos causaba un loop infinito: formData cambia referencia → effect → setBrief → re-render → loop.
  }, [caseApproving, caseResolvingClient]);

  // ✅ CORRECCIÓN CRÍTICA FASE 2.2: useEffect para sincronizar cuando artifacts cambian
  // FORZAR conversión inmediatamente cuando mode === 'edit' y hay artifacts
  useEffect(() => {
    const currentCaseId = useUI.getState().currentCaseId;

    if (!currentCaseId) {
      // Solo cargar tempUploads si hay landingDataPending (datos vienen de Landing)
      // Y si no están ya cargados en el estado local
      if (landingDataPending && tempUploads.length === 0) {
        const briefTempUploads = (brief as any)?.tempUploads;
        if (briefTempUploads && Array.isArray(briefTempUploads) && briefTempUploads.length > 0) {
          console.log('📎 [BriefForm] Cargando tempUploads desde brief global (fallback):', briefTempUploads.length, 'archivos');
          setTempUploads(briefTempUploads);
        }
      }
      // Si no hay landingDataPending, no cargar (evitar residuales)
    } else if (mode === 'edit' && initialData?.artifacts) {
      // ✅ CORRECCIÓN CRÍTICA: En modo edición, convertir artifacts a tempUploads INMEDIATAMENTE
      // IMPORTANTE: MERGEAR con tempUploads existentes para preservar nuevos PDFs agregados por el usuario
      const artifacts = Array.isArray(initialData.artifacts) ? initialData.artifacts : [];
      if (artifacts.length > 0) {
        const convertedTempUploads = convertArtifactsToTempUploads(artifacts);

        // ✅ CORRECCIÓN CRÍTICA: MERGEAR artifacts convertidos con tempUploads nuevos (no sobrescribir)
        // Esto preserva los nuevos PDFs que el usuario ha agregado mientras mantiene los históricos
        if (convertedTempUploads.length > 0) {
          // Obtener los storagePaths de los artifacts convertidos
          const convertedPaths = new Set(convertedTempUploads.map(u => u.storagePath));

          // Identificar tempUploads nuevos que NO vienen de artifacts (agregados por el usuario)
          const newTempUploads = tempUploads.filter(u => !convertedPaths.has(u.storagePath));

          // MERGEAR: artifacts convertidos + nuevos tempUploads
          const mergedTempUploads = [...convertedTempUploads, ...newTempUploads];

          // Verificar si hay cambios (nuevos artifacts o nuevos tempUploads)
          const currentPaths = tempUploads.map(u => u.storagePath).sort().join(',');
          const mergedPaths = mergedTempUploads.map(u => u.storagePath).sort().join(',');

          // ✅ ACTUALIZAR solo si hay cambios (nuevos artifacts o nuevos tempUploads)
          if (tempUploads.length === 0 || currentPaths !== mergedPaths) {
            console.log('✅ [BriefForm] Sincronizando tempUploads (MERGE):', {
              artifacts: convertedTempUploads.length,
              nuevos: newTempUploads.length,
              total: mergedTempUploads.length
            });
            setTempUploads(mergedTempUploads);

            // Sincronizar con brief global
            const currentBrief = useUI.getState().brief;
            setBrief({
              ...currentBrief,
              tempUploads: mergedTempUploads
            } as any);
          }
        }
      } else if (tempUploads.length > 0) {
        // Si no hay artifacts pero hay tempUploads, mantenerlos (pueden ser nuevos PDFs agregados)
        // NO limpiar - el usuario puede haber agregado nuevos PDFs
        console.log('✅ [BriefForm] Manteniendo tempUploads nuevos (no hay artifacts históricos):', tempUploads.length);
      }
    } else if (currentCaseId && mode !== 'edit') {
      // Para casos históricos en modo creación, limpiar tempUploads para evitar PDFs residuales
      console.log('🧹 [BriefForm] Limpiando tempUploads para caso histórico (modo creación):', currentCaseId);
      setTempUploads([]);
      // También limpiar del brief global
      const currentBrief = useUI.getState().brief;
      if ((currentBrief as any)?.tempUploads && (currentBrief as any).tempUploads.length > 0) {
        setBrief({ tempUploads: [] } as any);
      }
    }
  }, [brief, landingDataPending, setBrief, mode, artifactsKey, convertArtifactsToTempUploads, initialData?.artifacts]); // ✅ Usar artifactsKey en lugar de tempUploads.length para evitar loops

  // ✅ FASE 2 REFORMULADA QUIRÚRGICA: Limpiar estado local cuando no hay currentCaseId
  // ✅ CORRECCIÓN: También limpiar tempUploads del brief global
  useEffect(() => {
    const currentCaseId = useUI.getState().currentCaseId;
    if (!currentCaseId) {
      console.log('🧹 [BriefForm] Limpiando estado local para new-thread-placeholder');
      setFormData({
        analysis_reason: '',
        insurance_category: '',
        max_budget: null,
        budget_currency: 'COP',
        client_profile: '',
        notes: '', // ✅ CORRECCIÓN QUIRÚRGICA: Limpiar notes completamente
        clientName: '',
        employees: null,
        freeText: '',
        categoryData: {},
      });
      setTempUploads([]);

      // ✅ CORRECCIÓN: Limpiar tempUploads del brief global para evitar PDFs residuales
      const currentBrief = useUI.getState().brief;
      if ((currentBrief as any).tempUploads && (currentBrief as any).tempUploads.length > 0) {
        setBrief({ tempUploads: [] } as any);
        console.log('🧹 [BriefForm] tempUploads limpiados del brief global');
      }

      // ✅ CORRECCIÓN QUIRÚRGICA: Limpiar estados específicos del combobox
      setClientSearchTerm('');
      setSelectedClient(null);
      setIsClientComboboxOpen(false);
      // ✅ Limpiar estados de empresa también
      setCompanySearchTerm('');
      setSelectedCompany(null);
      setIsCompanyComboboxOpen(false);
    }
  }, [initialNotes, setBrief]);

  // ✅ FASE CLIENTE/EMPRESA: Estado para el tipo de sujeto
  const [subjectType, setSubjectType] = useState<SubjectType>(
    (initialData?.subjectType as SubjectType) || 
    (shouldUseBriefFallback ? (brief as any)?.subjectType : 'client') || 
    'client'
  );

  // Estados para el Combobox de clientes
  const [clientList, setClientList] = useState<ClientOption[]>([]);
  const [isClientListLoading, setIsClientListLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientComboboxOpen, setIsClientComboboxOpen] = useState(false);

  // ✅ FASE CLIENTE/EMPRESA: Estados para el Combobox de empresas
  const [companyList, setCompanyList] = useState<CompanyOption[]>([]);
  const [isCompanyListLoading, setIsCompanyListLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [isCompanyComboboxOpen, setIsCompanyComboboxOpen] = useState(false);

  // Cargar clientes al montar el componente
  useEffect(() => {
    const loadClients = async () => {
      console.log('🔄 Loading clients...');
      setIsClientListLoading(true);
      try {
        const response = await fetch('/api/clients/list');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log('✅ Clients loaded:', data.clients?.length || 0);
        setClientList(data.clients || []);
      } catch (error) {
        console.error('❌ Error loading clients:', error);
        setClientList([]); // Asegura que la lista esté vacía en caso de error
      } finally {
        console.log('🏁 Client loading finished');
        setIsClientListLoading(false);
      }
    };
    loadClients();
  }, []);

  // ✅ FASE CLIENTE/EMPRESA: Cargar empresas al montar el componente
  useEffect(() => {
    const loadCompanies = async () => {
      console.log('🔄 Loading companies...');
      setIsCompanyListLoading(true);
      try {
        const response = await fetch('/api/companies/list');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log('✅ Companies loaded:', data.companies?.length || 0);
        setCompanyList(data.companies || []);
      } catch (error) {
        console.error('❌ Error loading companies:', error);
        setCompanyList([]);
      } finally {
        console.log('🏁 Company loading finished');
        setIsCompanyListLoading(false);
      }
    };
    loadCompanies();
  }, []);

  // ✅ CORRECCIÓN QUIRÚRGICA: Sincronización inicial de clientName desde brief (solo cuando hay currentCaseId)
  useEffect(() => {
    const currentCaseId = useUI.getState().currentCaseId;
    if (currentCaseId && !clientSearchTerm && brief?.clientName) {
      setClientSearchTerm(brief.clientName);
    }
    // Sincronizar companyName también
    if (currentCaseId && !companySearchTerm && (brief as any)?.companyName) {
      setCompanySearchTerm((brief as any).companyName);
    }
  }, []); // Solo ejecutar una vez al montar

  // En modo edición: Sincronizar initialData con brief global al montar
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      console.log('🔄 [BriefForm] Edit mode: Syncing initialData to brief', initialData);
      setBrief({
        insurance_category: initialData.insurance_category || '',
        clientName: initialData.clientName || '',
        employees: initialData.employees || 0,
        freeText: initialData.briefData?.freeText || '',
        // ✅ CORRECCIÓN: Incluir campos de empresa para que persistan en el brief global durante edición
        ...(initialData.subjectType && { subjectType: initialData.subjectType }),
        ...(initialData.subjectType === 'company' && {
          companyName: initialData.clientName || '', // clientName almacena nombre de empresa cuando subjectType=company
          selectedCompanyId: initialData.companyId || null,
        }),
      });
    }
  }, [mode, initialData, setBrief]); // Dependencias correctas

  // ✅ CORRECCIÓN CRÍTICA: Rehidratar selectedCompany desde initialData en modo edición
  // Sin esto, la validación en handleSubmit (subjectType=company && !selectedCompany) bloquea la actualización
  // porque el campo empresa está disabled y el usuario no puede interactuar con el dropdown
  useEffect(() => {
    if (mode !== 'edit' || !initialData?.companyId || initialData?.subjectType !== 'company') return;
    // Esperar a que companyList se cargue (race condition protegida por dependencia)
    if (companyList.length === 0) return;
    // Evitar sobrescribir si ya está rehidratado
    if (selectedCompany?.id === initialData.companyId) return;

    const matchedCompany = companyList.find(c => c.id === initialData.companyId);
    if (matchedCompany) {
      // Empresa encontrada en la lista de la org
      setSelectedCompany(matchedCompany);
      setCompanySearchTerm(matchedCompany.name);
      console.log('✅ [BriefForm] Edit mode: selectedCompany rehidratado desde companyList:', matchedCompany.name);
    } else {
      // Fallback: empresa no está en la lista actual (posiblemente eliminada/migrada)
      // Construir CompanyOption desde initialData para que la validación pase
      const fallbackCompany: CompanyOption = {
        id: initialData.companyId,
        name: initialData.clientName || 'Empresa',
      };
      setSelectedCompany(fallbackCompany);
      setCompanySearchTerm(fallbackCompany.name);
      console.warn('⚠️ [BriefForm] Edit mode: empresa no encontrada en companyList, usando fallback:', fallbackCompany);
    }
  }, [mode, initialData?.companyId, initialData?.subjectType, initialData?.clientName, companyList, selectedCompany?.id]);

  // Efecto para cerrar el dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isClientComboboxOpen && !target.closest('.client-combobox-container')) {
        setIsClientComboboxOpen(false);
      }
      // ✅ FASE CLIENTE/EMPRESA: También cerrar combobox de empresas
      if (isCompanyComboboxOpen && !target.closest('.company-combobox-container')) {
        setIsCompanyComboboxOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isClientComboboxOpen, isCompanyComboboxOpen]);

  // Handlers para actualizar el estado - MEMOIZADO
  // ✅ CORRECCIÓN CRÍTICA: Actualizar solo el estado local (NO guardar en tiempo real)
  // EXCEPCIÓN: insurance_category se actualiza en tiempo real para sincronizar los botones
  // El guardado del resto de campos se hará SOLO cuando el usuario haga click en los botones sincronizados
  // Esto asegura que los datos autollenados del Landing se capturen correctamente
  const updateField = useCallback((field: keyof CaseBriefData, value: any) => {
    // ✅ Actualizar estado local
    setFormData(prev => ({ ...prev, [field]: value }));

    // ✅ EXCEPCIÓN CRÍTICA: Actualizar insurance_category en brief global en tiempo real
    // Esto es necesario para sincronizar los 3 botones (Buscar Planes, Aprobar, Aprobar y Continuar)
    // Todos los botones usan isBriefValid() que lee brief.insurance_category del estado global
    if (field === 'insurance_category') {
      setBrief({ insurance_category: value } as Partial<CaseBrief>);
      // ✅ FASE CATEGORÍAS: Resetear datos dinámicos cuando cambia la categoría
      setFormData(prev => ({ ...prev, categoryData: {} }));
      console.log('✅ [BriefForm] insurance_category actualizado en brief global para sincronización de botones:', value);
    }

    // ✅ FASE CATEGORÍAS: Sincronizar analysis_reason en brief global (necesario para isBriefValid)
    if (field === 'analysis_reason') {
      setBrief({ analysis_reason: value } as Partial<CaseBrief>);
      console.log('✅ [BriefForm] analysis_reason actualizado en brief global:', value);
    }

    // ❌ ELIMINADO: Actualización en tiempo real del resto de campos en brief global
    // Esto era ineficiente y causaba que los datos autollenados no se guardaran
    // El brief se actualizará SOLO cuando se haga click en los botones (handleSubmit)
  }, [setBrief]);

  // Handlers para el Combobox de clientes - MEMOIZADO
  const handleClientSelect = useCallback((client: ClientOption | null) => {
    const name = client?.name || '';
    const id = client?.id || null;

    // Actualizar estado local
    setSelectedClient(client);
    setClientSearchTerm(name);
    updateField('clientName', name);

    // Actualizar estado global funcionalmente
    setBrief({ clientName: name, selectedClientId: id } as Partial<CaseBrief>);
    setIsClientComboboxOpen(false);
  }, [updateField, setBrief]); // <-- ELIMINAR 'brief'

  const handleClientSearchChange = useCallback((value: string) => {
    setClientSearchTerm(value);

    // Actualizar también el estado local del formulario
    updateField('clientName', value);

    // Actualizar estado global con el término de búsqueda, marcando que no hay ID seleccionado
    setBrief({ clientName: value, selectedClientId: null } as Partial<CaseBrief>);

    // Abrir dropdown cuando se escriba
    if (value.length > 0) {
      setIsClientComboboxOpen(true);
    }
  }, [setBrief, updateField]);

  // ✅ FASE CLIENTE/EMPRESA: Handlers para el Combobox de empresas
  const handleCompanySelect = useCallback((company: CompanyOption | null) => {
    const name = company?.name || '';
    const id = company?.id || null;

    // Actualizar estado local
    setSelectedCompany(company);
    setCompanySearchTerm(name);

    // Actualizar estado global
    setBrief({ companyName: name, selectedCompanyId: id } as any);
    setIsCompanyComboboxOpen(false);
  }, [setBrief]);

  const handleCompanySearchChange = useCallback((value: string) => {
    setCompanySearchTerm(value);

    // ✅ SELECTOR ESTRICTO: Solo actualizar el término de búsqueda visual para filtrar.
    // NO actualizamos companyName/selectedCompanyId en el brief - esos solo cambian al seleccionar.
    // Esto previene que texto libre se acepte como nombre de empresa.

    // Abrir dropdown cuando se escriba
    if (value.length > 0) {
      setIsCompanyComboboxOpen(true);
    }
  }, []);

  // ✅ SELECTOR ESTRICTO: Al perder foco, revertir al último valor seleccionado o vaciar
  const handleCompanyBlur = useCallback(() => {
    // Pequeño delay para permitir que el click en el dropdown se procese primero
    setTimeout(() => {
      if (selectedCompany) {
        // Revertir al nombre de la empresa seleccionada
        setCompanySearchTerm(selectedCompany.name);
      } else {
        // No hay empresa seleccionada: vaciar el campo
        setCompanySearchTerm('');
        setBrief({ companyName: undefined, selectedCompanyId: null } as any);
      }
      setIsCompanyComboboxOpen(false);
    }, 200);
  }, [selectedCompany, setBrief]);

  // ✅ SELECTOR ESTRICTO: Limpiar selección de empresa
  const handleCompanyClear = useCallback(() => {
    setSelectedCompany(null);
    setCompanySearchTerm('');
    setBrief({ companyName: undefined, selectedCompanyId: null } as any);
    setIsCompanyComboboxOpen(false);
  }, [setBrief]);

  // ✅ FASE CLIENTE/EMPRESA: Handler para cambio de tipo de sujeto
  const handleSubjectTypeChange = useCallback((newType: SubjectType) => {
    setSubjectType(newType);

    // ✅ FASE CATEGORÍAS: Resetear categoría y datos dinámicos al cambiar tipo
    // Las categorías son diferentes por tipo (corporate vs personal)
    const currentCategory = formData.insurance_category;
    if (currentCategory && !isCategoryValidForSubjectType(currentCategory, newType)) {
      setFormData(prev => ({ ...prev, insurance_category: '', categoryData: {} }));
      setBrief({ insurance_category: '' } as Partial<CaseBrief>);
      console.log('🔄 [BriefForm] Categoría reseteada: no válida para nuevo subjectType:', newType);
    }
    
    // Limpiar selecciones al cambiar de tipo
    if (newType === 'client') {
      setCompanySearchTerm('');
      setSelectedCompany(null);
      setBrief({ subjectType: 'client', companyName: undefined, selectedCompanyId: null } as any);
    } else {
      setClientSearchTerm('');
      setSelectedClient(null);
      updateField('clientName', '');
      setBrief({ subjectType: 'company', clientName: undefined, selectedClientId: null } as any);
    }
    console.log('🔄 [BriefForm] Tipo de sujeto cambiado a:', newType);
  }, [setBrief, updateField, formData.insurance_category]);

  // ✅ CORRECCIÓN CRÍTICA: Ref para almacenar onUploadComplete de PdfUploader
  // Esto permite llamar a onUploadComplete desde handleFileUpload para que PdfUploader limpie selectedFile
  const onUploadCompleteRef = useRef<((upload: TempUpload) => void) | null>(null);
  // ✅ FASE BASELINE vs CHALLENGERS: Ref para el documentRole del upload actual
  const currentUploadRoleRef = useRef<'baseline' | 'challenger'>('challenger');

  // Handlers para uploads
  // ✅ FASE BASELINE vs CHALLENGERS: Modificado para aceptar documentRole
  const handleFileUpload = async (file: File, documentRole: 'baseline' | 'challenger' = 'challenger') => {
    console.log('📄 [BriefForm] Iniciando subida de PDF temporal:', file.name, 'rol:', documentRole);
    
    // Guardar el rol actual para cuando se complete el upload
    currentUploadRoleRef.current = documentRole;

    try {
      // ✅ REUTILIZACIÓN MÁXIMA: Usar el mismo endpoint que el Landing
      const formData = new FormData();
      formData.append('pdf', file);

      console.log('🚀 [BriefForm] Enviando a /api/upload/pdf...');
      const response = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      console.log('📡 [BriefForm] Respuesta recibida:', result);

      if (result.success && result.mode === 'temp' && result.tempUpload) {
        console.log('✅ [BriefForm] PDF subido como temp con storagePath real:', result.tempUpload);

        // ✅ FASE BASELINE vs CHALLENGERS: Agregar documentRole al upload
        const uploadWithRole = {
          ...result.tempUpload,
          documentRole: currentUploadRoleRef.current,
        };

        // ✅ CORRECCIÓN CRÍTICA: Llamar a onUploadComplete (que pasa por wrappedOnUploadComplete en PdfUploader)
        // Esto permite que PdfUploader limpie selectedFile ANTES de agregar a tempUploads
        // onUploadCompleteRef.current es handleUploadComplete que se pasa a PdfUploader
        if (onUploadCompleteRef.current) {
          onUploadCompleteRef.current(uploadWithRole);
        } else {
          // Fallback: si no hay ref, llamar directamente a handleUploadComplete
          handleUploadComplete(uploadWithRole);
        }
      } else {
        console.error('❌ [BriefForm] Error al subir PDF:', result.error);
        alert(`Error: ${result.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ [BriefForm] Error en fetch /api/upload/pdf:', error);
      alert('Error de conexión al subir PDF');
    }
  };

  const handleUploadComplete = useCallback((upload: TempUpload) => {
    // ✅ CORRECCIÓN CRÍTICA: Verificar que el upload no esté ya en tempUploads (evitar duplicados)
    setTempUploads(prev => {
      const exists = prev.some(u => u.storagePath === upload.storagePath);
      if (exists) {
        console.log('⚠️ [BriefForm] Upload ya existe en tempUploads, omitiendo:', upload.storagePath);
        return prev;
      }
      console.log('✅ [BriefForm] Agregando nuevo upload a tempUploads:', upload.fileName);
      return [...prev, upload];
    });

    // ✅ Sincronizar con Zustand global
    const currentBrief = useUI.getState().brief;
    const currentTempUploads = currentBrief.tempUploads || [];
    const existsInBrief = currentTempUploads.some((u: any) => u.storagePath === upload.storagePath);
    if (!existsInBrief) {
      setBrief({
        ...currentBrief,
        tempUploads: [...currentTempUploads, upload]
      });
    }

    // ✅ CORRECCIÓN CRÍTICA: Notificar a PdfUploader para que limpie selectedFile
    // Esto se hace llamando a onUploadComplete que se pasa a PdfUploader
    // PdfUploader usará handleUploadCompleteWrapper para limpiar selectedFile
  }, [setBrief]);

  // ✅ CORRECCIÓN CRÍTICA: Función wrapper que combina handleUploadComplete con notificación a PdfUploader
  // Esta función se pasa a PdfUploader como onUploadComplete
  // Cuando se llama desde handleFileUpload, agrega el upload a tempUploads
  // PdfUploader usa wrappedOnUploadComplete que limpia selectedFile automáticamente cuando onUploadComplete se llama
  const handleUploadCompleteWithCleanup = useCallback((upload: TempUpload) => {
    // Agregar a tempUploads (handleUploadComplete)
    handleUploadComplete(upload);
    // Nota: La limpieza de selectedFile en PdfUploader se hace automáticamente
    // porque PdfUploader usa wrappedOnUploadComplete que intercepta onUploadComplete cuando no hay caseId
    // wrappedOnUploadComplete se ejecuta cuando onUploadComplete (que es handleUploadCompleteWithCleanup) se llama
  }, [handleUploadComplete]);

  const handleRemoveUpload = (storagePath: string) => {
    setTempUploads(prev => prev.filter(upload => upload.storagePath !== storagePath));
    // ✅ Sincronizar con Zustand global
    const currentBrief = useUI.getState().brief;
    setBrief({
      ...currentBrief,
      tempUploads: (currentBrief.tempUploads || []).filter(upload => upload.storagePath !== storagePath)
    });
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🚀 [BriefForm] handleSubmit triggered. Mode:', mode);
    console.log('📦 [BriefForm] formData completo:', formData);
    console.log('📎 [BriefForm] tempUploads:', tempUploads);

    // ✅ VALIDACIÓN TEMPRANA: Prevenir envío sin motivo de análisis
    if (!formData.analysis_reason?.trim()) {
      console.warn('❌ [BriefForm] Intentando enviar sin motivo de análisis');
      alert('Por favor selecciona un motivo del análisis para continuar.');
      return;
    }

    // ✅ VALIDACIÓN TEMPRANA: Prevenir envío sin categoría de seguro
    if (!formData.insurance_category?.trim()) {
      console.warn('❌ [BriefForm] Intentando enviar sin categoría de seguro');
      alert('Por favor selecciona una categoría de seguro para continuar.');
      return;
    }

    // ✅ VALIDACIÓN EMPRESA: Prevenir envío sin empresa seleccionada cuando subjectType=company
    if (subjectType === 'company' && !selectedCompany) {
      console.warn('❌ [BriefForm] Intentando enviar con tipo empresa pero sin empresa seleccionada');
      alert('Por favor selecciona una empresa existente de la lista para continuar.');
      return;
    }

    try {
      // ✅ CORRECCIÓN CRÍTICA: Capturar TODOS los datos del formulario en el momento del click
      // Esto incluye datos autollenados del Landing que pueden no haberse guardado en tiempo real
      // Mapear formData.notes a freeText (las "Notas Adicionales")
      const finalFreeText = formData.notes || formData.freeText || '';

      // ✅ ACTUALIZAR brief explícitamente con TODOS los datos del formulario
      // Esto se hace SOLO cuando el usuario hace click en los botones sincronizados
      const briefUpdate: Partial<CaseBrief> = {
        analysis_reason: formData.analysis_reason,
        insurance_category: formData.insurance_category,
        max_budget: formData.max_budget ?? null,
        budget_currency: formData.budget_currency || 'COP',
        client_profile: formData.client_profile || '',
        clientName: formData.clientName || '',
        employees: formData.employees ?? null,
        freeText: finalFreeText, // ✅ CORRECCIÓN: Usar finalFreeText que prioriza notes
        tempUploads: tempUploads || [], // ✅ CRÍTICO: Incluir tempUploads (pueden venir del Landing)
        linkedPolicyIds: selectedOrgPolicyIds || [], // ✅ FASE POLICY_LINKS: Incluir pólizas de org seleccionadas
        linkedQuoteIds: selectedOrgQuoteIds || [], // ✅ FASE ORG_DOCUMENTS: Incluir cotizaciones de org seleccionadas
        // ✅ FASE CLIENTE/EMPRESA: Preservar campos de empresa en sincronización
        subjectType: subjectType,
        companyName: selectedCompany?.name || '',
        selectedCompanyId: selectedCompany?.id || null,
        // ✅ FASE CATEGORÍAS: Datos dinámicos de la categoría seleccionada
        categoryData: formData.categoryData || {},
      };

      console.log('📝 [BriefForm] Actualizando brief global con TODOS los datos del formulario:', {
        ...briefUpdate,
        freeText: briefUpdate.freeText?.substring(0, 50) + '...',
        tempUploadsCount: briefUpdate.tempUploads?.length || 0,
        linkedPolicyIdsCount: selectedOrgPolicyIds?.length || 0,
        linkedQuoteIdsCount: selectedOrgQuoteIds?.length || 0
      });
      // 🔍 DEBUG: Log detallado de linkedPolicyIds y linkedQuoteIds
      console.log('🔍 [BriefForm] selectedOrgPolicyIds EXACTOS:', JSON.stringify(selectedOrgPolicyIds));
      console.log('🔍 [BriefForm] selectedOrgQuoteIds EXACTOS:', JSON.stringify(selectedOrgQuoteIds));
      console.log('🔍 [BriefForm] briefUpdate.linkedPolicyIds EXACTOS:', JSON.stringify(briefUpdate.linkedPolicyIds));
      console.log('🔍 [BriefForm] briefUpdate.linkedQuoteIds EXACTOS:', JSON.stringify(briefUpdate.linkedQuoteIds));
      setBrief(briefUpdate);

      // En modo edición: llamar onSubmit con todos los datos
      if (mode === 'edit') {
        // ✅ CORRECCIÓN: En modo edición, filtrar tempUploads para enviar solo los nuevos (no los que ya están en artifacts)
        // Los artifacts históricos ya están en BD, solo necesitamos enviar los nuevos
        const existingArtifactPaths = initialData?.artifacts
          ?.filter((a: any) => a.sourceType === 'pdf' && a.fileId)
          .map((a: any) => a.fileId) || [];

        const newTempUploads = tempUploads.filter(
          upload => !existingArtifactPaths.includes(upload.storagePath)
        );

        // ✅ CORRECCIÓN CRÍTICA: Mapear formData.notes a freeText ANTES de llamar a onSubmit
        // Esto asegura que las "Notas Adicionales" se envíen correctamente como freeText
        const formDataWithFreeText = {
          ...formData,
          freeText: formData.notes || formData.freeText || '', // ✅ Prioridad: notes > freeText > ''
          tempUploads: newTempUploads,
          linkedPolicyIds: selectedOrgPolicyIds || [], // ✅ FASE POLICY_LINKS: Incluir pólizas de org
          linkedQuoteIds: selectedOrgQuoteIds || [], // ✅ FASE ORG_DOCUMENTS: Incluir cotizaciones de org
        };

        console.log('✏️ [BriefForm] Edit mode: Calling onSubmit with formData + newTempUploads', {
          totalTempUploads: tempUploads.length,
          existingArtifacts: existingArtifactPaths.length,
          newTempUploads: newTempUploads.length,
          linkedPolicyIds: selectedOrgPolicyIds?.length || 0,
          linkedQuoteIds: selectedOrgQuoteIds?.length || 0,
          freeText: formDataWithFreeText.freeText?.substring(0, 50) + '...',
          notes: formData.notes?.substring(0, 50) + '...'
        });
        await onSubmit(formDataWithFreeText);
      } else {
        // ✅ FASE 5: Modo creación - Usar createCaseIfNeeded extendido
        if (onApprove) {
          // ✅ CORRECCIÓN CRÍTICA: Usar briefUpdate que ya contiene TODOS los datos del formulario
          // No necesitamos mezclar con brief anterior porque ya capturamos todo desde formData
          // Esto asegura que los datos autollenados del Landing se incluyan correctamente
          console.log('✅ [BriefForm] Usando briefUpdate completo (ya contiene todos los datos del formulario)', {
            freeText: briefUpdate.freeText?.substring(0, 50) + '...',
            tempUploadsCount: briefUpdate.tempUploads?.length || 0,
            insurance_category: briefUpdate.insurance_category
          });

          // ✅ FASE 5: Usar función extendida con modal de validación
          console.log('✅ [BriefForm] FASE 5: Usando createCaseIfNeeded extendido con modal');

          // ✅ FASE 5: Establecer estados de bloqueo (caseApproving ya se establece en createCaseIfNeeded)
          useUI.setState({ caseApproving: true });

          try {
            // createCaseIfNeeded ahora retorna { caseId, clientId }
            const result = await createCaseIfNeeded(
              briefUpdate, // ✅ CORRECCIÓN: Usar briefUpdate que contiene TODOS los datos del formulario
              router,
              {
                validateClient: validateAndResolveClient,
                setInitialMessage,
                setCurrentCaseId,
                currentCaseId,
                saveUserMessage: true, // ✅ FASE 5: Guardar mensaje del usuario como primer mensaje
                locale: locale as 'en' | 'es', // ✅ CORRECCIÓN i18n: Pasar locale para navegación consistente
              }
            );
            console.log('✅ [BriefForm] Caso creado exitosamente con createCaseIfNeeded:', result.caseId);
            // Si createCaseIfNeeded navegó exitosamente, este código no se ejecutará
            // La navegación SPA hace que el componente se desmonte o se actualice
          } catch (error: any) {
            console.error('❌ [BriefForm] Error en createCaseIfNeeded:', error);

            // ✅ FASE 5: Manejar cancelación de creación de cliente
            if (error.message === 'CLIENT_CREATION_CANCELLED') {
              console.log('ℹ️ [BriefForm] Usuario canceló creación de cliente');
              // No mostrar error, solo resetear estados
              useUI.setState({ caseApproving: false });
              return; // No propagar error si es cancelación
            } else {
              // Mostrar error solo si no es cancelación
              alert(error.message || 'Error al crear el caso. Por favor intenta de nuevo.');
              useUI.setState({ caseApproving: false });
              throw error;
            }
          }
        } else {
          // ✅ CORRECCIÓN CRÍTICA: Mapear formData.notes a freeText ANTES de llamar a onSubmit
          // Esto asegura que las "Notas Adicionales" se envíen correctamente como freeText
          const formDataWithFreeText = {
            ...formData,
            freeText: formData.notes || formData.freeText || '', // ✅ Prioridad: notes > freeText > ''
            tempUploads: tempUploads,
            linkedPolicyIds: selectedOrgPolicyIds || [], // ✅ FASE POLICY_LINKS: Incluir pólizas de org
            linkedQuoteIds: selectedOrgQuoteIds || [], // ✅ FASE ORG_DOCUMENTS: Incluir cotizaciones de org
          };
          console.log('📝 [BriefForm] Fallback mode: Calling onSubmit with formData (notes mapeado a freeText)', {
            freeText: formDataWithFreeText.freeText?.substring(0, 50) + '...',
            notes: formData.notes?.substring(0, 50) + '...',
            linkedPolicyIds: selectedOrgPolicyIds?.length || 0,
            linkedQuoteIds: selectedOrgQuoteIds?.length || 0
          });
          await onSubmit(formDataWithFreeText);
        }
      }
    } catch (error: any) {
      console.error('❌ [BriefForm] Error en handleSubmit:', error);
      // Re-lanzar el error para que se maneje en el componente padre
      throw error;
    }
  }, [onApprove, onSubmit, formData, tempUploads, selectedOrgPolicyIds, selectedOrgQuoteIds, setBrief, mode, formData.insurance_category, router, validateAndResolveClient, setInitialMessage, setCurrentCaseId, currentCaseId, subjectType, selectedCompany]);

  // ✅ CORRECCIÓN UX: Estado combinado para mostrar overlay de procesamiento
  const isProcessing = isSubmitting || caseApproving || caseResolvingClient;

  return (
    <Card className="w-full max-w-4xl mx-auto relative">
      {/* ✅ CORRECCIÓN UX: Overlay de procesamiento visual inmediato */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="flex flex-col items-center gap-3 p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="font-medium text-foreground">
              {caseResolvingClient ? tCaseBrief('form.validatingClient') : tCaseBrief('form.processing')}
            </p>
            <p className="text-sm text-muted-foreground">{tCaseBrief('form.pleaseWait')}</p>
          </div>
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {tCaseBrief('form.title')}
        </CardTitle>
        <CardDescription>
          {tCaseBrief('form.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ═══════════════════════════════════════════════════════════════
              SECCIÓN 1: INFORMACIÓN DEL SUJETO
              Toggle → Nombre → Empleados (solo empresa) → Perfil
              ═══════════════════════════════════════════════════════════════ */}

          {/* Toggle Cliente/Empresa — PRIMERO en el formulario */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {subjectType === 'client' ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                {tCaseBrief('form.subjectType')}
              </Label>
              <div className="flex rounded-lg border border-input bg-background p-1 gap-1">
                <button
                  type="button"
                  onClick={() => handleSubjectTypeChange('client')}
                  disabled={mode === 'edit'}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                    subjectType === 'client'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    mode === 'edit' && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <User className="h-4 w-4" />
                  {tCaseBrief('form.subjectTypeClient')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubjectTypeChange('company')}
                  disabled={mode === 'edit'}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                    subjectType === 'company'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    mode === 'edit' && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  {tCaseBrief('form.subjectTypeCompany')}
                </button>
              </div>
            </div>

            {/* Nombre del Cliente / Empresa — ancho completo */}
            <div className="space-y-2">
              <Label htmlFor={subjectType === 'client' ? 'clientName' : 'companyName'}>
                {subjectType === 'client' 
                  ? tCaseBrief('form.clientName')
                  : tCaseBrief('form.companyName')
                }
                {mode === 'edit' && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">{tCaseBrief('form.notEditable')}</span>
                )}
              </Label>
              
              {/* Combobox para Cliente */}
              {subjectType === 'client' && (
                <div className="relative client-combobox-container">
                  <Input
                    id="clientName"
                    placeholder={tCaseBrief('form.clientNamePlaceholder')}
                    value={clientSearchTerm}
                    onChange={(e) => handleClientSearchChange(e.target.value)}
                    onFocus={() => mode !== 'edit' && setIsClientComboboxOpen(true)}
                    className="w-full"
                    disabled={mode === 'edit'}
                  />
                  {isClientComboboxOpen && mode !== 'edit' && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                      {isClientListLoading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">{tCaseBrief('form.loadingClients')}</div>
                      ) : clientList.filter(client =>
                        client.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
                      ).length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">{tCaseBrief('form.noClientsFound')}</div>
                      ) : (
                        clientList
                          .filter(client =>
                            client.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
                          )
                          .map((client) => (
                            <div
                              key={client.id}
                              onClick={() => handleClientSelect(client)}
                              className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {client.name}
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Combobox para Empresa — SELECTOR ESTRICTO: Solo selección de empresas existentes */}
              {subjectType === 'company' && (
                <div className="relative company-combobox-container">
                  <div className="relative">
                    <Input
                      id="companyName"
                      placeholder={tCaseBrief('form.companyNamePlaceholder')}
                      value={companySearchTerm}
                      onChange={(e) => handleCompanySearchChange(e.target.value)}
                      onFocus={() => mode !== 'edit' && setIsCompanyComboboxOpen(true)}
                      onBlur={handleCompanyBlur}
                      className={cn("w-full pr-8", selectedCompany && "border-primary/50")}
                      disabled={mode === 'edit'}
                    />
                    {/* Botón X para limpiar selección */}
                    {selectedCompany && mode !== 'edit' && (
                      <button
                        type="button"
                        onClick={handleCompanyClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Limpiar empresa seleccionada"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {isCompanyComboboxOpen && mode !== 'edit' && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                      {isCompanyListLoading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">{tCaseBrief('form.loadingCompanies')}</div>
                      ) : companyList.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No hay empresas registradas. Cree una empresa primero en el módulo de Empresas.
                        </div>
                      ) : companyList.filter(company =>
                        company.name.toLowerCase().includes(companySearchTerm.toLowerCase())
                      ).length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {tCaseBrief('form.noCompaniesFound')}
                        </div>
                      ) : (
                        companyList
                          .filter(company =>
                            company.name.toLowerCase().includes(companySearchTerm.toLowerCase())
                          )
                          .map((company) => (
                            <div
                              key={company.id}
                              onMouseDown={(e) => e.preventDefault()} // Prevenir blur antes del click
                              onClick={() => handleCompanySelect(company)}
                              className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCompany?.id === company.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {company.name}
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Empleados — Solo visible para empresas */}
            {subjectType === 'company' && (
              <div className="space-y-2">
                <Label htmlFor="employees">{tCaseBrief('form.employeesCount')}</Label>
                <Input
                  id="employees"
                  type="number"
                  placeholder="0"
                  value={formData.employees || ''}
                  onChange={(e) => updateField('employees', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            )}

            {/* Perfil del Cliente — Último en sección de Información del Sujeto */}
            <div className="space-y-2">
              <Label htmlFor="client_profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {tCaseBrief('form.clientProfile')}
              </Label>
              <Textarea
                id="client_profile"
                placeholder={tCaseBrief('form.clientProfilePlaceholder')}
                value={formData.client_profile}
                onChange={(e) => updateField('client_profile', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              SECCIÓN 2: INFORMACIÓN DEL SEGURO
              Motivo → Categoría → Campos dinámicos → Presupuesto → Coberturas
              ═══════════════════════════════════════════════════════════════ */}

          {/* Motivo del Análisis (obligatorio) */}
          <div className="space-y-2">
            <Label htmlFor="analysis_reason" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              {tCaseBrief('form.analysisReasonLabel')} *
              {mode === 'edit' && (
                <span className="text-xs text-muted-foreground font-normal">{tCaseBrief('form.notEditable')}</span>
              )}
            </Label>
            <Select
              value={formData.analysis_reason}
              onValueChange={(value) => updateField('analysis_reason', value)}
              disabled={mode === 'edit'}
            >
              <SelectTrigger>
                <SelectValue placeholder={tCaseBrief('form.analysisReasonPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {ANALYSIS_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {tCaseBrief(`analysisReasons.${reason}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Categoría de Seguro (condicional al subjectType) */}
          <div className="space-y-2">
            <Label htmlFor="insurance_category" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {tCaseBrief('form.categoryLabel')} *
              {mode === 'edit' && (
                <span className="text-xs text-muted-foreground font-normal">{tCaseBrief('form.notEditable')}</span>
              )}
            </Label>
            <Select
              value={formData.insurance_category}
              onValueChange={(value) => updateField('insurance_category', value)}
              disabled={mode === 'edit'}
            >
              <SelectTrigger>
                <SelectValue placeholder={tCaseBrief('form.categoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <MemoizedSelectItems t={tCaseBrief} subjectType={subjectType} />
              </SelectContent>
            </Select>
            {formData.insurance_category && (
              <p className="text-xs text-muted-foreground mt-1 pl-1">
                {tCaseBrief(`categoryDescriptions.${formData.insurance_category}`)}
              </p>
            )}
          </div>

          {/* Campos dinámicos según la categoría seleccionada */}
          {formData.insurance_category && (
            <DynamicCategoryFields
              categoryId={formData.insurance_category}
              values={formData.categoryData || {}}
              onChange={(fieldId, value) => {
                setFormData(prev => ({
                  ...prev,
                  categoryData: { ...(prev.categoryData || {}), [fieldId]: value },
                }));
              }}
              disabled={isProcessing}
              selectedCoverages={(formData.categoryData?.selected_coverages as string[]) || []}
              onToggleCoverage={(coverage) => {
                const current = (formData.categoryData?.selected_coverages as string[]) || [];
                const updatedCoverages = current.includes(coverage)
                  ? current.filter(c => c !== coverage)
                  : [...current, coverage];
                setFormData(prev => ({
                  ...prev,
                  categoryData: { ...(prev.categoryData || {}), selected_coverages: updatedCoverages },
                }));
              }}
            />
          )}

          {/* Presupuesto Máximo */}
          <div className="space-y-2">
            <Label htmlFor="max_budget" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {tCaseBrief('form.maxBudget')}
            </Label>
            <div className="flex gap-2">
              <Input
                id="max_budget"
                type="number"
                placeholder="0"
                min="0"
                max="99999999.99"
                step="0.01"
                value={formData.max_budget || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value || value === '') {
                    updateField('max_budget', null);
                    return;
                  }
                  const numValue = parseFloat(value);
                  if (isNaN(numValue) || !isFinite(numValue)) {
                    return;
                  }
                  const MAX_BUDGET = 99999999.99;
                  const normalizedValue = Math.min(Math.max(0, numValue), MAX_BUDGET);
                  const roundedValue = Math.round(normalizedValue * 100) / 100;
                  updateField('max_budget', roundedValue);
                }}
                className="flex-1"
              />
              <div className="flex">
                <Button
                  type="button"
                  variant={formData.budget_currency === 'COP' ? 'default' : 'outline'}
                  onClick={() => updateField('budget_currency', 'COP')}
                  className="rounded-r-none"
                >
                  COP
                </Button>
                <Button
                  type="button"
                  variant={formData.budget_currency === 'USD' ? 'default' : 'outline'}
                  onClick={() => updateField('budget_currency', 'USD')}
                  className="rounded-l-none border-l-0"
                >
                  USD
                </Button>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              SECCIÓN 3: NOTAS (siempre antes de documentos)
              ═══════════════════════════════════════════════════════════════ */}

          {/* Notas Adicionales */}
          <div className="space-y-2">
            <Label htmlFor="notes">{tCaseBrief('form.additionalNotes')}</Label>
            <Textarea
              id="notes"
              placeholder={tCaseBrief('form.additionalNotesPlaceholder')}
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={4}
            />
          </div>

          {/* ✅ FASE BASELINE vs CHALLENGERS: Sección de Carga de PDFs con dos zonas */}
          {orgId && (
            <div className="space-y-6 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {tCaseBrief('form.attachedDocs')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {tCaseBrief('form.attachedDocsDescription')}
                </p>
              </div>

              {/* ✅ ZONA A: Condiciones Actuales (Baseline) */}
              <div className="space-y-3 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {tCaseBrief('form.documentUpload.baselineSection.title')}
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      {tCaseBrief('form.documentUpload.baselineSection.subtitle')}
                    </p>
                  </div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                    {tCaseBrief('form.documentUpload.baselineSection.limit')}
                  </span>
                </div>
                
                {/* Mostrar uploader solo si no hay baseline */}
                {tempUploads.filter(u => u.documentRole === 'baseline').length === 0 ? (
                  <PdfUploader
                    orgId={orgId}
                    documentRole="baseline"
                    hideCard
                    dropzoneClassName="border-blue-300 dark:border-blue-700 hover:border-blue-400"
                    customDropHint={tCaseBrief('form.documentUpload.baselineSection.dropHint')}
                    customSubtitle={tCaseBrief('form.documentUpload.baselineSection.limit')}
                    onFileSelected={(file) => handleFileUpload(file, 'baseline')}
                    onUploadComplete={(upload) => {
                      onUploadCompleteRef.current = handleUploadComplete;
                      handleUploadComplete({ ...upload, documentRole: 'baseline' });
                    }}
                  />
                ) : (
                  <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                    {tCaseBrief('form.documentUpload.baselineSection.alreadyHasBaseline')}
                  </p>
                )}
                
                {/* Lista de archivos baseline */}
                {tempUploads.filter(u => u.documentRole === 'baseline').map((upload) => (
                  <div key={upload.storagePath} className="flex items-center justify-between p-3 bg-white dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{upload.fileName}</p>
                          <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded">
                            {tCaseBrief('form.documentUpload.baselineSection.badge')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {upload.pageCount ? `${upload.pageCount} ${tCaseBrief('form.pages')}` : ''}
                          {upload.pageCount && upload.fileSize ? ' • ' : ''}
                          {upload.fileSize ? `${Math.round(upload.fileSize / 1024)} KB` : ''}
                        </p>
                      </div>
                    </div>
                    {!upload.isExistingArtifact && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUpload(upload.storagePath)}
                        className="flex-shrink-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                        aria-label="Eliminar archivo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* ✅ ZONA B: Pólizas a Proponer (Challengers) */}
              <div className="space-y-3 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {tCaseBrief('form.documentUpload.challengerSection.title')}
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {tCaseBrief('form.documentUpload.challengerSection.subtitle')}
                    </p>
                  </div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900 px-2 py-1 rounded">
                    {tCaseBrief('form.documentUpload.challengerSection.multiple')}
                  </span>
                </div>
                
                <PdfUploader
                  orgId={orgId}
                  documentRole="challenger"
                  hideCard
                  dropzoneClassName="border-emerald-300 dark:border-emerald-700 hover:border-emerald-400"
                  customDropHint={tCaseBrief('form.documentUpload.challengerSection.dropHint')}
                  customSubtitle={tCaseBrief('form.documentUpload.challengerSection.multiple')}
                  onFileSelected={(file) => handleFileUpload(file, 'challenger')}
                  onUploadComplete={(upload) => {
                    onUploadCompleteRef.current = handleUploadComplete;
                    handleUploadComplete({ ...upload, documentRole: 'challenger' });
                  }}
                />
                
                {/* Lista de archivos challengers */}
                {tempUploads.filter(u => u.documentRole === 'challenger' || !u.documentRole).length > 0 && (
                  <div className="space-y-2">
                    {tempUploads.filter(u => u.documentRole === 'challenger' || !u.documentRole).map((upload) => (
                      <div key={upload.storagePath} className="flex items-center justify-between p-3 bg-white dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-emerald-600" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{upload.fileName}</p>
                              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-800 px-1.5 py-0.5 rounded">
                                {tCaseBrief('form.documentUpload.challengerSection.badge')}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {upload.pageCount ? `${upload.pageCount} ${tCaseBrief('form.pages')}` : ''}
                              {upload.pageCount && upload.fileSize ? ' • ' : ''}
                              {upload.fileSize ? `${Math.round(upload.fileSize / 1024)} KB` : ''}
                              {upload.isExistingArtifact && ` • ${tCaseBrief('form.savedPolicy')}`}
                            </p>
                          </div>
                        </div>
                        {!upload.isExistingArtifact && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUpload(upload.storagePath)}
                            className="flex-shrink-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100"
                            aria-label="Eliminar archivo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ✅ CORRECCIÓN CRÍTICA FASE 2.3: NO renderizar artifacts directamente bajo ninguna circunstancia */}
              {/* Si tempUploads está vacío, NO mostrar nada - la conversión se realizará automáticamente en el useEffect */}

              {/* ✅ FASE ORG_DOCUMENTS: Selector combinado de pólizas y cotizaciones de la organización */}
              <div className="space-y-2 mt-6 pt-4 border-t border-dashed">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  {tCaseBrief('form.orgDocuments')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {tCaseBrief('form.orgDocumentsDescription')}
                </p>
                <OrgDocumentSelector
                  orgId={orgId}
                  selectedPolicyIds={selectedOrgPolicyIds}
                  selectedQuoteIds={selectedOrgQuoteIds}
                  onPolicySelectionChange={setSelectedOrgPolicyIds}
                  onQuoteSelectionChange={setSelectedOrgQuoteIds}
                  disabled={isSubmitting || caseApproving}
                />
              </div>
            </div>
          )}

          {/* Botón de Envío */}
          {/* ✅ CORRECCIÓN: Lógica separada para modo edición vs creación */}
          {mode === 'edit' ? (
            // ✅ MODO EDICIÓN: Mostrar botón solo si hay cambios detectados
            hasFormChanges && (
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                  disabled={isSubmitting || caseResolvingClient}
                className="min-w-[140px]"
              >
                  {isSubmitting ? tCaseBrief('form.processing') : tCaseBrief('form.updateCase')}
              </Button>
            </div>
            )
          ) : (
            // ✅ MODO CREACIÓN: Usar lógica de aprobación original
            shouldShowApprovalButtons() && (
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || caseResolvingClient || !areApprovalButtonsEnabled()}
                  className="min-w-[140px]"
                >
                  {caseResolvingClient ? tCaseBrief('form.validatingClient') : (isSubmitting || approvalPhase === 'processing') ? tCaseBrief('form.processing') : tCaseBrief('form.searchPlans')}
                </Button>
              </div>
            )
          )}
        </form>

        {/* ✅ FASE 5: Modal de validación de cliente */}
        {modalState && (
          <ClientValidationModal
            clientName={modalState.clientName}
            isOpen={modalState.isOpen}
            onClose={() => {
              setModalState(null);
              modalState.onCancel();
            }}
            onConfirm={(clientId) => {
              setModalState(null);
              modalState.onConfirm(clientId);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}, briefFormAreEqual); // ✅ CORRECCIÓN: Agregar función de comparación

BriefForm.displayName = "BriefForm";
export { BriefForm };
