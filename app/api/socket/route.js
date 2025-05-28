import { NextResponse } from 'next/server';

// Last metrics by interface
const lastMetrics = new Map();

// Update timestamp to track when metrics were last updated
let lastUpdateTime = Date.now();

// Helper function to get real network metrics
async function getRealNetworkMetrics(interfaceName = '') {
  try {
    // Make a request to our metrics API
    const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/network/metrics?real=true&interface=${interfaceName}`, {
      cache: 'no-store',
      headers: {
        'x-internal-request': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch metrics');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting real network metrics:', error);
    
    // Return fallback values
    return {
      latency: Math.floor(Math.random() * 60) + 20, // 20-80ms
      packetLoss: parseFloat((Math.random() * 2).toFixed(2)), // 0-2%
      download: Math.floor(Math.random() * 50) + 20, // 20-70 Mbps
      upload: Math.floor(Math.random() * 20) + 5, // 5-25 Mbps
      timestamp: new Date().toISOString(),
      source: 'socket-fallback'
    };
  }
}

/**
 * Simple polling endpoint for network metrics
 * Clients can poll this endpoint to get the latest metrics
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const interfaceName = searchParams.get('interface') || 'default';
    const lastPoll = parseInt(searchParams.get('lastPoll') || '0', 10);
    
    // Check if we need to update metrics (every 2 seconds)
    const currentTime = Date.now();
    if (currentTime - lastUpdateTime > 2000) {
      // Get real network metrics
      const metrics = await getRealNetworkMetrics(interfaceName);
      
      // Store metrics by interface
      lastMetrics.set(interfaceName, {
        ...metrics,
        timestamp: currentTime
      });
      
      lastUpdateTime = currentTime;
    }
    
    // Get metrics for the requested interface
    const metrics = lastMetrics.get(interfaceName) || await getRealNetworkMetrics(interfaceName);
    
    // Check if metrics have been updated since last poll
    if (lastPoll >= metrics.timestamp) {
      // No new data, return 304 Not Modified
      return new NextResponse(null, { status: 304 });
    }
    
    // Return the metrics with cache control headers
    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in socket polling endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to get network metrics' },
      { status: 500 }
    );
  }
}



