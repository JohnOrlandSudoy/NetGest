import { NextResponse } from 'next/server';

// Function to generate consistent fallback data
function generateFallbackData() {
  const now = new Date();
  const hours = 24;
  
  // Create history arrays
  const packetLossHistory = [];
  const latencyHistory = [];
  const speedHistory = [];
  
  // Generate data points for each hour with consistent patterns
  for (let i = 0; i < hours; i++) {
    const time = new Date(now);
    time.setHours(time.getHours() - (hours - 1 - i));
    
    // Create consistent patterns based on time of day
    const hourOfDay = time.getHours();
    const dayFactor = Math.sin((hourOfDay - 12) * Math.PI / 12); // Peaks at noon
    
    packetLossHistory.push({
      timestamp: time.toISOString(),
      value: 1 + Math.abs(dayFactor) * 0.5 // 1-1.5%
    });
    
    latencyHistory.push({
      timestamp: time.toISOString(),
      value: 50 + Math.abs(dayFactor) * 20 // 50-70ms
    });
    
    speedHistory.push({
      timestamp: time.toISOString(),
      value: 25 - Math.abs(dayFactor) * 10 // 15-25 Mbps
    });
  }
  
  return {
    metrics: {
      latency: 55,
      packetLoss: 1.2,
      download: 22.5,
      upload: 8.7
    },
    history: {
      packetLoss: packetLossHistory,
      latency: latencyHistory,
      speed: speedHistory
    }
  };
}

export async function GET() {
  try {
    // Generate consistent fallback data
    const fallbackData = generateFallbackData();
    
    return NextResponse.json(fallbackData);
  } catch (error) {
    console.error('Error generating fallback data:', error);
    return NextResponse.json(
      { error: 'Failed to generate fallback data' },
      { status: 500 }
    );
  }
}