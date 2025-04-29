"use client"

import { useState, useEffect } from "react"
import { motion as m, AnimatePresence } from "framer-motion"
import { ChevronRight, Search, Play, Plus, Star, CalendarDays, Clock, Info, ArrowRight, TrendingUp, BookOpen, Calendar } from "lucide-react"
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
  banner_image?: string
  rating?: number
  status: string
  genres: string[]
  type: 'anime' | 'manga'
  release_year?: number
  season?: string
  georgian_title?: string
  chapters_count?: number // Added for manga
  episodes_count?: number // Added for anime
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<"anime" | "schedule" | "manga">("anime")
  const [currentFeatured, setCurrentFeatured] = useState(0)
  const [isChanging, setIsChanging] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("ყველა")
  const [hoveredCard, setHoveredCard] = useState<string | null>(null) // Use string ID for hover
  const [isLoading, setIsLoading] = useState(true) // Main loading for initial data fetch
  const [isTabLoading, setIsTabLoading] = useState(false) // Loading state for tab transitions
  const [hoveredContentType, setHoveredContentType] = useState<"ANIME" | "MANGA">("ANIME")
  const [featuredAnime, setFeaturedAnime] = useState<any[]>([])
  const [availableAnime, setAvailableAnime] = useState<any[]>([])
  const [availableManga, setAvailableManga] = useState<any[]>([])

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
        
        let transformedAnime: any[] = [];
        
        if (animeResponse.success && animeResponse.content) {
          transformedAnime = animeResponse.content.map((content: ContentData) => ({
            id: content.id,
            title: content.georgian_title || content.title,
            englishTitle: content.georgian_title ? content.title : null,
            description: content.description || "აღწერა არ არის ხელმისაწვდომი",
            image: content.banner_image || content.thumbnail, // Use banner for hero
            thumbnail: content.thumbnail, // Keep thumbnail for cards
            rating: content.rating || 0,
            status: content.status,
            episodes: content.episodes_count ? `${content.episodes_count} ეპიზოდი` : "?", // Use actual episode count
            genres: content.genres,
            type: 'anime'
          })).filter((content: {image?: string}) => content.image);
          
          setAvailableAnime(transformedAnime);
          
          // Use the first few anime for featured content if available
          if (transformedAnime.length > 0) {
            setFeaturedAnime(transformedAnime.slice(0, 5));
          }
        }
        
        if (mangaResponse.success && mangaResponse.content) {
          const transformedManga = mangaResponse.content.map((content: ContentData) => ({
            id: content.id,
            title: content.georgian_title || content.title,
            englishTitle: content.georgian_title ? content.title : null,
            description: content.description || "აღწერა არ არის ხელმისაწვდომი",
            image: content.banner_image || content.thumbnail,
            thumbnail: content.thumbnail,
            rating: content.rating || 0,
            status: content.status,
            chapters: content.chapters_count ? `${content.chapters_count} თავი` : "?", // Use actual chapter count
            genres: content.genres,
            type: 'manga'
          })).filter((content: {image?: string}) => content.image);
          
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
    }
  }, [activeTab])

  // Handle tab changes with smooth transitions
  const handleTabChange = (tab: "anime" | "schedule" | "manga") => {
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

  return (
    <div className="flex min-h-screen bg-[#070707] text-white antialiased">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden pl-0 md:pl-[77px]"> {/* Adjust padding */} 
        {/* Featured Content */} 
        <section className="relative w-full h-[550px] md:h-[600px] overflow-hidden"> {/* Removed left padding here */} 
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
                className="absolute inset-0 w-full h-full"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-500 ease-in-out"
                  style={{
                    backgroundImage: `url(${featured.image})`,
                    filter: isChanging ? "brightness(0.4)" : "brightness(0.6)", // Slightly darker
                  }}
                />
                
                {/* Enhanced gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/80 to-transparent" />
                {/* Stronger left gradient to ensure text contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-[#070707]/50 to-transparent" /> 
                {/* Subtle noise texture */}
                <div className="absolute inset-0 bg-[url('/noise-texture.png')] opacity-[0.03]"></div> 
              </m.div>
            )}
          </AnimatePresence>

          {/* Content positioned correctly with padding */} 
          <div className="absolute bottom-0 left-0 right-0 pb-28 md:pb-32 px-4 md:px-8 lg:px-12 z-10"> 
            <AnimatePresence mode="wait">
              {isLoading || !featured ? (
                <div className="space-y-4 mt-[-100px]"> {/* Adjust spacing for skeleton */} 
                  <div className="h-10 bg-gray-700/30 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-700/30 rounded w-1/2"></div>
                  <div className="h-20 bg-gray-700/30 rounded w-full"></div>
                  <div className="flex gap-3">
                    <div className="h-10 w-28 bg-gray-700/30 rounded-full"></div>
                    <div className="h-10 w-36 bg-gray-700/30 rounded-full"></div>
                  </div>
                </div>
              ) : (
                <m.div
                  key={`${featured.id}-content`}
                  variants={heroVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex items-end gap-6 relative max-w-screen-xl mx-auto" /* Center content */
                >
                  {/* Featured Thumbnail */}
                  {featured.thumbnail && (
                    <m.div 
                      className="w-28 h-40 md:w-36 md:h-52 rounded-lg overflow-hidden border-2 border-white/10 shadow-xl flex-shrink-0 hidden lg:block" /* Show on large screens */ 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      <ImageSkeleton
                        src={featured.thumbnail}
                        alt={featured.title}
                        className="w-full h-full object-cover"
                      />
                    </m.div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       {/* Improved Badge */} 
                      <m.span 
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-semibold px-3 py-1 rounded-full text-white shadow-md"
                        initial={{opacity: 0, scale: 0.8}}
                        animate={{opacity: 1, scale: 1}}
                        transition={{delay: 0.1}}
                      >
                        რჩეული
                      </m.span>
                    </div>
                    
                    <m.h1
                      className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-1 text-shadow-lg"
                      variants={heroVariants} // Reuse variant for stagger
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
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm"
                      variants={heroVariants}
                    >
                      {featured.type === 'anime' ? (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <Play className="h-3.5 w-3.5 text-purple-400" />
                          <span>{featured.episodes}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <BookOpen className="h-3.5 w-3.5 text-purple-400" />
                          <span>{featured.chapters}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Calendar className="h-3.5 w-3.5 text-purple-400" />
                        <span>{featured.status}</span>
                      </div>
                      {featured.rating > 0 && (
                        <div className="flex items-center gap-1.5 text-yellow-400">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span className="font-medium">{featured.rating}</span>
                        </div>
                      )}
                    </m.div>
                        
                    <m.p 
                      className="text-sm leading-relaxed max-w-xl text-gray-300 mb-6 line-clamp-2 md:line-clamp-3" /* Adjusted line clamp */ 
                      variants={heroVariants}
                    >
                      {featured.description}
                    </m.p>
                    
                    <m.div 
                      className="flex flex-wrap gap-3" /* Allow wrapping */ 
                      variants={heroVariants}
                    >
                       {/* Improved Buttons */} 
                      <m.button 
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg flex items-center gap-2 shadow-lg shadow-purple-600/30 transform hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-[#070707]"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Play className="h-4 w-4" />
                        {featured.type === 'anime' ? 'ყურება' : 'კითხვა'}
                      </m.button>
                      
                      <m.button 
                        className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white font-medium rounded-lg flex items-center gap-2 border border-white/10 transform hover:scale-105 hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#070707]"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Plus className="h-4 w-4" />
                        სიაში
                      </m.button>
                      
                      <m.button 
                        className="p-2.5 bg-white/10 backdrop-blur-sm text-white rounded-lg flex items-center border border-white/10 transform hover:scale-105 hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#070707]"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Info className="h-4 w-4" />
                      </m.button>
                    </m.div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tab Navigation - Improved Styling */} 
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20 px-4">
            <m.div 
              className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-xl p-1 shadow-xl flex gap-1"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {[ 
                { label: "ანიმე", value: "anime" },
                { label: "მანგა", value: "manga" }
              ].map((tab) => (
                <m.button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value as any)}
                  className={cn(
                    "px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-300 relative",
                    activeTab === tab.value ? "text-white" : "text-gray-400 hover:text-white"
                  )}
                  whileTap={{ scale: 0.97 }}
                >
                  {activeTab === tab.value && (
                    <m.div
                      layoutId="activeTabIndicatorHome"
                      className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/30 rounded-lg z-0 shadow-inner shadow-purple-900/30"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </m.button>
              ))}
            </m.div>
          </div>
          
          {/* Featured content pagination dots - Adjusted spacing slightly */}
          {featuredAnime.length > 1 && (
            <div className="absolute bottom-[100px] md:bottom-[105px] left-0 right-0 flex justify-center z-20"> 
              <m.div 
                className="flex gap-2.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                {featuredAnime.map((_, index) => (
                  <m.button
                    key={`dot-${index}`}
                    className={`rounded-full transition-all duration-400 ease-out ${ 
                      currentFeatured === index 
                        ? 'bg-white w-5 h-2.5' // Active dot style 
                        : 'bg-white/40 w-2.5 h-2.5 hover:bg-white/70' // Inactive dot style
                    }`}
                    onClick={() => {
                      if (currentFeatured === index || isChanging) return;
                      setIsChanging(true);
                      setTimeout(() => {
                        setCurrentFeatured(index);
                        setIsChanging(false);
                      }, 400);
                    }}
                    whileHover={{ scale: currentFeatured !== index ? 1.4 : 1 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </m.div>
            </div>
          )}
        </section>

        {/* Content based on active tab - Adjusted padding */}
        <div className="px-4 md:px-8 lg:px-12 py-10 min-h-[500px]"> 
          <AnimatePresence mode="wait">
            {isTabLoading ? (
              <m.div
                key="tab-loading-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-14"
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
              >
                {activeTab === "anime" && (
                  <AnimeView
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    categories={[...animeCategories]} // Add "All" category
                    hoveredCard={hoveredCard}
                    setHoveredCard={setHoveredCard}
                    animeData={availableAnime} // Pass fetched data
                  />
                )}

                {activeTab === "manga" && (
                  <>
                    {/* Use IIFE for console log */} 
                    {(() => { 
                       console.log("Available Manga being passed to MangaView:", availableManga);
                       return null; // Return null to avoid rendering issues
                    })()}
                    <MangaView
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      categories={[...mangaCategories]} // Add "All" category
                      hoveredCard={hoveredCard}
                      setHoveredCard={setHoveredCard}
                      mangaData={availableManga} // Change 'items' to 'mangaData'
                    />
                  </>
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
