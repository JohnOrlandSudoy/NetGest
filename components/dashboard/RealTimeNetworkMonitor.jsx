'use client';

import React, { useState, useEffect, useRef } from 'react';
import { subscribeToNetworkMetrics, getCurrentNetworkMetrics } from '@/services/networkMetricsService';
import { LineChart } from '@/components/charts/LineChart';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const RealTimeNetworkMonitor = ({ selectedInterface = 'default', onInterfaceChange }) => {
  // State for real-time data
  const [realtimeData, setRealtimeData] = useState({
    latency: [],
    packetLoss: [],
    download: [],
    upload: []
  });
  
  // State for current metrics
  const [currentMetrics, setCurrentMetrics] = useState({
    latency: 0,
    packetLoss: 0,
    download: 0,
    upload: 0,
    timestamp: new Date().toISOString()
  });
  
  // Loading state
  const [loading, setLoading] = useState(true);
  
  // Subscription ID
  const subscriptionId = useRef(`network-monitor-${Math.random().toString(36).substring(2, 9)}`);
  
  // Unsubscribe function
  const unsubscribeRef = useRef(null);
  
  // Initialize metrics subscription
  useEffect(() => {
    setLoading(true);
    
    // Get initial metrics
    getCurrentNetworkMetrics(selectedInterface)
      .then(metrics => {
        setCurrentMetrics(metrics);
        
        // Initialize real-time data with current metrics
        const timestamp = new Date(metrics.timestamp).toISOString();
        setRealtimeData({
          latency: [{ time: timestamp, value: parseFloat(metrics.latency) }],
          packetLoss: [{ time: timestamp, value: parseFloat(metrics.packetLoss) }],
          download: [{ time: timestamp, value: parseFloat(metrics.download) }],
          upload: [{ time: timestamp, value: parseFloat(metrics.upload) }]
        });
        
        setLoading(false);
      })
      .catch(error => {
        console.error('Error getting initial metrics:', error);
        setLoading(false);
      });
    
    // Subscribe to metrics updates
    unsubscribeRef.current = subscribeToNetworkMetrics(
      subscriptionId.current,
      (metrics) => {
        // Update current metrics
        setCurrentMetrics(metrics);
        
        // Update real-time data
        const timestamp = new Date(metrics.timestamp).toISOString();
        
        setRealtimeData(prev => ({
          latency: [...prev.latency, { time: timestamp, value: parseFloat(metrics.latency) }].slice(-60),
          packetLoss: [...prev.packetLoss, { time: timestamp, value: parseFloat(metrics.packetLoss) }].slice(-60),
          download: [...prev.download, { time: timestamp, value: parseFloat(metrics.download) }].slice(-60),
          upload: [...prev.upload, { time: timestamp, value: parseFloat(metrics.upload) }].slice(-60)
        }));
        
        setLoading(false);
      },
      { interface: selectedInterface }
    );
    
    // Clean up subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [selectedInterface]);
  
  // Manual refresh button handler
  const handleRefresh = async () => {
    setLoading(true);
    
    try {
      // Get fresh metrics
      const metrics = await getCurrentNetworkMetrics(selectedInterface);
      
      // Update current metrics
      setCurrentMetrics(metrics);
      
      // Update real-time data
      const timestamp = new Date(metrics.timestamp).toISOString();
      
      setRealtimeData(prev => ({
        latency: [...prev.latency, { time: timestamp, value: parseFloat(metrics.latency) }].slice(-60),
        packetLoss: [...prev.packetLoss, { time: timestamp, value: parseFloat(metrics.packetLoss) }].slice(-60),
        download: [...prev.download, { time: timestamp, value: parseFloat(metrics.download) }].slice(-60),
        upload: [...prev.upload, { time: timestamp, value: parseFloat(metrics.upload) }].slice(-60)
      }));
    } catch (error) {
      console.error('Error refreshing metrics:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle interface change
  const handleInterfaceChange = (event) => {
    const newInterface = event.target.value;
    
    // Call parent handler if provided
    if (onInterfaceChange) {
      onInterfaceChange(newInterface);
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Network Latency</h3>
            {loading && <Spinner size="sm" />}
          </div>
        </CardHeader>
        <CardContent>
          <LineChart 
            data={realtimeData.latency} 
            yAxisLabel="ms" 
            color="#4f46e5"
            height={200}
          />
          <div className="mt-2 text-center">
            <span className="text-2xl font-bold">{currentMetrics.latency.toFixed(1)}</span>
            <span className="text-sm ml-1">ms</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Packet Loss</h3>
            {loading && <Spinner size="sm" />}
          </div>
        </CardHeader>
        <CardContent>
          <LineChart 
            data={realtimeData.packetLoss} 
            yAxisLabel="%" 
            color="#ef4444"
            height={200}
          />
          <div className="mt-2 text-center">
            <span className="text-2xl font-bold">{currentMetrics.packetLoss.toFixed(2)}</span>
            <span className="text-sm ml-1">%</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Download Speed</h3>
            {loading && <Spinner size="sm" />}
          </div>
        </CardHeader>
        <CardContent>
          <LineChart 
            data={realtimeData.download} 
            yAxisLabel="Mbps" 
            color="#10b981"
            height={200}
          />
          <div className="mt-2 text-center">
            <span className="text-2xl font-bold">{currentMetrics.download.toFixed(1)}</span>
            <span className="text-sm ml-1">Mbps</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Upload Speed</h3>
            {loading && <Spinner size="sm" />}
          </div>
        </CardHeader>
        <CardContent>
          <LineChart 
            data={realtimeData.upload} 
            yAxisLabel="Mbps" 
            color="#3b82f6"
            height={200}
          />
          <div className="mt-2 text-center">
            <span className="text-2xl font-bold">{currentMetrics.upload.toFixed(1)}</span>
            <span className="text-sm ml-1">Mbps</span>
          </div>
        </CardContent>
      </Card>
      
      <div className="col-span-1 md:col-span-2 flex justify-between items-center">
        <Select
          value={selectedInterface}
          onChange={handleInterfaceChange}
          disabled={loading}
        >
          <option value="default">Default Interface</option>
          <option value="wlan0">WiFi (wlan0)</option>
          <option value="eth0">Ethernet (eth0)</option>
        </Select>
        
        <Button onClick={handleRefresh} disabled={loading}>
          {loading ? <Spinner size="sm" /> : 'Refresh'}
        </Button>
      </div>
    </div>
  );
};

export default RealTimeNetworkMonitor;

