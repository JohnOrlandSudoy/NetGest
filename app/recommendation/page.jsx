"use client";

import Authenticated from "@/components/layouts/Authenticated";
import { useState, useEffect, useContext, useCallback } from "react";
import { NetworkMetricsContext } from "@/context/NetworkMetricsProvider";
import { FaWifi, FaWifiSlash, FaSync, FaVideo, FaMicrophone, FaPhone } from "react-icons/fa";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import TrafficAnalyzer from '@/services/tshark/trafficAnalyzer';
import { generateRecommendations } from '@/utils/recommendations';
import { fetchNetworkMetrics, fetchRecommendations } from '@/utils/metrics';

// Constants for traffic types and filters
const TRAFFIC_TYPES = {
  VIDEO: 'video',
  AUDIO: 'audio',
  VOICE: 'voice'
};

const TRAFFIC_FILTERS = {
  [TRAFFIC_TYPES.VIDEO]: 'tcp port 443',
  [TRAFFIC_TYPES.AUDIO]: 'tcp port 443 and less 1000',
  [TRAFFIC_TYPES.VOICE]: 'udp'
};

// Path to TShark executable
const TSHARK_PATH = 'C:\\Program Files\\Wireshark\\tshark.exe';
const MONITORING_INTERVAL = 5000; // 5 seconds

// Add these new functions after the existing constants
const runTSharkCommand = async (command) => {
  try {
    console.log('Executing TShark command:', command);
    
    const response = await fetch('/api/tshark/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to execute TShark command');
    }

    // Log the raw output for debugging
    console.log('TShark command output:', data.output);
    
    return data.output;
  } catch (error) {
    console.error('Error executing TShark command:', error);
    throw error;
  }
};

async function analyzeTrafficType(type, interfaceId) {
  console.log(`Running command for ${type} traffic: "${TSHARK_PATH}" -i "${interfaceId}" -a duration:5 -c 100 -f "${TRAFFIC_FILTERS[type]}" -q -T fields -e frame.len`);
  
  try {
    const output = await runTSharkCommand(`"${TSHARK_PATH}" -i "${interfaceId}" -a duration:5 -c 100 -f "${TRAFFIC_FILTERS[type]}" -q -T fields -e frame.len`);
    console.log(`Raw output for ${type} traffic:`, output);
    
    // Extract packet count from the capture summary
    const packetMatch = output.match(/(\d+) packets captured/);
    const packetCount = packetMatch ? parseInt(packetMatch[1], 10) : 0;
    console.log(`Extracted packet count for ${type}:`, packetCount);
    
    // Split output into lines and filter out empty lines and non-numeric values
    const lines = output.split('\n')
      .map(line => line.trim())
      .filter(line => line && !isNaN(parseInt(line)));
    
    console.log(`Filtered lines for ${type}:`, lines);
    
    // Calculate total bytes from frame lengths
    const totalBytes = lines.reduce((sum, line) => {
      const size = parseInt(line, 10);
      return sum + (isNaN(size) ? 0 : size);
    }, 0);
    
    console.log(`Total bytes for ${type}:`, totalBytes);
    
    // Calculate bitrate (bits per second)
    // Convert bytes to bits (* 8) and divide by duration (5 seconds)
    const bitrate = (totalBytes * 8) / 5; // 5 seconds duration
    const bitrateMbps = bitrate / 1000000; // Convert to Mbps
    console.log(`Calculated bitrate for ${type}:`, bitrateMbps, 'Mbps');
    
    // Determine quality based on bitrate and packet count
    let quality = 'No Traffic';
    if (packetCount > 0) {
      if (type === 'video') {
        if (bitrateMbps >= 5) quality = 'Excellent';
        else if (bitrateMbps >= 2) quality = 'Good';
        else if (bitrateMbps >= 1) quality = 'Fair';
        else quality = 'Poor';
      } else if (type === 'audio') {
        if (bitrateMbps >= 0.256) quality = 'Excellent';
        else if (bitrateMbps >= 0.128) quality = 'Good';
        else if (bitrateMbps >= 0.064) quality = 'Fair';
        else quality = 'Poor';
      } else if (type === 'voice') {
        if (bitrateMbps >= 0.128) quality = 'Excellent';
        else if (bitrateMbps >= 0.064) quality = 'Good';
        else if (bitrateMbps >= 0.032) quality = 'Fair';
        else quality = 'Poor';
      }
    }
    
    const result = {
      packets: packetCount,
      bytes: totalBytes,
      bitrate: bitrateMbps,
      quality
    };
    
    console.log(`${type} traffic analysis result:`, result);
    return result;
  } catch (error) {
    console.error(`Error analyzing ${type} traffic:`, error);
    return {
      packets: 0,
      bytes: 0,
      bitrate: 0,
      quality: 'Error'
    };
  }
}

function Recommendations() {
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState('Normal');
  const [videoStatus, setVideoStatus] = useState('Normal');
  const [isClientOnline, setIsClientOnline] = useState(true);
  const [analyzingTraffic, setAnalyzingTraffic] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [trafficAnalyzer, setTrafficAnalyzer] = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [trafficRecommendations, setTrafficRecommendations] = useState(null);
  const [selectedInterface, setSelectedInterface] = useState(() => {
    // Initialize with the Ethernet interface
    return '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}';
  });

  // Get network metrics from context
  const { 
    avgPacketLoss, 
    avgLatency, 
    internetSpeed, 
    isOnline,
    refreshMetrics,
    nginxTraffic,
    trafficData: contextTrafficData,
    fetchTrafficData,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    setAvgLatency,
    setAvgPacketLoss,
    setInternetSpeed
  } = useContext(NetworkMetricsContext);

  // Add new state for real-time updates
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

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

  // Initialize traffic analyzer
  useEffect(() => {
    if (selectedInterface) {
      console.log('Initializing traffic analyzer with interface:', selectedInterface);
      const analyzer = new TrafficAnalyzer(
        'C:\\Program Files\\Wireshark\\tshark.exe',
        selectedInterface
      );
      setTrafficAnalyzer(analyzer);
    } else {
      // Set default interface to Ethernet if none is selected
      const defaultInterface = '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}';
      console.log('No interface selected, using default:', defaultInterface);
      setSelectedInterface(defaultInterface);
      const analyzer = new TrafficAnalyzer(
        'C:\\Program Files\\Wireshark\\tshark.exe',
        defaultInterface
      );
      setTrafficAnalyzer(analyzer);
    }
  }, [selectedInterface]);

  // Function to analyze traffic
  const analyzeTraffic = async () => {
    if (!trafficAnalyzer) return;

    setAnalyzingTraffic(true);
    try {
      // Set active analysis type
      setActiveAnalysis(TRAFFIC_TYPES.VIDEO);
      
      // Analyze all traffic types with a 5-second duration
      const trafficData = await trafficAnalyzer.analyzeAllTraffic(5);
      console.log('Traffic analysis results:', trafficData);
      
      // Generate recommendations based on the traffic data
      const recommendations = trafficAnalyzer.generateTrafficRecommendations(trafficData);
      console.log('Traffic recommendations:', recommendations);
      
      // Update state with the new data
      setTrafficData(trafficData);
      setTrafficRecommendations(recommendations);
      
      // Update voice and video status based on traffic analysis
      const voiceQuality = trafficData.voice?.quality || 'Normal';
      const videoQuality = trafficData.video?.quality || 'Normal';
      
      setVoiceStatus(voiceQuality === 'Poor' ? 'High' : voiceQuality === 'Fair' ? 'Normal' : 'Low');
      setVideoStatus(videoQuality === 'Low' ? 'High' : videoQuality === 'SD' ? 'Normal' : 'Low');
      
    } catch (error) {
      console.error('Error analyzing traffic:', error);
      setError('Failed to analyze network traffic. Please try again.');
    } finally {
      setAnalyzingTraffic(false);
      setActiveAnalysis(null);
    }
  };

  // Add effect to trigger initial traffic analysis
  useEffect(() => {
    if (trafficAnalyzer && !analyzingTraffic && !trafficData) {
      analyzeTraffic();
    }
  }, [trafficAnalyzer, analyzingTraffic, trafficData]);

  // Add effect to handle auto-refresh for traffic analysis
  useEffect(() => {
    let intervalId;
    if (autoRefresh && trafficAnalyzer) {
      intervalId = setInterval(() => {
        analyzeTraffic();
      }, refreshInterval * 1000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, trafficAnalyzer]);

  // Add a function to handle recommendations fetching
  const handleFetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecommendations(selectedInterface);
      setNetworkData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setError(error.message);
    } finally {
      setLoading(false);
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

  // Enhanced recommendation display component
  const RecommendationCard = ({ title, status, message, icon }) => {
    const statusColors = {
      'Low': 'bg-green-50 text-green-800',
      'Normal': 'bg-blue-50 text-blue-800',
      'High': 'bg-red-50 text-red-800'
    };

    return (
      <div className={`p-6 rounded-lg ${statusColors[status]} shadow-sm`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="text-2xl">{icon}</div>
        </div>
        <div className="whitespace-pre-line text-sm">{message}</div>
      </div>
    );
  };

  // Enhanced metrics display component
  const MetricsDisplay = ({ metrics }) => {
    if (!metrics) return null;

    // Helper function to safely format numbers
    const formatNumber = (value, decimals = 1) => {
      if (value === undefined || value === null) return '0';
      return Number(value).toFixed(decimals);
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-500">Latency</h4>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(metrics.latency)}
            <span className="text-sm font-normal ml-1">ms</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Status: {metrics.prediction?.latency || 'Unknown'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-500">Packet Loss</h4>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(metrics.packetLoss, 2)}
            <span className="text-sm font-normal ml-1">%</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Status: {metrics.prediction?.packetLoss || 'Unknown'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-500">Download Speed</h4>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(metrics.downloadSpeed)}
            <span className="text-sm font-normal ml-1">Mbps</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-500">Upload Speed</h4>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(metrics.uploadSpeed)}
            <span className="text-sm font-normal ml-1">Mbps</span>
          </p>
        </div>
      </div>
    );
  };

  // Add TrafficControls component
  const TrafficControls = ({ onAnalyze, loading }) => {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold mb-4">Traffic Analysis Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onAnalyze(TRAFFIC_TYPES.VIDEO)}
            disabled={loading}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading && activeAnalysis === TRAFFIC_TYPES.VIDEO ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Analyze Video Traffic
          </button>
          
          <button
            onClick={() => onAnalyze(TRAFFIC_TYPES.AUDIO)}
            disabled={loading}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
          >
            {loading && activeAnalysis === TRAFFIC_TYPES.AUDIO ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Analyze Audio Traffic
          </button>
          
          <button
            onClick={() => onAnalyze(TRAFFIC_TYPES.VOICE)}
            disabled={loading}
            className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-300"
          >
            {loading && activeAnalysis === TRAFFIC_TYPES.VOICE ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Analyze Voice Traffic
          </button>
        </div>
      </div>
    );
  };

  // Enhanced traffic display component
  const TrafficDisplay = ({ data, recommendations }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const [trafficData, setTrafficData] = useState({
      video: { packets: 0, bytes: 0, bitrate: 0, quality: 'No Traffic' },
      audio: { packets: 0, bytes: 0, bitrate: 0, quality: 'No Traffic' },
      voice: { packets: 0, bytes: 0, bitrate: 0, quality: 'No Traffic' }
    });

    // Add effect to update traffic data
    useEffect(() => {
      const updateTrafficData = async () => {
        try {
          const results = await Promise.all([
            analyzeTrafficType(TRAFFIC_TYPES.VIDEO, selectedInterface),
            analyzeTrafficType(TRAFFIC_TYPES.AUDIO, selectedInterface),
            analyzeTrafficType(TRAFFIC_TYPES.VOICE, selectedInterface)
          ]);

          setTrafficData({
            video: results[0],
            audio: results[1],
            voice: results[2]
          });
        } catch (error) {
          console.error('Error updating traffic data:', error);
        }
      };

      // Initial update
      updateTrafficData();

      // Set up interval for updates
      const intervalId = setInterval(updateTrafficData, MONITORING_INTERVAL);

      return () => clearInterval(intervalId);
    }, [selectedInterface]);

    if (!trafficData) {
      return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Traffic Analysis</h2>
            <div className="flex items-center text-blue-600">
              <Loader2 className="animate-spin mr-2" />
              Analyzing...
            </div>
          </div>
          <div className="text-center py-8 text-gray-500">
            Analyzing network traffic...
          </div>
        </div>
      );
    }

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const getQualityColor = (quality) => {
      switch (quality) {
        case 'Excellent': return 'text-green-600';
        case 'Good': return 'text-blue-600';
        case 'Fair': return 'text-yellow-600';
        case 'Poor': return 'text-red-600';
        default: return 'text-gray-600';
      }
    };

    const getTrafficIcon = (type) => {
      switch (type) {
        case 'video': return <FaVideo className="text-blue-500" />;
        case 'audio': return <FaMicrophone className="text-green-500" />;
        case 'voice': return <FaPhone className="text-purple-500" />;
        default: return <FaWifi className="text-gray-500" />;
      }
    };

    const formatBitrate = (mbps) => {
      if (mbps === 0) return '0 Mbps';
      if (mbps < 0.001) return `${(mbps * 1000).toFixed(2)} Kbps`;
      return `${mbps.toFixed(2)} Mbps`;
    };

    const renderTrafficCard = (type, trafficData) => {
      const isSelected = selectedType === type;
      const qualityColor = getQualityColor(trafficData?.quality);
      
      return (
        <div 
          className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
            isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
          } ${type === 'video' ? 'bg-blue-50' : type === 'audio' ? 'bg-green-50' : 'bg-purple-50'}`}
          onClick={() => setSelectedType(isSelected ? null : type)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getTrafficIcon(type)}
              <h3 className="text-sm font-medium capitalize">{type} Traffic</h3>
            </div>
            <span className={`text-sm font-medium ${qualityColor}`}>
              {trafficData?.quality || 'No Traffic'}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Packets</span>
              <span className="text-sm font-medium">{trafficData?.packets?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Data</span>
              <span className="text-sm font-medium">{formatBytes(trafficData?.bytes || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bitrate</span>
              <span className="text-sm font-medium">{formatBitrate(trafficData?.bitrate || 0)}</span>
            </div>
          </div>

          {isSelected && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                <p>Last Updated: {new Date().toLocaleTimeString()}</p>
                <p>Interface: {selectedInterface}</p>
              </div>
            </div>
          )}
        </div>
      );
    };

    const renderTotalTraffic = () => {
      const totalTraffic = {
        packets: (trafficData.video?.packets || 0) + (trafficData.audio?.packets || 0) + (trafficData.voice?.packets || 0),
        bytes: (trafficData.video?.bytes || 0) + (trafficData.audio?.bytes || 0) + (trafficData.voice?.bytes || 0),
        bitrate: (trafficData.video?.bitrate || 0) + (trafficData.audio?.bitrate || 0) + (trafficData.voice?.bitrate || 0)
      };

      return (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FaWifi className="text-gray-500" />
              <h3 className="text-sm font-medium">Total Traffic</h3>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Packets</span>
              <span className="text-sm font-medium">{totalTraffic.packets.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Data</span>
              <span className="text-sm font-medium">{formatBytes(totalTraffic.bytes)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Bitrate</span>
              <span className="text-sm font-medium">{formatBitrate(totalTraffic.bitrate)}</span>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Video Share</p>
                  <p className="font-medium">
                    {((trafficData.video?.bytes || 0) / (totalTraffic.bytes || 1) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Audio Share</p>
                  <p className="font-medium">
                    {((trafficData.audio?.bytes || 0) / (totalTraffic.bytes || 1) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Voice Share</p>
                  <p className="font-medium">
                    {((trafficData.voice?.bytes || 0) / (totalTraffic.bytes || 1) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Traffic Analysis</h2>
          <div className="flex items-center text-blue-600">
            <Loader2 className="animate-spin mr-2" />
            Analyzing...
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderTrafficCard('video', trafficData.video)}
          {renderTrafficCard('audio', trafficData.audio)}
          {renderTrafficCard('voice', trafficData.voice)}
          {renderTotalTraffic()}
        </div>

        {/* Traffic Recommendations */}
        {recommendations && Object.keys(recommendations).length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Traffic Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(recommendations).map(([type, recs]) => (
                recs.length > 0 && (
                  <div key={type} className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-800 mb-2 capitalize">{type} Traffic</h4>
                    {recs.map((rec, index) => (
                      <div key={index} className="mb-3 last:mb-0">
                        <p className={`text-sm font-medium ${
                          rec.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {rec.message}
                        </p>
                        <ul className="mt-1 ml-4 list-disc text-sm text-gray-600">
                          {rec.actions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Add Interface Selector
  const InterfaceSelector = () => {
    const interfaces = [
      { id: '\\Device\\NPF_{1CFFE0A1-9A3F-42C2-903A-03BCA22B5D76}', name: 'Local Area Connection 8' },
      { id: '\\Device\\NPF_{32ED35FC-B3DF-4960-BB34-4B135FAAB8C5}', name: 'Local Area Connection 7' },
      { id: '\\Device\\NPF_{CB4A5AE4-2D42-45B3-A840-292E4BECBCF7}', name: 'Local Area Connection 6' },
      { id: '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}', name: 'Ethernet' },
      { id: '\\Device\\NPF_Loopback', name: 'Loopback Adapter' }
    ];

    return (
      <div className="mb-6">
        <label htmlFor="interface-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Network Interface
        </label>
        <select
          id="interface-select"
          value={selectedInterface}
          onChange={(e) => {
            console.log('Interface selected:', e.target.value);
            setSelectedInterface(e.target.value);
          }}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {interfaces.map((iface) => (
            <option key={iface.id} value={iface.id}>
              {iface.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Add this new component for real-time traffic monitoring
  const TrafficMonitor = ({ interfaceId }) => {
    const [trafficData, setTrafficData] = useState({
      video: { packets: 0, timestamp: null },
      audio: { packets: 0, timestamp: null },
      voice: { packets: 0, timestamp: null }
    });
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    const startMonitoring = useCallback(() => {
      setIsMonitoring(true);
      setError(null);
    }, []);

    const stopMonitoring = useCallback(() => {
      setIsMonitoring(false);
    }, []);

    // Monitor traffic in real-time
    useEffect(() => {
      let intervalId;

      const monitorTraffic = async () => {
        try {
          const results = await Promise.all([
            analyzeTrafficType(TRAFFIC_TYPES.VIDEO, interfaceId),
            analyzeTrafficType(TRAFFIC_TYPES.AUDIO, interfaceId),
            analyzeTrafficType(TRAFFIC_TYPES.VOICE, interfaceId)
          ]);

          const newData = {
            video: results[0],
            audio: results[1],
            voice: results[2]
          };

          setTrafficData(newData);
          setLastUpdate(new Date());
          setError(null);
        } catch (error) {
          console.error('Error monitoring traffic:', error);
          setError('Failed to monitor traffic. Please try again.');
        }
      };

      if (isMonitoring) {
        // Run immediately on start
        monitorTraffic();
        
        // Then set up interval
        intervalId = setInterval(monitorTraffic, MONITORING_INTERVAL);
      }

      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }, [isMonitoring, interfaceId]);

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Real-time Traffic Monitor</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`px-4 py-2 rounded ${
                isMonitoring 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
            {lastUpdate && (
              <span className="text-sm text-gray-500">
                Last update: {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Video Traffic</h3>
            <p className="text-2xl font-bold text-blue-600">
              {trafficData.video.packets.toLocaleString()}
              <span className="text-sm font-normal ml-1">packets</span>
            </p>
            {trafficData.video.timestamp && (
              <p className="text-xs text-blue-500 mt-1">
                Updated: {new Date(trafficData.video.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-800 mb-2">Audio Traffic</h3>
            <p className="text-2xl font-bold text-green-600">
              {trafficData.audio.packets.toLocaleString()}
              <span className="text-sm font-normal ml-1">packets</span>
            </p>
            {trafficData.audio.timestamp && (
              <p className="text-xs text-green-500 mt-1">
                Updated: {new Date(trafficData.audio.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-800 mb-2">Voice Traffic</h3>
            <p className="text-2xl font-bold text-purple-600">
              {trafficData.voice.packets.toLocaleString()}
              <span className="text-sm font-normal ml-1">packets</span>
            </p>
            {trafficData.voice.timestamp && (
              <p className="text-xs text-purple-500 mt-1">
                Updated: {new Date(trafficData.voice.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Authenticated>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Network Recommendations</h1>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-600">
                Auto-refresh
              </label>
            </div>

            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
              disabled={!autoRefresh || analyzingTraffic}
            >
              <option value="15">Every 15s</option>
              <option value="30">Every 30s</option>
              <option value="60">Every 1m</option>
              <option value="300">Every 5m</option>
            </select>

            <button
              onClick={handleFetchRecommendations}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
              disabled={analyzingTraffic}
            >
              <FaSync className={`mr-2 ${analyzingTraffic ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Add Interface Selector */}
        <InterfaceSelector />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Traffic Analysis Section */}
        <TrafficDisplay data={trafficData} recommendations={trafficRecommendations} />

        {/* Add the TrafficMonitor component */}
        <TrafficMonitor interfaceId={selectedInterface} />

        {/* Render other sections only if network data is available */}
        {!analyzingTraffic && networkData && (
          <>
            <MetricsDisplay metrics={networkData.metrics} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <RecommendationCard
                title="Voice Traffic Status"
                status={voiceStatus}
                message={getVoiceTrafficMessage(voiceStatus)}
                icon={<FaWifi className={voiceStatus === 'High' ? 'text-red-500' : 'text-green-500'} />}
              />

              <RecommendationCard
                title="Video Traffic Status"
                status={videoStatus}
                message={getVideoTrafficMessage(videoStatus)}
                icon={<FaWifi className={videoStatus === 'High' ? 'text-red-500' : 'text-green-500'} />}
              />
            </div>
          </>
        )}
      </div>
    </Authenticated>
  );
}

export default Recommendations;