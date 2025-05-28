const { exec } = require('child_process');
const path = require('path');
const { VideoTrafficService, AudioTrafficService, VoiceTrafficService } = require('../services/tshark/trafficServices');

// Path to TShark executable
const TSHARK_PATH = 'C:\\Program Files\\Wireshark\\tshark.exe';

// Interface ID - replace with your actual interface ID
// Use the specific ID provided by the user (kept for reference, but using index 4 below for voice test)
const INTERFACE_ID = '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}';

// Duration for monitoring in seconds
const DURATION = 5;

// Initialize services
const videoService = new VideoTrafficService(TSHARK_PATH, INTERFACE_ID);
const audioService = new AudioTrafficService(TSHARK_PATH, INTERFACE_ID);
const voiceService = new VoiceTrafficService(TSHARK_PATH, INTERFACE_ID);

/**
 * Run TShark command and return the output
 * @param {string} command - TShark command to run
 * @returns {Promise<string>} Command output
 */
function runTSharkCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Running command: ${command}`);
    
    // Set max buffer size to prevent truncation for large output
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        // Include stderr in the error message as it often contains useful info from tshark
        return reject(new Error(`Command failed: ${error.message}\nStderr: ${stderr}`));
      }
      
      // For TShark, stderr often contains the capture information, especially when using -q (quiet) or -V (verbose)
      // Combine stdout and stderr for complete output, prioritizing stderr if it contains meaningful data
      const fullOutput = stderr ? stderr + '\n' + stdout : stdout;
      resolve(fullOutput);
    });
  });
}

/**
 * Parse TShark IO statistics output into structured data
 * @param {string} output - TShark output
 * @returns {Object} Parsed statistics
 */
function parseIoStatOutput(output) {
  console.log("Raw TShark output:");
  console.log(output);
  
  const lines = output.split('\n');
  const stats = [];
  let isInIoStatSection = false;
  let isInIntervalSection = false;
  
  for (const line of lines) {
    // Check if we're in the IO Statistics section
    if (line.includes('========')) {
      isInIoStatSection = true;
      continue;
    }
    
    // Check if we're in the interval data section
    if (isInIoStatSection && line.includes('Interval | Frames | Bytes')) {
      isInIntervalSection = true;
      continue;
    }
    
    // Check if we're at the end of the IO Statistics section
    if (isInIoStatSection && line.includes('========') && stats.length > 0) {
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
      
      // Calculate bits per second and packets per second
      // We need to extract the duration from the interval
      let duration = 1; // Default to 1 second
      
      if (interval.includes('<>')) {
        const times = interval.split('<>').map(t => t.trim());
        if (times.length === 2) {
          const start = parseFloat(times[0]);
          const end = times[1] === 'Dur' ? 5 : parseFloat(times[1]);
          duration = end - start;
        }
      }
      
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
  
  return stats;
}

/**
 * Calculate network metrics from TShark statistics
 * @param {Array} stats - Parsed TShark statistics
 * @returns {Object} Network metrics
 */
function calculateNetworkMetrics(stats) {
  if (!stats || stats.length === 0) {
    return {
      downloadSpeed: 0,
      uploadSpeed: 0,
      latency: 0,
      packetLoss: 0
    };
  }
  
  // Use the last interval for current metrics
  const currentStats = stats[stats.length - 1];
  
  // Calculate download speed (in Mbps)
  // Assuming 70% of traffic is download in a typical scenario
  const downloadSpeed = currentStats.mbps * 0.7;
  
  // Calculate upload speed (in Mbps)
  // Assuming 30% of traffic is upload in a typical scenario
  const uploadSpeed = currentStats.mbps * 0.3;
  
  // Estimate latency based on network activity
  // This is a very rough estimate - real latency would need ping tests
  // Higher bandwidth often correlates with lower latency, but not always
  let latency = 20; // Base latency in ms
  
  if (currentStats.mbps > 0) {
    // Add some variability based on bandwidth
    // Lower bandwidth tends to have higher latency
    latency += 80 / (1 + currentStats.mbps / 10);
  }
  
  // Add some random variation (±5ms)
  latency += (Math.random() * 10) - 5;
  
  // Estimate packet loss based on network activity
  // This is a very rough estimate - real packet loss would need actual testing
  let packetLoss = 0.1; // Base packet loss percentage
  
  if (currentStats.packetsPerSec > 0) {
    // Higher packet rates might indicate congestion
    packetLoss += (currentStats.packetsPerSec > 1000) ? 0.5 : 0;
    
    // Very high bandwidth might indicate potential for packet loss
    packetLoss += (currentStats.mbps > 50) ? 0.3 : 0;
  }
  
  // Add some random variation (±0.2%)
  packetLoss += (Math.random() * 0.4) - 0.2;
  
  // Ensure packet loss is not negative
  packetLoss = Math.max(0, packetLoss);
  
  return {
    downloadSpeed: parseFloat(downloadSpeed.toFixed(2)),
    uploadSpeed: parseFloat(uploadSpeed.toFixed(2)),
    latency: parseFloat(latency.toFixed(1)),
    packetLoss: parseFloat(packetLoss.toFixed(2))
  };
}

/**
 * Main function to run the TShark test
 */
async function runTSharkTest() {
  try {
    // Build the TShark command for IO statistics
    const command = `"${TSHARK_PATH}" -i "${INTERFACE_ID}" -a duration:${DURATION} -q -z io,stat,1`;
    
    // Run the command
    const output = await runTSharkCommand(command);
    
    // Parse the output
    const stats = parseIoStatOutput(output);
    
    // If no stats were parsed, try a simpler approach
    if (stats.length === 0) {
      console.log("No IO statistics found. Using packet count to estimate metrics...");
      
      // Extract packet count from the output
      const packetMatch = output.match(/(\d+) packets captured/);
      const packetCount = packetMatch ? parseInt(packetMatch[1]) : 0;
      
      console.log(`Packets captured: ${packetCount}`);
      
      // Create a simple metric based on packet count
      if (packetCount > 0) {
        const packetsPerSec = packetCount / DURATION;
        const estimatedMbps = packetsPerSec * 1500 * 8 / 1000000; // Assuming 1500 bytes per packet
        
        const simpleMetrics = {
          downloadSpeed: parseFloat((estimatedMbps * 0.7).toFixed(2)),
          uploadSpeed: parseFloat((estimatedMbps * 0.3).toFixed(2)),
          latency: parseFloat((50 - (packetsPerSec / 10)).toFixed(1)),
          packetLoss: parseFloat((1 / (1 + packetsPerSec / 10)).toFixed(2))
        };
        
        console.log('\n--- Estimated Network Metrics (based on packet count) ---');
        console.log(JSON.stringify(simpleMetrics, null, 2));
        
        console.log('\n--- Human-Readable Metrics ---');
        console.log(`Download Speed: ${simpleMetrics.downloadSpeed} Mbps`);
        console.log(`Upload Speed: ${simpleMetrics.uploadSpeed} Mbps`);
        console.log(`Latency: ${simpleMetrics.latency} ms`);
        console.log(`Packet Loss: ${simpleMetrics.packetLoss}%`);
        
        return { stats: [], metrics: simpleMetrics };
      }
    }
    
    // Calculate network metrics
    const metrics = calculateNetworkMetrics(stats);
    
    // Log the results
    console.log('\n--- TShark Raw Statistics ---');
    console.log(JSON.stringify(stats, null, 2));
    
    console.log('\n--- Calculated Network Metrics ---');
    console.log(JSON.stringify(metrics, null, 2));
    
    console.log('\n--- Human-Readable Metrics ---');
    console.log(`Download Speed: ${metrics.downloadSpeed} Mbps`);
    console.log(`Upload Speed: ${metrics.uploadSpeed} Mbps`);
    console.log(`Latency: ${metrics.latency} ms`);
    console.log(`Packet Loss: ${metrics.packetLoss}%`);
    
    return { stats, metrics };
  } catch (error) {
    console.error('Error running TShark test:', error);
    return null;
  }
}

/**
 * Test TShark capture for Video traffic using the specified filter.
 */
async function testVideoTraffic() {
  console.log('\n--- Testing Video Traffic Capture ---');
  try {
    // Using the filter that worked in your manual tests
    const filter = 'port 443 and tcp';
    // Use the INTERFACE_ID constant
    const command = `"${TSHARK_PATH}" -i "${INTERFACE_ID}" -c 100 -f "${filter}"`;

    const output = await runTSharkCommand(command);

    console.log('\nRaw TShark Output (Video Traffic):');
    console.log(output);

    // Attempt to count packets from the output
    const packetMatch = output.match(/(\d+) packets captured/);
    const packetCount = packetMatch ? parseInt(packetMatch[1]) : 0;
    console.log(`\nPackets Captured (Video Traffic): ${packetCount}`);

  } catch (error) {
    console.error('\nError testing Video Traffic:', error);
  }
}

/**
 * Test TShark capture for Audio traffic using the specified filter.
 */
async function testAudioTraffic() {
  console.log('\n--- Testing Audio Traffic Capture ---');
  try {
    // Using the filter that worked in your manual tests
    const filter = 'port 443 and tcp';
     // Use the INTERFACE_ID constant
    const command = `"${TSHARK_PATH}" -i "${INTERFACE_ID}" -c 100 -f "${filter}"`;

    const output = await runTSharkCommand(command);

    console.log('\nRaw TShark Output (Audio Traffic):');
    console.log(output);

    // Attempt to count packets from the output
    const packetMatch = output.match(/(\d+) packets captured/);
    const packetCount = packetMatch ? parseInt(packetMatch[1]) : 0;
    console.log(`\nPackets Captured (Audio Traffic): ${packetCount}`);

  } catch (error) {
    console.error('\nError testing Audio Traffic:', error);
  }
}

/**
 * Test TShark capture for Voice traffic using the user's specified command and filter.
 */
async function testVoiceTraffic() {
  console.log('\n--- Testing Voice Traffic Capture (VoIP) ---');
  try {
    // Using the specific command and filter provided by the user
    // Note: This uses interface index -i 4 as specified in the user's command
    const filter = 'udp port 5060 or udp portrange 10000-20000';
    const command = `"${TSHARK_PATH}" -i 4 -c 100 -f "${filter}"`;

    const output = await runTSharkCommand(command);

    console.log('\nRaw TShark Output (Voice Traffic):');
    console.log(output);

    // Attempt to count packets from the output
    const packetMatch = output.match(/(\d+) packets captured/);
    const packetCount = packetMatch ? parseInt(packetMatch[1]) : 0;
    console.log(`\nPackets Captured (Voice Traffic): ${packetCount}`);

  } catch (error) {
    console.error('\nError testing Voice Traffic:', error);
  }
}

async function runTrafficAnalysis() {
  try {
    console.log('Starting network traffic analysis...\n');

    // Analyze Video Traffic
    console.log('Analyzing Video Traffic...');
    const videoResults = await videoService.analyzeVideoTraffic();
    console.log('Video Traffic Results:', JSON.stringify(videoResults, null, 2));

    // Analyze Audio Traffic
    console.log('\nAnalyzing Audio Traffic...');
    const audioResults = await audioService.analyzeAudioTraffic();
    console.log('Audio Traffic Results:', JSON.stringify(audioResults, null, 2));

    // Analyze Voice Traffic
    console.log('\nAnalyzing Voice Traffic...');
    const voiceResults = await voiceService.analyzeVoiceTraffic();
    console.log('Voice Traffic Results:', JSON.stringify(voiceResults, null, 2));

  } catch (error) {
    console.error('Error during traffic analysis:', error);
  }
}

// Run the analysis
runTrafficAnalysis();

// Export functions for use in other modules
module.exports = {
  runTSharkCommand,
  parseIoStatOutput,
  calculateNetworkMetrics,
  runTSharkTest,
  testVideoTraffic,
  testAudioTraffic,
  testVoiceTraffic
};





