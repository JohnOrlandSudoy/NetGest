import { NextResponse } from 'next/server';

// Generate mock packet data
const generateMockPackets = (count = 100) => {
  return Array.from({ length: count }, (_, i) => {
    const now = new Date();
    const timestamp = new Date(now.getTime() - i * 1000); // 1 second intervals
    
    return {
      id: i + 1,
      timestamp: timestamp.toISOString(),
      source_ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      destination_ip: `10.0.0.${Math.floor(Math.random() * 254) + 1}`,
      protocol: ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)],
      length: Math.floor(Math.random() * 1500) + 64,
      packet_loss: (Math.random() * 2).toFixed(2),
      latency: (Math.random() * 100 + 20).toFixed(1),
      info: 'Sample packet data'
    };
  });
};

export async function GET() {
  try {
    // Generate random number of packets between 50-150
    const packetCount = Math.floor(Math.random() * 100) + 50;
    const packets = generateMockPackets(packetCount);
    
    // Simulate a small delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return NextResponse.json({
      success: true,
      data: packets
    });
  } catch (error) {
    console.error('Error fetching recent packets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent packets' },
      { status: 500 }
    );
  }
}