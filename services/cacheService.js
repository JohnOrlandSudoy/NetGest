'use client';

/**
 * cacheService.js
 * Provides caching functionality for the application
 */

// Cache storage
const cache = new Map();
const cacheTimestamps = new Map();

/**
 * Check if a cache entry is valid
 * @param {string} key - Cache key
 * @param {number} maxAge - Maximum age in milliseconds
 * @returns {boolean} Whether the cache entry is valid
 */
export const isCacheValid = (key, maxAge = 60000) => {
  if (!cache.has(key) || !cacheTimestamps.has(key)) return false;
  
  const timestamp = cacheTimestamps.get(key);
  return Date.now() - timestamp < maxAge;
};

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {any} Cached data or null
 */
export const getCachedData = (key) => {
  if (!cache.has(key)) return null;
  return cache.get(key);
};

/**
 * Set cached data with timestamp
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export const setCachedData = (key, data) => {
  cache.set(key, data);
  cacheTimestamps.set(key, Date.now());
};

/**
 * Clear a specific cache entry
 * @param {string} key - Cache key
 */
export const clearCache = (key) => {
  cache.delete(key);
  cacheTimestamps.delete(key);
};

/**
 * Clear all cache entries
 */
export const clearAllCache = () => {
  cache.clear();
  cacheTimestamps.clear();
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export const getCacheStats = () => {
  const stats = {
    size: cache.size,
    keys: Array.from(cache.keys()),
    ages: {}
  };
  
  for (const [key, timestamp] of cacheTimestamps.entries()) {
    stats.ages[key] = Date.now() - timestamp;
  }
  
  return stats;
};
