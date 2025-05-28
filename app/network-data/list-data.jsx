'use client';

import React, { useState, useEffect, useContext, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { NetworkMetricsContext } from '@/context/NetworkMetricsProvider';
import NetworkStateManager from '@/services/state/NetworkStateManager';
import { format, subDays, parseISO } from 'date-fns';
import { FaCalendarAlt, FaDownload, FaFilter, FaExclamationTriangle } from 'react-icons/fa';
import { createPortal } from "react-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Add these constants at the top of the file, after imports
const STORAGE_KEYS = {
  PACKET_LOSS: 'network_metrics_packet_loss',
  LATENCY: 'network_metrics_latency',
  DOWNLOAD: 'network_metrics_download',
  UPLOAD: 'network_metrics_upload'
};

// Add these helper functions after the constants
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

// Add enhanced storage manager
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

// Simple date range component
const SimpleDateRangePicker = ({ startDate, endDate, onChange, onClose }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Select Date Range</h3>
        <button onClick={onClose} className="text-gray-500">×</button>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input 
            type="date" 
            value={format(startDate, 'yyyy-MM-dd')}
            onChange={(e) => onChange({ 
              startDate: new Date(e.target.value), 
              endDate 
            })}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input 
            type="date"
            value={format(endDate, 'yyyy-MM-dd')}
            onChange={(e) => onChange({ 
              startDate, 
              endDate: new Date(e.target.value) 
            })}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Apply
        </button>
      </div>
    </div>
  );
};

// Use the simple date picker directly
const DateRangePicker = SimpleDateRangePicker;

// Add new chart configuration
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: true,
      text: 'Network Metrics History',
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
  interaction: {
    mode: 'index',
    intersect: false,
  },
};

// Add new chart component
const MetricsChart = ({ data = [], type }) => {
  // Ensure data is an array and has valid timestamps
  const validData = data.filter(item => item && item.timestamp);
  
  const chartData = {
    labels: validData.map(item => {
      try {
        return format(parseISO(item.timestamp), 'HH:mm:ss');
      } catch (error) {
        console.error('Error parsing timestamp:', error);
        return 'Invalid Time';
      }
    }),
    datasets: [
      {
        label: type === 'speed' ? 'Download Speed' : type === 'latency' ? 'Latency' : 'Packet Loss',
        data: validData.map(item => {
          if (type === 'speed') return item.metrics?.downloadSpeed || 0;
          if (type === 'latency') return item.metrics?.avgLatency || 0;
          return item.metrics?.avgPacketLoss || 0;
        }),
        borderColor: type === 'speed' ? 'rgb(75, 192, 192)' : 
                    type === 'latency' ? 'rgb(255, 159, 64)' : 
                    'rgb(255, 99, 132)',
        backgroundColor: type === 'speed' ? 'rgba(75, 192, 192, 0.5)' : 
                        type === 'latency' ? 'rgba(255, 159, 64, 0.5)' : 
                        'rgba(255, 99, 132, 0.5)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // If no valid data, show empty chart
  if (validData.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available for visualization</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <Line options={chartOptions} data={chartData} />
    </div>
  );
};

// Add new chart component for combined metrics
const CombinedMetricsChart = ({ data = [] }) => {
  // Ensure data is an array and has valid timestamps
  const validData = data.filter(item => item && item.timestamp);
  
  const chartData = {
    labels: validData.map(item => {
      try {
        return format(parseISO(item.timestamp), 'HH:mm:ss');
      } catch (error) {
        console.error('Error parsing timestamp:', error);
        return 'Invalid Time';
      }
    }),
    datasets: [
      {
        label: 'Download Speed (Mbps)',
        data: validData.map(item => item.metrics?.downloadSpeed || 0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        yAxisID: 'y',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Latency (ms)',
        data: validData.map(item => item.metrics?.avgLatency || 0),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        yAxisID: 'y1',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Packet Loss (%)',
        data: validData.map(item => item.metrics?.avgPacketLoss || 0),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y2',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const combinedOptions = {
    ...chartOptions,
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Speed (Mbps)',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Latency (ms)',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      y2: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Packet Loss (%)',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  // If no valid data, show empty chart
  if (validData.length === 0) {
    return (
      <div className="h-96 w-full flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available for visualization</p>
      </div>
    );
  }

  return (
    <div className="h-96 w-full">
      <Line options={combinedOptions} data={chartData} />
    </div>
  );
};

// Add debug utility at the top of the file
const DEBUG = process.env.NODE_ENV === 'development';

const debugLog = (message, data) => {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data);
  }
};

// Add date utility functions
const getDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);
  return { startDate, endDate };
};

// Add this utility function at the top of the file, after imports
const generateUniqueId = (() => {
  let counter = 0;
  return (prefix) => `${prefix}-${counter++}`;
})();

const DailySummaryList = () => {
  const router = useRouter();
  const context = useContext(NetworkMetricsContext);
  
  // Initialize state with proper date range
  const [dateRange, setDateRange] = useState(getDateRange());
  const [metrics, setMetrics] = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [dailySummaries, setDailySummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [interfaceFilter, setInterfaceFilter] = useState(context?.selectedInterface || 'all');
  const [downloadingDates, setDownloadingDates] = useState({});
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);
  
  // Create a ref to track if component is mounted
  const isMounted = useRef(false);
  
  // Initialize data and start monitoring
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Start monitoring if not already monitoring
        if (context?.startMonitoring && !context.isMonitoring) {
          await context.startMonitoring();
        }
        
        // Fetch initial metrics if available
        if (context?.fetchNetworkMetrics) {
          await context.fetchNetworkMetrics();
        }
        
        // Fetch traffic data if available
        if (context?.fetchTrafficData) {
          await context.fetchTrafficData();
        }
        
        // Start polling if available
        if (context?.startPolling && !context.isPolling) {
          await context.startPolling();
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    if (isMounted.current) {
      initializeData();
    }
  }, [context]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load data from NetworkStateManager on mount
  useEffect(() => {
    const loadStoredData = () => {
      const storedMetrics = NetworkStateManager.getMetricsWithBOM();
      const storedTraffic = NetworkStateManager.getTrafficWithBOM();
      const storedHistory = NetworkStateManager.getHistoryWithBOM();

      if (storedMetrics) {
        setMetrics(storedMetrics);
      }
      if (storedTraffic) {
        setTrafficData(storedTraffic);
      }
      if (storedHistory.length > 0) {
        setDailySummaries(storedHistory);
      }
      setLoading(false);
    };

    loadStoredData();
  }, []);

  // Effect to update daily summaries when history changes
  useEffect(() => {
    if (context?.history?.metricsHistory) {
      setDailySummaries(context.history.metricsHistory);
    }
  }, [context?.history?.metricsHistory]);

  // Update the useEffect for real-time metrics
  useEffect(() => {
    if (context?.isMonitoring && context?.realtimeMetrics) {
        try {
            const newMetrics = {
                ...context.realtimeMetrics,
                timestamp: new Date().toISOString()
            };
            setMetrics(newMetrics);

            const now = new Date();
            const newSummary = {
                id: generateUniqueId(`${format(now, 'yyyy-MM-dd')}-${context.selectedInterface || 'all'}`),
                date: format(now, 'yyyy-MM-dd'),
                timestamp: now.toISOString(),
                interface: context.selectedInterface || 'all',
                metrics: {
                    avgLatency: newMetrics.latency || 0,
                    avgPacketLoss: newMetrics.packetLoss || 0,
                    downloadSpeed: newMetrics.downloadSpeed || 0,
                    uploadSpeed: newMetrics.uploadSpeed || 0
                }
            };

            setDailySummaries(prev => {
                // Remove any existing entries with the same date and interface
                const filtered = prev.filter(s => 
                    !(s.date === newSummary.date && s.interface === newSummary.interface)
                );
                return [newSummary, ...filtered];
            });

            // Save to NetworkStateManager
            NetworkStateManager.saveMetricsWithBOM(newMetrics);
            NetworkStateManager.saveHistoryWithBOM([newSummary, ...dailySummaries]);
        } catch (err) {
            console.error('Error processing real-time metrics:', err);
        }
    }
  }, [context?.isMonitoring, context?.realtimeMetrics, context?.selectedInterface]);

  // Handle date range change
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    setShowDatePicker(false);
  };

  // Handle interface filter change
  const handleInterfaceFilterChange = (e) => {
    setInterfaceFilter(e.target.value);
  };

  // Update the handleViewDetails function
  const handleViewDetails = (date) => {
    const now = new Date();
    const detailsForDate = {
        id: generateUniqueId(`${date}-${interfaceFilter}`),
        date: date,
        interface: interfaceFilter,
        timestamp: now.toISOString(),
        metrics: [
            { 
                id: generateUniqueId(`${date}-${interfaceFilter}-metric-1`),
                timestamp: `${date}T08:00:00`, 
                latency: Math.round(20 + Math.random() * 30),
                packetLoss: parseFloat((Math.random() * 2).toFixed(2)),
                downloadSpeed: Math.round(50 + Math.random() * 50),
                uploadSpeed: Math.round(10 + Math.random() * 20),
                errorRate: parseFloat((Math.random() * 1).toFixed(2))
            },
            { 
                id: generateUniqueId(`${date}-${interfaceFilter}-metric-2`),
                timestamp: `${date}T12:00:00`, 
                latency: Math.round(20 + Math.random() * 30),
                packetLoss: parseFloat((Math.random() * 2).toFixed(2)),
                downloadSpeed: Math.round(50 + Math.random() * 50),
                uploadSpeed: Math.round(10 + Math.random() * 20),
                errorRate: parseFloat((Math.random() * 1).toFixed(2))
            },
            { 
                id: generateUniqueId(`${date}-${interfaceFilter}-metric-3`),
                timestamp: `${date}T16:00:00`, 
                latency: Math.round(20 + Math.random() * 30),
                packetLoss: parseFloat((Math.random() * 2).toFixed(2)),
                downloadSpeed: Math.round(50 + Math.random() * 50),
                uploadSpeed: Math.round(10 + Math.random() * 20),
                errorRate: parseFloat((Math.random() * 1).toFixed(2))
            },
            { 
                id: generateUniqueId(`${date}-${interfaceFilter}-metric-4`),
                timestamp: `${date}T20:00:00`, 
                latency: Math.round(20 + Math.random() * 30),
                packetLoss: parseFloat((Math.random() * 2).toFixed(2)),
                downloadSpeed: Math.round(50 + Math.random() * 50),
                uploadSpeed: Math.round(10 + Math.random() * 20),
                errorRate: parseFloat((Math.random() * 1).toFixed(2))
            }
        ]
    };
    
    setSelectedDetails(detailsForDate);
    setShowDetailsModal(true);
  };
  
  // Function to close the modal
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedDetails(null);
  };

  // Handle download data
  const handleDownload = async (date) => {
    try {
      setDownloadingDates(prev => ({ ...prev, [date]: true }));
      
      const packetLossData = getStoredData(STORAGE_KEYS.PACKET_LOSS);
      const latencyData = getStoredData(STORAGE_KEYS.LATENCY);
      const downloadData = getStoredData(STORAGE_KEYS.DOWNLOAD);
      const uploadData = getStoredData(STORAGE_KEYS.UPLOAD);

      // Filter data for the selected date
      const dateData = {
        packetLoss: packetLossData.filter(d => d.timestamp.startsWith(date)),
        latency: latencyData.filter(d => d.timestamp.startsWith(date)),
        download: downloadData.filter(d => d.timestamp.startsWith(date)),
        upload: uploadData.filter(d => d.timestamp.startsWith(date))
      };

      // Create CSV content
      const csvRows = ['Timestamp,Packet Loss (%),Latency (ms),Download Speed (Mbps),Upload Speed (Mbps)'];
      
      // Combine all timestamps
      const timestamps = new Set([
        ...dateData.packetLoss.map(d => d.timestamp),
        ...dateData.latency.map(d => d.timestamp),
        ...dateData.download.map(d => d.timestamp),
        ...dateData.upload.map(d => d.timestamp)
      ]);

      // Create rows for each timestamp
      timestamps.forEach(timestamp => {
        const packetLoss = dateData.packetLoss.find(d => d.timestamp === timestamp)?.value || '';
        const latency = dateData.latency.find(d => d.timestamp === timestamp)?.value || '';
        const download = dateData.download.find(d => d.timestamp === timestamp)?.value || '';
        const upload = dateData.upload.find(d => d.timestamp === timestamp)?.value || '';
        
        csvRows.push(`${timestamp},${packetLoss},${latency},${download},${upload}`);
      });

      const csvContent = csvRows.join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `network-data-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Error downloading data:", err);
    } finally {
      setDownloadingDates(prev => ({ ...prev, [date]: false }));
    }
  };

  // Add the modal component with enhanced details
  const DetailsModal = () => {
    if (!showDetailsModal || !selectedDetails) return null;
    
    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                Network Data Details - {selectedDetails.date}
              </h2>
              <button 
                onClick={closeDetailsModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Interface: {selectedDetails.interface === 'all' ? 'All Interfaces' : selectedDetails.interface}
            </p>
          </div>
          
          <div className="p-6">
            {/* Summary metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">Avg. Latency</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {selectedDetails.metrics.reduce((sum, m) => sum + m.latency, 0) / selectedDetails.metrics.length}
                  <span className="text-sm font-normal ml-1">ms</span>
                </p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800">Avg. Packet Loss</h3>
                <p className="text-2xl font-bold text-yellow-600">
                  {(selectedDetails.metrics.reduce((sum, m) => sum + m.packetLoss, 0) / selectedDetails.metrics.length).toFixed(2)}
                  <span className="text-sm font-normal ml-1">%</span>
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">Avg. Download</h3>
                <p className="text-2xl font-bold text-green-600">
                  {(selectedDetails.metrics.reduce((sum, m) => sum + m.downloadSpeed, 0) / selectedDetails.metrics.length).toFixed(1)}
                  <span className="text-sm font-normal ml-1">Mbps</span>
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">Avg. Upload</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {(selectedDetails.metrics.reduce((sum, m) => sum + m.uploadSpeed, 0) / selectedDetails.metrics.length).toFixed(1)}
                  <span className="text-sm font-normal ml-1">Mbps</span>
                </p>
              </div>
            </div>
            
            {/* Detailed metrics table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Latency (ms)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Packet Loss (%)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Download (Mbps)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload (Mbps)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error Rate (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedDetails.metrics.map((metric) => (
                    <tr key={metric.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.latency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.packetLoss}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.downloadSpeed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.uploadSpeed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.errorRate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeDetailsModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition duration-200 mr-2"
              >
                Close
              </button>
              <button
                onClick={() => router.push(`/network-data/details?date=${selectedDetails.date}&interface=${selectedDetails.interface}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
              >
                View Full Details
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Add function to handle data export
  const handleExportData = () => {
    const exportData = {
      metrics: StorageManager.getMetricsWithBOM(),
      traffic: StorageManager.getTrafficWithBOM(),
      history: StorageManager.getHistoryWithBOM(),
      exportDate: new Date().toISOString()
    };

    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-data-export-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Add function to handle data import
  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.metrics) StorageManager.saveMetricsWithBOM(data.metrics);
        if (data.traffic) StorageManager.saveTrafficWithBOM(data.traffic);
        if (data.history) StorageManager.saveHistoryWithBOM(data.history);
        
        // Reload the page to reflect changes
        window.location.reload();
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  // Add export/import buttons to the UI
  const renderDataControls = () => (
    <div className="flex justify-end space-x-4 mb-4">
      <button
        onClick={handleExportData}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Export Data
      </button>
      <label className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer">
        Import Data
        <input
          type="file"
          accept=".json"
          onChange={handleImportData}
          className="hidden"
        />
      </label>
      <button
        onClick={() => {
          if (window.confirm('Are you sure you want to clear all data?')) {
            StorageManager.clearAllData();
            window.location.reload();
          }
        }}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Clear Data
      </button>
    </div>
  );

  // Filter data based on date range and interface
  const filteredData = dailySummaries.filter(entry => {
    const dateMatch = entry.date >= format(dateRange.startDate, 'yyyy-MM-dd') && entry.date <= format(dateRange.endDate, 'yyyy-MM-dd');
    const interfaceMatch = interfaceFilter === 'all' || entry.interface === interfaceFilter;
    return dateMatch && interfaceMatch;
  });

  // Add this section before the return statement
  const prepareChartData = () => {
    if (!filteredData || filteredData.length === 0) {
      return [];
    }

    // Sort data by timestamp and ensure all entries have required fields
    const sortedData = [...filteredData]
      .filter(entry => entry && entry.timestamp && entry.metrics)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Take the last 20 entries for better visualization
    return sortedData.slice(-20);
  };

  const chartData = prepareChartData();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {renderDataControls()}
      
      {/* Error Display */}
      {context?.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <FaExclamationTriangle className="text-red-500 mt-1 mr-3" />
            <div>
              <h3 className="text-red-800 font-medium">Error: {context.error.context}</h3>
              <p className="text-red-700 mt-1">{context.error.message}</p>
              <p className="text-red-600 text-sm mt-1">
                {new Date(context.error.timestamp).toLocaleString()}
              </p>
              <button
                onClick={context.clearError}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Metrics Display */}
      {context?.isMonitoring && context?.realtimeMetrics && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800">Download Speed</h3>
            <p className="text-2xl font-bold text-blue-600">
              {context.realtimeMetrics.downloadSpeed.toFixed(2)}
              <span className="text-sm font-normal ml-1">Mbps</span>
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-800">Upload Speed</h3>
            <p className="text-2xl font-bold text-green-600">
              {context.realtimeMetrics.uploadSpeed.toFixed(2)}
              <span className="text-sm font-normal ml-1">Mbps</span>
            </p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800">Latency</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {context.realtimeMetrics.latency.toFixed(1)}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-800">Packet Loss</h3>
            <p className="text-2xl font-bold text-red-600">
              {context.realtimeMetrics.packetLoss.toFixed(2)}
              <span className="text-sm font-normal ml-1">%</span>
            </p>
          </div>
        </div>
      )}

      {/* Monitoring Status */}
      {context?.isMonitoring && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 flex items-center">
          <div className="animate-pulse h-3 w-3 bg-green-500 rounded-full mr-2"></div>
          <span>Real-time monitoring active</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-0">Network Data History</h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Date Range Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md flex items-center text-gray-700 hover:bg-gray-50"
            >
              <FaCalendarAlt className="mr-2 text-gray-500" />
              <span>
                {format(dateRange.startDate, 'MMM d, yyyy')} - {format(dateRange.endDate, 'MMM d, yyyy')}
              </span>
            </button>
            
            {showDatePicker && (
              <div className="absolute right-0 mt-2 z-10">
                <DateRangePicker
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={handleDateRangeChange}
                  onClose={() => setShowDatePicker(false)}
                />
              </div>
            )}
          </div>
          
          {/* Interface Filter */}
          <div className="relative">
            <div className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700">
              <FaFilter className="mr-2 text-gray-500" />
              <select
                value={interfaceFilter}
                onChange={handleInterfaceFilterChange}
                className="bg-transparent border-none focus:ring-0 w-full"
              >
                <option value="all">All Interfaces</option>
                <option value="eth0">eth0</option>
                <option value="wlan0">wlan0</option>
                <option value="lo">lo</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Data Source Indicator */}
      <div className="mb-4">
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
          {context?.isMonitoring ? 'Real-time monitoring active' : 
           dailySummaries.length > 0 ? 'Data from storage' : 'No data available'}
        </span>
      </div>
      
      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        /* Data List */
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interface</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Latency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packet Loss</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Download Speed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Speed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((entry) => {
                // Use the existing ID or generate a new one if missing
                const entryId = entry.id || generateUniqueId(`${entry.date}-${entry.interface}`);
                return (
                  <tr key={entryId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.interface}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.metrics.avgLatency.toFixed(1)} ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.metrics.avgPacketLoss.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.metrics.downloadSpeed.toFixed(2)} Mbps
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.metrics.uploadSpeed.toFixed(2)} Mbps
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(entry.date)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleDownload(entry.date)}
                        className="text-green-600 hover:text-green-900 inline-flex items-center"
                        disabled={downloadingDates[entry.date]}
                      >
                        {downloadingDates[entry.date] ? (
                          <>
                            <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-green-600 rounded-full"></span>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <FaDownload className="mr-1" /> Download
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {filteredData.length === 0 && !loading && (
                <tr key="no-data">
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No data available for the selected date range and interface.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Update the Charts Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Network Metrics Visualization</h2>
        
        {/* Combined Metrics Chart */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-2">Combined Metrics</h3>
          <div className="bg-white p-4 rounded-lg shadow">
            <CombinedMetricsChart data={chartData} />
          </div>
        </div>
        
        {/* Individual Metrics Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">Download Speed</h3>
            <MetricsChart data={chartData} type="speed" />
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">Latency</h3>
            <MetricsChart data={chartData} type="latency" />
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">Packet Loss</h3>
            <MetricsChart data={chartData} type="packetLoss" />
          </div>
        </div>
      </div>

      {isMounted.current && showDetailsModal && selectedDetails && <DetailsModal />}
    </div>
  );
};

export default DailySummaryList;



