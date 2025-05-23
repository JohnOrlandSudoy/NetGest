import React, { useState, useEffect } from 'react';
import { getSpeedTestResults } from '@/services/speedTestService';
import { ClipLoader } from 'react-spinners';

const SpeedTest = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getSpeedTestResults();
      setResults(data);
    } catch (err) {
      setError(err.message || 'Failed to run speed test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <h3 className="text-lg font-medium mb-4 text-gray-800">Internet Speed Test</h3>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-6">
          <ClipLoader color="#3B82F6" size={40} />
          <p className="mt-4 text-gray-600">Running speed test...</p>
          <p className="text-sm text-gray-500 mt-2">This may take up to 30 seconds</p>
        </div>
      ) : results ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="text-sm text-blue-700 mb-1">Ping</div>
            <div className="text-2xl font-bold text-blue-800">{Math.round(results.ping)} <span className="text-lg font-normal">ms</span></div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <div className="text-sm text-green-700 mb-1">Download</div>
            <div className="text-2xl font-bold text-green-800">{results.download.toFixed(1)} <span className="text-lg font-normal">Mbps</span></div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <div className="text-sm text-purple-700 mb-1">Upload</div>
            <div className="text-2xl font-bold text-purple-800">{results.upload.toFixed(1)} <span className="text-lg font-normal">Mbps</span></div>
          </div>
        </div>
      ) : (
        <div className="text-center p-6">
          <p className="text-gray-600 mb-4">Click the button below to test your internet speed</p>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
            </div>
          )}
          <button 
            onClick={runTest}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            Run Speed Test
          </button>
        </div>
      )}
      
      {results && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Test completed at {new Date().toLocaleString()}
          </p>
          <button 
            onClick={runTest}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            Run Again
          </button>
        </div>
      )}
    </div>
  );
};

export default SpeedTest;

