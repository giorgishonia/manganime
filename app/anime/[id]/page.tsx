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
  Play
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

// Animation variants
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
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
    transition: { duration: 0.3 }
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
    <div className="flex min-h-screen bg-[#070707] text-white antialiased">
      <motion.div 
        ref={scrollRef}
        className="flex-1 min-h-screen text-white relative overflow-y-auto overflow-x-hidden"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
      {/* Background image with gradient overlay */}
        <AnimatePresence>
          {!isLoading && (
            <motion.div 
              className="fixed inset-0 z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              {/* Background image - higher quality with better cropping */}
              <div
                className="absolute inset-0 bg-cover bg-top"
                style={{ 
                  backgroundImage: `url(${processedData.bannerImage || processedData.coverImage})`,
                  filter: 'brightness(0.9) contrast(2) blur(10px)'
                }}
              />
              
              {/* Dynamic gradient overlays */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top gradient - lighter initially, gets darker on scroll */}
                <div 
                  className="absolute inset-0 bg-gradient-to-b from-[#070707]/30 via-[#070707]/60 to-[#070707]"
                  style={{ opacity: topGradientOpacity }}
                />
                
                {/* Always present bottom and side gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/90 to-transparent" />
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-[#070707]/80 via-[#070707]/40 to-transparent"
                  style={{ opacity: sideGradientOpacity }}
                />
                <div 
                  className="absolute inset-0 bg-gradient-to-l from-[#070707]/80 via-[#070707]/40 to-transparent"
                  style={{ opacity: sideGradientOpacity }}
                />
                
                {/* New: Full overlay that becomes visible when scrolling */}
                <div 
                  className="absolute inset-0 bg-[#070707]/90 transition-opacity duration-300"
                  style={{ opacity: fullOverlayOpacity }}
                />
                
                {/* Left side vertical gradient */}
                <div className="absolute left-0 top-0 h-full w-48 bg-gradient-to-r from-[#070707] via-[#070707]/50 to-transparent z-10" />
                
                {/* Subtle texture overlay for more depth */}
                <div className="absolute inset-0 opacity-30" 
                  style={{ 
                    backgroundImage: 'url("/noise-texture.png")',
                    backgroundRepeat: 'repeat',
                    mixBlendMode: 'overlay'
                  }} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-6 pb-20 pl-[100px]">
              {/* Back button */}
              <motion.button 
                onClick={handleBackClick} 
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ x: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="h-5 w-5" />
            <span>{isPlayerOpen ? "Back to details" : "Back"}</span>
              </motion.button>

              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DetailViewSkeleton />
                  </motion.div>
            ) : isPlayerOpen ? (
              <motion.div
                key="player"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">
                      {processedData.title}: {processedData.episodeList[selectedEpisode].title}
                    </h2>
                    <span className="text-gray-400">{processedData.episodeList[selectedEpisode].releaseDate}</span>
                  </div>
                </div>

                <VideoPlayer
                  episode={processedData.episodeList[selectedEpisode]}
                  onClose={() => setIsPlayerOpen(false)}
                  episodeList={processedData.episodeList}
                  onEpisodeSelect={setSelectedEpisode}
                />

                <div className="mt-6">
                  <EpisodeList
                    episodes={processedData.episodeList}
                    currentEpisode={selectedEpisode}
                    onSelectEpisode={setSelectedEpisode}
                  />
                </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="details"
                    variants={sectionVariants}
                    initial="initial"
                    animate="animate"
                    exit={{ opacity: 0 }}
                  >
                {/* Anime header */}
                <motion.div 
                  className="flex flex-col md:flex-row gap-6 mb-8"
                        variants={itemVariants}
                      >
                  {/* Cover image */}
                          <motion.div 
                    className="w-full md:w-64 flex-shrink-0"
                    whileHover={{ scale: 1.03 }}
                            transition={{ duration: 0.3 }}
                          >
                            <ImageSkeleton
                              src={processedData.coverImage || "/placeholder.svg"}
                              alt={processedData.title}
                      className="w-full aspect-[2/3] rounded-lg overflow-hidden"
                            />
                          </motion.div>
                          
                  {/* Details */}
                  <div className="flex-1">
                    <motion.h1 
                      className="text-3xl font-bold mb-1"
                      variants={itemVariants}
                    >
                      {processedData.georgianTitle || processedData.title}
                    </motion.h1>
                    
                    {(processedData.georgianTitle ? processedData.title : processedData.subtitle) && (
                      <motion.h2 
                        className="text-xl text-gray-400 mb-4"
                        variants={itemVariants}
                      >
                        {processedData.georgianTitle ? processedData.title : processedData.subtitle}
                      </motion.h2>
                    )}

                    <motion.div 
                      className="flex items-center gap-4 mb-4"
                      variants={itemVariants}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-gray-400" />
                        <span>{processedData.releaseDate}</span>
                            </div>
                      <div className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm">
                                {processedData.status}
                            </div>
                      {processedData.season && (
                        <div className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm">
                          {processedData.season}
                            </div>
                      )}
                    </motion.div>

                    <motion.div 
                      className="grid grid-cols-2 gap-4 mb-4"
                      variants={itemVariants}
                    >
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span>{processedData.rating ? `${processedData.rating.toFixed(1)}/10` : "No rating"}</span>
                                </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{processedData.episodes} episodes</span>
                                </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{processedData.studios}</span>
                              </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {processedData.genres.slice(0, 3).map((genre: string, index: number) => (
                          <span key={index} className="px-2 py-0.5 bg-white/10 rounded-full text-xs">
                            {genre}
                          </span>
                        ))}
                        </div>
                      </motion.div>

                    <motion.p 
                      className="text-gray-300 mb-6"
                      variants={itemVariants}
                    >
                            {processedData.synopsis}
                    </motion.p>

                    <motion.div 
                      className="flex gap-3"
                      variants={itemVariants}
                    >
                            <motion.button
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md flex items-center gap-2"
                        onClick={() => handleWatchClick(0)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Play className="h-4 w-4" />
                              Watch now
                            </motion.button>
                      
                      {/* Library Status Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <motion.button
                            className={cn(
                              "px-3 py-2 border rounded-md flex items-center gap-2 transition-all",
                              libraryStatus 
                                ? "bg-black/40 border-white/20 hover:border-white/30" 
                                : "bg-black/30 border-gray-700 hover:border-gray-500"
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <span className={statusInfo.color}>{statusInfo.icon}</span>
                            <span className="hidden md:inline">{statusInfo.label}</span>
                          </motion.button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48 bg-gray-900/95 backdrop-blur-md border-white/10">
                          <DropdownMenuItem 
                            className={libraryStatus === 'reading' ? "bg-green-900/20 text-green-400" : ""} 
                            onClick={() => handleStatusChange('reading')}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            <span>Watching</span>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            className={libraryStatus === 'plan_to_read' ? "bg-purple-900/20 text-purple-400" : ""} 
                            onClick={() => handleStatusChange('plan_to_read')}
                          >
                            <Bookmark className="mr-2 h-4 w-4" />
                            <span>Plan to Watch</span>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            className={libraryStatus === 'completed' ? "bg-blue-900/20 text-blue-400" : ""} 
                            onClick={() => handleStatusChange('completed')}
                          >
                            <CheckCheck className="mr-2 h-4 w-4" />
                            <span>Completed</span>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            className={libraryStatus === 'on_hold' ? "bg-yellow-900/20 text-yellow-400" : ""} 
                            onClick={() => handleStatusChange('on_hold')}
                          >
                            <PauseCircle className="mr-2 h-4 w-4" />
                            <span>On Hold</span>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            className={libraryStatus === 'dropped' ? "bg-red-900/20 text-red-400" : ""} 
                            onClick={() => handleStatusChange('dropped')}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            <span>Dropped</span>
                          </DropdownMenuItem>

                          {libraryStatus && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-gray-400"
                                onClick={() => {
                                  setLibraryStatus(null);
                                  updateItemStatus(animeId, 'anime', 'plan_to_read', '', '', 0);
                                }}
                              >
                                <X className="mr-2 h-4 w-4" />
                                <span>Remove from Library</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
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
                        </motion.div>

                {/* Episodes */}
                <motion.section 
                  className="mb-8"
                  variants={sectionVariants}
                >
                  <motion.h2 
                    className="text-2xl font-bold mb-4"
                    variants={itemVariants}
                  >
                    Episodes
                  </motion.h2>
                  <EpisodeList
                    episodes={processedData.episodeList}
                    onSelectEpisode={(index) => handleWatchClick(index)}
                  />
                </motion.section>

                {/* Characters section */}
                <CharacterSection 
                  characters={processedData.characters} 
                  sectionVariants={sectionVariants}
                  itemVariants={itemVariants}
                  showEmpty={true}
                  contentId={animeId}
                />

                        {/* Related anime */}
                        {processedData.relations.length > 0 && (
                  <motion.section 
                    className="mb-8"
                    variants={sectionVariants}
                  >
                    <motion.h2 
                      className="text-2xl font-bold mb-4"
                      variants={itemVariants}
                    >
                      Related content
                    </motion.h2>
                            <RelatedContent items={processedData.relations} />
                  </motion.section>
                        )}

                        {/* Recommendations */}
                        {processedData.recommendations.length > 0 && (
                  <motion.section
                    variants={sectionVariants}
                  >
                    <motion.h2 
                      className="text-2xl font-bold mb-4"
                      variants={itemVariants}
                    >
                              You might also like
                    </motion.h2>
                            <RecommendedContent items={processedData.recommendations} />
                  </motion.section>
                )}
                
                {/* Comments section */}
                <CommentSection 
                  contentId={animeId}
                  contentType="anime"
                  sectionVariants={sectionVariants}
                  itemVariants={itemVariants}
                />
                  </motion.div>
                )}
              </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
