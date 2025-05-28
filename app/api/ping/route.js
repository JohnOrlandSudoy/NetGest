import { NextResponse } from 'next/server';

/**
 * Simple ping endpoint for latency and packet loss measurements
 */
export async function GET() {
  try {
    // Add a small random delay to simulate network conditions
    const delay = Math.random() * 20;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Return timestamp for accurate client-side calculations
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      server: 'NetGest API'
    });
  } catch (error) {
    console.error('Error in ping endpoint:', error);
    return NextResponse.json(
      { error: 'Ping failed' },
      { status: 500 }
    );
  }
}






