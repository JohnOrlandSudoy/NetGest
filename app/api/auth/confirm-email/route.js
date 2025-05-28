import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }
    
    const supabase = createClient()
    
    // Try to resend confirmation email
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })
    
    if (error) {
      console.error('Error resending confirmation email:', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Confirmation email has been resent. Please check your inbox."
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

