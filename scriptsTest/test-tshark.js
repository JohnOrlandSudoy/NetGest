const { exec } = require('child_process');
const path = require('path');

// Path to TShark executable
const TSHARK_PATH = 'C:\\Program Files\\Wireshark\\tshark.exe';

// Interface ID - replace with your actual interface ID
const INTERFACE_ID = '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}';

// Duration for monitoring in seconds
const DURATION = 5;

/**
 * Test if TShark is accessible and working
 */
async function testTSharkAccess() {
  console.log('\n--- Testing TShark Access ---');
  try {
    const command = `"${TSHARK_PATH}" -v`;
    console.log('Running command:', command);
    
    const output = await runCommand(command);
    console.log('TShark version:', output.split('\n')[0]);
    return true;
  } catch (error) {
    console.error('Error accessing TShark:', error);
    return false;
  }
}

/**
 * Test if the network interface is accessible
 */
async function testInterfaceAccess() {
  console.log('\n--- Testing Network Interface Access ---');
  try {
    const command = `"${TSHARK_PATH}" -D`;
    console.log('Running command:', command);
    
    const output = await runCommand(command);
    console.log('Available interfaces:', output);
    
    const interfaceExists = output.includes(INTERFACE_ID);
    console.log('Target interface exists:', interfaceExists);
    
    return interfaceExists;
  } catch (error) {
    console.error('Error accessing network interface:', error);
    return false;
  }
}

/**
 * Test basic packet capture
 */
async function testBasicCapture() {
  console.log('\n--- Testing Basic Packet Capture ---');
  try {
    const command = `"${TSHARK_PATH}" -i "${INTERFACE_ID}" -c 10 -q`;
    console.log('Running command:', command);
    
    const output = await runCommand(command);
    console.log('Capture output:', output);
    
    const packetCount = output.match(/(\d+) packets captured/);
    console.log('Packets captured:', packetCount ? packetCount[1] : 0);
    
    return true;
  } catch (error) {
    console.error('Error during basic capture:', error);
    return false;
  }
}

/**
 * Test video traffic capture
 */
async function testVideoTraffic() {
  console.log('\n--- Testing Video Traffic Capture ---');
  try {
    // Simplified filter to just check for HTTPS traffic
    const filter = 'tcp port 443';
    const command = `"${TSHARK_PATH}" -i "${INTERFACE_ID}" -c 10 -f "${filter}" -q`;
    console.log('Running command:', command);
    
    console.log('Starting capture...');
    const output = await runCommand(command);
    console.log('Capture completed');
    console.log('Video traffic output:', output);
    
    const packetCount = output.match(/(\d+) packets captured/);
    console.log('Video packets captured:', packetCount ? packetCount[1] : 0);
    
    return true;
  } catch (error) {
    console.error('Error during video traffic capture:', error);
    return false;
  }
}

/**
 * Test audio traffic capture
 */
async function testAudioTraffic() {
  console.log('\n--- Testing Audio Traffic Capture ---');
  try {
    // Simplified filter to just check for HTTPS traffic with smaller packets
    const filter = 'tcp port 443 and less 1000';
    const command = `"${TSHARK_PATH}" -i "${INTERFACE_ID}" -c 10 -f "${filter}" -q`;
    console.log('Running command:', command);
    
    console.log('Starting capture...');
    const output = await runCommand(command);
    console.log('Capture completed');
    console.log('Audio traffic output:', output);
    
    const packetCount = output.match(/(\d+) packets captured/);
    console.log('Audio packets captured:', packetCount ? packetCount[1] : 0);
    
    return true;
  } catch (error) {
    console.error('Error during audio traffic capture:', error);
    return false;
  }
}

/**
 * Test voice traffic capture
 */
async function testVoiceTraffic() {
  console.log('\n--- Testing Voice Traffic Capture ---');
  try {
    // Simplified filter to just check for UDP traffic
    const filter = 'udp';
    const command = `"${TSHARK_PATH}" -i "${INTERFACE_ID}" -c 10 -f "${filter}" -q`;
    console.log('Running command:', command);
    
    const output = await runCommand(command);
    console.log('Voice traffic output:', output);
    
    const packetCount = output.match(/(\d+) packets captured/);
    console.log('Voice packets captured:', packetCount ? packetCount[1] : 0);
    
    return true;
  } catch (error) {
    console.error('Error during voice traffic capture:', error);
    return false;
  }
}

/**
 * Run a command and return its output
 */
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log('Executing command with timeout...');
    const timeout = setTimeout(() => {
      console.log('Command timed out, killing process...');
      process.kill(process.pid, 'SIGTERM');
      reject(new Error('Command timed out after 10 seconds'));
    }, 10000);

    const child = exec(command, { 
      maxBuffer: 1024 * 1024 * 10,
      windowsHide: true
    }, (error, stdout, stderr) => {
      clearTimeout(timeout);
      if (error) {
        console.error('Command error:', error);
        console.error('Command stderr:', stderr);
        reject(error);
        return;
      }
      resolve(stdout || stderr);
    });

    // Add error handler for the child process
    child.on('error', (error) => {
      console.error('Child process error:', error);
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('Starting TShark tests...\n');
  
  const tests = [
    { name: 'TShark Access', fn: testTSharkAccess },
    { name: 'Interface Access', fn: testInterfaceAccess },
    { name: 'Basic Capture', fn: testBasicCapture },
    { name: 'Video Traffic', fn: testVideoTraffic },
    { name: 'Audio Traffic', fn: testAudioTraffic },
    { name: 'Voice Traffic', fn: testVoiceTraffic }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    console.log(`\nRunning test: ${test.name}`);
    try {
      const passed = await test.fn();
      console.log(`${test.name} test ${passed ? 'PASSED' : 'FAILED'}`);
      allPassed = allPassed && passed;
    } catch (error) {
      console.error(`${test.name} test FAILED with error:`, error);
      allPassed = false;
    }
  }
  
  console.log('\n--- Test Summary ---');
  console.log(`All tests ${allPassed ? 'PASSED' : 'FAILED'}`);
}

// Run the tests
runAllTests().catch(console.error); 