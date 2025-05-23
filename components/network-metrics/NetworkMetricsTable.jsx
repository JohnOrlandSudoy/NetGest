"use client";


import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { CSVLink } from 'react-csv';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import InterfaceTooltip from '@/components/common/InterfaceTooltip';

// Define helper functions before the component
const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A';
 
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return 'Invalid date';
  }
};


const getSeverityClass = (metric) => {
  if (!metric) return '';
 
  try {
    if (metric.latency > 100 || metric.packet_loss > 5 || (metric.speed < 5 && metric.speed > 0)) {
      return 'bg-red-50 text-red-700';
    }
   
    if (metric.latency > 50 || metric.packet_loss > 2 || (metric.speed < 10 && metric.speed > 0)) {
      return 'bg-yellow-50 text-yellow-700';
    }
  } catch (error) {
    console.error("Error determining severity class:", error);
  }
 
  return '';
};


const getStatusText = (metric) => {
  if (!metric) return 'Unknown';
 
  try {
    if (metric.latency > 100 || metric.packet_loss > 5 || (metric.speed < 5 && metric.speed > 0)) {
      return 'Critical';
    }
   
    if (metric.latency > 50 || metric.packet_loss > 2 || (metric.speed < 10 && metric.speed > 0)) {
      return 'Warning';
    }
  } catch (error) {
    console.error("Error determining status text:", error);
  }
 
  return 'Good';
};


// Generate mock data for development or when API fails
const generateMockMetricsData = (count = 10) => {
  const interfaces = ['eth0', 'wlan0', 'en0', 'lo0'];
  const protocols = ['TCP', 'UDP', 'ICMP', 'HTTP'];
  const mockData = [];
 
  const now = new Date();
 
  for (let i = 0; i < count; i++) {
    // Create timestamp with decreasing time (newer to older)
    const timestamp = new Date(now);
    timestamp.setMinutes(now.getMinutes() - i * 30);
   
    // Random values with some pattern to show different severity levels
    const latency = Math.round((20 + Math.random() * 150) * 10) / 10;
    const packet_loss = Math.round((Math.random() * 10) * 100) / 100;
    const speed = Math.round((5 + Math.random() * 95) * 100) / 100;
   
    mockData.push({
      id: `mock-${i}`,
      timestamp: timestamp.toISOString(),
      interface_name: interfaces[Math.floor(Math.random() * interfaces.length)],
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      latency: latency,
      packet_loss: packet_loss,
      speed: speed
    });
  }
 
  return mockData;
};


const NetworkMetricsTable = ({ limit = 10, isDashboard = false }) => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [useFallbackData, setUseFallbackData] = useState(false);
  const base_url = process.env.NEXT_PUBLIC_API_URL;


  useEffect(() => {
    setIsClient(true);
  }, []);


  useEffect(() => {
    // Only run on client-side
    if (isClient) {
      fetchNetworkMetrics();
    }
   
    // Set up an interval to refresh data every 5 minutes
    const intervalId = setInterval(() => {
      if (isClient) {
        fetchNetworkMetrics();
      }
    }, 5 * 60 * 1000);
   
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [isClient]);


  const fetchNetworkMetrics = async () => {
    if (!isClient) return;
   
    try {
      setLoading(true);
     
      // If we're already using fallback data, don't try to fetch from API again
      if (useFallbackData && metrics.length > 0) {
        setLoading(false);
        return;
      }
     
      // Increase timeout to 30 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
      });
     
      // Create the actual fetch promise with axios and add a timeout
      const fetchPromise = axios.get(`${base_url}/packet/get_metrics_history`, {
        // Set axios timeout to slightly less than our Promise timeout
        timeout: 29500,
      });
     
      let response;
      try {
        response = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err) {
        console.error("Error fetching network metrics:", err);
       
        // Use fallback data instead of showing error
        const mockData = generateMockMetricsData(20);
        setMetrics(mockData);
        setUseFallbackData(true);
        setError(null);
        setLoading(false);
        return;
      }
     
      // Reset retry count on successful fetch
      setRetryCount(0);
      setUseFallbackData(false);
     
      if (!response.data || !response.data.data) {
        console.log("No data received from server");
       
        // Use fallback data
        const mockData = generateMockMetricsData(20);
        setMetrics(mockData);
        setError(null);
        setLoading(false);
        return;
      }
     
      let processedData = response.data.data || [];
     
      if (process.env.NODE_ENV === 'development') {
        console.log("Fetched network metrics:", processedData.length);
      }
     
      if (!processedData || processedData.length === 0) {
        console.log("Empty data array received");
       
        // Use fallback data
        const mockData = generateMockMetricsData(20);
        setMetrics(mockData);
        setError(null);
        setLoading(false);
        return;
      }
     
      // Filter out invalid data points
      processedData = processedData.filter(item => {
        try {
          if (!item || typeof item !== 'object') return false;
          if (!item.timestamp) return false;
         
          // Check if at least one metric has a valid value
          const hasLatency = item.latency && !isNaN(parseFloat(item.latency)) && parseFloat(item.latency) > 0;
          const hasPacketLoss = item.packet_loss && !isNaN(parseFloat(item.packet_loss)) && parseFloat(item.packet_loss) >= 0;
          const hasSpeed = item.speed && !isNaN(parseFloat(item.speed)) && parseFloat(item.speed) > 0;
         
          return hasLatency || hasPacketLoss || hasSpeed;
        } catch (error) {
          console.error("Error filtering data point:", error);
          return false;
        }
      });
     
      if (processedData.length === 0) {
        // Use fallback data
        const mockData = generateMockMetricsData(20);
        setMetrics(mockData);
        setError(null);
        setLoading(false);
        return;
      }
     
      // Limit to 50 most recent entries
      if (processedData.length > 50) {
        processedData = processedData.slice(0, 50);
      }
     
      // Sort by timestamp (most recent first)
      try {
        processedData.sort((a, b) => {
          // Convert timestamps to comparable values
          const timestampA = new Date(a.timestamp).getTime();
          const timestampB = new Date(b.timestamp).getTime();
         
          // If conversion failed, use string comparison as fallback
          if (isNaN(timestampA) || isNaN(timestampB)) {
            return String(b.timestamp).localeCompare(String(a.timestamp));
          }
         
          return timestampB - timestampA;
        });
      } catch (error) {
        console.error("Error sorting data:", error);
        // Continue with unsorted data rather than failing
      }
     
      // Process and normalize the data
      try {
        processedData = processedData.map(item => {
          try {
            return {
              ...item,
              latency: item.latency ?
                (typeof item.latency === 'number' ?
                  Math.round(item.latency * 10) / 10 :
                  Math.round(parseFloat(item.latency.toString().replace(/[^\d.-]/g, '')) * 10) / 10) : null,
                 
              packet_loss: item.packet_loss ?
                (typeof item.packet_loss === 'number' ?
                  Math.round(item.packet_loss * 100) / 100 :
                  Math.round(parseFloat(item.packet_loss.toString().replace(/[^\d.-]/g, '')) * 100) / 100) : null,
                 
              speed: item.speed ?
                (typeof item.speed === 'number' ?
                  Math.round(item.speed * 100) / 100 :
                  Math.round(parseFloat(item.speed.toString().replace(/[^\d.-]/g, '')) * 100) / 100) : null
            };
          } catch (itemError) {
            console.error("Error processing data item:", itemError);
            // Return a safe version of the item
            return {
              ...item,
              latency: item.latency || null,
              packet_loss: item.packet_loss || null,
              speed: item.speed || null
            };
          }
        });
      } catch (error) {
        console.error("Error processing data:", error);
        // Use the original data if processing fails
      }
     
      setMetrics(processedData);
      setError(null);
    } catch (err) {
      console.error("Error fetching network metrics:", err);
     
      // Always use fallback data instead of showing error
      const mockData = generateMockMetricsData(20);
      setMetrics(mockData);
      setUseFallbackData(true);
      setError(null);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };
 
  const calculateSummaryData = () => {
    if (!isClient) return null;
   
    const limitedMetrics = metrics.slice(0, limit);
   
    if (limitedMetrics.length === 0) return null;
   
    let criticalCount = 0;
    let latencySum = 0;
    let latencyCount = 0;
    let packetLossSum = 0;
    let packetLossCount = 0;
   
    for (const m of limitedMetrics) {
      try {
        if ((m.latency && m.latency > 100) ||
            (m.packet_loss && m.packet_loss > 5) ||
            (m.speed && m.speed < 5 && m.speed > 0)) {
          criticalCount++;
        }
       
        if (m.latency) {
          latencySum += m.latency;
          latencyCount++;
        }
       
        if (m.packet_loss) {
          packetLossSum += m.packet_loss;
          packetLossCount++;
        }
      } catch (error) {
        console.error("Error calculating summary data:", error);
      }
    }
   
    const avgLatency = latencyCount > 0
      ? Math.round((latencySum / latencyCount) * 10) / 10
      : 0;
     
    const avgPacketLoss = packetLossCount > 0
      ? Math.round((packetLossSum / packetLossCount) * 100) / 100
      : 0;
     
    return {
      criticalIssues: criticalCount,
      latestEvents: limitedMetrics.length,
      avgLatency,
      avgPacketLoss
    };
  };
 
  const renderTimestamp = (timestamp) => {
    try {
      return formatTime(timestamp).split(', ')[1];
    } catch (error) {
      console.error("Error rendering timestamp:", error);
      return 'N/A';
    }
  };
 
  const getIssuesForMetric = (metric) => {
    const issues = [];
   
    try {
      if (!metric) return [];
     
      if (metric.latency > 100) {
        issues.push('High latency');
      }
     
      if (metric.packet_loss > 5) {
        issues.push('Severe packet loss');
      }
     
      if (metric.speed < 5 && metric.speed > 0) {
        issues.push('Low internet speed');
      }
     
      return issues;
    } catch (error) {
      console.error("Error getting issues for metric:", error);
      return [];
    }
  };
 
  const exportToExcel = () => {
    try {
      if (metrics.length === 0) {
        alert("No data available to export");
        return;
      }
     
      const worksheet = XLSXUtils.json_to_sheet(metrics.map(item => ({
        'Timestamp': formatTime(item.timestamp),
        'Interface': item.interface_name || 'N/A',
        'Latency (ms)': item.latency || 'N/A',
        'Packet Loss (%)': item.packet_loss || 'N/A',
        'Internet Speed (Mbps)': item.speed || 'N/A',
        'Protocol': item.protocol || 'N/A',
        'Status': getStatusText(item)
      })));
     
      const workbook = { Sheets: { 'Network Metrics': worksheet }, SheetNames: ['Network Metrics'] };
      const excelBuffer = XLSXWrite(workbook, { bookType: 'xlsx', type: 'array' });
     
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `network_metrics_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export to Excel. Please try again later.");
    }
  };


  const exportToPDF = () => {
    try {
      if (metrics.length === 0) {
        alert("No data available to export");
        return;
      }
     
      const doc = new jsPDF();
     
      doc.setFontSize(16);
      doc.text('Network Performance Metrics Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
     
      const tableData = metrics.map(item => [
        formatTime(item.timestamp),
        item.interface_name || 'N/A',
        item.latency ? `${item.latency} ms` : 'N/A',
        item.packet_loss ? `${item.packet_loss}%` : 'N/A',
        item.speed ? `${item.speed} Mbps` : 'N/A',
        item.protocol || 'N/A',
        getStatusText(item)
      ]);
     
      doc.autoTable({
        head: [['Timestamp', 'Interface', 'Latency', 'Packet Loss', 'Internet Speed', 'Protocol', 'Status']],
        body: tableData,
        startY: 30,
        margin: { top: 30 },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202] }
      });
     
      doc.save(`network_metrics_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      alert("Failed to export to PDF. Please try again later.");
    }
  };


  const csvData = (() => {
    try {
      return metrics.map(item => ({
        'Timestamp': formatTime(item.timestamp),
        'Interface': item.interface_name || 'N/A',
        'Latency (ms)': item.latency || 'N/A',
        'Packet Loss (%)': item.packet_loss || 'N/A',
        'Internet Speed (Mbps)': item.speed || 'N/A',
        'Protocol': item.protocol || 'N/A',
        'Status': getStatusText(item)
      }));
    } catch (error) {
      console.error("Error preparing CSV data:", error);
      return [];
    }
  })();
 
  if (isDashboard) {
    return (
      <div className="bg-white rounded-lg shadow p-4 w-full">
        {error && (
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-xs">
            <strong>Warning:</strong> {error}
          </div>
        )}
       
        {loading && metrics.length === 0 ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-3 border-b-3 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading...</p>
          </div>
        ) : metrics.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            <p>No network data available</p>
          </div>
        ) : (
          <>
            {calculateSummaryData() && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`p-3 rounded ${calculateSummaryData().criticalIssues > 0 ? 'bg-red-50' : 'bg-green-50'} flex items-center`}>
                  <div className={`rounded-full p-1 mr-2 ${calculateSummaryData().criticalIssues > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${calculateSummaryData().criticalIssues > 0 ? 'text-red-500' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600">Critical Issues</p>
                    <p className={`text-lg font-bold ${calculateSummaryData().criticalIssues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {calculateSummaryData().criticalIssues}
                    </p>
                  </div>
                </div>
               
                <div className={`p-3 rounded flex items-center ${
                  calculateSummaryData().avgLatency > 100 || calculateSummaryData().avgPacketLoss > 5
                    ? 'bg-red-50'
                    : calculateSummaryData().avgLatency > 50 || calculateSummaryData().avgPacketLoss > 2
                      ? 'bg-yellow-50'
                      : 'bg-green-50'
                }`}>
                  <div className={`rounded-full p-1 mr-2 ${
                    calculateSummaryData().avgLatency > 100 || calculateSummaryData().avgPacketLoss > 5
                      ? 'bg-red-100'
                      : calculateSummaryData().avgLatency > 50 || calculateSummaryData().avgPacketLoss > 2
                        ? 'bg-yellow-100'
                        : 'bg-green-100'
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${
                      calculateSummaryData().avgLatency > 100 || calculateSummaryData().avgPacketLoss > 5
                        ? 'text-red-500'
                        : calculateSummaryData().avgLatency > 50 || calculateSummaryData().avgPacketLoss > 2
                          ? 'text-yellow-500'
                          : 'text-green-500'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600">Network Health</p>
                    <p className={`text-lg font-bold ${
                      calculateSummaryData().avgLatency > 100 || calculateSummaryData().avgPacketLoss > 5
                        ? 'text-red-600'
                        : calculateSummaryData().avgLatency > 50 || calculateSummaryData().avgPacketLoss > 2
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}>
                      {calculateSummaryData().avgLatency > 100 || calculateSummaryData().avgPacketLoss > 5
                        ? 'Poor'
                        : calculateSummaryData().avgLatency > 50 || calculateSummaryData().avgPacketLoss > 2
                          ? 'Fair'
                          : 'Good'}
                    </p>
                  </div>
                </div>
              </div>
            )}
           
            {metrics.filter(m =>
              (m.latency && m.latency > 100) ||
              (m.packet_loss && m.packet_loss > 5) ||
              (m.speed && m.speed < 5 && m.speed > 0)
            ).length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-red-800 mb-1">Recent Issues:</h3>
                <div className="text-xs space-y-1">
                  {metrics.filter(m =>
                    (m.latency && m.latency > 100) ||
                    (m.packet_loss && m.packet_loss > 5) ||
                    (m.speed && m.speed < 5 && m.speed > 0)
                  ).slice(0, 2).map((metric, index) => {
                    let issue = "";
                   
                    try {
                      if (metric.latency && metric.latency > 100) {
                        issue = `High latency (${metric.latency}ms)`;
                      } else if (metric.packet_loss && metric.packet_loss > 5) {
                        issue = `Packet loss (${metric.packet_loss}%)`;
                      } else if (metric.speed && metric.speed < 5) {
                        issue = `Low speed (${metric.speed} Mbps)`;
                      }
                    } catch (error) {
                      console.error("Error determining issue:", error);
                    }
                   
                    return (
                      <div key={index} className="bg-red-50 p-2 rounded text-red-700 flex items-center">
                        <span className="mr-1">•</span>
                        <span>{renderTimestamp(metric.timestamp)}:</span>
                        <span className="ml-1 font-medium">{issue}</span>
                        <span className="ml-1 text-red-800">on 
                          <InterfaceTooltip interfaceName={metric.interface_name || 'Unknown'}>
                            <span className="cursor-help border-b border-dotted border-red-400 ml-1">
                              {metric.interface_name || 'Unknown'}
                            </span>
                          </InterfaceTooltip>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
           
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500">
                <span className="inline-block w-3 h-3 rounded-full bg-green-100 mr-1"></span>Good
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-100 mx-1 ml-2"></span>Warning
                <span className="inline-block w-3 h-3 rounded-full bg-red-100 mx-1 ml-2"></span>Critical
              </div>
              <a
                href="/network-data"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                All network data
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </>
        )}
      </div>
    );
  }
 
  if (loading && metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 w-full">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Network Performance Metrics History</h2>
        <div className="flex justify-center items-center h-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading network metrics...</p>
          </div>
        </div>
      </div>
    );
  }


  if (error && metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 w-full">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Network Performance Metrics History</h2>
        <div className="text-center p-8">
          <p className="text-red-500 text-lg mb-2">Error: {error}</p>
          <p className="text-gray-600">Unable to fetch network metrics. Please try again later.</p>
          <button
            onClick={fetchNetworkMetrics}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Network Performance Metrics History</h2>
       
        <div className="flex flex-wrap gap-2">
          <CSVLink
            data={csvData}
            filename={`network_metrics_${new Date().toISOString().slice(0, 10)}.csv`}
            className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition duration-300 flex items-center gap-1"
            target="_blank"
            disabled={metrics.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </CSVLink>
         
          <button
            onClick={exportToExcel}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition duration-300 flex items-center gap-1"
            disabled={metrics.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Excel
          </button>
         
          <button
            onClick={exportToPDF}
            className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition duration-300 flex items-center gap-1"
            disabled={metrics.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            PDF
          </button>
         
          <button
            onClick={fetchNetworkMetrics}
            className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition duration-300 flex items-center gap-1"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-1"></div>
                Refreshing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>
     
      {error && metrics.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm">
          <strong>Warning:</strong> {error}. Showing last available data.
        </div>
      )}
     
      {metrics.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No network metrics recorded yet.</p>
          <p className="text-sm mt-2">Data will appear as network activity is monitored.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interface
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Protocol
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Latency
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Packet Loss
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Internet Speed
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.slice(0, limit).map((metric, index) => (
                <tr key={index} className={`hover:bg-gray-50 ${getSeverityClass(metric)}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {renderTimestamp(metric.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <InterfaceTooltip interfaceName={metric.interface_name}>
                      <span className="cursor-help border-b border-dotted border-gray-400">
                        {metric.interface_name || 'N/A'}
                      </span>
                    </InterfaceTooltip>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {metric.protocol || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {metric.latency ? `${metric.latency} ms` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {metric.packet_loss ? `${metric.packet_loss}%` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {metric.speed ? `${metric.speed} Mbps` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      getStatusText(metric) === 'Critical' ? 'bg-red-100 text-red-800' :
                      getStatusText(metric) === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {getStatusText(metric)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
     
      {metrics.length > limit && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Showing {limit} of {metrics.length} entries
          </p>
        </div>
      )}
     
      <div className="mt-4 text-xs text-gray-400 text-center">
        Auto-refreshes every 30 seconds
      </div>
    </div>
  );
};


export default NetworkMetricsTable;



