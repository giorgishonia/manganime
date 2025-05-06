"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { syncUserAfterLogin } from "@/lib/auth"
import { getProfileForUser, UserProfile } from "@/lib/users"

type AuthContextType = {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  isLoading: boolean
  isProfileLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any; success: boolean }>
  signUp: (email: string, password: string, username: string) => Promise<{ error: any; success: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Function to sync profile data after auth state changes
  const syncUserProfile = async (currentUser: User | null) => {
    if (currentUser) {
      setIsProfileLoading(true)
      try {
        // Sync user data (optional, might already be done by syncUserAfterLogin if needed)
        // await syncUserAfterLogin(currentUser.id);
        
        // Fetch the full profile
        const userProfile = await getProfileForUser(currentUser.id)
        setProfile(userProfile)
        console.log("Profile fetched/updated in AuthProvider:", userProfile)
      } catch (error) {
        console.error("Error fetching/syncing user profile in AuthProvider:", error)
        setProfile(null) // Clear profile on error
      } finally {
        setIsProfileLoading(false) // Finish loading profile
      }
    } else {
      // Clear profile if user logs out
      setProfile(null)
      setIsProfileLoading(false)
    }
  }

  // Initialize the auth state and listen for changes
  useEffect(() => {
    console.log("=== Initializing AuthProvider and setting up auth state listeners ===");
    
    // Check initial session
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession)
      const currentUser = activeSession?.user || null
      setUser(currentUser)
      console.log("Initial session check:", currentUser ? `User ${currentUser.id} is logged in` : "No active session");
      
      syncUserProfile(currentUser).finally(() => {
        setIsLoading(false) // Mark auth as loaded AFTER initial profile fetch attempt
        console.log("Initial auth state loading completed");
      })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
         console.log(`Auth state changed: ${_event}`, newSession ? `User: ${newSession.user.id}` : "No session");
         setSession(newSession)
         const currentUser = newSession?.user || null
         setUser(currentUser)
         // Fetch/Sync profile whenever user state changes
         await syncUserProfile(currentUser)
         
         // Check if user needs to be redirected to onboarding
         if (currentUser && _event !== 'SIGNED_OUT') {
           const userProfile = await getProfileForUser(currentUser.id)
           console.log(`Auth state change (${_event}): onboarding status:`, userProfile?.has_completed_onboarding);
           console.log(`Current path: ${pathname}`);
           
           if (userProfile && userProfile.has_completed_onboarding === false && 
               !['/login', '/signup', '/onboarding', '/api/auth/callback', '/auth/callback'].includes(pathname)) {
             console.log(`Redirecting user on auth change to /onboarding: ${currentUser.id}`)
             
             // Prevent immediate redirection if we just redirected
             const lastRedirectTime = sessionStorage.getItem('lastRedirectTime');
             const currentTime = Date.now();
             const isRecentRedirect = lastRedirectTime && (currentTime - parseInt(lastRedirectTime)) < 3000;
             
             if (!isRecentRedirect) {
               console.log("No recent redirection, redirecting to onboarding now");
               sessionStorage.setItem('lastRedirectTime', currentTime.toString());
               router.push('/onboarding')
             } else {
               console.log("Skipping redirection due to recent redirect");
             }
           }
         }
         
         // Ensure loading is false after potential profile fetch
         if (isLoading) setIsLoading(false)
      }
    )

    // Cleanup subscription
    return () => {
      console.log("=== Cleaning up AuthProvider auth state listeners ===");
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount

  // Effect for handling redirection based on onboarding status
  useEffect(() => {
    // Skip redirection logic if still loading or if on allowed paths
    if (isLoading || isProfileLoading) return;

    // Define paths allowed before onboarding is complete
    const allowedPaths = ['/login', '/signup', '/onboarding', '/api/auth/callback', '/auth/callback']

    // Check if user is logged in but hasn't completed onboarding
    // Treat both false and null/undefined values as not having completed onboarding
    const needsOnboarding = user && profile && profile.has_completed_onboarding !== true;
    const isNotOnAllowedPath = !allowedPaths.includes(pathname);
    
    // Add timestamp check to prevent rapid redirection loops
    const lastRedirectTime = sessionStorage.getItem('lastRedirectTime');
    const currentTime = Date.now();
    const isRecentRedirect = lastRedirectTime && (currentTime - parseInt(lastRedirectTime)) < 3000; // 3 second cooldown
    
    console.log(`Auth redirection check: needsOnboarding=${needsOnboarding}, isNotOnAllowedPath=${isNotOnAllowedPath}, pathname=${pathname}, isRecentRedirect=${isRecentRedirect}`);

    // Redirect to onboarding if needed and not redirected recently
    if (needsOnboarding && isNotOnAllowedPath && !isRecentRedirect) {
      console.log(`Redirecting user ${user.id} to /onboarding because profile is not complete.`);
      // Set timestamp to prevent redirect loops
      sessionStorage.setItem('lastRedirectTime', currentTime.toString());
      router.push('/onboarding');
    }
  }, [user, profile, isLoading, isProfileLoading, pathname, router]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Error signing in:", error.message)
        return { error, success: false }
      }

      setUser(data.user)
      setSession(data.session)
      
      // Sync profile data after successful sign in
      if (data.user) {
        await syncUserProfile(data.user)
        
        // Check if user has completed onboarding
        const userProfile = await getProfileForUser(data.user.id)
        
        // If the user hasn't completed onboarding, redirect them to the onboarding page
        if (userProfile && userProfile.has_completed_onboarding !== true) {
          router.push('/onboarding')
        } else {
          // Otherwise, redirect to the main page
          router.push('/')
        }
      }
      
      return { error: null, success: true }
    } catch (error) {
      console.error("Unexpected error during sign in:", error)
      return { error, success: false }
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string, username: string) => {
    try {
      // First, create the auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error("Error signing up:", error.message)
        return { error, success: false }
      }

      if (data.user) {
        // Then, create the user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email,
            username,
            avatar_url: '',
            has_completed_onboarding: false, // Mark new users as not having completed onboarding
          })

        if (profileError) {
          console.error("Error creating profile:", profileError.message)
          return { error: profileError, success: false }
        }
        
        // Sync profile after profile creation
        await syncUserProfile(data.user)

        // Redirect to onboarding page after successful signup
        router.push('/onboarding')
      }

      setUser(data.user)
      setSession(data.session)
      return { error: null, success: true }
    } catch (error) {
      console.error("Unexpected error during sign up:", error)
      return { error, success: false }
    }
  }

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    router.push('/login')
  }

  const value = {
    user,
    session,
    profile,
    isLoading,
    isProfileLoading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within a SupabaseAuthProvider")
  }
  return context
} 