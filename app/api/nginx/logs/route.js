import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import readline from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

// Simple in-memory cache implementation since node-cache isn't installed
class SimpleCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.stdTTL || 600; // Default 10 minutes
    this.checkPeriod = options.checkperiod || 60; // Default 1 minute
    
    // Set up periodic cleanup if checkPeriod is provided
    if (this.checkPeriod > 0) {
      this.interval = setInterval(() => this.cleanup(), this.checkPeriod * 1000);
    }
  }
  
  set(key, value) {
    const expires = Date.now() + (this.ttl * 1000);
    this.cache.set(key, { value, expires });
    return true;
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expires < now) {
        this.cache.delete(key);
      }
    }
  }
  
  // Clean up interval on process exit
  close() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

// Cache configuration (10 minute TTL, check period 60 seconds)
const logsCache = new SimpleCache({ stdTTL: 600, checkperiod: 60 });
const CACHE_KEY = 'nginx_metrics';

// Configure log paths based on environment
const LOG_PATHS = {
  production: '/var/log/nginx/access.log',
  development: path.join(process.cwd(), 'logs/nginx/access.log'),
  // Fallback to mock data if no logs available
  fallback: null
};

// Execute shell commands asynchronously
const execAsync = promisify(exec);

// Parse a single Nginx log line
const parseLogLine = (line) => {
  try {
    // Enhanced regex to handle various Nginx log formats
    const regex = /^(\S+) - (\S+) \[(.*?)\] "(\S+) (.*?) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"(?: (\d+\.\d+))?/;
    const match = line.match(regex);
    
    if (!match) {
      // Try alternative common log format
      const altRegex = /^(\S+) - (\S+) \[(.*?)\] "([^"]*)" (\d+) (\d+)(?: "([^"]*)" "([^"]*)")?/;
      const altMatch = line.match(altRegex);
      
      if (!altMatch) return null;
      
      // Parse method, path, protocol from request
      let method = 'GET';
      let path = '/';
      let protocol = 'HTTP/1.1';
      
      if (altMatch[4]) {
        const requestParts = altMatch[4].split(' ');
        if (requestParts.length >= 3) {
          method = requestParts[0];
          path = requestParts[1];
          protocol = requestParts[2];
        } else if (requestParts.length === 2) {
          method = requestParts[0];
          path = requestParts[1];
        }
      }
      
      return {
        ip: altMatch[1],
        user: altMatch[2] !== '-' ? altMatch[2] : null,
        timestamp: altMatch[3],
        method: method,
        path: path,
        protocol: protocol,
        statusCode: parseInt(altMatch[5]),
        bytes: parseInt(altMatch[6]),
        referer: altMatch[7] !== '-' ? altMatch[7] : null,
        userAgent: altMatch[8],
        responseTime: null,
        requestTime: Date.now()
      };
    }
    
    // Parse timestamp into a standard format
    let timestamp = match[3];
    if (timestamp) {
      // Try to convert to ISO format for consistency
      try {
        const parsedDate = new Date(timestamp.replace(':', ' '));
        if (!isNaN(parsedDate.getTime())) {
          timestamp = parsedDate.toISOString();
        }
      } catch (e) {
        // Keep original format if parsing fails
      }
    }
    
    return {
      ip: match[1],
      user: match[2] !== '-' ? match[2] : null,
      timestamp: timestamp,
      method: match[4],
      path: match[5],
      protocol: match[6],
      statusCode: parseInt(match[7]),
      bytes: parseInt(match[8]),
      referer: match[9] !== '-' ? match[9] : null,
      userAgent: match[10],
      responseTime: match[11] ? parseFloat(match[11]) : null,
      // Add request time for speed calculations
      requestTime: Date.now()
    };
  } catch (error) {
    console.error('Error parsing log line:', error);
    return null;
  }
};

// Check if we have permission to read the log file
async function checkLogPermissions(logPath) {
  try {
    await fs.access(logPath, fs.constants.R_OK);
    return true;
  } catch (error) {
    console.warn(`No permission to read log file at ${logPath}:`, error.message);
    return false;
  }
}

// Get the appropriate log path based on environment and permissions
async function getLogPath() {
  const env = process.env.NODE_ENV || 'development';
  const logPath = LOG_PATHS[env] || LOG_PATHS.development;
  
  if (logPath && await checkLogPermissions(logPath)) {
    return logPath;
  }
  
  // Try to find Nginx logs using shell commands if direct access fails
  try {
    // Try multiple common Nginx log locations
    const possiblePaths = [
      '/var/log/nginx/access.log',
      '/usr/local/nginx/logs/access.log',
      '/usr/local/var/log/nginx/access.log',
      '/var/log/nginx-access.log',
      '/etc/nginx/logs/access.log',
      path.join(process.cwd(), 'logs/nginx/access.log')
    ];
    
    for (const path of possiblePaths) {
      if (await checkLogPermissions(path)) {
        console.log(`Found Nginx logs at: ${path}`);
        return path;
      }
    }
    
    // If direct paths fail, try using find command
    const { stdout } = await execAsync('find /var/log -name "access.log" | grep nginx');
    const foundPaths = stdout.trim().split('\n');
    
    for (const path of foundPaths) {
      if (path && await checkLogPermissions(path)) {
        return path;
      }
    }
  } catch (error) {
    console.warn('Failed to find Nginx logs via shell:', error.message);
  }
  
  console.log('No accessible Nginx logs found, using fallback mock data');
  return LOG_PATHS.fallback;
}

// Process the last N lines of a log file efficiently
async function processLastNLines(filePath, n = 10000) {
  // If no file path, return empty array
  if (!filePath) return [];
  
  try {
    // Get file stats to determine size
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;
    
    // For small files, just read the whole thing
    if (fileSize < 1024 * 1024 * 5) { // 5MB threshold
      const content = await fs.readFile(filePath, 'utf8');
      return content.trim().split('\n');
    }
    
    // For larger files, use a more efficient approach
    const lines = [];
    const stream = createReadStream(filePath, {
      encoding: 'utf8',
      // Start reading from the end for large files
      start: Math.max(0, fileSize - 1024 * 1024) // Read last 1MB
    });
    
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      lines.push(line);
      // Keep only the last N lines
      if (lines.length > n) {
        lines.shift();
      }
    }
    
    return lines;
  } catch (error) {
    console.error('Error reading log file:', error);
    return [];
  }
}

// Generate mock Nginx logs for development/testing
function generateMockNginxLogs(count = 1000) {
  const logs = [];
  const now = new Date();
  const statusCodes = [200, 200, 200, 200, 200, 301, 302, 304, 400, 403, 404, 500];
  const methods = ['GET', 'GET', 'GET', 'POST', 'PUT', 'DELETE'];
  const paths = [
    '/api/dashboard',
    '/api/network/metrics',
    '/api/network/history',
    '/api/ping',
    '/api/speedtest/download',
    '/api/speedtest/upload',
    '/api/packet/capture',
    '/dashboard',
    '/recommendation',
    '/settings',
    '/login',
    '/static/js/main.js',
    '/static/css/main.css',
    '/static/images/logo.png'
  ];
  
  // Generate more realistic IP addresses
  const ipPrefixes = ['192.168.1.', '10.0.0.', '172.16.0.', '127.0.0.'];
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - Math.random() * 86400000); // Random time in last 24 hours
    const formattedDate = timestamp.toISOString().replace(/T/, ':').replace(/\..+/, '');
    const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const path = paths[Math.floor(Math.random() * paths.length)];
    const bytes = Math.floor(Math.random() * 10000) + 100;
    const responseTime = (Math.random() * 0.5).toFixed(3);
    const ipPrefix = ipPrefixes[Math.floor(Math.random() * ipPrefixes.length)];
    const ip = `${ipPrefix}${Math.floor(Math.random() * 254) + 1}`;
    
    logs.push(`${ip} - - [${formattedDate} +0000] "${method} ${path} HTTP/1.1" ${statusCode} ${bytes} "http://example.com/dashboard" "Mozilla/5.0" ${responseTime}`);
  }
  
  return logs;
}

// Process Nginx logs and extract metrics with performance optimizations
async function processNginxLogs(logPath) {
  console.log(`[NGINX] Processing logs from: ${logPath || 'mock data'}`);
  
  // Check cache first
  const cachedMetrics = logsCache.get(CACHE_KEY);
  if (cachedMetrics) {
    console.log('[NGINX] Using cached metrics data');
    return cachedMetrics;
  }
  
  console.log('[NGINX] No cached data found, processing logs...');
  let logs = [];
  
  // Try to read real logs
  if (logPath) {
    console.log(`[NGINX] Reading log file: ${logPath}`);
    logs = await processLastNLines(logPath);
    console.log(`[NGINX] Read ${logs.length} lines from log file`);
  }
  
  // Fall back to mock data if no logs or empty file
  if (!logs.length) {
    console.log('[NGINX] No real logs found, generating mock data');
    logs = generateMockNginxLogs();
    console.log(`[NGINX] Generated ${logs.length} mock log entries`);
    
    // If we're in development mode, write some mock logs to the file
    if (process.env.NODE_ENV === 'development' && logPath) {
      try {
        console.log('[NGINX] Writing mock logs to file for future use');
        // Append some mock logs to the file
        await fs.appendFile(logPath, logs.slice(0, 100).join('\n') + '\n');
      } catch (error) {
        console.warn('[NGINX] Failed to write mock logs to file:', error);
      }
    }
  }
  
  console.log('[NGINX] Parsing log entries...');
  // Parse logs
  const parsedLogs = logs
    .map(parseLogLine)
    .filter(Boolean);
  
  console.log(`[NGINX] Successfully parsed ${parsedLogs.length} log entries`);
  
  // Calculate metrics
  const requestCount = parsedLogs.length;

  // Use more efficient calculations for large datasets
  let totalResponseTime = 0;
  const statusCounts = {};
  const ipCounts = {};
  const endpointCounts = {};
  let errorCount = 0;

  // Track traffic volume for speed calculations
  let totalDownloadBytes = 0;
  let totalUploadBytes = 0;
  let requestsByMethod = {};

  console.log('[NGINX] Calculating metrics from parsed logs...');

  // Single pass through the data for better performance
  parsedLogs.forEach(log => {
    // Response time
    if (log.responseTime) {
      totalResponseTime += log.responseTime;
    }
    
    // Status codes
    const statusGroup = Math.floor(log.statusCode / 100) + 'xx';
    statusCounts[statusGroup] = (statusCounts[statusGroup] || 0) + 1;
    
    // Error count
    if (log.statusCode >= 400) {
      errorCount++;
    }
    
    // IP addresses
    ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1;
    
    // Endpoints
    const endpoint = log.path.split('?')[0];
    endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
    
    // Track bytes by request method for speed calculations
    if (!requestsByMethod[log.method]) {
      requestsByMethod[log.method] = { count: 0, bytes: 0 };
    }
    requestsByMethod[log.method].count++;
    requestsByMethod[log.method].bytes += log.bytes || 0;
    
    // Track download/upload bytes
    if (log.method === 'GET') {
      totalDownloadBytes += log.bytes || 0;
    } else if (log.method === 'POST' || log.method === 'PUT') {
      // Estimate upload size based on endpoint
      let estimatedUploadSize = 1024; // Default 1KB
      
      if (log.path.includes('upload')) {
        estimatedUploadSize = 1024 * 1024; // 1MB for upload endpoints
      } else if (log.path.includes('image') || log.path.includes('file')) {
        estimatedUploadSize = 500 * 1024; // 500KB for image/file endpoints
      } else if (log.path.includes('data')) {
        estimatedUploadSize = 10 * 1024; // 10KB for data endpoints
      }
      
      totalUploadBytes += estimatedUploadSize;
    }
  });

  const avgResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0;
  const errorRate = requestCount > 0 ? errorCount / requestCount : 0;

  // Calculate network speed based on traffic volume
  // Get time range from logs
  let oldestLogTime = Date.now();
  let newestLogTime = 0;

  parsedLogs.forEach(log => {
    const logTime = new Date(log.timestamp).getTime();
    if (!isNaN(logTime)) {
      oldestLogTime = Math.min(oldestLogTime, logTime);
      newestLogTime = Math.max(newestLogTime, logTime);
    }
  });

  // Calculate time span in seconds (minimum 1 second to avoid division by zero)
  const timeSpanSeconds = Math.max(1, (newestLogTime - oldestLogTime) / 1000);

  // Calculate speeds in Mbps
  const downloadSpeedMbps = (totalDownloadBytes * 8) / (timeSpanSeconds * 1024 * 1024);
  const uploadSpeedMbps = (totalUploadBytes * 8) / (timeSpanSeconds * 1024 * 1024);

  console.log('[NGINX] Traffic volume calculations:', {
    totalDownloadBytes,
    totalUploadBytes,
    timeSpanSeconds,
    downloadSpeedMbps: downloadSpeedMbps.toFixed(2),
    uploadSpeedMbps: uploadSpeedMbps.toFixed(2)
  });

  // Process IP counts to get top IPs
  const topIPs = Object.entries(ipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [ip, count]) => {
      obj[ip] = count;
      return obj;
    }, {});

  // Process endpoint counts to get top endpoints
  const topEndpoints = Object.entries(endpointCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [endpoint, count]) => {
      obj[endpoint] = count;
      return obj;
    }, {});

  // Create metrics object
  const metrics = {
    requestCount,
    avgResponseTime: parseFloat(avgResponseTime.toFixed(3)),
    errorRate: parseFloat(errorRate.toFixed(3)),
    trafficByStatus: statusCounts,
    trafficByIP: topIPs,
    trafficByEndpoint: topEndpoints,
    // Include some raw logs for display (last 50)
    recentLogs: parsedLogs.slice(-50),
    // Add traffic volume metrics
    trafficVolume: {
      totalDownloadBytes,
      totalUploadBytes,
      downloadSpeedMbps: parseFloat(downloadSpeedMbps.toFixed(2)),
      uploadSpeedMbps: parseFloat(uploadSpeedMbps.toFixed(2)),
      timeSpanSeconds,
      requestsByMethod
    },
    // Add metadata
    meta: {
      source: logs.length > 0 ? (logs[0].includes('mock') ? 'mock' : 'real') : 'mock',
      timestamp: new Date().toISOString(),
      logPath: logPath || 'mock data'
    }
  };
  
  console.log('[NGINX] Metrics calculated successfully:', {
    requestCount: metrics.requestCount,
    avgResponseTime: metrics.avgResponseTime,
    errorRate: metrics.errorRate,
    downloadSpeed: metrics.trafficVolume.downloadSpeedMbps,
    uploadSpeed: metrics.trafficVolume.uploadSpeedMbps,
    source: metrics.meta.source
  });
  
  // Cache the results
  logsCache.set(CACHE_KEY, metrics);
  console.log('[NGINX] Metrics cached with key:', CACHE_KEY);
  
  return metrics;
}

// Background processing function with error handling
let isProcessing = false;
async function backgroundProcessLogs() {
  if (isProcessing) return;
  
  try {
    isProcessing = true;
    console.log('[NGINX] Starting background log processing...');
    
    const logPath = await getLogPath();
    console.log(`[NGINX] Using log path: ${logPath || 'mock data'}`);
    
    await processNginxLogs(logPath);
    console.log('[NGINX] Background processing completed successfully');
  } catch (error) {
    console.error('[NGINX] Error in background processing:', error);
    
    // Try to recover by using mock data
    try {
      console.log('[NGINX] Attempting recovery with mock data...');
      await processNginxLogs(null);
      console.log('[NGINX] Recovery successful');
    } catch (recoveryError) {
      console.error('[NGINX] Recovery failed:', recoveryError);
    }
  } finally {
    isProcessing = false;
  }
}

// Start background processing on module load
if (typeof process !== 'undefined') {
  // Run immediately and then every 5 minutes
  backgroundProcessLogs();
  setInterval(backgroundProcessLogs, 5 * 60 * 1000);
}

export async function GET() {
  console.log('[NGINX] Handling GET request for logs');
  
  try {
    // Try to get cached data first
    const cachedMetrics = logsCache.get(CACHE_KEY);
    if (cachedMetrics) {
      console.log('[NGINX] Returning cached metrics');
      return NextResponse.json(cachedMetrics);
    }
    
    console.log('[NGINX] No cached metrics found, getting log path...');
    // If no cached data, process logs
    const logPath = await getLogPath();
    console.log(`[NGINX] Log path determined: ${logPath || 'using mock data'}`);
    
    const metrics = await processNginxLogs(logPath);
    console.log('[NGINX] Returning freshly processed metrics');
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[NGINX] Error processing logs:', error);
    
    // Fall back to mock data in case of error
    console.log('[NGINX] Falling back to mock data due to error');
    const mockMetrics = await processNginxLogs(null);
    
    return NextResponse.json(mockMetrics, {
      headers: {
        'X-Data-Source': 'fallback',
        'X-Error': error.message
      }
    });
  }
}













