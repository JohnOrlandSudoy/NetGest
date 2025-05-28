import { exec } from 'child_process';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { tsharkPath, interfaceId } = await request.json();

    // Check if TShark is accessible
    const command = `"${tsharkPath}" -D`;
    
    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Error checking TShark permissions:', error);
          resolve(NextResponse.json({ 
            success: false, 
            error: error.message 
          }, { status: 500 }));
          return;
        }

        // Check if the interface exists
        const interfaces = stdout.split('\n');
        const interfaceExists = interfaces.some(iface => 
          iface.includes(interfaceId)
        );

        resolve(NextResponse.json({ 
          success: true, 
          interfaceExists,
          interfaces: stdout 
        }));
      });
    });
  } catch (error) {
    console.error('Error in check-permissions:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 