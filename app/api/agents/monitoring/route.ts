import { NextRequest, NextResponse } from 'next/server';
import { 
  getAgentsWithMonitoringData, 
  getMonitoringDataBySource,
  getMonitoringDataBySourceWithDateRange,
  getAgentsWithMonitoringDataByDateRange
} from '@/lib/monitoring';
import { getCachedData, generateCacheKey } from '@/lib/cache';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseFloat(searchParams.get('hours') || '6');
    const sourceIp = searchParams.get('source_ip');
    
    // New date/time filter parameters
    const startDateTime = searchParams.get('start_datetime');
    const endDateTime = searchParams.get('end_datetime');

    if (sourceIp) {
      // Get monitoring data for a specific source IP
      let monitoringData;
      if (startDateTime && endDateTime) {
        // Use specific date/time range
        monitoringData = await getMonitoringDataBySourceWithDateRange(sourceIp, startDateTime, endDateTime);
      } else {
        // Use hours-based range
        monitoringData = await getMonitoringDataBySource(sourceIp, hours);
      }
      return NextResponse.json({ monitoringData });
    } else {
      // Get all agents with their monitoring data
      let agents;
      if (startDateTime && endDateTime) {
        // Use specific date/time range
        agents = await getAgentsWithMonitoringDataByDateRange(startDateTime, endDateTime);
      } else {
        // Use hours-based range
        agents = await getAgentsWithMonitoringData(hours);
      }
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
