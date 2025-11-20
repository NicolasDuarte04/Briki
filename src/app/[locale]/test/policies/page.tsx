'use client';

/**
 * Testing Page for Policy Analysis APIs - FASE 3
 * 
 * Access at: /test/policies
 * 
 * This page allows testing the policy analysis functionality
 * without needing to integrate with the full UI.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, FileText, Database } from 'lucide-react';

export default function PoliciesTestPage() {
  const [artifactId, setArtifactId] = useState('');
  const [caseId, setCaseId] = useState('');
  const [forceReanalysis, setForceReanalysis] = useState(false); // ✅ FASE 6 REFINAMIENTO
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Test 1: Analyze a policy
  const handleAnalyze = async () => {
    if (!artifactId) {
      setError('Por favor ingresa un Artifact ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/policies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifactId,
          extractionMethod: 'hybrid',
          force: forceReanalysis // ✅ FASE 6 REFINAMIENTO: Permitir re-análisis
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al analizar');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Test 2: Get analyses for a case
  const handleGetAnalyses = async () => {
    if (!caseId) {
      setError('Por favor ingresa un Case ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/policies/analyses?caseId=${caseId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener análisis');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🧪 Testing: Análisis de Pólizas</h1>
        <p className="text-muted-foreground">
          FASE 3 - Página de testing para APIs de análisis de pólizas
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Test 1: Analyze Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Test 1: Analizar Póliza
            </CardTitle>
            <CardDescription>
              POST /api/policies/analyze
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Artifact ID (PDF subido)
              </label>
              <Input
                placeholder="uuid-del-artifact"
                value={artifactId}
                onChange={(e) => setArtifactId(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Obtén este ID al subir un PDF en la app
              </p>
            </div>
            
            {/* ✅ FASE 6 REFINAMIENTO: Checkbox para re-análisis forzado */}
            <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <input
                type="checkbox"
                id="forceReanalysis"
                checked={forceReanalysis}
                onChange={(e) => setForceReanalysis(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
              />
              <label htmlFor="forceReanalysis" className="text-sm cursor-pointer">
                <span className="font-medium">Re-analizar (forzar)</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Eliminar análisis existente y crear uno nuevo con las últimas mejoras
                </p>
              </label>
            </div>
            
            <Button
              onClick={handleAnalyze}
              disabled={loading || !artifactId}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                forceReanalysis ? '🔄 Re-analizar PDF' : 'Analizar PDF'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test 2: Get Analyses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Test 2: Obtener Análisis
            </CardTitle>
            <CardDescription>
              GET /api/policies/analyses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Case ID
              </label>
              <Input
                placeholder="uuid-del-caso"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                ID del caso a consultar
              </p>
            </div>
            <Button
              onClick={handleGetAnalyses}
              disabled={loading || !caseId}
              className="w-full"
              variant="secondary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Consultando...
                </>
              ) : (
                'Obtener Análisis'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Resultado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto max-h-[600px]">
              <pre className="text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>

            {/* Quick Stats */}
            {result.analysis && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded">
                  <div className="text-xs text-muted-foreground">Confianza</div>
                  <div className="text-lg font-bold">
                    {(result.analysis.overallConfidence * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded">
                  <div className="text-xs text-muted-foreground">Referencias</div>
                  <div className="text-lg font-bold">
                    {result.analysis.pageReferences?.length || 0}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded">
                  <div className="text-xs text-muted-foreground">Método</div>
                  <div className="text-sm font-semibold">
                    {result.analysis.extractionMethod}
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded">
                  <div className="text-xs text-muted-foreground">Campos</div>
                  <div className="text-lg font-bold">
                    {Object.keys(result.analysis.extractedData || {}).length}
                  </div>
                </div>
              </div>
            )}

            {result.analyses && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">
                  Total de análisis: {result.count}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-6 border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">📝 Instrucciones</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>1. Para probar análisis:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
            <li>Sube un PDF de póliza en la aplicación</li>
            <li>Copia el ID del artifact creado</li>
            <li>Pégalo en el campo "Artifact ID" arriba</li>
            <li><strong>✅ NUEVO:</strong> Marca "Re-analizar (forzar)" si ya analizaste este PDF y quieres actualizar el análisis</li>
            <li>Haz click en "Analizar PDF" (o "🔄 Re-analizar PDF" si marcaste el checkbox)</li>
            <li>El análisis tomará ~7-13 segundos</li>
            <li>Revisa la terminal del servidor para ver los logs de mapeo de coordenadas</li>
          </ul>

          <p className="mt-4">
            <strong>2. Para consultar análisis:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
            <li>Obtén el ID de un caso existente</li>
            <li>Pégalo en el campo "Case ID"</li>
            <li>Haz click en "Obtener Análisis"</li>
            <li>Verás todos los análisis de ese caso</li>
          </ul>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded">
            <p className="text-xs">
              <strong>⚠️ Nota:</strong> Esta página es solo para testing. En producción,
              estas funcionalidades estarán integradas en la UI principal (tabs Analysis y Policies).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

