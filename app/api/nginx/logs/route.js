import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Constants
const DEFAULT_LOG_PATH = '/var/log/nginx/access.log';
const DEV_LOG_PATH = './logs/nginx/access.log';
const NGINX_STATUS_URL = 'http://localhost/nginx_status';
const NGINX_API_URL = 'http://localhost/api'; // NGINX Plus API endpoint
const USE_MOCK_DATA = process.env.NODE_ENV === 'development' || process.env.MOCK_NGINX === 'true';

/**
 * Get real-time metrics from NGINX Plus API
 * @returns {Promise<Object>} NGINX Plus metrics
 */
async function getNginxPlusMetrics() {
  // Skip NGINX Plus API check if we're explicitly using mock data
  if (USE_MOCK_DATA) {
    console.log('Skipping NGINX Plus API check (mock data enabled)');
    return null;
  }
  
  try {
    console.log('Fetching NGINX Plus metrics from API');
    
    // Try to fetch from NGINX Plus API
    const response = await fetch(NGINX_API_URL, {
      headers: {
        'Accept': 'application/json'
      },
      // Add a timeout to prevent hanging
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) {
      console.log(`NGINX Plus API returned ${response.status} - falling back to other methods`);
      return null;
    }
    
    const data = await response.json();
    console.log('Successfully fetched NGINX Plus metrics');
    
    // Extract relevant metrics
    const metrics = {
      connections: data.connections || {},
      http: data.http || {},
      ssl: data.ssl || {},
      timestamp: new Date().toISOString(),
      source: 'nginx-plus-api'
    };
    
    // Calculate traffic volume
    const httpRequests = metrics.http?.requests || 0;
    const httpBytes = metrics.http?.bytes || 0;
    const timeSpanSeconds = 60; // Assume 1 minute of data
    
    metrics.trafficVolume = {
      totalDownloadBytes: httpBytes,
      totalUploadBytes: Math.round(httpBytes * 0.2), // Estimate upload as 20% of download
      downloadSpeedMbps: (httpBytes * 8) / (timeSpanSeconds * 1000000),
      uploadSpeedMbps: (httpBytes * 0.2 * 8) / (timeSpanSeconds * 1000000),
      timeSpanSeconds
    };
    
    // Calculate error rate and response time
    const totalResponses = 
      (metrics.http?.responses?.['1xx'] || 0) +
      (metrics.http?.responses?.['2xx'] || 0) +
      (metrics.http?.responses?.['3xx'] || 0) +
      (metrics.http?.responses?.['4xx'] || 0) +
      (metrics.http?.responses?.['5xx'] || 0);
    
    const errorResponses = 
      (metrics.http?.responses?.['4xx'] || 0) +
      (metrics.http?.responses?.['5xx'] || 0);
    
    metrics.errorRate = totalResponses > 0 ? (errorResponses / totalResponses) * 100 : 0;
    metrics.avgResponseTime = metrics.http?.request_time || 50; // In milliseconds
    
    return metrics;
  } catch (error) {
    console.log('Error fetching NGINX Plus metrics:', error.message);
    return null;
  }
}

/**
 * Try to get metrics from standard NGINX status page
 * @returns {Promise<Object|null>} NGINX status metrics or null if unavailable
 */
async function getNginxStatusMetrics() {
  // Skip if we're explicitly using mock data
  if (USE_MOCK_DATA) {
    console.log('Skipping NGINX status check (mock data enabled)');
    return null;
  }
  
  try {
    console.log('Fetching metrics from NGINX status page');
    
    const response = await fetch(NGINX_STATUS_URL, {
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) {
      console.log(`NGINX status page returned ${response.status} - falling back to other methods`);
      return null;
    }
    
    const text = await response.text();
    
    // Parse the stub_status output
    // Format is typically:
    // Active connections: 1
    // server accepts handled requests
    // 16 16 31
    // Reading: 0 Writing: 1 Waiting: 0
    const activeConnections = parseInt(text.match(/Active connections: (\d+)/)?.[1] || '0');
    const [accepts, handled, requests] = text.match(/(\d+) (\d+) (\d+)/)?.[0].split(' ').map(Number) || [0, 0, 0];
    const [reading, writing, waiting] = text.match(/Reading: (\d+) Writing: (\d+) Waiting: (\d+)/)?.[0]
      .replace('Reading: ', '')
      .replace('Writing: ', '')
      .replace('Waiting: ', '')
      .split(' ')
      .map(Number) || [0, 0, 0];
    
    console.log('Successfully parsed NGINX status metrics');
    
    // Create metrics object
    const metrics = {
      connections: {
        active: activeConnections,
        reading,
        writing,
        waiting
      },
      http: {
        requests,
        accepts,
        handled
      },
      timestamp: new Date().toISOString(),
      source: 'nginx-status'
    };
    
    // Estimate traffic volume based on request count
    // This is a very rough estimate
    const avgBytesPerRequest = 10000; // 10KB per request on average
    const timeSpanSeconds = 60; // Assume 1 minute of data
    
    metrics.trafficVolume = {
      totalDownloadBytes: requests * avgBytesPerRequest,
      totalUploadBytes: requests * avgBytesPerRequest * 0.2,
      downloadSpeedMbps: (requests * avgBytesPerRequest * 8) / (timeSpanSeconds * 1000000),
      uploadSpeedMbps: (requests * avgBytesPerRequest * 0.2 * 8) / (timeSpanSeconds * 1000000),
      timeSpanSeconds
    };
    
    // Estimate error rate and response time
    metrics.errorRate = 1; // 1% error rate as a default estimate
    metrics.avgResponseTime = 50; // 50ms as a default estimate
    
    return metrics;
  } catch (error) {
    console.log('Error fetching NGINX status metrics:', error.message);
    return null;
  }
}

/**
 * Generate mock Nginx data for development/testing
 * @returns {Object} Mock Nginx metrics
 */
function generateMockNginxData() {
  console.log('Generating mock Nginx data');
  
  const now = new Date();
  const mockLogs = [];
  
  // Generate 100 mock log entries
  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(now);
    timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 60));
    
    const statusCodes = [200, 200, 200, 200, 200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 500];
    const status = statusCodes[Math.floor(Math.random() * statusCodes.length)];
    
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const method = methods[Math.floor(Math.random() * methods.length)];
    
    const paths = [
      '/', '/api/users', '/api/products', '/api/orders', 
      '/dashboard', '/login', '/register', '/profile',
      '/api/network/metrics', '/api/nginx/logs'
    ];
    const path = paths[Math.floor(Math.random() * paths.length)];
    
    const bytes = Math.floor(Math.random() * 100000) + 1000;
    const responseTime = Math.random() * 0.5; // 0-500ms
    
    mockLogs.push({
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      user: '-',
      timestamp: timestamp.toISOString(),
      method,
      path,
      protocol: 'HTTP/1.1',
      status,
      bytes_sent: bytes,
      referer: 'http://example.com',
      user_agent: 'Mozilla/5.0',
      response_time: responseTime
    });
  }
  
  // Process mock logs
  const metrics = {
    requestCount: mockLogs.length,
    trafficByStatus: {
      '2xx': 80,
      '3xx': 10,
      '4xx': 8,
      '5xx': 2
    },
    trafficByIP: {},
    trafficByEndpoint: {},
    recentLogs: mockLogs,
    errorRate: 2 + Math.random() * 3, // 2-5% error rate
    avgResponseTime: 50 + Math.random() * 50, // 50-100ms
    trafficVolume: {
      totalDownloadBytes: 15000000, // 15MB
      totalUploadBytes: 3000000,    // 3MB
      downloadSpeedMbps: 25 + Math.random() * 45, // 25-70 Mbps
      uploadSpeedMbps: 5 + Math.random() * 20,   // 5-25 Mbps
      timeSpanSeconds: 60
    },
    source: 'mock-data',
    isMock: true
  };
  
  return metrics;
}

export async function GET(request) {
  try {
    // Check if we should use mock data
    const { searchParams } = new URL(request.url);
    const forceMock = searchParams.get('mock') === 'true';
    
    if (forceMock || USE_MOCK_DATA) {
      console.log('Using mock Nginx data (explicitly requested or configured)');
      return NextResponse.json({
        ...generateMockNginxData(),
        source: 'mock-data-explicit'
      });
    }
    
    // Try NGINX Plus API first (commercial version)
    const nginxPlusMetrics = await getNginxPlusMetrics();
    
    if (nginxPlusMetrics) {
      console.log('Using NGINX Plus metrics');
      return NextResponse.json(nginxPlusMetrics);
    }
    
    // Try standard NGINX status page next
    const nginxStatusMetrics = await getNginxStatusMetrics();
    
    if (nginxStatusMetrics) {
      console.log('Using standard NGINX status metrics');
      return NextResponse.json(nginxStatusMetrics);
    }
    
    // Try to read Nginx logs as a last resort
    const parsedLogs = await readNginxLogs();
    
    if (parsedLogs && parsedLogs.length > 0) {
      console.log(`Processed ${parsedLogs.length} Nginx log entries`);
      
      // Process logs into metrics
      const metrics = processNginxLogs(parsedLogs);
      return NextResponse.json(metrics);
    }
    
    // If all else fails, use mock data
    console.log('No Nginx data sources available, using mock data');
    return NextResponse.json({
      ...generateMockNginxData(),
      source: 'mock-data-fallback'
    });
  } catch (error) {
    console.error('Error processing Nginx data:', error);
    console.log('Falling back to mock data due to error');
    return NextResponse.json({
      ...generateMockNginxData(),
      source: 'mock-data-error',
      error: error.message
    });
  }
}

