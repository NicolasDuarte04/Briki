'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus, X, DollarSign, User, FileText, Shield, LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PdfUploader } from '@/components/Upload/PdfUploader';
import { OrgPolicySelector } from '@/components/Policies/OrgPolicySelector';
import { useUI } from '@/lib/ui/state';
import { useClientValidation } from '@/hooks/useClientValidation';
import { createCaseIfNeeded } from '@/lib/case-actions';
import { ClientValidationModal } from '@/components/Workspace/ClientValidationModal';
import { useRouter } from 'next/navigation';
import type { CaseBrief } from '@/lib/types';

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
};

// Define el tipo para opciones de cliente
export type ClientOption = {
  id: string;
  name: string;
};

// Define la interfaz de los datos que el formulario manejará
export type CaseBriefData = {
  // Nuevos campos del Brief detallado
  insurance_category: string;
  max_budget: number | null;
  budget_currency: 'COP' | 'USD';
  required_coverages: string[];
  client_profile: string;
  notes: string;
  // Campos existentes que se mantendrán
  clientName: string;
  businessType: string;
  employees: number | null;
  coverage: string;
  freeText: string;
  // Uploads temporales
  tempUploads?: TempUpload[];
  // ✅ FASE POLICY_LINKS: Pólizas de organización a vincular
  linkedPolicyIds?: string[];
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

// Insurance category values - labels come from translations
const INSURANCE_CATEGORY_VALUES = ['salud', 'vida', 'auto', 'hogar', 'empresarial', 'otro'] as const;
type InsuranceCategoryValue = typeof INSURANCE_CATEGORY_VALUES[number];

// ✅ CORRECCIÓN CRÍTICA: Memoizar categorías para evitar re-renders
// Now accepts a translation function as prop
const MemoizedSelectItems = React.memo(({ t }: { t: (key: string) => string }) => (
  <>
    {INSURANCE_CATEGORY_VALUES.map((value) => (
      <SelectItem key={value} value={value}>
        {t(`categories.${value}`)}
      </SelectItem>
    ))}
  </>
));

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
    insurance_category: initialData?.insurance_category || (shouldUseBriefFallback ? brief?.insurance_category : '') || '',
    max_budget: initialData?.max_budget ?? (shouldUseBriefFallback ? brief?.max_budget : null) ?? null,
    budget_currency: initialData?.budget_currency || (shouldUseBriefFallback ? brief?.budget_currency : 'COP') || 'COP',
    required_coverages: initialData?.required_coverages || (shouldUseBriefFallback ? brief?.required_coverages : []) || [],
    client_profile: initialData?.client_profile || (shouldUseBriefFallback ? brief?.client_profile : '') || '',
    // ✅ SIMPLIFICACIÓN: Cargar freeText desde brief para autocompletar "Notas Adicionales" (desde LandingPage)
    // Prioridad: initialNotes > brief.freeText > ''
    notes: initialNotes || (brief?.freeText && brief.freeText.trim() !== '' ? brief.freeText : ''),
    // initialNotes viene del primer mensaje de landing
    clientName: initialData?.clientName || (shouldUseBriefFallback ? brief?.clientName : '') || '',
    businessType: initialData?.businessType || (shouldUseBriefFallback ? brief?.businessType : '') || '',
    employees: initialData?.employees ?? (shouldUseBriefFallback ? brief?.employees : null) ?? null,
    coverage: (shouldUseBriefFallback ? brief?.coverage : '') || '',
    freeText: initialData?.briefData?.freeText || (shouldUseBriefFallback ? brief?.freeText : '') || '',
  });

  // ✅ CORRECCIÓN: Estado para guardar datos iniciales en modo edición (para detección de cambios)
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<CaseBriefData | null>(null);
  const [initialArtifactCount, setInitialArtifactCount] = useState<number>(0);
  
  // ✅ CORRECCIÓN: Capturar snapshot inicial cuando se entra a modo edición
  useEffect(() => {
    if (mode === 'edit' && initialData && !initialFormSnapshot) {
      const snapshot: CaseBriefData = {
        insurance_category: initialData.insurance_category || '',
        max_budget: initialData.max_budget ?? null,
        budget_currency: initialData.budget_currency || 'COP',
        required_coverages: initialData.required_coverages || [],
        client_profile: initialData.client_profile || '',
        notes: initialData.briefData?.freeText || '',
        clientName: initialData.clientName || '',
        businessType: initialData.businessType || '',
        employees: initialData.employees ?? null,
        coverage: '',
        freeText: initialData.briefData?.freeText || '',
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
        insurance_category: '',
        max_budget: null,
        budget_currency: 'COP',
        required_coverages: [],
        client_profile: '',
        notes: '',
        clientName: '',
        businessType: '',
        employees: null,
        coverage: '',
        freeText: '',
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

  // Estado para el input de coberturas
  const [currentCoverage, setCurrentCoverage] = useState('');

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
      JSON.stringify(formData.required_coverages) !== JSON.stringify(initialFormSnapshot.required_coverages) ||
      formData.client_profile !== initialFormSnapshot.client_profile ||
      formData.notes !== initialFormSnapshot.notes ||
      formData.businessType !== initialFormSnapshot.businessType ||
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
        required_coverages: formData.required_coverages || [],
        client_profile: formData.client_profile || '',
        clientName: formData.clientName || '',
        businessType: formData.businessType || '',
        employees: formData.employees ?? null,
        coverage: formData.coverage || '',
        freeText: finalFreeText, // ✅ CORRECCIÓN: Usar finalFreeText que prioriza notes
        tempUploads: tempUploads || [], // ✅ CRÍTICO: Incluir tempUploads (pueden venir del Landing)
      };

      console.log('📝 [BriefForm] Sincronizando brief global con TODOS los datos del formulario:', {
        ...briefUpdate,
        freeText: briefUpdate.freeText?.substring(0, 50) + '...',
        tempUploadsCount: briefUpdate.tempUploads?.length || 0
      });

      // Sincronizar con el estado global
      setBrief(briefUpdate);
    }
  }, [caseApproving, caseResolvingClient, formData, tempUploads, setBrief]);

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
        insurance_category: '',
        max_budget: null,
        budget_currency: 'COP',
        required_coverages: [],
        client_profile: '',
        notes: '', // ✅ CORRECCIÓN QUIRÚRGICA: Limpiar notes completamente
        clientName: '',
        businessType: '',
        employees: null,
        coverage: '',
        freeText: '',
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
    }
  }, [initialNotes, setBrief]);

  // Estados para el Combobox de clientes
  const [clientList, setClientList] = useState<ClientOption[]>([]);
  const [isClientListLoading, setIsClientListLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientComboboxOpen, setIsClientComboboxOpen] = useState(false);

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

  // ✅ CORRECCIÓN QUIRÚRGICA: Sincronización inicial de clientName desde brief (solo cuando hay currentCaseId)
  useEffect(() => {
    const currentCaseId = useUI.getState().currentCaseId;
    if (currentCaseId && !clientSearchTerm && brief?.clientName) {
      setClientSearchTerm(brief.clientName);
    }
  }, []); // Solo ejecutar una vez al montar

  // En modo edición: Sincronizar initialData con brief global al montar
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      console.log('🔄 [BriefForm] Edit mode: Syncing initialData to brief', initialData);
      setBrief({
        insurance_category: initialData.insurance_category || '',
        clientName: initialData.clientName || '',
        businessType: initialData.businessType || '',
        employees: initialData.employees || 0,
        coverage: initialData.briefData?.coverage || '',
        freeText: initialData.briefData?.freeText || '',
      });
    }
  }, [mode, initialData, setBrief]); // Dependencias correctas

  // Efecto para cerrar el dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isClientComboboxOpen && !target.closest('.client-combobox-container')) {
        setIsClientComboboxOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isClientComboboxOpen]);

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
      console.log('✅ [BriefForm] insurance_category actualizado en brief global para sincronización de botones:', value);
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

  const handleAddCoverage = useCallback(() => {
    if (currentCoverage.trim() !== '' && !formData.required_coverages.includes(currentCoverage.trim())) {
      updateField('required_coverages', [...formData.required_coverages, currentCoverage.trim()]);
      setCurrentCoverage('');
    }
  }, [currentCoverage, formData.required_coverages, updateField]);

  const handleRemoveCoverage = useCallback((coverageToRemove: string) => {
    updateField('required_coverages', formData.required_coverages.filter(c => c !== coverageToRemove));
  }, [formData.required_coverages, updateField]);

  // ✅ CORRECCIÓN CRÍTICA: Ref para almacenar onUploadComplete de PdfUploader
  // Esto permite llamar a onUploadComplete desde handleFileUpload para que PdfUploader limpie selectedFile
  const onUploadCompleteRef = useRef<((upload: TempUpload) => void) | null>(null);

  // Handlers para uploads
  const handleFileUpload = async (file: File) => {
    console.log('📄 [BriefForm] Iniciando subida de PDF temporal:', file.name);

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

        // ✅ CORRECCIÓN CRÍTICA: Llamar a onUploadComplete (que pasa por wrappedOnUploadComplete en PdfUploader)
        // Esto permite que PdfUploader limpie selectedFile ANTES de agregar a tempUploads
        // onUploadCompleteRef.current es handleUploadComplete que se pasa a PdfUploader
        if (onUploadCompleteRef.current) {
          onUploadCompleteRef.current(result.tempUpload);
        } else {
          // Fallback: si no hay ref, llamar directamente a handleUploadComplete
          handleUploadComplete(result.tempUpload);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCoverage();
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🚀 [BriefForm] handleSubmit triggered. Mode:', mode);
    console.log('📦 [BriefForm] formData completo:', formData);
    console.log('📎 [BriefForm] tempUploads:', tempUploads);

    // ✅ VALIDACIÓN TEMPRANA: Prevenir envío sin categoría de seguro
    if (!formData.insurance_category?.trim()) {
      console.warn('❌ [BriefForm] Intentando enviar sin categoría de seguro');
      alert('Por favor selecciona una categoría de seguro para continuar.');
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
        insurance_category: formData.insurance_category,
        max_budget: formData.max_budget ?? null,
        budget_currency: formData.budget_currency || 'COP',
        required_coverages: formData.required_coverages || [],
        client_profile: formData.client_profile || '',
        clientName: formData.clientName || '',
        businessType: formData.businessType || '',
        employees: formData.employees ?? null,
        coverage: formData.coverage || '',
        freeText: finalFreeText, // ✅ CORRECCIÓN: Usar finalFreeText que prioriza notes
        tempUploads: tempUploads || [], // ✅ CRÍTICO: Incluir tempUploads (pueden venir del Landing)
        linkedPolicyIds: selectedOrgPolicyIds || [], // ✅ FASE POLICY_LINKS: Incluir pólizas de org seleccionadas
      };

      console.log('📝 [BriefForm] Actualizando brief global con TODOS los datos del formulario:', {
        ...briefUpdate,
        freeText: briefUpdate.freeText?.substring(0, 50) + '...',
        tempUploadsCount: briefUpdate.tempUploads?.length || 0,
        linkedPolicyIdsCount: selectedOrgPolicyIds?.length || 0
      });
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
        };

        console.log('✏️ [BriefForm] Edit mode: Calling onSubmit with formData + newTempUploads', {
          totalTempUploads: tempUploads.length,
          existingArtifacts: existingArtifactPaths.length,
          newTempUploads: newTempUploads.length,
          linkedPolicyIds: selectedOrgPolicyIds?.length || 0,
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
          };
          console.log('📝 [BriefForm] Fallback mode: Calling onSubmit with formData (notes mapeado a freeText)', {
            freeText: formDataWithFreeText.freeText?.substring(0, 50) + '...',
            notes: formData.notes?.substring(0, 50) + '...',
            linkedPolicyIds: selectedOrgPolicyIds?.length || 0
          });
          await onSubmit(formDataWithFreeText);
        }
      }
    } catch (error: any) {
      console.error('❌ [BriefForm] Error en handleSubmit:', error);
      // Re-lanzar el error para que se maneje en el componente padre
      throw error;
    }
  }, [onApprove, onSubmit, formData, tempUploads, selectedOrgPolicyIds, setBrief, mode, formData.insurance_category, router, validateAndResolveClient, setInitialMessage, setCurrentCaseId, currentCaseId]);

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
          {/* Categoría de Seguro */}
          <div className="space-y-2">
            <Label htmlFor="insurance_category" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {tCaseBrief('form.categoryLabel')} *
              {/* ✅ CORRECCIÓN: Indicar que no es editable en modo edición */}
              {mode === 'edit' && (
                <span className="text-xs text-muted-foreground font-normal">{tCaseBrief('form.notEditable')}</span>
              )}
            </Label>
            <Select
              value={formData.insurance_category}
              onValueChange={(value) => updateField('insurance_category', value)}
              disabled={mode === 'edit'} // ✅ CORRECCIÓN: Bloquear en modo edición
            >
              <SelectTrigger>
                <SelectValue placeholder={tCaseBrief('form.categoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <MemoizedSelectItems t={tCaseBrief} />
              </SelectContent>
            </Select>
          </div>

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
                    return; // Ignorar valores inválidos
                  }
                  // Limitar al rango permitido para DECIMAL(10,2): máximo 99,999,999.99
                  const MAX_BUDGET = 99999999.99;
                  const normalizedValue = Math.min(Math.max(0, numValue), MAX_BUDGET);
                  // Redondear a 2 decimales
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

          {/* Coberturas Imprescindibles */}
          <div className="space-y-2">
            <Label htmlFor="required_coverages">{tCaseBrief('form.requiredCoverages')}</Label>
            <div className="flex gap-2">
              <Input
                id="required_coverages"
                placeholder={tCaseBrief('form.requiredCoveragesPlaceholder')}
                value={currentCoverage}
                onChange={(e) => setCurrentCoverage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleAddCoverage}
                disabled={!currentCoverage.trim()}
                size="icon"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.required_coverages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.required_coverages.map((coverage, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {coverage}
                    <Button
                      type="button"
                      onClick={() => handleRemoveCoverage(coverage)}
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Perfil del Cliente */}
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

          {/* Información del Negocio (campos existentes) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">
                {tCaseBrief('form.clientName')}
                {/* ✅ CORRECCIÓN: Indicar que no es editable en modo edición */}
                {mode === 'edit' && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">{tCaseBrief('form.notEditable')}</span>
                )}
              </Label>
              <div className="relative client-combobox-container">
                <Input
                  id="clientName"
                  placeholder={tCaseBrief('form.clientNamePlaceholder')}
                  value={clientSearchTerm}
                  onChange={(e) => handleClientSearchChange(e.target.value)}
                  onFocus={() => mode !== 'edit' && setIsClientComboboxOpen(true)} // ✅ CORRECCIÓN: No abrir dropdown en modo edición
                  className="w-full"
                  disabled={mode === 'edit'} // ✅ CORRECCIÓN: Bloquear en modo edición
                />
                {/* ✅ CORRECCIÓN: No mostrar dropdown en modo edición */}
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType">{tCaseBrief('form.businessType')}</Label>
              <Input
                id="businessType"
                placeholder={tCaseBrief('form.businessTypePlaceholder')}
                value={formData.businessType}
                onChange={(e) => updateField('businessType', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="coverage">{tCaseBrief('form.requiredCoverage')}</Label>
              <Input
                id="coverage"
                placeholder={tCaseBrief('form.requiredCoveragePlaceholder')}
                value={formData.coverage}
                onChange={(e) => updateField('coverage', e.target.value)}
              />
            </div>
          </div>

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

          {/* Sección de Carga de PDFs */}
          {orgId && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {tCaseBrief('form.attachedDocs')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {tCaseBrief('form.attachedDocsDescription')}
                </p>
              </div>

              <PdfUploader
                // ✅ CORRECCIÓN: Omitir caseId para usar tempUploads (no pasar undefined explícitamente)
                // Esto permite que PdfUploader funcione en modo temporal, incluso en modo edición
                orgId={orgId}
                onFileSelected={handleFileUpload}
                onUploadComplete={(upload) => {
                  // ✅ CORRECCIÓN CRÍTICA: Almacenar la función en ref para poder llamarla desde handleFileUpload
                  onUploadCompleteRef.current = handleUploadComplete;
                  // Llamar a handleUploadComplete (que agrega a tempUploads)
                  // PdfUploader intercepta esta llamada con wrappedOnUploadComplete que limpia selectedFile
                  handleUploadComplete(upload);
                }}
              />

              {/* ✅ CORRECCIÓN CRÍTICA FASE 2.3: SOLO renderizar tempUploads, NUNCA artifacts directamente */}
              {/* IMPORTANTE: NO renderizar initialData?.artifacts bajo ninguna circunstancia */}
              {/* El único renderizado permitido es la lista simple de tempUploads */}
              {tempUploads.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium">{tCaseBrief('form.associatedDocs')}</Label>
                  <div className="space-y-2">
                    {tempUploads.map((upload) => (
                      <div key={upload.storagePath} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{upload.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {upload.pageCount ? `${upload.pageCount} ${tCaseBrief('form.pages')}` : ''}
                              {upload.pageCount && upload.fileSize ? ' • ' : ''}
                              {upload.fileSize ? `${Math.round(upload.fileSize / 1024)} KB` : ''}
                              {/* ✅ CORRECCIÓN: Indicar si es póliza existente (no eliminable) */}
                              {upload.isExistingArtifact && ` • ${tCaseBrief('form.savedPolicy')}`}
                            </p>
                          </div>
                        </div>
                        {/* ✅ CORRECCIÓN: Solo mostrar botón X si NO es póliza existente */}
                        {!upload.isExistingArtifact && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUpload(upload.storagePath)}
                          className="flex-shrink-0"
                          aria-label="Eliminar archivo"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ✅ CORRECCIÓN CRÍTICA FASE 2.3: NO renderizar artifacts directamente bajo ninguna circunstancia */}
              {/* Si tempUploads está vacío, NO mostrar nada - la conversión se realizará automáticamente en el useEffect */}

              {/* ✅ FASE POLICY_LINKS: Selector de pólizas de la organización */}
              <div className="space-y-2 mt-6 pt-4 border-t border-dashed">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  {tCaseBrief('form.orgPolicies')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {tCaseBrief('form.orgPoliciesDescription')}
                </p>
                <OrgPolicySelector
                  orgId={orgId}
                  selectedIds={selectedOrgPolicyIds}
                  onSelectionChange={setSelectedOrgPolicyIds}
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
