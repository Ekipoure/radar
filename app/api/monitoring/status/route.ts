import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import monitoringManager from '@/lib/monitoring-manager';

export async function GET(request: NextRequest) {
  try {
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    // Initialize monitoring manager if not already done
    if (!monitoringManager.getStatus().isRunning) {
      try {
        await monitoringManager.initialize();
      } catch (error) {
        console.error('Failed to initialize monitoring manager:', error);
        // Continue with current status even if initialization fails
      }
    }

    const status = monitoringManager.getStatus();
    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error getting monitoring status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    const { action } = await request.json();

    if (action === 'start') {
      monitoringManager.start();
      return NextResponse.json({ message: 'Monitoring started' });
    } else if (action === 'stop') {
      monitoringManager.stop();
      return NextResponse.json({ message: 'Monitoring stopped' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error controlling monitoring:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
