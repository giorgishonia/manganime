import { createClient } from '@supabase/supabase-js'

// These environment variables need to be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

if (!supabaseUrl || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  // Only warn at build time – runtime features requiring Supabase will fail without valid keys.
  console.warn('Supabase URL or Anon Key is missing – using placeholder key. Functionality that relies on Supabase will not work without proper environment variables.')
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Only attempt a connection check if real credentials are present
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const checkSupabaseConnection = async () => {
    try {
      const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
      if (error) {
        console.error('Error connecting to Supabase:', error.message)
        return false
      }
      console.log('Successfully connected to Supabase')
      return true
    } catch (err) {
      console.error('Unexpected error checking Supabase connection:', err)
      return false
    }
  }

  // Run the connection check when this module is imported (only in dev to reduce noise)
  if (process.env.NODE_ENV === 'development') {
    checkSupabaseConnection()
  }
}

// Database schema types for better type safety
export type Profile = {
  id: string
  username: string
  email: string
  avatar_url: string
  created_at: string
  updated_at: string
}

export type FavoriteItem = {
  id: string
  user_id: string
  content_id: string
  content_type: 'manga' | 'comics'
  created_at: string
}

export type WatchlistItem = {
  id: string
  user_id: string
  content_id: string
  content_type: 'manga' | 'comics'
  status: 'reading' | 'completed' | 'plan_to_read' | 'on_hold' | 'dropped'
  progress: number
  rating: number | null
  created_at: string
  updated_at: string
}

export type Content = {
  id: string
  title: string
  alt_titles?: string[]
  description: string
  thumbnail: string
  banner_image: string
  type: 'manga' | 'comics'
  status: 'ongoing' | 'completed' | 'upcoming'
  release_year: number
  genres: string[]
  chapters_count?: number
  rating: number
  created_at: string
  updated_at: string
}

export type Chapter = {
  id: string
  content_id: string
  number: number
  title: string
  pages_count: number
  release_date: string
  created_at: string
} 