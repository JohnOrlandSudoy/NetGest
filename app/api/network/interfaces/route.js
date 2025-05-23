import { NextResponse } from 'next/server';
import { getNetworkInterfaces } from '@/services/networkMetricsService';

/**
 * API endpoint to get network interfaces
 * In a real implementation, this would use server-side code to access
 * actual network interfaces on the server
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    
    // Get network interfaces
    const interfaces = await getNetworkInterfaces(detailed);
    
    // If we have interfaces, return them
    if (interfaces && interfaces.length > 0) {
      return NextResponse.json({
        interfaces,
        timestamp: new Date().toISOString(),
        source: 'system'
      });
    }
    
    // Otherwise, generate mock interfaces
    const mockInterfaces = generateMockInterfaces();
    
    return NextResponse.json({
      interfaces: mockInterfaces,
      timestamp: new Date().toISOString(),
      source: 'mock'
    });
  } catch (error) {
    console.error('Error getting network interfaces:', error);
    
    // Return mock interfaces on error
    const mockInterfaces = generateMockInterfaces();
    
    return NextResponse.json({
      interfaces: mockInterfaces,
      timestamp: new Date().toISOString(),
      source: 'mock',
      error: error.message
    });
  }
}

// Function to generate mock interfaces
function generateMockInterfaces() {
  return [
    {
      name: 'eth0',
      status: 'up',
      ipAddress: '192.168.1.100',
      macAddress: '00:1A:2B:3C:4D:5E',
      txBytes: Math.floor(Math.random() * 1000000000),
      rxBytes: Math.floor(Math.random() * 1000000000),
      txPackets: Math.floor(Math.random() * 1000000),
      rxPackets: Math.floor(Math.random() * 1000000)
    },
    {
      name: 'wlan0',
      status: 'up',
      ipAddress: '192.168.1.101',
      macAddress: '00:1A:2B:3C:4D:5F',
      txBytes: Math.floor(Math.random() * 1000000000),
      rxBytes: Math.floor(Math.random() * 1000000000),
      txPackets: Math.floor(Math.random() * 1000000),
      rxPackets: Math.floor(Math.random() * 1000000)
    },
    {
      name: 'lo',
      status: 'up',
      ipAddress: '127.0.0.1',
      macAddress: '00:00:00:00:00:00',
      txBytes: Math.floor(Math.random() * 1000000),
      rxBytes: Math.floor(Math.random() * 1000000),
      txPackets: Math.floor(Math.random() * 10000),
      rxPackets: Math.floor(Math.random() * 10000)
    }
  ];
}

