import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = createClient()
    const { email, password, name } = await request.json()
    
    // Get the origin for redirect
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    
    // Server-side registration with no email confirmation
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: `${origin}/dashboard`,
      }
    })
    
    if (error) {
      console.error('Server registration error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 }
      )
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected server error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}





