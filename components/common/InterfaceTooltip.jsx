import React, { useState } from 'react';

const InterfaceTooltip = ({ children, interfaceName }) => {
  // Always declare all hooks at the top level, before any conditional logic
  const [isVisible, setIsVisible] = useState(false);
  
  // Handle the case when interfaceName is undefined or null
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
  
  // Get color based on interface type
  const getTypeColor = (type) => {
    switch (type) {
      case 'wired': return 'border-blue-200';
      case 'wireless': return 'border-green-200';
      case 'virtual': return 'border-purple-200';
      default: return 'border-gray-200';
    }
  };
  
  const interfaceType = getInterfaceType(safeInterfaceName);
  const borderColor = getTypeColor(interfaceType);
  const description = getDescription(safeInterfaceName);
  
  // Error handling for offline state
  const handleMouseEnter = () => {
    try {
      setIsVisible(true);
    } catch (error) {
      console.error("Error in InterfaceTooltip:", error);
      // Continue without showing tooltip
    }
  };
  
  const handleMouseLeave = () => {
    try {
      setIsVisible(false);
    } catch (error) {
      console.error("Error in InterfaceTooltip:", error);
      // Continue without hiding tooltip
    }
  };
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div className={`absolute z-10 w-64 px-3 py-2 text-sm font-normal text-left text-gray-700 bg-white rounded-lg shadow-lg border ${borderColor} bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2`}>
          <div className="font-medium text-gray-900">{safeInterfaceName}</div>
          <p className="mt-1 text-xs text-gray-600">{description}</p>
          
          {/* Interface type badge */}
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              interfaceType === 'wired' ? 'bg-blue-100 text-blue-800' :
              interfaceType === 'wireless' ? 'bg-green-100 text-green-800' :
              interfaceType === 'virtual' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {interfaceType.charAt(0).toUpperCase() + interfaceType.slice(1)} Interface
            </span>
          </div>
          
          {/* Tooltip arrow */}
          <div className="absolute w-3 h-3 bg-white border-b border-r border-gray-200 transform rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"></div>
        </div>
      )}
    </div>
  );
};

// Add error boundary to catch any rendering issues
const InterfaceTooltipWithErrorHandling = (props) => {
  try {
    return <InterfaceTooltip {...props} />;
  } catch (error) {
    console.error("Error rendering InterfaceTooltip:", error);
    // Return a simplified version that won't cause hooks errors
    return <span>{props.children}</span>;
  }
};

export default InterfaceTooltipWithErrorHandling;




