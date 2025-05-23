import { NextResponse } from 'next/server';
import { networkInterfaces } from 'os'; // Node.js built-in module

export async function GET() {
  try {
    // Get actual network interfaces from the operating system
    const interfaces = [];
    const netInterfaces = networkInterfaces();
    
    // Process the interfaces
    Object.keys(netInterfaces).forEach(ifName => {
      // Get IPv4 addresses
      const ipv4Interfaces = netInterfaces[ifName].filter(iface => 
        iface.family === 'IPv4' || iface.family === 4
      );
      
      if (ipv4Interfaces.length > 0) {
        interfaces.push(ifName);
      }
    });
    
    // Always include loopback for testing if not already included
    if (!interfaces.includes('lo') && !interfaces.includes('lo0')) {
      // Check if loopback exists in the system
      if (netInterfaces['lo'] || netInterfaces['lo0']) {
        interfaces.push(netInterfaces['lo'] ? 'lo' : 'lo0');
      }
    }
    
    return NextResponse.json({
      success: true,
      data: interfaces
    });
  } catch (error) {
    console.error('Error fetching network interfaces:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch network interfaces',
      data: []
    }, { status: 500 });
  }
}


