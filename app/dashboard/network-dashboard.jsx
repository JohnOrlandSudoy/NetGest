
'use client';

import React, { useState, useEffect } from 'react';
import NetworkHistoryChart from '@/components/charts/NetworkHistoryChart';
import { FaSync } from 'react-icons/fa';

const NetworkDashboard = ({ 
  metrics, 
  packetLossHistory, 
  latencyHistory, 
  speedHistory, 
  loadingHistory, 
  loading, 
  error, 
  refreshMetrics,
  isRealtime = false
}) => {
  const [isClient, setIsClient] = useState(false);
  const [forceLoaded, setForceLoaded] = useState(false);
  const [chartLoading, setChartLoading] = useState({
    packetLoss: true,
    latency: true,
    download: true,
    upload: true
  });
  
  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true);
    
    // Force charts to load after 5 seconds if they're still loading
    const timer = setTimeout(() => {
      setForceLoaded(true);
      setChartLoading({
        packetLoss: false,
        latency: false,
        download: false,
        upload: false
      });
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Update chart loading state when data is available
  useEffect(() => {
    if (packetLossHistory && packetLossHistory.length > 0) {
      setChartLoading(prev => ({ ...prev, packetLoss: false }));
    }
    
    if (latencyHistory && latencyHistory.length > 0) {
      setChartLoading(prev => ({ ...prev, latency: false }));
    }
    
    if (speedHistory && speedHistory.length > 0) {
      setChartLoading(prev => ({ ...prev, download: false, upload: false }));
    }
  }, [packetLossHistory, latencyHistory, speedHistory]);
  
  // Handle refresh button click
  const handleRefresh = () => {
    if (refreshMetrics) {
      // Set loading state
      setChartLoading({
        packetLoss: true,
        latency: true,
        download: true,
        upload: true
      });
      
      // Call refresh function
      refreshMetrics();
      
      // Force loading to end after 5 seconds
      setTimeout(() => {
        setChartLoading({
          packetLoss: false,
          latency: false,
          download: false,
          upload: false
        });
      }, 5000);
    }
  };
  
  // If not client-side yet, return null
  if (!isClient) {
    return null;
  }
  
  // Format data for charts
  const formatPacketLossData = () => {
    if (!packetLossHistory || packetLossHistory.length === 0) {
      return [];
    }
    
    return packetLossHistory.map(item => ({
      timestamp: new Date(item.timestamp).toLocaleTimeString(),
      value: parseFloat(item.value || 0).toFixed(2)
    }));
  };
  
  const formatLatencyData = () => {
    if (!latencyHistory || latencyHistory.length === 0) {
      return [];
    }
    
    return latencyHistory.map(item => ({
      timestamp: new Date(item.timestamp).toLocaleTimeString(),
      value: parseFloat(item.value || 0).toFixed(2)
    }));
  };
  
  const formatSpeedData = (type = 'download') => {
    if (!speedHistory || speedHistory.length === 0) {
      return [];
    }
    
    return speedHistory.map(item => ({
      timestamp: new Date(item.timestamp).toLocaleTimeString(),
      value: parseFloat(item[type] || 0).toFixed(2)
    }));
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${isRealtime ? 'border-l-4 border-green-500' : ''}`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">Network Performance</h2>
          {isRealtime && (
            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <FaSync className="mr-1 h-2 w-2 animate-spin" />
              Live Data
            </span>
          )}
        </div>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          disabled={loading || isRealtime}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Packet Loss Chart */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Packet Loss (%)
            {isRealtime && <span className="ml-2 text-xs text-green-600">Live</span>}
          </h3>
          <NetworkHistoryChart 
            data={formatPacketLossData()}
            isLoading={chartLoading.packetLoss && !forceLoaded}
            color="#ef4444"
            yAxisLabel="%"
          />
        </div>
        
        {/* Latency Chart */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Latency (ms)
            {isRealtime && <span className="ml-2 text-xs text-green-600">Live</span>}
          </h3>
          <NetworkHistoryChart 
            data={formatLatencyData()}
            isLoading={chartLoading.latency && !forceLoaded}
            color="#f59e0b"
            yAxisLabel="ms"
          />
        </div>
        
        {/* Download Speed Chart */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Download Speed (Mbps)
            {isRealtime && <span className="ml-2 text-xs text-green-600">Live</span>}
          </h3>
          <NetworkHistoryChart 
            data={formatSpeedData('download')}
            isLoading={chartLoading.download && !forceLoaded}
            color="#3b82f6"
            yAxisLabel="Mbps"
          />
        </div>
        
        {/* Upload Speed Chart */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Upload Speed (Mbps)
            {isRealtime && <span className="ml-2 text-xs text-green-600">Live</span>}
          </h3>
          <NetworkHistoryChart 
            data={formatSpeedData('upload')}
            isLoading={chartLoading.upload && !forceLoaded}
            color="#10b981"
            yAxisLabel="Mbps"
          />
        </div>
      </div>
      
      {/* Metrics Summary */}
      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          Current Metrics
          {isRealtime && <span className="ml-2 text-xs text-green-600">Live</span>}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className={`bg-white p-3 rounded shadow ${isRealtime ? 'border-l-2 border-green-500' : ''}`}>
              <p className="text-sm text-gray-500">{metric.name}</p>
              <p className="text-xl font-semibold">
                {loading && !forceLoaded ? '...' : `${metric.value} ${metric.unit}`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NetworkDashboard;








