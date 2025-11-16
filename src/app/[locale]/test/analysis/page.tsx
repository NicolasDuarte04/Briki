'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // ✅ CORRECCIÓN CRÍTICA SSR
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Info, FileText } from 'lucide-react';
import { useUI } from '@/lib/ui/state';

// ⚠️ CRITICAL: Dynamic import required to prevent SSR issues with pdfjs-dist
// pdfjs-dist is not compatible with Node.js/SSR environment
// This component must be loaded client-side only
const AnalysisTab = dynamic(
  () => import('@/components/Analysis/AnalysisTab').then(mod => ({ default: mod.AnalysisTab })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando componente de análisis...</p>
      </div>
    )
  }
);

/**
 * Testing Page for FASE 5: AnalysisTab Component
 * 
 * Permite probar visualmente el componente AnalysisTab:
 * 1. Fetch de análisis de un caso
 * 2. Selección de un análisis
 * 3. Visualización del PDF con resaltados
 * 4. Navegación desde hallazgos al PDF
 */
export default function AnalysisTestPage() {
  const [caseId, setCaseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchPolicyAnalyses = useUI(s => s.fetchPolicyAnalyses);
  const policyAnalyses = useUI(s => s.policyAnalyses);
  const policyAnalysesLoaded = useUI(s => s.policyAnalysesLoaded);
  const selectedPolicyAnalysisId = useUI(s => s.selectedPolicyAnalysisId);
  const setSelectedPolicyAnalysis = useUI(s => s.setSelectedPolicyAnalysis);

  const handleFetchAnalyses = async () => {
    if (!caseId.trim()) {
      setError('Case ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchPolicyAnalyses(caseId);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analyses');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnalysis = (analysisId: string) => {
    setSelectedPolicyAnalysis(analysisId);
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-center">FASE 5: Testing de AnalysisTab</h1>
        <p className="text-center text-lg text-muted-foreground mt-2">
          Prueba visual del componente de análisis de pólizas en PDF
        </p>
      </div>

      <Alert className="bg-blue-100 border-blue-400 text-blue-800">
        <Info className="h-4 w-4" />
        <AlertTitle>Instrucciones</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1">
            <li>Ingresa un Case ID que tenga análisis de pólizas.</li>
            <li>Haz clic en "Fetch Analyses" para cargar los análisis.</li>
            <li>Selecciona un análisis de la lista.</li>
            <li>Visualiza el PDF con resaltados en el componente de abajo.</li>
            <li>Haz clic en los hallazgos para navegar al PDF.</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Panel de Control</CardTitle>
          <CardDescription>Carga y selecciona análisis de pólizas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caseId">Case ID</Label>
            <div className="flex gap-2">
              <Input
                id="caseId"
                placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
              />
              <Button onClick={handleFetchAnalyses} disabled={loading}>
                {loading ? 'Cargando...' : 'Fetch Analyses'}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {policyAnalysesLoaded && policyAnalyses.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Sin Análisis</AlertTitle>
              <AlertDescription>
                No hay análisis de pólizas para este caso. Prueba con otro Case ID.
              </AlertDescription>
            </Alert>
          )}

          {policyAnalyses.length > 0 && (
            <div className="space-y-2">
              <Label>Análisis Disponibles ({policyAnalyses.length})</Label>
              <div className="space-y-2">
                {policyAnalyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPolicyAnalysisId === analysis.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelectAnalysis(analysis.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {analysis.artifact?.fileName || 'Unknown PDF'}
                          </span>
                        </div>
                        {analysis.extractedData?.policy_number && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Póliza: {analysis.extractedData.policy_number}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Confianza: {Math.round(analysis.overallConfidence * 100)}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Referencias: {analysis.pageReferences?.length || 0}
                          </span>
                        </div>
                      </div>
                      {selectedPolicyAnalysisId === analysis.id && (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AnalysisTab Component */}
      {selectedPolicyAnalysisId && (
        <Card>
          <CardHeader>
            <CardTitle>Componente AnalysisTab</CardTitle>
            <CardDescription>
              Visualización del PDF con resaltados y hallazgos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] border rounded-lg overflow-hidden">
              <AnalysisTab />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

