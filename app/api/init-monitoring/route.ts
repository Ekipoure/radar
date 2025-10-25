import { NextRequest, NextResponse } from 'next/server';
import monitoringManager from '@/lib/monitoring-manager';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Initializing monitoring service...');
    
    // Initialize the monitoring manager
    await monitoringManager.initialize();
    
    const status = monitoringManager.getStatus();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Monitoring service initialized (DISABLED - No server requests)',
      status: { ...status, isRunning: false, disabled: true }
    });
  } catch (error) {
    console.error('❌ Failed to initialize monitoring service:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize monitoring service',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
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



