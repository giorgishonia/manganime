"use client"

import { useEffect, useState, useRef } from "react"
import { Star, ChevronRight, Play, Plus, Clock, Info, Calendar, Heart, CalendarDays } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion as m, AnimatePresence } from "framer-motion"
import { ImageSkeleton } from "@/components/image-skeleton"
import { getAllContent, getTrendingContent } from "@/lib/content"
import { CardSkeleton, CarouselSkeleton, CategorySkeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { hasAnimeBeenWatched, getAnimeProgress, getLatestEpisodeWatched, calculateAnimeProgressByEpisode } from "@/lib/watching-history"

// Helper function for drag scrolling
function setupDragScroll(element: HTMLDivElement | null) {
  if (!element) return () => {};
  
  let isDown = false;
  let startX: number;
  let scrollLeft: number;
  
  const mouseDown = (e: MouseEvent) => {
    isDown = true;
    element.classList.add("active", "cursor-grabbing");
    startX = e.pageX - element.offsetLeft;
    scrollLeft = element.scrollLeft;
  };
  
  const mouseLeave = () => {
    isDown = false;
    element.classList.remove("active", "cursor-grabbing");
  };
  
  const mouseUp = () => {
    isDown = false;
    element.classList.remove("active", "cursor-grabbing");
  };
  
  const mouseMove = (e: MouseEvent) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - element.offsetLeft;
    const walk = (x - startX) * 1;
    element.scrollLeft = scrollLeft - walk;
  };
  
  element.style.cursor = 'grab';
  
  element.addEventListener("mousedown", mouseDown);
  element.addEventListener("mouseleave", mouseLeave);
  element.addEventListener("mouseup", mouseUp);
  element.addEventListener("mousemove", mouseMove);
  
  return () => {
    element.removeEventListener("mousedown", mouseDown);
    element.removeEventListener("mouseleave", mouseLeave);
    element.removeEventListener("mouseup", mouseUp);
    element.removeEventListener("mousemove", mouseMove);
    element.style.cursor = 'default';
  };
}

// Helper function for auto scrolling
function setupAutoScroll(element: HTMLDivElement | null, interval: number) {
  if (!element || element.children.length <= 1) return () => {};
  
  const timer = setInterval(() => {
    const cardWidth = element.scrollWidth / element.children.length;
    const newScrollPosition = element.scrollLeft + cardWidth;
    
    if (newScrollPosition + element.clientWidth >= element.scrollWidth) {
      element.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      element.scrollTo({ left: newScrollPosition, behavior: "smooth" });
    }
  }, interval);
  
  return () => clearInterval(timer);
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.08,
      ease: [0.22, 1, 0.36, 1]
    } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  }
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

interface ContentItem {
  id: string;
  title: string;
  englishTitle?: string | null;
  description?: string | null;
  thumbnail: string;
  banner_image?: string;
  rating?: number;
  status?: string;
  episodes?: string;
  genres?: string[];
  type: 'anime';
  release_year?: number;
}

interface AnimeViewProps {
  selectedCategory?: string
  setSelectedCategory: (category: string) => void
  categories: string[]
  hoveredCard: string | null
  setHoveredCard: (id: string | null) => void
  animeData?: ContentItem[]
}

// Helper function to check if an anime is favorited
function isAnimeFavorited(animeId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    return !!favorites[`anime-${animeId}`];
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return false;
  }
}

// Helper function to toggle favorite status
function toggleAnimeFavorite(anime: ContentItem): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const animeKey = `anime-${anime.id}`;
    
    if (favorites[animeKey]) {
      // Remove from favorites
      delete favorites[animeKey];
      localStorage.setItem('favorites', JSON.stringify(favorites));
      return false;
    } else {
      // Add to favorites
      favorites[animeKey] = {
        id: anime.id,
        type: 'anime',
        title: anime.title,
        image: anime.thumbnail,
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

// Anime Card Component
function AnimeCard({ anime, index }: { anime: ContentItem; index: number }) {
  const router = useRouter();
  const hasBeenWatched = hasAnimeBeenWatched(anime.id);
  const latestEpisodeWatched = getLatestEpisodeWatched(anime.id);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Check favorite status on mount
  useEffect(() => {
    setIsFavorite(isAnimeFavorited(anime.id));
  }, [anime.id]);
  
  // Extract total episodes from anime data
  const totalEpisodes = anime.episodes ? 
    parseInt(anime.episodes.replace(/[^\d]/g, '')) || 0 : 0;
  
  // Calculate overall anime progress
  const progressPercentage = hasBeenWatched ? 
    calculateAnimeProgressByEpisode(latestEpisodeWatched, totalEpisodes) : 0;
  
  // Handle favorite click
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    const newStatus = toggleAnimeFavorite(anime);
    setIsFavorite(newStatus);
  };
  
  return (
    <m.div
      variants={itemVariants}
      layout
      className="relative group cursor-pointer"
      onClick={() => router.push(`/anime/${anime.id}`)}
      transition={{ delay: index * 0.05 }}
    >
      <m.div
        className="overflow-hidden rounded-lg bg-gray-900/60 border border-white/10 transition-colors duration-300 group-hover:border-purple-500/50"
        variants={cardHoverVariants}
        initial="initial"
        whileHover="hover"
      >
        <div className="aspect-[2/3] relative">
          <ImageSkeleton
            src={anime.thumbnail}
            alt={anime.title}
            className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
          />
          
          {/* Gradient overlay for text contrast */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none"></div>
          
          {/* "Watch" icon overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Play className="w-10 h-10 text-white/80 drop-shadow-lg" />
          </div>
          
          {/* Favorite button */}
          <button 
            onClick={handleFavoriteClick}
            className={`absolute top-2 left-14 z-10 bg-black/60 backdrop-blur-sm p-1.5 rounded-full 
              transition-all duration-300 border 
              ${isFavorite 
                ? 'opacity-100 border-red-500/50 bg-red-500/20' 
                : 'opacity-0 group-hover:opacity-100 border-white/10 hover:border-red-500/50'}`}
          >
            <m.div
              initial={{ scale: 1 }}
              animate={{ scale: isFavorite ? 1.2 : 1 }}
              whileTap={{ scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-white/90'}`} />
            </m.div>
          </button>
          
          {/* Rating Badge */}
          {anime.rating && anime.rating > 0 ? (
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md flex items-center gap-1 text-xs text-yellow-400 border border-white/10">
              <Star className="w-3 h-3 fill-current" />
              <span>{anime.rating.toFixed(1)}</span>
            </div>
          ) : null}
          
          {/* Episode Count Badge */}
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-xs text-white/90 border border-white/10">
            {anime.episodes || "0 ეპიზოდი"}
          </div>
          
          {/* Watching progress indicator if anime has been watched */}
          {hasBeenWatched && (
            <>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-600" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="absolute bottom-12 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 border border-purple-500/30">
                <span className="text-purple-400">{progressPercentage}%</span>
              </div>
            </>
          )}
          
          {/* Genre pills - show the first genre */}
          {anime.genres && anime.genres.length > 0 && (
            <div className="absolute bottom-2 right-2 flex flex-wrap gap-1 max-w-[calc(100%-1rem)]">
              <div className="text-xs px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded-full truncate max-w-full">
                {anime.genres[0]}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-3 space-y-1">
          <h3 className="text-sm font-semibold text-white truncate" title={anime.title}>
            {anime.title}
          </h3>
          {/* Show English title only if it exists and differs */}
          {anime.englishTitle && anime.englishTitle !== anime.title && (
            <p className="text-xs text-gray-400 truncate" title={anime.englishTitle}>
              {anime.englishTitle}
            </p>
          )}
          
          {/* Status info */}
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            {anime.status && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{anime.status}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Play className="w-3 h-3" />
              <span>{anime.episodes || "0 ეპიზოდი"}</span>
            </div>
            {anime.release_year && (
              <div className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                <span>{anime.release_year}</span>
              </div>
            )}
          </div>
        </div>
      </m.div>
    </m.div>
  );
}

export function AnimeView({
  selectedCategory = "ყველა",
  setSelectedCategory,
  categories,
  hoveredCard,
  setHoveredCard,
  animeData = [],
  items = [] // For backward compatibility
}: AnimeViewProps & { items?: ContentItem[] }) { // Add items prop for backward compatibility
  const router = useRouter()
  const categoriesRef = useRef<HTMLDivElement>(null)
  // Use either animeData or items (for backward compatibility)
  const dataToUse = animeData.length > 0 ? animeData : items
  const [localLoading, setLocalLoading] = useState(dataToUse.length === 0)
  const [localAnimeData, setLocalAnimeData] = useState<ContentItem[]>(dataToUse)
  
  // Ensure "ყველა" is set as the default category on initial render
  useEffect(() => {
    // Force "ყველა" to be the default selected category on first render
    if (selectedCategory !== "ყველა") {
      setSelectedCategory("ყველა");
    }
  }, []);
  
  // Filter anime based on selected category
  const filteredAnime = selectedCategory === "ყველა" 
    ? localAnimeData 
    : localAnimeData.filter(anime => anime.genres?.includes(selectedCategory))

  // Handle categories scroll
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesRef.current) {
      const container = categoriesRef.current;
      const scrollAmount = 250;
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  // Set up drag scrolling for categories
  useEffect(() => {
    if (categoriesRef.current) {
      const cleanup = setupDragScroll(categoriesRef.current);
      return cleanup;
    }
  }, []);

  // If neither animeData nor items is provided, fetch it
  useEffect(() => {
    if (dataToUse.length > 0) {
      setLocalAnimeData(dataToUse);
      setLocalLoading(false);
      return;
    }
    
    async function fetchData() {
      setLocalLoading(true);
      try {
        // Get anime from our database
        const response = await getAllContent('anime', 50);
        
        if (response.success && response.content) {
          const transformedData = response.content.map((content: any) => ({
            id: content.id,
            title: content.georgian_title || content.title,
            englishTitle: content.georgian_title ? content.title : null,
            description: content.description || "აღწერა არ არის ხელმისაწვდომი",
            thumbnail: content.thumbnail,
            banner_image: content.banner_image,
            rating: content.rating || 0,
            status: content.status,
            episodes: content.episodes_count ? `${content.episodes_count} ეპიზოდი` : "0 ეპიზოდი",
            genres: content.genres,
            type: 'anime',
            release_year: content.release_year
          }));
          
          setLocalAnimeData(transformedData);
        } else {
          console.error("Failed to fetch anime or no content:", response.error || "No content");
          setLocalAnimeData([]);
        }
      } catch (error) {
        console.error("Error fetching anime:", error);
        setLocalAnimeData([]);
      } finally {
        setTimeout(() => setLocalLoading(false), 300);
      }
    }
    
    fetchData();
  }, [dataToUse.length]);

  if (localLoading) {
    return (
      <div className="space-y-12">
        <CategorySkeleton count={8} />
        <CarouselSkeleton count={6} />
      </div>
    );
  }

  return (
    <m.div
      key={selectedCategory}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12"
    >
      {/* Categories filter */}
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white tracking-tight">ანიმეები</h2>
        </div>
        <div className="relative group">
          <div
            ref={categoriesRef}
            className="flex space-x-2 overflow-x-auto pb-3 scrollbar-hide"
          >
            {["ყველა", ...categories].map((category) => (
              <m.button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "relative px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200",
                  selectedCategory !== category && "text-gray-400 hover:text-white hover:bg-white/10",
                  selectedCategory === category && "text-white"
                )}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
              >
                {selectedCategory === category && (
                  <m.div
                    layoutId={`activeCategoryIndicator-anime`}
                    className="absolute inset-0 bg-gradient-to-r from-purple-600/50 to-indigo-600/50 border border-purple-500/40 rounded-lg z-0 shadow-inner shadow-purple-900/20"
                    initial={false}
                    animate={{ opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{category}</span>
              </m.button>
            ))}
          </div>
          
          {/* Navigation buttons */}
          <button
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 bg-black/40 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/60 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#070707] z-10"
            onClick={() => scrollCategories('left')}
          >
            <ChevronRight className="w-4 h-4 rotate-180 text-white/80" />
          </button>
          
          <button
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 bg-black/40 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/60 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#070707] z-10"
            onClick={() => scrollCategories('right')}
          >
            <ChevronRight className="w-4 h-4 text-white/80" />
          </button>
        </div>
      </div>

      {/* Anime grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">ხელმისაწვდომი ანიმე</h2>
        </div>
        
        {filteredAnime.length > 0 ? (
              <m.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
          >
            {filteredAnime.map((anime, index) => (
              <AnimeCard 
                key={anime.id}
                anime={anime} 
                index={index}
              />
            ))}
          </m.div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <p>ამ კატეგორიაში შედეგები არ მოიძებნა.</p>
          </div>
        )}
      </div>
    </m.div>
  );
}