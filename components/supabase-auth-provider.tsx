"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { syncUserAfterLogin } from "@/lib/auth"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any; success: boolean }>
  signUp: (email: string, password: string, username: string) => Promise<{ error: any; success: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Function to sync profile data after auth state changes
  const syncUserProfile = async (currentUser: User | null) => {
    if (currentUser) {
      try {
        // Sync user data to ensure profile avatar overrides any OAuth provider avatar
        await syncUserAfterLogin(currentUser.id);
      } catch (error) {
        console.error("Error syncing user profile:", error);
      }
    }
  };

  // Initialize the auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check active session
        const { data: { session: activeSession } } = await supabase.auth.getSession()
        setSession(activeSession)
        setUser(activeSession?.user || null)
        
        // Sync profile data if we have a user
        if (activeSession?.user) {
          await syncUserProfile(activeSession.user);
        }

        // Set up auth state listener
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("Auth state changed:", event);
            setSession(newSession)
            setUser(newSession?.user || null)
            
            // On sign in or user update, sync profile data
            if (newSession?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
              await syncUserProfile(newSession.user);
            }
            
            setIsLoading(false)
          }
        )

        setIsLoading(false)

        // Cleanup subscription
        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

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
        await syncUserProfile(data.user);
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
          })

        if (profileError) {
          console.error("Error creating profile:", profileError.message)
          return { error: profileError, success: false }
        }
        
        // Sync profile after profile creation
        await syncUserProfile(data.user);
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
    isLoading,
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