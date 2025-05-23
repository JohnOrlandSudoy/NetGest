import React from 'react';

const InterfaceSelector = ({ interfaces, selectedInterface, onSelectInterface, isLoading }) => {
  // Interface type descriptions
  const interfaceTypes = {
    eth: {
      name: 'Ethernet',
      description: 'Wired connection',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      )
    },
    wlan: {
      name: 'Wi-Fi',
      description: 'Wireless connection',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      )
    },
    lo: {
      name: 'Loopback',
      description: 'Virtual interface',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }
  };

  // Determine interface type based on name
  const getInterfaceType = (name) => {
    // Ensure name is a string before using startsWith
    if (!name || typeof name !== 'string') {
      return 'eth'; // Default to ethernet for non-string values
    }
    
    const nameLower = name.toLowerCase();
    if (nameLower.includes('eth') || nameLower.includes('ethernet')) return 'eth';
    if (nameLower.includes('wlan') || nameLower.includes('wifi') || nameLower.includes('wi-fi') || nameLower.includes('wireless')) return 'wlan';
    if (nameLower === 'lo' || nameLower === 'lo0' || nameLower.includes('loopback') || nameLower.includes('localhost')) return 'lo';
    return 'eth'; // Default to ethernet
  };

  // Get a user-friendly name for the interface
  const getInterfaceDisplayName = (name) => {
    if (!name || typeof name !== 'string') return 'Unknown Interface';
    
    const nameLower = name.toLowerCase();
    if (nameLower.includes('eth')) return `Ethernet (${name})`;
    if (nameLower.includes('wlan')) return `Wi-Fi (${name})`;
    if (nameLower === 'lo' || nameLower === 'lo0') return `Loopback (${name})`;
    return name;
  };

  // Filter out any empty or invalid interfaces
  const validInterfaces = Array.isArray(interfaces) 
    ? interfaces.filter(iface => iface && (typeof iface === 'string' || (typeof iface === 'object' && iface.name)))
    : [];

  return (
    <div className="mb-6">
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-gray-600">Loading interfaces...</span>
        </div>
      ) : validInterfaces.length === 0 ? (
        <div className="text-gray-500">No network interfaces detected</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {validInterfaces.map((iface, index) => {
            // Normalize interface to string
            const ifaceName = typeof iface === 'string' ? iface : iface.name;
            if (!ifaceName) return null;
            
            const type = getInterfaceType(ifaceName);
            const typeInfo = interfaceTypes[type] || interfaceTypes.eth;
            const displayName = getInterfaceDisplayName(ifaceName);
            
            return (
              <button
                key={index}
                onClick={() => onSelectInterface(ifaceName)}
                className={`flex items-center p-3 rounded-lg transition-colors border ${
                  selectedInterface === ifaceName
                    ? "bg-blue-50 border-blue-300 shadow-sm"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className={`p-2 rounded-full ${
                  selectedInterface === ifaceName ? "bg-blue-100" : "bg-gray-100"
                } mr-3`}>
                  {typeInfo.icon}
                </div>
                <div className="text-left">
                  <div className={`font-medium ${
                    selectedInterface === ifaceName ? "text-blue-700" : "text-gray-800"
                  }`}>
                    {displayName}
                  </div>
                  <div className="text-xs text-gray-500">{typeInfo.description}</div>
                </div>
                {selectedInterface === ifaceName && (
                  <div className="ml-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
      
      {selectedInterface && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-600">
              <strong>{getInterfaceDisplayName(selectedInterface)}</strong>: {
                typeof selectedInterface === 'string' && 
                (selectedInterface.toLowerCase().includes('wlan') || selectedInterface.toLowerCase().includes('wi-fi'))
                  ? "Wireless LAN Interface. This is your Wi-Fi connection."
                  : selectedInterface === 'lo' || selectedInterface === 'lo0'
                    ? "Loopback Interface. A virtual interface used for local connections."
                    : "Ethernet Interface. Wired connection to your network."
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterfaceSelector;








