import { NextResponse } from 'next/server';

// Generate mock dates for demonstration
const generateMockDates = () => {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    dates.push({
      date: dateStr,
      count: Math.floor(Math.random() * 10000) + 1000
    });
  }
  
  return dates;
};

export async function GET() {
  try {
    // Generate mock data
    const data = generateMockDates();
    
    return NextResponse.json({
      status: 'success',
      data: data
    });
  } catch (error) {
    console.error('Error generating mock dates:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to fetch dates',
        error: error.message 
      },
      { status: 500 }
    );
  }
}