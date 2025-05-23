import React, { useState, useEffect, useContext } from 'react';
import { NetworkMetricsContext } from '@/context/NetworkMetricsProvider';
import { supabase } from '@/services/supabaseService';
import NetworkHistoryChart from '@/components/charts/NetworkHistoryChart';

const RealTimeNetworkMonitor = () => {
  const { 
    selectedInterface,
    avgLatency,
    avgPacketLoss,
    internetSpeed,
    uploadSpeed,
    lastUpdated,
    refreshMetrics
  } = useContext(NetworkMetricsContext);
  
  const [realtimeData, setRealtimeData] = useState({
    latency: [],
    packetLoss: [],
    download: [],
    upload: []
  });
  
  // Set up real-time subscription to network metrics
  useEffect(() => {
    if (!selectedInterface) return;
    
    // Subscribe to changes in the network_metrics_history table
    const subscription = supabase
      .channel('network-metrics-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'network_metrics_history',
        filter: `interface_name=eq.${selectedInterface}`
      }, (payload) => {
        // Update real-time data when new metrics are inserted
        const newMetric = payload.new;
        const timestamp = new Date(newMetric.timestamp).toISOString();
        
        setRealtimeData(prev => ({
          latency: [...prev.latency, { time: timestamp, value: parseFloat(newMetric.latency) }].slice(-60),
          packetLoss: [...prev.packetLoss, { time: timestamp, value: parseFloat(newMetric.packet_loss) }].slice(-60),
          download: [...prev.download, { time: timestamp, value: parseFloat(newMetric.download_speed) }].slice(-60),
          upload: [...prev.upload, { time: timestamp, value: parseFloat(newMetric.upload_speed) }].slice(-60)
        }));
      })
      .subscribe();
    
    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [selectedInterface]);
  
  // Manual refresh button handler
  const handleRefresh = () => {
    refreshMetrics();
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Real-Time Network Monitoring</h2>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh Now
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Current Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Latency</p>
              <p className="text-2xl font-bold">{avgLatency.toFixed(1)} ms</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Packet Loss</p>
              <p className="text-2xl font-bold">{avgPacketLoss.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Download</p>
              <p className="text-2xl font-bold">{internetSpeed.download.toFixed(1)} Mbps</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Upload</p>
              <p className="text-2xl font-bold">{uploadSpeed.toFixed(1)} Mbps</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Interface: {selectedInterface}</h3>
          <p className="text-sm text-gray-600 mb-4">
            Real-time data is being collected and stored in Supabase for historical analysis.
          </p>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className={`text-lg font-bold ${avgLatency > 100 ? 'text-red-500' : 'text-green-500'}`}>
                {avgLatency > 100 ? 'Degraded' : 'Healthy'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data Points</p>
              <p className="text-lg font-bold">{realtimeData.latency.length}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Real-Time Latency (ms)</h3>
          <NetworkHistoryChart
            data={realtimeData.latency}
            dataKey="value"
            labelKey="time"
            color="#3b82f6"
            loading={false}
            yAxisLabel="Latency (ms)"
            tooltipLabel="Latency"
            tooltipUnit="ms"
            warningThreshold={50}
            criticalThreshold={100}
            thresholdCompare="above"
          />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Real-Time Packet Loss (%)</h3>
          <NetworkHistoryChart
            data={realtimeData.packetLoss}
            dataKey="value"
            labelKey="time"
            color="#ef4444"
            loading={false}
            yAxisLabel="Packet Loss (%)"
            tooltipLabel="Packet Loss"
            tooltipUnit="%"
            warningThreshold={1}
            criticalThreshold={3}
            thresholdCompare="above"
          />
        </div>
      </div>
    </div>
  );
};

export default RealTimeNetworkMonitor;