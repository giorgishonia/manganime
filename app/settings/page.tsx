"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, User, ShieldCheck, Palette, Bell } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { useAuth } from '@/components/supabase-auth-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from '@/components/settings/profile-form'; // We'll create this next
import { toast } from 'sonner';

// --- Placeholder Functions (replace with actual implementations in lib/users.ts) --- 

// Adjust UserProfile type if needed
interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string; 
}

async function getProfileForUser(userId: string): Promise<UserProfile | null> {
  console.log(`SettingsPage: Fetching profile for user ID: ${userId}`);
  // TODO: Implement actual Supabase query using userId
  // const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  // if(error) { console.error('Error fetching profile:', error); return null; }
  // return data;

  // Placeholder:
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate fetch
  // Simulate not finding profile (shouldn't happen for logged-in user ideally)
  // if (userId === 'nonexistent') return null;
  return {
      id: userId,
      username: 'current_user_placeholder', // Replace with actual fetched username
      avatar_url: null,
      bio: 'This is the current user bio placeholder.',
      created_at: new Date().toISOString(),
  };
}

// Note: updateUserProfile placeholder moved inside ProfileForm for simplicity, 
// but ideally lives in lib/users.ts

// --- End Placeholder Functions --- 

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    // Redirect if not logged in after auth check
    if (!authLoading && !user) {
      toast.error("Please log in to access settings.");
      router.push('/login');
      return;
    }

    // Fetch profile data if user is logged in
    if (user) {
      setIsLoadingProfile(true);
      getProfileForUser(user.id)
        .then(data => {
          if (data) {
            setProfile(data);
          } else {
            toast.error("Could not load your profile data.");
            // Handle case where profile might be missing? Maybe redirect or show error state.
          }
        })
        .catch(err => {
          console.error("Error fetching profile in SettingsPage:", err);
          toast.error("Failed to load profile data.");
        })
        .finally(() => {
          setIsLoadingProfile(false);
        });
    }
  }, [user, authLoading, router]);

  if (authLoading || (user && isLoadingProfile)) {
    return (
      <>
        <AppSidebar />
        <div className="flex justify-center items-center min-h-screen md:pl-20">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
        </div>
      </>
    );
  }
  
  // If user is null after loading, redirect should have happened, but double-check
  if (!user) {
     return null; // Or a redirect component
  }

  // Handle profile load error state more gracefully
  if (!profile && !isLoadingProfile) {
     return (
       <>
         <AppSidebar />
         <div className="container mx-auto px-4 py-8 md:pl-24">
           <p className='text-red-500'>Error: Could not load profile data. Please try refreshing.</p>
         </div>
       </>
     );
  }

  const handleProfileUpdate = (updatedProfileData: Partial<UserProfile>) => {
    // Update local state optimistically or after confirmation
    setProfile(prev => prev ? { ...prev, ...updatedProfileData } : null);
    // Optionally, re-fetch user from useAuth if username affects it?
    toast.success("Profile updated successfully!");
  };

  return (
    <>
      <AppSidebar />
      <div className="container mx-auto px-4 py-8 md:pl-24">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" /> Profile
            </TabsTrigger>
            <TabsTrigger value="account" disabled>
              <ShieldCheck className="h-4 w-4 mr-2" /> Account
            </TabsTrigger>
            <TabsTrigger value="appearance" disabled>
              <Palette className="h-4 w-4 mr-2" /> Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications" disabled>
              <Bell className="h-4 w-4 mr-2" /> Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            {profile ? (
              <ProfileForm 
                initialData={profile} 
                userId={user.id} 
                onSuccess={handleProfileUpdate} // Pass callback
              />
            ) : (
              // This should ideally not be reached due to earlier checks
              <p>Loading profile form...</p> 
            )}
          </TabsContent>
          
          {/* Add TabsContent for other sections later */}
          <TabsContent value="account">
            <p>Account settings coming soon.</p>
          </TabsContent>
          <TabsContent value="appearance">
            <p>Appearance settings coming soon.</p>
          </TabsContent>
           <TabsContent value="notifications">
            <p>Notification settings coming soon.</p>
          </TabsContent>
          
        </Tabs>
      </div>
    </>
  );
} 