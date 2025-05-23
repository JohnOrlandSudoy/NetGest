import { NextResponse } from 'next/server';
import { format, subHours } from 'date-fns';

// Generate unique patterns for different metrics
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || 'latency';
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    
    // Generate data based on the requested metric
    const data = generateMetricHistory(metric, hours);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating metric history:', error);
    return NextResponse.json(
      { error: 'Failed to generate metric history' },
      { status: 500 }
    );
  }
}

/**
 * Generate unique history data for different metrics
 * @param {string} metric - The metric to generate data for
 * @param {number} hours - Number of hours of history to generate
 * @returns {Array} Array of data points
 */
function generateMetricHistory(metric, hours) {
  const now = new Date();
  const data = [];
  
  // Define base patterns for each metric type
  const patterns = {
    packet_loss: {
      baseline: 1,
      amplitude: 1.5,
      noiseLevel: 0.3,
      peakHour: 18, // 6 PM peak
      pattern: 'sine'
    },
    latency: {
      baseline: 40,
      amplitude: 30,
      noiseLevel: 10,
      peakHour: 20, // 8 PM peak
      pattern: 'sine'
    },
    download_speed: {
      baseline: 50,
      amplitude: 40,
      noiseLevel: 15,
      peakHour: 22, // 10 PM peak (lower at peak usage)
      pattern: 'cosine' // Inverse pattern (lower at peak times)
    },
    upload_speed: {
      baseline: 15,
      amplitude: 10,
      noiseLevel: 5,
      peakHour: 14, // 2 PM peak (lower at peak usage)
      pattern: 'cosine' // Inverse pattern (lower at peak times)
    }
  };
  
  // Use default pattern if metric not found
  const patternConfig = patterns[metric] || patterns.latency;
  
  // Generate data points for each hour
  for (let i = 0; i < hours; i++) {
    const time = new Date(now);
    time.setHours(time.getHours() - (hours - 1 - i));
    
    // Create value based on time of day pattern
    const hourOfDay = time.getHours();
    const hourDiff = (hourOfDay - patternConfig.peakHour + 24) % 24;
    const normalizedHourDiff = hourDiff / 12; // Convert to 0-2 range
    
    let patternValue;
    if (patternConfig.pattern === 'sine') {
      // Sine pattern peaks at the peak hour
      patternValue = Math.sin(normalizedHourDiff * Math.PI);
    } else {
      // Cosine pattern is lowest at the peak hour (for bandwidth metrics)
      patternValue = Math.cos(normalizedHourDiff * Math.PI);
    }
    
    // Add some randomness
    const noise = (Math.random() - 0.5) * patternConfig.noiseLevel;
    
    // Calculate final value
    let value = patternConfig.baseline + patternValue * patternConfig.amplitude + noise;
    
    // Ensure non-negative values
    value = Math.max(0, value);
    
    // For packet loss, cap at reasonable maximum
    if (metric === 'packet_loss') {
      value = Math.min(value, 5);
    }
    
    data.push({
      time: time.toISOString(),
      value: parseFloat(value.toFixed(2))
    });
  }
  
  return data;
}