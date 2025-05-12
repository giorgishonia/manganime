"use client"

import { useEffect, useState, useRef } from "react"
import { Star, ChevronRight, BookOpen, Plus, Clock, Info, Calendar, Heart, CalendarDays } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion as m, AnimatePresence } from "framer-motion"
import { ImageSkeleton } from "@/components/image-skeleton"
import { getAllContent, getTrendingContent } from "@/lib/content"
import { CardSkeleton, CarouselSkeleton, CategorySkeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { hasMangaBeenRead, getMangaProgress, getLatestChapterRead, calculateMangaProgressByChapter } from "@/lib/reading-history"

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

// Update interface to match ContentItem structure from page.tsx
interface ContentItem {
  id: string;
  title: string;
  englishTitle?: string | null;
  description?: string | null;
  thumbnail: string;
  banner_image?: string;
  rating?: number;
  status?: string;
  chapters?: string;
  genres?: string[];
  type: 'manga';
  release_year?: number;
  totalChapters?: number;
}

interface MangaViewProps {
  selectedCategory?: string
  setSelectedCategory: (category: string) => void
  categories: string[]
  hoveredCard: string | null
  setHoveredCard: (id: string | null) => void
  mangaData?: ContentItem[]
}

// Helper function to check if a manga is favorited
function isMangaFavorited(mangaId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    return !!favorites[`manga-${mangaId}`];
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return false;
  }
}

// Helper function to toggle favorite status
function toggleMangaFavorite(manga: ContentItem): boolean {
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

// Manga Card Component 
function MangaCard({ manga, index }: { manga: ContentItem; index: number }) {
  const router = useRouter();
  const hasBeenRead = hasMangaBeenRead(manga.id);
  const latestChapterRead = getLatestChapterRead(manga.id);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Check favorite status on mount
  useEffect(() => {
    setIsFavorite(isMangaFavorited(manga.id));
  }, [manga.id]);
  
  // Extract total chapters from manga data
  // First check if totalChapters is already available as a numeric property
  // Otherwise parse it from the chapters string
  const totalChapters = manga.totalChapters !== undefined ? manga.totalChapters : 
    (manga.chapters ? parseInt(manga.chapters.replace(/[^\d]/g, '')) || 0 : 0);
  
  // Calculate overall manga progress
  const progressPercentage = hasBeenRead ? 
    calculateMangaProgressByChapter(latestChapterRead, totalChapters) : 0;
  
  // Format chapters display text
  const chaptersDisplay = manga.chapters || (totalChapters > 0 ? `${totalChapters} თავი` : "0 თავი");
    
  // Handle favorite click
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    const newStatus = toggleMangaFavorite(manga);
    setIsFavorite(newStatus);
  };
  
  return (
    <m.div
      variants={itemVariants}
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
          <ImageSkeleton
            src={manga.thumbnail}
            alt={manga.title}
            className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
          />
          
          {/* Gradient overlay for text contrast at the bottom of image */}
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
          
          {/* Rating Badge - Top Left */}
          {manga.rating && manga.rating > 0 ? (
            <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1 text-xs text-yellow-400 border border-yellow-500/30 shadow-md">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="font-semibold">{manga.rating.toFixed(1)}</span>
            </div>
          ) : null}
          
          {/* Chapter Count Badge - Bottom Left on Image */}
          <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs text-white/90 border border-white/20 shadow-md">
            {chaptersDisplay}
          </div>
          
          {/* Reading progress indicator if manga has been read */}
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
          
          {/* Genre pills - show the first genre - Bottom Right on Image */}
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
          {/* Show English title only if it exists and differs */}
          {manga.englishTitle && manga.englishTitle !== manga.title && (
            <p className="text-xs text-gray-400 line-clamp-1" title={manga.englishTitle}>
              {manga.englishTitle}
            </p>
          )}
          
          {/* Status info */}
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
  );
}

export function MangaView({
  selectedCategory = "ყველა",
  setSelectedCategory,
  categories,
  hoveredCard,
  setHoveredCard,
  mangaData = [],
  items = [] // For backward compatibility
}: MangaViewProps & { items?: ContentItem[] }) { // Add items prop for backward compatibility
  const router = useRouter()
  const categoriesRef = useRef<HTMLDivElement>(null)
  // Use either mangaData or items (for backward compatibility)
  const dataToUse = mangaData.length > 0 ? mangaData : items
  const [localLoading, setLocalLoading] = useState(dataToUse.length === 0)
  const [localMangaData, setLocalMangaData] = useState<ContentItem[]>(dataToUse)
  
  // Filter manga based on selected category
  const filteredManga = selectedCategory === "ყველა" 
    ? localMangaData 
    : localMangaData.filter(manga => manga.genres?.includes(selectedCategory))

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

  // If neither mangaData nor items is provided, fetch it
  useEffect(() => {
    if (dataToUse.length > 0) {
      setLocalMangaData(dataToUse);
      setLocalLoading(false);
      return;
    }
    
    async function fetchData() {
      setLocalLoading(true);
      try {
        // Get manga from our database
        const response = await getAllContent('manga', 50);
        
        if (response.success && response.content) {
          const transformedData = response.content.map((content: any): ContentItem => ({
            id: content.id,
            title: content.georgian_title || content.title,
            englishTitle: content.georgian_title ? content.title : null,
            description: content.description || "აღწერა არ არის ხელმისაწვდომი",
            thumbnail: content.thumbnail,
            banner_image: content.banner_image,
            rating: content.rating || 0,
            status: content.status,
            chapters: content.chapters_count ? `${content.chapters_count} თავი` : "0 თავი",
            genres: content.genres,
            type: 'manga',
            release_year: content.release_year,
            totalChapters: typeof content.chapters_count === 'number' ? content.chapters_count : 
               (typeof content.chapters_count === 'string' ? parseInt(content.chapters_count.replace(/[^\d]/g, ''), 10) : 0)
          }));
          
          setLocalMangaData(transformedData);
        } else {
          console.error("Failed to fetch manga or no content:", response.error || "No content");
          setLocalMangaData([]);
        }
      } catch (error) {
        console.error("Error fetching manga:", error);
        setLocalMangaData([]);
      } finally {
        setLocalLoading(false);
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
          <h2 className="text-2xl font-bold text-white tracking-tight">მანგები</h2>
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
                    layoutId={`activeCategoryIndicator-manga`}
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

      {/* Manga grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">ხელმისაწვდომი მანგა</h2>
        </div>
        
        {filteredManga.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-xl">
            <p className="text-white/60">ამ კატეგორიაში მანგა ვერ მოიძებნა</p>
            <img src="/images/mascot/confused.png" alt="No manga mascot" className="mx-auto mt-4 w-32 h-32" />
          </div>
        ) : (
          <m.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
          >
            {filteredManga.map((manga, index) => (
              <MangaCard 
                key={manga.id} 
                manga={manga} 
                index={index}
              />
            ))}
          </m.div>
        )}
      </div>
    </m.div>
  );
}
