"use client";

import Authenticated from "@/components/layouts/Authenticated";
import { useState, useEffect, useContext, useCallback } from "react";
import { NetworkMetricsContext } from "@/context/NetworkMetricsProvider";
import { FaWifi, FaWifiSlash, FaSync } from "react-icons/fa";

function Recommendations() {
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState('Normal');
  const [videoStatus, setVideoStatus] = useState('Normal');
  const [isClientOnline, setIsClientOnline] = useState(true);

  // Get network metrics from context
  const { 
    avgPacketLoss, 
    avgLatency, 
    internetSpeed, 
    selectedInterface,
    isOnline,
    refreshMetrics,
    nginxTraffic
  } = useContext(NetworkMetricsContext) || {};

  // Check online status on client side
  useEffect(() => {
    // Set initial online status
    setIsClientOnline(navigator.onLine);
    
    // Add event listeners for online/offline events
    const handleOnline = () => {
      setIsClientOnline(true);
      // Refresh metrics when coming back online
      if (refreshMetrics) {
        refreshMetrics();
        // Wait a bit for metrics to update before generating recommendations
        setTimeout(fetchRecommendations, 1000);
      }
    };
    
    const handleOffline = () => {
      setIsClientOnline(false);
      setError("You are currently offline. Network recommendations are not available.");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshMetrics]);

  // Function to fetch recommendations based on real metrics
  const fetchRecommendations = useCallback(() => {
    const currentTime = new Date();
    
    setLoading(true);
    setError(null);
    
    // Check if we're online using both context and browser API
    const networkIsOnline = isOnline !== false && isClientOnline;
    
    if (!networkIsOnline) {
      setError("Network is offline. Please check your connection.");
      setNetworkData(null);
      setLoading(false);
      return;
    }
    
    try {
      // Use real metrics from context
      const latency = avgLatency || 0;
      const packetLoss = avgPacketLoss || 0;
      const downloadSpeed = internetSpeed?.download || 0;
      const uploadSpeed = internetSpeed?.upload || 0;
      
      // If all metrics are 0, we might be offline or having connection issues
      if (latency === 0 && packetLoss === 0 && downloadSpeed === 0 && uploadSpeed === 0) {
        setError("Unable to retrieve network metrics. Please check your connection.");
        setNetworkData(null);
        setLoading(false);
        return;
      }
      
      // Calculate network utilization (assuming 100Mbps connection)
      const estimatedMaxBandwidth = 100; // 100 Mbps - adjust this to match your network capacity
      const utilization = downloadSpeed / estimatedMaxBandwidth;
      
      // Ensure utilization is between 0 and 1
      const normalizedUtilization = Math.min(Math.max(utilization, 0), 1);

      // Determine voice and video status based on real metrics
      const newVoiceStatus = determineVoiceStatus(latency, packetLoss, normalizedUtilization);
      const newVideoStatus = determineVideoStatus(latency, packetLoss, normalizedUtilization);
      
      setVoiceStatus(newVoiceStatus);
      setVideoStatus(newVideoStatus);

      // Generate recommendations based on real metrics
      const recommendations = generateRecommendations(latency, packetLoss, normalizedUtilization, downloadSpeed, uploadSpeed);
      
      setNetworkData({
        raw_metrics: {
          latency_ms: latency,
          packet_loss_percent: packetLoss,
          utilization_ratio: normalizedUtilization,
          download_speed: downloadSpeed,
          upload_speed: uploadSpeed
        },
        prediction: {
          latency: latency < 30 ? "Low" : latency < 80 ? "Normal" : "High",
          packet_loss: packetLoss < 1 ? "Low" : packetLoss < 3 ? "Normal" : "High",
          utilization: normalizedUtilization < 0.3 ? "Low" : normalizedUtilization < 0.7 ? "Normal" : "High"
        },
        recommendations: recommendations,
        interface: selectedInterface || "Unknown",
        timestamp: currentTime.toISOString()
      });
      
      setLastUpdated(currentTime);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      setError("Error generating recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [avgLatency, avgPacketLoss, internetSpeed, isOnline, isClientOnline, selectedInterface]);

  // Determine voice traffic status based on network metrics
  const determineVoiceStatus = (latency, packetLoss, utilization) => {
    if (latency > 100 || packetLoss > 2 || utilization > 0.7) {
      return 'High';
    } else if (latency > 50 || packetLoss > 0.5 || utilization > 0.4) {
      return 'Normal';
    } else {
      return 'Low';
    }
  };

  // Determine video traffic status based on network metrics
  const determineVideoStatus = (latency, packetLoss, utilization) => {
    if (latency > 80 || packetLoss > 1 || utilization > 0.6) {
      return 'High';
    } else if (latency > 40 || packetLoss > 0.3 || utilization > 0.3) {
      return 'Normal';
    } else {
      return 'Low';
    }
  };

  // Get voice traffic message based on status
  const getVoiceTrafficMessage = (status) => {
    const voiceMessages = {
      'Low': "✅ VOICE TRAFFIC IS OPTIMAL. No congestion or quality risks. 🎧",
      'Normal': "🟢 Voice traffic is within normal range. No action required.",
      'High': "🚨 HIGH VOICE TRAFFIC DETECTED 🚨\n" +
              "🔍 Possible Causes:\n" +
              "  🔹 Peak call volume (e.g., conference calls) 📞\n" +
              "  🔹 Competing traffic (downloads/streams) starving QoS ⚖️\n" +
              "  🔹 Jitter > 30ms or packet loss degrading calls ⏱️\n\n" +
              "💡 Recommendations:\n" +
              "  🚀 Prioritize voice traffic (DSCP EF/46)\n" +
              "  📉 Throttle non-essential bandwidth (e.g., updates)\n" +
              "  🔄 Enable redundancy (e.g., SILK/Opus codecs)\n" +
              "  🛠️ Check router queues for VoIP packet drops"
    };
    return voiceMessages[status] || voiceMessages['Normal'];
  };

  // Get video traffic message based on status
  const getVideoTrafficMessage = (status) => {
    const videoMessages = {
      'Low': "✅ VIDEO TRAFFIC IS OPTIMAL. No quality or congestion issues. 🎥",
      'Normal': "🟢 Video traffic is within expected ratios. Quality maintained.",
      'High': "⚠️ HIGH VIDEO TRAFFIC DETECTED ⚠️\n" +
              "🔍 Possible Causes:\n" +
              "  🔹 4K/HD streaming or screen sharing 📺\n" +
              "  🔹 Retransmissions due to packet loss/jitter 🔄\n" +
              "  🔹 Wi-Fi interference or congested links 📶\n\n" +
              "💡 Recommendations:\n" +
              "  📉 Dynamically adjust resolution/bitrate\n" +
              "  🌐 Optimize multicast routing (for live streams)\n" +
              "  🛡️ Inspect for unauthorized P2P traffic\n" +
              "  🔧 Tag video packets as AF41/AF42 (DSCP)"
    };
    return videoMessages[status] || videoMessages['Normal'];
  };

  // Generate recommendations based on real metrics
  const generateRecommendations = (latency, packetLoss, utilization, downloadSpeed, uploadSpeed) => {
    // Determine network condition categories
    const latencyCategory = latency < 30 ? "Low" : latency < 80 ? "Normal" : "High";
    const packetLossCategory = packetLoss < 1 ? "Low" : packetLoss < 3 ? "Normal" : "High";
    const utilizationCategory = utilization < 0.3 ? "Low" : utilization < 0.7 ? "Normal" : "High";
    
    // Generate rule-based recommendation
    let ruleBased = "";
    
    // Latency recommendations
    if (latencyCategory === "High") {
      ruleBased += `Your network latency is high (${latency.toFixed(1)} ms). This may affect real-time applications like video calls and online gaming.\n\n`;
      ruleBased += "Recommendations:\n";
      ruleBased += "• Reduce the number of devices on your network\n";
      ruleBased += "• Check for bandwidth-heavy applications or downloads\n";
      ruleBased += "• Consider using a wired connection instead of Wi-Fi\n\n";
    }
    
    // Packet loss recommendations
    if (packetLossCategory === "High") {
      ruleBased += `High packet loss detected (${packetLoss.toFixed(1)}%). This may cause connection drops and poor quality.\n\n`;
      ruleBased += "Recommendations:\n";
      ruleBased += "• Check your router and cables for potential problems\n";
      ruleBased += "• Move closer to your Wi-Fi router or use a range extender\n";
      ruleBased += "• Reduce interference from other electronic devices\n\n";
    }
    
    // Utilization recommendations
    if (utilizationCategory === "High") {
      ruleBased += `Your network utilization is high (${(utilization * 100).toFixed(1)}%). This may cause congestion and slow speeds.\n\n`;
      ruleBased += "Recommendations:\n";
      ruleBased += "• Consider upgrading your internet plan\n";
      ruleBased += "• Distribute usage across different times of day\n";
      ruleBased += "• Implement QoS (Quality of Service) on your router\n\n";
    }
    
    // Speed recommendations
    if (downloadSpeed < 10) {
      ruleBased += `Your download speed is low (${downloadSpeed.toFixed(1)} Mbps). This may affect streaming and downloads.\n\n`;
      ruleBased += "Recommendations:\n";
      ruleBased += "• Check with your ISP for service issues\n";
      ruleBased += "• Consider upgrading your internet plan\n";
      ruleBased += "• Optimize your home network setup\n\n";
    }
    
    if (uploadSpeed < 5) {
      ruleBased += `Your upload speed is low (${uploadSpeed.toFixed(1)} Mbps). This may affect video calls and file sharing.\n\n`;
      ruleBased += "Recommendations:\n";
      ruleBased += "• Limit the number of devices uploading simultaneously\n";
      ruleBased += "• Consider a business internet plan with higher upload speeds\n";
      ruleBased += "• Schedule large uploads during off-peak hours\n\n";
    }
    
    if (ruleBased === "") {
      ruleBased = "Your network appears to be performing well. No immediate actions needed.";
    }
    
    // Generate content-based recommendation
    let contentBased = "";
    
    // Combined issues
    if (latencyCategory === "High" && packetLossCategory === "High") {
      contentBased = `Based on historical patterns for ${selectedInterface || 'your interface'}, your network is showing signs of congestion. Try restarting your router and limiting streaming services during peak usage times.`;
    } 
    // Latency issues
    else if (latencyCategory === "High") {
      contentBased = `Your latency patterns (${latency.toFixed(1)} ms) match those typically seen with distance-related delays. Consider using a wired connection instead of Wi-Fi for latency-sensitive applications.`;
    } 
    // Packet loss issues
    else if (packetLossCategory === "High") {
      contentBased = `Your packet loss pattern (${packetLoss.toFixed(1)}%) suggests possible interference. Try changing your Wi-Fi channel or moving your router away from electronic devices.`;
    } 
    // Speed issues
    else if (downloadSpeed < 10) {
      contentBased = `Your download speed (${downloadSpeed.toFixed(1)} Mbps) is below recommended levels for HD streaming. Consider upgrading your plan or checking for unauthorized users on your network.`;
    } 
    // Good performance
    else {
      contentBased = `Based on similar network profiles, your current setup (${downloadSpeed.toFixed(1)} Mbps down / ${uploadSpeed.toFixed(1)} Mbps up) is performing within expected parameters for your connection type.`;
    }
    
    return {
      rule_based: ruleBased,
      content_based: contentBased
    };
  };

  // Add a section to display Nginx traffic data
  const NginxTrafficSection = () => {
    if (!nginxTraffic || !nginxTraffic.requestCount) {
      return null;
    }
    
    return (
      <div className="bg-gray-700 p-4 rounded-md">
        <h3 className="text-lg text-white font-medium mb-2">Nginx Traffic Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-600 p-3 rounded">
            <p className="text-gray-300 text-sm">Total Requests</p>
            <p className="text-white text-xl font-bold">
              {nginxTraffic.requestCount.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-600 p-3 rounded">
            <p className="text-gray-300 text-sm">Avg Response Time</p>
            <p className="text-white text-xl font-bold">
              {nginxTraffic.avgResponseTime.toFixed(3)} sec
            </p>
          </div>
          <div className="bg-gray-600 p-3 rounded">
            <p className="text-gray-300 text-sm">Error Rate</p>
            <p className="text-white text-xl font-bold">
              {(nginxTraffic.errorRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-600 p-3 rounded">
            <h4 className="text-white font-medium mb-2">Traffic by Status</h4>
            <div className="space-y-2">
              {Object.entries(nginxTraffic.trafficByStatus || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className={`text-sm ${
                    status === '2xx' ? 'text-green-400' : 
                    status === '3xx' ? 'text-blue-400' : 
                    status === '4xx' ? 'text-yellow-400' : 
                    status === '5xx' ? 'text-red-400' : 'text-gray-300'
                  }`}>
                    {status}
                  </span>
                  <span className="text-gray-300 text-sm">{count.toLocaleString()} requests</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-600 p-3 rounded">
            <h4 className="text-white font-medium mb-2">Top Endpoints</h4>
            <div className="space-y-2">
              {Object.entries(nginxTraffic.trafficByEndpoint || {}).slice(0, 5).map(([endpoint, count]) => (
                <div key={endpoint} className="flex justify-between">
                  <span className="text-blue-400 text-sm truncate max-w-[70%]">{endpoint}</span>
                  <span className="text-gray-300 text-sm">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    // Only fetch if we're online
    if (isClientOnline && (isOnline !== false)) {
      fetchRecommendations();
      
      // Check for updates every 5 minutes
      const interval = setInterval(fetchRecommendations, 5 * 60 * 1000);
      
      // Cleanup interval on component unmount
      return () => clearInterval(interval);
    }
  }, [fetchRecommendations, isClientOnline, isOnline]);

  // Manual refresh handler
  const handleRefresh = () => {
    // Only refresh if we're online
    if (!isClientOnline) {
      setError("You are currently offline. Please check your connection.");
      return;
    }
    
    // First refresh the metrics from the context
    if (refreshMetrics) {
      refreshMetrics();
    }
    
    // Then generate new recommendations based on updated metrics
    fetchRecommendations();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white mb-4">Network Recommendations</h2>
        <div className="flex items-center space-x-4">
          {/* Network Status Indicator */}
          <div className={`flex items-center px-3 py-1 rounded-full ${isClientOnline ? 'bg-green-500' : 'bg-red-500'}`}>
            {isClientOnline ? (
              <>
                <FaWifi className="mr-2" />
                <span className="text-white text-sm font-medium">Online</span>
              </>
            ) : (
              <>
                <FaWifiSlash className="mr-2" />
                <span className="text-white text-sm font-medium">Offline</span>
              </>
            )}
          </div>
          
          {/* Refresh Button */}
          <button 
            onClick={handleRefresh}
            className={`px-4 py-2 rounded-md transition-colors flex items-center ${
              isClientOnline 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-400 cursor-not-allowed text-gray-200'
            }`}
            disabled={loading || !isClientOnline}
          >
            <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {/* Offline Message */}
      {!isClientOnline && (
        <div className="bg-red-500 text-white p-6 rounded-md flex items-center justify-center flex-col">
          <FaWifiSlash className="text-4xl mb-4" />
          <h3 className="text-xl font-bold mb-2">You are currently offline</h3>
          <p className="text-center">
            Network recommendations require an internet connection. 
            Please check your connection and try again.
          </p>
        </div>
      )}
      
      {/* Error Message (when online but with errors) */}
      {isClientOnline && error && (
        <div className="bg-yellow-600 text-white p-4 rounded-md">
          {error}
        </div>
      )}
      
      {/* Loading Indicator */}
      {isClientOnline && loading && !networkData && (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      )}

      {/* Network Data Display (only when online) */}
      {isClientOnline && networkData && (
        <div className="space-y-6">
          <div className="bg-gray-700 p-4 rounded-md">
            <h3 className="text-lg text-white font-medium mb-2">
              Network Metrics for {networkData.interface}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-600 p-3 rounded">
                <p className="text-gray-300 text-sm">Latency</p>
                <p className="text-white text-xl font-bold">
                  {networkData.raw_metrics.latency_ms.toFixed(1)} ms
                </p>
                <p className="text-sm mt-1 font-medium" 
                   style={{ color: networkData.prediction.latency === "High" ? "#f87171" : 
                           networkData.prediction.latency === "Normal" ? "#fcd34d" : "#4ade80" }}>
                  {networkData.prediction.latency}
                </p>
              </div>
              <div className="bg-gray-600 p-3 rounded">
                <p className="text-gray-300 text-sm">Packet Loss</p>
                <p className="text-white text-xl font-bold">
                  {networkData.raw_metrics.packet_loss_percent.toFixed(1)}%
                </p>
                <p className="text-sm mt-1 font-medium"
                   style={{ color: networkData.prediction.packet_loss === "High" ? "#f87171" : 
                           networkData.prediction.packet_loss === "Normal" ? "#fcd34d" : "#4ade80" }}>
                  {networkData.prediction.packet_loss}
                </p>
              </div>
              <div className="bg-gray-600 p-3 rounded">
                <p className="text-gray-300 text-sm">Download</p>
                <p className="text-white text-xl font-bold">
                  {networkData.raw_metrics.download_speed.toFixed(1)} Mbps
                </p>
              </div>
              <div className="bg-gray-600 p-3 rounded">
                <p className="text-gray-300 text-sm">Upload</p>
                <p className="text-white text-xl font-bold">
                  {networkData.raw_metrics.upload_speed.toFixed(1)} Mbps
                </p>
              </div>
              <div className="bg-gray-600 p-3 rounded">
                <p className="text-gray-300 text-sm">Utilization</p>
                <p className="text-white text-xl font-bold">
                  {(networkData.raw_metrics.utilization_ratio * 100).toFixed(1)}%
                </p>
                <p className="text-sm mt-1 font-medium"
                   style={{ color: networkData.prediction.utilization === "High" ? "#f87171" : 
                           networkData.prediction.utilization === "Normal" ? "#fcd34d" : "#4ade80" }}>
                  {networkData.prediction.utilization}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 p-4 rounded-md">
            <h3 className="text-lg text-white font-medium mb-2">Recommendations</h3>
            <div className="space-y-4">
              <div className="bg-gray-600 p-3 rounded">
                <h4 className="text-white font-medium mb-2">Rule-Based Recommendation</h4>
                <div className="text-gray-200 whitespace-pre-line">
                  {networkData.recommendations.rule_based}
                </div>
              </div>
              <div className="bg-gray-600 p-3 rounded">
                <h4 className="text-white font-medium mb-2">Historical Similarity Recommendation</h4>
                <div className="text-gray-200">
                  {networkData.recommendations.content_based}
                </div>
              </div>
            </div>
          </div>

          {/* Voice Traffic Recommendations */}
          <div className="bg-gray-700 p-4 rounded-md">
            <h3 className="text-lg text-white font-medium mb-2">Voice Traffic Analysis</h3>
            <div className="bg-gray-600 p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium">Status</h4>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  voiceStatus === 'High' ? 'bg-red-500 text-white' : 
                  voiceStatus === 'Normal' ? 'bg-yellow-500 text-gray-800' : 
                  'bg-green-500 text-white'
                }`}>
                  {voiceStatus}
                </span>
              </div>
              <div className="text-gray-200 whitespace-pre-line">
                {getVoiceTrafficMessage(voiceStatus)}
              </div>
            </div>
          </div>

          {/* Video Traffic Recommendations */}
          <div className="bg-gray-700 p-4 rounded-md">
            <h3 className="text-lg text-white font-medium mb-2">Video Traffic Analysis</h3>
            <div className="bg-gray-600 p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium">Status</h4>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  videoStatus === 'High' ? 'bg-red-500 text-white' : 
                  videoStatus === 'Normal' ? 'bg-yellow-500 text-gray-800' : 
                  'bg-green-500 text-white'
                }`}>
                  {videoStatus}
                </span>
              </div>
              <div className="text-gray-200 whitespace-pre-line">
                {getVideoTrafficMessage(videoStatus)}
              </div>
            </div>
          </div>

          {/* Nginx Traffic Section */}
          <NginxTrafficSection />

          <div className="text-gray-400 text-xs">
            Last updated: {new Date(networkData.timestamp).toLocaleString()}
            {lastUpdated && (
              <span> (Updates hourly - Next update: {new Date(lastUpdated.getTime() + 3600000).toLocaleTimeString()})</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const NetworkUtilization = () => {
  return (
    <Authenticated title="Network Recommendation">
      <div className="bg-gray-800 p-6 rounded-md shadow-md">
        <Recommendations />
      </div>
    </Authenticated>
  );
};

export default NetworkUtilization;
