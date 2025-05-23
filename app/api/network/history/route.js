import { NextResponse } from 'next/server';
import { getNetworkMetricsHistory } from '@/services/supabaseService';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const interfaceName = searchParams.get('interface') || 'eth0';
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    
    // Try to get real historical data from Supabase
    const supabaseHistory = await getNetworkMetricsHistory(interfaceName, hours);
    
    // If we have Supabase data, return it
    if (supabaseHistory && 
        supabaseHistory.packetLoss.length > 0 && 
        supabaseHistory.latency.length > 0 && 
        supabaseHistory.speed.length > 0) {
      return NextResponse.json(supabaseHistory);
    }
    
    // Otherwise, generate consistent historical data based on interface name
    const history = generateConsistentHistory(interfaceName, hours);
    
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error getting network history:', error);
    return NextResponse.json(
      { error: 'Failed to get network history' },
      { status: 500 }
    );
  }
}

// Function to generate consistent historical data based on interface name
function generateConsistentHistory(interfaceName, hours = 24) {
  // Create a hash from the interface name for consistent pseudo-random values
  const interfaceHash = interfaceName.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const now = new Date();
  const history = {
    packetLoss: [],
    latency: [],
    speed: []
  };
  
  // Base values that will be modified consistently
  const basePacketLoss = 0.5 + (interfaceHash % 10) / 10; // 0.5-1.5%
  const baseLatency = 30 + (interfaceHash % 40); // 30-70ms
  const baseSpeed = 20 + (interfaceHash % 80); // 20-100 Mbps
  
  // Generate data points for each hour
  for (let i = 0; i < hours; i++) {
    const time = new Date(now);
    time.setHours(time.getHours() - (hours - 1 - i));
    
    // Use sine waves with different frequencies to create realistic patterns
    const hourOfDay = time.getHours();
    
    // Network usage typically peaks during working hours and evenings
    const timeOfDayFactor = Math.sin((hourOfDay - 6) * Math.PI / 12); // Peaks at 6pm
    
    // Add the data points with consistent variations
    history.packetLoss.push({
      timestamp: time.toISOString(),
      value: Math.max(0, basePacketLoss * (1 + 0.5 * timeOfDayFactor))
    });
    
    history.latency.push({
      timestamp: time.toISOString(),
      value: Math.max(10, baseLatency * (1 + 0.3 * timeOfDayFactor))
    });
    
    history.speed.push({
      timestamp: time.toISOString(),
      value: Math.max(5, baseSpeed * (1 - 0.2 * timeOfDayFactor))
    });
  }
  
  return history;
}


