import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const metrics = await request.json();
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Read existing data
    const dataFile = path.join(dataDir, 'metrics.json');
    let existingData = [];
    
    if (fs.existsSync(dataFile)) {
      const fileContent = fs.readFileSync(dataFile, 'utf8');
      existingData = JSON.parse(fileContent);
    }

    // Add new metrics with timestamp
    const newMetrics = {
      ...metrics,
      timestamp: new Date().toISOString(),
    };

    // Add to existing data
    existingData.push(newMetrics);

    // Keep only last 24 hours of data
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const filteredData = existingData.filter(item => 
      new Date(item.timestamp) > oneDayAgo
    );

    // Save updated data
    fs.writeFileSync(dataFile, JSON.stringify(filteredData, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Metrics saved successfully',
      data: newMetrics 
    });
  } catch (error) {
    console.error('Error saving metrics:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save metrics' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const dataFile = path.join(process.cwd(), 'data', 'metrics.json');
    
    if (!fs.existsSync(dataFile)) {
      return NextResponse.json({ data: [] });
    }

    const fileContent = fs.readFileSync(dataFile, 'utf8');
    const data = JSON.parse(fileContent);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error reading metrics:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to read metrics' },
      { status: 500 }
    );
  }
} 