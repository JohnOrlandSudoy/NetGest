import { NextResponse } from 'next/server';

/**
 * Fallback metrics API endpoint
 * Provides simulated network metrics when the main endpoint is unavailable
 */
export async function GET(request) {
  // Get interface from query params
  const { searchParams } = new URL(request.url);
  const interfaceName = searchParams.get('interface') || 'unknown';
  
  // Generate realistic fallback metrics
  const fallbackMetrics = {
    latency: Math.floor(Math.random() * 60) + 20, // 20-80ms
    packetLoss: parseFloat((Math.random() * 2).toFixed(2)), // 0-2%
    download: Math.floor(Math.random() * 50) + 20, // 20-70 Mbps
    upload: Math.floor(Math.random() * 20) + 5, // 5-25 Mbps
    timestamp: new Date().toISOString(),
    interface: interfaceName,
    source: 'fallback-api'
  };
  
  // Add some variation based on interface name for consistency
  if (interfaceName.includes('eth')) {
    // Ethernet interfaces typically have better metrics
    fallbackMetrics.latency = Math.floor(Math.random() * 30) + 10; // 10-40ms
    fallbackMetrics.packetLoss = parseFloat((Math.random() * 0.5).toFixed(2)); // 0-0.5%
    fallbackMetrics.download = Math.floor(Math.random() * 100) + 50; // 50-150 Mbps
    fallbackMetrics.upload = Math.floor(Math.random() * 50) + 20; // 20-70 Mbps
  } else if (interfaceName.includes('wlan')) {
    // WiFi interfaces typically have worse metrics
    fallbackMetrics.latency = Math.floor(Math.random() * 50) + 30; // 30-80ms
    fallbackMetrics.packetLoss = parseFloat((Math.random() * 1.5 + 0.5).toFixed(2)); // 0.5-2%
    fallbackMetrics.download = Math.floor(Math.random() * 40) + 20; // 20-60 Mbps
    fallbackMetrics.upload = Math.floor(Math.random() * 15) + 5; // 5-20 Mbps
  }
  
  // Return fallback metrics
  return NextResponse.json(fallbackMetrics);
}