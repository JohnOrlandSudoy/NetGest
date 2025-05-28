import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const interfaceName = searchParams.get('interface');
    const action = searchParams.get('action');

    if (!interfaceName) {
      return NextResponse.json(
        { error: 'Interface parameter is required' },
        { status: 400 }
      );
    }

    // Decode the interface name
    const decodedInterface = decodeURIComponent(interfaceName);

    // Handle different actions
    switch (action) {
      case 'start':
        // Start monitoring logic here
        return NextResponse.json({ 
          status: 'success',
          message: 'Monitoring started',
          interface: decodedInterface
        });

      case 'stop':
        // Stop monitoring logic here
        return NextResponse.json({ 
          status: 'success',
          message: 'Monitoring stopped',
          interface: decodedInterface
        });

      default:
        // Get current metrics
        return NextResponse.json({
          status: 'success',
          metrics: {
            latency: Math.random() * 100,
            packetLoss: Math.random() * 5,
            downloadSpeed: Math.random() * 100,
            uploadSpeed: Math.random() * 50
          }
        });
    }
  } catch (error) {
    console.error('Error in network monitoring API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 