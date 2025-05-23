
"use client";

import React, { useState, useEffect, useContext } from 'react';
import { NetworkMetricsContext } from '@/context/NetworkMetricsProvider';
import NetworkHistoryChart from '@/components/charts/NetworkHistoryChart';
import { formatBytes } from '@/utils/formatters';

const NetworkDashboard = ({ selectedInterface }) => {
  const { 
    metrics, 
    loading, 
    error, 
    refreshMetrics,
    packetLossHistory,
    latencyHistory,
    speedHistory,
    loadingHistory,
    uploadSpeed
  } = useContext(NetworkMetricsContext);
  
  // Create upload speed history from context
  const [uploadSpeedHistory, setUploadSpeedHistory] = useState([]);
  
  // Update upload speed history when upload speed changes
  useEffect(() => {
    if (uploadSpeed) {
      const currentTime = new Date().toLocaleTimeString();
      setUploadSpeedHistory(prev => {
        const newHistory = [...prev, { time: currentTime, value: uploadSpeed }];
        return newHistory.slice(-20); // Keep only the last 20 data points
      });
    }
  }, [uploadSpeed]);
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Don't render anything on the server
  }

  if (loading && (!metrics || metrics.length === 0)) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
        <p className="ml-4 text-gray-600">Loading network data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800">{error}</h3>
        </div>
        <div className="mt-4">
          <button 
            onClick={refreshMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Network Performance for {selectedInterface}</h2>
        <p className="text-gray-600">Real-time network performance metrics and historical data</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            Packet Loss
          </h3>
          <NetworkHistoryChart
            data={packetLossHistory}
            dataKey="value"
            labelKey="time"
            color="#ef4444"
            loading={loadingHistory}
            yAxisLabel="Packet Loss (%)"
            tooltipLabel="Packet Loss"
            tooltipUnit="%"
            warningThreshold={1}
            criticalThreshold={3}
            thresholdCompare="above"
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Latency
          </h3>
          <NetworkHistoryChart
            data={latencyHistory}
            dataKey="value"
            labelKey="time"
            color="#3b82f6"
            loading={loadingHistory}
            yAxisLabel="Latency (ms)"
            tooltipLabel="Latency"
            tooltipUnit="ms"
            warningThreshold={50}
            criticalThreshold={100}
            thresholdCompare="above"
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <h3 className="text-lg font-medium mb-4 text-gray-800 flex items-center">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Internet Speed
          </h3>
          <NetworkHistoryChart
            data={speedHistory}
            dataKey="value"
            labelKey="time"
            color="#10b981"
            loading={loadingHistory}
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
            data={uploadSpeedHistory}
            dataKey="value"
            labelKey="time"
            color="#3b82f6"
            loading={loadingHistory}
            yAxisLabel="Speed (Mbps)"
            tooltipLabel="Upload"
            tooltipUnit="Mbps"
            warningThreshold={5}
            criticalThreshold={2}
            thresholdCompare="below"
          />
        </div>
      </div>
    </div>
  );
};

export default NetworkDashboard;

