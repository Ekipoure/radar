import { NextRequest, NextResponse } from 'next/server';
import performanceMonitor from '@/lib/performance';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }
    const metrics = performanceMonitor.getAllMetrics();
    
    // Calculate average response times
    const avgResponseTime = metrics.length > 0 
      ? metrics.reduce((sum, metric) => sum + (metric.duration || 0), 0) / metrics.length 
      : 0;

    // Get the slowest operations
    const slowestOperations = metrics
      .filter(metric => metric.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);

    return NextResponse.json({
      totalMetrics: metrics.length,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      slowestOperations,
      allMetrics: metrics
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }
    performanceMonitor.clear();
    return NextResponse.json({ message: 'Performance metrics cleared' });
  } catch (error) {
    console.error('Error clearing performance metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
