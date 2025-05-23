import React from 'react';

const SpeedtestResults = ({ results, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-gray-600">Running speed test...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Speed test failed</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-2">
            Try running a test directly at <a href="https://www.speedtest.net" target="_blank" rel="noopener noreferrer" className="underline">Speedtest.net</a>
          </p>
        </div>
      </div>
    );
  }

  if (!results || (!results.download && !results.upload)) {
    return (
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="text-center p-4">
          <p className="text-gray-600">No speed test results available</p>
          <button 
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={() => window.open('https://www.speedtest.net', '_blank')}
          >
            Run Test on Speedtest.net
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <h3 className="text-lg font-medium mb-4 text-gray-800">Speedtest.net Results</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <div className="text-sm text-blue-700 mb-1">Download</div>
          <div className="text-2xl font-bold text-blue-800">{results.download} <span className="text-lg font-normal">Mbps</span></div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <div className="text-sm text-green-700 mb-1">Upload</div>
          <div className="text-2xl font-bold text-green-800">{results.upload} <span className="text-lg font-normal">Mbps</span></div>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Results powered by <a href="https://www.speedtest.net" target="_blank" rel="noopener noreferrer" className="underline">Speedtest.net</a>
        </p>
        <button 
          className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          onClick={() => window.open('https://www.speedtest.net', '_blank')}
        >
          Run New Test
        </button>
      </div>
    </div>
  );
};

export default SpeedtestResults;