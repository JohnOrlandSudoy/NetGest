import { NextResponse } from 'next/server';
import { runSpeedTest } from '@/services/speedTestService';

/**
 * API route to run a speed test
 */
export async function GET() {
  try {
    // Run the speed test
    const results = await runSpeedTest();
    
    // Return the results
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in speed test API route:', error);
    return NextResponse.json(
      { error: 'Failed to run speed test' },
      { status: 500 }
    );
  }
}

