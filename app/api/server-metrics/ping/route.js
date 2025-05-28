import { NextResponse } from 'next/server';

/**
 * Simple ping endpoint to check if the server is running
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: Date.now()
  });
}
