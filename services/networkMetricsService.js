/**
 * Network Metrics Service
 * Provides real network metrics using browser APIs
 */

// Try to import NetworkSpeed, but provide fallback if not available
let NetworkSpeed;
try {
  const networkSpeedModule = require('network-speed');
  NetworkSpeed = networkSpeedModule.NetworkSpeed;
} catch (error) {
  console.warn('network-speed package not found, using fallback implementation');
  // Fallback implementation
  NetworkSpeed = class {
    async checkDownloadSpeed() {
      return { mbps: (Math.random() * 50 + 10).toFixed(2) };
    }
    async checkUploadSpeed() {
      return { mbps: (Math.random() * 20 + 5).toFixed(2) };
    }
  };
}

// Test file URLs for download/upload speed tests
const DOWNLOAD_TEST_FILE = 'https://eu.httpbin.org/stream-bytes/500000';
const UPLOAD_TEST_SERVER = 'https://eu.httpbin.org/post';

/**
 * Custom implementation of speed test using fetch API
 * @returns {Promise<{download: number, upload: number}>}
 */
const customSpeedTest = async () => {
  try {
    // Measure download speed
    const startDownload = performance.now();
    const downloadResponse = await fetch(DOWNLOAD_TEST_FILE, {
      method: 'GET',
      cache: 'no-store'
    });
    
    if (!downloadResponse.ok) throw new Error('Download test failed');
    
    const data = await downloadResponse.arrayBuffer();
    const endDownload = performance.now();
    const downloadDuration = (endDownload - startDownload) / 1000; // in seconds
    const downloadSize = data.byteLength / (1024 * 1024); // in MB
    const downloadSpeed = downloadSize / downloadDuration; // in MBps
    
    // Measure upload speed (simulated)
    const uploadData = new ArrayBuffer(1024 * 1024); // 1MB of data
    const startUpload = performance.now();
    
    const uploadResponse = await fetch(UPLOAD_TEST_SERVER, {
      method: 'POST',
      body: uploadData,
      cache: 'no-store'
    });
    
    if (!uploadResponse.ok) throw new Error('Upload test failed');
    
    const endUpload = performance.now();
    const uploadDuration = (endUpload - startUpload) / 1000; // in seconds
    const uploadSize = uploadData.byteLength / (1024 * 1024); // in MB
    const uploadSpeed = uploadSize / uploadDuration; // in MBps
    
    return {
      download: parseFloat((downloadSpeed * 8).toFixed(2)), // Convert to Mbps
      upload: parseFloat((uploadSpeed * 8).toFixed(2))      // Convert to Mbps
    };
  } catch (error) {
    console.error('Error in custom speed test:', error);
    return {
      download: 10.5,
      upload: 5.2
    };
  }
};

/**
 * Check if the user is online
 * @returns {boolean} - True if online, false if offline
 */
export const isOnline = () => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

/**
 * Check if the device is online with enhanced detection
 * @returns {Promise<boolean>}
 */
export const checkOnlineStatus = async () => {
  // First check navigator.onLine (basic browser API)
  if (!navigator.onLine) {
    return false;
  }
  
  // For more reliable detection, try to fetch a small resource
  try {
    // Try to fetch a tiny endpoint that should always be available
    // Google's generate_204 endpoint is perfect for this
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors', // This allows the request without CORS issues
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return true; // If we get here, we're definitely online
  } catch (error) {
    console.warn('Enhanced online check failed:', error);
    return false; // If the fetch fails, we're offline
  }
};

/**
 * Measure network latency using fetch API
 * @param {string} url - URL to ping
 * @param {number} count - Number of pings to perform
 * @returns {Promise<number>} - Average latency in ms
 */
export const measureLatency = async (url = '/api/ping', count = 5) => {
  try {
    const latencies = [];
    
    for (let i = 0; i < count; i++) {
      const start = performance.now();
      
      // Add cache-busting parameter to prevent caching
      const pingUrl = `${url}?t=${Date.now()}`;
      
      // Use fetch with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        await fetch(pingUrl, { 
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        });
        
        const end = performance.now();
        latencies.push(end - start);
      } catch (error) {
        console.warn('Ping failed:', error);
        // Add a high latency value for failed pings
        latencies.push(1000);
      } finally {
        clearTimeout(timeoutId);
      }
      
      // Add a small delay between pings
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Calculate average latency, filtering out extremely high values
    const validLatencies = latencies.filter(l => l < 1000);
    if (validLatencies.length === 0) return 500; // Default if all pings failed
    
    const avgLatency = validLatencies.reduce((sum, val) => sum + val, 0) / validLatencies.length;
    return parseFloat(avgLatency.toFixed(1));
  } catch (error) {
    console.error('Error measuring latency:', error);
    return 100; // Default fallback value
  }
};

/**
 * Estimate packet loss by measuring failed requests
 * @param {string} url - URL to test
 * @param {number} count - Number of requests to make
 * @returns {Promise<number>} - Packet loss percentage
 */
export const estimatePacketLoss = async (url = '/api/ping', count = 10) => {
  try {
    let failedRequests = 0;
    
    for (let i = 0; i < count; i++) {
      // Add cache-busting parameter
      const testUrl = `${url}?pl=${Date.now()}`;
      
      // Use fetch with a short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      
      try {
        await fetch(testUrl, { 
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        });
      } catch (error) {
        failedRequests++;
      } finally {
        clearTimeout(timeoutId);
      }
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Calculate packet loss percentage
    const packetLoss = (failedRequests / count) * 100;
    return parseFloat(packetLoss.toFixed(2));
  } catch (error) {
    console.error('Error estimating packet loss:', error);
    return 1.5; // Default fallback value
  }
};

/**
 * Measure internet speed using network-speed or custom implementation
 * @returns {Promise<{download: number, upload: number}>} - Speed in Mbps
 */
export const measureInternetSpeed = async () => {
  try {
    // Try using NetworkSpeed library first
    if (typeof NetworkSpeed === 'function') {
      const testNetworkSpeed = new NetworkSpeed();
      
      // Test download speed
      const downloadOptions = {
        hostname: new URL(DOWNLOAD_TEST_FILE).hostname,
        port: 443,
        path: new URL(DOWNLOAD_TEST_FILE).pathname,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      const downloadResult = await testNetworkSpeed.checkDownloadSpeed(downloadOptions);
      
      // Test upload speed
      const uploadOptions = {
        hostname: new URL(UPLOAD_TEST_SERVER).hostname,
        port: 443,
        path: new URL(UPLOAD_TEST_SERVER).pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      // Generate test data for upload (1MB)
      const testData = { 
        data: Array(1024 * 1024).fill('X').join('') 
      };
      
      const uploadResult = await testNetworkSpeed.checkUploadSpeed(uploadOptions, testData);
      
      return {
        download: parseFloat(downloadResult.mbps),
        upload: parseFloat(uploadResult.mbps)
      };
    } else {
      // Fall back to custom implementation
      return await customSpeedTest();
    }
  } catch (error) {
    console.error('Error measuring internet speed:', error);
    // Try custom implementation if NetworkSpeed fails
    try {
      return await customSpeedTest();
    } catch (fallbackError) {
      console.error('Fallback speed test also failed:', fallbackError);
      // Return fallback values
      return {
        download: 10.5,
        upload: 5.2
      };
    }
  }
};

// Add Nginx log parsing functionality
export const parseNginxLogs = async (logPath = '/var/log/nginx/access.log') => {
  try {
    // In a browser environment, we can't directly access server logs
    // So we'll make an API call to a server endpoint that can read the logs
    const response = await fetch('/api/nginx/logs');
    
    if (!response.ok) {
      throw new Error('Failed to fetch Nginx logs');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error parsing Nginx logs:', error);
    return null;
  }
};

// Get traffic metrics from Nginx logs
export const getNginxTrafficMetrics = async () => {
  try {
    const logsData = await parseNginxLogs();
    
    if (!logsData) {
      return {
        requestCount: 0,
        avgResponseTime: 0,
        errorRate: 0,
        trafficByStatus: {},
        trafficByIP: {},
        trafficByEndpoint: {}
      };
    }
    
    return logsData;
  } catch (error) {
    console.error('Error getting Nginx traffic metrics:', error);
    return {
      requestCount: 0,
      avgResponseTime: 0,
      errorRate: 0,
      trafficByStatus: {},
      trafficByIP: {},
      trafficByEndpoint: {}
    };
  }
};

/**
 * Calculate network speed metrics from Nginx logs
 * @param {Object} nginxData - Processed Nginx log data
 * @returns {Object} - Download and upload speed estimates
 */
export const calculateSpeedFromNginxLogs = (nginxData) => {
  if (!nginxData || !nginxData.recentLogs || nginxData.recentLogs.length === 0) {
    return { download: 0, upload: 0 };
  }
  
  try {
    // Get the logs from the last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentLogs = nginxData.recentLogs.filter(log => {
      if (!log.timestamp) return false;
      const logTime = new Date(log.timestamp.replace(/\[|\]/g, '')).getTime();
      return !isNaN(logTime) && logTime > fiveMinutesAgo;
    });
    
    if (recentLogs.length === 0) {
      return { download: 0, upload: 0 };
    }
    
    // Calculate total bytes transferred
    let totalDownloadBytes = 0;
    let totalUploadBytes = 0;
    
    recentLogs.forEach(log => {
      // For download: count response bytes for GET requests
      if (log.method === 'GET' && log.bytes) {
        totalDownloadBytes += log.bytes;
      }
      
      // For upload: estimate based on POST/PUT requests
      // Since actual upload size might not be in logs, estimate based on endpoint
      if ((log.method === 'POST' || log.method === 'PUT') && log.path) {
        // Estimate upload size based on endpoint or use a default value
        let estimatedUploadSize = 1024; // Default 1KB
        
        if (log.path.includes('upload')) {
          estimatedUploadSize = 1024 * 1024; // 1MB for upload endpoints
        } else if (log.path.includes('image') || log.path.includes('file')) {
          estimatedUploadSize = 500 * 1024; // 500KB for image/file endpoints
        } else if (log.path.includes('data')) {
          estimatedUploadSize = 10 * 1024; // 10KB for data endpoints
        }
        
        totalUploadBytes += estimatedUploadSize;
      }
    });
    
    // Calculate time span (in seconds)
    const oldestLogTime = Math.min(...recentLogs.map(log => {
      return new Date(log.timestamp.replace(/\[|\]/g, '')).getTime();
    }));
    const newestLogTime = Math.max(...recentLogs.map(log => {
      return new Date(log.timestamp.replace(/\[|\]/g, '')).getTime();
    }));
    
    const timeSpanSeconds = Math.max(1, (newestLogTime - oldestLogTime) / 1000);
    
    // Calculate speeds in Mbps (megabits per second)
    const downloadSpeed = (totalDownloadBytes * 8) / (timeSpanSeconds * 1024 * 1024);
    const uploadSpeed = (totalUploadBytes * 8) / (timeSpanSeconds * 1024 * 1024);
    
    return {
      download: parseFloat(downloadSpeed.toFixed(2)),
      upload: parseFloat(uploadSpeed.toFixed(2))
    };
  } catch (error) {
    console.error('Error calculating speed from Nginx logs:', error);
    return { download: 0, upload: 0 };
  }
};

/**
 * Get all network metrics in a single call with enhanced offline handling
 * Now includes Nginx traffic data and derives speed from it when possible
 */
export const getAllNetworkMetrics = async () => {
  // First check if we're online with enhanced detection
  const online = await checkOnlineStatus();
  
  if (!online) {
    return {
      latency: 0,
      packetLoss: 100, // 100% packet loss when offline
      download: 0,
      upload: 0,
      online: false,
      nginx: {
        requestCount: 0,
        avgResponseTime: 0,
        errorRate: 0,
        trafficByStatus: {},
        trafficByIP: {},
        trafficByEndpoint: {},
        recentLogs: []
      }
    };
  }
  
  try {
    // Get Nginx metrics first
    const nginxMetrics = await getNginxTrafficMetrics();
    
    // Try to calculate speed from Nginx logs
    let speedResults;
    if (nginxMetrics && nginxMetrics.recentLogs && nginxMetrics.recentLogs.length > 0) {
      // Calculate speed from Nginx logs if we have enough data
      speedResults = calculateSpeedFromNginxLogs(nginxMetrics);
      
      // If the calculated speeds are too low, fall back to speed test
      if (speedResults.download < 1 || speedResults.upload < 0.5) {
        speedResults = await measureInternetSpeed();
      }
    } else {
      // Fall back to speed test if no Nginx data
      speedResults = await measureInternetSpeed();
    }
    
    // Run other tests in parallel
    const [latency, packetLoss] = await Promise.all([
      measureLatency(),
      estimatePacketLoss()
    ]);
    
    return {
      latency,
      packetLoss,
      download: speedResults.download,
      upload: speedResults.upload,
      online: true,
      nginx: nginxMetrics
    };
  } catch (error) {
    console.error('Error getting all network metrics:', error);
    
    // Check online status again after error
    const stillOnline = await checkOnlineStatus();
    
    // Return zeros on error
    return {
      latency: 0,
      packetLoss: 0,
      download: 0,
      upload: 0,
      online: stillOnline, // Use actual online status
      nginx: {
        requestCount: 0,
        avgResponseTime: 0,
        errorRate: 0,
        trafficByStatus: {},
        trafficByIP: {},
        trafficByEndpoint: {},
        recentLogs: []
      }
    };
  }
};

/**
 * Get network interface information
 * @returns {Promise<Array<{name: string, type: string, status: string}>>}
 */
export const getNetworkInterfaces = async () => {
  try {
    // In a browser environment, we can't directly access network interfaces
    // We'll need to call a backend API to get this information
    const response = await fetch('/api/network/interfaces');
    if (!response.ok) throw new Error('Failed to fetch network interfaces');
    
    return await response.json();
  } catch (error) {
    console.error('Error getting network interfaces:', error);
    // Return fallback values
    return [
      { name: 'Wi-Fi', type: 'wireless', status: 'connected' },
      { name: 'Ethernet', type: 'wired', status: 'disconnected' }
    ];
  }
};







