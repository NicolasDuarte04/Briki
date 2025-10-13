import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createServiceRoleClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Use Node.js runtime for full crypto and header access
export const runtime = 'nodejs';

// Type definitions
interface ContactPayload {
  name: string;
  email: string;
  company: string;
  city: string;
  phone?: string;
  locale: string;
  message: string;
  honeypot?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Allowed locales
const ALLOWED_LOCALES = ['en', 'es'] as const;

/**
 * Validates the contact form payload
 */
function validatePayload(data: any): { valid: boolean; error?: ValidationError } {
  // Required fields check
  if (!data.name || typeof data.name !== 'string') {
    return { valid: false, error: { field: 'name', message: 'Name is required' } };
  }
  if (!data.email || typeof data.email !== 'string') {
    return { valid: false, error: { field: 'email', message: 'Email is required' } };
  }
  if (!data.company || typeof data.company !== 'string') {
    return { valid: false, error: { field: 'company', message: 'Company is required' } };
  }
  if (!data.city || typeof data.city !== 'string') {
    return { valid: false, error: { field: 'city', message: 'City is required' } };
  }
  if (!data.locale || typeof data.locale !== 'string') {
    return { valid: false, error: { field: 'locale', message: 'Locale is required' } };
  }
  if (!data.message || typeof data.message !== 'string') {
    return { valid: false, error: { field: 'message', message: 'Message is required' } };
  }

  // Trim all string fields
  const name = data.name.trim();
  const email = data.email.trim();
  const company = data.company.trim();
  const city = data.city.trim();
  const locale = data.locale.trim();
  const message = data.message.trim();
  const phone = data.phone ? data.phone.trim() : undefined;

  // Length validations
  if (name.length < 2 || name.length > 100) {
    return { valid: false, error: { field: 'name', message: 'Name must be between 2 and 100 characters' } };
  }

  if (email.length > 255) {
    return { valid: false, error: { field: 'email', message: 'Email must not exceed 255 characters' } };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: { field: 'email', message: 'Invalid email format' } };
  }

  if (company.length < 2 || company.length > 150) {
    return { valid: false, error: { field: 'company', message: 'Company must be between 2 and 150 characters' } };
  }

  if (city.length < 2 || city.length > 100) {
    return { valid: false, error: { field: 'city', message: 'City must be between 2 and 100 characters' } };
  }

  if (phone && phone.length > 30) {
    return { valid: false, error: { field: 'phone', message: 'Phone must not exceed 30 characters' } };
  }

  if (!ALLOWED_LOCALES.includes(locale as any)) {
    return { valid: false, error: { field: 'locale', message: 'Locale must be "en" or "es"' } };
  }

  if (message.length < 10 || message.length > 2000) {
    return { valid: false, error: { field: 'message', message: 'Message must be between 10 and 2000 characters' } };
  }

  // Semantic validation: message shouldn't be only whitespace/newlines
  if (message.replace(/\s/g, '').length < 10) {
    return { valid: false, error: { field: 'message', message: 'Message must contain meaningful content' } };
  }

  return { valid: true };
}

/**
 * Extracts client IP from request headers
 */
function getClientIp(request: NextRequest): string {
  // Check forwarded headers (common in proxy/CDN scenarios)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list, take the first one
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection IP (may not be available in all environments)
  return 'unknown';
}

/**
 * Generates SHA-256 hash of IP + salt
 */
function hashIp(ip: string): string {
  const salt = env.CONTACT_SPAM_SALT;
  const combined = `${ip}${salt}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * POST /api/contact
 * Handles contact form submissions
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize rate limit/window defaults (configurable via env)
    const RATE_LIMIT_MAX = parseInt(process.env.CONTACT_RATE_LIMIT || '5', 10); // max submissions per window
    const RATE_LIMIT_WINDOW_MIN = parseInt(process.env.CONTACT_RATE_WINDOW_MINUTES || '10', 10); // window in minutes

    // Parse JSON body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          details: { field: 'body', message: 'Invalid JSON payload' }
        },
        { status: 400 }
      );
    }

    // ANTI-SPAM: Check honeypot first (fast reject)
    if (body.honeypot && body.honeypot.trim() !== '') {
      console.warn('Spam detected via honeypot');
      return NextResponse.json(
        { ok: false, error: 'spam_detected' },
        { status: 429 }
      );
    }

    // RATE LIMIT: IP-based check before validation & insertion
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const clientIp = getClientIp(request);
    const ipHash = hashIp(clientIp);
    const supabase = createServiceRoleClient();
    const windowStartISO = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString();

    const { count: recentCount, error: rateError } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', windowStartISO);

    if (rateError) {
      // Soft-fail on rate check errors; do not block valid UX
      if (process.env.NODE_ENV === 'development') {
        console.warn('Rate limit check failed', {
          timestamp: new Date().toISOString(),
        });
      }
    } else if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
      // Discreet log without PII
      console.warn('Rate limit exceeded', {
        ipHash,
        windowMinutes: RATE_LIMIT_WINDOW_MIN,
        maxPerWindow: RATE_LIMIT_MAX,
        count: recentCount,
        timestamp: new Date().toISOString(),
      });
      // Generic error code so client can localize (reuses spam generic msg)
      return NextResponse.json(
        { ok: false, error: 'spam_detected' },
        { status: 429 }
      );
    }

    // Validate payload
    const validation = validatePayload(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          details: validation.error
        },
        { status: 400 }
      );
    }

    // Extract metadata (computed earlier for rate limiting)

    // Log submission metadata (for debugging/monitoring)
    console.log('Contact form submission:', {
      locale: body.locale,
      ipHash,
      userAgent: userAgent.substring(0, 50), // Log truncated UA
      timestamp: new Date().toISOString()
    });

    // Persist to database using Service Role (bypasses RLS)
    
    const { error: dbError } = await supabase
      .from('contacts')
      .insert({
        name: body.name.trim(),
        email: body.email.trim(),
        company: body.company.trim(),
        city: body.city.trim(),
        phone: body.phone?.trim() || null,
        locale: body.locale.trim(),
        message: body.message.trim(),
        user_agent: userAgent,
        ip_hash: ipHash,
      });

    if (dbError) {
      console.error('Database insertion error:', {
        code: dbError.code,
        message: dbError.message,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json(
        {
          ok: false,
          error: 'internal_error',
          message: 'Failed to save contact request'
        },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json(
      {
        ok: true,
        message: 'Contact request received successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    // Log error for debugging
    console.error('Contact form error:', error);

    // Return generic error (don't expose internals)
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message: 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Reject other HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'method_not_allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { ok: false, error: 'method_not_allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { ok: false, error: 'method_not_allowed' },
    { status: 405 }
  );
}

