/**
 * Utility functions for network operations
 */

// Flag to disable all network polling
let networkPollingDisabled = false;

/**
 * Disable all network polling
 */
export const disableNetworkPolling = () => {
  networkPollingDisabled = true;
  console.log('Network polling disabled');
  
  // Also try to stop any active monitoring
  try {
    const defaultInterface = '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}';
    fetch(`/api/network/realtime?interface=${encodeURIComponent(defaultInterface)}&action=stop&t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }).catch(error => {
      console.error('Error stopping network monitoring:', error);
    });
  } catch (error) {
    console.error('Error stopping network monitoring:', error);
  }
};

/**
 * Enable network polling
 */
export const enableNetworkPolling = () => {
  networkPollingDisabled = false;
  console.log('Network polling enabled');
};

/**
 * Check if network polling is disabled
 * @returns {boolean} - True if network polling is disabled
 */
export const isNetworkPollingDisabled = () => networkPollingDisabled;

/**
 * Get network metrics (with polling check)
 * @param {string} interfaceName - Network interface name
 * @returns {Promise<Object>} - Network metrics
 */
export const getNetworkMetrics = async (interfaceName) => {
  // If polling is disabled, return simulated metrics
  if (networkPollingDisabled) {
    return {
      success: true,
      metrics: {
        latency: 45,
        packetLoss: 0.8,
        downloadSpeed: 25,
        uploadSpeed: 10,
        utilization: 0.4,
        timestamp: Date.now()
      },
      simulated: true,
      timestamp: Date.now()
    };
  }
  
  const encodedInterface = encodeURIComponent(interfaceName || '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}');
  const url = `/api/network/realtime?interface=${encodedInterface}&action=metrics&t=${Date.now()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch network metrics: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching network metrics:', error);
    
    // Return simulated metrics on error
    return {
      success: true,
      metrics: {
        latency: 45,
        packetLoss: 0.8,
        downloadSpeed: 25,
        uploadSpeed: 10,
        utilization: 0.4,
        timestamp: Date.now()
      },
      simulated: true,
      error: error.message,
      timestamp: Date.now()
    };
  }
};