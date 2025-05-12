"use client"

import { useState, useEffect } from "react"
import { motion as m, AnimatePresence } from "framer-motion"
import { ChevronRight, Search, Play, Plus, Star, CalendarDays, Clock, Info, ArrowRight, TrendingUp, BookOpen, Calendar, Heart, Book } from "lucide-react"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { ContentCardHover } from "@/components/content-card-hover"
import { TypewriterText } from "@/components/typewriter-text"
import { MangaView } from "@/components/manga-view"
import { AnimeView } from "@/components/anime-view"
import { getAllContent } from "@/lib/content"
import { BannerSkeleton, CategorySkeleton, CarouselSkeleton } from "@/components/ui/skeleton"
import { ImageSkeleton } from "@/components/image-skeleton"

// Define interface for content data from our database
interface ContentData {
  id: string
  title: string
  description: string | null
  thumbnail: string
  bannerImage?: string
  rating?: number
  status: string
  genres: string[]
  type: 'anime' | 'manga' | 'comics'
  release_year?: number
  season?: string
  georgian_title?: string
  chapters_count?: number // Added for manga
  episodes_count?: number // Added for anime
  publisher?: string      // Added for comics
}

// Animation variants for page transitions
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

// Animation variants for hero content
const heroVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

const contentVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.3 } }
};

// Add a helper function to check if content is favorited
function isContentFavorited(id: string, type: 'anime' | 'manga' | 'comics'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const contentKey = `${type}-${id}`;
    return !!favorites[contentKey];
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return false;
  }
}

// Add a helper function to toggle favorite status
function toggleContentFavorite(
  id: string, 
  type: 'anime' | 'manga' | 'comics', 
  title: string, 
  image: string
): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const contentKey = `${type}-${id}`;
    
    if (favorites[contentKey]) {
      // Remove from favorites
      delete favorites[contentKey];
      localStorage.setItem('favorites', JSON.stringify(favorites));
      return false;
    } else {
      // Add to favorites
      favorites[contentKey] = {
        id,
        type,
        title,
        image,
        addedAt: new Date().toISOString()
      };
      localStorage.setItem('favorites', JSON.stringify(favorites));
      return true;
    }
  } catch (error) {
    console.error("Error toggling favorite status:", error);
    return false;
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"anime" | "manga" | "comics">("anime")
  const [currentFeatured, setCurrentFeatured] = useState(0)
  const [isChanging, setIsChanging] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("ყველა")
  const [hoveredCard, setHoveredCard] = useState<string | null>(null) // Use string ID for hover
  const [isLoading, setIsLoading] = useState(true) // Main loading for initial data fetch
  const [isTabLoading, setIsTabLoading] = useState(false) // Loading state for tab transitions
  const [hoveredContentType, setHoveredContentType] = useState<"ANIME" | "MANGA" | "COMICS">("ANIME")
  const [featuredAnime, setFeaturedAnime] = useState<any[]>([])
  const [availableAnime, setAvailableAnime] = useState<any[]>([])
  const [availableManga, setAvailableManga] = useState<any[]>([])
  const [availableComics, setAvailableComics] = useState<any[]>([])
  const [isFeaturedFavorite, setIsFeaturedFavorite] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)

  // Ensure "ყველა" is set as the default category on initial render
  useEffect(() => {
    // Force "ყველა" to be the default selected category on first render
    if (selectedCategory !== "ყველა") {
      setSelectedCategory("ყველა");
    }
  }, []);

  // Fetch data from our database
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch all available anime
        const animeResponse = await getAllContent('anime', 20);
        
        // Fetch all available manga
        const mangaResponse = await getAllContent('manga', 20);
        
        // Fetch all available comics
        const comicsResponse = await getAllContent('comics', 20);
        
        let transformedAnime: any[] = [];
        
        if (animeResponse.success && animeResponse.content) {
          transformedAnime = animeResponse.content.map((content: ContentData) => {
            // --- DEBUG: Log raw values before transformation
            console.log(`[page.tsx anime map] ID: ${content.id}, Raw Banner: ${content.bannerImage}, Raw Thumb: ${content.thumbnail}`);
            return {
              id: content.id,
              title: content.georgian_title || content.title,
              englishTitle: content.georgian_title ? content.title : null,
              description: content.description || "აღწერა არ არის ხელმისაწვდომი",
              image: (content.bannerImage && content.bannerImage.trim() !== '') ? content.bannerImage : content.thumbnail,
              thumbnail: content.thumbnail, // Keep thumbnail for cards
              rating: content.rating || 0,
              status: content.status,
              episodes: content.episodes_count ? `${content.episodes_count} ეპიზოდი` : "?", // Use actual episode count
              genres: content.genres,
              type: 'anime'
            }
          }).filter((content: {image?: string}) => content.image);
          
          setAvailableAnime(transformedAnime);
          
          // Use the first few anime for featured content if available
          if (transformedAnime.length > 0) {
            setFeaturedAnime(transformedAnime.slice(0, 5));
          }
        }
        
        if (mangaResponse.success && mangaResponse.content) {
          const transformedManga = mangaResponse.content.map((content: ContentData) => {
            // --- DEBUG: Log raw values before transformation
            console.log(`[page.tsx manga map] ID: ${content.id}, Raw Banner: ${content.bannerImage}, Raw Thumb: ${content.thumbnail}`);
            
            // Improved chapter count extraction
            let chapterCount = 0;
            
            // First try to get from chapters_count field (preferred)
            if (typeof content.chapters_count === 'number' && !isNaN(content.chapters_count)) {
              chapterCount = content.chapters_count;
            }
            // Then try to access potential dynamic properties
            else {
              const rawContent = content as any; // Cast to any to access potentially dynamic fields
              
              if (typeof rawContent.chapters === 'number' && !isNaN(rawContent.chapters)) {
                chapterCount = rawContent.chapters;
              }
              else if (typeof rawContent.chapters === 'string' && rawContent.chapters) {
                const extracted = parseInt(rawContent.chapters.replace(/[^\d]/g, ''), 10);
                if (!isNaN(extracted)) {
                  chapterCount = extracted;
                }
              }
              // Debugging info for chapter count extraction
              console.log(`[page.tsx] Manga ${content.id} chapter extraction:`, {
                chapters_count: content.chapters_count,
                rawChapters: rawContent.chapters,
                finalCount: chapterCount
              });
            }
            
            return {
              id: content.id,
              title: content.georgian_title || content.title,
              englishTitle: content.georgian_title ? content.title : null,
              description: content.description || "აღწერა არ არის ხელმისაწვდომი",
              image: (content.bannerImage && content.bannerImage.trim() !== '') ? content.bannerImage : content.thumbnail,
              thumbnail: content.thumbnail,
              rating: content.rating || 0,
              status: content.status,
              chapters: chapterCount > 0 ? `${chapterCount} თავი` : "0 თავი", // Display string with count
              totalChapters: chapterCount, // Numeric value for calculations
              genres: content.genres,
              type: 'manga'
            }
          }).filter((content: {image?: string}) => content.image);
          
          setAvailableManga(transformedManga);
          
          // Add available manga to featured content
          if (transformedManga.length > 0) {
            const mangaForFeatured = transformedManga.slice(0, 3);
            if (transformedAnime.length > 0) {
              // Combine anime and manga for featured
              setFeaturedAnime([...transformedAnime.slice(0, 2), ...mangaForFeatured]);
            } else {
              // Use manga only for featured if no anime available
              setFeaturedAnime(mangaForFeatured);
            }
          }
        }

        // Handle comics content
        if (comicsResponse.success && comicsResponse.content) {
          const transformedComics = comicsResponse.content.map((content: ContentData) => {
            console.log(`[page.tsx comics map] ID: ${content.id}, Raw Banner: ${content.bannerImage}, Raw Thumb: ${content.thumbnail}`);
            
            // Extract chapter count for comics - similar to manga
            let chapterCount = 0;
            
            if (typeof content.chapters_count === 'number' && !isNaN(content.chapters_count)) {
              chapterCount = content.chapters_count;
            } else {
              const rawContent = content as any;
              
              if (typeof rawContent.chapters === 'number' && !isNaN(rawContent.chapters)) {
                chapterCount = rawContent.chapters;
              }
              else if (typeof rawContent.chapters === 'string' && rawContent.chapters) {
                const extracted = parseInt(rawContent.chapters.replace(/[^\d]/g, ''), 10);
                if (!isNaN(extracted)) {
                  chapterCount = extracted;
                }
              }
              console.log(`[page.tsx] Comics ${content.id} chapter extraction:`, {
                chapters_count: content.chapters_count,
                rawChapters: rawContent.chapters,
                finalCount: chapterCount
              });
            }
            
            return {
              id: content.id,
              title: content.georgian_title || content.title,
              englishTitle: content.georgian_title ? content.title : null,
              description: content.description || "აღწერა არ არის ხელმისაწვდომი",
              image: (content.bannerImage && content.bannerImage.trim() !== '') ? content.bannerImage : content.thumbnail,
              thumbnail: content.thumbnail,
              rating: content.rating || 0,
              status: content.status,
              chapters: chapterCount > 0 ? `${chapterCount} თავი` : "0 თავი", // Display string with count
              totalChapters: chapterCount, // Numeric value for calculations
              genres: content.genres,
              type: 'comics',
              publisher: content.publisher || ''
            }
          }).filter((content: {image?: string}) => content.image);
          
          setAvailableComics(transformedComics);
          
          // Add comics to featured content if needed
          if (transformedComics.length > 0 && featuredAnime.length < 5) {
            const comicsForFeatured = transformedComics.slice(0, 2);
            setFeaturedAnime(prev => [...prev, ...comicsForFeatured].slice(0, 5));
          }
        }

        // ---- DEBUG LOGGING START ----
        console.log("--- app/page.tsx Data Fetch --- ");
        console.log("Raw Anime Response Content (sample):");
        console.log(animeResponse.success ? animeResponse.content?.slice(0, 2) : "Failed or no anime content");
        console.log("Transformed Anime (sample):");
        console.log(transformedAnime.slice(0, 2));
        console.log("Raw Manga Response Content (sample):");
        console.log(mangaResponse.success ? mangaResponse.content?.slice(0, 2) : "Failed or no manga content");
        console.log("Raw Comics Response Content (sample):");
        console.log(comicsResponse.success ? comicsResponse.content?.slice(0, 2) : "Failed or no comics content");
        console.log("Final Featured Anime State (sample):");
        // Safely construct the sample for logging
        const mangaSampleForFeatured = (mangaResponse.success && mangaResponse.content) ? mangaResponse.content.slice(0, 3) : [];
        const comicsSampleForFeatured = (comicsResponse.success && comicsResponse.content) ? comicsResponse.content.slice(0, 2) : [];
        const finalFeaturedSample = (transformedAnime.length > 0) 
            ? [...transformedAnime.slice(0, 2), ...mangaSampleForFeatured, ...comicsSampleForFeatured].slice(0, 5)
            : (transformedAnime.length > 0 ? transformedAnime.slice(0, 5) : 
              [...mangaSampleForFeatured, ...comicsSampleForFeatured].slice(0, 5));
        console.log(finalFeaturedSample.map((item: any) => ({
          id: item.id,
          title: item.title,
          banner: item.bannerImage,
          thumb: item.thumbnail,
          image_prop: item.image,
          type: item.type,
        })));
        console.log("-----------------------------");
        // ---- DEBUG LOGGING END ----

      } catch (error) {
        console.error("Error fetching content data:", error);
      } finally {
        // Small delay before removing loading state for smoother transition
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    }

    fetchData();
  }, []);

  // Change featured content every 7 seconds
  useEffect(() => {
    if (featuredAnime.length <= 1) return; // Don't cycle if only one item
    
    const interval = setInterval(() => {
      setIsChanging(true)
      // Preload the next image briefly before transition
      if (featuredAnime.length > 0) {
        const nextIndex = (currentFeatured + 1) % featuredAnime.length;
        const img = new Image();
        img.src = featuredAnime[nextIndex].image;
      }
      
      setTimeout(() => {
        setCurrentFeatured((prev) => (prev + 1) % featuredAnime.length)
        setIsChanging(false)
      }, 400) // Slightly faster transition
    }, 7000)

    return () => clearInterval(interval)
  }, [featuredAnime, currentFeatured])

  // Update content type based on active tab
  useEffect(() => {
    if (activeTab === "anime") {
      setHoveredContentType("ANIME")
    } else if (activeTab === "manga") {
      setHoveredContentType("MANGA")
    } else if (activeTab === "comics") {
      setHoveredContentType("COMICS")
    }
  }, [activeTab])

  // Handle tab changes with smooth transitions
  const handleTabChange = (tab: "anime" | "manga" | "comics") => {
    if (tab === activeTab) return;
    
    setIsTabLoading(true);
    // Wait for exit animation
    setTimeout(() => {
      setActiveTab(tab);
      setSelectedCategory("ყველა"); // Reset category on tab change
      // Wait for new content to mount before removing loading state
      setTimeout(() => {
        setIsTabLoading(false);
      }, 300); 
    }, 300); 
  };

  const featured = featuredAnime[currentFeatured];

  // Prepare categories dynamically based on available content
  const animeCategories = availableAnime.reduce((acc, anime) => {
    anime.genres?.forEach((genre: string) => {
      if (!acc.includes(genre)) acc.push(genre);
    });
    return acc;
  }, [] as string[]);
  
  const mangaCategories = availableManga.reduce((acc, manga) => {
    manga.genres?.forEach((genre: string) => {
      if (!acc.includes(genre)) acc.push(genre);
    });
    return acc;
  }, [] as string[]);
  
  const comicsCategories = availableComics.reduce((acc, comic) => {
    comic.genres?.forEach((genre: string) => {
      if (!acc.includes(genre)) acc.push(genre);
    });
    return acc;
  }, [] as string[]);

  // Update the featured favorite status when featured content changes
  useEffect(() => {
    if (featured) {
      setIsFeaturedFavorite(isContentFavorited(featured.id, featured.type));
      
      // Debug log for featured content
      console.log("Featured content:", {
        id: featured.id,
        type: featured.type,
        title: featured.title,
        chapters: featured.chapters,
        episodes: featured.episodes
      });
    }
  }, [featured]);
  
  // Add a handle favorite function
  const handleFeaturedFavoriteToggle = () => {
    if (!featured) return;
    
    const newStatus = toggleContentFavorite(
      featured.id, 
      featured.type, 
      featured.title, 
      featured.thumbnail || featured.image
    );
    
    setIsFeaturedFavorite(newStatus);
  };

  return (
    <div className="flex min-h-screen bg-[#070707] text-white antialiased">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden">
        {/* Featured Content */} 
        <section className="relative w-full h-[350px] md:h-[400px] px-4 pt-16 md:px-0 md:pt-0">
          {/* --- DEBUG LOG --- */}
          {(() => { console.log("[app/page.tsx] Rendering Banner. featured.image:", featured?.image); return null; })()}
          <AnimatePresence mode="wait">
            {isLoading || !featured ? (
              <m.div
                key="banner-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <BannerSkeleton />
              </m.div>
            ) : (
              <m.div
                key={featured.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: isChanging ? 0.3 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 w-full h-[40vh]"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-500 ease-in-out"
                  style={{
                    backgroundImage: `url(${featured.image})`,
                    filter: isChanging ? "brightness(0.4)" : "brightness(0.6)", // Slightly darker
                  }}
                />
                
                {/* Simplified gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707] to-transparent opacity-100" />
                {/* Light left gradient for text contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#070707] to-transparent opacity-50" /> 
                {/* Subtle noise texture */}
                <div className="absolute inset-0 bg-[url('/noise-texture.png')] opacity-[0.03]"></div>
              </m.div>
            )}
          </AnimatePresence>

          {/* Content positioned correctly with padding */} 
          <div className="absolute top-16 left-0 right-0 pb-24 md:pb-12 px-4 md:px-8 lg:px-12 z-10 mt-0">
            <AnimatePresence mode="wait">
              {isLoading || !featured ? (
                <div className="space-y-4 mt-[-100px]"> {/* Adjust spacing for skeleton */} 
                </div>
              ) : (
                <m.div
                  key={`${featured.id}-content`}
                  variants={heroVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex items-end md:flex-row-reverse gap-6 relative max-w-screen-xl mx-auto" /* Center content */
                >
                  {/* Featured Thumbnail - Hide on small screens */}
                  <m.div 
                    className="w-28 h-40 md:w-36 md:h-56 md:block hidden rounded-lg overflow-hidden border-2 border-white/10 shadow-xl flex-shrink-0 block relative group/thumbnail"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    
                    <div className="w-full h-full overflow-hidden rounded-lg">
                      <img
                        src={featured.thumbnail}
                        alt={featured.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/thumbnail:scale-110 transform-origin-center"
                      />
                    </div>

                    {/* Favorite button for featured content thumbnail */}
                    {featured && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent navigation if the link is on parent
                                handleFeaturedFavoriteToggle();
                            }}
                            className={cn(
                                "absolute top-2 right-2 z-20 p-1.5 rounded-full transition-all duration-300 backdrop-blur-sm border",
                                isFeaturedFavorite 
                                    ? "bg-red-500/30 border-red-500/50 text-red-400"
                                    : "bg-black/50 border-white/20 text-white/80 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40",
                                "opacity-0 group-hover/thumbnail:opacity-100" // Control opacity with group-hover/thumbnail
                            )}
                            aria-label={isFeaturedFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                            <m.div
                                initial={{ scale: 1 }}
                                animate={{ scale: isFeaturedFavorite ? 1.1 : 1 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                            >
                                <Heart className={cn("w-3.5 h-3.5", isFeaturedFavorite && "fill-current")} />
                            </m.div>
                        </button>
                    )}
                  </m.div>
                  
                  <div className="w-fit">
                    <m.h1
                      className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-1"
                      variants={heroVariants}
                    >
                      <TypewriterText text={featured.title} />
                    </m.h1>
                        
                    {featured.englishTitle && (
                      <m.h2
                        className="text-lg md:text-xl text-gray-400 mb-3"
                        variants={heroVariants}
                      >
                        {featured.englishTitle}
                      </m.h2>
                    )}
                        
                    <m.div 
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 text-xs md:text-sm"
                      variants={heroVariants}
                    >
                      {featured.type === 'anime' ? (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <Play className="h-3.5 w-3.5 text-purple-400" />
                          <span>{featured.episodes || "0 ეპიზოდი"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <BookOpen className="h-3.5 w-3.5 text-purple-400" />
                          <span>{featured.chapters || "0 თავი"}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Calendar className="h-3.5 w-3.5 text-purple-400" />
                        <span>{featured.status}</span>
                      </div>
                      {featured.release_year && (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <CalendarDays className="h-3.5 w-3.5 text-purple-400" />
                          <span>{featured.release_year}</span>
                        </div>
                      )}
                      {featured.rating > 0 && (
                        <div className="flex items-center gap-1.5 text-yellow-400">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span className="font-medium">{featured.rating}</span>
                        </div>
                      )}
                    </m.div>
                        
                    {/* Description with text fade mask effect */}
                    <m.div 
                      className="relative mb-6 w-fit"
                      variants={heroVariants}
                    >
                      <div 
                        className="max-h-[120px] w-fit overflow-scroll no-scrollbar"
                        style={{
                          maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                          WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)'
                        }}
                      >
                        <p className="text-sm leading-relaxed mb-[24px] max-w-xl text-gray-300">
                          {featured.description}
                        </p>
                      </div>
                    </m.div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tab Navigation - Simplified */} 
          <m.div 
            className="absolute bottom-[-40px] left-0 right-0 flex justify-center z-20 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.5 }}
          >
            <m.div 
              className="bg-gray-900/10 border border-gray-800/20 rounded-xl p-1 shadow-md flex gap-1"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, delay: 1.5 }}
            >
              {[ 
                { label: "ანიმე", value: "anime" },
                { label: "მანგა", value: "manga" },
                { label: "კომიქსები", value: "comics" }
              ].map((tab) => (
                <m.button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.value ? "bg-purple-600/20 text-white" : "text-gray-400 hover:text-white"
                  )}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10">{tab.label}</span>
                </m.button>
              ))}
            </m.div>
          </m.div>
          
          {/* Featured content pagination dots */} 
          {featuredAnime.length > 1 && (
            <div className="absolute bottom-[30px] left-0 right-0 flex justify-center z-20">
              <m.div 
                className="flex gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {featuredAnime.map((_, index) => (
                  <m.button
                    key={`dot-${index}`}
                    className={`rounded-full ${
                      currentFeatured === index 
                        ? 'bg-white w-3 h-3' 
                        : 'bg-white/40 w-3 h-3'
                    }`}
                    onClick={() => {
                      if (currentFeatured === index || isChanging) return;
                      setIsChanging(true);
                      setTimeout(() => {
                        setCurrentFeatured(index);
                        setIsChanging(false);
                      }, 400);
                    }}
                  />
                ))}
              </m.div>
            </div>
          )}
        </section>

        {/* Content based on active tab - Simplified layout */}
        <div className="px-4 py-8 min-h-[500px] pt-24 pl-[100px]">
          <AnimatePresence mode="wait">
            {isTabLoading ? (
              <m.div
                key="tab-loading-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <CategorySkeleton count={8} />
                <CarouselSkeleton count={6} />
              </m.div>
            ) : (
              <m.div
                key={activeTab}
                variants={contentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className=" mx-auto"
              >
                {activeTab === "anime" && (
                  <AnimeView
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    categories={[...animeCategories]}
                    hoveredCard={hoveredCard}
                    setHoveredCard={setHoveredCard}
                    animeData={availableAnime}
                  />
                )}

                {activeTab === "manga" && (
                  <MangaView
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    categories={[...mangaCategories]}
                    hoveredCard={hoveredCard}
                    setHoveredCard={setHoveredCard}
                    mangaData={availableManga}
                  />
                )}
                
                {activeTab === "comics" && (
                  <MangaView // Reuse MangaView for comics since the structure is the same
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    categories={[...comicsCategories]}
                    hoveredCard={hoveredCard}
                    setHoveredCard={setHoveredCard}
                    mangaData={availableComics}
                  />
                )}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Card hover overlay */} 
      {hoveredCard !== null && ( 
        <ContentCardHover 
          id={hoveredCard} 
          onClose={() => setHoveredCard(null)} 
          contentType={hoveredContentType} 
        />
      )}
    </div>
  )
}
