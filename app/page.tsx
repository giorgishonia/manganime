"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Search, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { ContentCardHover } from "@/components/content-card-hover"
import { TypewriterText } from "@/components/typewriter-text"
import { ScheduleView } from "@/components/schedule-view"
import { MangaView } from "@/components/manga-view"
import { AnimeView } from "@/components/anime-view"
import { getTrendingAnime, stripHtml, formatStatus, formatAiringTime } from "@/lib/anilist"
import { BannerSkeleton, CarouselSkeleton, CategorySkeleton } from "@/components/ui/skeleton"

// Define interface for anime data from AniList API
interface AnimeData {
  id: number
  title: {
    english: string | null
    romaji: string
  }
  description: string | null
  bannerImage: string | null
  coverImage: {
    large: string
    extraLarge: string
  }
  averageScore: number
  status: string
  episodes: number | null
  nextAiringEpisode?: {
    episode: number
  }
  genres?: string[]
  image?: string
}

// Animation variants for page transitions
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

// Animation variants for hero content
const heroVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.05 }
};

const contentVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { staggerChildren: 0.1 }
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

  // Fetch data from AniList
  useEffect(() => {
    async function fetchData() {
      try {
        const animeData = await getTrendingAnime(10);
        
        // Transform data to match our UI needs
        const transformedData = animeData.map((anime: AnimeData) => ({
          id: anime.id,
          title: anime.title.english || anime.title.romaji,
          description: stripHtml(anime.description || "").substring(0, 200) + "...",
          image: anime.bannerImage || anime.coverImage.extraLarge,
          thumbnail: anime.coverImage.large,
          rating: anime.averageScore / 10,
          status: formatStatus(anime.status),
          episodes: anime.nextAiringEpisode 
            ? `${anime.nextAiringEpisode.episode - 1} episodes released` 
            : `${anime.episodes || '?'} episodes total`,
          genres: anime.genres
        })).filter((anime: {image?: string}) => anime.image); // Filter out entries without images
        
        setFeaturedAnime(transformedData);
        setIsFetching(false);
        
        // Small delay before removing loading state
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      } catch (error) {
        console.error("Error fetching anime data:", error);
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
    <div className="flex min-h-screen bg-[#070707] text-white">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden">
        {/* Featured Content */}
        <section className="relative w-full h-[500px] overflow-hidden">
          <AnimatePresence mode="wait">
            {isFetching ? (
              <motion.div
                key="banner-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <BannerSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key={featured.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: isChanging ? 0.3 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 w-full h-full"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${featured.image})`,
                    filter: isChanging ? "brightness(0.5)" : "brightness(0.8)",
                  }}
                />
                <div className="absolute inset-0">
                  {/* Multiple gradient overlays from all sides */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#070707]/80 via-[#070707]/40 to-transparent" /> {/* Top */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/80 to-transparent" /> {/* Bottom - strongest */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#070707]/70 via-[#070707]/30 to-transparent" /> {/* Left */}
                  <div className="absolute inset-0 bg-gradient-to-l from-[#070707]/70 via-[#070707]/30 to-transparent" /> {/* Right */}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-0 right-0 p-8 z-10 max-w-lg">
            <AnimatePresence mode="wait">
              {isFetching ? (
                <div className="space-y-4 w-full">
                  {/* Empty space for skeleton */}
                </div>
              ) : (
                <motion.div
                  key={featured.id}
                  variants={heroVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.5 }}
                  className="flex items-start gap-6"
                >
                  <div className="flex-1">
                    <motion.h1
                      className="text-4xl font-bold mb-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TypewriterText text={featured.title} />
                    </motion.h1>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-300">{featured.status}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-300">{featured.episodes}</span>
                      <div className="ml-2 flex items-center gap-1 bg-gray-800/50 px-2 py-0.5 rounded">
                        <Heart className="h-4 w-4 text-green-500 fill-green-500" />
                        <div>{featured.rating}</div>
                      </div>
                    </div>
                    <motion.p
                      className="text-gray-300 max-w-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ fontSize: "16px" }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                    >
                      {featured.description}
                    </motion.p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="hidden md:block"
                  >
                    <img
                      src={featured.thumbnail || "/placeholder.svg"}
                      alt={featured.title}
                      className="w-40 h-auto rounded-md shadow-lg"
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tab Navigation */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center mb-4 z-20">
            <div className="flex items-center rounded-full">
              <button
                onClick={() => handleTabChange("anime")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                  activeTab === "anime" ? "bg-white text-black" : "text-gray-300 hover:text-white",
                )}
              >
                Anime
              </button>
              <button
                onClick={() => handleTabChange("schedule")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                  activeTab === "schedule" ? "bg-white text-black" : "text-gray-300 hover:text-white",
                )}
              >
                Schedule
              </button>
              <button
                onClick={() => handleTabChange("manga")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                  activeTab === "manga" ? "bg-white text-black" : "text-gray-300 hover:text-white",
                )}
              >
                Manga
              </button>
            </div>
            <button
              className="right-8 bg-transparent p-2 rounded-full flex items-center gap-2 absolute"
              aria-label="Advanced search"
            >
              <Search className="h-5 w-5" />
              <span className="text-sm font-medium mr-1">Advanced search</span>
            </button>
          </div>
        </section>

        {/* Content based on active tab */}
        <div className="px-6 py-8">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading-skeleton"
                variants={contentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-10"
              >
                <CategorySkeleton count={8} />
                <CarouselSkeleton count={6} />
                <CarouselSkeleton count={4} />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeInOut" }}
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
              </motion.div>
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
