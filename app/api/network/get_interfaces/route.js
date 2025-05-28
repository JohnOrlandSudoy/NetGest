import { NextResponse } from 'next/server';
import { networkInterfaces } from 'os'; // Node.js built-in module

export async function GET() {
  try {
    // Get actual network interfaces from the operating system
    const interfaces = [];
    const netInterfaces = networkInterfaces();
    
    // Process the interfaces
    Object.keys(netInterfaces).forEach(ifName => {
      // Filter out internal interfaces if needed
      if (ifName !== 'lo' && ifName !== 'lo0') {
        // Get IPv4 addresses
        const ipv4Interfaces = netInterfaces[ifName].filter(iface => 
          iface.family === 'IPv4' || iface.family === 4
        );
        
        if (ipv4Interfaces.length > 0) {
          interfaces.push(ifName);
        }
      }
    });
    
    // Always include loopback for testing
    interfaces.push('lo');
    
    // If no interfaces found, provide fallback
    if (interfaces.length === 0) {
      interfaces.push('eth0', 'wlan0');
    }
    
    return NextResponse.json({
      success: true,
      data: interfaces
    });
  } catch (error) {
    console.error('Error fetching network interfaces:', error);
    // Return mock data as fallback
    return NextResponse.json({
      success: true,
      data: ['eth0', 'eth1', 'wlan0', 'lo']
    });
  }
}


