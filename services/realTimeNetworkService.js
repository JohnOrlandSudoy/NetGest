'use client';

/**
 * Real-Time Network Metrics Service
 * Provides live network metrics using WebSockets and real traffic data
 */

import { io } from 'socket.io-client';

// Socket.io connection
let socket = null;
let metricsCallbacks = [];
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Initialize the real-time network metrics service
 * @returns {Promise<boolean>} Connection success
 */
export const initRealTimeNetworkService = async () => {
  if (socket) {
    return isConnected;
  }
  
  try {
    // First, initialize the socket server
    await fetch('/api/socket');
    
    // Create socket connection to the metrics server
    socket = io('/network-metrics', {
      path: '/api/socket/io',
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    
    // Set up event handlers
    socket.on('connect', () => {
      console.log('[RealTimeNetwork] Connected to metrics server');
      isConnected = true;
      reconnectAttempts = 0;
      
      // Request initial metrics
      socket.emit('subscribe', { type: 'all' });
    });
    
    socket.on('disconnect', () => {
      console.log('[RealTimeNetwork] Disconnected from metrics server');
      isConnected = false;
    });
    
    socket.on('metrics', (data) => {
      // Notify all callbacks with the new metrics
      metricsCallbacks.forEach(callback => callback(data));
    });
    
    socket.on('connect_error', (error) => {
      console.error('[RealTimeNetwork] Connection error:', error);
      reconnectAttempts++;
      
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('[RealTimeNetwork] Falling back to polling');
        // Fall back to polling if WebSocket fails
        startPollingFallback();
      }
    });
    
    return new Promise((resolve) => {
      // Wait for connection or timeout
      const timeout = setTimeout(() => {
        if (!isConnected) {
          console.log('[RealTimeNetwork] Connection timeout, falling back to polling');
          startPollingFallback();
          resolve(false);
        }
      }, 5000);
      
      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  } catch (error) {
    console.error('[RealTimeNetwork] Failed to initialize:', error);
    startPollingFallback();
    return false;
  }
};

/**
 * Subscribe to real-time network metrics
 * @param {Function} callback - Function to call with new metrics
 * @param {string} interfaceName - Network interface name
 * @returns {Function} Unsubscribe function
 */
export const subscribeToNetworkMetrics = (callback, interfaceName = '') => {
  if (!socket && !isConnected) {
    initRealTimeNetworkService();
  }
  
  // Add callback to the list
  metricsCallbacks.push(callback);
  
  // Subscribe to specific interface if provided
  if (socket && interfaceName) {
    socket.emit('subscribe', { type: 'interface', name: interfaceName });
  }
  
  // Return unsubscribe function
  return () => {
    metricsCallbacks = metricsCallbacks.filter(cb => cb !== callback);
    
    if (socket && interfaceName) {
      socket.emit('unsubscribe', { type: 'interface', name: interfaceName });
    }
  };
};

// Polling fallback for when WebSockets aren't available
let pollingInterval = null;

/**
 * Start polling fallback for real-time updates
 */
const startPollingFallback = () => {
  if (pollingInterval) {
    return;
  }
  
  console.log('[RealTimeNetwork] Starting polling fallback');
  
  // Poll every 2 seconds
  pollingInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/network/metrics?real=true&t=' + Date.now());
      if (response.ok) {
        const data = await response.json();
        metricsCallbacks.forEach(callback => callback(data));
      }
    } catch (error) {
      console.error('[RealTimeNetwork] Polling error:', error);
    }
  }, 2000);
};

/**
 * Stop polling fallback
 */
export const stopPollingFallback = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

/**
 * Get current network metrics (one-time fetch)
 * @param {string} interfaceName - Network interface name
 * @returns {Promise<Object>} Network metrics
 */
export const getCurrentNetworkMetrics = async (interfaceName = '') => {
  try {
    const url = `/api/network/metrics?real=true&interface=${interfaceName}&t=${Date.now()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch network metrics');
    }
    
    return await response.json();
  } catch (error) {
    console.error('[RealTimeNetwork] Error getting current metrics:', error);
    throw error;
  }
};

/**
 * Clean up resources
 */
export const cleanupRealTimeService = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  stopPollingFallback();
  metricsCallbacks = [];
  isConnected = false;
};

