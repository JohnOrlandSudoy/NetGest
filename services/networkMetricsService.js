'use client';

/**
 * Network Metrics Service
 * Provides real-time network metrics using polling
 */

// Event listeners
const listeners = new Map();
let pollingInterval = null;
const POLL_INTERVAL = 2000; // 2 seconds

/**
 * Subscribe to network metrics updates
 * @param {string} id - Unique identifier for the subscription
 * @param {Function} callback - Function to call with new metrics
 * @param {Object} options - Subscription options
 * @returns {Function} Unsubscribe function
 */
export function subscribeToNetworkMetrics(id, callback, options = {}) {
  const interfaceName = options.interface || 'default';
  
  // Add listener
  listeners.set(id, {
    callback,
    interfaceName,
    lastUpdate: 0
  });
  
  // Start polling if not already started
  if (!pollingInterval) {
    startPolling();
  }
  
  // Return unsubscribe function
  return () => {
    listeners.delete(id);
    
    // Stop polling if no more listeners
    if (listeners.size === 0 && pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };
}

/**
 * Start polling for network metrics
 */
function startPolling() {
  if (pollingInterval) return;
  
  // Poll immediately
  pollNetworkMetrics();
  
  // Set up interval
  pollingInterval = setInterval(pollNetworkMetrics, POLL_INTERVAL);
}

/**
 * Poll for network metrics
 */
async function pollNetworkMetrics() {
  // Group listeners by interface
  const interfaceGroups = new Map();
  
  for (const [id, listener] of listeners.entries()) {
    const { interfaceName } = listener;
    
    if (!interfaceGroups.has(interfaceName)) {
      interfaceGroups.set(interfaceName, []);
    }
    
    interfaceGroups.get(interfaceName).push(id);
  }
  
  // Fetch metrics for each interface
  for (const [interfaceName, listenerIds] of interfaceGroups.entries()) {
    try {
      // Get the earliest lastUpdate time for this interface
      let earliestUpdate = Date.now();
      for (const id of listenerIds) {
        earliestUpdate = Math.min(earliestUpdate, listeners.get(id).lastUpdate);
      }
      
      // Fetch metrics
      const url = `/api/network/metrics?interface=${interfaceName}&since=${earliestUpdate}&t=${Date.now()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }
      
      const metrics = await response.json();
      
      // Update listeners
      for (const id of listenerIds) {
        const listener = listeners.get(id);
        if (listener) {
          listener.lastUpdate = Date.now();
          listener.callback(metrics);
        }
      }
    } catch (error) {
      console.error(`Error fetching metrics for interface ${interfaceName}:`, error);
      
      // Provide fallback data
      const fallbackMetrics = {
        latency: Math.floor(Math.random() * 60) + 20, // 20-80ms
        packetLoss: parseFloat((Math.random() * 2).toFixed(2)), // 0-2%
        download: Math.floor(Math.random() * 50) + 20, // 20-70 Mbps
        upload: Math.floor(Math.random() * 20) + 5, // 5-25 Mbps
        timestamp: new Date().toISOString(),
        source: 'fallback'
      };
      
      // Update listeners with fallback data
      for (const id of listenerIds) {
        const listener = listeners.get(id);
        if (listener) {
          listener.callback(fallbackMetrics);
        }
      }
    }
  }
}

/**
 * Get current network metrics (one-time fetch)
 * @param {string} interfaceName - Network interface name
 * @returns {Promise<Object>} Network metrics
 */
export async function getCurrentNetworkMetrics(interfaceName = 'default') {
  try {
    const url = `/api/network/metrics?interface=${interfaceName}&t=${Date.now()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching current metrics:', error);
    
    // Return fallback data
    return {
      latency: Math.floor(Math.random() * 60) + 20, // 20-80ms
      packetLoss: parseFloat((Math.random() * 2).toFixed(2)), // 0-2%
      download: Math.floor(Math.random() * 50) + 20, // 20-70 Mbps
      upload: Math.floor(Math.random() * 20) + 5, // 5-25 Mbps
      timestamp: new Date().toISOString(),
      source: 'fallback'
    };
  }
}

/**
 * Clean up resources
 */
export function cleanup() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  
  listeners.clear();
}

