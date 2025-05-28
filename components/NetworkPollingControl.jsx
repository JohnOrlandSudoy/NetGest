"use client";

import React, { useState, useEffect } from 'react';
import { disableNetworkPolling, enableNetworkPolling, isNetworkPollingDisabled } from '@/utils/networkUtils';

const NetworkPollingControl = () => {
  const [isDisabled, setIsDisabled] = useState(false);
  
  useEffect(() => {
    // Check initial state
    setIsDisabled(isNetworkPollingDisabled());
  }, []);
  
  const handleToggle = () => {
    if (isDisabled) {
      enableNetworkPolling();
      setIsDisabled(false);
    } else {
      disableNetworkPolling();
      setIsDisabled(true);
    }
  };
  
  const handleStop = () => {
    disableNetworkPolling();
    setIsDisabled(true);
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg">
      <button
        onClick={handleToggle}
        className={`px-4 py-2 rounded-md ${
          isDisabled 
            ? 'bg-green-500 hover:bg-green-600 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {isDisabled ? 'Enable Network Polling' : 'Disable Network Polling'}
      </button>
      
      {!isDisabled && (
        <button
          onClick={handleStop}
          className="ml-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md"
        >
          Stop All Polling
        </button>
      )}
    </div>
  );
};

export default NetworkPollingControl;