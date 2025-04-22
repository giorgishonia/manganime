"use client"

import { useState, useEffect } from "react"
import { motion as m, AnimatePresence } from "framer-motion"
import { ChevronRight, Search, Heart, Play, Plus, Star, CalendarDays, Clock, Info, ArrowRight, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { ContentCardHover } from "@/components/content-card-hover"
import { TypewriterText } from "@/components/typewriter-text"
import { ScheduleView } from "@/components/schedule-view"
import { MangaView } from "@/components/manga-view"
import { AnimeView } from "@/components/anime-view"
import { getTrendingContent } from "@/lib/content"
import { BannerSkeleton, CarouselSkeleton, CategorySkeleton } from "@/components/ui/skeleton"

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
}

// Animation variants for page transitions
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

// Animation variants for hero content
const heroVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 1.05, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

const contentVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { staggerChildren: 0.1, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<"anime" | "schedule" | "manga">("anime")
  const [currentFeatured, setCurrentFeatured] = useState(0)
  const [isChanging, setIsChanging] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(true)
  const [hoveredContentType, setHoveredContentType] = useState<"ANIME" | "MANGA">("ANIME")
  const [featuredAnime, setFeaturedAnime] = useState<any[]>([])

  // Fetch data from our database
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await getTrendingContent('anime', 10);
        
        if (response.success && response.content) {
          // Transform data to match our UI needs
          const transformedData = response.content.map((content: ContentData) => ({
            id: content.id,
            title: content.title,
            description: content.description?.substring(0, 200) + "..." || "No description available",
            image: content.banner_image || content.thumbnail,
            thumbnail: content.thumbnail,
            rating: content.rating || 0,
            status: content.status,
            episodes: "Episodes available", // We would need to fetch episodes separately
            genres: content.genres
          })).filter((content: {image?: string}) => content.image); // Filter out entries without images
          
          setFeaturedAnime(transformedData);
        }

        setIsFetching(false);
        
        // Small delay before removing loading state
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      } catch (error) {
        console.error("Error fetching content data:", error);
        setIsFetching(false);
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Change featured content every 7 seconds
  useEffect(() => {
    if (featuredAnime.length === 0) return;
    
    const interval = setInterval(() => {
      setIsChanging(true)
      setTimeout(() => {
        setCurrentFeatured((prev) => (prev + 1) % featuredAnime.length)
        setIsChanging(false)
      }, 500)
    }, 7000)

    return () => clearInterval(interval)
  }, [featuredAnime])

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
    
    setIsLoading(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }, 300);
  };

  const featured = featuredAnime[currentFeatured] || {
    id: 0,
    title: "Loading...",
    description: "Loading content...",
    image: "/placeholder.svg",
    thumbnail: "/placeholder.svg",
    rating: 0,
    status: "Loading",
    episodes: "Loading"
  };

  return (
    <div className="flex min-h-screen bg-[#070707] text-white antialiased">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden">
        {/* Featured Content */}
        <section className="relative w-full h-[570px] overflow-hidden">
          <AnimatePresence mode="wait">
            {isFetching ? (
              <m.div
                key="banner-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <BannerSkeleton />
              </m.div>
            ) : (
              <m.div
                key={featured.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: isChanging ? 0.3 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 w-full h-full"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${featured.image})`,
                    filter: isChanging ? "brightness(0.5)" : "brightness(0.7)",
                  }}
                />
                
                {/* Enhanced gradient overlay with multiple layers */}
                <div className="image-gradient-overlay absolute inset-0" />

                {/* Background particles/accents */}
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
              </m.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-32 left-8 pl-32 z-10 max-w-2xl">
            <AnimatePresence mode="wait">
              {isFetching ? (
                <div className="space-y-4 w-full">
                  {/* Empty space for skeleton */}
                </div>
              ) : (
                <m.div
                  key={featured.id}
                  variants={heroVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex flex-col items-start gap-6 relative overflow-hidden"
                >
                  <div className="flex-1 w-full relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-xs font-semibold px-2.5 py-0.5 rounded-full text-white">FEATURED</span>
                      <TrendingUp className="h-4 w-4 text-purple-400" />
                    </div>
                    
                    <div className="flex items-start gap-6 mb-4">
                      {featured.thumbnail && (
                        <div className="h-32 w-24 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                          <img
                            src={featured.thumbnail || "/placeholder.svg"}
                            alt={featured.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex flex-col justify-start">
                        <m.h1
                          className="text-3xl font-bold text-glow text-white mb-2"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          <TypewriterText text={featured.title} />
                        </m.h1>
                        
                        <div className="flex items-center gap-3 mb-3">
                          <div className="pill-button text-sm flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{featured.status}</span>
                          </div>
                          <div className="pill-button text-sm flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span>{featured.episodes}</span>
                          </div>
                          <div className="pill-button text-sm flex items-center gap-1.5 bg-white/10">
                            <Heart className="h-3.5 w-3.5 text-green-400 fill-green-400" />
                            <span className="font-medium">{featured.rating}</span>
                          </div>
                        </div>
                        
                        <m.div
                          className="scrollable-content mb-4"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          <p className="text-sm leading-relaxed max-w-lg text-gray-300">
                            {featured.description}
                          </p>
                        </m.div>
                      </div>
                    </div>
                    
                    <m.div 
                      className="flex gap-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <m.button 
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-full flex items-center gap-2 shadow-lg shadow-purple-600/20"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Play className="h-4 w-4" />
                        Watch Now
                      </m.button>
                      
                      <m.button 
                        className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white font-medium rounded-full flex items-center gap-2 border border-white/10"
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Plus className="h-4 w-4" />
                        Add to List
                      </m.button>
                      
                      <m.button 
                        className="p-2.5 bg-white/10 backdrop-blur-sm text-white rounded-full flex items-center border border-white/10"
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Info className="h-4 w-4" />
                      </m.button>
                    </m.div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tab Navigation */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center mb-8 z-20">
            <m.div 
              className="border border-white/10 rounded-full p-1.5 shadow-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{backgroundColor: "rgba(0, 0, 0, 0.21)", display: "flex", gap: "15px"}}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <m.button
                onClick={() => handleTabChange("anime")}
                className={cn(
                  "px-8 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  activeTab === "anime" 
                    ? "text-white shadow-lg" 
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                )}
                style={activeTab === "anime" ? {
                  background: "linear-gradient(to right, #40404017, rgb(151 151 151 / 8%))"
                } : {}}
                whileHover={activeTab !== "anime" ? { scale: 1.03 } : {}}
                whileTap={{ scale: 0.95 }}
              >
                Anime
              </m.button>
              <m.button
                onClick={() => handleTabChange("schedule")}
                className={cn(
                  "px-8 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  activeTab === "schedule" 
                  ? "text-white shadow-lg" 
                  : "text-gray-300 hover:text-white hover:bg-white/10"
                )}
                style={activeTab === "schedule" ? {
                  background: "linear-gradient(to right, #40404017, rgb(151 151 151 / 8%))"
                } : {}}
                whileHover={activeTab !== "schedule" ? { scale: 1.03 } : {}}
                whileTap={{ scale: 0.95 }}
              >
                Schedule
              </m.button>
              <m.button
                onClick={() => handleTabChange("manga")}
                className={cn(
                  "px-8 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  activeTab === "manga" 
                  ? "text-white shadow-lg" 
                  : "text-gray-300 hover:text-white hover:bg-white/10"
                )}
                style={activeTab === "manga" ? {
                  background: "linear-gradient(to right, #40404017, rgb(151 151 151 / 8%))"
                } : {}}
                whileHover={activeTab !== "manga" ? { scale: 1.03 } : {}}
                whileTap={{ scale: 0.95 }}
              >
                Manga
              </m.button>
            </m.div>
            <m.button
              className="absolute right-8 glass-effect px-4 py-2.5 rounded-full hidden md:flex items-center gap-2 border border-white/10 shadow-xl"
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Search className="h-4 w-4" />
              <span className="text-sm font-medium">Advanced search</span>
            </m.button>
          </div>
          
          {/* Featured content pagination dots */}
          <div className="absolute bottom-24 left-0 right-0 flex justify-center z-20">
            <m.div 
              className="flex gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {featuredAnime.map((_, index) => (
                <m.button
                  key={`dot-${index}`}
                  className={`rounded-full transition-all duration-300 ${
                    currentFeatured === index 
                      ? 'bg-white/70 w-[22px] h-[12px]'
                      : 'bg-white/30 w-3 h-3 hover:bg-white/50'
                  }`}
                  onClick={() => {
                    setIsChanging(true);
                    setTimeout(() => {
                      setCurrentFeatured(index);
                      setIsChanging(false);
                    }, 500);
                  }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
            </m.div>
          </div>
        </section>

        {/* Content based on active tab */}
        <div className="px-8 py-10 pl-[20px] md:pl-[90px]">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <m.div
                key="loading-skeleton"
                variants={contentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-14"
              >
                <CategorySkeleton count={8} />
                <CarouselSkeleton count={6} />
                <CarouselSkeleton count={4} />
              </m.div>
            ) : (
              <m.div
                key={activeTab}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {activeTab === "anime" && (
                  <AnimeView
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    categories={featuredAnime.reduce((acc, anime) => {
                      anime.genres?.forEach((genre: string) => {
                        if (!acc.includes(genre)) acc.push(genre);
                      });
                      return acc;
                    }, ["All"])}
                    hoveredCard={hoveredCard}
                    setHoveredCard={setHoveredCard}
                    animeData={featuredAnime}
                  />
                )}

                {activeTab === "schedule" && <ScheduleView />}

                {activeTab === "manga" && (
                  <MangaView
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    categories={featuredAnime.reduce((acc, anime) => {
                      anime.genres?.forEach((genre: string) => {
                        if (!acc.includes(genre)) acc.push(genre);
                      });
                      return acc;
                    }, ["All"])}
                    hoveredCard={hoveredCard}
                    setHoveredCard={setHoveredCard}
                  />
                )}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Card hover overlay */}
      {hoveredCard !== null && (
        <ContentCardHover id={hoveredCard} onClose={() => setHoveredCard(null)} contentType={hoveredContentType} />
      )}
    </div>
  )
}
