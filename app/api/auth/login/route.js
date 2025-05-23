import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = createClient()
    const { email, password } = await request.json()
    
    console.log("Server login attempt for:", email);
    
    // Server-side login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('Server login error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 401 }
      )
    }
    
    if (!data || !data.user || !data.session) {
      console.error('Server login: Invalid response data');
      return NextResponse.json(
        { error: "Invalid response from authentication server" },
        { status: 500 }
      )
    }
    
    console.log("Server login successful for:", email);
    
    return NextResponse.json({ 
      data: {
        user: data.user,
        token: data.session.access_token
      } 
    })
  } catch (error) {
    console.error('Unexpected server error during login:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during login' },
      { status: 500 }
    )
  }
}


