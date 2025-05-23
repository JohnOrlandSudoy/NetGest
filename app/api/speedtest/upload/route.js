import { NextResponse } from 'next/server';

/**
 * API route to handle upload speed test
 * This endpoint receives uploaded data and returns a response
 * to measure upload speed
 */
export async function POST(request) {
  try {
    // Get the uploaded data
    const data = await request.arrayBuffer();
    
    // Return a success response with the size of data received
    return NextResponse.json({
      success: true,
      bytesReceived: data.byteLength,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in upload speed test endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}

// Increase the body size limit for this route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb'
    }
  }
};
