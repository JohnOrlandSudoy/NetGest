import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Path to TShark executable - adjust as needed for Windows
const TSHARK_PATH = process.env.TSHARK_PATH || 'C:\\Program Files\\Wireshark\\tshark.exe';

// Duration for monitoring in seconds
const DURATION = 5;

/**
 * Run TShark command and return the output
 * @param {string} command - TShark command to run
 * @returns {Promise<string>} Command output
 */
async function runTSharkCommand(command) {
  try {
    console.log(`Running command: ${command}`);
    const { stdout, stderr } = await execPromise(command, { timeout: 10000 });
    
    // For TShark, stderr often contains the capture information
    // We need to combine stdout and stderr for complete output
    const fullOutput = stdout + stderr;
    return fullOutput;
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    throw error;
  }
}

/**
 * Parse TShark output to extract packet and byte counts
 * @param {string} output - TShark output
 * @returns {Object} Parsed statistics
 */
function parseOutput(output) {
  console.log('Parsing TShark output:', output);
  
  // For frame length output format (-T fields -e frame.len)
  const lines = output.trim().split('\n').filter(line => line.trim() !== '');
  console.log('Filtered lines:', lines);
  
  if (lines.length > 0 && lines.every(line => /^\d+$/.test(line.trim()))) {
    const lengths = lines.map(line => parseInt(line.trim(), 10));
    const packetCount = lengths.length;
    const byteCount = lengths.reduce((sum, len) => sum + len, 0);
    
    console.log(`Parsed frame lengths: ${packetCount} packets, ${byteCount} bytes`);
    
    return {
      packetCount,
      byteCount,
      rawOutput: output
    };
  }
  
  // Try to extract packet count from capture summary
  const packetMatch = output.match(/(\d+) packets captured/);
  const packetCount = packetMatch ? parseInt(packetMatch[1]) : 0;
  
  // Try to extract byte count from capture summary
  const byteMatch = output.match(/(\d+) bytes captured/);
  const byteCount = byteMatch ? parseInt(byteMatch[1]) : (packetCount * 1500); // Estimate if not found
  
  console.log(`Extracted from summary: ${packetCount} packets, ${byteCount} bytes`);
  
  return {
    packetCount,
    byteCount,
    rawOutput: output
  };
}

/**
 * Parse TShark IO statistics output into structured data
 * @param {string} output - TShark output
 * @returns {Object} Parsed statistics
 */
function parseIoStatOutput(output) {
  const lines = output.split('\n');
  const stats = [];
  let isInIoStatSection = false;
  let isInIntervalSection = false;
  
  for (const line of lines) {
    // Check if we're in the IO Statistics section
    if (line.includes('===IO Statistics===')) {
      isInIoStatSection = true;
      continue;
    }
    
    // Check if we're in the interval data section
    if (isInIoStatSection && line.includes('Interval | Frames | Bytes')) {
      isInIntervalSection = true;
      continue;
    }
    
    // Check if we're at the end of the IO Statistics section
    if (isInIoStatSection && line.includes('===') && stats.length > 0) {
      break;
    }
    
    // Parse interval data lines
    if (isInIoStatSection && isInIntervalSection && line.includes('|')) {
      // Skip the separator line
      if (line.includes('----')) continue;
      
      const parts = line.split('|').map(part => part.trim());
      
      // Skip if we don't have enough parts
      if (parts.length < 3) continue;
      
      // Extract interval, frames, and bytes
      const interval = parts[0];
      const frames = parseInt(parts[1]);
      const bytes = parseInt(parts[2]);
      
      // Skip if we don't have valid numbers
      if (isNaN(frames) || isNaN(bytes)) continue;
      
      // Calculate bits per second and packets per second
      // We need to extract the duration from the interval
      let duration = 1; // Default to 1 second
      
      if (interval.includes('<>')) {
        const times = interval.split('<>').map(t => t.trim());
        if (times.length === 2) {
          const start = parseFloat(times[0]);
          const end = times[1] === 'Dur' ? DURATION : parseFloat(times[1]);
          duration = end - start;
        }
      }
      
      // Ensure duration is at least 0.1 seconds to avoid division by zero
      duration = Math.max(duration, 0.1);
      
      const bitsPerSec = (bytes * 8) / duration;
      const packetsPerSec = frames / duration;
      
      stats.push({
        interval,
        frames,
        bytes,
        bitsPerSec,
        packetsPerSec,
        bytesPerSec: bytes / duration,
        mbps: bitsPerSec / 1000000
      });
    }
  }
  
  return {
    stats,
    rawOutput: output
  };
}

/**
 * Generate simulated traffic data when TShark is not available
 * @param {string} trafficType - Type of traffic (video, audio, voice)
 * @returns {Object} Simulated traffic data
 */
function generateSimulatedTrafficData(trafficType) {
  let packetCount, byteCount;
  
  switch (trafficType) {
    case 'video':
      packetCount = Math.floor(Math.random() * 50) + 50; // 50-100 packets
      byteCount = packetCount * (1200 + Math.floor(Math.random() * 600)); // 1200-1800 bytes per packet
      break;
    case 'audio':
      packetCount = Math.floor(Math.random() * 30) + 20; // 20-50 packets
      byteCount = packetCount * (600 + Math.floor(Math.random() * 300)); // 600-900 bytes per packet
      break;
    case 'voice':
      packetCount = Math.floor(Math.random() * 20) + 10; // 10-30 packets
      byteCount = packetCount * (300 + Math.floor(Math.random() * 200)); // 300-500 bytes per packet
      break;
    default:
      packetCount = Math.floor(Math.random() * 30) + 20; // 20-50 packets
      byteCount = packetCount * 1500; // 1500 bytes per packet
  }
  
  console.log(`Generated simulated ${trafficType} data: ${packetCount} packets, ${byteCount} bytes`);
  
  return {
    packetCount,
    byteCount,
    simulated: true
  };
}

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { interface: interfaceId, trafficType, filter } = body;
    
    if (!interfaceId) {
      return NextResponse.json(
        { error: 'Interface ID is required' },
        { status: 400 }
      );
    }
    
    // Check if TShark is available
    let tsharkAvailable = true;
    try {
      await execPromise(`"${TSHARK_PATH}" -v`, { timeout: 2000 });
    } catch (error) {
      console.error('TShark not available:', error.message);
      tsharkAvailable = false;
    }
    
    // If TShark is not available, return simulated data
    if (!tsharkAvailable) {
      console.log('TShark not available, returning simulated data');
      const simulatedData = generateSimulatedTrafficData(trafficType);
      return NextResponse.json({
        success: true,
        trafficType,
        ...simulatedData,
        timestamp: new Date().toISOString()
      });
    }
    
    // Build the TShark command
    let command;
    
    // Use a simpler filter that works better for most traffic
    const captureFilter = filter || "port 443 and tcp";
    
    // Build command based on traffic type
    switch (trafficType) {
      case 'video':
        command = `"${TSHARK_PATH}" -i "${interfaceId}" -a duration:5 -c 100 -f "tcp port 443" -q -T fields -e frame.len`;
        break;
      case 'audio':
        command = `"${TSHARK_PATH}" -i "${interfaceId}" -a duration:5 -c 100 -f "tcp port 443 and less 1000" -q -T fields -e frame.len`;
        break;
      case 'voice':
        command = `"${TSHARK_PATH}" -i "${interfaceId}" -a duration:5 -c 100 -f "udp" -q -T fields -e frame.len`;
        break;
      default:
        // Default to IO statistics for general traffic
        command = `"${TSHARK_PATH}" -i "${interfaceId}" -a duration:5 -q -z io,stat,1`;
    }
    
    console.log(`Running TShark command: ${command}`);
    
    // Run the command with a timeout
    let output;
    try {
      const { stdout, stderr } = await execPromise(command, { timeout: 10000 });
      output = stdout + stderr;
      
      // Log the raw output for debugging
      console.log(`Raw TShark output for ${trafficType}:`, output);
      
      // Parse the output
      const result = parseOutput(output);
      
      // If no packets were captured, try a more general capture
      if (result.packetCount === 0) {
        console.log(`No packets captured for ${trafficType}, trying general capture...`);
        const generalCommand = `"${TSHARK_PATH}" -i "${interfaceId}" -a duration:5 -c 100 -f "tcp or udp" -q -T fields -e frame.len`;
        const { stdout: generalStdout, stderr: generalStderr } = await execPromise(generalCommand, { timeout: 10000 });
        const generalOutput = generalStdout + generalStderr;
        const generalResult = parseOutput(generalOutput);
        
        if (generalResult.packetCount > 0) {
          console.log(`General capture successful for ${trafficType}:`, generalResult);
          return NextResponse.json({
            success: true,
            trafficType,
            ...generalResult,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Return the results
      return NextResponse.json({
        success: true,
        trafficType,
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error running TShark command: ${error.message}`);
      
      // If command fails, return simulated data
      const simulatedData = generateSimulatedTrafficData(trafficType);
      return NextResponse.json({
        success: true,
        trafficType,
        ...simulatedData,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`Error in TShark traffic API: ${error.message}`);
    
    // Return error response with simulated data
    const simulatedData = generateSimulatedTrafficData(error.trafficType || 'general');
    return NextResponse.json(
      { 
        error: `Failed to capture traffic: ${error.message}`,
        ...simulatedData,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
