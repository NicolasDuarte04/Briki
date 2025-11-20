import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptProfileName } from '@/lib/helpers/profileEncryption';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * GET /api/profile/name
 * 
 * Obtiene el nombre del perfil del usuario autenticado (desencriptado).
 * 
 * @returns { name: string | null }
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ name: null }, { status: 200 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { name: true },
    });

    if (!profile || !profile.name) {
      return NextResponse.json({ name: null }, { status: 200 });
    }

    // Desencriptar el nombre
    const decryptedName = await decryptProfileName(profile.name);

    return NextResponse.json({ name: decryptedName }, { status: 200 });
  } catch (error) {
    console.error('Error fetching profile name:', error);
    return NextResponse.json({ name: null }, { status: 200 });
  }
}

