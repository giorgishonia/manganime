"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Star, 
  CalendarDays, 
  Clock, 
  ChevronRight,
  Bookmark,
  Download,
  Share,
  Users, 
  Info,
  BookOpen, 
  CheckCheck,
  PauseCircle,
  XCircle,
  X,
  Plus,
  Play,
  Bell,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VideoPlayer } from '@/components/video-player'
import { ImageSkeleton } from '@/components/image-skeleton'
import { RelatedContent } from '@/components/related-content'
import { RecommendedContent } from '@/components/recommended-content'
import { EpisodeList } from '@/components/episode-list'
import { DetailViewSkeleton } from '@/components/ui/skeleton'
import { getAnimeById, stripHtml, formatStatus } from '@/lib/anilist'
import { getContentById } from '@/lib/content'
import { CharacterSection } from "@/components/character-section"
import { CommentSection } from "@/components/comment-section"
import { MediaStatus, MediaType, getLibraryItem, getLibraryItemSync, hasStatus, hasStatusSync, updateItemStatus } from '@/lib/user-library'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/use-toast'
import { LibraryStatusButton } from '@/components/library-status-button'
import { useAuth } from '@/components/supabase-auth-provider'

// Animation variants
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

const sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
  }
};

interface Episode {
  number: number
  title: string
  thumbnail: string
  releaseDate: string
  description?: string
  videoUrl?: string
  duration?: number
  watched?: boolean
  aired?: string
}

export default function AnimePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  // Fix for Next.js params access - use React.use() to properly unwrap
  const unwrappedParams = React.use(params as any) as { id: string }
  const animeId = unwrappedParams.id
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [animeData, setAnimeData] = useState<any>(null)
  const [isFromDatabase, setIsFromDatabase] = useState(false)
  const [libraryStatus, setLibraryStatus] = useState<MediaStatus | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSubProcessing, setIsSubProcessing] = useState(false)
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const userId = user?.id

  // Handle scroll effect for background
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const position = scrollRef.current.scrollTop
        setScrollPosition(position)
      }
    }

    const currentScrollRef = scrollRef.current
    if (currentScrollRef) {
      currentScrollRef.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      if (currentScrollRef) {
        currentScrollRef.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  // Fetch anime data from database first, then fallback to AniList API
  useEffect(() => {
    async function fetchAnimeData() {
      try {
        // First, try to get the content from our database
        const dbResult = await getContentById(animeId);
        
        if (dbResult.success && dbResult.content && dbResult.content.type === 'anime') {
          console.log("Found anime in database:", dbResult.content);
          // Database content found, format it for our UI
          setAnimeData(formatDatabaseContent(dbResult.content));
          setIsFromDatabase(true);
        } else {
          // If not found in database, try AniList
          try {
            console.log("Anime not found in database, fetching from AniList API");
            const anilistData = await getAnimeById(animeId);
            console.log("AniList data received:", anilistData ? "Data found" : "No data");
            if (anilistData) {
              console.log("AniList data structure check:", {
                hasRecommendations: !!anilistData.recommendations,
                recCount: anilistData.recommendations?.nodes?.length,
                hasRelations: !!anilistData.relations,
                relCount: anilistData.relations?.edges?.length,
                hasCharacters: !!anilistData.characters,
                charCount: anilistData.characters?.nodes?.length,
                score: anilistData.averageScore
              });
            }
            setAnimeData(anilistData);
          } catch (anilistError) {
            console.error("Error fetching from AniList:", anilistError);
            throw anilistError; // Re-throw to trigger the not found state
          }
        }
      } catch (error) {
        console.error("Error fetching anime data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnimeData();
  }, [animeId]);

  // Generate mock episodes with better data
  const generateMockEpisodes = (count: number) => {
    const coverImage = animeData.coverImage?.large || "/placeholder.svg";
    const animeTitle = animeData.title?.english || animeData.title?.romaji || "Anime";
    
    return Array.from({ length: count }, (_, i) => {
      const epNumber = i + 1;
      // Calculate release date: one week apart, starting from the most recent
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() - ((count - i) * 7));
      
      return {
        number: epNumber,
        title: `Episode ${epNumber}${epNumber < 10 ? " - " + animeTitle + " Beginning" : ""}`,
        thumbnail: coverImage,
        releaseDate: releaseDate.toLocaleDateString(),
        description: `Episode ${epNumber} of ${animeTitle}`,
        videoUrl: "https://example.com/video.mp4", // Placeholder
        duration: Math.floor(Math.random() * 6) + 20, // Random duration between 20-25 minutes
        watched: false,
        aired: releaseDate.toLocaleDateString() // Add aired property for compatibility
      };
    });
  };

  // Process data for UI if available
  const processedData = animeData ? {
    id: animeData.id,
    title: animeData.title?.english || animeData.title?.romaji || "Unknown Title",
    subtitle: animeData.title?.native,
    georgianTitle: isFromDatabase ? animeData.georgian_title : null,
    coverImage: animeData.coverImage?.large || "/placeholder.svg",
    bannerImage: animeData.bannerImage || animeData.coverImage?.large || "/placeholder.svg",
    // Fix release date format and add fallback - only display year
    releaseDate: animeData.startDate && animeData.startDate.year 
      ? `${animeData.startDate.year}`
      : "Unknown",
    status: formatStatus(animeData.status || ""),
    season: animeData.season ? `${animeData.season} ${animeData.seasonYear}` : null,
    episodes: animeData.episodes || "?",
    nextEpisode: animeData.nextAiringEpisode ? {
      episode: animeData.nextAiringEpisode.episode,
      timeUntilAiring: animeData.nextAiringEpisode.timeUntilAiring,
      airingAt: animeData.nextAiringEpisode.airingAt,
    } : null,
    // Fix the rating calculation - ensure it's a valid number
    rating: animeData.averageScore ? Math.max(0, Math.min(10, animeData.averageScore / 10)) : null,
    popularity: animeData.popularity || 0,
    genres: animeData.genres || [],
    studios: animeData.studios?.nodes?.map((studio: any) => studio.name).join(', ') || "Unknown",
    synopsis: isFromDatabase ? animeData.description : stripHtml(animeData.description || "No description available"),
    episodeList: generateMockEpisodes(animeData.episodes || 12),
    // Fix the relations mapping to handle edge cases better
    relations: animeData.relations?.edges?.filter((edge: any) => edge?.node && edge?.node?.id)
      .map((relation: any) => ({
        id: relation.node.id,
        title: relation.node.title?.english || relation.node.title?.romaji || "Unknown",
        type: relation.relationType || "RELATED",
        year: relation.node.startDate?.year || "Unknown",
        image: relation.node.coverImage?.large || relation.node.coverImage?.medium || "/placeholder.svg",
      })) || [],
    // Fix the recommendations mapping to handle edge cases better
    recommendations: animeData.recommendations?.nodes?.filter((node: any) => node?.mediaRecommendation && node?.mediaRecommendation?.id)
      .map((rec: any) => ({
        id: rec.mediaRecommendation.id,
        title: rec.mediaRecommendation.title?.english || rec.mediaRecommendation.title?.romaji || "Unknown",
        year: rec.mediaRecommendation.startDate?.year || "Unknown",
        image: rec.mediaRecommendation.coverImage?.large || rec.mediaRecommendation.coverImage?.medium || "/placeholder.svg",
        genres: rec.mediaRecommendation.genres || [],
      })) || [],
    // Fix the characters mapping to handle edge cases better
    characters: animeData.characters?.nodes?.filter((node: any) => node?.id && node?.name)
      .map((character: any, index: number) => {
        // Find the edge matching this character to get its role
        const edge = animeData.characters?.edges?.find((e: any) => e.node?.id === character.id);
        return {
          id: character.id,
          name: character.name?.full || "Unknown",
          image: character.image?.large || "/placeholder-character.jpg",
          role: edge?.role || "SUPPORTING"
        };
      }) || [],
  } : null;
  
  // Check library status when anime data is loaded
  useEffect(() => {
    async function checkLibraryStatus() {
      if (animeId && processedData) {
        try {
          const item = await getLibraryItem(animeId, 'anime');
          if (item) {
            setLibraryStatus(item.status);
          } else {
            setLibraryStatus(null);
          }
        } catch (error) {
          console.error("Error checking library status:", error);
          // Fallback to sync check for immediate feedback
          const item = getLibraryItemSync(animeId, 'anime');
          if (item) {
            setLibraryStatus(item.status);
          } else {
            setLibraryStatus(null);
          }
        }
      }
    }
    
    checkLibraryStatus();
  }, [animeId, processedData]);

  // Check subscription status when anime data and user ID are available
  useEffect(() => {
    async function checkSub() {
      if (animeId && userId) {
        // Conceptual: Call checkSubscription
        // const { success, subscribed } = await checkSubscription(userId, animeId);
        const success = true; // Placeholder
        const subscribed = false; // Placeholder
        if (success) {
          setIsSubscribed(subscribed);
        }
      }
    }
    checkSub();
  }, [animeId, userId]);

  // Add this function to extract characters from alternative_titles
  function extractCharactersFromAlternativeTitles(content: any) {
    if (!content.alternative_titles || !Array.isArray(content.alternative_titles)) {
      return [];
    }
    
    const characterEntries = content.alternative_titles.filter((entry: string) => 
      typeof entry === 'string' && entry.startsWith('character:')
    );
    
    if (characterEntries.length === 0) {
      return [];
    }
    
    console.log(`Found ${characterEntries.length} characters in alternative_titles`);
    
    try {
      const extractedCharacters = characterEntries.map((entry: string) => {
        // Extract the JSON part after "character:"
        const jsonStr = entry.substring(10); // 'character:'.length = 10
        const charData = JSON.parse(jsonStr);
        return {
          id: charData.id,
          name: charData.name,
          image: charData.image,
          role: charData.role || 'SUPPORTING'
        };
      });
      console.log(`Successfully extracted ${extractedCharacters.length} characters`);
      return extractedCharacters;
    } catch (err) {
      console.error('Error extracting characters from alternative_titles:', err);
      return [];
    }
  }

  // Helper function to extract Georgian title from alternative_titles
  function extractGeorgianTitle(content: any) {
    if (!content.alternative_titles || !Array.isArray(content.alternative_titles)) {
      return null;
    }
    
    const georgianEntry = content.alternative_titles.find((entry: string) => 
      typeof entry === 'string' && entry.startsWith('georgian:')
    );
    
    if (georgianEntry) {
      return georgianEntry.substring(9); // 'georgian:'.length = 9
    }
    
    return null;
  }

  // Helper function to extract release year from release_date
  function extractReleaseYear(content: any) {
    // First try the direct release_year field that might be extracted from alternative_titles
    if (content.release_year !== undefined && content.release_year !== null) {
      const year = parseInt(content.release_year.toString(), 10);
      if (!isNaN(year)) {
        console.log(`Using explicit release_year: ${year}`);
        return year;
      }
    }
    
    // Fall back to parsing from release_date string
    if (content.release_date && typeof content.release_date === 'string') {
      // Try to parse the year from the string
      const yearMatch = content.release_date.match(/\d{4}/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0], 10);
        console.log(`Extracted year ${year} from release_date`);
        return year;
      }
    }
    
    console.log('No valid release year found');
    return null;
  }

  // Enhance formatDatabaseContent to use our character extraction
  const formatDatabaseContent = (content: any) => {
    console.log("Formatting database content for anime:", content);
    
    // Extract characters from alternative_titles if they exist
    const extractedCharacters = extractCharactersFromAlternativeTitles(content);
    
    // Extract release date details for logging
    const releaseYear = content.release_year || null;
    const releaseMonth = content.release_month || null;
    const releaseDay = content.release_day || null;
    
    console.log("Release date information:", { 
      year: releaseYear, 
      month: releaseMonth, 
      day: releaseDay 
    });

    // Return content in a format that matches what the UI expects
    return {
      id: content.id,
      title: {
        english: content.title,
        romaji: content.title,
        native: extractGeorgianTitle(content) || content.alternative_titles?.[0] || content.title,
      },
      description: content.description,
      coverImage: {
        large: content.thumbnail,
        extraLarge: content.thumbnail,
      },
      bannerImage: content.thumbnail, // Use thumbnail as banner as a fallback
      status: content.status.toUpperCase(),
      averageScore: typeof content.rating === 'number' ? content.rating * 10 : 70, // Convert 0-10 to 0-100
      popularity: content.popularity || 0,
      genres: content.genres || [],
      startDate: {
        year: releaseYear !== null ? parseInt(releaseYear) : extractReleaseYear(content) || new Date().getFullYear(),
        month: releaseMonth !== null ? parseInt(releaseMonth) : 1,
        day: releaseDay !== null ? parseInt(releaseDay) : 1,
      },
      episodes: content.episodes || 12, // Default value
      nextAiringEpisode: null,
      season: content.season || null,
      seasonYear: releaseYear !== null ? parseInt(releaseYear) : extractReleaseYear(content) || new Date().getFullYear(),
      // Add relation and recommendation objects with appropriate structure
      relations: { 
        edges: content.relations?.map((rel: any) => ({
          relationType: rel.type || "RELATED",
          node: {
            id: rel.id,
            title: {
              romaji: rel.title,
              english: rel.title
            },
            coverImage: {
              large: rel.image
            },
            startDate: {
              year: rel.year
            }
          }
        })) || [] 
      },
      recommendations: { 
        nodes: content.recommendations?.map((rec: any) => ({
          mediaRecommendation: {
            id: rec.id,
            title: {
              romaji: rec.title,
              english: rec.title
            },
            coverImage: {
              large: rec.image
            },
            startDate: {
              year: rec.year
            },
            genres: rec.genres || []
          }
        })) || [] 
      },
      characters: extractedCharacters.length > 0 ? { 
        nodes: extractedCharacters.map((char: any) => ({
          id: char.id,
          name: {
            full: char.name
          },
          image: {
            large: char.image
          }
        })),
        edges: extractedCharacters.map((char: any) => ({
          role: char.role,
          node: {
            id: char.id
          }
        }))
      } : { 
        nodes: [], 
        edges: [] 
      },
      studios: { 
        nodes: content.studios?.map((studio: any) => ({
          name: studio.name
        })) || [] 
      }
    };
  };

  const handleBackClick = () => {
    if (isPlayerOpen) {
      setIsPlayerOpen(false)
    } else {
      router.back()
    }
  }

  const handleWatchClick = (episodeIndex = 0) => {
    setSelectedEpisode(episodeIndex)
    setIsPlayerOpen(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Add debug logging for troubleshooting
  useEffect(() => {
    if (processedData) {
      console.log("Processed anime data:", {
        title: processedData.title,
        hasRelations: processedData.relations && processedData.relations.length > 0,
        relationsCount: processedData.relations?.length || 0,
        hasRecommendations: processedData.recommendations && processedData.recommendations.length > 0,
        recommendationsCount: processedData.recommendations?.length || 0,
        hasCharacters: processedData.characters && processedData.characters.length > 0,
        charactersCount: processedData.characters?.length || 0,
        rating: processedData.rating,
        releaseDate: processedData.releaseDate
      });
    }
  }, [processedData]);

  const handleStatusChange = async (status: MediaStatus) => {
    if (!processedData) return;
    
    // Get total episodes as a number for progress tracking
    const totalEpisodes = typeof processedData.episodes === 'number' 
      ? processedData.episodes 
      : processedData.episodeList?.length || 0;
    
    // Get current progress - could add actual tracking in the future
    const progress = 0; // For now, initialize at 0
    
    try {
      await updateItemStatus(
        animeId, 
        'anime', 
        status, 
        processedData.title, 
        processedData.coverImage,
        progress,
        totalEpisodes
      );
      
      setLibraryStatus(status);
      
      toast({
        title: "Status Updated",
        description: `"${processedData.title}" marked as ${status.replace('_', ' ')}`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        duration: 3000,
      });
    }
  };

  // Get status icon and color for anime
  const getStatusInfo = (status: MediaStatus | null) => {
    switch (status) {
      case 'reading': // Used as "watching" for anime
        return { icon: <Play className="h-5 w-5" />, label: 'Watching', color: 'text-green-500' };
      case 'completed':
        return { icon: <CheckCheck className="h-5 w-5" />, label: 'Completed', color: 'text-blue-500' };
      case 'on_hold':
        return { icon: <PauseCircle className="h-5 w-5" />, label: 'On Hold', color: 'text-yellow-500' };
      case 'dropped':
        return { icon: <XCircle className="h-5 w-5" />, label: 'Dropped', color: 'text-red-500' };
      case 'plan_to_read': // Used as "plan to watch" for anime
        return { icon: <Bookmark className="h-5 w-5" />, label: 'Plan to Watch', color: 'text-purple-500' };
      default:
        return { icon: <Plus className="h-5 w-5" />, label: 'Add to Library', color: 'text-gray-400' };
    }
  };

  const statusInfo = getStatusInfo(libraryStatus);

  // Handle the "Watch Now" button click - automatically select the first episode
  const handleWatchNowClick = () => {
    handleWatchClick(0);
  };

  // Handle subscription toggle
  const handleToggleSubscription = async () => {
    if (!isAuthenticated || !userId) {
      toast({ title: "Please log in to subscribe.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (!processedData) return;

    setIsSubProcessing(true);
    const originalSubscribed = isSubscribed;

    // Optimistic update
    setIsSubscribed(!originalSubscribed);

    try {
      // Conceptual: Call backend toggle function
      // const { success, subscribed, error } = await toggleSubscription(userId, animeId);
      const success = true; // Placeholder
      const subscribed = !originalSubscribed; // Placeholder
      const error = null; // Placeholder

      if (!success) {
        setIsSubscribed(originalSubscribed); // Revert optimistic update
        toast({ title: "Failed to update subscription", description: error?.message, variant: "destructive" });
      } else {
        setIsSubscribed(subscribed); // Confirm state
        toast({ title: subscribed ? "Subscribed!" : "Unsubscribed", description: `You will ${subscribed ? 'now' : 'no longer'} receive notifications for ${processedData.title}.` });
      }
    } catch (err) {
      setIsSubscribed(originalSubscribed); // Revert on error
      toast({ title: "Error updating subscription", variant: "destructive" });
      console.error("Subscription toggle error:", err);
    } finally {
      setIsSubProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="w-12 h-12 rounded-full border-4 border-t-purple-500 border-r-purple-500 border-b-purple-300 border-l-purple-300 animate-spin"></div>
      </div>
    );
  }

  if (!processedData) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Anime not found</h1>
          <button onClick={() => router.back()} className="px-4 py-2 bg-purple-600 rounded-md">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Calculate gradient opacity based on scroll
  const topGradientOpacity = Math.min(0.7, scrollPosition / 500)
  const sideGradientOpacity = Math.min(0.6, 0.3 + (scrollPosition / 800))
  // New full overlay opacity that increases more aggressively with scroll
  const fullOverlayOpacity = Math.min(0.9, scrollPosition / 300)

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background to-background/95">
      {isLoading ? (
        <DetailViewSkeleton />
      ) : (
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative"
        >
          {/* Back button with better positioning */}
          <motion.button
            variants={itemVariants}
            className="fixed top-4 left-4 z-50 bg-black/50 hover:bg-black/70 backdrop-blur-sm p-2 rounded-full transition-colors"
            onClick={handleBackClick}
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>

          {isPlayerOpen ? (
            <motion.div
              key="player"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-screen flex items-center justify-center bg-black"
            >
              <VideoPlayer
                url={processedData?.episodeList[selectedEpisode].videoUrl || ""}
                title={`${processedData?.title} - Episode ${processedData?.episodeList[selectedEpisode].number}`}
                onClose={() => setIsPlayerOpen(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              ref={scrollRef}
              className="h-screen overflow-y-auto pb-12"
              key="animeDetails"
            >
              {/* Hero section with banner image and overlay */}
              <div className="relative w-full h-[500px] lg:h-[600px]">
                <div
                  className="absolute inset-0 bg-cover bg-center brightness-[0.6]"
                  style={{
                    backgroundImage: `url(${processedData?.bannerImage})`,
                    backgroundPosition: `center ${Math.min(scrollPosition * 0.2, 100)}px`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-[url('/noise-texture.png')] opacity-[0.03]"></div>

                {/* Hero content */}
                <motion.div
                  variants={sectionVariants}
                  initial="initial"
                  animate="animate"
                  className="absolute bottom-0 left-0 right-0 px-6 md:px-12 pb-12 z-10"
                >
                  <div className="flex flex-col md:flex-row items-end gap-6 max-w-6xl mx-auto">
                    {/* Cover image */}
                    <motion.div
                      variants={itemVariants}
                      className="hidden md:block w-44 h-64 rounded-lg overflow-hidden shadow-2xl relative border-2 border-white/10"
                      whileHover={{ scale: 1.03 }}
                    >
                      <ImageSkeleton
                        src={processedData?.coverImage}
                        alt={processedData?.title}
                        className="object-cover w-full h-full"
                      />
                    </motion.div>

                    {/* Anime details */}
                    <div className="flex-1">
                      <motion.h1
                        variants={itemVariants}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold mb-1"
                      >
                        {processedData?.georgianTitle || processedData?.title}
                      </motion.h1>

                      {processedData?.subtitle && (
                        <motion.h2
                          variants={itemVariants}
                          className="text-xl text-white/70 mb-3"
                        >
                          {processedData?.subtitle}
                        </motion.h2>
                      )}

                      <motion.div
                        variants={itemVariants}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5 text-sm"
                      >
                        {processedData?.releaseDate && (
                          <div className="flex items-center gap-1.5 text-white/70">
                            <CalendarDays className="h-3.5 w-3.5 text-primary/80" />
                            <span>{processedData.releaseDate}</span>
                          </div>
                        )}
                        {processedData?.status && (
                          <div className="flex items-center gap-1.5 text-white/70">
                            <Clock className="h-3.5 w-3.5 text-primary/80" />
                            <span>{processedData.status}</span>
                          </div>
                        )}
                        {processedData?.episodes && (
                          <div className="flex items-center gap-1.5 text-white/70">
                            <Play className="h-3.5 w-3.5 text-primary/80" />
                            <span>{processedData.episodes} episodes</span>
                          </div>
                        )}
                        {processedData?.rating && (
                          <div className="flex items-center gap-1.5 text-yellow-400">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            <span className="font-medium">{processedData.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        className="flex flex-wrap gap-2 mb-5"
                      >
                        {processedData?.genres.map((genre) => (
                          <span
                            key={genre}
                            className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                          >
                            {genre}
                          </span>
                        ))}
                      </motion.div>

                      <motion.div 
                        className="flex gap-3"
                        variants={itemVariants}
                      >
                        <motion.button
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md flex items-center gap-2"
                          onClick={handleWatchNowClick}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Play className="h-4 w-4" />
                          Watch now
                        </motion.button>
                      
                        {/* Library Status Dropdown */}
                        <LibraryStatusButton 
                          id={animeId}
                          type={MediaType.ANIME}
                          currentStatus={libraryStatus}
                          onStatusChange={handleStatusChange}
                        />
                        
                        {/* Subscribe Button */}
                        <motion.button
                          className={cn(
                            "p-2 border rounded-md transition-colors flex items-center gap-1.5 text-sm",
                            isSubscribed 
                              ? "bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30"
                              : "text-gray-300 hover:text-white border-gray-700 hover:border-gray-500 hover:bg-white/5"
                          )}
                          onClick={handleToggleSubscription}
                          disabled={isSubProcessing}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title={isSubscribed ? "Unsubscribe from new episode notifications" : "Subscribe to new episode notifications"}
                        >
                          {isSubProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isSubscribed ? (
                            <Bell className="h-4 w-4" />
                          ) : (
                            <Bell className="h-4 w-4" />
                          )}
                          <span>{isSubscribed ? "Subscribed" : "Subscribe"}</span>
                        </motion.button>
                        
                        <motion.button
                          className="p-2 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Download className="h-4 w-4" />
                        </motion.button>
                        
                        <motion.button
                          className="p-2 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Share className="h-4 w-4" />
                        </motion.button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Main content */}
              <div className="px-6 md:px-12 max-w-6xl mx-auto">
                <motion.div
                  variants={sectionVariants}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8 mt-8"
                >
                  {/* Left column */}
                  <div className="space-y-10">
                    {/* Synopsis section */}
                    <motion.section variants={itemVariants}>
                      <h2 className="text-2xl font-bold mb-4 flex items-center">
                        <ChevronRight className="mr-2 h-5 w-5 text-primary/80" />
                        Synopsis
                      </h2>
                      <div className="bg-white/5 rounded-xl p-6">
                        <p className="text-white/80 leading-relaxed">
                          {processedData?.synopsis}
                        </p>
                      </div>
                    </motion.section>

                    {/* Episode list section */}
                    <motion.section
                      variants={itemVariants}
                      className="mb-8"
                    >
                      <h2 className="text-2xl font-bold mb-4 flex items-center">
                        <ChevronRight className="mr-2 h-5 w-5 text-primary/80" />
                        Episodes
                        <span className="ml-2 text-sm font-normal text-white/60">
                          ({processedData?.episodeList.length || 0} episodes)
                        </span>
                      </h2>
                      <div className="bg-white/5 rounded-xl p-6">
                        <div className="grid gap-4">
                          {processedData?.episodeList.map((episode, index) => (
                            <motion.div
                              key={episode.number}
                              className={cn(
                                "bg-white/5 hover:bg-white/10 rounded-lg overflow-hidden cursor-pointer transition-colors",
                                selectedEpisode === index && "ring-2 ring-primary/80"
                              )}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => handleWatchClick(index)}
                            >
                              <div className="flex flex-col sm:flex-row">
                                <div className="w-full sm:w-32 aspect-video relative flex-shrink-0">
                                  <ImageSkeleton
                                    src={episode.thumbnail}
                                    alt={`Episode ${episode.number}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs font-medium">
                                    Ep {episode.number}
                                  </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col justify-between">
                                  <div>
                                    <h3 className="font-medium text-sm mb-1">
                                      {episode.title}
                                    </h3>
                                    {episode.description && (
                                      <p className="text-white/60 text-xs line-clamp-2 mb-2">
                                        {episode.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-white/50 text-xs">
                                      {episode.aired || episode.releaseDate}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {episode.duration && (
                                        <span className="text-white/50 text-xs">
                                          {episode.duration} min
                                        </span>
                                      )}
                                      <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                      >
                                        <Play className="h-4 w-4 text-primary/80" />
                                      </motion.div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.section>

                    {/* Characters section */}
                    {processedData?.characters && processedData.characters.length > 0 && (
                      <motion.section
                        variants={itemVariants}
                        className="mb-8"
                      >
                        <h2 className="text-2xl font-bold mb-4 flex items-center">
                          <ChevronRight className="mr-2 h-5 w-5 text-primary/80" />
                          Characters
                        </h2>
                        <CharacterSection characters={processedData.characters} />
                      </motion.section>
                    )}

                    {/* Comment section */}
                    <motion.section
                      variants={itemVariants}
                      className="mb-8"
                    >
                      <h2 className="text-2xl font-bold mb-4 flex items-center">
                        <ChevronRight className="mr-2 h-5 w-5 text-primary/80" />
                        Comments
                      </h2>
                      <CommentSection contentId={animeId} contentType="anime" />
                    </motion.section>
                  </div>

                  {/* Right sidebar */}
                  <div>
                    {/* Related content section */}
                    {processedData?.relations && processedData.relations.length > 0 && (
                      <motion.section
                        variants={itemVariants}
                        className="mb-8"
                      >
                        <h2 className="text-xl font-bold mb-4 flex items-center">
                          <ChevronRight className="mr-2 h-5 w-5 text-primary/80" />
                          Related
                        </h2>
                        <div className="space-y-3">
                          <RelatedContent items={processedData.relations} />
                        </div>
                      </motion.section>
                    )}

                    {/* Recommendations section */}
                    {processedData?.recommendations && processedData.recommendations.length > 0 && (
                      <motion.section
                        variants={itemVariants}
                        className="mb-8"
                      >
                        <h2 className="text-xl font-bold mb-4 flex items-center">
                          <ChevronRight className="mr-2 h-5 w-5 text-primary/80" />
                          Recommended
                        </h2>
                        <div className="space-y-3">
                          <RecommendedContent items={processedData.recommendations} />
                        </div>
                      </motion.section>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )
}
