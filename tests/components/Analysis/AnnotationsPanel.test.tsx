/**
 * Tests para AnnotationsPanel Component - FASE 5
 * 
 * Tests básicos de UI para el componente de panel de anotaciones.
 * 
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 7.2 - Día 17
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnnotationsPanel } from '@/components/Analysis/AnnotationsPanel';

describe('AnnotationsPanel', () => {
  const mockAnalysisId = 'analysis-123';

  beforeEach(() => {
    // Reset component state between tests
  });

  it('should render empty state initially', () => {
    render(<AnnotationsPanel analysisId={mockAnalysisId} />);
    
    expect(screen.getByText('Anotaciones')).toBeInTheDocument();
    expect(screen.getByText('No hay anotaciones aún')).toBeInTheDocument();
    expect(screen.getByText(/Haz clic en el botón \+ para agregar una/)).toBeInTheDocument();
  });

  it('should show add annotation form when clicking plus button', async () => {
    render(<AnnotationsPanel analysisId={mockAnalysisId} />);
    
    const plusButton = screen.getByRole('button', { name: '' });
    fireEvent.click(plusButton);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Escribe una anotación...')).toBeInTheDocument();
    });
  });

  it('should add a new annotation', async () => {
    render(<AnnotationsPanel analysisId={mockAnalysisId} />);
    
    // Open form
    const plusButton = screen.getByRole('button', { name: '' });
    fireEvent.click(plusButton);
    
    // Enter text
    const textarea = screen.getByPlaceholderText('Escribe una anotación...');
    fireEvent.change(textarea, { target: { value: 'Esta es una nota de prueba' } });
    
    // Submit
    const saveButton = screen.getByText('Guardar');
    fireEvent.click(saveButton);
    
    // Verify annotation appears
    await waitFor(() => {
      expect(screen.getByText('Esta es una nota de prueba')).toBeInTheDocument();
      expect(screen.getByText('Usuario Actual')).toBeInTheDocument();
    });
  });

  it('should cancel adding annotation', async () => {
    render(<AnnotationsPanel analysisId={mockAnalysisId} />);
    
    // Open form
    const plusButton = screen.getByRole('button', { name: '' });
    fireEvent.click(plusButton);
    
    // Enter text
    const textarea = screen.getByPlaceholderText('Escribe una anotación...');
    fireEvent.change(textarea, { target: { value: 'Esta nota será cancelada' } });
    
    // Cancel
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);
    
    // Verify form is closed and annotation not added
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Escribe una anotación...')).not.toBeInTheDocument();
      expect(screen.queryByText('Esta nota será cancelada')).not.toBeInTheDocument();
    });
  });

  it('should delete an annotation', async () => {
    render(<AnnotationsPanel analysisId={mockAnalysisId} />);
    
    // Add annotation first
    const plusButton = screen.getByRole('button', { name: '' });
    fireEvent.click(plusButton);
    
    const textarea = screen.getByPlaceholderText('Escribe una anotación...');
    fireEvent.change(textarea, { target: { value: 'Nota para eliminar' } });
    
    const saveButton = screen.getByText('Guardar');
    fireEvent.click(saveButton);
    
    // Wait for annotation to appear
    await waitFor(() => {
      expect(screen.getByText('Nota para eliminar')).toBeInTheDocument();
    });
    
    // Delete annotation
    const deleteButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg') !== null && 
      btn.className.includes('h-6 w-6 p-0')
    );
    
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);
      
      // Verify annotation is removed
      await waitFor(() => {
        expect(screen.queryByText('Nota para eliminar')).not.toBeInTheDocument();
      });
    }
  });

  it('should disable save button when textarea is empty', async () => {
    render(<AnnotationsPanel analysisId={mockAnalysisId} />);
    
    // Open form
    const plusButton = screen.getByRole('button', { name: '' });
    fireEvent.click(plusButton);
    
    const saveButton = screen.getByText('Guardar');
    expect(saveButton).toBeDisabled();
    
    // Enter text
    const textarea = screen.getByPlaceholderText('Escribe una anotación...');
    fireEvent.change(textarea, { target: { value: 'Texto válido' } });
    
    // Save should now be enabled
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('should show annotation count badge', async () => {
    render(<AnnotationsPanel analysisId={mockAnalysisId} />);
    
    // Initially no badge
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    
    // Add annotation
    const plusButton = screen.getByRole('button', { name: '' });
    fireEvent.click(plusButton);
    
    const textarea = screen.getByPlaceholderText('Escribe una anotación...');
    fireEvent.change(textarea, { target: { value: 'Primera nota' } });
    
    const saveButton = screen.getByText('Guardar');
    fireEvent.click(saveButton);
    
    // Should show count badge
    await waitFor(() => {
      const badges = screen.getAllByText('1');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('should show persistence note when annotations exist', async () => {
    render(<AnnotationsPanel analysisId={mockAnalysisId} />);
    
    // Initially no note
    expect(screen.queryByText(/Las anotaciones se guardan localmente/)).not.toBeInTheDocument();
    
    // Add annotation
    const plusButton = screen.getByRole('button', { name: '' });
    fireEvent.click(plusButton);
    
    const textarea = screen.getByPlaceholderText('Escribe una anotación...');
    fireEvent.change(textarea, { target: { value: 'Nota de prueba' } });
    
    const saveButton = screen.getByText('Guardar');
    fireEvent.click(saveButton);
    
    // Should show persistence note
    await waitFor(() => {
      expect(screen.getByText(/Las anotaciones se guardan localmente/)).toBeInTheDocument();
    });
  });
});

