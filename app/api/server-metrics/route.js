import { NextResponse } from 'next/server';

// Configure this to point to your server
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3030';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const interfaceName = searchParams.get('interface') || '';
    
    // Fetch data from your server.js
    const response = await fetch(`${SERVER_URL}/api/metrics?interface=${encodeURIComponent(interfaceName)}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform the data to match your NetworkMetricsContext expected format
    const transformedData = {
      avgPacketLoss: data.packetLoss || 0,
      avgLatency: data.latency || 0,
      internetSpeed: {
        download: data.downloadSpeed || 0,
        upload: data.uploadSpeed || 0
      },
      packetLossHistory: formatHistoryData(data.packetLossHistory || []),
      latencyHistory: formatHistoryData(data.latencyHistory || []),
      speedHistory: formatSpeedHistoryData(data.speedHistory || []),
      source: 'server.js',
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error fetching server metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics from server', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to format history data
function formatHistoryData(data) {
  if (!Array.isArray(data)) return [];
  
  return data.map(item => ({
    timestamp: item.timestamp || new Date().toISOString(),
    value: parseFloat(item.value || 0)
  }));
}

// Helper function to format speed history data
function formatSpeedHistoryData(data) {
  if (!Array.isArray(data)) return [];
  
  return data.map(item => ({
    timestamp: item.timestamp || new Date().toISOString(),
    download: parseFloat(item.download || 0),
    upload: parseFloat(item.upload || 0)
  }));
}