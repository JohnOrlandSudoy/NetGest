'use client';

/**
 * NetworkDataService.js
 * Centralized service for all network data operations
 */
import { isCacheValid, getCachedData, setCachedData } from './cacheService';

// Constants
const CACHE_KEYS = {
  INTERFACES: 'network-interfaces',
  METRICS: 'network-metrics',
  NGINX_LOGS: 'nginx-logs',
  TRAFFIC_DATA: 'traffic-data'
};

const CACHE_TIMES = {
  INTERFACES: 5 * 60 * 1000, // 5 minutes
  METRICS: 30 * 1000,        // 30 seconds
  NGINX_LOGS: 60 * 1000,     // 1 minute
  TRAFFIC_DATA: 2 * 60 * 1000 // 2 minutes
};

/**
 * Get network interfaces with caching
 * @returns {Promise<Array>} Network interfaces
 */
export const getNetworkInterfaces = async () => {
  try {
    // Check cache first
    if (isCacheValid(CACHE_KEYS.INTERFACES, CACHE_TIMES.INTERFACES)) {
      console.log('[NetworkService] Using cached network interfaces');
      return getCachedData(CACHE_KEYS.INTERFACES);
    }

    console.log('[NetworkService] Fetching network interfaces');
    const response = await fetch(`/api/network/interfaces?t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch interfaces: ${response.status}`);
    }

    const data = await response.json();
    const interfaces = data.interfaces || [];

    // Cache the result
    setCachedData(CACHE_KEYS.INTERFACES, interfaces);
    return interfaces;
  } catch (error) {
    console.error('[NetworkService] Error fetching interfaces:', error);
    // Return fallback interfaces
    return ['eth0', 'wlan0'];
  }
};

/**
 * Get network metrics from Nginx
 * @returns {Promise<Object>} Network metrics
 */
export const getNetworkMetrics = async () => {
  try {
    // Check cache first
    if (isCacheValid(CACHE_KEYS.METRICS, CACHE_TIMES.METRICS)) {
      console.log('[NetworkService] Using cached network metrics');
      return getCachedData(CACHE_KEYS.METRICS);
    }

    console.log('[NetworkService] Fetching network metrics from Nginx');
    const response = await fetch(`/api/network/metrics?source=nginx&t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate and sanitize the data
    const sanitizedData = {
      ...data,
      latency: typeof data.latency === 'number' ? Math.min(Math.max(data.latency, 0), 1000) : 50,
      packetLoss: typeof data.packetLoss === 'number' ? Math.min(Math.max(data.packetLoss, 0), 100) : 1,
      download: typeof data.download === 'number' ? Math.min(Math.max(data.download, 0), 1000) : 25,
      upload: typeof data.upload === 'number' ? Math.min(Math.max(data.upload, 0), 500) : 10,
      timestamp: data.timestamp || new Date().toISOString(),
      source: data.source || 'nginx'
    };
    
    // Cache the sanitized result
    setCachedData(CACHE_KEYS.METRICS, sanitizedData);
    return sanitizedData;
  } catch (error) {
    console.error('[NetworkService] Error fetching network metrics:', error);
    
    // Try fallback API
    try {
      const fallbackResponse = await fetch(`/api/network/fallback-metrics?t=${Date.now()}`);
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        return fallbackData;
      }
    } catch (fallbackError) {
      console.error('[NetworkService] Fallback API also failed:', fallbackError);
    }
    
    // Return default values if all else fails
    return {
      latency: 50,
      packetLoss: 1,
      download: 25,
      upload: 10,
      timestamp: new Date().toISOString(),
      source: 'default'
    };
  }
};

/**
 * Get Nginx logs with caching
 * @returns {Promise<Object>} Nginx logs and traffic data
 */
export const getNginxLogs = async () => {
  try {
    // Check cache first
    if (isCacheValid(CACHE_KEYS.NGINX_LOGS, CACHE_TIMES.NGINX_LOGS)) {
      console.log('[NetworkService] Using cached Nginx logs');
      return getCachedData(CACHE_KEYS.NGINX_LOGS);
    }

    console.log('[NetworkService] Fetching Nginx logs');
    const response = await fetch(`/api/nginx/logs?t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Nginx logs: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate and sanitize the data
    const sanitizedData = {
      ...data,
      avgResponseTime: typeof data.avgResponseTime === 'number' ? 
        Math.min(Math.max(data.avgResponseTime, 0), 1000) : 50,
      errorRate: typeof data.errorRate === 'number' ? 
        Math.min(Math.max(data.errorRate, 0), 100) : 1
    };
    
    // Sanitize traffic volume data if it exists
    if (sanitizedData.trafficVolume) {
      sanitizedData.trafficVolume = {
        ...sanitizedData.trafficVolume,
        downloadSpeedMbps: typeof sanitizedData.trafficVolume.downloadSpeedMbps === 'number' ? 
          Math.min(Math.max(sanitizedData.trafficVolume.downloadSpeedMbps, 0), 1000) : 25,
        uploadSpeedMbps: typeof sanitizedData.trafficVolume.uploadSpeedMbps === 'number' ? 
          Math.min(Math.max(sanitizedData.trafficVolume.uploadSpeedMbps, 0), 500) : 10
      };
    }
    
    // Cache the sanitized result
    setCachedData(CACHE_KEYS.NGINX_LOGS, sanitizedData);
    return sanitizedData;
  } catch (error) {
    console.error('[NetworkService] Error fetching Nginx logs:', error);
    
    // Return mock data if fetch fails
    const mockData = {
      requestCount: 100,
      avgResponseTime: 50,
      errorRate: 1,
      trafficVolume: {
        downloadSpeedMbps: 25,
        uploadSpeedMbps: 10,
        totalDownloadBytes: 15000000,
        totalUploadBytes: 3000000,
        timeSpanSeconds: 60
      },
      source: 'mock'
    };
    
    return mockData;
  }
};

/**
 * Get traffic data from Nginx
 * @returns {Promise<Object>} Traffic data
 */
export const getTrafficData = async () => {
  try {
    // Check cache first
    if (isCacheValid(CACHE_KEYS.TRAFFIC_DATA, CACHE_TIMES.TRAFFIC_DATA)) {
      console.log('[NetworkService] Using cached traffic data');
      return getCachedData(CACHE_KEYS.TRAFFIC_DATA);
    }

    // Get traffic data from Nginx logs
    const nginxData = await getNginxLogs();
    
    if (!nginxData || !nginxData.trafficVolume) {
      throw new Error('No traffic data available in Nginx logs');
    }
    
    const trafficData = {
      download: nginxData.trafficVolume.downloadSpeedMbps || 0,
      upload: nginxData.trafficVolume.uploadSpeedMbps || 0,
      totalBytes: nginxData.trafficVolume.totalDownloadBytes || 0,
      timeSpan: nginxData.trafficVolume.timeSpanSeconds || 0,
      source: 'nginx',
      timestamp: new Date().toISOString()
    };
    
    // Cache the result
    setCachedData(CACHE_KEYS.TRAFFIC_DATA, trafficData);
    return trafficData;
  } catch (error) {
    console.error('[NetworkService] Error getting traffic data:', error);
    // Return fallback data
    return {
      download: 0,
      upload: 0,
      totalBytes: 0,
      timeSpan: 0,
      source: 'fallback',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Generate historical chart data based on current Nginx metrics
 * @param {number} baseValue - Base value from Nginx
 * @param {string} metric - Metric type (download, upload, latency, packetLoss)
 * @param {number} hours - Number of hours of history to generate
 * @returns {Array} Historical data points
 */
export const generateHistoricalData = (baseValue, metric, hours = 24) => {
  const now = new Date();
  const data = [];
  
  for (let i = 0; i < hours; i++) {
    const time = new Date(now);
    time.setHours(time.getHours() - i);
    
    // Add time-based variation
    const hourOfDay = time.getHours();
    let multiplier = 1;
    
    // Different patterns for different metrics
    if (metric === 'download' || metric === 'upload') {
      // Network traffic is typically higher during business hours and evenings
      if (hourOfDay >= 9 && hourOfDay <= 17) {
        // Business hours - gradual rise and fall
        multiplier = 1.2 + Math.sin((hourOfDay - 9) / 8 * Math.PI) * 0.3;
      } else if (hourOfDay >= 19 && hourOfDay <= 23) {
        // Evening entertainment - higher usage
        multiplier = 1.5 + Math.sin((hourOfDay - 19) / 4 * Math.PI) * 0.5;
      } else if (hourOfDay >= 0 && hourOfDay <= 5) {
        // Late night/early morning - low usage
        multiplier = 0.5 + Math.random() * 0.2;
      } else {
        // Other times - moderate usage
        multiplier = 0.8 + Math.random() * 0.3;
      }
    } else if (metric === 'latency') {
      // Latency often increases during peak usage times
      if (hourOfDay >= 9 && hourOfDay <= 17 || hourOfDay >= 19 && hourOfDay <= 22) {
        multiplier = 1.2 + Math.random() * 0.3;
      } else {
        multiplier = 0.8 + Math.random() * 0.2;
      }
    } else if (metric === 'packetLoss') {
      // Packet loss is generally low but can spike
      if (i % 6 === 0) { // Occasional spikes
        multiplier = 1.5 + Math.random() * 1.0;
      } else {
        multiplier = 0.7 + Math.random() * 0.3;
      }
    }
    
    // Add some random variation
    const randomFactor = 0.9 + Math.random() * 0.2;
    
    data.push({
      time,
      value: Math.max(0, baseValue * multiplier * randomFactor)
    });
  }
  
  return data;
};

