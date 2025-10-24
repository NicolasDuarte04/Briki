/**
 * API Route: /api/workspace/recents
 * 
 * Returns recent policies and proposals for command palette
 */

import { NextResponse } from "next/server";
import { getRecentPolicies, getRecentProposals } from "@/lib/data/workspace";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabase();

    // Get current user and org
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get org_id from user metadata
    const orgId = user.user_metadata?.org_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "User not associated with organization" },
        { status: 403 }
      );
    }

    // Fetch recents in parallel
    const [policies, proposals] = await Promise.all([
      getRecentPolicies(orgId),
      getRecentProposals(orgId),
    ]);

    return NextResponse.json({
      policies: policies.slice(0, 5), // Limit to 5 each
      proposals: proposals.slice(0, 5),
    });
  } catch (error) {
    console.error("Error fetching recents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

