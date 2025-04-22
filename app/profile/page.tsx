"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  BookOpen,
  Calendar,
  ChevronDown,
  Clock,
  Edit,
  Eye,
  Film,
  Heart,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Plus,
  Settings,
  Star,
  Trash2,
  TrendingUp,
  X,
  Save,
} from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ImageSkeleton } from "@/components/image-skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { getUserProfile, getUserWatchlist, getUserFavorites, updateProfile } from "@/lib/auth"
import { useAuth } from "@/components/supabase-auth-provider"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { format } from "date-fns"

// Interface for user data
interface UserData {
  id: string;
  username: string;
  displayName?: string;
  avatar_url?: string;
  created_at: string;
  email: string;
  bio?: string;
  location?: string;
}

// Interface for content item
interface ContentItem {
  id: string;
  title: string;
  image: string;
  progress: number;
  total: number | null;
  score: number | null;
}

// Interface for activity item
interface ActivityItem {
  id: string;
  type: "anime" | "manga";
  action: string;
  contentTitle: string;
  details: string;
  timestamp: string;
}

export default function ProfilePage() {
  const [activeAnimeTab, setActiveAnimeTab] = useState("watching")
  const [activeMangaTab, setActiveMangaTab] = useState("reading")
  const [activeMainTab, setActiveMainTab] = useState("anime")
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [animeWatching, setAnimeWatching] = useState<ContentItem[]>([])
  const [animeCompleted, setAnimeCompleted] = useState<ContentItem[]>([])
  const [animePlanToWatch, setAnimePlanToWatch] = useState<ContentItem[]>([])
  const [mangaReading, setMangaReading] = useState<ContentItem[]>([])
  const [mangaCompleted, setMangaCompleted] = useState<ContentItem[]>([])
  const [mangaPlanToRead, setMangaPlanToRead] = useState<ContentItem[]>([])
  const [stats, setStats] = useState({
    anime: {
      watching: 0,
      completed: 0,
      onHold: 0,
      dropped: 0,
      planToWatch: 0,
      totalEpisodes: 0,
      daysWatched: 0,
      meanScore: 0,
    },
    manga: {
      reading: 0,
      completed: 0,
      onHold: 0,
      dropped: 0,
      planToRead: 0,
      totalChapters: 0,
      daysRead: 0,
      meanScore: 0,
    },
  })
  const router = useRouter()
  const { user, session, isLoading: authLoading } = useAuth()
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [editProfile, setEditProfile] = useState<{
    displayName: string;
    username: string;
    bio: string;
    location: string;
    avatar_url: string;
  }>({
    displayName: "",
    username: "",
    bio: "",
    location: "",
    avatar_url: "",
  })
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadUserData() {
      setIsLoading(true)
      
      // Use our auth provider
      if (!user || authLoading) {
        if (!authLoading) {
          // Only redirect if auth loading is complete and no user
          router.push('/login')
        }
        setIsLoading(false)
        return
      }
      
      try {
        // Get user profile
        const userId = user.id
        const profileResult = await getUserProfile(userId)
        
        if (profileResult.success) {
          if (profileResult.profile) {
            setUserData({
              id: profileResult.profile.id,
              username: profileResult.profile.username || 'User',
              displayName: user.user_metadata?.displayName || profileResult.profile.username,
              avatar_url: profileResult.profile.avatar_url,
              email: profileResult.profile.email,
              bio: user.user_metadata?.bio || '',
              location: user.user_metadata?.location || '',
              created_at: profileResult.profile.created_at
            })
          } else {
            // No profile found, create a default one
            setUserData({
              id: userId,
              username: user.email?.split('@')[0] || 'User',
              displayName: user.user_metadata?.displayName || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              avatar_url: user.user_metadata?.avatar_url || '',
              bio: user.user_metadata?.bio || '',
              location: user.user_metadata?.location || '',
              created_at: user.created_at || new Date().toISOString()
            })
          }
        } else if (profileResult.error) {
          console.error("Profile error:", profileResult.error.message, profileResult.error.details || '')
          // Still create a default user object from auth data
          setUserData({
            id: userId,
            username: user.email?.split('@')[0] || 'User',
            displayName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            created_at: user.created_at || new Date().toISOString()
          })
        }
        
        try {
          // Get anime watchlist
          const animeWatchlistResult = await getUserWatchlist(userId, 'anime')
          if (animeWatchlistResult.success && animeWatchlistResult.watchlist) {
            // Process watchlist data
            const watching: ContentItem[] = []
            const completed: ContentItem[] = []
            const planToWatch: ContentItem[] = []
            let totalEpisodes = 0
            let totalScore = 0
            let scoreCount = 0
            
            animeWatchlistResult.watchlist.forEach(item => {
              // Skip items with missing content data
              if (!item.content) return
              
              const content = item.content || {}
              const contentItem: ContentItem = {
                id: item.content_id,
                title: content.title || 'Unknown',
                image: content.thumbnail || '/placeholder.svg?height=450&width=300',
                progress: item.progress || 0,
                total: content.episodes_count || null,
                score: item.rating
              }
              
              if (item.progress) totalEpisodes += item.progress
              if (item.rating) {
                totalScore += item.rating
                scoreCount++
              }
              
              if (item.status === 'watching') {
                watching.push(contentItem)
              } else if (item.status === 'completed') {
                completed.push(contentItem)
              } else if (item.status === 'plan_to_watch') {
                planToWatch.push(contentItem)
              }
            })
            
            setAnimeWatching(watching)
            setAnimeCompleted(completed)
            setAnimePlanToWatch(planToWatch)
            
            // Update stats
            setStats(prev => ({
              ...prev,
              anime: {
                ...prev.anime,
                watching: watching.length,
                completed: completed.length,
                planToWatch: planToWatch.length,
                totalEpisodes,
                meanScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : 0
              }
            }))
          } else if (animeWatchlistResult.error) {
            console.error("Anime watchlist error:", animeWatchlistResult.error.message, animeWatchlistResult.error.details || '')
          }
        } catch (animeError) {
          console.error("Failed to load anime watchlist:", animeError)
        }
        
        try {
          // Get manga watchlist
          const mangaWatchlistResult = await getUserWatchlist(userId, 'manga')
          if (mangaWatchlistResult.success && mangaWatchlistResult.watchlist) {
            // Process watchlist data
            const reading: ContentItem[] = []
            const completed: ContentItem[] = []
            const planToRead: ContentItem[] = []
            let totalChapters = 0
            let totalScore = 0
            let scoreCount = 0
            
            mangaWatchlistResult.watchlist.forEach(item => {
              // Skip items with missing content data
              if (!item.content) return
              
              const content = item.content || {}
              const contentItem: ContentItem = {
                id: item.content_id,
                title: content.title || 'Unknown',
                image: content.thumbnail || '/placeholder.svg?height=450&width=300',
                progress: item.progress || 0,
                total: content.chapters_count || null,
                score: item.rating
              }
              
              if (item.progress) totalChapters += item.progress
              if (item.rating) {
                totalScore += item.rating
                scoreCount++
              }
              
              if (item.status === 'reading') {
                reading.push(contentItem)
              } else if (item.status === 'completed') {
                completed.push(contentItem)
              } else if (item.status === 'plan_to_read') {
                planToRead.push(contentItem)
              }
            })
            
            setMangaReading(reading)
            setMangaCompleted(completed)
            setMangaPlanToRead(planToRead)
            
            // Update stats
            setStats(prev => ({
              ...prev,
              manga: {
                ...prev.manga,
                reading: reading.length,
                completed: completed.length,
                planToRead: planToRead.length,
                totalChapters,
                meanScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : 0
              }
            }))
          } else if (mangaWatchlistResult.error) {
            console.error("Manga watchlist error:", mangaWatchlistResult.error.message, mangaWatchlistResult.error.details || '')
          }
        } catch (mangaError) {
          console.error("Failed to load manga watchlist:", mangaError)
        }

        // Load user activities
        if (user) {
          // This would ideally come from a real API endpoint
          // For now we'll simulate with watchlist data
          const recentActivities: ActivityItem[] = []
          
          try {
            const animeWatchlistResult = await getUserWatchlist(user.id, 'anime')
            if (animeWatchlistResult.success && animeWatchlistResult.watchlist) {
              // Create activity entries from watchlist data
              animeWatchlistResult.watchlist.forEach(item => {
                if (!item.content) return
                
                const createdAt = new Date(item.updated_at || item.created_at)
                const timeAgo = getTimeAgo(createdAt)
                
                let action = "updated"
                if (item.status === "watching") action = "watching"
                if (item.status === "completed") action = "completed"
                
                recentActivities.push({
                  id: item.id,
                  type: "anime",
                  action,
                  contentTitle: item.content.title,
                  details: item.progress ? `Episode ${item.progress}` : "",
                  timestamp: createdAt.toISOString()
                })
              })
            }
            
            const mangaWatchlistResult = await getUserWatchlist(user.id, 'manga')
            if (mangaWatchlistResult.success && mangaWatchlistResult.watchlist) {
              mangaWatchlistResult.watchlist.forEach(item => {
                if (!item.content) return
                
                const createdAt = new Date(item.updated_at || item.created_at)
                const timeAgo = getTimeAgo(createdAt)
                
                let action = "updated"
                if (item.status === "reading") action = "reading"
                if (item.status === "completed") action = "completed"
                
                recentActivities.push({
                  id: item.id,
                  type: "manga",
                  action,
                  contentTitle: item.content.title,
                  details: item.progress ? `Chapter ${item.progress}` : "",
                  timestamp: createdAt.toISOString()
                })
              })
            }
            
            // Sort by date, most recent first
            recentActivities.sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )
            
            setActivities(recentActivities.slice(0, 5)) // Take only the 5 most recent
          } catch (activityError) {
            console.error("Failed to load activity data:", activityError)
          }
        }
      } catch (err) {
        console.error("Error loading user data:", err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadUserData()
  }, [router, user, authLoading])

  // Update edit profile state when userData changes
  useEffect(() => {
    if (userData) {
      setEditProfile({
        displayName: userData.displayName || userData.username,
        username: userData.username,
        bio: userData.bio || "",
        location: userData.location || "",
        avatar_url: userData.avatar_url || "",
      })
    }
  }, [userData])

  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!user) return
    
    setIsSaving(true)
    try {
      const result = await updateProfile(user.id, {
        username: editProfile.username,
        displayName: editProfile.displayName,
        bio: editProfile.bio,
        location: editProfile.location,
        avatar_url: editProfile.avatar_url
      })
      
      if (result.success) {
        // Refresh the user data from Supabase
        const { data: userData } = await supabase.auth.getUser()
        
        // Update local state
        setUserData(prev => {
          if (!prev) return null
          return {
            ...prev,
            username: editProfile.username,
            displayName: editProfile.displayName,
            bio: editProfile.bio,
            location: editProfile.location,
            avatar_url: editProfile.avatar_url
          }
        })
        
        setIsEditProfileOpen(false)
        toast.success("Profile updated successfully")
      } else {
        toast.error(result.error?.message || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("An error occurred while updating profile")
    } finally {
      setIsSaving(false)
    }
  }

  // Helper function to format date
  function getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`
    return `${Math.floor(diffInSeconds / 31536000)} years ago`
  }

  if (isLoading) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />
        <main className="flex-1 overflow-x-hidden pl-[77px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading profile...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden pl-[77px]">
        {/* Profile header */}
        <div className="relative">
          {/* Cover image */}
          <div className="h-48 bg-gradient-to-r from-purple-900 to-blue-900">
            <div className="absolute inset-0 bg-[url('/placeholder.svg?height=300&width=1200')] opacity-20 bg-cover bg-center mix-blend-overlay" />
          </div>

          {/* Profile info */}
          <div className="container mx-auto px-4">
            <div className="relative -mt-16 flex flex-col md:flex-row items-start md:items-end gap-6 pb-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-black">
                  <ImageSkeleton
                    src={userData?.avatar_url || "/placeholder.svg"}
                    alt={userData?.displayName || "User"}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Keep edit button and handle it through the main edit profile dialog */}
                <button className="absolute bottom-0 right-0 bg-gray-800 hover:bg-gray-700 p-1.5 rounded-full"
                  onClick={() => setIsEditProfileOpen(true)}>
                  <Edit className="h-4 w-4" />
                </button>
              </div>

              {/* User info */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <h1 className="text-3xl font-bold">{userData?.displayName || "User"}</h1>
                  <div className="text-gray-400">@{userData?.username}</div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "Recently"}</span>
                  </div>
                  {userData?.location && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 22C16 18 20 14.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 14.4183 8 18 12 22Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{userData.location}</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-gray-300">{userData?.bio || "No bio added yet."}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 md:mt-0">
                <Button 
                  variant="outline" 
                  className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                  onClick={() => setIsEditProfileOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700 px-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
                    <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                      <Eye className="h-4 w-4 mr-2" />
                      View as public
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                      <Heart className="h-4 w-4 mr-2" />
                      Add to favorites
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-800" />
                    <DropdownMenuItem className="text-red-500 hover:bg-gray-800 hover:text-red-500 cursor-pointer">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete account
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Stats overview */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Anime stats */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <Film className="h-5 w-5 mr-2 text-blue-400" />
                  Anime Statistics
                </h2>
                <div className="text-sm text-gray-400">
                  {stats.anime.totalEpisodes} episodes • {stats.anime.daysWatched} days
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                <StatCard
                  label="Watching"
                  value={stats.anime.watching}
                  icon={<PlayCircle className="h-4 w-4 text-green-400" />}
                />
                <StatCard
                  label="Completed"
                  value={stats.anime.completed}
                  icon={<Check className="h-4 w-4 text-blue-400" />}
                />
                <StatCard
                  label="On Hold"
                  value={stats.anime.onHold}
                  icon={<PauseCircle className="h-4 w-4 text-yellow-400" />}
                />
                <StatCard
                  label="Dropped"
                  value={stats.anime.dropped}
                  icon={<X className="h-4 w-4 text-red-400" />}
                />
                <StatCard
                  label="Plan to Watch"
                  value={stats.anime.planToWatch}
                  icon={<Clock className="h-4 w-4 text-purple-400" />}
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Mean Score</div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                  <span className="font-medium">{stats.anime.meanScore}</span>
                </div>
              </div>

              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-yellow-300 h-full rounded-full"
                  style={{ width: `${(stats.anime.meanScore / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Manga stats */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-purple-400" />
                  Manga Statistics
                </h2>
                <div className="text-sm text-gray-400">
                  {stats.manga.totalChapters} chapters • {stats.manga.daysRead} days
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                <StatCard
                  label="Reading"
                  value={stats.manga.reading}
                  icon={<BookOpen className="h-4 w-4 text-green-400" />}
                />
                <StatCard
                  label="Completed"
                  value={stats.manga.completed}
                  icon={<Check className="h-4 w-4 text-blue-400" />}
                />
                <StatCard
                  label="On Hold"
                  value={stats.manga.onHold}
                  icon={<PauseCircle className="h-4 w-4 text-yellow-400" />}
                />
                <StatCard
                  label="Dropped"
                  value={stats.manga.dropped}
                  icon={<X className="h-4 w-4 text-red-400" />}
                />
                <StatCard
                  label="Plan to Read"
                  value={stats.manga.planToRead}
                  icon={<Clock className="h-4 w-4 text-purple-400" />}
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Mean Score</div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                  <span className="font-medium">{stats.manga.meanScore}</span>
                </div>
              </div>

              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-yellow-300 h-full rounded-full"
                  style={{ width: `${(stats.manga.meanScore / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content tabs */}
        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="anime" value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="anime" className="flex items-center gap-2">
                <Film className="h-4 w-4" />
                Anime
              </TabsTrigger>
              <TabsTrigger value="manga" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Manga
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="anime">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      className={cn("text-sm", activeAnimeTab === "watching" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveAnimeTab("watching")}
                    >
                      Watching ({stats.anime.watching})
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn("text-sm", activeAnimeTab === "completed" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveAnimeTab("completed")}
                    >
                      Completed ({stats.anime.completed})
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn(
                        "text-sm",
                        activeAnimeTab === "planToWatch" ? "bg-gray-800" : "hover:bg-gray-800/50",
                      )}
                      onClick={() => setActiveAnimeTab("planToWatch")}
                    >
                      Plan to Watch ({stats.anime.planToWatch})
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-sm hover:bg-gray-800/50">
                          More <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                          On Hold ({stats.anime.onHold})
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                          Dropped ({stats.anime.dropped})
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Anime
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {activeAnimeTab === "watching" &&
                    (animeWatching.length > 0 ? 
                      animeWatching.map((anime) => <AnimeListItem key={anime.id} item={anime} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">No anime in your watching list</div>
                    )
                  }

                  {activeAnimeTab === "completed" &&
                    (animeCompleted.length > 0 ? 
                      animeCompleted.map((anime) => <AnimeListItem key={anime.id} item={anime} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">No anime in your completed list</div>
                    )
                  }

                  {activeAnimeTab === "planToWatch" &&
                    (animePlanToWatch.length > 0 ? 
                      animePlanToWatch.map((anime) => <AnimeListItem key={anime.id} item={anime} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">No anime in your plan to watch list</div>
                    )
                  }
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manga">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      className={cn("text-sm", activeMangaTab === "reading" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveMangaTab("reading")}
                    >
                      Reading ({stats.manga.reading})
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn("text-sm", activeMangaTab === "completed" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveMangaTab("completed")}
                    >
                      Completed ({stats.manga.completed})
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn(
                        "text-sm",
                        activeMangaTab === "planToRead" ? "bg-gray-800" : "hover:bg-gray-800/50",
                      )}
                      onClick={() => setActiveMangaTab("planToRead")}
                    >
                      Plan to Read ({stats.manga.planToRead})
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-sm hover:bg-gray-800/50">
                          More <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                          On Hold ({stats.manga.onHold})
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                          Dropped ({stats.manga.dropped})
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manga
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {activeMangaTab === "reading" &&
                    (mangaReading.length > 0 ? 
                      mangaReading.map((manga) => <MangaListItem key={manga.id} item={manga} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">No manga in your reading list</div>
                    )
                  }

                  {activeMangaTab === "completed" &&
                    (mangaCompleted.length > 0 ? 
                      mangaCompleted.map((manga) => <MangaListItem key={manga.id} item={manga} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">No manga in your completed list</div>
                    )
                  }

                  {activeMangaTab === "planToRead" &&
                    (mangaPlanToRead.length > 0 ? 
                      mangaPlanToRead.map((manga) => <MangaListItem key={manga.id} item={manga} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">No manga in your plan to read list</div>
                    )
                  }
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Recent Activity</h2>

                <div className="space-y-4">
                  {activities.length > 0 ? (
                    activities.map(activity => (
                      <ActivityItemDisplay
                        key={activity.id}
                        type={activity.type}
                        action={activity.action}
                        title={activity.contentTitle}
                        details={activity.details}
                        time={getTimeAgo(new Date(activity.timestamp))}
                      />
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-400">
                      No recent activity found
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update your profile information below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-700">
                  <ImageSkeleton
                    src={editProfile.avatar_url || "/placeholder.svg"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button 
                  size="sm"
                  variant="outline"
                  className="absolute bottom-0 right-0 h-8 w-8 p-0 rounded-full bg-gray-800 border-gray-700"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={editProfile.displayName}
                onChange={e => setEditProfile({...editProfile, displayName: e.target.value})}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editProfile.username}
                onChange={e => setEditProfile({...editProfile, username: e.target.value})}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editProfile.bio}
                onChange={e => setEditProfile({...editProfile, bio: e.target.value})}
                className="bg-gray-800 border-gray-700 min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={editProfile.location}
                onChange={e => setEditProfile({...editProfile, location: e.target.value})}
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              className="bg-gray-800 border-gray-700 hover:bg-gray-700"
              onClick={() => setIsEditProfileOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              onClick={handleUpdateProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper components
function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="font-bold">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

function AnimeListItem({ item }: { item: any }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden">
      <div className="relative">
        <ImageSkeleton
          src={item.image || "/placeholder.svg"}
          alt={item.title}
          className="w-full aspect-[2/3] object-cover"
        />
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
              <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                <Heart className="h-4 w-4 mr-2" />
                Favorite
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem className="text-red-500 hover:bg-gray-800 hover:text-red-500 cursor-pointer">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>

        {item.progress > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Progress</span>
              <span>
                {item.progress}/{item.total || "?"}
              </span>
            </div>
            <Progress value={(item.progress / (item.total || item.progress)) * 100} className="h-1" />
          </div>
        )}

        {item.score && (
          <div className="mt-2 flex items-center">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 mr-1" />
            <span className="text-xs">{item.score}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function MangaListItem({ item }: { item: any }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden">
      <div className="relative">
        <ImageSkeleton
          src={item.image || "/placeholder.svg"}
          alt={item.title}
          className="w-full aspect-[2/3] object-cover"
        />
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
              <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                <Heart className="h-4 w-4 mr-2" />
                Favorite
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem className="text-red-500 hover:bg-gray-800 hover:text-red-500 cursor-pointer">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>

        {item.progress > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Progress</span>
              <span>
                {item.progress}/{item.total || "?"}
              </span>
            </div>
            <Progress value={(item.progress / (item.total || item.progress)) * 100} className="h-1" />
          </div>
        )}

        {item.score && (
          <div className="mt-2 flex items-center">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 mr-1" />
            <span className="text-xs">{item.score}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityItemDisplay({
  type,
  action,
  title,
  details,
  time,
}: {
  type: "anime" | "manga"
  action: string
  title: string
  details: string
  time: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
      <div className={`p-2 rounded-full ${type === "anime" ? "bg-blue-500/20" : "bg-purple-500/20"}`}>
        {type === "anime" ? (
          <Film className={`h-5 w-5 ${type === "anime" ? "text-blue-400" : "text-purple-400"}`} />
        ) : (
          <BookOpen className="h-5 w-5 text-purple-400" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{action}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-300">{title}</span>
        </div>
        <div className="text-sm text-gray-400">{details}</div>
      </div>
      <div className="text-xs text-gray-500">{time}</div>
    </div>
  )
}

function Check(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
