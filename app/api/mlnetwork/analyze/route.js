import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const latency = parseFloat(searchParams.get('latency_ms') || '0');
    const packetLoss = parseFloat(searchParams.get('packet_loss_pct') || '0');
    const utilization = parseFloat(searchParams.get('utilization_ratio') || '0');

    // Generate recommendations based on input parameters
    const recommendations = generateRecommendations(latency, packetLoss, utilization);
    
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

// Generate mock recommendation data
function generateRecommendations(latency, packetLoss, utilization) {
  // Determine network condition categories
  const latencyCategory = latency < 30 ? "Low" : latency < 80 ? "Normal" : "High";
  const packetLossCategory = packetLoss < 1 ? "Low" : packetLoss < 3 ? "Normal" : "High";
  const utilizationCategory = utilization < 0.3 ? "Low" : utilization < 0.7 ? "Normal" : "High";
  
  // Generate rule-based recommendation
  let ruleBased = "";
  if (latencyCategory === "High") {
    ruleBased += "Your network latency is high. Consider reducing the number of devices on your network or checking for bandwidth-heavy applications.\n\n";
  }
  if (packetLossCategory === "High") {
    ruleBased += "High packet loss detected. This may indicate network congestion or hardware issues. Check your router and cables for potential problems.\n\n";
  }
  if (utilizationCategory === "High") {
    ruleBased += "Your network utilization is high. Consider upgrading your internet plan or distributing usage across different times of day.\n\n";
  }
  
  if (ruleBased === "") {
    ruleBased = "Your network appears to be performing well. No immediate actions needed.";
  }
  
  // Generate content-based recommendation
  let contentBased = "";
  if (latencyCategory === "High" && packetLossCategory === "High") {
    contentBased = "Based on historical patterns, your network is showing signs of congestion. Try restarting your router and limiting streaming services during peak usage times.";
  } else if (latencyCategory === "High") {
    contentBased = "Your latency patterns match those typically seen with distance-related delays. Consider using a wired connection instead of Wi-Fi for latency-sensitive applications.";
  } else if (packetLossCategory === "High") {
    contentBased = "Your packet loss pattern suggests possible interference. Try changing your Wi-Fi channel or moving your router away from electronic devices.";
  } else {
    contentBased = "Based on similar network profiles, your current setup is performing within expected parameters for your connection type.";
  }
  
  return {
    raw_metrics: {
      latency_ms: latency,
      packet_loss_percent: packetLoss,
      utilization_ratio: utilization
    },
    prediction: {
      latency: latencyCategory,
      packet_loss: packetLossCategory,
      utilization: utilizationCategory
    },
    recommendations: {
      rule_based: ruleBased,
      content_based: contentBased
    },
    timestamp: new Date().toISOString()
  };
}