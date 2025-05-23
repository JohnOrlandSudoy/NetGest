import React, { useEffect, useState } from 'react';

const SpeedtestLoader = ({ onLoad, onError }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if script is already loaded
    if (window.speedtest) {
      setLoading(false);
      if (onLoad) onLoad();
      return;
    }

    // Load Speedtest.net script
    const script = document.createElement('script');
    script.src = 'https://www.speedtest.net/api/js/speedtest.js';
    script.async = true;
    
    script.onload = () => {
      setLoading(false);
      if (onLoad) onLoad();
    };
    
    script.onerror = (err) => {
      console.error('Failed to load Speedtest.net script:', err);
      setLoading(false);
      setError('Failed to load Speedtest.net script');
      if (onError) onError(err);
    };
    
    document.body.appendChild(script);
    
    // Cleanup
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [onLoad, onError]);

  return (
    <div className="speedtest-loader">
      {loading && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-gray-600">Loading Speedtest.net...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <p className="text-sm mt-1">
            Please visit <a href="https://www.speedtest.net" target="_blank" rel="noopener noreferrer" className="underline">Speedtest.net</a> directly.
          </p>
        </div>
      )}
    </div>
  );
};

export default SpeedtestLoader;