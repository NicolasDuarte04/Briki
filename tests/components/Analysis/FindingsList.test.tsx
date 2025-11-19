/**
 * Tests para FindingsList Component - FASE 5
 * 
 * Tests básicos de UI para el componente de lista de hallazgos.
 * 
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 7.2 - Día 17
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FindingsList } from '@/components/Analysis/FindingsList';
import { useUI } from '@/lib/ui/state';

// Mock de useUI
vi.mock('@/lib/ui/state', () => ({
  useUI: vi.fn((selector) => {
    const mockState = {
      setSelectedField: vi.fn()
    };
    return selector ? selector(mockState) : mockState;
  })
}));

describe('FindingsList', () => {
  const mockAnalysis = {
    id: 'analysis-1',
    artifactId: 'artifact-1',
    caseId: 'case-1',
    orgId: 'org-1',
    extractedData: {
      policy_number: 'POL-2025-001',
      insured_name: 'Juan Pérez',
      insurer: {
        name: 'AXA Seguros'
      },
      currency: 'MXN',
      financials: {
        premium_total: 15000,
        premium_net: 12500,
        taxes: 2000
      },
      effective_from: '2025-01-01T00:00:00Z',
      effective_to: '2025-12-31T23:59:59Z',
      coverages: [
        {
          name: 'Gastos Médicos Mayores',
          limit_amount: 10000000,
          limit_unit: 'MXN'
        },
        {
          name: 'Maternidad',
          limit_amount: 500000,
          limit_unit: 'MXN'
        }
      ],
      exclusions: [
        {
          name: 'Enfermedades preexistentes'
        }
      ]
    },
    overallConfidence: 0.92,
    pageReferences: [
      {
        id: 'ref-1',
        policyAnalysisId: 'analysis-1',
        fieldName: 'policy_number',
        pageNumber: 1,
        confidence: 0.95,
        createdAt: new Date()
      },
      {
        id: 'ref-2',
        policyAnalysisId: 'analysis-1',
        fieldName: 'premium_total',
        pageNumber: 2,
        confidence: 0.90,
        createdAt: new Date()
      }
    ],
    extractedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render overall confidence badge', () => {
    render(<FindingsList analysis={mockAnalysis} />);
    
    expect(screen.getByText('Alto')).toBeInTheDocument();
    expect(screen.getByText(/92%/)).toBeInTheDocument();
  });

  it('should render policy number', () => {
    render(<FindingsList analysis={mockAnalysis} />);
    
    expect(screen.getByText('Número de Póliza')).toBeInTheDocument();
    expect(screen.getByText('POL-2025-001')).toBeInTheDocument();
  });

  it('should render insured name', () => {
    render(<FindingsList analysis={mockAnalysis} />);
    
    expect(screen.getByText('Asegurado')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('should render insurer name', () => {
    render(<FindingsList analysis={mockAnalysis} />);
    
    expect(screen.getByText('Aseguradora')).toBeInTheDocument();
    expect(screen.getByText('AXA Seguros')).toBeInTheDocument();
  });

  it('should render premium total with formatting', () => {
    render(<FindingsList analysis={mockAnalysis} />);
    
    expect(screen.getByText('Prima Total')).toBeInTheDocument();
    expect(screen.getByText(/15,000/)).toBeInTheDocument();
  });

  it('should render validity dates', () => {
    render(<FindingsList analysis={mockAnalysis} />);
    
    expect(screen.getByText('Vigencia')).toBeInTheDocument();
    expect(screen.getByText(/Inicio:/)).toBeInTheDocument();
    expect(screen.getByText(/Fin:/)).toBeInTheDocument();
  });

  it('should render coverages section', () => {
    render(<FindingsList analysis={mockAnalysis} />);
    
    expect(screen.getByText(/Coberturas \(2\)/)).toBeInTheDocument();
    expect(screen.getByText('Gastos Médicos Mayores')).toBeInTheDocument();
  });

  it('should render exclusions section', () => {
    render(<FindingsList analysis={mockAnalysis} />);
    
    expect(screen.getByText(/Exclusiones \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Enfermedades preexistentes')).toBeInTheDocument();
  });

  it('should show page references when available', () => {
    render(<FindingsList analysis={mockAnalysis} />);
    
    expect(screen.getByText('Pág. 1')).toBeInTheDocument();
    expect(screen.getByText('Pág. 2')).toBeInTheDocument();
  });

  it('should call setSelectedField when clicking on a finding', () => {
    const mockSetSelectedField = vi.fn();
    (useUI as any).mockImplementation((selector: any) => {
      const mockState = {
        setSelectedField: mockSetSelectedField
      };
      return selector ? selector(mockState) : mockState;
    });

    render(<FindingsList analysis={mockAnalysis} />);
    
    const policyNumberButton = screen.getByText('Número de Póliza').closest('button');
    if (policyNumberButton) {
      fireEvent.click(policyNumberButton);
      expect(mockSetSelectedField).toHaveBeenCalledWith('policy_number');
    }
  });

  it('should render confidence levels correctly', () => {
    // Test con confianza alta
    render(<FindingsList analysis={{ ...mockAnalysis, overallConfidence: 0.95 }} />);
    expect(screen.getByText('Alto')).toBeInTheDocument();

    // Test con confianza media
    const { rerender } = render(<FindingsList analysis={{ ...mockAnalysis, overallConfidence: 0.75 }} />);
    expect(screen.getByText('Medio')).toBeInTheDocument();

    // Test con confianza baja
    rerender(<FindingsList analysis={{ ...mockAnalysis, overallConfidence: 0.50 }} />);
    expect(screen.getByText('Bajo')).toBeInTheDocument();
  });
});

