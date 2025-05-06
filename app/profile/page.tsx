"use client"
import { createClient } from "@/lib/supabase/server";
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
  LogOut,
  Menu,
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
  User2,
  MapPin as MapPinIcon,
  Cake as CakeIcon,
  Upload as UploadIcon,
  Crown as CrownIcon,
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
import { getUserProfile, getUserWatchlist, updateProfile, refreshSession } from "@/lib/auth"
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
import { format, differenceInYears, parseISO } from "date-fns"
import { AvatarUploader } from "./components/avatar-uploader"
import { getLibraryItems } from '@/lib/user-library'
import { ProfileForm } from '@/components/settings/profile-form'
import { BannerUploader } from "@/components/profile/banner-uploader"
import { VIPBadge } from "@/components/ui/vip-badge"
import { AdBanner } from "@/components/ads/ad-banner"

// Interface for content item
interface ContentItem {
  id: string;
  title: string; // English title
  georgianTitle: string; // Georgian title
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

// Function to calculate age
function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  try {
    const date = parseISO(birthDate); // Parse ISO string (e.g., yyyy-MM-dd)
    return differenceInYears(new Date(), date);
  } catch (e) {
    console.error("Error parsing birth date:", e);
    return null;
  }
}

export default function ProfilePage() {
  const [activeAnimeTab, setActiveAnimeTab] = useState("watching")
  const [activeMangaTab, setActiveMangaTab] = useState("reading")
  const [activeMainTab, setActiveMainTab] = useState("anime")
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
  const { user, profile, isLoading: authLoading, isProfileLoading, session } = useAuth()
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showRefreshButton, setShowRefreshButton] = useState(false)
  const [showBannerUpload, setShowBannerUpload] = useState(false)
  const [profileBanner, setProfileBanner] = useState<string | null>(null)
  
  // Define isOwnProfile variable - determines if the user is viewing their own profile
  const isOwnProfile = !!user && !!profile // Currently only showing the logged-in user's profile

  useEffect(() => {
    // Determine loading state based on auth and profile loading
    const pageIsLoading = authLoading || isProfileLoading;
    setIsLoading(pageIsLoading);

    if (!authLoading && !user) {
        router.push('/login');
        return; // Exit early if not authenticated
    }

    // Load watchlist and activities only when user and profile are loaded
    async function loadSecondaryData() {
        if (!user || !profile) return;

        // Try to load anime watchlist...
        // Try to load manga watchlist...
        // After loading database data, now load localStorage items...
        // Load user activities...
        // (Keep existing watchlist/activity loading logic here, using user.id)
        try {
          // Get anime watchlist
          const animeWatchlistResult = await getUserWatchlist(user.id, 'anime')
          if (animeWatchlistResult.success && animeWatchlistResult.watchlist) {
            // Process watchlist data...
            // (existing anime processing logic)
          } else if (animeWatchlistResult.error) {
              // (existing anime error handling)
          }
        } catch (animeError) {
           // (existing anime catch block)
        }

        try {
            // Get manga watchlist
            const mangaWatchlistResult = await getUserWatchlist(user.id, 'manga')
            if (mangaWatchlistResult.success && mangaWatchlistResult.watchlist) {
                // Process watchlist data...
                 // (existing manga processing logic)
            } else if (mangaWatchlistResult.error) {
               // (existing manga error handling)
            }
        } catch (mangaError) {
           // (existing manga catch block)
        }

        // Load localStorage items only if user is available
        if (user) {
             try {
                // Get localStorage manga items...
                const localMangaItems = await getLibraryItems('manga');
                 // (existing local manga processing logic)

                // Get localStorage anime items...
                 const localAnimeItems = await getLibraryItems('anime');
                 // (existing local anime processing logic)
            } catch (localStorageError) {
                console.error('Error loading localStorage items:', localStorageError);
            }
        }

         // Load user activities...
        if (user) {
            try {
               // (existing activity loading logic)
            } catch (activityError) {
                console.error("Failed to load activity data:", activityError);
            }
        }
    }

    if (user && profile) {
        loadSecondaryData();
    }

  }, [user, profile, authLoading, isProfileLoading, router]) // Dependencies

  useEffect(() => {
    // Fetch profile banner if user is VIP
    async function fetchProfileBanner() {
      if (!user || !profile || !profile.vip_status) return;
      
      try {
        const { data, error } = await supabase
          .from('user_banners')
          .select('banner_url')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error("Error fetching banner:", error);
          return;
        }
        
        if (data) {
          setProfileBanner(data.banner_url);
        }
      } catch (err) {
        console.error("Failed to fetch profile banner:", err);
      }
    }
    
    if (user && profile) {
      fetchProfileBanner();
    }
  }, [user, profile]);
  
  // Handle banner update
  const handleBannerUpdate = (url: string) => {
    setProfileBanner(url);
  };

  // Helper function to format date
  function getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    // Note: Add Georgian localization or use a library for better i18n
    if (diffInSeconds < 60) return `${diffInSeconds} წამის წინ`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} წუთის წინ`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} საათის წინ`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} დღის წინ`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} კვირის წინ`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} თვის წინ`
    return `${Math.floor(diffInSeconds / 31536000)} წლის წინ`
  }

  const handleRefreshSession = async () => {
    setIsRefreshing(true)
    try {
      const result = await refreshSession()
      
      if (result.success) {
        toast.success("Session refreshed successfully. Reloading data...")
        // Wait a moment then reload the user data
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        toast.error(result.error?.message || "Failed to refresh session")
        console.error("Session refresh failed:", result.error)
      }
    } catch (error) {
      console.error("Error refreshing session:", error)
      toast.error("Failed to refresh session")
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />
        <main className="flex-1 overflow-x-hidden pl-[77px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin mx-auto mb-4"></div>
            <p>პროფილი იტვირთება...</p>
          </div>
        </main>
      </div>
    )
  }

  // Handle case where user is loaded but profile is not (shouldn't happen often with AuthProvider logic)
  if (!profile) {
      return (
         <div className="flex min-h-screen bg-black text-white">
            <AppSidebar />
            <main className="flex-1 overflow-x-hidden pl-[77px] flex items-center justify-center">
                <p className="text-red-500">პროფილის მონაცემების ჩატვირთვა ვერ მოხერხდა.</p>
            </main>
        </div>
      );
  }
  
  // Calculate age
  const age = calculateAge(profile?.birth_date);

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden pl-[77px]">
        {/* Profile header */}
        <div className="relative">
          {/* Custom VIP banner area */}
          <div className="h-48 overflow-hidden relative">
            {profile?.vip_status && profileBanner ? (
              <Image 
                src={profileBanner}
                alt="Profile Banner"
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-48 bg-gradient-to-r from-purple-900 to-blue-900">
                <div className="absolute inset-0 bg-black/30" />
              </div>
            )}
            
            {/* VIP badge */}
            {profile?.vip_status && (
              <div className="absolute top-4 right-4">
                <VIPBadge 
                  tier={profile.vip_tier || 'basic'} 
                  size="md"
                />
              </div>
            )}
            
            {/* Banner upload button (only shown for profile owner) */}
            {isOwnProfile && profile?.vip_status && (
              <Button 
                variant="outline" 
                size="sm"
                className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setShowBannerUpload(true)}
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                {profileBanner ? 'Change Banner' : 'Add Banner'}
              </Button>
            )}
          </div>

          {/* Profile info */}
          <div className="container mx-auto px-4">
            <div className="relative -mt-16 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 pb-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {/* Responsive avatar size */}
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-black">
                  <ImageSkeleton
                    src={profile.avatar_url || "/placeholder.svg"}
                    alt={profile.username || "მომხმარებელი"}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* User info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start gap-2 md:gap-4">
                   {/* Responsive heading size */}
                  <h1 className="text-2xl md:text-3xl font-bold">
                     {profile.first_name || profile.last_name 
                        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                        : profile.username || "მომხმარებელი"}
                  </h1>
                  <div className="text-gray-400">@{profile.username}</div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>შემოგვიერთდა {profile.created_at ? new Date(profile.created_at).toLocaleDateString('ka-GE', { month: 'long', year: 'numeric' }) : "ცოტა ხნის წინ"}</span>
                  </div>
                  {profile.location && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                       <MapPinIcon className="h-4 w-4" />
                       <span>{profile.location}</span>
                    </div>
                  )}
                  {age !== null && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                       <CakeIcon className="h-4 w-4" />
                       <span>{age} წლის</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-gray-300">{profile.bio || "ბიოგრაფია არ არის დამატებული."}</p>
              </div>

              {/* Actions */}
              {/* Stack buttons vertically on small screens */}
              <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 w-full md:w-auto">
                <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="bg-gray-800 border-gray-700 hover:bg-gray-700 w-full sm:w-auto"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      პარამეტრები
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>პროფილის პარამეტრები</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        შეცვალეთ თქვენი მომხმარებლის სახელი, ბიო და კონფიდენციალურობის პარამეტრები.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      {user && profile && (
                        <ProfileForm 
                          userId={user.id} 
                          initialData={{
                              id: profile.id,
                              username: profile.username || '',
                              avatar_url: profile.avatar_url,
                              bio: profile.bio || '',
                              is_public: profile.is_public ?? true,
                          }}
                          onSuccess={() => {
                             setIsEditProfileOpen(false);
                             toast.info("პროფილი განახლდა.");
                          }} 
                        />
                      )} 
                    </div>
                  </DialogContent>
                </Dialog>
                
                {showRefreshButton && (
                  <Button 
                    variant="outline" 
                    className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                    onClick={handleRefreshSession}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <div className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path 
                          d="M1 4V10H7" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        <path 
                          d="M23 20V14H17" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        <path 
                          d="M20.49 9.00001C19.9828 7.5668 19.1209 6.28542 17.9845 5.27543C16.8482 4.26545 15.4745 3.55976 13.9917 3.22426C12.5089 2.88877 10.9652 2.93436 9.50481 3.35685C8.04437 3.77935 6.71475 4.56397 5.64 5.64001L1 10M23 14L18.36 18.36C17.2853 19.4361 15.9556 20.2207 14.4952 20.6432C13.0348 21.0657 11.4911 21.1113 10.0083 20.7758C8.52547 20.4403 7.1518 19.7346 6.01547 18.7246C4.87913 17.7146 4.01717 16.4332 3.51 15"
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    სესიის განახლება
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700 px-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
                    <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                      <Eye className="h-4 w-4 mr-2" />
                      საჯაროდ ნახვა
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-800" />
                    <DropdownMenuItem className="text-red-500 hover:bg-gray-800 hover:text-red-500 cursor-pointer">
                      <Trash2 className="h-4 w-4 mr-2" />
                      ანგარიშის წაშლა
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Stats overview */}
        <div className="container mx-auto px-4 py-6">
          {/* Make stats grid single column on mobile, 2 on md+ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Anime stats */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-bold flex items-center">
                  <Film className="h-5 w-5 mr-2 text-blue-400" />
                  ანიმეს სტატისტიკა
                </h2>
                <div className="text-sm text-gray-400">
                  {stats.anime.totalEpisodes} ეპიზოდი • {stats.anime.daysWatched} დღე
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-4 mb-6">
                <StatCard
                  label="ვუყურებ"
                  value={stats.anime.watching}
                  icon={<PlayCircle className="h-4 w-4 text-green-400" />}
                />
                <StatCard
                  label="დასრულებული"
                  value={stats.anime.completed}
                  icon={<Check className="h-4 w-4 text-blue-400" />}
                />
                <StatCard
                  label="შეჩერებული"
                  value={stats.anime.onHold}
                  icon={<PauseCircle className="h-4 w-4 text-yellow-400" />}
                />
                <StatCard
                  label="მიტოვებული"
                  value={stats.anime.dropped}
                  icon={<X className="h-4 w-4 text-red-400" />}
                />
                <StatCard
                  label="სანახავი"
                  value={stats.anime.planToWatch}
                  icon={<Clock className="h-4 w-4 text-purple-400" />}
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">საშუალო შეფასება</div>
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
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-bold flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-purple-400" />
                  მანგის სტატისტიკა
                </h2>
                <div className="text-sm text-gray-400">
                  {stats.manga.totalChapters} თავი • {stats.manga.daysRead} დღე
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-4 mb-6">
                <StatCard
                  label="ვკითხულობ"
                  value={stats.manga.reading}
                  icon={<BookOpen className="h-4 w-4 text-green-400" />}
                />
                <StatCard
                  label="დასრულებული"
                  value={stats.manga.completed}
                  icon={<Check className="h-4 w-4 text-blue-400" />}
                />
                <StatCard
                  label="შეჩერებული"
                  value={stats.manga.onHold}
                  icon={<PauseCircle className="h-4 w-4 text-yellow-400" />}
                />
                <StatCard
                  label="მიტოვებული"
                  value={stats.manga.dropped}
                  icon={<X className="h-4 w-4 text-red-400" />}
                />
                <StatCard
                  label="წასაკითხი"
                  value={stats.manga.planToRead}
                  icon={<Clock className="h-4 w-4 text-purple-400" />}
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">საშუალო შეფასება</div>
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
            {/* Make TabsList scrollable on small screens */} 
            <TabsList className="mb-6 overflow-x-auto justify-start">
              <TabsTrigger value="anime" className="flex items-center gap-2 flex-shrink-0">
                <Film className="h-4 w-4" />
                ანიმე
              </TabsTrigger>
              <TabsTrigger value="manga" className="flex items-center gap-2 flex-shrink-0">
                <BookOpen className="h-4 w-4" />
                მანგა
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2 flex-shrink-0">
                <TrendingUp className="h-4 w-4" />
                აქტივობა
              </TabsTrigger>
            </TabsList>

            <TabsContent value="anime">
              <div className="mb-6">
                {/* Make tab controls scrollable & buttons smaller */} 
                <div className="flex items-center justify-between mb-4 overflow-x-auto pb-2">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm" // Smaller buttons
                      className={cn("text-xs md:text-sm", activeAnimeTab === "watching" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveAnimeTab("watching")}
                    >
                      ვუყურებ ({stats.anime.watching})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm" // Smaller buttons
                      className={cn("text-xs md:text-sm", activeAnimeTab === "completed" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveAnimeTab("completed")}
                    >
                      დასრულებული ({stats.anime.completed})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm" // Smaller buttons
                      className={cn(
                        "text-xs md:text-sm",
                        activeAnimeTab === "planToWatch" ? "bg-gray-800" : "hover:bg-gray-800/50",
                      )}
                      onClick={() => setActiveAnimeTab("planToWatch")}
                    >
                      სანახავი ({stats.anime.planToWatch})
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs md:text-sm hover:bg-gray-800/50">
                          მეტი <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                          შეჩერებული ({stats.anime.onHold})
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                          მიტოვებული ({stats.anime.dropped})
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                   {/* Make Add button text smaller */} 
                  <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 hover:bg-gray-700 flex-shrink-0 ml-2 text-xs md:text-sm">
                    <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    ანიმეს დამატება
                  </Button>
                </div>

                {/* Responsive grid columns for anime list */}
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {activeAnimeTab === "watching" &&
                    (animeWatching.length > 0 ? 
                      animeWatching.map((anime) => <AnimeListItem key={anime.id} item={anime} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">თქვენს სიაში არ არის ანიმე რომელსაც უყურებთ</div>
                    )
                  }

                  {activeAnimeTab === "completed" &&
                    (animeCompleted.length > 0 ? 
                      animeCompleted.map((anime) => <AnimeListItem key={anime.id} item={anime} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">თქვენს სიაში არ არის დასრულებული ანიმე</div>
                    )
                  }

                  {activeAnimeTab === "planToWatch" &&
                    (animePlanToWatch.length > 0 ? 
                      animePlanToWatch.map((anime) => <AnimeListItem key={anime.id} item={anime} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">თქვენს სიაში არ არის სანახავი ანიმე</div>
                    )
                  }
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manga">
              <div className="mb-6">
                {/* Make tab controls scrollable & buttons smaller */}
                <div className="flex items-center justify-between mb-4 overflow-x-auto pb-2">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm" // Smaller buttons
                      className={cn("text-xs md:text-sm", activeMangaTab === "reading" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveMangaTab("reading")}
                    >
                      ვკითხულობ ({stats.manga.reading})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm" // Smaller buttons
                      className={cn("text-xs md:text-sm", activeMangaTab === "completed" ? "bg-gray-800" : "hover:bg-gray-800/50")}
                      onClick={() => setActiveMangaTab("completed")}
                    >
                      დასრულებული ({stats.manga.completed})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm" // Smaller buttons
                      className={cn(
                        "text-xs md:text-sm",
                        activeMangaTab === "planToRead" ? "bg-gray-800" : "hover:bg-gray-800/50",
                      )}
                      onClick={() => setActiveMangaTab("planToRead")}
                    >
                      წასაკითხი ({stats.manga.planToRead})
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs md:text-sm hover:bg-gray-800/50">
                          მეტი <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-900 border-gray-800 text-gray-200">
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                          შეჩერებული ({stats.manga.onHold})
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                          მიტოვებული ({stats.manga.dropped})
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                   {/* Make Add button text smaller */}
                  <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 hover:bg-gray-700 flex-shrink-0 ml-2 text-xs md:text-sm">
                    <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    მანგის დამატება
                  </Button>
                </div>

                {/* Responsive grid columns for manga list */}
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {activeMangaTab === "reading" &&
                    (mangaReading.length > 0 ? 
                      mangaReading.map((manga) => <MangaListItem key={manga.id} item={manga} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">თქვენს სიაში არ არის მანგა რომელსაც კითხულობთ</div>
                    )
                  }

                  {activeMangaTab === "completed" &&
                    (mangaCompleted.length > 0 ? 
                      mangaCompleted.map((manga) => <MangaListItem key={manga.id} item={manga} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">თქვენს სიაში არ არის დასრულებული მანგა</div>
                    )
                  }

                  {activeMangaTab === "planToRead" &&
                    (mangaPlanToRead.length > 0 ? 
                      mangaPlanToRead.map((manga) => <MangaListItem key={manga.id} item={manga} />) :
                      <div className="col-span-full text-center py-10 text-gray-400">თქვენს სიაში არ არის წასაკითხი მანგა</div>
                    )
                  }
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">ბოლო აქტივობა</h2>

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
                      აქტივობა არ მოიძებნა
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Banner uploader dialog */}
      {user && (
        <BannerUploader
          userId={user.id}
          currentBannerUrl={profileBanner}
          onBannerUpdate={handleBannerUpdate}
          isOpen={showBannerUpload}
          onClose={() => setShowBannerUpload(false)}
        />
      )}
      
      {/* Ad banner - only shown for non-VIP users */}
      {!profile?.vip_status && (
        <div className="mx-auto my-4">
          <AdBanner placement="profile" />
        </div>
      )}
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
                რედაქტირება
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem className="text-red-500 hover:bg-gray-800 hover:text-red-500 cursor-pointer">
                <Trash2 className="h-4 w-4 mr-2" />
                წაშლა
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-1">{item.georgianTitle}</h3>
        {item.georgianTitle !== item.title && item.title && (
          <p className="text-xs text-gray-400 line-clamp-1">{item.title}</p>
        )}

        {item.progress > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">პროგრესი</span>
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
                რედაქტირება
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem className="text-red-500 hover:bg-gray-800 hover:text-red-500 cursor-pointer">
                <Trash2 className="h-4 w-4 mr-2" />
                წაშლა
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-1">{item.georgianTitle}</h3>
        {item.georgianTitle !== item.title && item.title && (
          <p className="text-xs text-gray-400 line-clamp-1">{item.title}</p>
        )}

        {item.progress > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">პროგრესი</span>
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
          <span className="font-medium">{action === "watching" ? "უყურებს" : 
                                         action === "reading" ? "კითხულობს" : 
                                         action === "completed" ? "დაასრულა" : 
                                         action === "updated" ? "განაახლა" : action}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-300">{title}</span>
        </div>
        <div className="text-sm text-gray-400">
          {details.includes("Episode") ? details.replace("Episode", "ეპიზოდი") : 
           details.includes("Chapter") ? details.replace("Chapter", "თავი") : details}
        </div>
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
