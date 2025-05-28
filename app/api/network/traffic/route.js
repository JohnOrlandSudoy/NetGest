import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// TShark filters based on your working tests
const TRAFFIC_FILTERS = {
  video: 'port 443 and tcp',  // Filter for Video
  audio: 'port 443 and tcp',  // Filter for Audio
  voice: 'udp port 5060 or udp portrange 10000-20000' // Filter for Voice (VoIP)
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const interfaceName = searchParams.get('interface');
    const trafficType = searchParams.get('type'); // e.g., 'video', 'audio', 'voice'
    const packetCount = searchParams.get('count') || '100'; // Default 100 packets

    if (!interfaceName) {
      return NextResponse.json(
        { error: 'Interface parameter is required' },
        { status: 400 }
      );
    }
    
    if (!trafficType || !['video', 'audio', 'voice'].includes(trafficType)) {
         return NextResponse.json(
           { error: 'Valid traffic type (video, audio, voice) is required' },
           { status: 400 }
         );
    }

    // Get the specific filter for the requested traffic type
    const filter = TRAFFIC_FILTERS[trafficType];
    
    if (!filter) {
         return NextResponse.json(
           { error: `No filter defined for traffic type: ${trafficType}` },
           { status: 400 }
         );
    }

    // Run TShark command for the specific traffic type
    // Use the interfaceName passed from the frontend
    const trafficData = await captureTraffic(interfaceName, filter, packetCount);

    // Structure the response to match the expected frontend state for the specific type
    const responseData = {
        video: { packets: 0, bytes: 0, bitrate: 0, details: [] },
        audio: { packets: 0, bytes: 0, bitrate: 0, details: [] },
        voice: { packets: 0, bytes: 0, bitrate: 0, details: [] },
        total: { packets: 0, bytes: 0, bitrate: 0 }
    };
    
    // Assign captured data to the specific type requested
    responseData[trafficType] = trafficData;
    
    // Recalculate total based on the single captured type for this request
    responseData.total = { 
        packets: trafficData.packets, 
        bytes: trafficData.bytes, 
        bitrate: trafficData.bitrate 
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing traffic:', error);
    return NextResponse.json(
      { error: 'Failed to analyze network traffic' },
      { status: 500 }
    );
  }
}

async function captureTraffic(interfaceName, filter, packetCount) {
  try {
    // Use the interfaceName (ID format) passed from the frontend
    const tsharkCommand = `tshark -i "${interfaceName}" -c ${packetCount} -f "${filter}" -T json`; // Added -T json for structured output
    const { stdout } = await execAsync(tsharkCommand);

    // Parse the JSON output
    const packets = JSON.parse(stdout);
    
    return {
      packets: packets.length,
      bytes: calculateTotalBytes(packets),
      bitrate: calculateBitrate(packets),
      details: packets
    };
  } catch (error) {
    console.error(`Error capturing traffic with filter ${filter} on interface ${interfaceName}:`, error);
    return {
      packets: 0,
      bytes: 0,
      bitrate: 0,
      details: []
    };
  }
}

function parseTSharkOutput(output) {
   // This function is no longer strictly needed if using -T json, but keep for reference/fallback
  const lines = output.split('\n');
  const packets = [];

  for (const line of lines) {
    if (line.trim() && !line.includes('Capturing on')) {
      try {
          // Attempt to parse JSON line by line (might not be reliable with -T json)
          const packet = JSON.parse(line);
           // Extract relevant info if needed
           const packetInfo = {
               time: parseFloat(packet._source.layers.frame['frame.time_epoch']),
               length: parseInt(packet._source.layers.frame['frame.len']) || 0
           } // Add other fields as necessary
          packets.push(packetInfo);
      } catch(e) {
          // Fallback to original line parsing if JSON fails (less accurate)
          const parts = line.split(/\s+/);
          if (parts.length >= 7) {
            const packet = {
              time: parseFloat(parts[1]),
              source: parts[2],
              destination: parts[4],
              protocol: parts[5],
              length: parseInt(parts[6]) || 0
            };
            packets.push(packet);
          }
      }
    }
  }

  return packets;
}

function calculateTotalBytes(packets) {
   // Calculate total bytes from the parsed packet objects
   // Assumes packets array now contains objects with a 'length' property
  return packets.reduce((total, packet) => total + (packet.length || 0), 0);
}

function calculateBitrate(packets) {
  if (packets.length < 2) return 0;
  
  // Assuming packets have a 'time' property representing epoch time
  const firstPacketTime = packets[0].time;
  const lastPacketTime = packets[packets.length - 1].time;
  const duration = lastPacketTime - firstPacketTime;
  
  if (duration <= 0) return 0;
  
  const totalBytes = calculateTotalBytes(packets);
  return (totalBytes * 8) / duration; // Convert to bits per second
}

// The calculateTotalTraffic function is no longer needed in the API as we fetch per type
// function calculateTotalTraffic(trafficData) {
//   return {
//     packets: trafficData.video.packets + trafficData.audio.packets + trafficData.voice.packets,
//     bytes: trafficData.video.bytes + trafficData.audio.bytes + trafficData.voice.bytes,
//     bitrate: trafficData.video.bitrate + trafficData.audio.bitrate + trafficData.voice.bitrate
//   };
// } 