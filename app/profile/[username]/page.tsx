"use client"

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
    Loader2, 
    User as UserIcon, 
    Calendar, 
    Edit, 
    AlertTriangle, 
    Settings, 
    // Add other used icons back
    BookOpen,
    Check,
    ChevronDown,
    Clock,
    Eye,
    Film,
    LogOut,
    Menu,
    MoreHorizontal,
    PauseCircle,
    PlayCircle,
    Plus,
    Star,
    Trash2,
    TrendingUp,
    X,
    Save,
    User2,
    MapPin as MapPinIcon,
    Cake as CakeIcon, 
} from 'lucide-react';
import { format, differenceInYears, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/app-sidebar';
import { useAuth } from '@/components/supabase-auth-provider';
import { toast } from 'sonner';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
// Correct path assumption, adjust if needed
import { AvatarUploader } from '@/app/profile/components/avatar-uploader'; 
import { getLibraryItems } from '@/lib/user-library';
import { ProfileForm } from '@/components/settings/profile-form';
// Import UserProfile type and specific fetch function FROM LIB/USERS
import { UserProfile, getUserProfileByUsername } from '@/lib/users'; 
// Import watchlist/session functions FROM LIB/AUTH
import { getUserWatchlist, refreshSession } from '@/lib/auth'; 
import { ImageSkeleton } from "@/components/image-skeleton"; // Add ImageSkeleton import
import { Progress } from "@/components/ui/progress"; // Add Progress import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Add Tabs imports
// Add DropdownMenu imports
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// REMOVE Placeholder type definition - use imported UserProfile
// interface UserProfile { ... }

// REMOVE Placeholder fetch function - use imported getUserProfileByUsername
// async function getUserProfileByUsername(username: string): Promise<UserProfile | null> { ... }

// RE-ADD local interface definitions
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


// Function to calculate age (keep as is)
// ... calculateAge function ...

export default function ProfilePage() {
  // Get params using the hook
  const params = useParams();
  const targetUsername = params.username as string; // Get username and cast to string
  
  // State for the profile being viewed
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [targetProfileLoading, setTargetProfileLoading] = useState(true);
  const [profileNotFound, setProfileNotFound] = useState(false);
  
  // Existing state for lists, stats, tabs etc.
  const [activeAnimeTab, setActiveAnimeTab] = useState("watching");
  const [activeMangaTab, setActiveMangaTab] = useState("reading");
  const [activeMainTab, setActiveMainTab] = useState("anime");
  const [animeWatching, setAnimeWatching] = useState<ContentItem[]>([]);
  const [animeCompleted, setAnimeCompleted] = useState<ContentItem[]>([]);
  const [animePlanToWatch, setAnimePlanToWatch] = useState<ContentItem[]>([]);
  const [mangaReading, setMangaReading] = useState<ContentItem[]>([]);
  const [mangaCompleted, setMangaCompleted] = useState<ContentItem[]>([]);
  const [mangaPlanToRead, setMangaPlanToRead] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState({
    anime: {
      watching: 0,
      completed: 0,
      onHold: 0,
      dropped: 0,
      planToWatch: 0,
      meanScore: 0,
      totalEntries: 0,
    },
    manga: {
      reading: 0,
      completed: 0,
      onHold: 0,
      dropped: 0,
      planToRead: 0,
      meanScore: 0,
      totalEntries: 0,
    },
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  
  const router = useRouter();
  // Get logged-in user's info (profile will be the logged-in user's profile)
  const { user: loggedInUser, profile: loggedInUserProfile, isLoading: authLoading, isProfileLoading: loggedInProfileLoading } = useAuth();
  
  // State for settings dialog
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // State for refresh button (keep as is)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshButton, setShowRefreshButton] = useState(false);

  // Determine if the logged-in user is viewing their own profile
  const isOwnProfile = loggedInUserProfile?.username === targetUsername;

  // Effect 1: Fetch the target profile based on username param
  useEffect(() => {
    async function fetchTargetProfile() {
      if (!targetUsername) return;
      console.log(`Fetching profile for username: ${targetUsername}`);
      setTargetProfileLoading(true);
      setProfileNotFound(false);
      try {
        const fetchedProfile = await getUserProfileByUsername(targetUsername);
        if (fetchedProfile) {
          setTargetProfile(fetchedProfile);
          console.log(`Profile found for ${targetUsername}:`, fetchedProfile);
        } else {
          setTargetProfile(null);
          setProfileNotFound(true);
          console.log(`Profile not found for ${targetUsername}`);
        }
      } catch (error) {
        console.error(`Error fetching profile for ${targetUsername}:`, error);
        setTargetProfile(null);
        setProfileNotFound(true);
        toast.error("პროფილის ჩატვირთვისას მოხდა შეცდომა.");
      } finally {
        setTargetProfileLoading(false);
      }
    }
    fetchTargetProfile();
  }, [targetUsername]); // Re-run if username changes

  // Effect 2: Load secondary data (lists, stats, activity) once target profile is loaded
  useEffect(() => {
    async function loadSecondaryData() {
      if (!targetProfile?.id) return; // Need the target profile ID
      
      const userIdToFetch = targetProfile.id;
      console.log(`Fetching secondary data for user ID: ${userIdToFetch}`);

      // Reset lists before fetching new data
      setAnimeWatching([]);
      setAnimeCompleted([]);
      setAnimePlanToWatch([]);
      setMangaReading([]);
      setMangaCompleted([]);
      setMangaPlanToRead([]);
      setActivities([]);

      try {
        // Fetch anime and manga watchlists in parallel
        const [animeWatchlistResult, mangaWatchlistResult] = await Promise.all([
          getUserWatchlist(userIdToFetch, 'anime'),
          getUserWatchlist(userIdToFetch, 'manga')
        ]);

        // Process anime watchlist
        if (animeWatchlistResult.success && animeWatchlistResult.watchlist) {
          // Process anime data
          // Create temporary arrays instead of multiple state updates
          const watching: ContentItem[] = [];
          const completed: ContentItem[] = [];
          const planToWatch: ContentItem[] = [];
          
          // Process watchlist data and organize by status
          animeWatchlistResult.watchlist.forEach(item => {
            const contentItem = {
              id: item.id,
              title: item.title,
              georgianTitle: item.georgian_title || item.title,
              image: item.thumbnail,
              progress: item.progress || 0,
              total: item.episodes_count,
              score: item.user_score
            };
            
            // Add to appropriate array based on status
            if (item.status === 'watching') watching.push(contentItem);
            else if (item.status === 'completed') completed.push(contentItem);
            else if (item.status === 'plan_to_watch') planToWatch.push(contentItem);
          });
          
          // Batch state updates
          setAnimeWatching(watching);
          setAnimeCompleted(completed);
          setAnimePlanToWatch(planToWatch);
        }

        // Process manga watchlist
        if (mangaWatchlistResult.success && mangaWatchlistResult.watchlist) {
          // Create temporary arrays
          const reading: ContentItem[] = [];
          const completed: ContentItem[] = [];
          const planToRead: ContentItem[] = [];
          
          // Process watchlist data and organize by status
          mangaWatchlistResult.watchlist.forEach(item => {
            const contentItem = {
              id: item.id,
              title: item.title,
              georgianTitle: item.georgian_title || item.title,
              image: item.thumbnail,
              progress: item.progress || 0,
              total: item.chapters_count,
              score: item.user_score
            };
            
            // Add to appropriate array based on status
            if (item.status === 'reading') reading.push(contentItem);
            else if (item.status === 'completed') completed.push(contentItem);
            else if (item.status === 'plan_to_read') planToRead.push(contentItem);
          });
          
          // Batch state updates
          setMangaReading(reading);
          setMangaCompleted(completed);
          setMangaPlanToRead(planToRead);
        }

        // Update stats from the watchlist data
        setStats({
          anime: {
            watching: animeWatchlistResult?.success ? 
              animeWatchlistResult?.watchlist?.filter(item => item.status === 'watching')?.length || 0 : 0,
            completed: animeWatchlistResult?.success ? 
              animeWatchlistResult?.watchlist?.filter(item => item.status === 'completed')?.length || 0 : 0,
            onHold: animeWatchlistResult?.success ? 
              animeWatchlistResult?.watchlist?.filter(item => item.status === 'on_hold')?.length || 0 : 0,
            dropped: animeWatchlistResult?.success ? 
              animeWatchlistResult?.watchlist?.filter(item => item.status === 'dropped')?.length || 0 : 0,
            planToWatch: animeWatchlistResult?.success ? 
              animeWatchlistResult?.watchlist?.filter(item => item.status === 'plan_to_watch')?.length || 0 : 0,
            meanScore: 0, // Calculate if needed
            totalEntries: animeWatchlistResult?.success ? animeWatchlistResult?.watchlist?.length || 0 : 0,
          },
          manga: {
            reading: mangaWatchlistResult?.success ? 
              mangaWatchlistResult?.watchlist?.filter(item => item.status === 'reading')?.length || 0 : 0,
            completed: mangaWatchlistResult?.success ? 
              mangaWatchlistResult?.watchlist?.filter(item => item.status === 'completed')?.length || 0 : 0,
            onHold: mangaWatchlistResult?.success ? 
              mangaWatchlistResult?.watchlist?.filter(item => item.status === 'on_hold')?.length || 0 : 0,
            dropped: mangaWatchlistResult?.success ? 
              mangaWatchlistResult?.watchlist?.filter(item => item.status === 'dropped')?.length || 0 : 0,
            planToRead: mangaWatchlistResult?.success ? 
              mangaWatchlistResult?.watchlist?.filter(item => item.status === 'plan_to_read')?.length || 0 : 0,
            meanScore: 0, // Calculate if needed
            totalEntries: mangaWatchlistResult?.success ? mangaWatchlistResult?.watchlist?.length || 0 : 0,
          }
        });

        // Local library items are specific to the logged-in user, 
        // so only merge them if viewing own profile.
        if (isOwnProfile && loggedInUser) {
          try {
            // Get local items in parallel
            const [localMangaItems, localAnimeItems] = await Promise.all([
              getLibraryItems('manga'),
              getLibraryItems('anime')
            ]);
            
            // Process local items if needed
            // ...
          } catch (localStorageError) {
              console.error('Error merging local library items:', localStorageError);
          }
        }
        
        // Generate activities from the most recent items in watchlists
        try {
          const recentActivities: ActivityItem[] = [];
          
          // Get most recent items from each list for activities
          if (animeWatchlistResult.success && animeWatchlistResult.watchlist) {
            const recentAnime = [...animeWatchlistResult.watchlist]
              .sort((a, b) => new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime())
              .slice(0, 3);
              
            recentAnime.forEach(item => {
              recentActivities.push({
                id: `anime-${item.id}`,
                type: "anime",
                action: item.status === 'watching' ? 'ნახვა' : 
                        item.status === 'completed' ? 'დასრულება' : 'დამატება',
                contentTitle: item.georgian_title || item.title,
                details: item.progress ? `${item.progress} ეპიზოდი` : '',
                timestamp: item.updated_at || new Date().toISOString()
              });
            });
          }
          
          if (mangaWatchlistResult.success && mangaWatchlistResult.watchlist) {
            const recentManga = [...mangaWatchlistResult.watchlist]
              .sort((a, b) => new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime())
              .slice(0, 3);
              
            recentManga.forEach(item => {
              recentActivities.push({
                id: `manga-${item.id}`,
                type: "manga",
                action: item.status === 'reading' ? 'კითხვა' : 
                        item.status === 'completed' ? 'დასრულება' : 'დამატება',
                contentTitle: item.georgian_title || item.title,
                details: item.progress ? `${item.progress} თავი` : '',
                timestamp: item.updated_at || new Date().toISOString()
              });
            });
          }
          
          // Sort by timestamp and take the 5 most recent activities
          setActivities(
            recentActivities
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 5)
          );
        } catch (activityError) {
          console.error("Failed to load activity data:", activityError);
        }
        
      } catch (error) {
        console.error("Error loading secondary data:", error);
        toast.error("დამატებითი მონაცემების ჩატვირთვისას მოხდა შეცდომა");
      }
    }

    // Run effect only when target profile is loaded AND auth state is resolved
    if (targetProfile && !targetProfileLoading && !authLoading) {
      loadSecondaryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetProfile?.id, targetProfileLoading, isOwnProfile, loggedInUser?.id, authLoading]); // Optimize dependencies

  // Helper function to format date (keep as is)
  // ... getTimeAgo ...

  // Handle session refresh (keep as is)
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

  // --- Render Logic --- 

  // Loading state for the target profile
  if (targetProfileLoading) {
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

  // Profile not found state
  if (profileNotFound || !targetProfile) {
      return (
         <div className="flex min-h-screen bg-black text-white">
            <AppSidebar />
            <main className="flex-1 overflow-x-hidden pl-[77px] flex items-center justify-center">
                {/* Use targetUsername in the message */} 
                <p className="text-red-500">პროფილი '{targetUsername}' ვერ მოიძებნა.</p>
            </main>
        </div>
      );
  }
  
  // Calculate age using target profile's birth date
  const age = calculateAge(targetProfile.birth_date);

  // Main component render using targetProfile data
  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden pl-[77px]">
        {/* Profile header */}
        <div className="relative mb-8">
          {/* Cover image - Added gradient and aspect ratio */}
          <div className="h-48 md:h-64 bg-gradient-to-r from-purple-900/80 via-indigo-900/70 to-blue-900/60 relative">
            {/* Optional: Add a subtle pattern or texture if desired */} 
            <div className="absolute inset-0 bg-black/30" />
          </div>

          {/* Profile info container with padding */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative -mt-16 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 pb-6 border-b border-gray-800">
              {/* Avatar - Increased size and added ring */} 
              <div className="relative flex-shrink-0">
                <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-gray-950 ring-2 ring-purple-500/50 shadow-lg">
                  <ImageSkeleton
                    src={targetProfile.avatar_url || "/placeholder.svg"}
                    alt={targetProfile.username || "მომხმარებელი"}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* User info - improved spacing */} 
              <div className="flex-1 text-center md:text-left mt-4 md:mt-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-start justify-center gap-2 md:gap-4 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-white break-words">
                     {targetProfile.first_name || targetProfile.last_name 
                        ? `${targetProfile.first_name || ''} ${targetProfile.last_name || ''}`.trim()
                        : targetProfile.username || "მომხმარებელი"}
                  </h1>
                  <div className="text-gray-400 text-lg">@{targetProfile.username}</div>
                </div>
                {/* Sub-info (Joined, Location, Age) - increased spacing */} 
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-1 text-gray-400 text-sm mt-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>შემოგვიერთდა {targetProfile.created_at ? new Date(targetProfile.created_at).toLocaleDateString('ka-GE', { month: 'long', year: 'numeric' }) : "ცოტა ხნის წინ"}</span>
                  </div>
                  {targetProfile.location && (
                    <div className="flex items-center gap-1.5">
                       <MapPinIcon className="h-4 w-4" />
                       <span>{targetProfile.location}</span>
                    </div>
                  )}
                  {age !== null && (
                    <div className="flex items-center gap-1.5">
                       <CakeIcon className="h-4 w-4" />
                       <span>{age} წლის</span>
                    </div>
                  )}
                </div>
                {/* Bio */} 
                <p className="mt-1 text-gray-300 max-w-xl mx-auto md:mx-0">{targetProfile.bio || "ბიოგრაფია არ არის დამატებული."}</p>
              </div>

              {/* Actions - Added spacing */} 
              <div className="flex gap-3 mt-4 md:mt-0 flex-shrink-0 self-center md:self-end">
                {/* Settings Button */}
                {isOwnProfile && loggedInUser && loggedInUserProfile && (
                  <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="bg-gray-800 border-gray-700 hover:bg-gray-700"
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
                        <ProfileForm 
                          userId={loggedInUser.id} // Use logged-in user ID for updates
                          initialData={{
                              id: loggedInUserProfile.id,
                              username: loggedInUserProfile.username || '',
                              avatar_url: loggedInUserProfile.avatar_url,
                              bio: loggedInUserProfile.bio || '',
                              is_public: loggedInUserProfile.is_public ?? true,
                          }}
                          onSuccess={() => {
                            setIsSettingsOpen(false);
                            toast.info("პროფილი განახლდა.");
                            // Optionally trigger a refresh of the loggedInUserProfile in Auth context
                          }} 
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                
                {/* Refresh Button */}
                {showRefreshButton && (
                    <Button 
                        variant="outline" 
                        className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                        onClick={handleRefreshSession}
                        disabled={isRefreshing}
                      >
                        სესიის განახლება
                     </Button>
                )}
                
                {/* Dropdown Menu */}
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

        {/* Stats overview - Added padding, better grid layout */} 
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-xl font-semibold mb-4 text-white">სტატისტიკა</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Anime stats - Pass stats data correctly */} 
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-5 border border-gray-800">
               {/* ... Anime stats title ... */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <StatCard
                  label="ვუყურებ"
                  value={stats?.anime?.watching ?? 0}
                  icon={<PlayCircle className="h-5 w-5 text-green-400" />}
                />
                <StatCard
                  label="დასრულებული"
                  value={stats?.anime?.completed ?? 0}
                  icon={<Check className="h-5 w-5 text-blue-400" />}
                />
                <StatCard
                  label="შეჩერებული"
                  value={stats?.anime?.onHold ?? 0}
                  icon={<PauseCircle className="h-5 w-5 text-yellow-400" />}
                />
                <StatCard
                  label="მიტოვებული"
                  value={stats?.anime?.dropped ?? 0}
                  icon={<X className="h-5 w-5 text-red-400" />}
                />
                <StatCard
                  label="სანახავი"
                  value={stats?.anime?.planToWatch ?? 0}
                  icon={<Clock className="h-5 w-5 text-purple-400" />}
                />
              </div>
              {/* ... Mean Score ... */}
            </div>

            {/* Manga stats - Pass stats data correctly */} 
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-5 border border-gray-800">
               {/* ... Manga stats title ... */}
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                 <StatCard
                   label="ვკითხულობ"
                   value={stats?.manga?.reading ?? 0}
                   icon={<BookOpen className="h-5 w-5 text-green-400" />}
                 />
                 <StatCard
                   label="დასრულებული"
                   value={stats?.manga?.completed ?? 0}
                   icon={<Check className="h-5 w-5 text-blue-400" />}
                 />
                 <StatCard
                   label="შეჩერებული"
                   value={stats?.manga?.onHold ?? 0}
                   icon={<PauseCircle className="h-5 w-5 text-yellow-400" />}
                 />
                 <StatCard
                   label="მიტოვებული"
                   value={stats?.manga?.dropped ?? 0}
                   icon={<X className="h-5 w-5 text-red-400" />}
                 />
                 <StatCard
                   label="წასაკითხი"
                   value={stats?.manga?.planToRead ?? 0}
                   icon={<Clock className="h-5 w-5 text-purple-400" />}
                 />
               </div>
               {/* ... Mean Score ... */} 
            </div>
          </div>
        </div>

        {/* Content tabs - Added container */} 
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
           {/* ... Tabs ... */} 
        </div>

      </main>
    </div>
  )
}

// Helper components (StatCard, AnimeListItem, MangaListItem, ActivityItemDisplay, Check)
// Enhance StatCard styling
function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/70 rounded-lg p-4 text-center border border-gray-700/50 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-900/30">
      <div className="flex justify-center items-center mb-2 text-gray-400">{icon}</div>
      <div className="text-2xl font-semibold text-white">{value !== undefined ? value : '-'}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  )
}

// Helper function to calculate age
function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = parseISO(birthDate);
  const today = new Date();
  const age = differenceInYears(today, birth);
  return age;
} 