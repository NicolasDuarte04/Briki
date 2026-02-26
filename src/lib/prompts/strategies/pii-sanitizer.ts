// src/lib/prompts/strategies/pii-sanitizer.ts
/**
 * PII Sanitizer — Pre-LLM Middleware
 *
 * Masks or redacts personally identifiable information from categoryData
 * **before** it is serialized into the prompt string sent to OpenAI.
 *
 * This is a defense-in-depth layer complementing:
 *   1. DB-level encryption (pgcrypto encrypt_pii / decrypt_pii)
 *   2. Prompt-level PII directive (instructions to the LLM)
 *   3. Post-response validation (validateChatResponse)
 *
 * @module prompts/strategies/pii-sanitizer
 */

import type { PiiClassification } from './types';

// ─── Masking Helpers ─────────────────────────────────────────────────────────

/**
 * Extracts a city or department name from a Colombian-style address.
 * Falls back to a generic placeholder if no city is detected.
 */
function maskAddress(value: string): string {
  // Common Colombian city patterns — case-insensitive
  const cityPatterns = [
    /bogot[áa]/i, /medell[ií]n/i, /cali/i, /barranquilla/i,
    /cartagena/i, /bucaramanga/i, /pereira/i, /manizales/i,
    /c[úu]cuta/i, /ibagu[ée]/i, /santa\s*marta/i, /villavicencio/i,
    /pasto/i, /monter[ií]a/i, /neiva/i, /popay[áa]n/i,
    /armenia/i, /sincelejo/i, /tunja/i, /florencia/i,
    // Mexican cities
    /cdmx|ciudad\s*de\s*m[ée]xico/i, /guadalajara/i, /monterrey/i,
    /puebla/i, /quer[ée]taro/i, /canc[úu]n/i, /m[ée]rida/i,
  ];

  for (const pattern of cityPatterns) {
    const match = value.match(pattern);
    if (match) return `${match[0]} (dirección protegida)`;
  }

  return '[Ubicación protegida]';
}

/**
 * Masks a medical pre-existing conditions text to a boolean summary.
 */
function maskMedicalText(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === 'no' || trimmed === 'ninguna' || trimmed === 'n/a') {
    return 'Sin preexistencias reportadas';
  }
  return 'Tiene condiciones preexistentes reportadas (detalles protegidos)';
}

/**
 * Masks an identification number (NIT, CC, CE, etc.) to show only last 3 digits.
 */
function maskIdNumber(value: string): string {
  const cleaned = value.replace(/[^0-9]/g, '');
  if (cleaned.length <= 3) return '***';
  return `***${cleaned.slice(-3)}`;
}

/**
 * Masks a license plate to show only the letters portion.
 */
function maskPlate(value: string): string {
  const letters = value.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (letters.length >= 2) return `${letters.slice(0, 3)}-***`;
  return '[Placa protegida]';
}

// ─── Field-Specific Mask Dispatch ────────────────────────────────────────────

/**
 * Known field ID patterns → specific masking function.
 * If a field is classified as 'mask' but doesn't match any pattern here,
 * a generic "[dato protegido]" is used.
 */
const MASK_DISPATCH: Array<{ test: RegExp; mask: (v: string) => string }> = [
  { test: /ubicaci[oó]n|direcci[oó]n|address|domicilio|inmueble/i, mask: maskAddress },
  { test: /preexistencia|medical|enfermedad|condici[oó]n/i, mask: maskMedicalText },
  { test: /nit|cedula|c[ée]dula|passport|identificaci[oó]n|id_number/i, mask: maskIdNumber },
  { test: /placa|plate|licencia/i, mask: maskPlate },
];

function applyMask(fieldId: string, value: string): string {
  for (const { test, mask } of MASK_DISPATCH) {
    if (test.test(fieldId)) return mask(value);
  }
  // Generic mask: keep first few chars + ellipsis
  if (value.length > 10) return `${value.slice(0, 6)}… [protegido]`;
  return '[dato protegido]';
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Sanitizes categoryData fields according to PII classification before
 * they are serialized into the LLM prompt.
 *
 * @param data      - Raw categoryData from CaseBrief (may be undefined)
 * @param piiMap    - Field → PiiClassification from the strategy
 * @returns         - New record with only safe/masked values (redacted fields are omitted)
 */
export function sanitizeCategoryData(
  data: Record<string, string | number | boolean | string[] | null> | undefined,
  piiMap: Record<string, PiiClassification>,
): Record<string, string | number | boolean | string[] | null> {
  if (!data) return {};

  const sanitized: Record<string, string | number | boolean | string[] | null> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    const classification = piiMap[key] ?? 'safe'; // Default to safe if not classified

    switch (classification) {
      case 'safe':
        sanitized[key] = value;
        break;

      case 'mask':
        // Only strings can be meaningfully masked; numbers/booleans/arrays pass through safe
        if (typeof value === 'string') {
          sanitized[key] = applyMask(key, value);
        } else {
          sanitized[key] = value;
        }
        break;

      case 'redact':
        // Completely omitted — do not include in output
        break;
    }
  }

  return sanitized;
}
