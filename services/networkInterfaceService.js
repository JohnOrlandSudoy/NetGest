'use client';

/**
 * Network Interface Service
 * Provides functions to get and filter network interfaces
 */

/**
 * Get available network interfaces
 * @returns {Promise<Array>} List of network interfaces
 */
export const getNetworkInterfaces = async () => {
  try {
    // Try to get real network interfaces from the system
    const response = await fetch('/api/network/interfaces');
    
    if (!response.ok) {
      throw new Error('Failed to fetch network interfaces');
    }
    
    const interfaces = await response.json();
    
    // Filter to only show WiFi and Ethernet interfaces
    return filterWifiAndEthernetInterfaces(interfaces);
  } catch (error) {
    console.error('Error getting network interfaces:', error);
    
    // Fallback to common interface names
    return [
      { name: 'wlan0', type: 'wifi', description: 'WiFi Adapter' },
      { name: 'eth0', type: 'ethernet', description: 'Ethernet Adapter' }
    ];
  }
};

/**
 * Filter interfaces to only include WiFi and Ethernet
 * @param {Array} interfaces - List of all interfaces
 * @returns {Array} Filtered list of WiFi and Ethernet interfaces
 */
const filterWifiAndEthernetInterfaces = (interfaces) => {
  if (!Array.isArray(interfaces)) return [];
  
  return interfaces.filter(iface => {
    const name = iface.name?.toLowerCase() || '';
    const type = iface.type?.toLowerCase() || '';
    const description = iface.description?.toLowerCase() || '';
    
    // Check if it's a WiFi interface
    const isWifi = 
      type === 'wifi' || 
      name.includes('wlan') || 
      name.includes('wifi') || 
      name.includes('wireless') ||
      description.includes('wifi') || 
      description.includes('wireless') ||
      description.includes('wlan');
    
    // Check if it's an Ethernet interface
    const isEthernet = 
      type === 'ethernet' || 
      name.includes('eth') || 
      name.includes('ethernet') ||
      description.includes('ethernet');
    
    return isWifi || isEthernet;
  });
};
