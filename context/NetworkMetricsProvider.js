"use client";

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  measureLatency, 
  estimatePacketLoss,
  isOnline as checkIsOnline,
  getAllNetworkMetrics,
  getNetworkInterfaces
} from '@/services/networkMetricsService';
import { getSpeedTestResults } from '@/services/speedTestService';
import { saveNetworkMetrics, getNetworkMetricsHistory, saveNetworkInterfaceHistory, getNetworkInterfaceHistory } from '@/services/supabaseService';
import { supabase } from '@/services/supabaseClient';
import { networkApi, clearCacheByPattern } from '@/services/apiClient';
import { prefetchDNS, preconnect } from 'react-dom';

export const NetworkMetricsContext = createContext();

export const NetworkMetricsProvider = ({ children }) => {
  // State for network metrics
  const [avgLatency, setAvgLatency] = useState(0);
  const [avgPacketLoss, setAvgPacketLoss] = useState(0);
  const [internetSpeed, setInternetSpeed] = useState({ download: 0, upload: 0 });
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add additional state for dashboard
  const [selectedInterface, setSelectedInterface] = useState('');
  const [interfaces, setInterfaces] = useState([]);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [packetLossHistory, setPacketLossHistory] = useState([]);
  const [latencyHistory, setLatencyHistory] = useState([]);
  const [speedHistory, setSpeedHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Add Nginx traffic metrics state
  const [nginxTraffic, setNginxTraffic] = useState({
    requestCount: 0,
    avgResponseTime: 0,
    errorRate: 0,
    trafficByStatus: {},
    trafficByIP: {},
    trafficByEndpoint: {},
    recentLogs: []
  });

  // Add interface history state
  const [interfaceHistory, setInterfaceHistory] = useState([]);
  const [loadingInterfaceHistory, setLoadingInterfaceHistory] = useState(false);
  
  // Add interface metadata state
  const [interfaceMetadata, setInterfaceMetadata] = useState({});
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  
  // Add retry mechanism state
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryTimeoutRef = useRef(null);
  
  // Add data sampling state for large datasets
  const [timeRange, setTimeRange] = useState('24h'); // '1h', '6h', '24h', '7d', '30d'
  const [samplingRate, setSamplingRate] = useState('raw'); // 'raw', 'minute', 'hour', 'day'
  
  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Refresh data when coming back online
      if (selectedInterface) {
        updateMetrics();
      }
    };
    
    const handleOffline = () => setIsOnline(false);
    
    // Set initial online status
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
    
    // Add event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Cleanup
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [selectedInterface]);

  // Generate mock history data
  const generateMockHistoryData = useCallback(() => {
    const now = new Date();
    const data = [];
    
    for (let i = 0; i < 24; i++) {
      const time = new Date(now);
      time.setHours(time.getHours() - (23 - i));
      
      data.push({
        time: time.toISOString(),
        value: 0 // Will be set differently for each metric
      });
    }
    
    return data;
  }, []);

  // Function to update all metrics with enhanced error handling
  const updateMetrics = useCallback(async () => {
    if (!isOnline || !selectedInterface) {
      console.log('Network offline or no interface selected, using zero values');
      setAvgLatency(0);
      setAvgPacketLoss(0);
      setInternetSpeed({ download: 0, upload: 0 });
      setUploadSpeed(0);
      setLastUpdated(new Date());
      
      // Generate empty history data
      const emptyHistory = generateMockHistoryData().map(item => ({
        ...item,
        value: 0
      }));
      
      setPacketLossHistory(emptyHistory);
      setLatencyHistory(emptyHistory);
      setSpeedHistory(emptyHistory);
      
      setNginxTraffic({
        requestCount: 0,
        avgResponseTime: 0,
        errorRate: 0,
        trafficByStatus: {},
        trafficByIP: {},
        trafficByEndpoint: {},
        recentLogs: []
      });
      
      setLoading(false);
      setLoadingHistory(false);
      return;
    }
    
    setLoading(true);
    setLoadingHistory(true);
    setError(null);
    
    try {
      // Prefetch DNS for API endpoints to improve performance
      prefetchDNS(window.location.origin);
      preconnect(window.location.origin);
      
      // First get Nginx traffic data
      console.log('[NGINX] Fetching traffic data...');
      let nginxData = null;
      try {
        nginxData = await networkApi.getNginxLogs();
        console.log('[NGINX] Data received:', {
          requestCount: nginxData.requestCount,
          avgResponseTime: nginxData.avgResponseTime,
          errorRate: nginxData.errorRate,
          source: nginxData.meta?.source
        });
        
        if (nginxData.trafficVolume) {
          console.log('[NGINX] Traffic volume:', {
            downloadSpeedMbps: nginxData.trafficVolume.downloadSpeedMbps,
            uploadSpeedMbps: nginxData.trafficVolume.uploadSpeedMbps,
            timeSpanSeconds: nginxData.trafficVolume.timeSpanSeconds
          });
        }
        
        setNginxTraffic(nginxData);
      } catch (nginxError) {
        console.warn('[NGINX] Failed to fetch logs:', nginxError);
      }
      
      // Check if we can use Nginx data for speed calculations
      let speedFromNginx = null;
      if (nginxData && nginxData.trafficVolume) {
        speedFromNginx = {
          download: nginxData.trafficVolume.downloadSpeedMbps || 0,
          upload: nginxData.trafficVolume.uploadSpeedMbps || 0
        };
        
        console.log('[NGINX] Speed from logs:', speedFromNginx);
      }
      
      // Fetch network metrics from API
      console.log(`Fetching network metrics for interface: ${selectedInterface}`);
      let metricsData;
      
      try {
        metricsData = await networkApi.getMetrics(selectedInterface);
        console.log('Network metrics received:', metricsData);
        
        // Reset retry count on successful fetch
        setRetryCount(0);
      } catch (metricsError) {
        console.error('Failed to fetch network data:', metricsError);
        
        // Implement retry with exponential backoff
        if (retryCount < maxRetries) {
          const nextRetryCount = retryCount + 1;
          setRetryCount(nextRetryCount);
          
          const retryDelay = Math.pow(2, nextRetryCount) * 1000; // Exponential backoff
          console.log(`Retrying in ${retryDelay}ms (attempt ${nextRetryCount} of ${maxRetries})...`);
          
          // Clear any existing timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          
          // Set new timeout for retry
          retryTimeoutRef.current = setTimeout(() => {
            updateMetrics();
          }, retryDelay);
          
          throw metricsError;
        }
        
        // If all retries failed, try to get fallback data
        console.log('All retries failed, using fallback data');
        metricsData = await networkApi.getFallbackData().metrics;
      }
      
      // Update latency and packet loss from API
      setAvgLatency(metricsData.latency || 0);
      setAvgPacketLoss(metricsData.packetLoss || 0);
      
      // Use Nginx-based speed if available and reasonable, otherwise use API speed
      const finalSpeed = {
        download: (speedFromNginx && speedFromNginx.download > 1) 
          ? speedFromNginx.download 
          : (metricsData.download || 0),
        upload: (speedFromNginx && speedFromNginx.upload > 0.5) 
          ? speedFromNginx.upload 
          : (metricsData.upload || 0)
      };
      
      console.log('[NGINX] Final speed values:', finalSpeed, 
        'Source:', (speedFromNginx && speedFromNginx.download > 1) ? 'nginx' : 'api');
      
      setInternetSpeed(finalSpeed);
      setUploadSpeed(finalSpeed.upload);
      
      // Try to get authentication status for Supabase operations
      let isAuthenticated = false;
      try {
        const { data: userData, error: authError } = await supabase.auth.getUser();
        isAuthenticated = !!userData?.user?.id;
        
        if (authError) {
          console.warn('Authentication error:', authError.message);
        }
      } catch (authError) {
        console.warn('Failed to check authentication status:', authError);
      }
      
      // Only save to Supabase if authenticated
      if (isAuthenticated) {
        try {
          await saveNetworkMetrics({
            latency: metricsData.latency,
            packetLoss: metricsData.packetLoss,
            download: finalSpeed.download,
            upload: finalSpeed.upload
          }, selectedInterface);
        } catch (saveError) {
          console.warn('Failed to save metrics to Supabase:', saveError);
        }
      }
      
      // Try to get history from Supabase if authenticated
      let historyData = null;
      if (isAuthenticated) {
        try {
          historyData = await getNetworkMetricsHistory(selectedInterface, 24);
        } catch (historyError) {
          console.warn('Failed to get history from Supabase:', historyError);
        }
      }
      
      if (historyData && historyData.packetLoss && historyData.packetLoss.length > 0) {
        // Update history data with real data from Supabase
        setPacketLossHistory(historyData.packetLoss.map(item => ({
          time: new Date(item.timestamp).toISOString(),
          value: item.value
        })));
        
        setLatencyHistory(historyData.latency.map(item => ({
          time: new Date(item.timestamp).toISOString(),
          value: item.value
        })));
        
        setSpeedHistory(historyData.speed.map(item => ({
          time: new Date(item.timestamp).toISOString(),
          value: item.value
        })));
      } else {
        // Fallback to API if Supabase data isn't available
        try {
          const historyResponse = await networkApi.getHistory(selectedInterface);
          
          if (historyResponse.packetLoss && Array.isArray(historyResponse.packetLoss)) {
            setPacketLossHistory(historyResponse.packetLoss.map(item => ({
              time: item.timestamp,
              value: item.value
            })));
          }
          
          if (historyResponse.latency && Array.isArray(historyResponse.latency)) {
            setLatencyHistory(historyResponse.latency.map(item => ({
              time: item.timestamp,
              value: item.value
            })));
          }
          
          if (historyResponse.speed && Array.isArray(historyResponse.speed)) {
            setSpeedHistory(historyResponse.speed.map(item => ({
              time: item.timestamp,
              value: item.value
            })));
          }
        } catch (apiHistoryError) {
          console.warn('Failed to get history from API:', apiHistoryError);
          
          // Use fallback data API
          try {
            const fallbackData = await networkApi.getFallbackData();
            
            // Set metrics from fallback data
            setAvgLatency(fallbackData.metrics.latency || 50);
            setAvgPacketLoss(fallbackData.metrics.packetLoss || 1);
            setInternetSpeed({
              download: fallbackData.metrics.download || 25,
              upload: fallbackData.metrics.upload || 10
            });
            setUploadSpeed(fallbackData.metrics.upload || 10);
            
            // Set history from fallback data
            setPacketLossHistory(fallbackData.history.packetLoss || []);
            setLatencyHistory(fallbackData.history.latency || []);
            setSpeedHistory(fallbackData.history.speed || []);
          } catch (fallbackErr) {
            console.error('Error fetching fallback data:', fallbackErr);
            
            // Use static fallback values as last resort
            setAvgLatency(50);
            setAvgPacketLoss(1);
            setInternetSpeed({ download: 25, upload: 10 });
            setUploadSpeed(10);
            
            // Generate consistent fallback history data
            const baseHistory = generateMockHistoryData();
            const now = new Date();
            
            // Create consistent patterns instead of random data
            setPacketLossHistory(baseHistory.map((item, index) => ({
              ...item,
              value: 1 + (index % 3) * 0.5 // Creates a repeating pattern: 1, 1.5, 2, 1, 1.5, 2, ...
            })));
            
            setLatencyHistory(baseHistory.map((item, index) => ({
              ...item,
              value: 40 + (index % 5) * 10 // Creates a repeating pattern: 40, 50, 60, 70, 80, 40, ...
            })));
            
            setSpeedHistory(baseHistory.map((item, index) => ({
              ...item,
              value: 20 + (index % 4) * 5 // Creates a repeating pattern: 20, 25, 30, 35, 20, ...
            })));
          }
        }
      }
      
      // Save interface data to Supabase if authenticated
      if (isAuthenticated && selectedInterface) {
        try {
          // Get interface details
          const interfaceDetails = interfaces.find(iface => 
            typeof iface === 'string' 
              ? iface === selectedInterface
              : iface.name === selectedInterface
          );
          
          // Prepare interface data
          const interfaceData = {
            interfaceName: selectedInterface,
            status: 'up', // Default status
            ipAddress: '0.0.0.0', // Default IP
            macAddress: '00:00:00:00:00:00', // Default MAC
            txBytes: 0,
            rxBytes: 0,
            txPackets: 0,
            rxPackets: 0
          };
          
          // If we have detailed interface info, use it
          if (interfaceDetails && typeof interfaceDetails === 'object') {
            interfaceData.status = interfaceDetails.status || 'up';
            interfaceData.ipAddress = interfaceDetails.ipAddress || '0.0.0.0';
            interfaceData.macAddress = interfaceDetails.macAddress || '00:00:00:00:00:00';
            interfaceData.txBytes = interfaceDetails.txBytes || 0;
            interfaceData.rxBytes = interfaceDetails.rxBytes || 0;
            interfaceData.txPackets = interfaceDetails.txPackets || 0;
            interfaceData.rxPackets = interfaceDetails.rxPackets || 0;
          }
          
          // Save to Supabase
          await saveNetworkInterfaceHistory(interfaceData);
          console.log('Saved interface history to Supabase');
        } catch (interfaceError) {
          console.warn('Failed to save interface history to Supabase:', interfaceError);
        }
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error updating metrics:', err);
      setError('Failed to update network metrics');
      
      // Fallback to API endpoints that provide consistent test data
      try {
        const fallbackResponse = await fetch('/api/network/fallback-data');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          
          // Set metrics from fallback data
          setAvgLatency(fallbackData.metrics.latency || 50);
          setAvgPacketLoss(fallbackData.metrics.packetLoss || 1);
          setInternetSpeed({
            download: fallbackData.metrics.download || 25,
            upload: fallbackData.metrics.upload || 10
          });
          setUploadSpeed(fallbackData.metrics.upload || 10);
          
          // Set history from fallback data
          setPacketLossHistory(fallbackData.history.packetLoss || []);
          setLatencyHistory(fallbackData.history.latency || []);
          setSpeedHistory(fallbackData.history.speed || []);
        } else {
          throw new Error('Fallback data unavailable');
        }
      } catch (fallbackErr) {
        console.error('Error fetching fallback data:', fallbackErr);
        
        // Use static fallback values as last resort
        setAvgLatency(50);
        setAvgPacketLoss(1);
        setInternetSpeed({ download: 25, upload: 10 });
        setUploadSpeed(10);
        
        // Generate consistent fallback history data
        const baseHistory = generateMockHistoryData();
        const now = new Date();
        
        // Create consistent patterns instead of random data
        setPacketLossHistory(baseHistory.map((item, index) => ({
          ...item,
          value: 1 + (index % 3) * 0.5 // Creates a repeating pattern: 1, 1.5, 2, 1, 1.5, 2, ...
        })));
        
        setLatencyHistory(baseHistory.map((item, index) => ({
          ...item,
          value: 40 + (index % 5) * 10 // Creates a repeating pattern: 40, 50, 60, 70, 80, 40, ...
        })));
        
        setSpeedHistory(baseHistory.map((item, index) => ({
          ...item,
          value: 20 + (index % 4) * 5 // Creates a repeating pattern: 20, 25, 30, 35, 20, ...
        })));
      }
    } finally {
      setLoading(false);
      setLoadingHistory(false);
    }
  }, [isOnline, selectedInterface, generateMockHistoryData]);

  // Fetch network interfaces - DEFINE THIS AFTER updateMetrics
  const fetchInterfaces = useCallback(async () => {
    try {
      // Try to get real interfaces
      const networkInterfaces = await getNetworkInterfaces();
      
      // Process interfaces to keep only relevant ones (remove Bluetooth, etc.)
      const relevantInterfaces = Array.isArray(networkInterfaces) 
        ? networkInterfaces
            .filter(iface => {
              // Convert to string for checking
              const ifaceName = typeof iface === 'string' 
                ? iface 
                : iface && typeof iface === 'object' && iface.name 
                  ? iface.name 
                  : String(iface || '');
              
              // Filter out Bluetooth and keep only network interfaces
              return ifaceName && 
                    !ifaceName.toLowerCase().includes('bluetooth') &&
                    (ifaceName.toLowerCase().includes('eth') || 
                     ifaceName.toLowerCase().includes('wlan') ||
                     ifaceName.toLowerCase().includes('wi-fi') ||
                     ifaceName.toLowerCase().includes('lo') ||
                     ifaceName.toLowerCase().includes('local'));
            })
            .map(iface => {
              // Normalize to string format
              if (typeof iface === 'string') return iface;
              if (iface && typeof iface === 'object' && iface.name) return iface.name;
              return String(iface || '');
            })
            .filter(Boolean)
        : [];
      
      if (relevantInterfaces.length > 0) {
        setInterfaces(relevantInterfaces);
        
        // Select the first interface by default if none is selected
        if (!selectedInterface || !relevantInterfaces.includes(selectedInterface)) {
          setSelectedInterface(relevantInterfaces[0]);
        }
      } else {
        // Fallback to mock interfaces
        const mockInterfaces = ['eth0', 'wlan0'];
        
        setInterfaces(mockInterfaces);
        
        // Select the first interface by default if none is selected
        if (!selectedInterface || !mockInterfaces.includes(selectedInterface)) {
          setSelectedInterface(mockInterfaces[0]);
        }
      }
      
      // Update metrics after interfaces are loaded
      setTimeout(() => {
        updateMetrics();
      }, 100);
    } catch (err) {
      console.error('Error fetching network interfaces:', err);
      
      // Fallback to mock interfaces
      const mockInterfaces = ['eth0', 'wlan0'];
      
      setInterfaces(mockInterfaces);
      
      // Select the first interface by default if none is selected
      if (!selectedInterface || !mockInterfaces.includes(selectedInterface)) {
        setSelectedInterface(mockInterfaces[0]);
      }
      
      // Update metrics after interfaces are loaded
      setTimeout(() => {
        updateMetrics();
      }, 100);
    }
  }, [selectedInterface, updateMetrics]);

  // Add this function to the NetworkMetricsProvider component
  const fetchInterfaceHistory = useCallback(async (days = 7) => {
    if (!selectedInterface) return;
    
    setLoadingInterfaceHistory(true);
    
    try {
      console.log(`Fetching interface history for ${selectedInterface} (${days} days)`);
      
      // Try to get authentication status for Supabase operations
      let isAuthenticated = false;
      try {
        const { data: userData, error: authError } = await supabase.auth.getUser();
        isAuthenticated = !!userData?.user?.id;
        
        if (authError) {
          console.warn('Authentication error:', authError.message);
        }
      } catch (authError) {
        console.warn('Failed to check authentication status:', authError);
      }
      
      // Try to get history from Supabase if authenticated
      let historyData = [];
      if (isAuthenticated) {
        try {
          historyData = await getNetworkInterfaceHistory(selectedInterface, days);
          console.log(`Retrieved ${historyData.length} interface history records from Supabase`);
        } catch (historyError) {
          console.warn('Failed to get interface history from Supabase:', historyError);
        }
      }
      
      if (historyData && historyData.length > 0) {
        setInterfaceHistory(historyData);
      } else {
        // Fallback to API if Supabase data isn't available
        try {
          const historyResponse = await fetch(`/api/network/interfaces/history?interface=${encodeURIComponent(selectedInterface)}&days=${days}`);
          if (historyResponse.ok) {
            const apiHistoryData = await historyResponse.json();
            
            if (apiHistoryData.history && Array.isArray(apiHistoryData.history)) {
              setInterfaceHistory(apiHistoryData.history);
              console.log(`Retrieved ${apiHistoryData.history.length} interface history records from API`);
            } else {
              throw new Error('Invalid history data format');
            }
          } else {
            throw new Error('Failed to fetch interface history data');
          }
        } catch (apiHistoryError) {
          console.warn('Failed to get interface history from API:', apiHistoryError);
          setInterfaceHistory([]);
        }
      }
    } catch (error) {
      console.error('Error fetching interface history:', error);
      setInterfaceHistory([]);
    } finally {
      setLoadingInterfaceHistory(false);
    }
  }, [selectedInterface]);

  // Update metrics on mount and when online status changes
  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      fetchInterfaces();
      
      // Set up interval to update metrics periodically
      const intervalId = setInterval(updateMetrics, 5 * 60 * 1000); // Every 5 minutes
      
      // Fetch interface history initially
      fetchInterfaceHistory();
      
      // Set up interval to update interface history periodically (less frequently)
      const historyIntervalId = setInterval(() => {
        fetchInterfaceHistory();
      }, 30 * 60 * 1000); // Every 30 minutes
      
      return () => {
        clearInterval(intervalId);
        clearInterval(historyIntervalId);
      };
    }
  }, [fetchInterfaces, updateMetrics, fetchInterfaceHistory]);

  // Refresh metrics manually
  const refreshMetrics = useCallback(() => {
    updateMetrics();
  }, [updateMetrics]);

  const value = {
    avgLatency,
    avgPacketLoss,
    internetSpeed,
    isOnline,
    lastUpdated,
    loading,
    error,
    updateMetrics,
    // Additional values for dashboard
    selectedInterface,
    setSelectedInterface,
    interfaces,
    fetchInterfaces,
    uploadSpeed,
    packetLossHistory,
    latencyHistory,
    speedHistory,
    loadingHistory,
    refreshMetrics,
    // Nginx traffic data
    nginxTraffic,
    // Interface history data
    interfaceHistory,
    loadingInterfaceHistory,
    fetchInterfaceHistory
  };

  return (
    <NetworkMetricsContext.Provider value={value}>
      {children}
    </NetworkMetricsContext.Provider>
  );
};

export default NetworkMetricsProvider;
