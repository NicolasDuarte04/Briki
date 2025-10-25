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

const BriefForm = React.memo(({ onSubmit, onApprove, initialNotes = '', isSubmitting, initialData, mode = 'create', orgId }: BriefFormProps) => {
  // Hook para acceder al estado global
  const { brief, setBrief, isBriefValid } = useUI();
  
  // La validación de clientes se maneja en el componente padre
  // const { validateAndResolveClient, isLoading: isClientValidationLoading } = useClientValidation();

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

  // Estado para el input de coberturas
  const [currentCoverage, setCurrentCoverage] = useState('');
  
  // Estado para uploads temporales
  const [tempUploads, setTempUploads] = useState<TempUpload[]>([]);

  // Estados para el Combobox de clientes
  const [clientList, setClientList] = useState<ClientOption[]>([]);
  const [isClientListLoading, setIsClientListLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState(brief?.clientName || '');
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

  // Efecto para sincronizar estado local con global
  useEffect(() => {
    if (brief?.clientName !== clientSearchTerm) {
      setClientSearchTerm(brief?.clientName || '');
    }
    // OJO: Evitar dependencias circulares, solo reaccionar a cambios externos
  }, [brief?.clientName, clientSearchTerm]);

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
      setBrief(prevBrief => ({ ...prevBrief, [field]: value }));
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
    setBrief(prevBrief => ({
      ...prevBrief,
      clientName: name,
      selectedClientId: id
    }));
    setIsClientComboboxOpen(false);
  }, [updateField, setBrief]); // <-- ELIMINAR 'brief'

  const handleClientSearchChange = useCallback((value: string) => {
    setClientSearchTerm(value);
    updateField('clientName', value);
    
    // Actualizar estado global con el término de búsqueda, marcando que no hay ID seleccionado
    setBrief(prevBrief => ({ 
      ...prevBrief, 
      clientName: value, 
      selectedClientId: null 
    }));
    
    // Abrir dropdown cuando se escriba
    if (value.length > 0) {
      setIsClientComboboxOpen(true);
    }
  }, [updateField, setBrief]); // <-- ELIMINAR 'brief'

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
  const handleFileUpload = (file: File) => {
    // Esta función será llamada por PdfUploader cuando se seleccione un archivo
    // El PdfUploader manejará la subida y nos devolverá el resultado
  };

  const handleUploadComplete = (upload: TempUpload) => {
    setTempUploads(prev => [...prev, upload]);
  };

  const handleRemoveUpload = (storagePath: string) => {
    setTempUploads(prev => prev.filter(upload => upload.storagePath !== storagePath));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCoverage();
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Si hay función de aprobación (con validación), usarla
    if (onApprove) {
      await onApprove();
    } else {
      // Fallback: solo proceder con el envío del formulario
      await onSubmit({ ...formData, tempUploads });
    }
  }, [onApprove, onSubmit, formData, tempUploads]);

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
                {INSURANCE_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
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
                    <Command>
                    <CommandList>
                      <CommandEmpty>
                        {isClientListLoading ? "Cargando clientes..." : "No se encontraron clientes."}
                      </CommandEmpty>
                      <CommandGroup>
                          {clientList
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
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
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
              disabled={isSubmitting || !isBriefValid()}
              className="min-w-[140px]"
            >
              {isSubmitting ? 'Procesando...' : 'Buscar Planes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

BriefForm.displayName = "BriefForm";
export { BriefForm };
