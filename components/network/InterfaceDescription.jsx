import React from 'react';

/**
 * Component to display detailed information about network interfaces
 */
const InterfaceDescription = ({ interfaceName }) => {
  // Define descriptions for common network interfaces
  const interfaceInfo = {
    eth0: {
      title: 'eth0 - Ethernet Interface',
      description: 'Wired connection to your network.',
      icon: 'network-wired',
      type: 'wired'
    },
    wlan0: {
      title: 'wlan0 - Wireless LAN Interface',
      description: 'This is your Wi-Fi connection.',
      icon: 'wifi',
      type: 'wireless'
    },
    lo: {
      title: 'lo - Loopback Interface',
      description: 'Special virtual interface that connects back to the same device.',
      icon: 'loop',
      type: 'virtual'
    },
    default: {
      title: 'Network Interface',
      description: 'A hardware component that connects a device to a network.',
      icon: 'network',
      type: 'unknown'
    }
  };

  // Get the appropriate info object, fallback to default if not found
  const info = interfaceInfo[interfaceName] || interfaceInfo.default;

  // Icon components
  const icons = {
    'network-wired': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
    'wifi': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    ),
    'loop': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    'network': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    )
  };

  // Get the appropriate icon, fallback to network if not found
  const IconComponent = icons[info.icon] || icons.network;

  // Define color based on interface type
  const getTypeColor = (type) => {
    switch (type) {
      case 'wired': return 'bg-blue-100 text-blue-800';
      case 'wireless': return 'bg-green-100 text-green-800';
      case 'virtual': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const typeColor = getTypeColor(info.type);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-start">
        <div className={`p-2 rounded-full ${typeColor} mr-4`}>
          {IconComponent}
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">{info.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{info.description}</p>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
              {info.type.charAt(0).toUpperCase() + info.type.slice(1)} Interface
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterfaceDescription;


