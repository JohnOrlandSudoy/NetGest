import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Path to TShark executable - adjust as needed for Windows
const TSHARK_PATH = process.env.TSHARK_PATH || 'C:\\Program Files\\Wireshark\\tshark.exe';

// Check if TShark is available
async function checkTSharkAvailability() {
  try {
    const { stdout } = await execPromise(`"${TSHARK_PATH}" -v`);
    console.log('TShark version:', stdout.split('\n')[0]);
    return true;
  } catch (error) {
    console.log('TShark not available:', error.message);
    return false;
  }
}

// Get available network interfaces using TShark
async function getTSharkInterfaces() {
  try {
    const { stdout } = await execPromise(`"${TSHARK_PATH}" -D`);
    const interfaces = [];
    
    // Parse the output to extract interface IDs and names
    // Format: 1. \Device\NPF_{GUID} (Description)
    const lines = stdout.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s+(.+?)\s+\((.+)\)$/);
      if (match) {
        interfaces.push({
          number: match[1].trim(),
          id: match[2].trim(),
          name: match[3].trim(),
          description: match[3].trim()
        });
      }
    }
    
    console.log('Found interfaces:', interfaces.map(i => `${i.number}: ${i.name}`).join(', '));
    return interfaces;
  } catch (error) {
    console.error('Error getting TShark interfaces:', error);
    return [];
  }
}

// Generate baseline media traffic data when TShark is not available
function generateBaselineMediaTraffic(mediaType) {
  // Use fixed baseline values instead of random data
  let packetCount, byteCount;
  
  switch (mediaType) {
    case 'video':
      packetCount = 75;
      byteCount = 250000;
      break;
    case 'audio':
      packetCount = 35;
      byteCount = 60000;
      break;
    case 'voice':
      packetCount = 20;
      byteCount = 30000;
      break;
    default:
      packetCount = 30;
      byteCount = 50000;
  }
  
  return {
    packetCount,
    byteCount,
    timestamp: new Date().toISOString(),
    simulated: true
  };
}

// Capture media traffic using TShark
async function captureMediaTraffic(interfaceId, mediaType, filter, packetCount = 100) {
  try {
    // Check if TShark is available
    const tsharkAvailable = await checkTSharkAvailability();
    
    if (!tsharkAvailable) {
      console.log('TShark not available, using baseline data');
      return generateBaselineMediaTraffic(mediaType);
    }
    
    // Get available interfaces
    const interfaces = await getTSharkInterfaces();
    
    // If no interfaces found, use baseline data
    if (interfaces.length === 0) {
      console.log('No interfaces found, using baseline data');
      return generateBaselineMediaTraffic(mediaType);
    }
    
    // Determine which interface to use
    let interfaceToUse;
    
    // If interface is a number, use it as an interface index
    if (/^\d+$/.test(interfaceId)) {
      const index = parseInt(interfaceId, 10);
      const matchingInterface = interfaces.find(iface => iface.number === interfaceId);
      
      if (matchingInterface) {
        interfaceToUse = matchingInterface.id;
        console.log(`Using interface #${interfaceId}: ${matchingInterface.name} (${interfaceToUse})`);
      } else {
        // Use the first interface if the specified index doesn't exist
        interfaceToUse = interfaces[0].id;
        console.log(`Interface #${interfaceId} not found, using first interface: ${interfaces[0].name} (${interfaceToUse})`);
      }
    } 
    // If interface looks like a Windows device path, use it directly
    else if (interfaceId.includes('\\Device\\NPF_')) {
      interfaceToUse = interfaceId;
      console.log(`Using provided interface ID: ${interfaceId}`);
    } 
    // Otherwise, try to match by name or description
    else {
      const matchingInterface = interfaces.find(iface => 
        iface.name.toLowerCase().includes(interfaceId.toLowerCase()) ||
        iface.description.toLowerCase().includes(interfaceId.toLowerCase())
      );
      
      if (matchingInterface) {
        interfaceToUse = matchingInterface.id;
        console.log(`Matched interface "${interfaceId}" to: ${matchingInterface.name} (${interfaceToUse})`);
      } else {
        // Use the first interface if no match found
        interfaceToUse = interfaces[0].id;
        console.log(`No matching interface found for "${interfaceId}", using first interface: ${interfaces[0].name} (${interfaceToUse})`);
      }
    }
    
    // Build the TShark command based on media type
    let command;

    // Use a simpler filter that works better for most media traffic
    const simpleFilter = "port 443 and tcp";

    switch (mediaType) {
      case 'video':
        command = `"${TSHARK_PATH}" -i "${interfaceToUse}" -c ${packetCount} -f "${simpleFilter}" -T fields -e frame.len`;
        break;
      case 'audio':
        command = `"${TSHARK_PATH}" -i "${interfaceToUse}" -c ${packetCount} -f "${simpleFilter}" -T fields -e frame.len`;
        break;
      case 'voice':
        command = `"${TSHARK_PATH}" -i "${interfaceToUse}" -c ${packetCount} -f "${simpleFilter}" -T fields -e frame.len`;
        break;
      default:
        // Use provided filter or default
        command = `"${TSHARK_PATH}" -i "${interfaceToUse}" -c ${packetCount} -f "${filter}" -T fields -e frame.len`;
    }
    
    console.log(`Running TShark capture: ${command}`);
    
    // Execute the command with a shorter timeout (5 seconds)
    try {
      const { stdout, stderr } = await execPromise(command, { timeout: 5000 });
      
      if (stderr && !stderr.includes('Capturing on')) {
        console.error(`TShark error: ${stderr}`);
      }
      
      // Process the output
      const byteLengths = stdout.trim().split('\n').filter(line => line.trim() !== '');
      const capturedPacketCount = byteLengths.length;
      const byteCount = byteLengths.reduce((sum, len) => sum + parseInt(len, 10), 0);
      
      console.log(`Captured ${capturedPacketCount} packets, ${byteCount} bytes`);
      
      // If we captured packets, return the data
      if (capturedPacketCount > 0) {
        return {
          packetCount: capturedPacketCount,
          byteCount: byteCount || 0,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.log(`Command timed out or failed: ${error.message}`);
      // Continue to try a more general capture
    }
    
    // If we didn't capture any packets or the command failed, try a more general capture
    console.log('No packets captured with specific filter, trying general capture');
    const generalCommand = `"${TSHARK_PATH}" -i "${interfaceToUse}" -c ${packetCount} -f "tcp or udp" -T fields -e frame.len`;
    
    try {
      console.log(`Running general capture: ${generalCommand}`);
      const { stdout } = await execPromise(generalCommand, { timeout: 5000 });
      
      const generalByteLengths = stdout.trim().split('\n').filter(line => line.trim() !== '');
      const generalPacketCount = generalByteLengths.length;
      const generalByteCount = generalByteLengths.reduce((sum, len) => sum + parseInt(len, 10), 0);
      
      console.log(`General capture: ${generalPacketCount} packets, ${generalByteCount} bytes`);
      
      if (generalPacketCount > 0) {
        return {
          packetCount: generalPacketCount,
          byteCount: generalByteCount,
          timestamp: new Date().toISOString(),
          generalCapture: true
        };
      }
    } catch (error) {
      console.log(`General capture failed: ${error.message}`);
    }
    
    // If all capture attempts failed, use baseline data
    console.log('All capture attempts failed, using baseline data');
    return generateBaselineMediaTraffic(mediaType);
  } catch (error) {
    console.error(`Error in TShark capture: ${error.message}`);
    // Return baseline data on error
    return generateBaselineMediaTraffic(mediaType);
  }
}

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { interface: interfaceId, mediaType, filter, packetCount } = body;
    
    if (!interfaceId) {
      return NextResponse.json(
        { error: 'Interface ID is required' },
        { status: 400 }
      );
    }
    
    if (!mediaType) {
      return NextResponse.json(
        { error: 'Media type is required' },
        { status: 400 }
      );
    }
    
    // Use default filter if not provided
    const captureFilter = filter || "port 443 and tcp";
    
    // Capture media traffic
    const trafficData = await captureMediaTraffic(
      interfaceId,
      mediaType,
      captureFilter,
      packetCount || 100
    );
    
    // Return the traffic data
    return NextResponse.json({
      success: true,
      mediaType,
      ...trafficData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error in media traffic API: ${error.message}`);
    
    // Return error response with baseline data
    return NextResponse.json(
      { 
        error: `Failed to capture media traffic: ${error.message}`,
        simulated: true,
        packetCount: 30,
        byteCount: 50000,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}







