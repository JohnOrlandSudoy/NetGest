"use client";

import React, { createContext, useState, useEffect, useRef, useCallback, useContext } from 'react';

// Create the context with default values
export const NetworkMetricsContext = createContext({
  interfaces: [],
  selectedInterface: '',
  setSelectedInterface: () => {},
  avgPacketLoss: 0,
  avgLatency: 0,
  internetSpeed: { download: 0, upload: 0 },
  packetLossHistory: [],
  latencyHistory: [],
  speedHistory: [],
  loading: true,
  isMonitoring: false,
  isPolling: false,
  refreshMetrics: () => {},
  startMonitoring: () => {},
  stopMonitoring: () => {},
  startPolling: () => {},
  stopPolling: () => {},
  realtimeMetrics: null,
  setRealtimeMetrics: () => {},
  error: null,
  clearError: () => {},
  trafficData: {
    video: { packets: 0, bytes: 0, bitrate: 0, details: [] },
    audio: { packets: 0, bytes: 0, bitrate: 0, details: [] },
    voice: { packets: 0, bytes: 0, bitrate: 0, details: [] },
    total: { packets: 0, bytes: 0, bitrate: 0 }
  },
  fetchTrafficData: () => {},
  fetchNetworkMetrics: () => Promise.resolve(null),
  setAvgLatency: () => {},
  setAvgPacketLoss: () => {},
  setInternetSpeed: () => {}
});

// Add these constants at the top
const STORAGE_KEYS = {
  PACKET_LOSS: 'network_metrics_packet_loss',
  LATENCY: 'network_metrics_latency',
  DOWNLOAD: 'network_metrics_download',
  UPLOAD: 'network_metrics_upload',
  SELECTED_INTERFACE: 'selectedInterface',
  MONITORING_STATE: 'isMonitoring',
  TRAFFIC_DATA: 'trafficData'
};

// Add these helper functions
const getStoredData = (key) => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveData = (key, value) => {
  if (typeof window === 'undefined') return;
  const data = getStoredData(key);
  const newData = [...data, { timestamp: new Date().toISOString(), value }];
  // Keep only last 1000 entries
  const trimmedData = newData.slice(-1000);
  localStorage.setItem(key, JSON.stringify(trimmedData));
};

// Default interface ID that works with TShark
const DEFAULT_INTERFACE = '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}';

export const NetworkMetricsProvider = ({ children, pollingInterval = 10000 }) => {
  // State for network interfaces
  const [interfaces, setInterfaces] = useState([]);
  // Set a strong default fallback interface based on user input
  const [selectedInterface, setSelectedInterface] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.SELECTED_INTERFACE) || DEFAULT_INTERFACE;
    }
    return DEFAULT_INTERFACE;
  });
  
  // State for network metrics
  const [avgPacketLoss, setAvgPacketLoss] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [internetSpeed, setInternetSpeed] = useState({ download: 0, upload: 0 });
  
  // State for historical data
  const [packetLossHistory, setPacketLossHistory] = useState([]);
  const [latencyHistory, setLatencyHistory] = useState([]);
  const [speedHistory, setSpeedHistory] = useState([]);
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Monitoring state
  const [isMonitoring, setIsMonitoring] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.MONITORING_STATE) === 'true';
    }
    return false;
  });
  const [realtimeMetrics, setRealtimeMetrics] = useState(null);
  
  // Polling state and ref for interval
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  
  // Server URL
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

  // Add new state for traffic analysis
  const [trafficData, setTrafficData] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.TRAFFIC_DATA);
      return saved ? JSON.parse(saved) : {
        video: { packets: 0, bytes: 0, bitrate: 0, details: [] },
        audio: { packets: 0, bytes: 0, bitrate: 0, details: [] },
        voice: { packets: 0, bytes: 0, bitrate: 0, details: [] },
        total: { packets: 0, bytes: 0, bitrate: 0 }
      };
    }
    return {
      video: { packets: 0, bytes: 0, bitrate: 0, details: [] },
      audio: { packets: 0, bytes: 0, bitrate: 0, details: [] },
      voice: { packets: 0, bytes: 0, bitrate: 0, details: [] },
      total: { packets: 0, bytes: 0, bitrate: 0 }
    };
  });

  // Error handling utility with more context
  const handleError = (error, context, currentState) => {
    console.error(`Error in ${context}:`, error, { currentState });
    setError({
      message: error.message || 'An error occurred',
      context, 
      timestamp: new Date().toISOString(),
      details: currentState
    });
    return null;
  };

  // Clear error state
  const clearError = () => setError(null);

  // Validate metrics data
  const validateMetrics = (data) => {
    if (!data) return false;
    
    const requiredFields = ['packetLoss', 'latency', 'downloadSpeed', 'uploadSpeed'];
    return requiredFields.every(field => 
      typeof data[field] === 'number' && 
      !isNaN(data[field]) && 
      isFinite(data[field])
    );
  };

  // Format interface name for API
  const formatInterfaceName = (name) => {
    if (!name) return '';
    // Remove any backslashes and encode the name
    return encodeURIComponent(name.replace(/\\/g, ''));
  };

  // Load persistent state from localStorage on mount
  useEffect(() => {
    console.log('Effect: Loading persistent state');
    const loadPersistentState = () => {
      try {
        const savedState = localStorage.getItem('networkMetricsState');
        if (savedState) {
          const state = JSON.parse(savedState);
          setIsMonitoring(state.isMonitoring || false);
          // Defer setSelectedInterface until after interfaces are fetched to avoid conflicts
          // if (state.selectedInterface) { setSelectedInterface(state.selectedInterface); }
          if (state.realtimeMetrics && validateMetrics(state.realtimeMetrics)) {
            setRealtimeMetrics(state.realtimeMetrics);
          }
        }
        console.log('Persistent state loaded');
      } catch (error) {
        handleError(error, 'loading persistent state', { selectedInterface });
      } finally {
         // initialLoadComplete is set after fetchInterfaces
      }
    };

    loadPersistentState();
  }, []); // Run only once on mount

  // Save state to localStorage when it changes (excluding loading/error)
  useEffect(() => {
    console.log('Effect: Saving persistent state', { isMonitoring, selectedInterface, realtimeMetrics, initialLoadComplete });
    const saveState = () => {
      try {
        const state = {
          isMonitoring,
          selectedInterface,
          realtimeMetrics: validateMetrics(realtimeMetrics) ? realtimeMetrics : null
        };
        localStorage.setItem('networkMetricsState', JSON.stringify(state));
        console.log('Persistent state saved', state);
      } catch (error) {
        handleError(error, 'saving persistent state', { selectedInterface });
      }
    };

    // Only save state after initial load is complete and relevant state changes
    // Also ensure selectedInterface is set before saving
    if (initialLoadComplete && selectedInterface) { 
      saveState();
    }

  }, [isMonitoring, selectedInterface, realtimeMetrics, initialLoadComplete]);

  // Fetch network interfaces with improved selection logic and logging
  const fetchInterfaces = useCallback(async () => {
    console.log('Fetching network interfaces...');
    try {
      setLoading(true);
      clearError();
      
      const response = await fetch(`${serverUrl}/api/interfaces`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch interfaces: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.interfaces || !Array.isArray(data.interfaces)) {
        throw new Error('Invalid interfaces data received');
      }
      
      const fetchedInterfaces = data.interfaces;
      setInterfaces(fetchedInterfaces);
      console.log('Fetched interfaces:', fetchedInterfaces);
      
      // Get the previously selected interface from localStorage
      const savedState = localStorage.getItem('networkMetricsState');
      const previouslySelected = savedState ? JSON.parse(savedState).selectedInterface : null;
      console.log('Previously selected from localStorage:', previouslySelected);

      // Determine the interface to select
      let interfaceToSelect = '';

      if (previouslySelected && fetchedInterfaces.some(int => int.name === previouslySelected)) {
        // If previously selected interface exists in the new list, select it
        interfaceToSelect = previouslySelected;
        console.log('Selecting previously selected interface:', interfaceToSelect);
      } else if (fetchedInterfaces.length > 0) {
        // Otherwise, select the first interface from the fetched list
        interfaceToSelect = fetchedInterfaces[0].name;
        console.log('Selecting first fetched interface:', interfaceToSelect);
      } else {
        // If no interfaces fetched, use the strong fallback
        interfaceToSelect = '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F} (Ethernet)';
        console.log('No interfaces fetched, using strong fallback:', interfaceToSelect);
        handleError(new Error('Could not fetch network interfaces, using default fallback.'), 'fetching interfaces', { selectedInterface });
      }
      
      // Only update selectedInterface if it's currently empty or if the determined interface is different
      // This prevents overwriting the strong default immediately if fetchInterfaces is slow or fails initially
      // Use functional update to ensure we have the latest state
      setSelectedInterface(prevSelected => {
         const newSelected = prevSelected === '' ? interfaceToSelect : prevSelected;
         console.log('Setting selected interface:', newSelected, ' (Previous:', prevSelected, ')');
         return newSelected;
      });

    } catch (error) {
      console.error('Error fetching interfaces:', error);
      handleError(error, 'fetching interfaces', { selectedInterface });
      // If fetch fails, and selectedInterface is still empty, set the strong fallback
       setSelectedInterface(prevSelected => {
          if(prevSelected === '') {
             console.log('Fetch failed and selectedInterface is empty, setting strong fallback:', '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F} (Ethernet)');
             return '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F} (Ethernet)';
          }
          console.log('Fetch failed but selectedInterface is not empty:', prevSelected);
          return prevSelected;
       });
      handleError(new Error('Failed to fetch network interfaces, ensuring fallback is set.'), 'fetching interfaces catch', { selectedInterface });

    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
      console.log('fetchInterfaces finished. Initial load complete.', { loading: false, initialLoadComplete: true });
    }
  }, [serverUrl]); 

  // Start monitoring with enhanced error handling
  const startMonitoring = async () => {
    console.log('Attempting to start monitoring...', { selectedInterface });
    if (!selectedInterface) {
      handleError(new Error('No interface selected'), 'starting monitoring pre-check', { selectedInterface });
      return;
    }
    
    try {
      clearError();
      retryCountRef.current = 0;
      
      const formattedInterface = formatInterfaceName(selectedInterface);
      console.log('Starting monitoring for interface:', formattedInterface);
      const response = await fetch(`${serverUrl}/api/network/realtime?interface=${formattedInterface}&action=start`);
      
      if (!response.ok) {
        throw new Error(`Failed to start monitoring: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Failed to start monitoring');
      }
      
      setIsMonitoring(true);
      startPolling();
      console.log('Monitoring started successfully.');
    } catch (error) {
      console.error('Error during startMonitoring:', error);
      handleError(error, 'starting monitoring API call', { selectedInterface });
    }
  };

  // Stop monitoring with enhanced error handling
  const stopMonitoring = async () => {
    console.log('Attempting to stop monitoring...', { selectedInterface });
    if (!selectedInterface) {
      handleError(new Error('No interface selected'), 'stopping monitoring pre-check', { selectedInterface });
      return;
    }
    
    try {
      clearError();
      
      const formattedInterface = formatInterfaceName(selectedInterface);
      console.log('Stopping monitoring for interface:', formattedInterface);
      const response = await fetch(`${serverUrl}/api/network/realtime?interface=${formattedInterface}&action=stop`);
      
      if (!response.ok) {
        throw new Error(`Failed to stop monitoring: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Failed to stop monitoring');
      }
      console.log('Monitoring stopped successfully.');
      
    } catch (error) {
      console.error('Error during stopMonitoring:', error);
      handleError(error, 'stopping monitoring API call', { selectedInterface });
    } finally {
        setIsMonitoring(false);
        stopPolling();
        console.log('Monitoring state set to false, polling stopped.');
    }
  };

  // Start polling with enhanced error handling and logging
  const startPolling = (customInterval) => {
    console.log('Attempting to start polling...', { selectedInterface, isMonitoring, initialLoadComplete });
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      console.log('Cleared existing polling interval.');
    }
    
    const interval = customInterval || pollingInterval;
    console.log('Setting up polling interval:', interval);
    pollingIntervalRef.current = setInterval(async () => {
      // Only poll if monitoring is active, initial load complete, and an interface is selected
      console.log('Polling tick...', { isMonitoring, initialLoadComplete, selectedInterface });
      if (isMonitoring && initialLoadComplete && selectedInterface) {
        try {
          const formattedInterface = formatInterfaceName(selectedInterface);
          console.log('Fetching real-time metrics for interface:', formattedInterface);
          const response = await fetch(`${serverUrl}/api/network/realtime?interface=${formattedInterface}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch metrics: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!data.metrics || !validateMetrics(data.metrics)) {
            throw new Error('Invalid metrics data received');
          }
          
          setRealtimeMetrics(data.metrics);
          retryCountRef.current = 0; // Reset retry count on success
          console.log('Real-time metrics fetched:', data.metrics);
          
        } catch (error) {
          console.error('Error during polling tick:', error);
          retryCountRef.current++;
          console.log('Polling retry count:', retryCountRef.current);
          
          if (retryCountRef.current >= MAX_RETRIES) {
            handleError(error, 'polling metrics retry limit reached', { selectedInterface, retryCount: retryCountRef.current });
            stopPolling();
          }
        }
      } else {
          console.log('Polling conditions not met.', { isMonitoring, initialLoadComplete, selectedInterface });
      }
    }, interval);
    
    setIsPolling(true);
    console.log('Polling started.');
  };

  // Stop polling
  const stopPolling = () => {
    console.log('Attempting to stop polling...');
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('Polling interval cleared.');
    }
    setIsPolling(false);
    retryCountRef.current = 0;
    console.log('Polling stopped.');
  };

  // Initial data fetch effect (interfaces)
  useEffect(() => {
    console.log('Effect: Initial fetchInterfaces on mount.');
    fetchInterfaces();
  }, [fetchInterfaces]);

  // Restore monitoring state on mount (after initial load and interface selection)
  useEffect(() => {
    console.log('Effect: Check if monitoring needs restoring.', { isMonitoring, initialLoadComplete, selectedInterface });
    if (isMonitoring && initialLoadComplete && selectedInterface) {
       console.log('Conditions met, restoring polling.');
      startPolling();
    }
  }, [isMonitoring, initialLoadComplete, selectedInterface, startPolling]); 

  // Add effect to save metrics when they change (after initial load)
  useEffect(() => {
     console.log('Effect: Check if metrics need saving.', { isMonitoring, realtimeMetrics, initialLoadComplete, selectedInterface });
    if (isMonitoring && realtimeMetrics && initialLoadComplete && selectedInterface) { 
      console.log('Conditions met, saving metrics.', realtimeMetrics);
      try {
        // Save each metric type
        saveData(STORAGE_KEYS.PACKET_LOSS, realtimeMetrics.packetLoss);
        saveData(STORAGE_KEYS.LATENCY, realtimeMetrics.latency);
        saveData(STORAGE_KEYS.DOWNLOAD, realtimeMetrics.downloadSpeed);
        saveData(STORAGE_KEYS.UPLOAD, realtimeMetrics.uploadSpeed);

        // Update historical data (moved from polling effect)
        setPacketLossHistory(prev => [...prev, { 
          timestamp: new Date().toISOString(), 
          value: realtimeMetrics.packetLoss 
        }].slice(-100));

        setLatencyHistory(prev => [...prev, { 
          timestamp: new Date().toISOString(), 
          value: realtimeMetrics.latency 
        }].slice(-100));

        setSpeedHistory(prev => [...prev, { 
          timestamp: new Date().toISOString(), 
          download: realtimeMetrics.downloadSpeed,
          upload: realtimeMetrics.uploadSpeed 
        }].slice(-100));
         console.log('Metrics saved and history updated.');
      } catch (error) {
        handleError(error, 'saving metrics data', { selectedInterface, realtimeMetrics });
      }
    }
  }, [isMonitoring, realtimeMetrics, initialLoadComplete, selectedInterface]); 

  // Add effect to load initial data (history) (after initial load)
  useEffect(() => {
      console.log('Effect: Check if initial history needs loading.', { initialLoadComplete });
     if (initialLoadComplete) {
        console.log('Conditions met, loading initial history.');
      try {
        const packetLossData = getStoredData(STORAGE_KEYS.PACKET_LOSS);
        const latencyData = getStoredData(STORAGE_KEYS.LATENCY);
        const downloadData = getStoredData(STORAGE_KEYS.DOWNLOAD);
        const uploadData = getStoredData(STORAGE_KEYS.UPLOAD);

        setPacketLossHistory(packetLossData);
        setLatencyHistory(latencyData);
        setSpeedHistory(downloadData.map((item, index) => ({
          timestamp: item.timestamp,
          download: item.value,
          upload: uploadData[index]?.value || 0
        })));
        console.log('Initial history loaded.');
      } catch (error) {
        handleError(error, 'loading initial data', { selectedInterface });
      }
     }
  }, [initialLoadComplete]);

  // Add function to fetch traffic data with enhanced error handling
  const fetchTrafficData = useCallback(async (type) => {
     console.log('Attempting to fetch traffic data...', { selectedInterface, type });
    if (!selectedInterface) {
      handleError(new Error('No interface selected for traffic analysis'), 'fetching traffic data pre-check', { selectedInterface, type });
      return;
    }

    try {
      const formattedInterface = formatInterfaceName(selectedInterface);
      console.log(`Fetching traffic data for interface ${formattedInterface} and type ${type}...`);
      const response = await fetch(`${serverUrl}/api/network/traffic?interface=${formattedInterface}&count=100&type=${type}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch traffic data: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
         // Update only the specific traffic type data
        setTrafficData(prevData => ({
          ...prevData,
          [type]: data.data[type], // Update the specific type
          total: data.data.total // Update total based on the API response
        }));
        console.log('Traffic Data fetched successfully for type:', type, data.data);
        
        // Log traffic details for debugging
        console.log('Traffic Data Details for type ', type, ':', data.data[type]);
      } else {
         console.error('API reported failure fetching traffic data:', data.error);
        throw new Error(data.error || 'Failed to fetch traffic data');
      }
    } catch (error) {
      console.error('Error during fetchTrafficData:', error);
      handleError(error, `fetching traffic data API call for type ${type}`, { selectedInterface, type });
    }
  }, [selectedInterface, serverUrl]); // fetchTrafficData should depend on selectedInterface and serverUrl

  // Add traffic data to the polling effect (only fetch if monitoring is active AND initial load is complete)
  useEffect(() => {
    console.log('Effect: Check if traffic data polling should start.', { isMonitoring, initialLoadComplete, selectedInterface });
    let intervalId;
    // Only poll if monitoring is active, initial load complete, and an interface is selected
    // Remove automatic traffic data polling here, as it's now triggered manually by buttons
    // if (isMonitoring && initialLoadComplete && selectedInterface) {
    //   console.log('Conditions met, starting traffic data polling.');
    //   // Initial fetch
    //   fetchTrafficData();
      
    //   // Set up polling with a longer interval to avoid overwhelming TShark
    //   intervalId = setInterval(() => {
    //     fetchTrafficData();
    //   }, 30000); // Poll every 30 seconds
    // }

    return () => {
      console.log('Effect cleanup: Stopping traffic data polling.');
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isMonitoring, fetchTrafficData, initialLoadComplete, selectedInterface]); 

  // Save state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SELECTED_INTERFACE, selectedInterface);
      localStorage.setItem(STORAGE_KEYS.MONITORING_STATE, isMonitoring.toString());
      localStorage.setItem(STORAGE_KEYS.TRAFFIC_DATA, JSON.stringify(trafficData));
    }
  }, [selectedInterface, isMonitoring, trafficData]);

  // Add function to fetch network metrics
  const fetchNetworkMetrics = useCallback(async () => {
    console.log('Fetching network metrics...', { selectedInterface });
    if (!selectedInterface) {
      handleError(new Error('No interface selected'), 'fetching network metrics pre-check', { selectedInterface });
      return null;
    }

    try {
      clearError();
      const formattedInterface = formatInterfaceName(selectedInterface);
      console.log('Fetching metrics for interface:', formattedInterface);
      
      const response = await fetch(`${serverUrl}/api/network/metrics?interface=${formattedInterface}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received metrics data:', data);
      
      if (!data.metrics || !validateMetrics(data.metrics)) {
        console.error('Invalid metrics data received:', data.metrics);
        throw new Error('Invalid metrics data received');
      }
      
      // Ensure all metrics are valid numbers
      const metrics = {
        packetLoss: Number(data.metrics.packetLoss) || 0,
        latency: Number(data.metrics.latency) || 0,
        downloadSpeed: Number(data.metrics.downloadSpeed) || 0,
        uploadSpeed: Number(data.metrics.uploadSpeed) || 0
      };
      
      // Update metrics state
      setAvgPacketLoss(metrics.packetLoss);
      setAvgLatency(metrics.latency);
      setInternetSpeed({
        download: metrics.downloadSpeed,
        upload: metrics.uploadSpeed
      });
      
      // Update realtime metrics
      setRealtimeMetrics(metrics);
      
      console.log('Network metrics fetched successfully:', metrics);
      return metrics;
    } catch (error) {
      console.error('Error fetching network metrics:', error);
      handleError(error, 'fetching network metrics', { selectedInterface });
      return null;
    }
  }, [selectedInterface, serverUrl, clearError, handleError, validateMetrics]);

  // Update refreshMetrics to use fetchNetworkMetrics
  const refreshMetrics = useCallback(async () => {
    console.log('Refreshing metrics...');
    try {
      await fetchNetworkMetrics();
    } catch (error) {
      console.error('Error refreshing metrics:', error);
      handleError(error, 'refreshing metrics', { selectedInterface });
    }
  }, [fetchNetworkMetrics]);

  // Add effect to fetch metrics when interface changes
  useEffect(() => {
    if (selectedInterface && initialLoadComplete) {
      console.log('Interface changed, fetching metrics...');
      fetchNetworkMetrics();
    }
  }, [selectedInterface, initialLoadComplete, fetchNetworkMetrics]);

  // Context value
  const contextValue = {
    interfaces,
    selectedInterface,
    setSelectedInterface,
    avgPacketLoss,
    avgLatency,
    internetSpeed,
    packetLossHistory,
    latencyHistory,
    speedHistory,
    loading,
    isMonitoring,
    isPolling,
    refreshMetrics,
    startMonitoring,
    stopMonitoring,
    startPolling,
    stopPolling,
    realtimeMetrics,
    setRealtimeMetrics,
    error,
    clearError,
    trafficData,
    fetchTrafficData,
    fetchNetworkMetrics,
    setAvgLatency,
    setAvgPacketLoss,
    setInternetSpeed
  };

  return (
    <NetworkMetricsContext.Provider value={contextValue}>
      {children}
    </NetworkMetricsContext.Provider>
  );
};

export function useNetworkMetrics() {
  const context = useContext(NetworkMetricsContext);
  if (context === undefined) {
    throw new Error('useNetworkMetrics must be used within a NetworkMetricsProvider');
  }
  return context;
}

export default NetworkMetricsProvider;
