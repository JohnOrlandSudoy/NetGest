import { NetworkMetricsContext } from '@/context/NetworkMetricsProvider';
import { useState, useEffect, createContext } from 'react';
import { FaNetworkWired } from 'react-icons/fa';
import { Authenticated } from '@/components/Authenticated';

// Create a global state manager
const GlobalStateManager = {
  getMonitoringState: () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('isMonitoring') === 'true';
  },
  
  setMonitoringState: (state) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('isMonitoring', state);
  },
  
  getSelectedInterface: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('selectedInterface');
  },
  
  setSelectedInterface: (interfaceId) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('selectedInterface', interfaceId);
  },
  
  saveMetricsData: async (metrics) => {
    try {
      // Save to API
      const response = await fetch('/api/metrics/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics),
      });

      if (!response.ok) {
        throw new Error('Failed to save metrics data');
      }

      // Also save to localStorage for immediate access
      const storedData = JSON.parse(localStorage.getItem('metricsHistory') || '[]');
      const newData = [...storedData, { ...metrics, timestamp: new Date().toISOString() }];
      
      // Keep only last 24 hours of data
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const filteredData = newData.filter(item => new Date(item.timestamp) > oneDayAgo);
      
      localStorage.setItem('metricsHistory', JSON.stringify(filteredData));

      return await response.json();
    } catch (error) {
      console.error('Error saving metrics data:', error);
      throw error;
    }
  },

  // Add history management methods
  getHistoryState: () => {
    if (typeof window === 'undefined') return {
      metricsHistory: [],
      trafficHistory: [],
      lastUpdate: null
    };
    const stored = localStorage.getItem('networkHistory');
    return stored ? JSON.parse(stored) : {
      metricsHistory: [],
      trafficHistory: [],
      lastUpdate: null
    };
  },

  setHistoryState: (history) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('networkHistory', JSON.stringify(history));
  },

  addToHistory: (metrics, trafficData) => {
    if (typeof window === 'undefined') return;
    const history = GlobalStateManager.getHistoryState();
    
    // Add new metrics to history
    history.metricsHistory.push({
      ...metrics,
      timestamp: new Date().toISOString()
    });

    // Add new traffic data to history
    if (trafficData) {
      history.trafficHistory.push({
        ...trafficData,
        timestamp: new Date().toISOString()
      });
    }

    // Keep only last 24 hours of data
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    history.metricsHistory = history.metricsHistory.filter(
      item => new Date(item.timestamp) > oneDayAgo
    );
    history.trafficHistory = history.trafficHistory.filter(
      item => new Date(item.timestamp) > oneDayAgo
    );

    history.lastUpdate = new Date().toISOString();
    GlobalStateManager.setHistoryState(history);
  },

  // Add TShark test state persistence
  getTSharkState: () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('isTSharkRunning') === 'true';
  },
  
  setTSharkState: (state) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('isTSharkRunning', state);
  },

  // Add real-time monitoring state persistence
  getRealtimeState: () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('isRealtimeMonitoring') === 'true';
  },
  
  setRealtimeState: (state) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('isRealtimeMonitoring', state);
  }
};

// Update the NetworkMetricsProvider component
export function NetworkMetricsProvider({ children }) {
  const [metrics, setMetrics] = useState({
    downloadSpeed: 0,
    uploadSpeed: 0,
    latency: 0,
    packetLoss: 0,
    jitter: 0,
    timestamp: new Date().toISOString(),
  });

  const [isMonitoring, setIsMonitoring] = useState(GlobalStateManager.getMonitoringState());
  const [selectedInterface, setSelectedInterface] = useState(GlobalStateManager.getSelectedInterface() || '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}');
  const [monitoringInterval, setMonitoringInterval] = useState(null);
  const [history, setHistory] = useState(GlobalStateManager.getHistoryState());

  // Initialize monitoring state from localStorage
  useEffect(() => {
    const savedMonitoringState = GlobalStateManager.getMonitoringState();
    const savedTSharkState = GlobalStateManager.getTSharkState();
    const savedRealtimeState = GlobalStateManager.getRealtimeState();

    if (savedMonitoringState) {
      setIsMonitoring(true);
      startMonitoring();
    }

    if (savedTSharkState) {
      setRunningTShark(true);
    }

    if (savedRealtimeState) {
      setRealtimeMonitoring(true);
      startRealtimeMonitoring();
    }
  }, []);

  // Update monitoring state persistence
  useEffect(() => {
    GlobalStateManager.setMonitoringState(isMonitoring);
  }, [isMonitoring]);

  // Update TShark state persistence
  useEffect(() => {
    GlobalStateManager.setTSharkState(runningTShark);
  }, [runningTShark]);

  // Update real-time monitoring state persistence
  useEffect(() => {
    GlobalStateManager.setRealtimeState(realtimeMonitoring);
  }, [realtimeMonitoring]);

  // Start monitoring function
  const startMonitoring = async () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
    }

    const interval = setInterval(async () => {
      try {
        // Run TShark analysis
        const results = await Promise.all([
          analyzeTrafficType('video', selectedInterface),
          analyzeTrafficType('audio', selectedInterface),
          analyzeTrafficType('voice', selectedInterface)
        ]);

        const newMetrics = {
          downloadSpeed: results[0].bitrate + results[1].bitrate,
          uploadSpeed: results[2].bitrate,
          latency: calculateLatency(results),
          packetLoss: calculatePacketLoss(results),
          jitter: calculateJitter(results),
          timestamp: new Date().toISOString(),
          trafficData: {
            video: results[0],
            audio: results[1],
            voice: results[2]
          }
        };

        setMetrics(newMetrics);
        
        // Add to history
        GlobalStateManager.addToHistory(newMetrics, newMetrics.trafficData);
        
        // Update history state
        setHistory(GlobalStateManager.getHistoryState());
        
        // Save to API
        await GlobalStateManager.saveMetricsData(newMetrics);
      } catch (error) {
        console.error('Error during monitoring:', error);
      }
    }, 5000); // 5 seconds interval

    setMonitoringInterval(interval);
    setIsMonitoring(true);
  };

  // Stop monitoring function
  const stopMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
    setIsMonitoring(false);
  };

  // Initialize monitoring state on mount
  useEffect(() => {
    if (isMonitoring) {
      startMonitoring();
    }
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }, []);

  // Helper functions for metrics calculations
  const calculateLatency = (results) => {
    // Implement latency calculation based on traffic analysis
    return Math.round(20 + Math.random() * 30); // Placeholder
  };

  const calculatePacketLoss = (results) => {
    // Implement packet loss calculation based on traffic analysis
    return parseFloat((Math.random() * 2).toFixed(2)); // Placeholder
  };

  const calculateJitter = (results) => {
    // Implement jitter calculation based on traffic analysis
    return parseFloat((Math.random() * 5).toFixed(2)); // Placeholder
  };

  return (
    <NetworkMetricsContext.Provider value={{
      metrics,
      isMonitoring,
      selectedInterface,
      startMonitoring,
      stopMonitoring,
      setSelectedInterface,
      trafficData: metrics.trafficData,
      history: {
        metricsHistory: history.metricsHistory,
        trafficHistory: history.trafficHistory,
        lastUpdate: history.lastUpdate
      },
      runningTShark,
      realtimeMonitoring,
      startRealtimeMonitoring,
      stopRealtimeMonitoring
    }}>
      {children}
    </NetworkMetricsContext.Provider>
  );
}

// Update the HomePage component
const HomePage = () => {
  // ... existing code ...

  return (
    <Authenticated title="Network Dashboard">
      <div className="w-full">
        {/* Remove the interface selection section */}
        
        {/* TShark Test Button and Status */}
        <div className="mb-6">
          <div className="flex flex-col space-y-3">
            <button
              onClick={runTSharkTest}
              disabled={tsharkLoading}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                tsharkLoading 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <FaNetworkWired className="mr-2" />
              {tsharkLoading ? 'Running Network Test...' : 'Run Network Test (TShark)'}
            </button>
            
            {/* ... rest of the TShark test section ... */}
          </div>
        </div>

        {/* Real-time Monitoring Button */}
        <div className="mb-6">
          <div className="flex flex-col space-y-3">
            <button
              onClick={realtimeMonitoring ? stopRealtimeMonitoring : startRealtimeMonitoring}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                realtimeMonitoring 
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              disabled={tsharkLoading}
            >
              <FaNetworkWired className={`mr-2 ${realtimeMonitoring ? 'animate-pulse' : ''}`} />
              {realtimeMonitoring ? 'Stop Real-time Monitoring' : 'Start Real-time TShark Monitoring'}
            </button>
            
            {/* ... rest of the real-time monitoring section ... */}
          </div>
        </div>

        {/* ... rest of the component ... */}
      </div>
    </Authenticated>
  );
};

export default HomePage; 