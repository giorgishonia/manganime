import { supabase } from './supabase'

// Register a new user with email and password
export async function registerUser(email: string, password: string, username: string) {
  try {
    console.log(`Starting registration process for email: ${email}, username: ${username}`);
    
    // First check if the username is already taken
    const { data: existingUser, error: usernameCheckError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();
      
    if (usernameCheckError && !usernameCheckError.message.includes('No rows found')) {
      console.error('Error checking username:', usernameCheckError);
      return { success: false, error: usernameCheckError };
    }
      
    if (existingUser) {
      console.log('Username already taken:', username);
      return { 
        success: false, 
        error: { message: 'profiles_username_key: Username already taken' } 
      };
    }

    // Create the user in Supabase Auth
    console.log('Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error('Auth sign up error:', authError);
      return { success: false, error: authError };
    }

    if (!authData.user) {
      console.error('No user returned from auth signup');
      return { 
        success: false, 
        error: { message: 'User creation failed' } 
      };
    }

    console.log('Auth user created with ID:', authData.user.id);

    // Create user profile in profiles table
    console.log('Creating user profile...');
    const profileData = {
      id: authData.user.id,
      email,
      username,
      avatar_url: '',
    };
    console.log('Profile data to insert:', profileData);
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return { success: false, error: profileError };
    }

    console.log('Registration successful for user:', authData.user.id);
    return { success: true, user: authData.user };
  } catch (error) {
    console.error('Registration error:', error);
    return { 
      success: false, 
      error: { 
        message: error instanceof Error ? error.message : 'Unknown registration error' 
      } 
    };
  }
}

// Update user profile
export async function updateProfile(userId: string, data: { 
  username?: string, 
  avatar_url?: string,
  displayName?: string,
  bio?: string,
  location?: string
}) {
  try {
    // Create a new object with only the fields that exist in the database
    const existingColumns = {
      username: data.username,
      avatar_url: data.avatar_url
    };
    
    // Store the extended profile data in user_metadata
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { 
        displayName: data.displayName,
        bio: data.bio,
        location: data.location
      }
    });
    
    if (metadataError) {
      throw metadataError;
    }
    
    // Only update fields that exist in the profiles table
    const { error } = await supabase
      .from('profiles')
      .update(existingColumns)
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Update profile error:', error);
    return { 
      success: false, 
      error: { 
        message: error instanceof Error ? error.message : 'Unknown error updating profile'
      }
    };
  }
}

// Get user profile
export async function getUserProfile(userId: string) {
  try {
    if (!userId) {
      console.error('Get profile error: No user ID provided');
      return { 
        success: false, 
        error: { message: 'No user ID provided' }
      };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - this is a common case, not an error
          console.log(`No profile found for user ID: ${userId}`);
          return { 
            success: true, 
            profile: null 
          };
        }
        throw error;
      }

      return { success: true, profile: data };
    } catch (supabaseError) {
      // Handle Supabase-specific errors
      console.error('Supabase error in getUserProfile:', supabaseError);
      return { 
        success: false, 
        error: { 
          message: supabaseError instanceof Error ? supabaseError.message : 'Database connection error',
          code: supabaseError.code || 'UNKNOWN'
        } 
      };
    }
  } catch (error) {
    // This catches any other unexpected errors
    console.error('Unexpected error in getUserProfile:', error);
    return { 
      success: false, 
      error: { 
        message: 'An unexpected error occurred while fetching profile data',
        details: error instanceof Error ? error.message : 'Unknown error'
      } 
    };
  }
}

// Add or remove favorite
export async function toggleFavorite(userId: string, contentId: string, contentType: 'anime' | 'manga') {
  try {
    // Check if already favorited
    const { data: existing, error: checkError } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .eq('content_type', contentType)

    if (checkError) {
      throw checkError
    }

    if (existing && existing.length > 0) {
      // Remove from favorites
      const { error: removeError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing[0].id)

      if (removeError) {
        throw removeError
      }

      return { success: true, action: 'removed' }
    } else {
      // Add to favorites
      const { error: addError } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          content_id: contentId,
          content_type: contentType,
        })

      if (addError) {
        throw addError
      }

      return { success: true, action: 'added' }
    }
  } catch (error) {
    console.error('Toggle favorite error:', error)
    return { success: false, error }
  }
}

// Update watchlist item status
export async function updateWatchlistStatus(
  userId: string, 
  contentId: string, 
  contentType: 'anime' | 'manga', 
  status: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped' | 'reading' | 'plan_to_read',
  progress: number = 0,
  rating: number | null = null
) {
  try {
    // Check if already in watchlist
    const { data: existing, error: checkError } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .eq('content_type', contentType)

    if (checkError) {
      throw checkError
    }

    if (existing && existing.length > 0) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from('watchlist')
        .update({
          status,
          progress,
          rating,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing[0].id)

      if (updateError) {
        throw updateError
      }
    } else {
      // Create new entry
      const { error: insertError } = await supabase
        .from('watchlist')
        .insert({
          user_id: userId,
          content_id: contentId,
          content_type: contentType,
          status,
          progress,
          rating
        })

      if (insertError) {
        throw insertError
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Update watchlist error:', error)
    return { success: false, error }
  }
}

// Get user's watchlist
export async function getUserWatchlist(userId: string, contentType?: 'anime' | 'manga', status?: string) {
  try {
    if (!userId) {
      console.error('Get watchlist error: No user ID provided');
      return { 
        success: false, 
        error: { message: 'No user ID provided' }
      };
    }

    try {
      let query = supabase
        .from('watchlist')
        .select(`
          *,
          content:content_id (*)
        `)
        .eq('user_id', userId);
      
      if (contentType) {
        query = query.eq('content_type', contentType);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Return empty array if no data
      return { 
        success: true, 
        watchlist: data || [] 
      };
    } catch (supabaseError) {
      // Handle Supabase-specific errors
      console.error('Supabase error in getUserWatchlist:', supabaseError);
      return { 
        success: false, 
        error: { 
          message: supabaseError instanceof Error ? supabaseError.message : 'Database connection error',
          code: supabaseError.code || 'UNKNOWN'
        } 
      };
    }
  } catch (error) {
    // This catches any other unexpected errors
    console.error('Unexpected error in getUserWatchlist:', error);
    return { 
      success: false, 
      error: { 
        message: 'An unexpected error occurred while fetching watchlist data',
        details: error instanceof Error ? error.message : 'Unknown error'
      } 
    };
  }
}

// Get user's favorites
export async function getUserFavorites(userId: string, contentType?: 'anime' | 'manga') {
  try {
    let query = supabase
      .from('favorites')
      .select(`
        *,
        content:content_id (*)
      `)
      .eq('user_id', userId)
    
    if (contentType) {
      query = query.eq('content_type', contentType)
    }
    
    const { data, error } = await query

    if (error) {
      throw error
    }

    return { success: true, favorites: data }
  } catch (error) {
    console.error('Get favorites error:', error)
    return { success: false, error }
  }
} 