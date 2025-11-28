'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus, X, DollarSign, User, FileText, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PdfUploader } from '@/components/Upload/PdfUploader';
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

const INSURANCE_CATEGORIES = [
  { value: 'salud', label: 'Salud' },
  { value: 'vida', label: 'Vida' },
  { value: 'auto', label: 'Auto' },
  { value: 'hogar', label: 'Hogar' },
  { value: 'empresarial', label: 'Empresarial' },
  { value: 'otro', label: 'Otro' },
];

// ✅ CORRECCIÓN CRÍTICA: Memoizar categorías para evitar re-renders
const MemoizedSelectItems = React.memo(() => (
  <>
    {INSURANCE_CATEGORIES.map((category) => (
      <SelectItem key={category.value} value={category.value}>
        {category.label}
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

  // ✅ FASE 4: Limpiar formData SIEMPRE cuando currentCaseId cambia a null (navegación a new-thread-placeholder)
  // Los datos de Landing se cargarán después de la limpieza en otro useEffect
  useEffect(() => {
    if (!currentCaseId || currentCaseId === 'new-thread-placeholder') {
      console.log('🧹 [BriefForm] Limpiando formData para new-thread-placeholder (siempre)');
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
      };

      console.log('📝 [BriefForm] Actualizando brief global con TODOS los datos del formulario:', {
        ...briefUpdate,
        freeText: briefUpdate.freeText?.substring(0, 50) + '...',
        tempUploadsCount: briefUpdate.tempUploads?.length || 0
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
          tempUploads: newTempUploads
        };

        console.log('✏️ [BriefForm] Edit mode: Calling onSubmit with formData + newTempUploads', {
          totalTempUploads: tempUploads.length,
          existingArtifacts: existingArtifactPaths.length,
          newTempUploads: newTempUploads.length,
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
            await createCaseIfNeeded(
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
            console.log('✅ [BriefForm] Caso creado exitosamente con createCaseIfNeeded');
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
            tempUploads: tempUploads
          };
          console.log('📝 [BriefForm] Fallback mode: Calling onSubmit with formData (notes mapeado a freeText)', {
            freeText: formDataWithFreeText.freeText?.substring(0, 50) + '...',
            notes: formData.notes?.substring(0, 50) + '...'
          });
          await onSubmit(formDataWithFreeText);
        }
      }
    } catch (error: any) {
      console.error('❌ [BriefForm] Error en handleSubmit:', error);
      // Re-lanzar el error para que se maneje en el componente padre
      throw error;
    }
  }, [onApprove, onSubmit, formData, tempUploads, setBrief, mode, formData.insurance_category, router, validateAndResolveClient, setInitialMessage, setCurrentCaseId, currentCaseId]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Detalles del Caso
        </CardTitle>
        <CardDescription>
          Proporciona información detallada para obtener las mejores recomendaciones de seguros
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Categoría de Seguro */}
          <div className="space-y-2">
            <Label htmlFor="insurance_category" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Categoría de Seguro *
            </Label>
            <Select
              value={formData.insurance_category}
              onValueChange={(value) => updateField('insurance_category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de seguro" />
              </SelectTrigger>
              <SelectContent>
                <MemoizedSelectItems />
              </SelectContent>
            </Select>
          </div>

          {/* Presupuesto Máximo */}
          <div className="space-y-2">
            <Label htmlFor="max_budget" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Presupuesto Máximo Mensual
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
            <Label htmlFor="required_coverages">Coberturas Imprescindibles</Label>
            <div className="flex gap-2">
              <Input
                id="required_coverages"
                placeholder="Ej: Cobertura dental, Maternidad, etc."
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
              Perfil del Cliente
            </Label>
            <Textarea
              id="client_profile"
              placeholder="Describe el perfil del cliente: edad, profesión, estado civil, hijos, etc."
              value={formData.client_profile}
              onChange={(e) => updateField('client_profile', e.target.value)}
              rows={3}
            />
          </div>

          {/* Información del Negocio (campos existentes) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nombre del Cliente</Label>
              <div className="relative client-combobox-container">
                <Input
                  id="clientName"
                  placeholder="Escribir nombre del cliente..."
                  value={clientSearchTerm}
                  onChange={(e) => handleClientSearchChange(e.target.value)}
                  onFocus={() => setIsClientComboboxOpen(true)}
                  className="w-full"
                />
                {isClientComboboxOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {isClientListLoading ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500">Cargando clientes...</div>
                    ) : clientList.filter(client =>
                      client.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
                    ).length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500">No se encontraron clientes.</div>
                    ) : (
                      clientList
                        .filter(client =>
                          client.name.toLowerCase().includes(clientSearchTerm.toLowerCase())
                        )
                        .map((client) => (
                          <div
                            key={client.id}
                            onClick={() => handleClientSelect(client)}
                            className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm"
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
              <Label htmlFor="businessType">Tipo de Negocio</Label>
              <Input
                id="businessType"
                placeholder="Ej: Consultoría, Retail, etc."
                value={formData.businessType}
                onChange={(e) => updateField('businessType', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employees">Número de Empleados</Label>
              <Input
                id="employees"
                type="number"
                placeholder="0"
                value={formData.employees || ''}
                onChange={(e) => updateField('employees', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverage">Cobertura Necesaria</Label>
              <Input
                id="coverage"
                placeholder="Ej: Básica, Premium, etc."
                value={formData.coverage}
                onChange={(e) => updateField('coverage', e.target.value)}
              />
            </div>
          </div>

          {/* Notas Adicionales */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              placeholder="Cualquier información adicional que consideres relevante..."
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
                  Documentos Adjuntos
                </Label>
                <p className="text-sm text-muted-foreground">
                  Sube documentos PDF que contengan información relevante para el caso
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
                  <Label className="text-sm font-medium">Documentos asociados:</Label>
                  <div className="space-y-2">
                    {tempUploads.map((upload) => (
                      <div key={upload.storagePath} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{upload.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {upload.pageCount ? `${upload.pageCount} páginas` : ''}
                              {upload.pageCount && upload.fileSize ? ' • ' : ''}
                              {upload.fileSize ? `${Math.round(upload.fileSize / 1024)} KB` : ''}
                            </p>
                          </div>
                        </div>
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
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ✅ CORRECCIÓN CRÍTICA FASE 2.3: NO renderizar artifacts directamente bajo ninguna circunstancia */}
              {/* Si tempUploads está vacío, NO mostrar nada - la conversión se realizará automáticamente en el useEffect */}
            </div>
          )}

          {/* Botón de Envío */}
          {/* Botón de Envío */}
          {/* ✅ CORRECCIÓN CRÍTICA: Usar shouldShowApprovalButtons para ocultar botón al aprobar */}
          {shouldShowApprovalButtons() && (
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={mode === 'edit'
                  ? (isSubmitting || caseResolvingClient || approvalPhase === 'processing')
                  : (isSubmitting || caseResolvingClient || !areApprovalButtonsEnabled())}
                className="min-w-[140px]"
              >
                {caseResolvingClient ? 'Validando cliente...' : (isSubmitting || approvalPhase === 'processing') ? 'Procesando...' : mode === 'edit' ? 'Guardar Datos' : 'Buscar Planes'}
              </Button>
            </div>
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
