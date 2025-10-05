import { NextResponse } from "next/server";

// TODO: Replace this route with a Supabase-aware implementation before enabling onboarding mutations.
export async function POST() {
  return NextResponse.json(
    { error: "NextAuth helpers were removed. Implement Supabase auth before re-enabling this endpoint." },
    { status: 501 }
  );
}
