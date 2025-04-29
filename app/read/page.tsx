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

// Manga grid card component
const MangaCard = ({ manga, index }: { manga: MangaData, index: number }) => {
  const router = useRouter()
  const hasBeenRead = hasMangaBeenRead(manga.id)
  const progress = getMangaProgress(manga.id)
  
  // Get the latest chapter read
  const latestChapterRead = getLatestChapterRead(manga.id)
  
  // Extract total chapters from manga data
  const totalChapters = manga.totalChapters || 
    (manga.chapters ? parseInt(manga.chapters.toString(), 10) : 0) || 10
  
  // Calculate overall manga progress based on chapters
  const progressPercentage = calculateMangaProgressByChapter(latestChapterRead, totalChapters)
  
  return (
    <m.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ delay: index * 0.05 }}
      className="group cursor-pointer"
      onClick={() => router.push(`/manga/${manga.id}`)}
    >
      <div className="relative overflow-hidden rounded-lg bg-black/20 shadow-lg group-hover:shadow-xl transition-all duration-300 border border-white/5 group-hover:border-purple-500/30">
        <div className="aspect-[2/3] relative overflow-hidden">
          <m.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="h-full w-full"
          >
            <Image 
              src={manga.thumbnail || "/placeholder.svg"} 
              alt={manga.title}
              fill
              className="object-cover transition-all duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </m.div>
          
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>
          
          {/* Reading progress indicator */}
          {hasBeenRead && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-900">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-600" 
                style={{ 
                  width: `${progressPercentage}%` 
                }}
              />
            </div>
          )}
          
          {/* Reading badge */}
          {hasBeenRead && (
            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 border border-purple-500/30">
              <span className="text-purple-400">{progressPercentage}% Read</span>
            </div>
          )}
          
          {/* Rating badge */}
          {manga.rating > 0 && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              {manga.rating.toFixed(1)}
            </div>
          )}
          
          {/* Genre pills */}
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 max-w-[calc(100%-1rem)]">
            {manga.genres?.slice(0, 2).map((genre, idx) => (
              <div key={idx} className="text-xs px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded-full truncate max-w-full">
                {genre}
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">
            {manga.title}
          </h3>
          {manga.englishTitle && (
            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{manga.englishTitle}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{manga.status}</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              <span>{manga.chapters}</span>
            </div>
          </div>
        </div>
      </div>
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
          const transformedManga = mangaResponse.content.map((content: any) => ({
            id: content.id,
            title: content.georgian_title || content.title,
            englishTitle: content.georgian_title ? content.title : null,
            description: content.description || "No description available",
            image: content.banner_image || content.thumbnail,
            thumbnail: content.thumbnail,
            rating: content.rating || 0,
            status: content.status,
            chapters: content.chapters ? `${content.chapters} chapters` : "Ongoing",
            totalChapters: typeof content.chapters === 'number' ? content.chapters : 
              (typeof content.chapters === 'string' ? parseInt(content.chapters, 10) : 10),
            genres: content.genres || [],
            release_year: content.release_year
          })).filter((content: {image?: string}) => content.image);
          
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
    chapters: "Loading",
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

  return (
    <div className="flex min-h-screen bg-[#070707] text-white antialiased">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden">
        {/* Featured Banner */}
        <section className="relative w-full h-[500px] overflow-hidden">
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
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-transparent" />
                <div className="absolute inset-0 bg-[#070707]/30" />

                {/* Background particles/accents */}
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
              </m.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-12 left-8 pl-32 z-10 max-w-2xl">
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
                  <div className="flex-1 w-full relative z-10 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-xs font-semibold px-2.5 py-0.5 rounded-full text-white shadow-glow-purple">რჩეული მანგა</span>
                      <TrendingUp className="h-4 w-4 text-purple-400" />
                    </div>
                    
                    <div className="flex items-start gap-6 mb-4">
                      {featured.thumbnail && (
                        <div className="h-50 w-40 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0 transform hover:scale-105 transition-transform duration-300">
                          <img
                            src={featured.thumbnail || "/placeholder.svg"}
                            alt={featured.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex flex-col justify-start">
                        <m.h1
                          className="text-3xl font-bold text-glow text-white mb-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          <TypewriterText text={featured.title} />
                        </m.h1>
                        
                        {featured.englishTitle && (
                          <m.h2
                            className="text-xl text-gray-400 mb-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                          >
                            {featured.englishTitle}
                          </m.h2>
                        )}
                        
                        <div className="flex items-center gap-3 mb-3">
                          <div className="pill-button text-sm flex items-center gap-1.5 bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{featured.status}</span>
                          </div>
                          <div className="pill-button text-sm flex items-center gap-1.5 bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>{featured.chapters}</span>
                          </div>
                          <div className="pill-button text-sm flex items-center gap-1.5 bg-purple-900/20 backdrop-blur-md border border-purple-500/20 px-3 py-1 rounded-full">
                            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="font-medium">{featured.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        
                        <m.div
                          className="scrollable-content mb-4 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          <p className="text-md mb-4 leading-relaxed max-w-md text-gray-300">
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
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-full flex items-center gap-2 shadow-lg shadow-purple-600/20 transform hover:translate-y-[-2px] transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push(`/manga/${featured.id}`)}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <BookOpen className="h-4 w-4" />
                        წაიკითხეთ ახლავე
                      </m.button>
                      
                      <m.button 
                        className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white font-medium rounded-full flex items-center gap-2 border border-white/10 hover:bg-white/15 transition-colors duration-300"
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <BookMarked className="h-4 w-4" />
                        სანიშნე
                      </m.button>
                    </m.div>
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
        <section className="px-8 py-8 pl-[100px]">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">მანგის ბიბლიოთეკა</h2>
              
              <div className="flex items-center gap-4">
                {/* Search input */}
                <div className="relative">
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
                    <Button variant="outline" size="sm" className="bg-black/30 border-white/10 rounded-full h-9 flex items-center gap-2">
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
                    "bg-black/30 border-white/10 rounded-full h-9",
                    filterOpen && "bg-purple-900/20 border-purple-500/30 text-purple-400"
                  )}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <span>ფილტრი</span>
                </Button>
                
                {/* View toggle */}
                <div className="flex rounded-full overflow-hidden border border-white/10 bg-black/30">
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
            
            {/* Manga grid/list */}
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
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
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
                            {manga.englishTitle && (
                              <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{manga.englishTitle}</p>
                            )}
                            
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{manga.status}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                <span>{manga.chapters}</span>
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
          <section className="pt-8 px-8 pl-[100px]">
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
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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