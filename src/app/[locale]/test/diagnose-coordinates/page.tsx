'use client';

/**
 * Testing Page for PDF Coordinates Diagnosis - FASE 1
 * 
 * Access at: /test/diagnose-coordinates
 * 
 * This page allows testing the PDF coordinates diagnosis functionality
 * by uploading a PDF and viewing the coordinate system analysis.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Upload, FileText, BarChart3, MapPin } from 'lucide-react';

interface DiagnosticResult {
  fileName: string;
  pages: number;
  totalBlocks: number;
  coordinateRanges: {
    x: { min: number; max: number; avg: number };
    y: { min: number; max: number; avg: number };
    width: { min: number; max: number; avg: number };
    height: { min: number; max: number; avg: number };
  };
  sampleBlocks: Array<{
    text: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  pageDistribution: Record<number, number>;
  systemAnalysis: {
    isRelativeSystem: boolean;
    isProbablyPoints: boolean;
    estimatedWidthInches?: number;
    estimatedHeightInches?: number;
    avgTextHeight: number;
    conclusion: string;
    warnings?: string[];
  };
}

export default function DiagnoseCoordinatesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
        setError('Por favor selecciona un archivo PDF');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDiagnose = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo PDF');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/test/diagnose-coordinates', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al analizar PDF');
      }

      setResult(data.diagnostic);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al analizar PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Diagnóstico de Coordenadas de PDF</h1>
        <p className="text-muted-foreground">
          Analiza el sistema de coordenadas usado por pdf2json para determinar cómo mapear correctamente a píxeles en el visor.
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Subir PDF para Análisis</CardTitle>
          <CardDescription>
            Selecciona un archivo PDF para analizar su sistema de coordenadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label htmlFor="pdf-file" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>Seleccionar PDF</span>
                </div>
                <input
                  id="pdf-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span className="text-xs">({(file.size / 1024).toFixed(2)} KB)</span>
                </div>
              )}
            </div>

            <Button 
              onClick={handleDiagnose} 
              disabled={!file || loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analizar Coordenadas
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-6">
          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Archivo</div>
                  <div className="font-medium">{result.fileName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Páginas</div>
                  <div className="font-medium">{result.pages}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Bloques de Texto</div>
                  <div className="font-medium">{result.totalBlocks.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Análisis del Sistema de Coordenadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Warnings */}
                {result.systemAnalysis.warnings && result.systemAnalysis.warnings.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">⚠️ Advertencias Detectadas:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {result.systemAnalysis.warnings.map((warning, i) => (
                          <li key={i} className="text-sm">{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="p-4 bg-muted rounded-md">
                  <div className="text-sm font-medium mb-2">Conclusión:</div>
                  <div className="text-sm">{result.systemAnalysis.conclusion}</div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Sistema Relativo (0-100)</div>
                    <div className="font-medium">
                      {result.systemAnalysis.isRelativeSystem ? (
                        <span className="text-green-600">✅ Probable</span>
                      ) : (
                        <span className="text-gray-500">❌ No</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Sistema de Puntos (1pt = 1/72")</div>
                    <div className="font-medium">
                      {result.systemAnalysis.isProbablyPoints ? (
                        <span className="text-green-600">✅ Probable</span>
                      ) : (
                        <span className="text-gray-500">❌ No</span>
                      )}
                    </div>
                  </div>
                  {result.systemAnalysis.estimatedWidthInches && (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Ancho Estimado</div>
                        <div className="font-medium">{result.systemAnalysis.estimatedWidthInches.toFixed(2)}"</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Alto Estimado</div>
                        <div className="font-medium">{result.systemAnalysis.estimatedHeightInches?.toFixed(2)}"</div>
                      </div>
                    </>
                  )}
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Altura Promedio de Texto</div>
                    <div className="font-medium">{result.systemAnalysis.avgTextHeight.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coordinate Ranges */}
          <Card>
            <CardHeader>
              <CardTitle>Rangos de Coordenadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Dimensión</th>
                      <th className="text-right p-2">Mínimo</th>
                      <th className="text-right p-2">Máximo</th>
                      <th className="text-right p-2">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-medium">X</td>
                      <td className="text-right p-2">{result.coordinateRanges.x.min.toFixed(2)}</td>
                      <td className="text-right p-2">{result.coordinateRanges.x.max.toFixed(2)}</td>
                      <td className="text-right p-2">{result.coordinateRanges.x.avg.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Y</td>
                      <td className="text-right p-2">{result.coordinateRanges.y.min.toFixed(2)}</td>
                      <td className="text-right p-2">{result.coordinateRanges.y.max.toFixed(2)}</td>
                      <td className="text-right p-2">{result.coordinateRanges.y.avg.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Width</td>
                      <td className="text-right p-2">{result.coordinateRanges.width.min.toFixed(2)}</td>
                      <td className="text-right p-2">{result.coordinateRanges.width.max.toFixed(2)}</td>
                      <td className="text-right p-2">{result.coordinateRanges.width.avg.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Height</td>
                      <td className="text-right p-2">{result.coordinateRanges.height.min.toFixed(2)}</td>
                      <td className="text-right p-2">{result.coordinateRanges.height.max.toFixed(2)}</td>
                      <td className="text-right p-2">{result.coordinateRanges.height.avg.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Page Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Página</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(result.pageDistribution)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([page, count]) => {
                    const percentage = ((count / result.totalBlocks) * 100).toFixed(1);
                    return (
                      <div key={page} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="font-medium">Página {page}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{count} bloques</span>
                          <span className="text-sm text-muted-foreground">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Sample Blocks */}
          <Card>
            <CardHeader>
              <CardTitle>Muestra de Bloques (primeros 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.sampleBlocks.map((block, i) => (
                  <div key={i} className="p-3 border rounded-md">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium mb-1">
                          Página {block.page} - Bloque {i + 1}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          "{block.text}{block.text.length === 50 ? '...' : ''}"
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mt-2">
                      <div>x: {block.x}</div>
                      <div>y: {block.y}</div>
                      <div>w: {block.width}</div>
                      <div>h: {block.height}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

