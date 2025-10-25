import { NextRequest, NextResponse } from 'next/server';
import { getAgentsWithMonitoringData, getMonitoringDataBySource } from '@/lib/monitoring';
import { getCachedData, generateCacheKey } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseFloat(searchParams.get('hours') || '24');
    const sourceIp = searchParams.get('source_ip');

    if (sourceIp) {
      // Get monitoring data for a specific source IP (cache disabled temporarily)
      const monitoringData = await getMonitoringDataBySource(sourceIp, hours);
      return NextResponse.json({ monitoringData });
    } else {
      // Get all agents with their monitoring data (cache disabled temporarily)
      const agents = await getAgentsWithMonitoringData(hours);
      return NextResponse.json({ agents });
    }
  } catch (error) {
    console.error('Error fetching agents monitoring data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
