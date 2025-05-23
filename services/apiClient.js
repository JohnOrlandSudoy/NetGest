/**
 * API Client for network metrics
 * Provides consistent error handling and caching
 */

// Cache implementation
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute default TTL

/**
 * Fetch with enhanced error handling, retry logic, and fallback mechanisms
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in ms
 * @param {number} cacheTTL - Cache TTL in ms (0 to disable caching)
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<any>} - Response data
 */
export async function fetchWithErrorHandling(url, options = {}, timeout = 30000, cacheTTL = CACHE_TTL, retries = 2) {
  // Generate cache key from URL and options
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  
  // Check cache if caching is enabled
  if (cacheTTL > 0) {
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() < cachedData.expiry) {
      console.log(`[API] Cache hit for ${url}`);
      return cachedData.data;
    }
  }
  
  let lastError = null;
  
  // Retry loop
  for (let attempt = 0; attempt <= retries; attempt++) {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn(`[API] Request timeout for ${url} after ${timeout}ms (attempt ${attempt + 1}/${retries + 1})`);
    }, timeout);
    
    try {
      // Add signal to options
      const fetchOptions = {
        ...options,
        signal: controller.signal,
        // Add cache busting parameter for retries
        ...(attempt > 0 ? { headers: { ...options.headers, 'Cache-Control': 'no-cache' } } : {})
      };
      
      // Add retry delay with exponential backoff
      if (attempt > 0) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.log(`[API] Retry attempt ${attempt}/${retries} for ${url} after ${backoffDelay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
      
      console.log(`[API] Fetching ${url}${attempt > 0 ? ` (attempt ${attempt + 1}/${retries + 1})` : ''}`);
      
      // Check online status before fetch
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Browser is offline');
      }
      
      const response = await fetch(url, fetchOptions);
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Handle HTTP errors
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      // Parse response
      const data = await response.json();
      
      // Cache response if caching is enabled
      if (cacheTTL > 0) {
        cache.set(cacheKey, {
          data,
          expiry: Date.now() + cacheTTL
        });
      }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      
      // Don't retry if browser is offline or request was aborted
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) || 
        error.name === 'AbortError' ||
        attempt >= retries
      ) {
        break;
      }
      
      // Continue to next retry attempt
      console.warn(`[API] Fetch attempt ${attempt + 1}/${retries + 1} failed:`, error.message);
    }
  }
  
  // All retries failed, try to use cached data regardless of expiry
  if (cacheTTL > 0) {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`[API] Using expired cache after all retries failed for ${url}`);
      return cachedData.data;
    }
  }
  
  // Enhance error with additional context
  const enhancedError = new Error(`Failed to fetch ${url}: ${lastError?.message || 'Unknown error'}`);
  enhancedError.originalError = lastError;
  enhancedError.isTimeout = lastError?.name === 'AbortError';
  enhancedError.isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  enhancedError.url = url;
  
  console.error('[API] All fetch attempts failed:', enhancedError);
  throw enhancedError;
}

/**
 * Clear all cached data
 */
export function clearCache() {
  cache.clear();
}

/**
 * Clear specific cached data by URL pattern
 * @param {string} urlPattern - URL pattern to match
 */
export function clearCacheByPattern(urlPattern) {
  const regex = new RegExp(urlPattern);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Network metrics API client
 */
export const networkApi = {
  /**
   * Get network metrics for a specific interface
   * @param {string} interfaceName - Network interface name
   * @returns {Promise<Object>} - Network metrics
   */
  async getMetrics(interfaceName) {
    try {
      // First try to get metrics from the API
      return await fetchWithErrorHandling(
        `/api/network/metrics?interface=${encodeURIComponent(interfaceName)}`,
        {},
        15000, // 15 second timeout
        60000, // 1 minute cache
        1      // 1 retry
      );
    } catch (error) {
      console.error(`[API] Failed to get metrics for interface ${interfaceName}:`, error);
      
      // Try fallback API endpoint
      try {
        console.log('[API] Trying fallback metrics endpoint');
        return await fetchWithErrorHandling(
          `/api/network/fallback-metrics?interface=${encodeURIComponent(interfaceName)}`,
          {},
          5000  // 5 second timeout
        );
      } catch (fallbackError) {
        console.error('[API] Fallback metrics endpoint also failed:', fallbackError);
        
        // Return generated fallback data
        return {
          latency: Math.floor(Math.random() * 60) + 20, // 20-80ms
          packetLoss: parseFloat((Math.random() * 2).toFixed(2)), // 0-2%
          download: Math.floor(Math.random() * 50) + 20, // 20-70 Mbps
          upload: Math.floor(Math.random() * 20) + 5, // 5-25 Mbps
          timestamp: new Date().toISOString(),
          interface: interfaceName,
          source: 'fallback'
        };
      }
    }
  },
  
  /**
   * Get network interfaces
   * @returns {Promise<Array>} - List of network interfaces
   */
  async getInterfaces() {
    try {
      return await fetchWithErrorHandling('/api/network/interfaces', {}, 10000);
    } catch (error) {
      console.error('[API] Failed to get network interfaces:', error);
      throw error;
    }
  },
  
  /**
   * Get network metrics history
   * @param {string} interfaceName - Network interface name
   * @param {number} hours - Number of hours of history
   * @returns {Promise<Object>} - Network metrics history
   */
  async getHistory(interfaceName, hours = 24) {
    try {
      return await fetchWithErrorHandling(
        `/api/network/history?interface=${encodeURIComponent(interfaceName)}&hours=${hours}`,
        {},
        15000
      );
    } catch (error) {
      console.error(`[API] Failed to get history for interface ${interfaceName}:`, error);
      throw error;
    }
  },
  
  /**
   * Get Nginx logs
   * @returns {Promise<Object>} - Nginx logs and metrics
   */
  async getNginxLogs() {
    try {
      return await fetchWithErrorHandling('/api/nginx/logs', {}, 20000);
    } catch (error) {
      console.error('[API] Failed to get Nginx logs:', error);
      throw error;
    }
  },
  
  /**
   * Get fallback data when real data is unavailable
   * @returns {Promise<Object>} - Fallback data
   */
  async getFallbackData() {
    try {
      return await fetchWithErrorHandling('/api/network/fallback-data', {}, 5000);
    } catch (error) {
      console.error('[API] Failed to get fallback data:', error);
      // Return minimal fallback data structure
      return {
        metrics: {
          latency: 50,
          packetLoss: 1,
          download: 25,
          upload: 10
        },
        history: {
          packetLoss: [],
          latency: [],
          speed: []
        }
      };
    }
  }
};

