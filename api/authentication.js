import { createClient } from '@/utils/supabase/client'

// Create a Supabase client
const supabase = createClient()

// Helper function to handle rate limiting with retry
const handleRateLimiting = async (fn, maxRetries = 2) => {
  let retries = 0;
  
  const executeWithRetry = async () => {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && retries < maxRetries) {
        retries++;
        // Exponential backoff: wait longer between each retry
        const delay = retries * 2000; // 2 seconds, 4 seconds, etc.
        console.log(`Rate limited. Retrying in ${delay/1000} seconds...`);
        
        // Wait for the specified delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the operation
        return executeWithRetry();
      }
      
      // If we've exhausted retries or it's another error, throw it
      if (error.status === 429) {
        throw {
          ...error,
          message: "Too many requests. Please try again in a few minutes."
        };
      }
      throw error;
    }
  };
  
  return executeWithRetry();
};

export const userLogin = async (payload) => {
  try {
    // Create a fresh client for each login attempt
    const freshSupabase = createClient();
    
    // Log the attempt (without password)
    console.log("Attempting login for:", payload.email);
    
    const { data, error } = await handleRateLimiting(() => 
      freshSupabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      })
    );
    
    if (error) {
      console.error("Login error details:", error);
      throw error;
    }
    
    // Make sure we have valid data before returning
    if (!data || !data.user || !data.session) {
      throw new Error("Invalid response from authentication server");
    }
    
    console.log("Login successful for:", payload.email);
    
    return { 
      data: { 
        user: data.user, 
        token: data.session.access_token 
      }, 
      error: null 
    };
  } catch (error) {
    console.error("Login error:", error);
    return { 
      data: null, 
      error: error.message || "Login failed. Please check your credentials." 
    };
  }
}

export const userRegistraion = async (payload) => {
  try {
    // Create a new Supabase client for each registration attempt
    const freshSupabase = createClient();
    
    const { data, error } = await handleRateLimiting(() => 
      freshSupabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            name: payload.name,
          },
          // No email confirmation needed
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      })
    );
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Registration error details:", error);
    return { data: null, error: error.message || "Registration failed" };
  }
}

export const userLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { data: { message: 'Logged out successfully' }, error: null };
  } catch (error) {
    return { data: null, error: error.message || "Logout failed" };
  }
}

export const changePassword = async (payload) => {
  try {
    const { error } = await handleRateLimiting(() => 
      supabase.auth.updateUser({
        password: payload.password
      })
    );
    
    if (error) throw error;
    return { data: { message: 'Password updated successfully' }, error: null };
  } catch (error) {
    return { data: null, error: error.message || "Password update failed" };
  }
}

export const editProfile = async (payload) => {
  try {
    const { data, error } = await handleRateLimiting(() => 
      supabase.auth.updateUser({
        data: payload
      })
    );
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message || "Profile update failed" };
  }
}

// Function to manually confirm email
export const manuallyConfirmEmail = async (email) => {
  try {
    const freshSupabase = createClient();
    
    // First, try to get the user by email
    const { data: userData, error: userError } = await freshSupabase.auth.admin.getUserByEmail(email);
    
    if (userError || !userData) {
      console.error("Error getting user by email:", userError);
      return { success: false, error: userError?.message || "User not found" };
    }
    
    // Then try to update the user to set email_confirmed_at
    const { error: updateError } = await freshSupabase.auth.admin.updateUserById(
      userData.id,
      { email_confirmed_at: new Date().toISOString() }
    );
    
    if (updateError) {
      console.error("Error updating user:", updateError);
      return { success: false, error: updateError.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error manually confirming email:", error);
    return { success: false, error: error.message };
  }
}

