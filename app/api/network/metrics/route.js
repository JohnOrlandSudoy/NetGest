import { NextResponse } from 'next/server';

// Cache for metrics by interface
const metricsCache = new Map();

/**
 * Generate realistic network metrics
 * @param {string} interfaceName - Network interface name
 * @returns {Object} Network metrics
 */
function generateNetworkMetrics(interfaceName) {
  // Get previous metrics if available
  const prevMetrics = metricsCache.get(interfaceName) || {
    latency: 30,
    packetLoss: 0.5,
    download: 50,
    upload: 20
  };
  
  // Add some random variation to make it look realistic
  const latency = Math.max(5, prevMetrics.latency + (Math.random() * 10 - 5));
  const packetLoss = Math.max(0, Math.min(5, prevMetrics.packetLoss + (Math.random() * 0.4 - 0.2)));
  const download = Math.max(10, prevMetrics.download + (Math.random() * 8 - 4));
  const upload = Math.max(5, prevMetrics.upload + (Math.random() * 4 - 2));
  
  // Create metrics object
  const metrics = {
    latency,
    packetLoss,
    download,
    upload,
    timestamp: Date.now(),
    interface: interfaceName
  };
  
  // Cache metrics
  metricsCache.set(interfaceName, metrics);
  
  return metrics;
}

/**
 * API route for network metrics
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const interfaceName = searchParams.get('interface') || 'default';
    const since = parseInt(searchParams.get('since') || '0', 10);
    
    // Generate metrics
    const metrics = generateNetworkMetrics(interfaceName);
    
    // Check if metrics have been updated since 'since'
    if (since >= metrics.timestamp) {
      return new NextResponse(null, { status: 304 });
    }
    
    // Return metrics
    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in network metrics API:', error);
    return NextResponse.json(
      { error: 'Failed to get network metrics' },
      { status: 500 }
    );
  }
}

