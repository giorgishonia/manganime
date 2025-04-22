"use client"

import { useEffect, useState, useRef } from "react"
import { Star, ChevronRight, Play, Plus, BookOpen, Clock, Info, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion as m, AnimatePresence } from "framer-motion"
import { ImageSkeleton } from "@/components/image-skeleton"
import { getTrendingContent, getAllContent } from "@/lib/content"
import { CardSkeleton, CarouselSkeleton, CategorySkeleton } from "@/components/ui/skeleton"

// Helper function for drag scrolling
function setupDragScroll(element: HTMLDivElement | null) {
  if (!element) return () => {};
  
  let isDown = false;
  let startX: number;
  let scrollLeft: number;
  
  const mouseDown = (e: MouseEvent) => {
    isDown = true;
    element.classList.add("active");
    startX = e.pageX - element.offsetLeft;
    scrollLeft = element.scrollLeft;
  };
  
  const mouseLeave = () => {
    isDown = false;
    element.classList.remove("active");
  };
  
  const mouseUp = () => {
    isDown = false;
    element.classList.remove("active");
  };
  
  const mouseMove = (e: MouseEvent) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - element.offsetLeft;
    const walk = (x - startX) * 0.8; // Reduced scroll speed multiplier
    element.scrollLeft = scrollLeft - walk;
  };
  
  element.addEventListener("mousedown", mouseDown);
  element.addEventListener("mouseleave", mouseLeave);
  element.addEventListener("mouseup", mouseUp);
  element.addEventListener("mousemove", mouseMove);
  
  return () => {
    element.removeEventListener("mousedown", mouseDown);
    element.removeEventListener("mouseleave", mouseLeave);
    element.removeEventListener("mouseup", mouseUp);
    element.removeEventListener("mousemove", mouseMove);
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
      staggerChildren: 0.15 
    } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

const cardHoverVariants = {
  initial: { scale: 1, y: 0 },
  hover: { 
    scale: 1.05,
    y: -8,
    transition: { duration: 0.3, ease: "easeOut" },
    boxShadow: "0 10px 20px rgba(0, 0, 0, 0.3)"
  }
};

interface MangaViewProps {
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  categories: string[]
  hoveredCard: number | null
  setHoveredCard: (id: number | null) => void
  mangaData?: any[]
}

export function MangaView({
  selectedCategory,
  setSelectedCategory,
  categories,
  hoveredCard,
  setHoveredCard,
  mangaData: propMangaData,
}: MangaViewProps) {
  const router = useRouter()
  const categoriesRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(propMangaData ? false : true)
  const [mangaData, setMangaData] = useState<any[]>(propMangaData || [])
  
  // Refs for carousel containers
  const trendingMangaRef = useRef<HTMLDivElement>(null)
  const trendingManhwaRef = useRef<HTMLDivElement>(null)
  const popularSeriesRef = useRef<HTMLDivElement>(null)
  
  // Fetch manga data if not provided
  useEffect(() => {
    if (propMangaData) return
    
    async function fetchData() {
      try {
        const response = await getTrendingContent('manga', 15);
        
        if (response.success && response.content) {
          // Transform data to match UI needs
          const transformedData = response.content.map((manga: any) => ({
            id: manga.id,
            title: manga.title,
            description: manga.description?.substring(0, 200) + "..." || "No description available",
            image: manga.thumbnail,
            thumbnail: manga.thumbnail,
            rating: manga.rating || 0,
            status: manga.status,
            genres: manga.genres,
            year: manga.releaseYear || "Unknown",
            chapters: "Chapters available" // We would need to fetch chapters separately
          }));
          
          setMangaData(transformedData);
        }
        
        // Artificial delay for smoother animation
        setTimeout(() => {
          setIsLoading(false)
        }, 500)
      } catch (error) {
        console.error("Error fetching manga data:", error)
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [propMangaData])
  
  // Filter manga based on selected category
  const filteredManga = selectedCategory === "All" 
    ? mangaData 
    : mangaData.filter(manga => manga.genres?.includes(selectedCategory))
  
  // Split data for different sections
  const manga = filteredManga.filter(item => !item.title.includes("Season") && !item.title.includes("Vol"))
  const manhwa = filteredManga.filter(item => item.title.includes("Solo Leveling") || item.title.includes("Tower of God") || item.title.includes("God of High School"))
  const others = filteredManga.filter(item => !manga.includes(item) && !manhwa.includes(item))

  // Handle card click - show hover preview and navigate to manga detail page
  const handleCardClick = (id: number) => {
    setHoveredCard(id)
    setTimeout(() => {
      router.push(`/manga/${id}`)
    }, 300) // Short delay to allow hover preview to show briefly
  }

  // Handle categories scroll
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesRef.current) {
      const container = categoriesRef.current;
      const scrollAmount = 200; // Adjust as needed
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  // Set up drag scrolling and auto-scrolling for all carousels
  useEffect(() => {
    const cleanupFunctions: Array<() => void> = [];
    
    // Setup for categories carousel
    if (categoriesRef.current) {
      cleanupFunctions.push(setupDragScroll(categoriesRef.current));
    }
    
    // Setup for manga carousels with different timings
    const carousels = [
      { ref: trendingMangaRef.current, interval: 5000 },
      { ref: trendingManhwaRef.current, interval: 5300 },
      { ref: popularSeriesRef.current, interval: 5700 }
    ];
    
    carousels.forEach(({ ref, interval }) => {
      if (ref) {
        cleanupFunctions.push(setupDragScroll(ref));
        cleanupFunctions.push(setupAutoScroll(ref, interval));
      }
    });
    
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, []);

  if (isLoading) {
    return (
      <m.div 
        className="space-y-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <m.div variants={itemVariants}>
          <h1 className="text-3xl font-bold mb-6">Trending Manga</h1>
          <CategorySkeleton count={8} />
          <div className="mt-6">
            <CarouselSkeleton count={6} />
          </div>
        </m.div>

        <m.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4">Trending Manhwa</h2>
          <CarouselSkeleton count={5} />
        </m.div>

        <m.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4">Popular Series</h2>
          <CarouselSkeleton count={5} />
        </m.div>
      </m.div>
    )
  }

  return (
    <m.div 
      className="space-y-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <m.section variants={itemVariants}>
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-4">
            {manga.length > 0 && (
              <div className="h-14 w-14 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                <ImageSkeleton
                  src={manga[0]?.thumbnail || manga[0]?.image || "/placeholder.svg"}
                  alt={manga[0]?.title || "Trending manga"}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold mb-0 text-glow">Trending Manga</h1>
          </div>
          <button className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white transition-colors">
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 relative">
          <div 
            ref={categoriesRef}
            className="category-nav" 
          >
            {["All", ...categories.filter(cat => cat !== "All")].map((category) => (
              <m.button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`category-button ${
                  selectedCategory === category
                    ? "bg-white text-black font-medium"
                    : "bg-white/10 backdrop-blur-sm text-gray-200 border border-white/5 hover:border-white/20"
                }`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {category}
              </m.button>
            ))}
        </div>
          <m.div 
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-[#070707] via-[#070707]/90 to-transparent pl-8 pr-1 py-4"
            whileHover={{ x: -2 }}
            whileTap={{ x: 2 }}
          >
            <m.button 
              onClick={() => scrollCategories('right')}
              className="bg-white/10 p-2 rounded-full backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="h-5 w-5" />
            </m.button>
          </m.div>
        </div>

        <AnimatePresence mode="wait">
          <m.div 
            key={selectedCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div>
              {manga.length > 0 ? (
                <div 
                  ref={trendingMangaRef}
                  className="flex overflow-x-auto pb-4 space-x-5 cursor-grab no-scrollbar"
                >
                  {manga.map((item) => (
                    <m.div 
                      key={item.id}
                      className="relative flex-none w-[180px] sm:w-[200px] group cursor-pointer card-hover" 
                      onClick={() => handleCardClick(item.id)}
                      whileHover="hover"
                      variants={cardHoverVariants}
                    >
                      <div className="relative aspect-[2/3] rounded-md overflow-hidden card-shadow border border-white/10">
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <ImageSkeleton
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                        />
                        <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full text-xs z-20">
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <span className="font-medium">{item.rating.toFixed(1)}</span>
                        </div>
                        
                        <div className="absolute bottom-0 left-0 right-0 p-3 z-20 transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="flex gap-2">
                            <button className="bg-white text-black rounded-full p-1.5 hover:bg-opacity-90 transition-colors">
                              <BookOpen className="h-3 w-3" />
                            </button>
                            <button className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 hover:bg-white/30 transition-colors">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-white transition-colors">{item.title}</h3>
                        {item.genres && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                            {item.genres.slice(0, 3).join(', ')}
                          </p>
                        )}
                      </div>
                    </m.div>
                  ))}
                </div>
              ) :
                <m.div 
                  className="text-gray-400 py-8 text-center bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  No manga found in this category.
                </m.div>
              }
        </div>
          </m.div>
        </AnimatePresence>
      </m.section>

      <m.section variants={itemVariants}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            {manhwa.length > 0 ? (
              <div className="h-12 w-12 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                <ImageSkeleton
                  src={manhwa[0]?.thumbnail || manhwa[0]?.image || "/placeholder.svg"}
                  alt={manhwa[0]?.title || "Trending manhwa"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : filteredManga.length > 0 && (
              <div className="h-12 w-12 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                <ImageSkeleton
                  src={filteredManga[0]?.thumbnail || filteredManga[0]?.image || "/placeholder.svg"}
                  alt={filteredManga[0]?.title || "Trending manhwa"}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h2 className="text-2xl font-bold mb-0">Trending Manhwa</h2>
          </div>
          <button className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white transition-colors">
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div 
          ref={trendingManhwaRef}
          className="flex overflow-x-auto pb-4 space-x-4 cursor-grab no-scrollbar"
        >
          {manhwa.length > 0 ? manhwa.map((item) => (
            <m.div 
              key={item.id}
              className="relative flex-none w-[160px] sm:w-[180px] group cursor-pointer" 
              onClick={() => handleCardClick(item.id)}
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="relative aspect-[2/3] rounded-md overflow-hidden">
                <ImageSkeleton
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform"
                />
                {item.rating && (
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded text-xs">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <h3 className="mt-1 text-sm font-medium line-clamp-2">{item.title}</h3>
              {item.year && <p className="text-xs text-gray-400">{item.year}</p>}
            </m.div>
          )) : filteredManga.slice(0, 7).map((item, index) => (
            <m.div 
              key={`manhwa-${item.id}-${index}`}
              className="relative flex-none w-[160px] sm:w-[180px] group cursor-pointer" 
              onClick={() => handleCardClick(item.id)}
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="relative aspect-[2/3] rounded-md overflow-hidden">
                <ImageSkeleton
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform"
                />
                {item.rating && (
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded text-xs">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <h3 className="mt-1 text-sm font-medium line-clamp-2">{item.title}</h3>
              {item.year && <p className="text-xs text-gray-400">{item.year}</p>}
            </m.div>
          ))}
        </div>
      </m.section>

      <m.section variants={itemVariants}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            {others.length > 0 ? (
              <div className="h-12 w-12 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                <ImageSkeleton
                  src={others[0]?.thumbnail || others[0]?.image || "/placeholder.svg"}
                  alt={others[0]?.title || "Popular series"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : filteredManga.length > 0 && (
              <div className="h-12 w-12 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                <ImageSkeleton
                  src={filteredManga[0]?.thumbnail || filteredManga[0]?.image || "/placeholder.svg"}
                  alt={filteredManga[0]?.title || "Popular series"}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h2 className="text-2xl font-bold mb-0">Popular Series</h2>
          </div>
          <button className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white transition-colors">
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div 
          ref={popularSeriesRef}
          className="flex overflow-x-auto pb-4 space-x-4 cursor-grab no-scrollbar"
        >
          {others.length > 0 ? others.map((item, index) => (
            <m.div 
              key={`other-${item.id}-${index}`}
              className="relative flex-none w-[160px] sm:w-[180px] group cursor-pointer" 
              onClick={() => handleCardClick(item.id)}
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="relative aspect-[2/3] rounded-md overflow-hidden">
                <ImageSkeleton
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform"
                />
                {item.rating && (
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded text-xs">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <h3 className="mt-1 text-sm font-medium line-clamp-2">{item.title}</h3>
              {item.year && <p className="text-xs text-gray-400">{item.year}</p>}
            </m.div>
          )) : filteredManga.slice(0, 7).map((item, index) => (
            <m.div 
              key={`other-${item.id}-${index}`}
              className="relative flex-none w-[160px] sm:w-[180px] group cursor-pointer" 
              onClick={() => handleCardClick(item.id)}
              whileHover="hover"
              variants={cardHoverVariants}
            >
              <div className="relative aspect-[2/3] rounded-md overflow-hidden">
                <ImageSkeleton
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform"
                />
                {item.rating && (
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded text-xs">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <h3 className="mt-1 text-sm font-medium line-clamp-2">{item.title}</h3>
              {item.year && <p className="text-xs text-gray-400">{item.year}</p>}
            </m.div>
          ))}
        </div>
      </m.section>
    </m.div>
  )
}
