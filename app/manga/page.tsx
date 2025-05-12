"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion as m, AnimatePresence } from "framer-motion"
import { 
  ChevronRight, 
  Search, 
  Heart, 
  BookOpen, 
  Star, 
  CalendarDays, 
  Clock, 
  Filter,
  SortDesc,
  ArrowUpDown,
  X,
  TrendingUp,
  BookMarked,
  Grid,
  List
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { TypewriterText } from "@/components/typewriter-text"
import { getAllContent } from "@/lib/content"
import { BannerSkeleton, CarouselSkeleton, CategorySkeleton } from "@/components/ui/skeleton"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import Link from "next/link"
import { hasMangaBeenRead, getMangaProgress, getRecentlyRead, getLatestChapterRead, calculateMangaProgressByChapter } from "@/lib/reading-history"

// Add custom CSS
import "./read-page.css"

// Define interface for manga data
interface MangaData {
  id: string
  title: string
  englishTitle?: string | null
  description: string
  image: string
  thumbnail: string
  rating: number
  status: string
  chapters: string
  genres: string[]
  release_year?: number
  totalChapters?: number
}

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

const heroVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 1.05, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

const filterVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

const cardHoverVariants = {
  initial: { scale: 1, y: 0, boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)" },
  hover: { 
    scale: 1.03,
    y: -6,
    boxShadow: "0px 15px 25px rgba(99, 102, 241, 0.2), 0px 5px 10px rgba(0,0,0, 0.1)",
    transition: { 
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Helper function to check if content is favorited
function isMangaFavorited(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    return !!favorites[`manga-${id}`];
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return false;
  }
}

// Helper function to toggle favorite status
function toggleMangaFavorite(manga: MangaData): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const mangaKey = `manga-${manga.id}`;
    
    if (favorites[mangaKey]) {
      // Remove from favorites
      delete favorites[mangaKey];
      localStorage.setItem('favorites', JSON.stringify(favorites));
      return false;
    } else {
      // Add to favorites
      favorites[mangaKey] = {
        id: manga.id,
        type: 'manga',
        title: manga.title,
        image: manga.thumbnail,
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

// Manga grid card component
const MangaCard = ({ manga, index }: { manga: MangaData, index: number }) => {
  const router = useRouter()
  const hasBeenRead = hasMangaBeenRead(manga.id)
  const [isFavorite, setIsFavorite] = useState(false)
  
  // Check favorite status on mount
  useEffect(() => {
    setIsFavorite(isMangaFavorited(manga.id));
  }, [manga.id]);
  
  // Get the latest chapter read
  const latestChapterRead = getLatestChapterRead(manga.id)
  
  // Use the pre-calculated totalChapters from MangaData
  const totalChapters = manga.totalChapters || 0;
  
  // Calculate overall manga progress based on chapters
  const progressPercentage = calculateMangaProgressByChapter(latestChapterRead, totalChapters)
  
  // Handle favorite button click
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    const newStatus = toggleMangaFavorite(manga);
    setIsFavorite(newStatus);
  };
  
  return (
    <m.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className="relative group cursor-pointer"
      onClick={() => router.push(`/manga/${manga.id}`)}
      transition={{ delay: index * 0.05 }}
    >
      <m.div
        className="relative overflow-hidden rounded-xl bg-transparent transition-all duration-300 group-hover:border-purple-500/70 group-hover:shadow-2xl group-hover:shadow-purple-500/20 flex flex-col flex-grow"
        variants={cardHoverVariants}
        initial="initial"
        whileHover="hover"
      >
        <div className="aspect-[2/3] relative overflow-hidden">
          <Image 
            src={manga.thumbnail || "/placeholder.svg"} 
            alt={manga.title}
            fill
            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/70 to-transparent pointer-events-none"></div>
          
          {/* BookOpen icon overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <BookOpen className="w-12 h-12 text-white/90 drop-shadow-lg" />
          </div>

          {/* Favorite button - Top Right */}
          <button 
            onClick={handleFavoriteClick}
            className={cn(
              "absolute top-2.5 right-2.5 z-20 p-2 rounded-full transition-all duration-300 backdrop-blur-md border",
              isFavorite 
                ? "bg-red-500/30 border-red-500/50 text-red-400" 
                : "bg-black/50 border-white/20 text-white/80 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40",
              "opacity-0 group-hover:opacity-100" // Initially hidden, shows on group hover
            )}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <m.div
              initial={{ scale: 1 }}
              animate={{ scale: isFavorite ? 1.1 : 1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 12 }}
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
            </m.div>
          </button>

          {/* Rating badge - Top Left */}
          {manga.rating > 0 && (
            <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1 text-xs text-yellow-400 border border-yellow-500/30 shadow-md">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="font-semibold">{manga.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Chapter Count Badge - Bottom Left on Image */}
          <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs text-white/90 border border-white/20 shadow-md">
             {manga.chapters || "0 თავი"} 
          </div>
          
          {/* Reading progress indicator bar */}
          {hasBeenRead && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-700/50">
              <m.div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg" 
                style={{ width: `${progressPercentage}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          )}
          
          {/* Genre pills - show first one - Bottom Right on Image */}
          {manga.genres && manga.genres.length > 0 && (
            <div className="absolute bottom-2.5 right-2.5 flex flex-wrap gap-1 max-w-[calc(100%-1rem)]"> 
              <div className="text-xs px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-lg truncate max-w-full border border-white/20 shadow-md">
                {manga.genres[0]}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-3.5 space-y-1.5">
          <h3 className="text-base font-semibold text-white line-clamp-1 group-hover:text-purple-400 transition-colors duration-200" title={manga.title}>
            {manga.title}
          </h3>
          {manga.englishTitle && manga.englishTitle !== manga.title && (
            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5" title={manga.englishTitle}>{manga.englishTitle}</p>
          )}
          <div className="flex items-center gap-3 pt-1 text-xs text-gray-400">
            {manga.status && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>{manga.status}</span>
              </div>
            )}
            {manga.release_year && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-gray-500" />
                <span>{manga.release_year}</span>
              </div>
            )}
          </div>
        </div>
      </m.div>
    </m.div>
  )
}

export default function ReadPage() {
  // State
  const [featuredMangas, setFeaturedMangas] = useState<MangaData[]>([])
  const [mangas, setMangas] = useState<MangaData[]>([])
  const [currentFeatured, setCurrentFeatured] = useState(0)
  const [isChanging, setIsChanging] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<string>("popular")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [availableGenres, setAvailableGenres] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [isFeaturedFavorite, setIsFeaturedFavorite] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Add state for recently read manga
  const [recentlyRead, setRecentlyRead] = useState<any[]>([])
  
  // Fetch data
  useEffect(() => {
    async function fetchMangas() {
      try {
        // Fetch all available manga
        const mangaResponse = await getAllContent('manga', 100);
        
        if (mangaResponse.success && mangaResponse.content) {
          // Transform data for manga
          const transformedManga = mangaResponse.content.map((content: any) => {
            const chapterCount = typeof content.chapters_count === 'number' ? content.chapters_count :
                                 (typeof content.chapters === 'number' ? content.chapters : 
                                 (typeof content.chapters === 'string' ? parseInt(content.chapters.replace(/[^\d]/g, ''), 10) : 0));
            
            return {
              id: content.id,
              title: content.georgian_title || content.title,
              englishTitle: content.georgian_title ? content.title : null,
              description: content.description || "No description available",
              image: (content.bannerImage && content.bannerImage.trim() !== '') ? content.bannerImage : content.thumbnail,
              thumbnail: content.thumbnail,
              rating: content.rating || 0,
              status: content.status,
              chapters: chapterCount > 0 ? `${chapterCount} თავი` : "0 თავი", // Display string
              totalChapters: chapterCount, // Numeric value for calculations
              genres: content.genres || [],
              release_year: content.release_year
            }
          }).filter((content: {image?: string}) => content.image);
          
          setMangas(transformedManga);
          
          // Extract all unique genres
          const genres = new Set<string>();
          transformedManga.forEach((manga: MangaData) => {
            manga.genres?.forEach(genre => genres.add(genre));
          });
          setAvailableGenres(Array.from(genres).sort());
          
          // Use top rated mangas for featured
          const topRated = [...transformedManga]
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 5);
            
          setFeaturedMangas(topRated);
        }
        
        setIsFetching(false);
        
        // Small delay before removing loading state
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      } catch (error) {
        console.error("Error fetching manga data:", error);
        setIsFetching(false);
        setIsLoading(false);
      }
    }
    
    fetchMangas();
  }, []);

  // Change featured content every 7 seconds
  useEffect(() => {
    if (featuredMangas.length === 0) return;
    
    const interval = setInterval(() => {
      setIsChanging(true)
      setTimeout(() => {
        setCurrentFeatured((prev) => (prev + 1) % featuredMangas.length)
        setIsChanging(false)
      }, 500)
    }, 7000)

    return () => clearInterval(interval)
  }, [featuredMangas]);
  
  // Sort manga based on current sort option
  const sortedMangas = [...mangas].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return b.rating - a.rating;
      case "newest":
        return (b.release_year || 0) - (a.release_year || 0);
      case "a-z":
        return a.title.localeCompare(b.title);
      case "z-a":
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });
  
  // Filter manga based on selected genres and search query
  const filteredMangas = sortedMangas.filter(manga => {
    // Filter by search query
    const matchesSearch = searchQuery === "" || 
      manga.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (manga.englishTitle && manga.englishTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by selected genres
    const matchesGenres = selectedGenres.length === 0 || 
      selectedGenres.every(genre => manga.genres?.includes(genre));
    
    return matchesSearch && matchesGenres;
  });
  
  // Get featured manga
  const featured = featuredMangas[currentFeatured] || {
    id: "",
    title: "Loading...",
    description: "Loading content...",
    image: "/placeholder.svg",
    thumbnail: "/placeholder.svg",
    rating: 0,
    status: "Loading",
    chapters: "0 chapters",
    genres: []
  };

  // Fetch recently read manga from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const history = getRecentlyRead(5); // Get 5 most recently read manga
      
      // Map the reading progress to match our manga data format
      const readItems = history.map(item => ({
        id: item.mangaId,
        title: item.mangaTitle,
        thumbnail: item.mangaThumbnail,
        chapters: `Chapter ${item.chapterNumber}`,
        status: item.currentPage === item.totalPages ? "Completed" : "In Progress",
        readDate: new Date(item.lastRead).toLocaleDateString(),
        readProgress: Math.round((item.currentPage / item.totalPages) * 100),
        currentPage: item.currentPage,
        totalPages: item.totalPages,
        chapterTitle: item.chapterTitle,
        chapterNumber: item.chapterNumber,
      }));
      
      setRecentlyRead(readItems);
    }
  }, []);

  // Update featured favorite status when it changes
  useEffect(() => {
    if (featured?.id) {
      setIsFeaturedFavorite(isMangaFavorited(featured.id));
    }
  }, [featured?.id]);
  
  // Handle toggling favorite for featured manga
  const handleFeaturedFavoriteToggle = () => {
    if (!featured) return;
    
    const newStatus = toggleMangaFavorite(featured);
    setIsFeaturedFavorite(newStatus);
  };

  return (
    <div className="flex min-h-screen bg-[#070707] text-white antialiased">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden md:pl-[100px]">
        {/* Featured Banner */}
        <section className="relative w-full h-[500px] overflow-hidden">
          {/* --- DEBUG LOG --- */}
          {/* {(() => { console.log("[app/manga/page.tsx] Rendering Banner. featured.image:", featured?.image); return null; })()} */}
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
                
                {/* Enhanced gradient overlays for a perfect transition */}
                {/* Main vertical gradient - much stronger at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/80 to-transparent opacity-90" />
                {/* Side gradient for text contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-transparent to-transparent opacity-50" />
                {/* Stronger bottom gradient for completely seamless transition */}
                <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#070707] to-transparent" />
                {/* Extra intense gradient at the very bottom for perfect blending */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-[#070707]" style={{ maskImage: 'linear-gradient(to top, #070707, transparent)', WebkitMaskImage: 'linear-gradient(to top, #070707, transparent)' }} />
                {/* Subtle texture overlay */}
                <div className="absolute inset-0 bg-[#070707]/20" />

                {/* Background particles/accents */}
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
              </m.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-0 left-0 right-0 md:bottom-12 z-10 p-6 md:p-8">
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
                  className="w-full"
                >
                  <div className="relative w-full md:max-w-5xl rounded-t-xl md:rounded-xl overflow-hidden">
                    {/* Top pill badge for trending */}
                    <div className="absolute top-0 right-0 left-0 flex justify-center">
                      <m.div 
                        className="text-white px-6 py-1.5 rounded-b-xl transform -translate-y-px"
                        initial={{ y: -20 }}
                        animate={{ y: 0 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-purple-300" />
                          <span className="font-medium text-sm tracking-wide">ტრენდულია</span>
                        </div>
                      </m.div>
                    </div>
                    
                    {/* Main content with glass effect */}
                    <div className="flex flex-col md:flex-row items-start gap-8 p-6 md:p-8 pt-10 relative z-10">
                      {/* Left side - Image */}
                      <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full md:w-auto flex justify-center md:block"
                      >
                        <Link href={`/manga/${featured.id}`} className="block relative group/thumbnail">
                          <div 
                            className="w-40 h-56 md:w-48 md:h-72 rounded-xl overflow-hidden border-2 border-white/10 shadow-white/20 shadow-[0_0_25px_rgba(139,92,246,0.3)] group/thumbnail cursor-pointer relative"
                          >
                            {/* Favorite button positioned at top right */}
                            <m.button
                              className={`absolute top-2 right-2 z-30 p-1.5 rounded-full backdrop-blur-sm shadow-lg transition-all duration-300 ${
                                isFeaturedFavorite 
                                  ? "bg-red-500/20 border border-red-500/50 text-red-400" 
                                  : "bg-black/50 border border-white/10 text-white opacity-0 group-hover/thumbnail:opacity-100"
                              }`}
                              whileTap={{ scale: 0.95 }}
                              whileHover={{ scale: 1.1 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFeaturedFavoriteToggle();
                              }}
                            >
                              <Heart className={`h-4 w-4 ${isFeaturedFavorite ? "fill-red-500 text-red-400" : ""}`} />
                            </m.button>
                            
                            <m.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.3 }}
                              className="w-full h-full relative"
                            >
                              <img
                                src={featured.thumbnail || "/placeholder.svg"}
                                alt={featured.title}
                                className="w-full h-full object-cover transition-all duration-300 group-hover/thumbnail:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover/thumbnail:opacity-100 transition-opacity duration-300"></div>
                            </m.div>
                          </div>
                        </Link>
                      </m.div>
                      
                      {/* Right side - Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title animation with gradient text */}
                        <m.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                          className="group/title"
                        >
                          <Link href={`/manga/${featured.id}`} className="block">
                            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80 leading-tight group-hover/title:text-purple-400 transition-colors">
                              <TypewriterText text={featured.title} />
                            </h1>
                            
                            {/* Show English title if it exists */}
                            {featured.englishTitle && (
                              <h2 className="text-lg md:text-xl font-medium text-gray-400 mt-1 group-hover/title:text-purple-400 transition-colors">
                                {featured.englishTitle}
                              </h2>
                            )}
                          </Link>
                        </m.div>
                        
                        {/* Content meta info with enhanced style */}
                        <m.div 
                          className="flex flex-wrap items-center gap-3 my-4"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.4 }}
                        >

                            {featured.rating > 0 && (
                            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-800/30 to-amber-800/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-yellow-500/20 shadow-sm">
                              <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                              <span className="text-sm font-medium text-white">{featured.rating.toFixed(1)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10">
                            <BookOpen className="h-4 w-4 text-purple-400" />
                            <span className="text-sm font-medium text-white">{featured.chapters || "0 თავი"}</span>
                          </div>
                          
                          {featured.release_year && (
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10">
                              <CalendarDays className="h-4 w-4 text-purple-400" />
                              <span className="text-sm font-medium text-white">{featured.release_year}</span>
                            </div>
                          )}
                          
                          {featured.genres && featured.genres.slice(0, 3).map((genre, i) => (
                            <div key={i} className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 shadow-sm">
                              <span className="text-sm font-medium text-white/80">{genre}</span>
                            </div>
                          ))}
                        </m.div>
                        
                        {/* Description with text fade mask effect */}
                        <m.div
                          className="relative mt-3 mb-6"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                        >
                          <div className="max-h-[80px] md:max-h-[100px] overflow-y-auto no-scrollbar"
                            style={{
                              maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                              WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)'
                            }}
                          >
                            <p className="text-sm md:text-base leading-relaxed text-gray-300">{featured.description}</p>
                          </div>
                        </m.div>
                        
                        {/* Action buttons with enhanced style - Removed favorite button */}
                        <m.div
                          className="flex flex-wrap gap-4 mt-6"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.6 }}
                        >
                          {/* Buttons can be added here if needed */}
                        </m.div>
                      </div>
                    </div>
                    
                    {/* Background effects */}
                    
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Featured content pagination dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
            <m.div 
              className="flex gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {featuredMangas.map((_, index) => (
                <m.button
                  key={`dot-${index}`}
                  className={`rounded-full transition-all duration-300 ${
                    currentFeatured === index 
                      ? 'bg-white/70 w-[22px] h-[10px]'
                      : 'bg-white/30 w-2.5 h-2.5 hover:bg-white/50'
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

        {/* Manga Catalog Section */}
        <section className="px-4 md:px-8 py-8">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col"
          >
            {/* Controls: Search, Sort, Filter - Stack on mobile */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold self-start md:self-center">მანგის ბიბლიოთეკა</h2>
              
              {/* Wrap controls for better stacking */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {/* Search input - Make full width on mobile */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="მანგის ძიება..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm w-64 focus:outline-none focus:border-purple-500/50"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                
                {/* Sort dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto bg-black/30 border-white/10 rounded-full h-9 flex items-center justify-center sm:justify-start gap-2">
                      <SortDesc className="h-4 w-4" />
                      <span>დალაგება</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40 bg-gray-900/95 backdrop-blur-md border-white/10 text-white">
                    <DropdownMenuLabel>დალაგების ვარიანტები</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className={sortBy === "popular" ? "bg-purple-500/10 text-purple-400" : ""}
                      onClick={() => setSortBy("popular")}
                    >
                      Popularity
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={sortBy === "newest" ? "bg-purple-500/10 text-purple-400" : ""}
                      onClick={() => setSortBy("newest")}
                    >
                      უახლესი
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={sortBy === "a-z" ? "bg-purple-500/10 text-purple-400" : ""}
                      onClick={() => setSortBy("a-z")}
                    >
                      სათაური (ა-ჰ)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={sortBy === "z-a" ? "bg-purple-500/10 text-purple-400" : ""}
                      onClick={() => setSortBy("z-a")}
                    >
                      სათაური (ჰ-ა)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Filter button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={cn(
                    "w-full sm:w-auto bg-black/30 border-white/10 rounded-full h-9",
                    filterOpen && "bg-purple-900/20 border-purple-500/30 text-purple-400"
                  )}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <span>ფილტრი</span>
                </Button>
                
                {/* View toggle */}
                <div className="flex rounded-full overflow-hidden border border-white/10 bg-black/30 w-full sm:w-auto justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "h-9 px-3 rounded-none",
                      viewMode === "grid" ? "bg-white/10 text-white" : "text-gray-400"
                    )}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "h-9 px-3 rounded-none",
                      viewMode === "list" ? "bg-white/10 text-white" : "text-gray-400"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Filter panel */}
            <AnimatePresence>
              {filterOpen && (
                <m.div
                  variants={filterVariants}
                  initial="initial"
                  animate="animate"
                  exit="initial"
                  className="mb-6 p-4 bg-gradient-to-br from-gray-900/40 to-gray-800/20 backdrop-blur-md rounded-xl border border-white/5 shadow-lg"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium flex items-center">
                      <Filter className="h-4 w-4 mr-2 text-purple-400" />
                      ფილტრი ჟანრის მიხედვით
                    </h3>
                    
                    {selectedGenres.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedGenres([])}
                        className="h-8 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        ყველას გასუფთავება
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {availableGenres.map((genre) => (
                      <Badge
                        key={genre}
                        variant="outline"
                        className={cn(
                          "cursor-pointer hover:bg-white/10 transition-all duration-300",
                          selectedGenres.includes(genre) 
                            ? "bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-glow-sm-purple" 
                            : "bg-black/30 hover:border-white/30"
                        )}
                        onClick={() => {
                          if (selectedGenres.includes(genre)) {
                            setSelectedGenres(selectedGenres.filter(g => g !== genre));
                          } else {
                            setSelectedGenres([...selectedGenres, genre]);
                          }
                        }}
                      >
                        {genre}
                        {selectedGenres.includes(genre) && (
                          <X className="ml-1 h-3 w-3" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
            
            {/* Content stats and info */}
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing <span className="text-white font-medium">{filteredMangas.length}</span> manga titles
                {selectedGenres.length > 0 && (
                  <> filtered by <span className="text-purple-400">{selectedGenres.length} genre{selectedGenres.length !== 1 && 's'}</span></>
                )}
                {searchQuery && (
                  <> matching "<span className="text-purple-400">{searchQuery}</span>"</>
                )}
              </div>
              
              <div className="text-sm text-gray-400">
                Sorted by <span className="text-purple-400">
                  {sortBy === "popular" ? "Popularity" : 
                   sortBy === "newest" ? "Newest" :
                   sortBy === "a-z" ? "Title (A-Z)" : "Title (Z-A)"}
                </span>
              </div>
            </div>
            
            {/* Manga grid/list - Adjust grid columns */}
            <AnimatePresence mode="wait">
              {isLoading ? (
                <CategorySkeleton count={12} />
              ) : (
                <m.div
                  key={`view-${viewMode}-sort-${sortBy}-filter-${selectedGenres.join()}-search-${searchQuery}`}
                  variants={contentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className={cn(
                    viewMode === "grid" 
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4" // Responsive columns
                      : "flex flex-col gap-3"
                  )}
                >
                  {filteredMangas.length > 0 ? (
                    viewMode === "grid" ? (
                      filteredMangas.map((manga, index) => (
                        <MangaCard 
                          key={manga.id} 
                          manga={manga} 
                          index={index}
                        />
                      ))
                    ) : (
                      filteredMangas.map((manga, index) => (
                        <m.div
                          key={manga.id}
                          variants={cardVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={{ delay: index * 0.03 }}
                          className="group cursor-pointer bg-black/20 hover:bg-black/40 border border-white/5 hover:border-purple-500/20 rounded-lg overflow-hidden transition-all p-3 flex gap-4"
                          onClick={() => router.push(`/manga/${manga.id}`)}
                        >
                          <div className="w-16 h-24 rounded-md overflow-hidden flex-shrink-0">
                            <Image
                              src={manga.thumbnail || "/placeholder.svg"}
                              alt={manga.title}
                              width={64}
                              height={96}
                              className="object-cover h-full w-full"
                            />
                          </div>
                          
                          <div className="flex-1 overflow-hidden">
                            <h3 className="font-medium text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">
                              {manga.title}
                            </h3>
                            {manga.englishTitle && manga.englishTitle !== manga.title && (
                              <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{manga.englishTitle}</p>
                            )}
                            
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{manga.status}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                <span>{manga.chapters || "0 chapters"}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-400" />
                                <span>{manga.rating.toFixed(1)}</span>
                              </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 line-clamp-2 mt-2">
                              {manga.description}
                            </p>
                            
                            <div className="flex flex-wrap gap-1 mt-2">
                              {manga.genres?.slice(0, 3).map((genre, idx) => (
                                <div key={idx} className="text-xs px-1.5 py-0.5 bg-black/40 rounded-sm">
                                  {genre}
                                </div>
                              ))}
                            </div>
                          </div>
                        </m.div>
                      ))
                    )
                  ) : (
                    <div className="col-span-full py-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/50 mb-4">
                        <Search className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">მანგა ვერ მოიძებნა</h3>
                      <p className="text-gray-400 max-w-md mx-auto mb-4">
                        ვერ ვიპოვეთ მანგა, რომელიც შეესაბამება თქვენს ფილტრებს. სცადეთ ძიების ან ფილტრის პარამეტრების შეცვლა.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedGenres([]);
                          setSortBy("popular");
                        }}
                      >
                        ყველა ფილტრის გასუფთავება
                      </Button>
                    </div>
                  )}
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        </section>

                {/* Continue Reading Section (if user has reading history) */}
                {recentlyRead.length > 0 && (
          <section className="pt-8 px-4 md:px-8"> {/* Adjusted padding */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center text-white">
                  კითხვის გაგრძელება
                </h2>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white group"
                  onClick={() => router.push("/history")}
                >
                  ყველას ნახვა <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              
              {/* Responsive grid for continue reading */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {recentlyRead.map((item, index) => (
                  <m.div
                    key={`recent-${item.id}-${index}`}
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ delay: index * 0.05 }}
                    className="group cursor-pointer bg-black/30 hover:bg-black/40 border border-white/5 hover:border-purple-500/30 rounded-lg overflow-hidden flex flex-col transition-all shadow-lg hover:shadow-purple-500/5"
                    onClick={() => router.push(`/manga/${item.id}`)}
                    whileHover={{ y: -5 }}
                  >
                    <div className="relative aspect-[2/3]">
                      <Image
                        src={item.thumbnail || "/placeholder.svg"}
                        alt={item.title}
                        fill
                        className="object-cover transition-all duration-500 group-hover:scale-105"
                      />
                      
                      {/* Reading progress bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 shadow-glow-sm-purple" 
                          style={{ 
                            width: `${item.readProgress}%` 
                          }}
                        />
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90"></div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">
                          {item.title}
                        </h3>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-purple-400 mt-1">
                            Chapter {item.chapterNumber}: {item.chapterTitle}
                          </p>
                          <p className="text-xs text-indigo-400 mt-1">
                            {item.readProgress}% Complete
                          </p>
                        </div>
                      </div>
                      
                      <m.button
                        className="absolute top-2 right-2 p-2 rounded-full bg-purple-600 shadow-lg shadow-purple-900/30 opacity-0 group-hover:opacity-100 transition-opacity"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/manga/${item.id}?resume=true&page=${item.currentPage}`);
                        }}
                      >
                        <BookOpen className="w-4 h-4 text-white" />
                      </m.button>
                    </div>
                    
                    <div className="p-3 flex items-center justify-between mt-auto bg-black/40 backdrop-blur-sm">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          Page {item.currentPage}/{item.totalPages} • Ch. {item.chapterNumber}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">{item.readDate}</div>
                    </div>
                  </m.div>
                ))}
              </div>
            </m.div>
          </section>
        )}
      </main>
    </div>
  )
}

// Animation variants for staggered children
const contentVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  exit: { opacity: 0 }
}; 