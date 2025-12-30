// /src/app/api/pins/toggle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { togglePin, type PinnableEntityType } from '@/lib/data/workspace';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/pins/toggle
 * 
 * Toggles a pin for an entity (case, client, or policy)
 * 
 * Request body:
 * {
 *   entityId: string;
 *   entityType: 'case' | 'client' | 'policy';
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   isPinned: boolean;
 *   error?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. Parse request body
    const body = await request.json();
    const { entityId, entityType } = body as {
      entityId?: string;
      entityType?: string;
    };
    
    // 3. Validate required fields
    if (!entityId || typeof entityId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'entityId is required' },
        { status: 400 }
      );
    }
    
    if (!entityType || !['case', 'client', 'policy'].includes(entityType)) {
      return NextResponse.json(
        { success: false, error: 'entityType must be "case", "client", or "policy"' },
        { status: 400 }
      );
    }
    
    // 4. Toggle the pin
    const result = await togglePin(
      user.id,
      entityId,
      entityType as PinnableEntityType
    );
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Error toggling pin' },
        { status: 400 }
      );
    }
    
    // 5. Revalidate dashboard to show updated pins
    revalidatePath('/[locale]/dashboard', 'page');
    
    // 6. Return success response
    return NextResponse.json({
      success: true,
      isPinned: result.isPinned,
    });
    
  } catch (error) {
    console.error('[API /pins/toggle] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

