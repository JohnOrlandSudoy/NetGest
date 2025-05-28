import React from 'react';
import { FaSync, FaHeadphones, FaVideo, FaMicrophone, FaTerminal } from 'react-icons/fa';

const MediaMonitoringSection = ({ 
  startAllMediaMonitoring,
  startMediaMonitoring,
  mediaMonitoring,
  mediaTraffic,
  isMonitoring,
  selectedInterface
}) => (
  <div className="bg-gray-700 p-4 rounded-md">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg text-white font-medium">Real-time Media Traffic Monitoring</h3>
      <button
        onClick={startAllMediaMonitoring}
        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
          Object.values(mediaMonitoring).some(value => value === true)
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        <FaSync className={`mr-2 ${isMonitoring ? 'animate-spin' : ''}`} />
        {Object.values(mediaMonitoring).some(value => value === true) 
          ? 'Stop All Monitoring' 
          : 'Monitor All Media Traffic'}
      </button>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Audio Monitoring Button */}
      <div className="bg-gray-600 p-4 rounded-md">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-white font-medium flex items-center">
            <FaHeadphones className="mr-2" /> Audio Traffic
          </h4>
          <button
            onClick={() => startMediaMonitoring('audio')}
            className={`px-3 py-1 rounded-md text-sm font-medium flex items-center ${
              mediaMonitoring.audio 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {mediaMonitoring.audio ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>
        
        {mediaMonitoring.audio ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Packets:</span>
              <span className="text-white font-medium">{mediaTraffic.audio.packets}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Data:</span>
              <span className="text-white font-medium">{(mediaTraffic.audio.bytes / 1024).toFixed(2)} KB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Last Updated:</span>
              <span className="text-gray-300 text-xs">
                {mediaTraffic.audio.lastUpdated 
                  ? new Date(mediaTraffic.audio.lastUpdated).toLocaleTimeString() 
                  : 'Never'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-sm italic">
            Not monitoring audio traffic
          </div>
        )}
      </div>
      
      {/* Video Monitoring Button */}
      <div className="bg-gray-600 p-4 rounded-md">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-white font-medium flex items-center">
            <FaVideo className="mr-2" /> Video Traffic
          </h4>
          <button
            onClick={() => startMediaMonitoring('video')}
            className={`px-3 py-1 rounded-md text-sm font-medium flex items-center ${
              mediaMonitoring.video 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {mediaMonitoring.video ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>
        
        {mediaMonitoring.video ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Packets:</span>
              <span className="text-white font-medium">{mediaTraffic.video.packets}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Data:</span>
              <span className="text-white font-medium">{(mediaTraffic.video.bytes / 1024).toFixed(2)} KB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Last Updated:</span>
              <span className="text-gray-300 text-xs">
                {mediaTraffic.video.lastUpdated 
                  ? new Date(mediaTraffic.video.lastUpdated).toLocaleTimeString() 
                  : 'Never'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-sm italic">
            Not monitoring video traffic
          </div>
        )}
      </div>
      
      {/* Voice Monitoring Button */}
      <div className="bg-gray-600 p-4 rounded-md">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-white font-medium flex items-center">
            <FaMicrophone className="mr-2" /> Voice Traffic
          </h4>
          <button
            onClick={() => startMediaMonitoring('voice')}
            className={`px-3 py-1 rounded-md text-sm font-medium flex items-center ${
              mediaMonitoring.voice 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {mediaMonitoring.voice ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>
        
        {mediaMonitoring.voice ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Packets:</span>
              <span className="text-white font-medium">{mediaTraffic.voice.packets}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Data:</span>
              <span className="text-white font-medium">{(mediaTraffic.voice.bytes / 1024).toFixed(2)} KB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Last Updated:</span>
              <span className="text-gray-300 text-xs">
                {mediaTraffic.voice.lastUpdated 
                  ? new Date(mediaTraffic.voice.lastUpdated).toLocaleTimeString() 
                  : 'Never'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-sm italic">
            Not monitoring voice traffic
          </div>
        )}
      </div>
    </div>
    
    <div className="bg-gray-800 p-3 rounded-md text-xs text-gray-300 font-mono">
      <div className="flex items-center mb-2">
        <FaTerminal className="mr-2" />
        <span className="text-white">TShark Commands Used:</span>
      </div>
      <div className="space-y-2">
        <p>
          <span className="text-green-400">Audio:</span> tshark -i {selectedInterface || '\\Device\\NPF_{interface}'} -c 100 -f "port 443 or port 80 or port 8080 or port 1935 or port 5353"
        </p>
        <p>
          <span className="text-blue-400">Video:</span> tshark -i {selectedInterface || '\\Device\\NPF_{interface}'} -c 100 -f "port 443 or port 80 or port 8080 or port 1935 or port 554"
        </p>
        <p>
          <span className="text-yellow-400">Voice:</span> tshark -i {selectedInterface || '\\Device\\NPF_{interface}'} -c 100 -f "port 443 or port 5060 or port 5061 or port 3478 or port 3479 or port 10000-20000"
        </p>
      </div>
    </div>
  </div>
);

export default MediaMonitoringSection;