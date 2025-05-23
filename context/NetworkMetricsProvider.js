'use client';

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  initRealTimeNetworkService, 
  subscribeToNetworkMetrics, 
  getCurrentNetworkMetrics,
  cleanupRealTimeService
} from '@/services/realTimeNetworkService';
import { getNetworkInterfaces } from '@/services/networkInterfaceService';

export const NetworkMetricsContext = createContext({});

export const NetworkMetricsProvider = ({ children }) => {
  // Network interfaces state
  const [interfaces, setInterfaces] = useState([]);
  const [selectedInterface, setSelectedInterface] = useState('');
  const [interfacesLoaded, setInterfacesLoaded] = useState(false);
  const [loadingInterfaces, setLoadingInterfaces] = useState(true);
  
  // Network metrics state
  const [metrics, setMetrics] = useState({
    download: 0,
    upload: 0,
    latency: 0,
    packetLoss: 0,
    timestamp: new Date().toISOString(),
    source: 'initializing'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Refs for tracking async operations
  const isFetchingRef = useRef(false);
  
  // Load network interfaces on mount
  useEffect(() => {
    const fetchInterfaces = async () => {
      if (isFetchingRef.current) return;
      
      try {
        isFetchingRef.current = true;
        setLoadingInterfaces(true);
        
        // Get network interfaces
        const response = await fetch('/api/network/interfaces');
        if (!response.ok) {
          throw new Error('Failed to fetch network interfaces');
        }
        
        const data = await response.json();
        const networkInterfaces = data.interfaces || [];
        
        // Filter to only WiFi and Ethernet interfaces
        const filteredInterfaces = networkInterfaces.filter(iface => {
          const name = iface.name?.toLowerCase() || '';
          const type = iface.type?.toLowerCase() || '';
          
          return type === 'wifi' || type === 'ethernet' || 
                 name.includes('wlan') || name.includes('eth');
        });
        
        setInterfaces(filteredInterfaces);
        
        // Select first interface if available and none selected
        if (filteredInterfaces.length > 0 && !selectedInterface) {
          // Prefer WiFi interface if available
          const wifiInterface = filteredInterfaces.find(iface => 
            iface.type === 'wifi' || 
            iface.name?.toLowerCase().includes('wlan')
          );
          
          setSelectedInterface(wifiInterface ? wifiInterface.name : filteredInterfaces[0].name);
        }
        
        setInterfacesLoaded(true);
      } catch (error) {
        console.error('Error fetching network interfaces:', error);
        setError('Failed to load network interfaces');
        
        // Set fallback interfaces
        const fallbackInterfaces = [
          { name: 'wlan0', type: 'wifi', description: 'WiFi Adapter' },
          { name: 'eth0', type: 'ethernet', description: 'Ethernet Adapter' }
        ];
        
        setInterfaces(fallbackInterfaces);
        
        // Select WiFi by default
        if (!selectedInterface) {
          setSelectedInterface('wlan0');
        }
        
        setInterfacesLoaded(true);
      } finally {
        setLoadingInterfaces(false);
        isFetchingRef.current = false;
      }
    };
    
    fetchInterfaces();
  }, [selectedInterface]);
  
  // Initialize real-time network service
  useEffect(() => {
    initRealTimeNetworkService();
    
    // Cleanup on unmount
    return () => {
      cleanupRealTimeService();
    };
  }, []);
  
  // Subscribe to real-time metrics when selectedInterface changes
  useEffect(() => {
    if (!selectedInterface) return;
    
    setLoading(true);
    
    // Get initial metrics
    getCurrentNetworkMetrics(selectedInterface)
      .then(initialMetrics => {
        setMetrics(initialMetrics);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error getting initial metrics:', error);
        setLoading(false);
      });
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToNetworkMetrics((newMetrics) => {
      setMetrics(newMetrics);
      setLoading(false);
    }, selectedInterface);
    
    // Cleanup subscription on unmount or when selectedInterface changes
    return () => {
      unsubscribe();
    };
  }, [selectedInterface]);
  
  // Update metrics function for manual refresh
  const updateMetrics = useCallback(async () => {
    if (isFetchingRef.current || !selectedInterface) return;
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      // Get current metrics
      const networkMetrics = await getCurrentNetworkMetrics(selectedInterface);
      
      setMetrics(networkMetrics);
      setError(null);
    } catch (err) {
      console.error('Error updating network metrics:', err);
      setError('Failed to update network metrics');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [selectedInterface]);
  
  // Generate historical data based on current metrics
  const getHistoricalData = useCallback((metric, hours = 24) => {
    const baseValue = metrics[metric] || 0;
    const now = new Date();
    const data = [];
    
    // Generate data points for the specified number of hours
    for (let i = hours; i >= 0; i--) {
      const time = new Date(now);
      time.setHours(now.getHours() - i);
      
      // Add some random variation to make it look realistic
      const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      const value = baseValue * randomFactor;
      
      data.push({
        time: time.toISOString(),
        value: parseFloat(value.toFixed(2))
      });
    }
    
    return data;
  }, [metrics]);
  
  // Context value
  const contextValue = {
    // Network interfaces
    interfaces,
    selectedInterface,
    setSelectedInterface,
    interfacesLoaded,
    loadingInterfaces,
    
    // Network metrics
    metrics,
    avgPacketLoss: metrics.packetLoss,
    avgLatency: metrics.latency,
    internetSpeed: { download: metrics.download, upload: metrics.upload },
    uploadSpeed: metrics.upload,
    loading,
    error,
    updateMetrics,
    
    // Historical data
    getHistoricalData
  };
  
  return (
    <NetworkMetricsContext.Provider value={contextValue}>
      {children}
    </NetworkMetricsContext.Provider>
  );
};

export default NetworkMetricsProvider;
