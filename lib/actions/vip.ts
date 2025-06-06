'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function activateVip(userId: string): Promise<{ success: boolean; error?: string; profile?: any }> {
  if (!userId) {
    return { success: false, error: 'User ID not provided.' };
  }
  const cookieStore = cookies();
  const supabase = createClient();
  console.log(`[VIP ACTION] Activating VIP for user ID: ${userId}`); // Log received userId

  try {
    // --- DEBUGGING START: Explicitly try to select the profile first ---
    const { data: debugProfile, error: debugError } = await supabase
      .from('profiles')
      .select('id, username, vip_status, has_completed_onboarding') // Select a few key fields
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle to handle null without erroring

    if (debugError) {
      console.error(`[VIP ACTION DEBUG] Error fetching profile directly before update for ${userId}:`, debugError.message);
      // Potentially return an error here if this debug select fails, as update will likely also fail
      // return { success: false, error: `Debug: Failed to pre-fetch profile - ${debugError.message}` };
    } else if (!debugProfile) {
      console.warn(`[VIP ACTION DEBUG] No profile found for user ID ${userId} with direct select before update.`);
    } else {
      console.log(`[VIP ACTION DEBUG] Profile found with direct select before update for ${userId}:`, debugProfile);
    }
    // --- DEBUGGING END ---

    const { data: updatedProfiles, error: updateError, count } = await supabase
      .from('profiles')
      .update({ 
        vip_status: true, 
        // Optionally set a default vip_theme here if desired
        // vip_theme: 'purple', 
      })
      .eq('id', userId)
      .select(); // Removed .single()

    if (updateError) {
      console.error(`[VIP ACTION] Error updating profile for VIP status for ${userId}:`, updateError);
      return { success: false, error: updateError.message };
    }

    if (count === 0 || !updatedProfiles || updatedProfiles.length === 0) {
      // This means no profile was found with the given userId, so no update occurred.
      console.warn(`[VIP ACTION] No profile found for user ID ${userId} during update. Update affected 0 rows.`);
      return { success: false, error: 'Your profile could not be found to activate VIP status. Please ensure your profile is fully set up.' };
    }

    // If count > 0, the update was successful and updatedProfiles contains the updated record(s).
    // We expect only one profile to be updated.
    
    console.log(`[VIP ACTION] VIP status activated for ${userId}. Profile data:`, updatedProfiles[0]);
    // Revalidate paths to ensure UI updates across the app
    revalidatePath('/profile');
    revalidatePath('/vip');
    // Potentially revalidate other paths where VIP status is crucial

    return { success: true, profile: updatedProfiles[0] }; // Return the first (and expected to be only) updated profile

  } catch (e) {
    const error = e as Error;
    console.error(`[VIP ACTION] Unexpected error activating VIP for ${userId}:`, error);
    return { success: false, error: error.message || 'An unexpected error occurred while activating VIP.' };
  }
} 