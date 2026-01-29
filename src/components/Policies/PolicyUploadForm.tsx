// src/components/Policies/PolicyUploadForm.tsx
'use client';

/**
 * PolicyUploadForm - Componente para subir pólizas standalone
 * 
 * Este componente maneja:
 * 1. Drag & drop de archivos PDF
 * 2. Upload al case contenedor de pólizas de la organización
 * 3. Trigger automático del análisis de póliza
 * 4. Feedback visual del progreso
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileSearch,
} from 'lucide-react';
import type { Locale } from '@/lib/routes/workspace';

// ============================================================================
// TYPES
// ============================================================================

interface PolicyUploadFormProps {
  orgId: string;
  userId: string;
  locale: Locale;
  redirectUrl?: string;
}

type UploadStatus = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';

interface UploadProgress {
  status: UploadStatus;
  progress: number;
  message: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PolicyUploadForm({ 
  orgId, 
  userId, 
  locale,
  redirectUrl,
}: PolicyUploadFormProps) {
  const router = useRouter();
  const t = useTranslations('policies');
  
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [result, setResult] = useState<{
    artifactId?: string;
    analysisId?: string;
    fileName?: string;
    confidence?: number;
  } | null>(null);

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    if (!file) return;
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadProgress({
        status: 'error',
        progress: 0,
        message: t('form.fileSizeExceeds'),
      });
      return;
    }
    
    setSelectedFile(file);
    setUploadProgress({ status: 'idle', progress: 0, message: '' });
    setResult(null);
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    multiple: false,
    disabled: uploadProgress.status === 'uploading' || uploadProgress.status === 'analyzing',
  });

  // ============================================================================
  // UPLOAD & ANALYZE
  // ============================================================================

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      // Step 1: Upload to org policies API
      setUploadProgress({
        status: 'uploading',
        progress: 20,
        message: t('upload.progress.uploading'),
      });

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('orgId', orgId);

      const uploadResponse = await fetch('/api/org-policies/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || t('upload.progress.error'));
      }

      const uploadData = await uploadResponse.json();
      
      setUploadProgress({
        status: 'analyzing',
        progress: 50,
        message: t('upload.progress.analyzing'),
      });

      // Step 2: Trigger analysis
      const analyzeResponse = await fetch('/api/policies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifactId: uploadData.artifact.id,
          extractionMethod: 'hybrid',
          force: false,
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || 'Error al analizar la póliza');
      }

      const analyzeData = await analyzeResponse.json();

      setUploadProgress({
        status: 'success',
        progress: 100,
        message: 'Póliza analizada exitosamente',
      });

      setResult({
        artifactId: uploadData.artifact.id,
        analysisId: analyzeData.analysis?.id,
        fileName: uploadData.artifact.fileName,
        confidence: analyzeData.analysis?.overallConfidence 
          ? Number(analyzeData.analysis.overallConfidence) * 100 
          : undefined,
      });

      // Redirect after success (optional delay)
      if (redirectUrl) {
        setTimeout(() => {
          router.push(redirectUrl);
          router.refresh();
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Error en upload/análisis:', error);
      setUploadProgress({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploadProgress({ status: 'idle', progress: 0, message: '' });
    setResult(null);
  };

  const handleUploadAnother = () => {
    setSelectedFile(null);
    setUploadProgress({ status: 'idle', progress: 0, message: '' });
    setResult(null);
  };

  // ============================================================================
  // RENDER: IDLE STATE (Dropzone)
  // ============================================================================

  if (!selectedFile && uploadProgress.status === 'idle') {
    return (
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
          transition-all duration-200 ease-out
          ${isDragActive 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-14 w-14 text-muted-foreground mb-4" />
        {isDragActive ? (
          <p className="text-xl font-medium text-primary">{t('form.dropHere')}</p>
        ) : (
          <>
            <p className="text-xl font-medium mb-2">
              {t('form.dragPdfHere')}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t('form.orClickToSelect')}
            </p>
            <Button type="button" variant="outline">
              {t('form.selectFile')}
            </Button>
          </>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: SELECTED FILE (Preview)
  // ============================================================================

  if (selectedFile && uploadProgress.status === 'idle') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
          <div className="p-2 rounded-lg bg-red-500/10">
            <FileText className="h-8 w-8 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleUpload} className="flex-1">
            <FileSearch className="h-4 w-4 mr-2" />
            Subir y Analizar
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: UPLOADING / ANALYZING
  // ============================================================================

  if (uploadProgress.status === 'uploading' || uploadProgress.status === 'analyzing') {
    return (
      <div className="space-y-6 py-4">
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-muted flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          </div>
        </div>
        
        <div className="space-y-2 text-center">
          <p className="font-medium">{uploadProgress.message}</p>
          <Progress value={uploadProgress.progress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {uploadProgress.progress}% completado
          </p>
        </div>

        {selectedFile && (
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{selectedFile.name}</span>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: SUCCESS
  // ============================================================================

  if (uploadProgress.status === 'success' && result) {
    return (
      <div className="space-y-6 py-4">
        <div className="flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">¡Análisis Completado!</h3>
          <p className="text-muted-foreground">
            La póliza se ha procesado correctamente
          </p>
        </div>

        {result.fileName && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-green-600" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-900 truncate">{result.fileName}</p>
                {result.confidence !== undefined && (
                  <p className="text-sm text-green-700">
                    Confianza: {result.confidence.toFixed(0)}%
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleUploadAnother} variant="outline" className="flex-1">
            Subir otra póliza
          </Button>
          {redirectUrl && (
            <Button 
              onClick={() => router.push(redirectUrl)} 
              className="flex-1"
            >
              Ver Análisis
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ERROR
  // ============================================================================

  if (uploadProgress.status === 'error') {
    return (
      <div className="space-y-6 py-4">
        <div className="flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2 text-red-600">Error</h3>
          <p className="text-muted-foreground">{uploadProgress.message}</p>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleCancel} variant="outline" className="flex-1">
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
