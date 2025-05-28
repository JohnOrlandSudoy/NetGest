'use client';

import React, { useContext, useEffect, useState, useRef } from "react";
import { NetworkMetricsContext } from "@/context/NetworkMetricsProvider";
import NetworkDashboard from "./network-dashboard";
import DailySummaryCards from "./metric-card";
import ErrorBoundary from '@/components/common/ErrorBoundary';
import InterfaceSelector from '@/components/network/InterfaceSelector';
import Authenticated from "@/components/layouts/Authenticated";
import { FaNetworkWired, FaDownload, FaUpload, FaTrash } from "react-icons/fa";
import { format } from 'date-fns';

// Default interface ID for Windows - this should be replaced with a real interface ID
const DEFAULT_INTERFACE_ID = '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}';

// Add StorageManager
const StorageManager = {
  // BOM storage keys
  BOM_KEYS: {
    METRICS: 'network_metrics_bom',
    TRAFFIC: 'network_traffic_bom',
    HISTORY: 'network_history_bom'
  },

  // Save metrics with BOM
  saveMetricsWithBOM: (metrics) => {
    if (typeof window === 'undefined') return;
    const data = JSON.stringify(metrics);
    localStorage.setItem(StorageManager.BOM_KEYS.METRICS, data);
  },

  // Get metrics with BOM
  getMetricsWithBOM: () => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(StorageManager.BOM_KEYS.METRICS);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing metrics data:', error);
      return null;
    }
  },

  // Save traffic data with BOM
  saveTrafficWithBOM: (trafficData) => {
    if (typeof window === 'undefined') return;
    const data = JSON.stringify(trafficData);
    localStorage.setItem(StorageManager.BOM_KEYS.TRAFFIC, data);
  },

  // Get traffic data with BOM
  getTrafficWithBOM: () => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(StorageManager.BOM_KEYS.TRAFFIC);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing traffic data:', error);
      return null;
    }
  },

  // Save history with BOM
  saveHistoryWithBOM: (history) => {
    if (typeof window === 'undefined') return;
    const data = JSON.stringify(history);
    localStorage.setItem(StorageManager.BOM_KEYS.HISTORY, data);
  },

  // Get history with BOM
  getHistoryWithBOM: () => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(StorageManager.BOM_KEYS.HISTORY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing history data:', error);
      return [];
    }
  },

  // Clear all data
  clearAllData: () => {
    if (typeof window === 'undefined') return;
    Object.values(StorageManager.BOM_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};

// Define the HomePage component
const HomePage = () => {
    // Get network metrics context
    const {
        packetLossHistory,
        latencyHistory,
        speedHistory,
        loadingHistory,
        avgPacketLoss,
        avgLatency,
        internetSpeed,
        uploadSpeed,
        selectedInterface,
        setSelectedInterface,
        interfaces = [], // Provide default empty array
        fetchInterfaces,
        refreshMetrics,
        loading
    } = useContext(NetworkMetricsContext) || {}; // Provide default empty object

    const [isClient, setIsClient] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [waitingForConnection, setWaitingForConnection] = useState(false);
    const [dashboardLoaded, setDashboardLoaded] = useState(false);
    const [serverConnected, setServerConnected] = useState(true);
    const [runningTShark, setRunningTShark] = useState(false);
    const [tsharkResults, setTsharkResults] = useState(null);
    const [tsharkError, setTsharkError] = useState(null);
    const [tsharkLoading, setTsharkLoading] = useState(false);

    // State for real-time monitoring
    const [realtimeMonitoring, setRealtimeMonitoring] = useState(false);
    const [realtimeMetrics, setRealtimeMetrics] = useState(null);
    const [realtimeError, setRealtimeError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isPolling, setIsPolling] = useState(false);
    const pollingRef = useRef(null);

    // Function to start real-time monitoring using TShark
    const startRealtimeMonitoring = async () => {
        // Reset error state
        setRealtimeError(null);
        setRetryCount(0);
        
        // If no interface is selected, use the first available interface or a fallback
        const interfaceToUse = selectedInterface || 
            (interfaces && interfaces.length > 0 ? 
                (typeof interfaces[0] === 'string' ? interfaces[0] : interfaces[0].name || interfaces[0].id) : 
                '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}');
        
        try {
            setRealtimeMonitoring(true);
            
            // Make an initial TShark request to get metrics
            const response = await fetch('/api/network/tshark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                body: JSON.stringify({ 
                    interface: interfaceToUse,
                    action: 'start'
                }),
                signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to start monitoring (${response.status})`);
            }
            
            const data = await response.json();
            
            if (data && data.metrics) {
                const metrics = {
                    ...data.metrics,
                    timestamp: new Date().toISOString(),
                    interface: interfaceToUse
                };
                
                setRealtimeMetrics(metrics);
                
                // Save to StorageManager
                StorageManager.saveMetricsWithBOM(metrics);
                
                // Create and save history entry with unique timestamp
                const now = new Date();
                const historyEntry = {
                    id: `${format(now, 'yyyy-MM-dd')}-${interfaceToUse}-${now.getTime()}`, // Add unique ID
                    date: format(now, 'yyyy-MM-dd'),
                    timestamp: now.toISOString(), // Add full timestamp
                    interface: interfaceToUse,
                    metrics: {
                        avgLatency: metrics.latency || 0,
                        avgPacketLoss: metrics.packetLoss || 0,
                        downloadSpeed: metrics.downloadSpeed || 0,
                        uploadSpeed: metrics.uploadSpeed || 0
                    }
                };
                
                // Get existing history and add new entry
                const existingHistory = StorageManager.getHistoryWithBOM();
                const updatedHistory = [historyEntry, ...existingHistory];
                StorageManager.saveHistoryWithBOM(updatedHistory);
            }
            
            // Start polling for metrics
            startPolling(interfaceToUse);
        } catch (error) {
            console.error('Error starting real-time monitoring:', error);
            setRealtimeError(`Failed to start monitoring: ${error.message}`);
            setRealtimeMonitoring(false);
        }
    };
    
    // Function to stop real-time monitoring
    const stopRealtimeMonitoring = async () => {
        // Stop polling
        stopPolling();
        
        // If no interface is selected, use the first available interface or a fallback
        const interfaceToUse = selectedInterface || 
            (interfaces && interfaces.length > 0 ? 
                (typeof interfaces[0] === 'string' ? interfaces[0] : interfaces[0].name || interfaces[0].id) : 
                '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}');
        
        try {
            // Stop monitoring
            await fetch(`/api/network/realtime?interface=${encodeURIComponent(interfaceToUse)}&action=stop`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
        } catch (error) {
            console.error('Error stopping real-time monitoring:', error);
        } finally {
            // Reset state
            setRealtimeMonitoring(false);
        }
    };
    
    // Function to start polling for metrics
    const startPolling = (interfaceId) => {
        if (isPolling) return;
        
        setIsPolling(true);
        
        // Clear any existing interval
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
        }
        
        // Set up polling interval
        pollingRef.current = setInterval(() => {
            pollRealtimeMetrics(interfaceId);
        }, 1000);
    };
    
    // Function to stop polling
    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        
        setIsPolling(false);
    };
    
    // Function to poll for real-time metrics using TShark
    const pollRealtimeMetrics = async (interfaceId) => {
        if (!realtimeMonitoring) return;
        
        try {
            const response = await fetch('/api/network/tshark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                body: JSON.stringify({ 
                    interface: interfaceId,
                    action: 'metrics'
                }),
                signal: AbortSignal.timeout(8000)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get metrics (${response.status})`);
            }
            
            const data = await response.json();
            
            if (data && data.metrics) {
                const metrics = {
                    ...data.metrics,
                    timestamp: new Date().toISOString(),
                    interface: interfaceId
                };
                
                setRealtimeMetrics(metrics);
                
                // Save to StorageManager
                StorageManager.saveMetricsWithBOM(metrics);
                
                // Create and save history entry with unique timestamp
                const now = new Date();
                const historyEntry = {
                    id: `${format(now, 'yyyy-MM-dd')}-${interfaceId}-${now.getTime()}`, // Add unique ID
                    date: format(now, 'yyyy-MM-dd'),
                    timestamp: now.toISOString(), // Add full timestamp
                    interface: interfaceId,
                    metrics: {
                        avgLatency: metrics.latency || 0,
                        avgPacketLoss: metrics.packetLoss || 0,
                        downloadSpeed: metrics.downloadSpeed || 0,
                        uploadSpeed: metrics.uploadSpeed || 0
                    }
                };
                
                // Get existing history and add new entry
                const existingHistory = StorageManager.getHistoryWithBOM();
                const updatedHistory = [historyEntry, ...existingHistory];
                StorageManager.saveHistoryWithBOM(updatedHistory);
            }
        } catch (error) {
            console.error('Error polling real-time metrics:', error);
            setRetryCount(prev => prev + 1);
            
            if (retryCount >= 3) {
                setRealtimeError('Failed to get metrics after multiple attempts');
                stopRealtimeMonitoring();
            }
        }
    };
    
    // Clean up when component unmounts
    useEffect(() => {
        return () => {
            // Stop monitoring when component unmounts
            if (realtimeMonitoring) {
                stopRealtimeMonitoring();
            }
        };
    }, [realtimeMonitoring]);

    // Set isClient to true when component mounts (client-side only)
    useEffect(() => {
        setIsClient(true);
        
        // Check online status
        setIsOffline(!navigator.onLine);
        
        // Add event listeners for online/offline status
        const handleOnline = () => {
            setIsOffline(false);
            if (waitingForConnection) {
                refreshMetrics && refreshMetrics();
                setWaitingForConnection(false);
            }
        };
        
        const handleOffline = () => {
            setIsOffline(true);
            setWaitingForConnection(true);
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Force dashboard to load after a timeout if it's taking too long
        const timer = setTimeout(() => {
            setDashboardLoaded(true);
        }, 3000);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearTimeout(timer);
        };
    }, [refreshMetrics, waitingForConnection]);

    // Fetch interfaces when component mounts
    useEffect(() => {
        if (isClient && fetchInterfaces) {
            fetchInterfaces();
            console.log("Fetching interfaces...");
        }
        
        // Force dashboard to load after interfaces are fetched or after timeout
        const timer = setTimeout(() => {
            setDashboardLoaded(true);
        }, 3000);
        
        return () => {
            clearTimeout(timer);
        };
    }, [isClient, fetchInterfaces]);

    // Debug logging for interfaces
    useEffect(() => {
        if (interfaces && interfaces.length > 0) {
            console.log("Available interfaces:", interfaces);
            console.log("Selected interface:", selectedInterface);
        }
    }, [interfaces, selectedInterface]);

    // Handle interface change
    const handleInterfaceChange = (interfaceName) => {
        if (setSelectedInterface) {
            // Ensure interfaceName is a string
            const safeInterfaceName = typeof interfaceName === 'string' 
                ? interfaceName 
                : interfaceName && interfaceName.name 
                    ? interfaceName.name 
                    : String(interfaceName || '');
            
            setSelectedInterface(safeInterfaceName);
            // Reset dashboard loaded state when interface changes
            setDashboardLoaded(false);
            // Force dashboard to load after a timeout
            setTimeout(() => {
                setDashboardLoaded(true);
            }, 2000);
        }
    };

    // Fetch data from server.js when component mounts
    useEffect(() => {
        if (isClient && refreshMetrics && selectedInterface) {
            // Initial fetch
            refreshMetrics();
            
            // Set up interval to refresh data every 30 seconds
            const intervalId = setInterval(() => {
                if (!isOffline) {
                    refreshMetrics();
                }
            }, 30000);
            
            return () => clearInterval(intervalId);
        }
    }, [isClient, refreshMetrics, selectedInterface, isOffline]);

    // Check server connection
    const checkServerConnection = async () => {
        try {
            const response = await fetch('/api/server-metrics/ping');
            setServerConnected(response.ok);
        } catch (error) {
            console.error('Server connection check failed:', error);
            setServerConnected(false);
        }
    };

    // Check server connection periodically
    useEffect(() => {
        if (isClient) {
            checkServerConnection();
            const intervalId = setInterval(checkServerConnection, 60000); // Check every minute
            return () => clearInterval(intervalId);
        }
    }, [isClient]);

    // Function to fetch TShark interfaces
    const fetchTSharkInterfaces = async () => {
        try {
            const response = await fetch('/api/network/tshark');
            if (!response.ok) {
                throw new Error('Failed to fetch interfaces');
            }
            
            const data = await response.json();
            if (data.interfaces && data.interfaces.length > 0) {
                console.log('TShark interfaces:', data.interfaces);
                
                // Update interfaces in state or context if needed
                // This depends on how your app is structured
                if (interfaces.length === 0 && setSelectedInterface) {
                    // If no interfaces are set yet, use the TShark interfaces
                    setSelectedInterface(data.interfaces[0].id);
                }
                
                return data.interfaces;
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching TShark interfaces:', error);
            return [];
        }
    };

    // Fetch TShark interfaces when component mounts
    useEffect(() => {
        if (isClient) {
            fetchTSharkInterfaces();
        }
    }, [isClient]);

    // Function to generate some network traffic during the test
    const generateNetworkTraffic = async () => {
        try {
            // Make multiple requests to our own API endpoints
            const promises = [];
            for (let i = 0; i < 5; i++) {
                // Use our own API endpoints
                promises.push(
                    fetch('/api/network/ping', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ timestamp: Date.now() })
                    }),
                    fetch('/api/network/metrics', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    }),
                    fetch('/api/network/interfaces', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    })
                );
            }
            
            // Wait for all requests to complete
            await Promise.allSettled(promises);
        } catch (error) {
            console.error('Error generating network traffic:', error);
        }
    };

    // Function to run TShark and get network metrics
    const runTSharkTest = async () => {
        // Reset previous error state
        setTsharkError(null);
        
        // If no interface is selected, use the first available interface or a fallback
        const interfaceToUse = selectedInterface || 
            (interfaces && interfaces.length > 0 ? 
                (typeof interfaces[0] === 'string' ? interfaces[0] : interfaces[0].name || interfaces[0].id) : 
                '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}');
        
        console.log("Running TShark test with interface:", interfaceToUse);
        
        // Set loading states
        setRunningTShark(true);
        setTsharkLoading(true);
        
        try {
            // Generate some network traffic in the background
            await generateNetworkTraffic();
            
            // Make the API request
            const response = await fetch('/api/network/tshark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    interface: interfaceToUse,
                    duration: 5 // Add explicit duration
                }),
            });

            // Check for HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || errorData.error || `Server responded with status: ${response.status}`;
                throw new Error(errorMessage);
            }

            // Parse the response
            const data = await response.json();
            
            // Update state with results
            setTsharkResults(data);
            console.log("TShark test results:", data);
            
            // Save metrics to BOM storage
            if (data && data.metrics) {
                const metrics = {
                    ...data.metrics,
                    timestamp: new Date().toISOString(),
                    interface: interfaceToUse,
                    packetCount: data.packetCount || 0
                };
                
                // Save to StorageManager
                StorageManager.saveMetricsWithBOM(metrics);
                
                // Create and save history entry with unique timestamp
                const now = new Date();
                const historyEntry = {
                    id: `${format(now, 'yyyy-MM-dd')}-${interfaceToUse}-${now.getTime()}`, // Add unique ID
                    date: format(now, 'yyyy-MM-dd'),
                    timestamp: now.toISOString(), // Add full timestamp
                    interface: interfaceToUse,
                    metrics: {
                        avgLatency: data.metrics.latency || 0,
                        avgPacketLoss: data.metrics.packetLoss || 0,
                        downloadSpeed: data.metrics.downloadSpeed || 0,
                        uploadSpeed: data.metrics.uploadSpeed || 0,
                        packetCount: data.packetCount || 0
                    }
                };
                
                // Get existing history and add new entry
                const existingHistory = StorageManager.getHistoryWithBOM();
                const updatedHistory = [historyEntry, ...existingHistory];
                StorageManager.saveHistoryWithBOM(updatedHistory);
                
                // Update context if available
                if (refreshMetrics) {
                    refreshMetrics();
                }
            }
        } catch (error) {
            console.error('Error running TShark test:', error);
            setTsharkError(error.message || 'An unknown error occurred while running the network test');
        } finally {
            // Reset loading states
            setRunningTShark(false);
            setTsharkLoading(false);
        }
    };

    // If not client-side yet, return null
    if (!isClient) {
        return null;
    }

    return (
        <Authenticated title="Network Dashboard">
            <div className="w-full">
                {/* Interface Selection */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-3 text-gray-800">Select Network Interface</h2>
                    <ErrorBoundary
                        fallbackTitle="Interface Selection Limited"
                        fallbackMessage="Some interface features are limited while offline."
                    >
                        <InterfaceSelector 
                            interfaces={interfaces || []}
                            selectedInterface={selectedInterface || ''}
                            onSelectInterface={handleInterfaceChange}
                            isLoading={false}
                        />
                    </ErrorBoundary>
                </div>

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
                        
                        {/* Loading indicator */}
                        {tsharkLoading && (
                            <div className="flex items-center text-gray-600 text-sm mt-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                                <span>Analyzing network traffic... This may take a few seconds</span>
                            </div>
                        )}
                        
                        {/* Error message */}
                        {tsharkError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mt-2">
                                <p className="font-medium">Network test failed</p>
                                <p>{tsharkError}</p>
                                <p className="mt-1 text-xs">
                                    Make sure Wireshark/TShark is installed and you're using a valid interface name.
                                    On Windows, use the full interface name (like "Ethernet" or "Wi-Fi") or the interface ID.
                                </p>
                            </div>
                        )}
                        
                        {/* Results summary (if available) */}
                        {tsharkResults && tsharkResults.metrics && !tsharkLoading && !tsharkError && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm mt-2">
                                <p className="font-medium">Network test completed successfully</p>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <span className="text-gray-600">Download:</span> 
                                        <span className="font-medium ml-1">{tsharkResults.metrics.downloadSpeed} Mbps</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Upload:</span> 
                                        <span className="font-medium ml-1">{tsharkResults.metrics.uploadSpeed} Mbps</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Latency:</span> 
                                        <span className="font-medium ml-1">{tsharkResults.metrics.latency} ms</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Packet Loss:</span> 
                                        <span className="font-medium ml-1">{tsharkResults.metrics.packetLoss}%</span>
                                    </div>
                                </div>
                            </div>
                        )}
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
                        
                        {/* Loading indicator */}
                        {realtimeMonitoring && !realtimeMetrics && (
                            <div className="flex items-center text-gray-600 text-sm mt-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                                <span>Initializing TShark monitoring...</span>
                            </div>
                        )}
                        
                        {/* Error message */}
                        {realtimeError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mt-2">
                                <p className="font-medium">Real-time monitoring failed</p>
                                <p>{realtimeError}</p>
                                <p className="mt-1 text-xs">
                                    {realtimeMetrics?.simulated ? 'Using simulated data as fallback.' : ''}
                                </p>
                            </div>
                        )}
                        
                        {/* Real-time metrics display */}
                        {realtimeMonitoring && realtimeMetrics && (
                            <div className="mt-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="bg-white p-4 rounded-md shadow">
                                        <div className="text-sm text-gray-500">Download Speed</div>
                                        <div className="text-2xl font-bold">{realtimeMetrics.downloadSpeed} Mbps</div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {realtimeMetrics.simulated ? 'Simulated' : 'TShark'}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-md shadow">
                                        <div className="text-sm text-gray-500">Upload Speed</div>
                                        <div className="text-2xl font-bold">{realtimeMetrics.uploadSpeed} Mbps</div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {realtimeMetrics.simulated ? 'Simulated' : 'TShark'}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-md shadow">
                                        <div className="text-sm text-gray-500">Latency</div>
                                        <div className="text-2xl font-bold">{realtimeMetrics.latency} ms</div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {realtimeMetrics.simulated ? 'Simulated' : 'TShark'}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-md shadow">
                                        <div className="text-sm text-gray-500">Packet Loss</div>
                                        <div className="text-2xl font-bold">{realtimeMetrics.packetLoss}%</div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {realtimeMetrics.simulated ? 'Simulated' : 'TShark'}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* TShark command info */}
                                <div className="bg-gray-50 p-3 rounded-md text-xs text-gray-600 font-mono">
                                    <div className="flex items-center mb-2">
                                        <FaNetworkWired className="mr-2 text-blue-500" />
                                        <span className="text-gray-700 font-semibold">TShark Command:</span>
                                    </div>
                                    <p>tshark -i {selectedInterface || '\\Device\\NPF_{interface}'} -a duration:5 -q -z io,stat,1</p>
                                    <p className="mt-2 text-gray-500">Last updated: {new Date(realtimeMetrics.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Offline Warning */}
                {isOffline && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                        <div className="flex flex-col items-center justify-center">
                            <svg className="h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h2 className="text-xl font-semibold text-red-800 mb-2">You are currently offline</h2>
                            <p className="text-red-700 text-center mb-4">Waiting for network connection to be restored...</p>
                        </div>
                    </div>
                )}

                {/* Server Connection Status */}
                {!isOffline && !serverConnected && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                            <svg className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-yellow-700">Server connection limited. Some metrics may be using cached data.</p>
                        </div>
                    </div>
                )}

                {/* Daily Summary Cards */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-3 text-gray-800">Network Status</h2>
                    <DailySummaryCards
                        packetLoss={realtimeMonitoring && realtimeMetrics ? 
                            realtimeMetrics.packetLoss : 
                            (tsharkResults?.metrics?.packetLoss || avgPacketLoss || 0)}
                        latency={realtimeMonitoring && realtimeMetrics ? 
                            realtimeMetrics.latency : 
                            (tsharkResults?.metrics?.latency || avgLatency || 0)}
                        downloadSpeed={realtimeMonitoring && realtimeMetrics ? 
                            realtimeMetrics.downloadSpeed : 
                            (tsharkResults?.metrics?.downloadSpeed || internetSpeed?.download || 0)}
                        uploadSpeed={realtimeMonitoring && realtimeMetrics ? 
                            realtimeMetrics.uploadSpeed : 
                            (tsharkResults?.metrics?.uploadSpeed || internetSpeed?.upload || uploadSpeed || 0)}
                        isLoading={loading && !dashboardLoaded && !realtimeMetrics && !tsharkResults}
                        isRealtime={realtimeMonitoring && !!realtimeMetrics}
                    />
                </div>

                {/* Network Dashboard */}
                {!isOffline && (
                    <NetworkDashboard 
                        metrics={[
                            { 
                                name: 'Packet Loss', 
                                value: realtimeMonitoring && realtimeMetrics ? 
                                    realtimeMetrics.packetLoss : 
                                    (tsharkResults?.metrics?.packetLoss || avgPacketLoss || 0), 
                                unit: '%' 
                            },
                            { 
                                name: 'Latency', 
                                value: realtimeMonitoring && realtimeMetrics ? 
                                    realtimeMetrics.latency : 
                                    (tsharkResults?.metrics?.latency || avgLatency || 0), 
                                unit: 'ms' 
                            },
                            { 
                                name: 'Download Speed', 
                                value: realtimeMonitoring && realtimeMetrics ? 
                                    realtimeMetrics.downloadSpeed : 
                                    (tsharkResults?.metrics?.downloadSpeed || internetSpeed?.download || 0), 
                                unit: 'Mbps' 
                            },
                            { 
                                name: 'Upload Speed', 
                                value: realtimeMonitoring && realtimeMetrics ? 
                                    realtimeMetrics.uploadSpeed : 
                                    (tsharkResults?.metrics?.uploadSpeed || internetSpeed?.upload || uploadSpeed || 0), 
                                unit: 'Mbps' 
                            }
                        ]}
                        packetLossHistory={realtimeMonitoring && realtimeMetrics ? 
                            [...(packetLossHistory || []), { 
                                timestamp: new Date().toISOString(), 
                                value: realtimeMetrics.packetLoss 
                            }].slice(-20) : 
                            tsharkResults?.metrics ? 
                                [...(packetLossHistory || []), { 
                                    timestamp: new Date().toISOString(), 
                                    value: tsharkResults.metrics.packetLoss 
                                }].slice(-20) :
                                packetLossHistory || []}
                        latencyHistory={realtimeMonitoring && realtimeMetrics ? 
                            [...(latencyHistory || []), { 
                                timestamp: new Date().toISOString(), 
                                value: realtimeMetrics.latency 
                            }].slice(-20) : 
                            tsharkResults?.metrics ? 
                                [...(latencyHistory || []), { 
                                    timestamp: new Date().toISOString(), 
                                    value: tsharkResults.metrics.latency 
                                }].slice(-20) :
                                latencyHistory || []}
                        speedHistory={realtimeMonitoring && realtimeMetrics ? 
                            [...(speedHistory || []), { 
                                timestamp: new Date().toISOString(), 
                                download: realtimeMetrics.downloadSpeed, 
                                upload: realtimeMetrics.uploadSpeed 
                            }].slice(-20) : 
                            tsharkResults?.metrics ? 
                                [...(speedHistory || []), { 
                                    timestamp: new Date().toISOString(), 
                                    download: tsharkResults.metrics.downloadSpeed, 
                                    upload: tsharkResults.metrics.uploadSpeed 
                                }].slice(-20) :
                                speedHistory || []}
                        loadingHistory={loadingHistory && !dashboardLoaded && !realtimeMetrics && !tsharkResults}
                        loading={loading && !dashboardLoaded && !realtimeMetrics && !tsharkResults}
                        error={null}
                        refreshMetrics={refreshMetrics}
                        isRealtime={realtimeMonitoring && !!realtimeMetrics}
                    />
                )}
            </div>
        </Authenticated>
    );
};

export default HomePage;
