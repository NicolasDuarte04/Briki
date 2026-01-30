// /src/components/Cases/CaseForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, Upload, X } from 'lucide-react';

interface CaseFormProps {
  orgId: string;
  userId: string;
}

export function CaseForm({ orgId, userId }: CaseFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tempUploads, setTempUploads] = useState<Array<{
    id: string;
    storagePath: string;
    fileName: string;
    fileSize: number;
    pageCount?: number;
    charactersExtracted?: number;
    fileHash?: string;
    extractedText?: string;
  }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const resetForm = () => {
    const form = document.getElementById('case-form') as HTMLFormElement;
    if (form) {
      form.reset();
    }
    setError(null);
    setSuccess(null);
    setTempUploads([]);
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success && result.mode === 'temp' && result.tempUpload) {
        setTempUploads((prev) => [...prev, result.tempUpload]);
      } else {
        throw new Error(result.error || 'Error al subir el archivo');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Error al subir el archivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (storagePath: string) => {
    setTempUploads((prev) => prev.filter(t => t.storagePath !== storagePath));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch('/api/cases/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgId,
          userId,
          clientName: formData.get('clientName'),
          clientRef: formData.get('clientRef'),
          businessType: formData.get('businessType'),
          employees: formData.get('employees') ? parseInt(formData.get('employees') as string) : undefined,
          status: formData.get('status'),
          stage: formData.get('stage'),
          priority: formData.get('priority'),
          briefData: {
            freeText: formData.get('briefText'),
          },
          tempUploads: tempUploads, // Enviar los PDFs temporales
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error al crear el caso');
      }
      
      const data = await response.json();
      setSuccess('¡Caso creado exitosamente! Redirigiendo...');
      resetForm();
      
      // Redirigir después de 3 segundos para que el usuario vea el mensaje
      setTimeout(() => {
        router.push(`/${locale}/workspace/cases/${data.id}`);
        router.refresh();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form id="case-form" onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nombre del Cliente *</Label>
            <Input
              id="clientName"
              name="clientName"
              placeholder="Ej: Juan Pérez García"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="clientRef">Referencia del Cliente</Label>
            <Input
              id="clientRef"
              name="clientRef"
              placeholder="Ej: CLI-2025-001"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="businessType">Tipo de Negocio</Label>
            <Input
              id="businessType"
              name="businessType"
              placeholder="Ej: Retail, Manufactura, Servicios"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="employees">Número de Empleados</Label>
            <Input
              id="employees"
              name="employees"
              type="number"
              min="1"
              placeholder="Ej: 50"
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Caso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select name="status" defaultValue="draft">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stage">Etapa</Label>
              <Select name="stage" defaultValue="initial">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">Inicial</SelectItem>
                  <SelectItem value="sourcing">Búsqueda</SelectItem>
                  <SelectItem value="analysis">Análisis</SelectItem>
                  <SelectItem value="proposal">Propuesta</SelectItem>
                  <SelectItem value="negotiation">Negociación</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select name="priority" defaultValue="medium">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="briefText">Descripción del Caso</Label>
            <Textarea
              id="briefText"
              name="briefText"
              placeholder="Describe las necesidades del cliente, coberturas requeridas, presupuesto, etc."
              rows={5}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Documentos (Opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Upload Area */}
            <div
              onClick={() => document.getElementById('file-input')?.click()}
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {isUploading ? 'Subiendo archivo...' : 'Haz clic para subir PDF'}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Máximo 10MB por archivo
              </p>
            </div>
            
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
            
            {/* Uploaded Files List */}
            {tempUploads.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Archivos subidos:</p>
                {tempUploads.map((upload) => (
                  <div key={upload.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{upload.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {(upload.fileSize / 1024 / 1024).toFixed(2)} MB
                          {upload.pageCount && ` • ${upload.pageCount} páginas`}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(upload.storagePath)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              Los documentos se procesarán automáticamente cuando se cree el caso.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando...
            </>
          ) : (
            'Crear Caso'
          )}
        </Button>
      </div>
    </form>
  );
}
