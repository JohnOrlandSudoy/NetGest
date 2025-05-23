/**
 * Third-Party Network Metrics API Client
 */

// API configuration
const API_KEY = process.env.NETWORK_API_KEY || 'your-api-key';
const API_BASE_URL = 'https://api.example.com/network'; // Replace with actual API URL

/**
 * Get network metrics from third-party API
 * @param {string} interfaceName - Network interface name (optional)
 * @returns {Promise<Object>} - Network metrics
 */
export async function getNetworkMetrics(interfaceName = '') {
  try {
    console.log('[API] Fetching network metrics from third-party API');
    
    const response = await fetch(`${API_BASE_URL}/metrics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      latency: data.latency || 0,
      packetLoss: data.packetLoss || 0,
      download: data.downloadSpeed || 0,
      upload: data.uploadSpeed || 0,
      timestamp: new Date().toISOString(),
      interface: interfaceName || 'default',
      source: 'third-party-api',
      isMockData: false
    };
  } catch (error) {
    console.error('[API] Error getting network metrics from third-party API:', error);
    throw error;
  }
}

export default {
  getNetworkMetrics
};