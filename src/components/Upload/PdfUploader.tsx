// /src/components/Upload/PdfUploader.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
// Nota: Removido useToast; no existe en el proyecto. Usamos estados locales.

interface PdfUploaderProps {
  caseId?: string; // Opcional para permitir uploads temporales
  orgId: string;
  onFileSelected?: (file: File) => void; // Callback para cuando se selecciona un archivo
  onUploadComplete?: (upload: any) => void; // Callback para cuando se completa la subida
}

export function PdfUploader({ caseId, orgId, onFileSelected, onUploadComplete }: PdfUploaderProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB.');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      setUploadResult(null);
      setSuccessMessage(null);
      
      // Si no hay caseId, solo notificar que se seleccionó el archivo
      if (!caseId && onFileSelected) {
        onFileSelected(file);
      }
    }
  }, [caseId, onFileSelected]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: uploading
  });
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    // Si no hay caseId, no hacer upload
    if (!caseId) {
      setError('No se puede subir el archivo sin un caso válido.');
      return;
    }
    
    setUploading(true);
    setProgress(10);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('caseId', caseId);
      formData.append('orgId', orgId);
      
      setProgress(30);
      
      const response = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData,
      });
      
      setProgress(70);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al subir el archivo');
      }
      
      const data = await response.json();
      setProgress(100);
      setUploadResult(data.artifact);
      setSuccessMessage(`${data.artifact.fileName} se ha procesado correctamente.`);
      
      // Llamar callback si existe
      if (onUploadComplete && data.artifact) {
        onUploadComplete(data.artifact);
      }
      
      // Actualizar la página después de un breve delay
      setTimeout(() => {
        router.refresh();
        setSelectedFile(null);
        setUploadResult(null);
        setProgress(0);
        setSuccessMessage(null);
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };
  
  const handleCancel = () => {
    setSelectedFile(null);
    setError(null);
    setUploadResult(null);
    setProgress(0);
    setSuccessMessage(null);
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        {successMessage && (
          <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {!selectedFile && !uploadResult && (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium">Suelta el archivo aquí</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  Arrastra un PDF aquí o haz click para seleccionar
                </p>
                <p className="text-sm text-muted-foreground">
                  Archivos PDF hasta 10MB
                </p>
              </>
            )}
          </div>
        )}
        
        {selectedFile && !uploadResult && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <FileText className="h-10 w-10 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subiendo y procesando...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {!uploading && !error && (
              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  className="flex-1"
                >
                  Subir PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
              </div>
            )}
            
            {uploading && (
              <Button disabled className="w-full">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </Button>
            )}
          </div>
        )}
        
        {uploadResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-10 w-10 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-green-900">PDF procesado exitosamente</p>
                <p className="text-sm text-green-700">
                  {uploadResult.fileName}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{uploadResult.pageCount || 0}</div>
                <div className="text-xs text-muted-foreground">Páginas</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {((uploadResult.fileSize || 0) / 1024 / 1024).toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">MB</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {Math.round((uploadResult.charactersExtracted || 0) / 1000)}k
                </div>
                <div className="text-xs text-muted-foreground">Caracteres</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
