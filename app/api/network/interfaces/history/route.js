import { NextResponse } from 'next/server';
import { saveNetworkInterfaceHistory, getNetworkInterfaceHistory } from '@/services/supabaseService';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.interfaceName) {
      return NextResponse.json(
        { error: 'Interface name is required' },
        { status: 400 }
      );
    }
    
    // Save to Supabase
    const result = await saveNetworkInterfaceHistory(data);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result
    });
  } catch (error) {
    console.error('Error saving network interface history:', error);
    return NextResponse.json(
      { error: 'Failed to save network interface history' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const interfaceName = searchParams.get('interface');
    const days = parseInt(searchParams.get('days') || '30', 10);
    
    // Get history from Supabase
    const history = await getNetworkInterfaceHistory(interfaceName, days);
    
    // If we have history, return it
    if (history && history.length > 0) {
      return NextResponse.json({
        history,
        count: history.length,
        timestamp: new Date().toISOString(),
        source: 'supabase'
      });
    }
    
    // Otherwise, generate mock history
    const mockHistory = generateMockInterfaceHistory(interfaceName, days);
    
    return NextResponse.json({
      history: mockHistory,
      count: mockHistory.length,
      timestamp: new Date().toISOString(),
      source: 'mock'
    });
  } catch (error) {
    console.error('Error getting network interface history:', error);
    
    // Return mock history on error
    const interfaceName = new URL(request.url).searchParams.get('interface');
    const days = parseInt(new URL(request.url).searchParams.get('days') || '30', 10);
    const mockHistory = generateMockInterfaceHistory(interfaceName, days);
    
    return NextResponse.json({
      history: mockHistory,
      count: mockHistory.length,
      timestamp: new Date().toISOString(),
      source: 'mock',
      error: error.message
    });
  }
}

// Function to generate mock interface history
function generateMockInterfaceHistory(interfaceName = 'eth0', days = 30) {
  const history = [];
  const now = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Create multiple entries per day
    for (let j = 0; j < 24; j += 3) { // Every 3 hours
      const timestamp = new Date(date);
      timestamp.setHours(j, 0, 0, 0);
      
      // Base values that will be modified consistently
      const baseRxBytes = 1000000 + (i * 100000);
      const baseTxBytes = 500000 + (i * 50000);
      
      // Use sine waves to create realistic patterns
      const hourOfDay = timestamp.getHours();
      const timeOfDayFactor = Math.sin((hourOfDay - 6) * Math.PI / 12); // Peaks at 6pm
      
      history.push({
        id: `mock-${i}-${j}`,
        interface_name: interfaceName,
        status: 'up',
        ip_address: interfaceName === 'lo' ? '127.0.0.1' : `192.168.1.${100 + (i % 10)}`,
        mac_address: interfaceName === 'lo' ? '00:00:00:00:00:00' : `00:1A:2B:3C:4D:${5 + (i % 10)}E`,
        tx_bytes: Math.floor(baseTxBytes * (1 + 0.5 * timeOfDayFactor)),
        rx_bytes: Math.floor(baseRxBytes * (1 + 0.3 * timeOfDayFactor)),
        tx_packets: Math.floor((baseTxBytes / 1000) * (1 + 0.5 * timeOfDayFactor)),
        rx_packets: Math.floor((baseRxBytes / 1000) * (1 + 0.3 * timeOfDayFactor)),
        timestamp: timestamp.toISOString(),
        user_id: 'mock-user-id',
        created_at: timestamp.toISOString()
      });
    }
  }
  
  // Sort by timestamp (newest first)
  return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}