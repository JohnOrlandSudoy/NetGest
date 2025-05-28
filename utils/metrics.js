export const fetchNetworkMetrics = async () => {
  try {
    console.log('Fetching network metrics...');
    const response = await fetch('/api/network/metrics');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received metrics data:', data);

    // Validate metrics data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid metrics format: null or not an object');
    }

    // Map the API response properties to the expected format
    const metrics = {
      packetLoss: data.packetLoss,
      latency: data.latency,
      downloadSpeed: data.download, // Map 'download' to 'downloadSpeed'
      uploadSpeed: data.upload,     // Map 'upload' to 'uploadSpeed'
      timestamp: data.timestamp
    };

    // Validate the mapped metrics
    const requiredMetrics = ['packetLoss', 'latency', 'downloadSpeed', 'uploadSpeed'];
    const missingMetrics = requiredMetrics.filter(metric => 
      typeof metrics[metric] !== 'number' || isNaN(metrics[metric])
    );

    if (missingMetrics.length > 0) {
      throw new Error(`Missing or invalid metrics: ${missingMetrics.join(', ')}`);
    }

    return metrics;
  } catch (error) {
    console.error('Error fetching network metrics:', error);
    throw error;
  }
};

export const fetchRecommendations = async (selectedInterface) => {
  try {
    // Check if we're online
    if (!navigator.onLine) {
      throw new Error("You are currently offline. Please check your internet connection.");
    }

    // Validate selected interface
    if (!selectedInterface) {
      throw new Error("No network interface selected. Please select an interface.");
    }

    let retries = 3;
    let lastError = null;

    while (retries > 0) {
      try {
        console.log(`Fetching recommendations (${retries} retries remaining)...`);
        
        // Fetch metrics with retry logic
        let metrics = null;
        let metricsRetries = 3;
        
        while (metricsRetries > 0) {
          try {
            console.log(`Fetching network metrics (attempt ${4 - metricsRetries}/3)...`);
            metrics = await fetchNetworkMetrics();
            
            if (metrics && 
                typeof metrics.packetLoss === 'number' && 
                typeof metrics.latency === 'number' && 
                typeof metrics.downloadSpeed === 'number' && 
                typeof metrics.uploadSpeed === 'number') {
              console.log('Successfully fetched valid metrics:', metrics);
              break;
            } else {
              throw new Error('Invalid metrics format received');
            }
          } catch (error) {
            console.error(`Metrics fetch attempt ${4 - metricsRetries} failed:`, error);
            metricsRetries--;
            if (metricsRetries === 0) {
              throw new Error('Failed to get valid metrics after retries');
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - metricsRetries) * 1000));
          }
        }

        if (!metrics) {
          throw new Error('Failed to get valid metrics after retries');
        }

        // Fetch traffic analysis for all types
        const trafficTypes = ['video', 'audio', 'voice'];
        const trafficResults = {};
        
        for (const type of trafficTypes) {
          try {
            console.log(`Fetching ${type} traffic data...`);
            const trafficResponse = await fetch('/api/network/tshark-traffic', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                interface: selectedInterface,
                trafficType: type
              })
            });
            
            if (!trafficResponse.ok) {
              const errorData = await trafficResponse.json();
              console.warn(`Warning: Failed to fetch ${type} traffic data:`, errorData.error);
              trafficResults[type] = { packets: 0, bytes: 0, bitrate: 0, details: [] };
              continue;
            }
            
            const trafficData = await trafficResponse.json();
            if (trafficData.success) {
              trafficResults[type] = {
                packets: trafficData.packetCount || 0,
                bytes: trafficData.byteCount || 0,
                bitrate: trafficData.byteCount ? (trafficData.byteCount * 8) / 5 : 0, // 5 seconds duration
                details: []
              };
            } else {
              console.warn(`Warning: No data for ${type} traffic`);
              trafficResults[type] = { packets: 0, bytes: 0, bitrate: 0, details: [] };
            }
          } catch (error) {
            console.warn(`Warning: Error fetching ${type} traffic:`, error);
            trafficResults[type] = { packets: 0, bytes: 0, bitrate: 0, details: [] };
          }
        }

        // Calculate total traffic
        const totalTraffic = {
          packets: Object.values(trafficResults).reduce((sum, data) => sum + (data.packets || 0), 0),
          bytes: Object.values(trafficResults).reduce((sum, data) => sum + (data.bytes || 0), 0),
          bitrate: Object.values(trafficResults).reduce((sum, data) => sum + (data.bitrate || 0), 0)
        };

        return {
          metrics,
          traffic: {
            ...trafficResults,
            total: totalTraffic
          }
        };
      } catch (error) {
        console.error(`Recommendation fetch attempt failed:`, error);
        lastError = error;
        retries--;
        
        if (retries === 0) {
          throw lastError;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
      }
    }
  } catch (error) {
    console.error('Error in fetchRecommendations:', error);
    throw error;
  }
}; 