import { exec } from 'child_process';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { command } = await request.json();

    if (!command) {
      return NextResponse.json(
        { success: false, error: 'No command provided' },
        { status: 400 }
      );
    }

    console.log('Executing TShark command:', command);

    return new Promise((resolve) => {
      const process = exec(command, { 
        maxBuffer: 1024 * 1024 * 10,
        windowsHide: true
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data;
      });

      process.stderr.on('data', (data) => {
        errorOutput += data;
      });

      // Set a timeout to kill the process if it takes too long
      const timeout = setTimeout(() => {
        process.kill();
        // Return partial results if we have any
        const finalOutput = errorOutput || output;
        if (finalOutput) {
          resolve(NextResponse.json({
            success: true,
            output: finalOutput,
            partial: true,
            message: 'Command timed out but returning partial results'
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            error: 'Command timed out with no output',
            details: 'The command took too long to execute and was terminated'
          }, { status: 500 }));
        }
      }, 10000);

      process.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0 || output || errorOutput) {
          // Command completed successfully or we have output
          resolve(NextResponse.json({
            success: true,
            output: errorOutput || output
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            error: 'Command failed with no output',
            details: `Process exited with code ${code}`
          }, { status: 500 }));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        console.error('TShark command error:', error);
        
        if (error.code === 'ENOENT') {
          resolve(NextResponse.json({
            success: false,
            error: 'TShark executable not found. Please ensure Wireshark is installed.'
          }, { status: 500 }));
        } else if (error.code === 'EPERM') {
          resolve(NextResponse.json({
            success: false,
            error: 'Permission denied. Please run the application with administrator privileges.'
          }, { status: 500 }));
        } else {
          resolve(NextResponse.json({
            success: false,
            error: `Command failed: ${error.message}`,
            details: errorOutput
          }, { status: 500 }));
        }
      });
    });
  } catch (error) {
    console.error('Error in execute endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 