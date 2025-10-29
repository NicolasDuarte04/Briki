'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  initialData?: any; // Datos del caso para modo edición
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
  // ✅ CORRECCIÓN CRÍTICA: Usar selector específico para brief (suscripción reactiva)
  const brief = useUI((state) => state.brief);
  const setBrief = useUI((state) => state.setBrief);
  
  // Hook para validación y creación de clientes
  const { validateAndResolveClient, isLoading: isClientValidationLoading } = useClientValidation();
  
  // ✅ FASE 1: Obtener estado de aprobación para sincronización
  const caseApproving = useUI((state) => state.caseApproving);

  // Estado para todos los campos del formulario
  const [formData, setFormData] = useState<CaseBriefData>({
    insurance_category: initialData?.insurance_category || '',
    max_budget: initialData?.max_budget || null,
    budget_currency: initialData?.budget_currency || 'COP',
    required_coverages: initialData?.required_coverages || [],
    client_profile: initialData?.client_profile || '',
    notes: initialNotes,
    clientName: initialData?.clientName || brief?.clientName || '',
    businessType: initialData?.businessType || brief?.businessType || '',
    employees: initialData?.employees || brief?.employees || null,
    coverage: brief?.coverage || '',
    freeText: initialData?.briefData?.freeText || brief?.freeText || '',
  });
  
  // ✅ CORRECCIÓN CRÍTICA: Calcular validación reactiva basada en formData (estado local)
  // IMPORTANTE: Declarar DESPUÉS de formData para evitar "Cannot access before initialization"
  const isBriefValid = useMemo(() => {
    return !!(formData.insurance_category?.trim());
  }, [formData.insurance_category]);

  // Estado para el input de coberturas
  const [currentCoverage, setCurrentCoverage] = useState('');
  
  // Estado para uploads temporales
  const [tempUploads, setTempUploads] = useState<TempUpload[]>([]);

  // ✅ CORRECCIÓN: Solo sincronizar tempUploads si NO hay currentCaseId (caso nuevo)
  // Para casos históricos, los PDFs vienen de la BD (artifacts), no de tempUploads
  useEffect(() => {
    const currentCaseId = useUI.getState().currentCaseId;
    if (!currentCaseId) {
      // Solo cargar tempUploads para casos nuevos (new-thread-placeholder)
      const briefTempUploads = (brief as any).tempUploads || [];
      if (briefTempUploads.length > 0) {
        console.log('📎 [BriefForm] Cargando tempUploads desde brief global (caso nuevo):', briefTempUploads);
        setTempUploads(briefTempUploads);
      }
    } else {
      // Para casos históricos, limpiar tempUploads para evitar PDFs residuales
      console.log('🧹 [BriefForm] Limpiando tempUploads para caso histórico:', currentCaseId);
      setTempUploads([]);
      // También limpiar del brief global
      const currentBrief = useUI.getState().brief;
      if ((currentBrief as any).tempUploads && (currentBrief as any).tempUploads.length > 0) {
        setBrief({ tempUploads: [] } as any);
      }
    }
  }, []); // Solo ejecutar una vez al montar

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
  const updateField = useCallback((field: keyof CaseBriefData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // TODO: Considerar si la actualización global (setBrief)
    // puede moverse a onBlur o onSubmit para optimizar re-renders.
    // Sincronizar con el estado global para campos que existen en brief
    if (field === 'clientName' || field === 'businessType' || field === 'coverage' || field === 'freeText' || field === 'insurance_category') {
      // Usar actualización funcional para evitar dependencia de 'brief'
      setBrief({ [field]: value } as Partial<CaseBrief>);
    }
  }, [setBrief]); // <-- ELIMINAR 'brief' del array de dependencias

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
        
        // Agregar a estado local
        setTempUploads(prev => [...prev, result.tempUpload]);
        
        // ✅ Sincronizar con Zustand global
        const currentBrief = useUI.getState().brief;
        setBrief({
          ...currentBrief,
          tempUploads: [...(currentBrief.tempUploads || []), result.tempUpload]
        });
      } else {
        console.error('❌ [BriefForm] Error al subir PDF:', result.error);
        alert(`Error: ${result.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ [BriefForm] Error en fetch /api/upload/pdf:', error);
      alert('Error de conexión al subir PDF');
    }
  };

  const handleUploadComplete = (upload: TempUpload) => {
    setTempUploads(prev => [...prev, upload]);
    // ✅ Sincronizar con Zustand global
    const currentBrief = useUI.getState().brief;
    setBrief({
      ...currentBrief,
      tempUploads: [...(currentBrief.tempUploads || []), upload]
    });
  };

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
    console.log('📦 [BriefForm] formData:', formData);
    console.log('📎 [BriefForm] tempUploads:', tempUploads);
    
    // ✅ VALIDACIÓN TEMPRANA: Prevenir envío sin categoría de seguro
    if (!formData.insurance_category?.trim()) {
      console.warn('❌ [BriefForm] Intentando enviar sin categoría de seguro');
      alert('Por favor selecciona una categoría de seguro para continuar.');
      return;
    }
    
    try {
      // ACTUALIZAR brief explícitamente con todos los datos del formulario
      const briefUpdate: any = {
        insurance_category: formData.insurance_category,
        max_budget: formData.max_budget ?? undefined,
        budget_currency: formData.budget_currency,
        required_coverages: formData.required_coverages,
        client_profile: formData.client_profile,
        clientName: formData.clientName,
        businessType: formData.businessType,
        employees: formData.employees ?? undefined,
        coverage: formData.coverage,
        freeText: formData.notes,
      };
      console.log('📝 [BriefForm] Actualizando brief global con:', briefUpdate);
      setBrief(briefUpdate);

      // En modo edición: llamar onSubmit con todos los datos
      if (mode === 'edit') {
        console.log('✏️ [BriefForm] Edit mode: Calling onSubmit with formData + tempUploads');
        await onSubmit({ ...formData, tempUploads });
      } else {
        // Modo creación: Si hay función de aprobación (con validación), usarla
        if (onApprove) {
          await onApprove(); // onApprove ahora leerá el brief actualizado
        } else {
          // Fallback: solo proceder con el envío del formulario
          await onSubmit({ ...formData, tempUploads });
        }
      }
    } catch (error: any) {
      console.error('❌ [BriefForm] Error en handleSubmit:', error);
      // Re-lanzar el error para que se maneje en el componente padre
      throw error;
    }
  }, [onApprove, onSubmit, formData, tempUploads, setBrief, mode, formData.insurance_category]);

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
                value={formData.max_budget || ''}
                onChange={(e) => updateField('max_budget', e.target.value ? Number(e.target.value) : null)}
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
                caseId={mode === 'edit' ? initialData?.id : undefined}
                orgId={orgId}
                onFileSelected={handleFileUpload}
                onUploadComplete={handleUploadComplete}
              />
              
              {/* Lista de archivos subidos */}
              {tempUploads.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Archivos subidos:</Label>
                  <div className="space-y-2">
                    {tempUploads.map((upload) => (
                      <div key={upload.storagePath} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{upload.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {upload.pageCount && `${upload.pageCount} páginas`}
                              {upload.fileSize && ` • ${(upload.fileSize / 1024 / 1024).toFixed(2)} MB`}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUpload(upload.storagePath)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botón de Envío */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={mode === 'edit' 
                ? (isSubmitting || isClientValidationLoading || caseApproving) // ✅ FASE 1: Agregar caseApproving para sincronización
                : (isSubmitting || isClientValidationLoading || caseApproving || !isBriefValid)} // ✅ FASE 1: Agregar caseApproving para sincronización
              className="min-w-[140px]"
            >
              {(isSubmitting || isClientValidationLoading || caseApproving) ? 'Procesando...' : mode === 'edit' ? 'Guardar Cambios' : 'Buscar Planes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}, briefFormAreEqual); // ✅ CORRECCIÓN: Agregar función de comparación

BriefForm.displayName = "BriefForm";
export { BriefForm };
