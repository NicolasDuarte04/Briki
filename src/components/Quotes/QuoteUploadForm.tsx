// src/components/Quotes/QuoteUploadForm.tsx
'use client';

/**
 * QuoteUploadForm - Componente para subir cotizaciones standalone
 * 
 * Este componente maneja:
 * 1. Drag & drop de archivos PDF
 * 2. Upload al case contenedor de cotizaciones de la organización
 * 3. Trigger automático del análisis de cotización
 * 4. Feedback visual del progreso
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  Receipt, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileSearch,
  ArrowRight,
  Building2,
  User,
} from 'lucide-react';
import { COMPANY_CATEGORIES, CLIENT_CATEGORIES } from '@/lib/insurance-categories';
import type { Locale } from '@/lib/routes/workspace';

// ============================================================================
// TYPES
// ============================================================================

interface QuoteUploadFormProps {
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

export function QuoteUploadForm({ 
  orgId, 
  userId, 
  locale,
  redirectUrl,
}: QuoteUploadFormProps) {
  const router = useRouter();
  const t = useTranslations('quotes.upload');
  const tForm = useTranslations('quotes.form');
  const tCat = useTranslations('workspace.caseBrief.categories');
  const tUploadCat = useTranslations('quotes.upload.category');
  
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [insuranceCategory, setInsuranceCategory] = useState<string>('');
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
    insurer?: string;
    product?: string;
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
        message: tForm('fileSizeExceeds'),
      });
      return;
    }
    
    setSelectedFile(file);
    setUploadProgress({ status: 'idle', progress: 0, message: '' });
    setResult(null);
  }, [tForm]);

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
      // Step 1: Upload to org quotes API
      setUploadProgress({
        status: 'uploading',
        progress: 20,
        message: t('progress.uploading'),
      });

      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/org-quotes/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || t('progress.error'));
      }

      const uploadData = await uploadResponse.json();
      
      // Check for duplicate
      if (uploadData.duplicate) {
        setUploadProgress({
          status: 'success',
          progress: 100,
          message: t('progress.duplicateDetected'),
        });
        setResult({
          artifactId: uploadData.artifact.id,
          fileName: uploadData.artifact.fileName,
        });
        return;
      }

      setUploadProgress({
        status: 'analyzing',
        progress: 50,
        message: t('progress.analyzing'),
      });

      // Step 2: Trigger analysis
      const analyzeResponse = await fetch('/api/quotes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifactId: uploadData.artifact.id,
          extractionMethod: 'hybrid',
          force: false,
          ...(insuranceCategory ? { insuranceCategory } : {}),
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || t('progress.analyzeError'));
      }

      const analyzeData = await analyzeResponse.json();

      setUploadProgress({
        status: 'success',
        progress: 100,
        message: t('progress.success'),
      });

      // Extract data from extractedData JSON for display
      const extractedData = analyzeData.analysis?.extractedData as Record<string, unknown> | null;
      const safeExtract = (data: Record<string, unknown> | null, key: string): string | undefined => {
        if (!data || !data[key]) return undefined;
        const value = data[key];
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
        if (typeof value === 'object' && value !== null) {
          const obj = value as Record<string, unknown>;
          if (obj.name) return String(obj.name);
        }
        return undefined;
      };

      const confidence = analyzeData.analysis?.overallConfidence 
        ? Number(analyzeData.analysis.overallConfidence) * 100 
        : undefined;
      
      const insurer = safeExtract(extractedData, 'insurer');
      const product = safeExtract(extractedData, 'product');

      // Build result object - only include defined values
      const resultObj: typeof result = {
        artifactId: uploadData.artifact.id as string,
        analysisId: analyzeData.analysis?.id as string,
        fileName: uploadData.artifact.fileName as string,
      };
      
      if (confidence !== undefined) resultObj.confidence = confidence;
      if (insurer) resultObj.insurer = insurer;
      if (product) resultObj.product = product;
      
      setResult(resultObj);

      // Redirect after success (optional delay)
      if (redirectUrl) {
        setTimeout(() => {
          router.push(redirectUrl);
          router.refresh();
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Error en upload/análisis de cotización:', error);
      setUploadProgress({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : t('progress.unknownError'),
      });
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setInsuranceCategory('');
    setUploadProgress({ status: 'idle', progress: 0, message: '' });
    setResult(null);
  };

  const handleUploadAnother = () => {
    setSelectedFile(null);
    setInsuranceCategory('');
    setUploadProgress({ status: 'idle', progress: 0, message: '' });
    setResult(null);
  };

  const handleViewAnalysis = () => {
    if (result?.analysisId) {
      router.push(`/quotes/analysis/${result.analysisId}`);
    }
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
          <p className="text-xl font-medium text-primary">{tForm('dropHere')}</p>
        ) : (
          <>
            <p className="text-xl font-medium mb-2">
              {tForm('dragPdfHere')}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {tForm('orClickToSelect')}
            </p>
            <Button type="button" variant="outline">
              {tForm('selectFile')}
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
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Receipt className="h-8 w-8 text-amber-600" />
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

        {/* Insurance Category Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{tUploadCat('label')}</label>
          <Select value={insuranceCategory} onValueChange={setInsuranceCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={tUploadCat('placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {tUploadCat('companyBadge')}
                </SelectLabel>
                {COMPANY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {tCat(cat)}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {tUploadCat('clientBadge')}
                </SelectLabel>
                {CLIENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {tCat(cat)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{tUploadCat('autoDetect')}</p>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleUpload} className="flex-1">
            <FileSearch className="h-4 w-4 mr-2" />
            {tForm('uploadAndAnalyze')}
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            {tForm('cancel')}
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
            {uploadProgress.progress}%
          </p>
        </div>

        {selectedFile && (
          <div className="text-center text-sm text-muted-foreground">
            {selectedFile.name}
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
        
        <div className="text-center space-y-2">
          <p className="text-xl font-medium text-green-600">
            {uploadProgress.message}
          </p>
          <p className="text-sm text-muted-foreground">
            {result.fileName}
          </p>
          
          {result.insurer && (
            <p className="text-sm">
              <span className="text-muted-foreground">{t('insurer')}:</span>{' '}
              <span className="font-medium">{result.insurer}</span>
            </p>
          )}
          
          {result.product && (
            <p className="text-sm">
              <span className="text-muted-foreground">{t('product')}:</span>{' '}
              <span className="font-medium">{result.product}</span>
            </p>
          )}
          
          {result.confidence !== undefined && (
            <p className="text-sm">
              <span className="text-muted-foreground">{t('confidence')}:</span>{' '}
              <span className="font-medium">{result.confidence.toFixed(0)}%</span>
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          {result.analysisId && (
            <Button onClick={handleViewAnalysis}>
              {t('viewAnalysis')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          <Button variant="outline" onClick={handleUploadAnother}>
            {t('uploadAnother')}
          </Button>
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
        
        <div className="text-center space-y-2">
          <p className="text-xl font-medium text-red-600">
            {t('progress.errorTitle')}
          </p>
          <p className="text-sm text-muted-foreground">
            {uploadProgress.message}
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={handleUpload}>
            {t('retry')}
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            {tForm('cancel')}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
