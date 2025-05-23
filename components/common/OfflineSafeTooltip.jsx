'use client';

import React, { useState, useEffect } from 'react';

const OfflineSafeTooltip = ({ children, interfaceName }) => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // State for online status and visibility
  const [isOnline, setIsOnline] = useState(isBrowser ? navigator.onLine : true);
  const [isVisible, setIsVisible] = useState(false);
  
  // Update online status when it changes
  useEffect(() => {
    if (!isBrowser) return;
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isBrowser]);
  
  // If offline, just render children without tooltip functionality
  if (!isOnline) {
    return <>{children}</>;
  }
  
  // Safe interface name
  const safeInterfaceName = interfaceName || '';
  
  // Get description based on interface name
  const getDescription = (name) => {
    if (!name) return 'Unknown Interface';
    
    if (name.startsWith('eth')) {
      return 'Ethernet Interface: Wired connection to your network.';
    } else if (name.startsWith('wlan')) {
      return 'Wireless LAN Interface: This is your Wi-Fi connection.';
    } else if (name === 'lo' || name === 'lo0') {
      return 'Loopback Interface: Special virtual interface that connects back to the same device.';
    } else {
      return 'Network Interface: Hardware component that connects your device to a network.';
    }
  };
  
  // Get interface type for styling
  const getInterfaceType = (name) => {
    if (!name) return 'unknown';
    
    if (name.startsWith('eth')) return 'wired';
    if (name.startsWith('wlan')) return 'wireless';
    if (name === 'lo' || name === 'lo0') return 'virtual';
    return 'unknown';
  };
  
  const interfaceType = getInterfaceType(safeInterfaceName);
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      
      {isVisible && (
        <div className="absolute z-10 w-64 px-3 py-2 text-sm font-normal text-left text-gray-700 bg-white rounded-lg shadow-lg border border-gray-200 bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2">
          <div className="font-medium text-gray-900">{safeInterfaceName}</div>
          <p className="mt-1 text-xs text-gray-600">{getDescription(safeInterfaceName)}</p>
          
          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {interfaceType.charAt(0).toUpperCase() + interfaceType.slice(1)} Interface
            </span>
          </div>
          
          <div className="absolute w-3 h-3 bg-white border-b border-r border-gray-200 transform rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"></div>
        </div>
      )}
    </div>
  );
};

export default OfflineSafeTooltip;




