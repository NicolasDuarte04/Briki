// src/lib/excel/ExcelBuilderService.ts
/**
 * ExcelBuilderService — Generic Comparison Matrix to .xlsx Generator
 *
 * Generates a professional Excel workbook from a PolicyComparison + MatrixDefinition.
 * Category-agnostic: the same engine works for all 10 insurance categories.
 *
 * Key design decisions:
 *  - Freeze panes: Row 1 (header) + Column A (coverage names) always visible
 *  - Section headers: colored rows grouping coverages by domain
 *  - Color coding: green (INCLUIDO), red (NO AMPARA), yellow (SUBLIMITADO), gray (SIN DATO)
 *  - CSV Injection prevention: values starting with =, +, -, @ are prefixed with '
 *  - No PII: comparison data has already been sanitized upstream
 *
 * @module excel/ExcelBuilderService
 */

import ExcelJS from 'exceljs';
import type { MatrixDefinition, ExcelBuildOptions } from './types';
import { resolveSectionLabel } from './types';
import type { PolicyComparison, ComparisonRow, PolicyAnalysis } from '@/lib/types';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Corporate color palette (hex, no #) */
const COLORS = {
  brandPrimary: '4F46E5',    // Indigo 600 — Briki brand
  brandDark: '312E81',       // Indigo 900 — dark header
  sectionBg: 'EEF2FF',      // Indigo 50 — section row bg
  sectionBorder: 'A5B4FC',   // Indigo 300 — section border
  headerText: 'FFFFFF',      // White text on dark header
  included: 'DCFCE7',        // Green 100 — MEJOR (better)
  notCovered: 'FEE2E2',      // Red 100 — INFERIOR (worse)
  sublimited: 'FEF9C3',      // Yellow 100 — EQUIVALENTE (equal)
  noData: 'F3F4F6',          // Gray 100 — SIN DATO (missing)
  includedFont: '166534',    // Green 800
  notCoveredFont: '991B1B',  // Red 800
  sublimitedFont: '854D0E',  // Yellow 800
  noDataFont: '6B7280',      // Gray 500
} as const;

const DEFAULT_COL_WIDTH = 35;
const CONCEPT_COL_WIDTH = 50;

/** Row heights in points — centralized for easy tuning */
const ROW_HEIGHT = {
  title: 40,
  header: 36,
  section: 32,
  data: 44,
} as const;

// ─── CSV Injection Guard ─────────────────────────────────────────────────────

const INJECTION_PREFIXES = ['=', '+', '-', '@', '\t', '\r', '\n'];

/**
 * Sanitizes a cell value to prevent CSV/formula injection.
 * Prefixes dangerous characters with a single quote (') which
 * Excel displays as plain text.
 */
function sanitizeCellValue(value: string): string {
  if (!value || typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (INJECTION_PREFIXES.some(p => trimmed.startsWith(p))) {
    return `'${trimmed}`;
  }
  return trimmed;
}

// ─── Cell Value Extraction ───────────────────────────────────────────────────

interface CellResult {
  text: string;
  status: 'included' | 'not_covered' | 'sublimited' | 'no_data';
}

/**
 * Extracts display text and visual status from a ComparisonRow cell for a specific analysis.
 *
 * ✅ FIX D4: Uses `cell.status` from the AI (better/equal/worse/missing) as the
 *    authoritative signal for Excel color coding, instead of heuristic numeric inference.
 *
 * Status mapping (AI → Excel):
 *   better  → included     (green)  — coverage is present and superior
 *   equal   → sublimited   (yellow) — coverage is present, same as market / neutral
 *   worse   → not_covered  (red)    — coverage is present but inferior
 *   missing → no_data      (gray)   — coverage absent in this policy
 */
function extractCellValue(row: ComparisonRow, analysisId: string): CellResult {
  const cell = row.values[analysisId];

  if (!cell || cell.status === 'missing' || !cell.value) {
    return { text: 'SIN DATO', status: 'no_data' };
  }

  const cov = cell.value;
  const parts: string[] = [];

  // Build descriptive text
  if (cov.description) {
    parts.push(cov.description);
  } else if (cov.name) {
    parts.push(cov.name);
  }

  // Append limit if present
  if (cov.limitAmount != null) {
    const unit = cov.limitUnit || '';
    const formatted = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(cov.limitAmount);
    parts.push(`Límite: ${formatted} ${unit}`.trim());
  }

  // Append deductible if present
  if (cov.deductibleAmount != null) {
    const unit = cov.deductibleUnit || '';
    parts.push(`Deducible: ${cov.deductibleAmount}${unit}`);
  }

  // Append waiting period
  if (cov.waitingPeriod) {
    parts.push(`Carencia: ${cov.waitingPeriod}`);
  }

  const text = parts.length > 0 ? parts.join(' | ') : 'INCLUIDO';

  // ✅ Map AI-assigned cell.status to Excel visual status (traffic-light)
  switch (cell.status) {
    case 'worse':
      return { text, status: 'not_covered' };
    case 'better':
      return { text, status: 'included' };
    case 'equal':
      return { text, status: 'sublimited' };
    default:
      return { text, status: 'included' };
  }
}

// ─── Fuzzy Matching ──────────────────────────────────────────────────────────

/**
 * Normalizes a string for fuzzy comparison:
 * remove accents, lowercase, trim, collapse whitespace.
 */
function normalizeForMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds the best matching ComparisonRow for a given matrix label.
 * Uses normalized substring matching.
 */
function findMatchingRow(
  label: string,
  rows: ComparisonRow[],
  usedRowIds: Set<string>,
): ComparisonRow | null {
  const normalized = normalizeForMatch(label);

  for (const row of rows) {
    if (usedRowIds.has(row.id)) continue;
    const rowNorm = normalizeForMatch(row.coverageName);

    // Exact match
    if (rowNorm === normalized) {
      usedRowIds.add(row.id);
      return row;
    }
  }

  // Substring match (either direction)
  for (const row of rows) {
    if (usedRowIds.has(row.id)) continue;
    const rowNorm = normalizeForMatch(row.coverageName);

    if (rowNorm.includes(normalized) || normalized.includes(rowNorm)) {
      usedRowIds.add(row.id);
      return row;
    }
  }

  return null;
}

// ─── Main Builder ────────────────────────────────────────────────────────────

/**
 * Builds a professional Excel workbook from comparison data.
 *
 * @param comparison    - The PolicyComparison with aligned rows
 * @param matrixDef     - Static matrix definition for the insurance category (or null for fallback)
 * @param analyses      - PolicyAnalysis array (for insurer names in headers)
 * @param options       - Formatting options (locale, orgName, caseName)
 * @returns Buffer containing the .xlsx file
 */
export async function buildComparisonMatrix(
  comparison: PolicyComparison,
  matrixDef: MatrixDefinition | null,
  analyses: PolicyAnalysis[],
  options: ExcelBuildOptions,
): Promise<Buffer> {
  const locale = options.locale || 'es';
  const workbook = new ExcelJS.Workbook();

  // Metadata
  workbook.creator = 'Briki — Insurtech Platform';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetName = locale === 'es' ? 'Matriz Comparativa' : 'Comparison Matrix';
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }], // Freeze col A + rows 1-2
  });

  const analysisIds = comparison.analysisIds;
  const totalCols = 1 + analysisIds.length; // concept + N insurers

  // ── Title Row ──────────────────────────────────────────────────────

  const titleText = [
    options.categoryLabel || matrixDef?.categoryLabel || '',
    options.caseName ? `— ${options.caseName}` : '',
    options.date ? `(${options.date})` : `(${new Date().toISOString().slice(0, 10)})`,
  ].filter(Boolean).join(' ');

  const titleRow = worksheet.addRow([titleText]);
  worksheet.mergeCells(1, 1, 1, totalCols);
  titleRow.height = ROW_HEIGHT.title;
  titleRow.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.headerText } };
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandDark } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // ── Header Row (Concept + Insurer names) ───────────────────────────

  const headerLabels = [locale === 'es' ? 'Concepto / Cobertura' : 'Concept / Coverage'];

  for (const id of analysisIds) {
    const analysis = analyses.find(a => a.id === id);
    const insurer = (analysis?.extractedData as Record<string, unknown>)?.insurer;
    const insurerName = typeof insurer === 'object' && insurer !== null
      ? ((insurer as Record<string, unknown>).name as string) || 'Aseguradora'
      : 'Aseguradora';
    headerLabels.push(sanitizeCellValue(insurerName));
  }

  const headerRow = worksheet.addRow(headerLabels);
  headerRow.height = ROW_HEIGHT.header;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandPrimary } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      bottom: { style: 'medium', color: { argb: COLORS.brandDark } },
    };
  });
  // First col left-aligned
  headerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  // Column widths
  worksheet.getColumn(1).width = CONCEPT_COL_WIDTH;
  for (let i = 2; i <= totalCols; i++) {
    worksheet.getColumn(i).width = DEFAULT_COL_WIDTH;
  }

  // ── Build Rows ─────────────────────────────────────────────────────

  const rows = Array.isArray(comparison.rows) ? comparison.rows : [];
  const usedRowIds = new Set<string>();

  if (matrixDef) {
    // With matrix definition: iterate sections in order
    for (const [sectionKey, sectionItems] of Object.entries(matrixDef.secciones)) {
      // Section header row
      const sectionLabel = resolveSectionLabel(sectionKey, locale);
      const sectionRow = worksheet.addRow([sectionLabel]);
      worksheet.mergeCells(sectionRow.number, 1, sectionRow.number, totalCols);
      sectionRow.height = ROW_HEIGHT.section;
      sectionRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.brandDark } };
      sectionRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
      sectionRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      sectionRow.getCell(1).border = {
        bottom: { style: 'thin', color: { argb: COLORS.sectionBorder } },
        top: { style: 'thin', color: { argb: COLORS.sectionBorder } },
      };

      // Data rows for this section
      for (const itemLabel of sectionItems) {
        const matchedRow = findMatchingRow(itemLabel, rows, usedRowIds);
        const rowData: string[] = [sanitizeCellValue(itemLabel)];
        const cellStatuses: CellResult['status'][] = [];

        for (const analysisId of analysisIds) {
          if (matchedRow) {
            const result = extractCellValue(matchedRow, analysisId);
            rowData.push(sanitizeCellValue(result.text));
            cellStatuses.push(result.status);
          } else {
            rowData.push('SIN DATO');
            cellStatuses.push('no_data');
          }
        }

        const dataRow = worksheet.addRow(rowData);
        dataRow.height = ROW_HEIGHT.data;

        // Style concept column
        dataRow.getCell(1).font = { name: 'Calibri', size: 10 };
        dataRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        dataRow.getCell(1).border = {
          right: { style: 'thin', color: { argb: COLORS.sectionBorder } },
        };

        // Style value columns with color coding
        for (let colIdx = 0; colIdx < analysisIds.length; colIdx++) {
          const cell = dataRow.getCell(colIdx + 2);
          const status = cellStatuses[colIdx] ?? 'no_data';
          applyCellStyle(cell, status);
        }
      }
    }

    // Append any AI rows NOT matched by the matrix (extra findings)
    const unmatchedRows = rows.filter(r => !usedRowIds.has(r.id));
    if (unmatchedRows.length > 0) {
      const extraLabel = locale === 'es' ? 'Hallazgos Adicionales de la IA' : 'Additional AI Findings';
      const extraSectionRow = worksheet.addRow([extraLabel]);
      worksheet.mergeCells(extraSectionRow.number, 1, extraSectionRow.number, totalCols);
      extraSectionRow.height = ROW_HEIGHT.section;
      extraSectionRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, italic: true, color: { argb: COLORS.brandDark } };
      extraSectionRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
      extraSectionRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

      for (const row of unmatchedRows) {
        const rowData: string[] = [sanitizeCellValue(row.coverageName)];
        const cellStatuses: CellResult['status'][] = [];

        for (const analysisId of analysisIds) {
          const result = extractCellValue(row, analysisId);
          rowData.push(sanitizeCellValue(result.text));
          cellStatuses.push(result.status);
        }

        const dataRow = worksheet.addRow(rowData);
        dataRow.height = ROW_HEIGHT.data;
        dataRow.getCell(1).font = { name: 'Calibri', size: 10 };
        dataRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        dataRow.getCell(1).border = {
          right: { style: 'thin', color: { argb: COLORS.sectionBorder } },
        };

        for (let colIdx = 0; colIdx < analysisIds.length; colIdx++) {
          const cell = dataRow.getCell(colIdx + 2);
          applyCellStyle(cell, cellStatuses[colIdx] ?? 'no_data');
        }
      }
    }
  } else {
    // No matrix definition: render all AI rows as-is (fallback)
    for (const row of rows) {
      const rowData: string[] = [sanitizeCellValue(row.coverageName)];
      const cellStatuses: CellResult['status'][] = [];

      for (const analysisId of analysisIds) {
        const result = extractCellValue(row, analysisId);
        rowData.push(sanitizeCellValue(result.text));
        cellStatuses.push(result.status);
      }

      const dataRow = worksheet.addRow(rowData);
      dataRow.height = ROW_HEIGHT.data;
      dataRow.getCell(1).font = { name: 'Calibri', size: 10 };
      dataRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      for (let colIdx = 0; colIdx < analysisIds.length; colIdx++) {
        const cell = dataRow.getCell(colIdx + 2);
        applyCellStyle(cell, cellStatuses[colIdx] ?? 'no_data');
      }
    }
  }

  // ── Footer Row ─────────────────────────────────────────────────────

  const footerText = locale === 'es'
    ? `Generado por Briki — ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`
    : `Generated by Briki — ${new Date().toISOString()}`;

  worksheet.addRow([]); // blank separator
  const footerRow = worksheet.addRow([footerText]);
  worksheet.mergeCells(footerRow.number, 1, footerRow.number, totalCols);
  footerRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: COLORS.noDataFont } };
  footerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'right' };

  // ── Write to Buffer ────────────────────────────────────────────────

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── Helper: Apply cell style based on status ────────────────────────────────

function applyCellStyle(cell: ExcelJS.Cell, status: CellResult['status']): void {
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  switch (status) {
    case 'included':
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.included } };
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.includedFont } };
      break;
    case 'not_covered':
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.notCovered } };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.notCoveredFont } };
      break;
    case 'sublimited':
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sublimited } };
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.sublimitedFont } };
      break;
    case 'no_data':
    default:
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.noData } };
      cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.noDataFont } };
      break;
  }

  cell.border = {
    bottom: { style: 'hair', color: { argb: 'E5E7EB' } },
    right: { style: 'hair', color: { argb: 'E5E7EB' } },
  };
}
