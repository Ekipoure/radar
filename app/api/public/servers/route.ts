import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { ServerWithStatus } from '@/lib/types';
import { getServersWithAdvancedStatus } from '@/lib/monitoring';

// Force dynamic rendering - prevent static optimization in production build
// This ensures that new servers/agents appear immediately without requiring a rebuild
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Use the new advanced status logic that requires ALL requests to fail
    const servers: ServerWithStatus[] = await getServersWithAdvancedStatus();
    return NextResponse.json({ servers });
  } catch (error) {
    console.error('Error fetching servers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
