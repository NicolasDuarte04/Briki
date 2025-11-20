/**
 * Tests para AnalysisTab Component - FASE 5
 * 
 * Tests básicos de UI para el componente principal de análisis de pólizas.
 * 
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 7.2 - Día 17
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AnalysisTab } from '@/components/Analysis/AnalysisTab';
import { useUI } from '@/lib/ui/state';

// Mock de useUI
vi.mock('@/lib/ui/state', () => ({
  useUI: vi.fn()
}));

// Mock de componentes hijos para aislar tests
vi.mock('@/components/Analysis/PdfViewer', () => ({
  PdfViewer: ({ analysis }: any) => (
    <div data-testid="pdf-viewer">PDF Viewer: {analysis?.id}</div>
  )
}));

vi.mock('@/components/Analysis/PdfMinimap', () => ({
  PdfMinimap: () => <div data-testid="pdf-minimap">Minimap</div>
}));

vi.mock('@/components/Analysis/FindingsList', () => ({
  FindingsList: ({ analysis }: any) => (
    <div data-testid="findings-list">Findings: {analysis?.id}</div>
  )
}));

vi.mock('@/components/Analysis/AnnotationsPanel', () => ({
  AnnotationsPanel: ({ analysisId }: any) => (
    <div data-testid="annotations-panel">Annotations: {analysisId}</div>
  )
}));

describe('AnalysisTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no analysis is selected', () => {
    // Arrange: No hay análisis seleccionado
    (useUI as any).mockReturnValue({
      selectedPolicyAnalysisId: null,
      policyAnalyses: []
    });

    // Act
    render(<AnalysisTab />);

    // Assert
    expect(screen.getByText(/selecciona una póliza/i)).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-viewer')).not.toBeInTheDocument();
  });

  it('should render PDF viewer when analysis is selected', () => {
    // Arrange: Análisis seleccionado
    const mockAnalysis = {
      id: 'analysis-1',
      artifactId: 'artifact-1',
      caseId: 'case-1',
      orgId: 'org-1',
      extractedData: {
        policy_number: 'POL-123',
        insured_name: 'Test User'
      },
      overallConfidence: 0.95,
      pageReferences: [],
      extractedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (useUI as any).mockReturnValue({
      selectedPolicyAnalysisId: 'analysis-1',
      policyAnalyses: [mockAnalysis]
    });

    // Act
    render(<AnalysisTab />);

    // Assert
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-minimap')).toBeInTheDocument();
    expect(screen.getByTestId('findings-list')).toBeInTheDocument();
    expect(screen.getByTestId('annotations-panel')).toBeInTheDocument();
  });

  it('should pass correct props to child components', () => {
    // Arrange
    const mockAnalysis = {
      id: 'analysis-1',
      artifactId: 'artifact-1',
      caseId: 'case-1',
      orgId: 'org-1',
      extractedData: {},
      overallConfidence: 0.85,
      pageReferences: [],
      extractedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (useUI as any).mockReturnValue({
      selectedPolicyAnalysisId: 'analysis-1',
      policyAnalyses: [mockAnalysis]
    });

    // Act
    render(<AnalysisTab />);

    // Assert
    expect(screen.getByText(/PDF Viewer: analysis-1/)).toBeInTheDocument();
    expect(screen.getByText(/Findings: analysis-1/)).toBeInTheDocument();
    expect(screen.getByText(/Annotations: analysis-1/)).toBeInTheDocument();
  });

  it('should handle multiple analyses in state', () => {
    // Arrange: Múltiples análisis pero solo uno seleccionado
    const mockAnalyses = [
      {
        id: 'analysis-1',
        artifactId: 'artifact-1',
        caseId: 'case-1',
        orgId: 'org-1',
        extractedData: {},
        overallConfidence: 0.95,
        pageReferences: [],
        extractedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'analysis-2',
        artifactId: 'artifact-2',
        caseId: 'case-1',
        orgId: 'org-1',
        extractedData: {},
        overallConfidence: 0.88,
        pageReferences: [],
        extractedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    (useUI as any).mockReturnValue({
      selectedPolicyAnalysisId: 'analysis-2',
      policyAnalyses: mockAnalyses
    });

    // Act
    render(<AnalysisTab />);

    // Assert: Debe renderizar el análisis correcto
    expect(screen.getByText(/PDF Viewer: analysis-2/)).toBeInTheDocument();
    expect(screen.queryByText(/PDF Viewer: analysis-1/)).not.toBeInTheDocument();
  });

  it('should render with correct layout structure', () => {
    // Arrange
    const mockAnalysis = {
      id: 'analysis-1',
      artifactId: 'artifact-1',
      caseId: 'case-1',
      orgId: 'org-1',
      extractedData: {},
      overallConfidence: 0.90,
      pageReferences: [],
      extractedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (useUI as any).mockReturnValue({
      selectedPolicyAnalysisId: 'analysis-1',
      policyAnalyses: [mockAnalysis]
    });

    // Act
    const { container } = render(<AnalysisTab />);

    // Assert: Verificar estructura de layout
    const mainContainer = container.querySelector('.flex.h-full');
    expect(mainContainer).toBeInTheDocument();

    // Panel izquierdo (PDF)
    const leftPanel = container.querySelector('.flex-1.relative');
    expect(leftPanel).toBeInTheDocument();

    // Panel derecho (Findings + Annotations)
    const rightPanel = container.querySelector('.w-80.border-l');
    expect(rightPanel).toBeInTheDocument();
  });
});

