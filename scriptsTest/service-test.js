const TSharkService = require('../services/tshark/tsharkService');
const { VideoTrafficService, AudioTrafficService, VoiceTrafficService } = require('../services/tshark/trafficServices');

// Configuration
const TSHARK_PATH = 'C:\\Program Files\\Wireshark\\tshark.exe';
const INTERFACE_ID = '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}';

async function testBaseService() {
  console.log('\n=== Testing Base TShark Service ===');
  const baseService = new TSharkService(TSHARK_PATH, INTERFACE_ID);

  try {
    // Test interface listing
    console.log('\n1. Testing interface listing...');
    const interfaces = await baseService.getInterfaces();
    console.log('Available interfaces:', JSON.stringify(interfaces, null, 2));

    // Test basic command execution
    console.log('\n2. Testing basic command execution...');
    const output = await baseService.executeCommand(`"${TSHARK_PATH}" -v`);
    console.log('TShark version info:', output.split('\n')[0]);

    // Test packet capture
    console.log('\n3. Testing basic packet capture...');
    const captureOutput = await baseService.captureTraffic('tcp', 2, 10);
    const packetCount = baseService.parsePacketCount(captureOutput);
    console.log(`Captured ${packetCount} packets`);

    console.log('\nBase service tests completed successfully!');
  } catch (error) {
    console.error('Base service test failed:', error);
  }
}

async function testTrafficServices() {
  console.log('\n=== Testing Traffic Services ===');

  // Initialize services
  const videoService = new VideoTrafficService(TSHARK_PATH, INTERFACE_ID);
  const audioService = new AudioTrafficService(TSHARK_PATH, INTERFACE_ID);
  const voiceService = new VoiceTrafficService(TSHARK_PATH, INTERFACE_ID);

  try {
    // Test Video Traffic Service
    console.log('\n1. Testing Video Traffic Service...');
    const videoResults = await videoService.analyzeVideoTraffic(3);
    console.log('Video Traffic Results:', JSON.stringify(videoResults, null, 2));

    // Test Audio Traffic Service
    console.log('\n2. Testing Audio Traffic Service...');
    const audioResults = await audioService.analyzeAudioTraffic(3);
    console.log('Audio Traffic Results:', JSON.stringify(audioResults, null, 2));

    // Test Voice Traffic Service
    console.log('\n3. Testing Voice Traffic Service...');
    const voiceResults = await voiceService.analyzeVoiceTraffic(3);
    console.log('Voice Traffic Results:', JSON.stringify(voiceResults, null, 2));

    console.log('\nTraffic services tests completed successfully!');
  } catch (error) {
    console.error('Traffic services test failed:', error);
  }
}

async function runAllTests() {
  console.log('Starting TShark Services Test Suite...');
  
  try {
    // Test base service first
    await testBaseService();
    
    // Then test traffic services
    await testTrafficServices();
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Run all tests
runAllTests(); 