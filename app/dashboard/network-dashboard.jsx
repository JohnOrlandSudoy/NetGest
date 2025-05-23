
'use client';

import React, { useState, useEffect } from 'react';
import NetworkHistoryChart from '@/components/charts/NetworkHistoryChart';

const NetworkDashboard = ({ 
  metrics, 
  packetLossHistory: initialPacketLossHistory, 
  latencyHistory: initialLatencyHistory, 
  speedHistory: initialSpeedHistory, 
  loadingHistory, 
  loading, 
  error, 
  refreshMetrics 
}) => {
  const [isClient, setIsClient] = useState(false);
  const [forceLoaded, setForceLoaded] = useState(false);
  const [selectedInterface, setSelectedInterface] = useState('eth0'); // Default interface
  
  // Create separate state for each chart to ensure unique data
  const [packetLossData, setPacketLossData] = useState([]);
  const [latencyData, setLatencyData] = useState([]);
  const [downloadSpeedData, setDownloadSpeedData] = useState([]);
  const [uploadSpeedData, setUploadSpeedData] = useState([]);
  const [chartLoading, setChartLoading] = useState({
    packetLoss: true,
    latency: true,
    download: true,
    upload: true
  });

  // Generate mock data with unique patterns for each chart
  const generateMockData = (maxValue = 100, count = 24) => {
    const now = new Date();
    const data = [];
    
    for (let i = 0; i < count; i++) {
      const date = new Date(now);
      date.setHours(date.getHours() - (count - 1 - i));
      
      // Create a unique pattern based on time of day
      const hour = date.getHours();
      const dayFactor = Math.sin((hour / 24) * Math.PI * 2); // Sine wave pattern over 24 hours
      const randomFactor = 0.2 + Math.random() * 0.3; // Add some randomness (0.2-0.5)
      
      // Calculate a value that follows a daily pattern with some randomness
      const value = (0.3 + 0.4 * Math.abs(dayFactor) + randomFactor) * maxValue;
      
      data.push({
        time: date.toISOString(),
        value: parseFloat(value.toFixed(2))
      });
    }
    
    return data;
  };

  // Helper function to generate chart data from Nginx values
  const generateChartDataFromNginx = (baseValue, hours = 24) => {
    const now = new Date();
    const data = [];
    
    // Ensure baseValue is a number
    const numericBaseValue = typeof baseValue === 'number' ? baseValue : 0;
    
    for (let i = 0; i < hours; i++) {
      const date = new Date(now);
      date.setHours(date.getHours() - (hours - 1 - i));
      
      // Create a pattern based on time of day
      const hour = date.getHours();
      let multiplier = 1;
      
      // Network traffic is typically higher during business hours and evenings
      if (hour >= 9 && hour <= 17) {
        // Business hours - gradual rise and fall
        multiplier = 1.2 + Math.sin((hour - 9) / 8 * Math.PI) * 0.3;
      } else if (hour >= 19 && hour <= 23) {
        // Evening entertainment - higher usage
        multiplier = 1.5 + Math.sin((hour - 19) / 4 * Math.PI) * 0.5;
      } else if (hour >= 0 && hour <= 5) {
        // Late night/early morning - low usage
        multiplier = 0.5 + Math.random() * 0.2;
      } else {
        // Other times - moderate usage
        multiplier = 0.8 + Math.random() * 0.3;
      }
      
      // Add some random variation
      const randomFactor = 0.9 + Math.random() * 0.2;
      
      // Calculate value with pattern and randomness
      const value = Math.max(0, numericBaseValue * multiplier * randomFactor);
      
      data.push({
        time: date.toISOString(),
        value: parseFloat(value.toFixed(2))
      });
    }
    
    return data;
  };

  useEffect(() => {
    setIsClient(true);
    
    // Force data to display after 5 seconds even if loading is still true
    const timer = setTimeout(() => {
      setForceLoaded(true);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  // Fetch unique data for each chart
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setChartLoading({
          packetLoss: true,
          latency: true,
          download: true,
          upload: true
        });
        
        console.log("Fetching chart data...");
        
        // Try to get data from Nginx first
        try {
          const nginxResponse = await fetch('/api/nginx/logs');
          if (nginxResponse.ok) {
            const nginxData = await nginxResponse.json();
            console.log("Received Nginx data:", nginxData);
            
            // Extract chart data from Nginx logs
            if (nginxData.trafficVolume) {
              // Update download/upload speed data
              setDownloadSpeedData(generateChartDataFromNginx(
                nginxData.trafficVolume.downloadSpeedMbps,
                24
              ));
              
              setUploadSpeedData(generateChartDataFromNginx(
                nginxData.trafficVolume.uploadSpeedMbps,
                24
              ));
            }
            
            // Update latency data
            if (nginxData.avgResponseTime) {
              setLatencyData(generateChartDataFromNginx(
                nginxData.avgResponseTime,
                24
              ));
            }
            
            // Update packet loss data
            if (nginxData.errorRate !== undefined) {
              setPacketLossData(generateChartDataFromNginx(
                nginxData.errorRate,
                24
              ));
            }
            
            setChartLoading({
              packetLoss: false,
              latency: false,
              download: false,
              upload: false
            });
            
            return; // Exit early if we got Nginx data
          }
        } catch (nginxError) {
          console.error("Error fetching Nginx data:", nginxError);
          // Continue to fallback methods
        }
        
        // Fallback to history API if Nginx data is not available
        try {
          const [packetLossResponse, latencyResponse, speedResponse] = await Promise.all([
            fetch(`/api/network/history?metric=packetLoss&interface=${selectedInterface}`),
            fetch(`/api/network/history?metric=latency&interface=${selectedInterface}`),
            fetch(`/api/network/history?metric=speed&interface=${selectedInterface}`)
          ]);
          
          // Process packet loss data
          if (packetLossResponse.ok) {
            const packetLossData = await packetLossResponse.json();
            setPacketLossData(packetLossData.map(item => ({
              time: new Date(item.timestamp),
              value: item.value
            })));
          } else {
            setPacketLossData(initialPacketLossHistory || generateMockData(2));
          }
          
          // Process latency data
          if (latencyResponse.ok) {
            const latencyData = await latencyResponse.json();
            setLatencyData(latencyData.map(item => ({
              time: new Date(item.timestamp),
              value: item.value
            })));
          } else {
            setLatencyData(initialLatencyHistory || generateMockData(50));
          }
          
          // Process speed data
          if (speedResponse.ok) {
            const speedData = await speedResponse.json();
            
            // Split speed data into download and upload
            const downloadData = speedData
              .filter(item => item.direction === 'download')
              .map(item => ({
                time: new Date(item.timestamp),
                value: item.value
              }));
            
            const uploadData = speedData
              .filter(item => item.direction === 'upload')
              .map(item => ({
                time: new Date(item.timestamp),
                value: item.value
              }));
            
            setDownloadSpeedData(downloadData.length > 0 ? downloadData : generateMockData(100));
            setUploadSpeedData(uploadData.length > 0 ? uploadData : generateMockData(40));
          } else {
            setDownloadSpeedData(initialSpeedHistory || generateMockData(100));
            setUploadSpeedData(initialSpeedHistory || generateMockData(40));
          }
        } catch (error) {
          console.error("Error fetching history data:", error);
          // Use fallback data
          setPacketLossData(initialPacketLossHistory || generateMockData(2));
          setLatencyData(initialLatencyHistory || generateMockData(50));
          setDownloadSpeedData(initialSpeedHistory || generateMockData(100));
          setUploadSpeedData(initialSpeedHistory || generateMockData(40));
        }
      } catch (error) {
        console.error("Error fetching chart data:", error);
        // Use fallback data if API calls fail
        setPacketLossData(generateMockData(2));
        setLatencyData(generateMockData(50));
        setDownloadSpeedData(generateMockData(100));
        setUploadSpeedData(generateMockData(40));
      } finally {
        setChartLoading({
          packetLoss: false,
          latency: false,
          download: false,
          upload: false
        });
      }
    };
    
    fetchChartData();
    
    // Refresh data every 5 minutes
    const intervalId = setInterval(fetchChartData, 300000);
    return () => clearInterval(intervalId);
  }, [initialPacketLossHistory, initialLatencyHistory, initialSpeedHistory, selectedInterface]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center">
          <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
          Packet Loss
        </h3>
        <NetworkHistoryChart
          data={packetLossData}
          dataKey="value"
          labelKey="time"
          color="#ef4444"
          loading={chartLoading.packetLoss && !forceLoaded}
          yAxisLabel="Loss (%)"
          tooltipLabel="Packet Loss"
          tooltipUnit="%"
          warningThreshold={1}
          criticalThreshold={3}
        />
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center">
          <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
          Latency
        </h3>
        <NetworkHistoryChart
          data={latencyData}
          dataKey="value"
          labelKey="time"
          color="#f59e0b"
          loading={chartLoading.latency && !forceLoaded}
          yAxisLabel="Latency (ms)"
          tooltipLabel="Latency"
          tooltipUnit="ms"
          warningThreshold={50}
          criticalThreshold={100}
        />
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center">
          <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
          Download Speed
        </h3>
        <NetworkHistoryChart
          data={downloadSpeedData}
          dataKey="value"
          labelKey="time"
          color="#10b981"
          loading={chartLoading.download && !forceLoaded}
          yAxisLabel="Speed (Mbps)"
          tooltipLabel="Speed"
          tooltipUnit="Mbps"
          warningThreshold={10}
          criticalThreshold={20}
          thresholdCompare="below"
        />
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center">
          <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
          Upload Speed
        </h3>
        <NetworkHistoryChart
          data={uploadSpeedData}
          dataKey="value"
          labelKey="time"
          color="#3b82f6"
          loading={chartLoading.upload && !forceLoaded}
          yAxisLabel="Speed (Mbps)"
          tooltipLabel="Upload"
          tooltipUnit="Mbps"
          warningThreshold={5}
          criticalThreshold={10}
          thresholdCompare="below"
        />
      </div>
    </div>
  );
};

export default NetworkDashboard;






