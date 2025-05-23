import { NextResponse } from 'next/server';

// Mock data for demonstration - replace with your actual data source
const generateMockSummaries = () => {
  const today = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    return {
      date: dateStr,
      avgLatency: Math.round(Math.random() * 80 + 20), // 20-100ms
      avgPacketLoss: parseFloat((Math.random() * 3).toFixed(2)), // 0-3%
      avgSpeed: Math.round(Math.random() * 90 + 10), // 10-100 Mbps
      criticalEvents: Math.floor(Math.random() * 5), // 0-4 events
      packetCount: Math.floor(Math.random() * 10000 + 5000) // 5000-15000 packets
    };
  });
};

export async function GET() {
  try {
    // Generate mock data
    const data = generateMockSummaries();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching daily summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily summaries' },
      { status: 500 }
    );
  }
}
