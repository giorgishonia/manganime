"use client"

import { useEffect, useState, useRef } from "react"
import { Star, ChevronRight, Play, Plus, Clock, Info, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion as m, AnimatePresence } from "framer-motion"
import { ImageSkeleton } from "@/components/image-skeleton"
import { getAllContent, getTrendingContent } from "@/lib/content"
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
      staggerChildren: 0.1,
      ease: [0.22, 1, 0.36, 1]
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
  initial: { scale: 1, y: 0, boxShadow: "0px 0px 0px rgba(0, 0, 0, 0)" },
  hover: { 
    scale: 1.05,
    y: -10,
    boxShadow: "0 20px 30px rgba(0, 0, 0, 0.4)",
    transition: { 
      duration: 0.3, 
      ease: [0.22, 1, 0.36, 1],
      boxShadow: { delay: 0.05 }
    }
  }
};

interface AnimeViewProps {
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  categories: string[]
  hoveredCard: number | null
  setHoveredCard: (id: number | null) => void
  animeData?: any[]
}

export function AnimeView({
  selectedCategory,
  setSelectedCategory,
  categories,
  hoveredCard,
  setHoveredCard,
  animeData = []
}: AnimeViewProps) {
  const router = useRouter()
  const categoriesRef = useRef<HTMLDivElement>(null)
  const [localLoading, setLocalLoading] = useState(animeData.length === 0)
  const [localAnimeData, setLocalAnimeData] = useState<any[]>(animeData)
  
  // Refs for carousel containers
  const trendingRef = useRef<HTMLDivElement>(null)
  const recentEpisodesRef = useRef<HTMLDivElement>(null)
  const highestRatedRef = useRef<HTMLDivElement>(null)
  const comingSoonRef = useRef<HTMLDivElement>(null)
  
  // Filter anime based on selected category
  const filteredAnime = selectedCategory === "All" 
    ? localAnimeData 
    : localAnimeData.filter(anime => anime.genres?.includes(selectedCategory))

  // Handle card click - show hover preview and navigate to anime detail page
  const handleCardClick = (id: number) => {
    setHoveredCard(id)
    setTimeout(() => {
      router.push(`/anime/${id}`)
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
    
    // Setup for anime carousels with different timings
    const carousels = [
      { ref: trendingRef.current, interval: 5000 },
      { ref: recentEpisodesRef.current, interval: 5500 },
      { ref: highestRatedRef.current, interval: 5200 },
      { ref: comingSoonRef.current, interval: 5800 }
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

  // If animeData is not provided, fetch it
  useEffect(() => {
    if (animeData.length > 0) return
    
    async function fetchData() {
      try {
        // Get trending anime from our database
        const response = await getTrendingContent('anime', 20);
        
        if (response.success && response.content) {
          // Transform data if needed
          const transformedData = response.content.map((anime: any) => ({
            id: anime.id,
            title: anime.title,
            description: anime.description?.substring(0, 200) + "..." || "No description available",
            image: anime.thumbnail,
            thumbnail: anime.thumbnail,
            rating: anime.rating || 0,
            status: anime.status,
            genres: anime.genres,
            episodes: "Episodes available" // We would need to fetch episodes separately
          }));
          
          setLocalAnimeData(transformedData);
        }
        
        // Artificial delay for smoother animation
        setTimeout(() => {
          setLocalLoading(false);
        }, 500);
      } catch (error) {
        console.error("Error fetching anime data:", error);
        setLocalLoading(false);
      }
    }
    
    fetchData();
  }, [animeData]);

  if (localLoading) {
    return (
      <m.div 
        className="space-y-14"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <m.div variants={itemVariants}>
          <h1 className="text-3xl font-bold mb-4 text-white">Trending Anime</h1>
          <CategorySkeleton count={8} />
          <div className="mt-6">
            <CarouselSkeleton count={6} />
          </div>
        </m.div>

        <m.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4 text-white">Recent Episodes</h2>
          <CarouselSkeleton count={4} />
        </m.div>

        <m.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4 text-white">Highest Rated</h2>
          <CarouselSkeleton count={5} />
        </m.div>

        <m.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4 text-white">Coming Soon</h2>
          <CarouselSkeleton count={5} />
        </m.div>
      </m.div>
    );
  }

  return (
    <m.div 
      className="space-y-16"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <m.section variants={itemVariants}>
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-4">
            {filteredAnime.length > 0 && (
              <div className="h-14 w-14 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                <ImageSkeleton
                  src={filteredAnime[0]?.thumbnail || filteredAnime[0]?.image || "/placeholder.svg"}
                  alt={filteredAnime[0]?.title || "Anime thumbnail"}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold text-white">Trending Anime</h1>
          </div>
          <button className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white transition-colors">
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div 
              ref={categoriesRef}
              className="category-nav flex-1" 
            >
              {["All", ...categories.filter(cat => cat !== "All")].map((category) => (
                <m.button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`category-button ${
                    selectedCategory === category ? 'active' : ''
                  }`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {category}
                </m.button>
              ))}
            </div>
            
            <div className="flex gap-2 ml-[10px] mb-[10px]">
              <m.button 
                onClick={() => scrollCategories('left')}
                className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </m.button>
              <m.button 
                onClick={() => scrollCategories('right')}
                className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight className="h-4 w-4" />
              </m.button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <m.div
              key={selectedCategory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {filteredAnime.length > 0 ? (
                <div 
                  ref={trendingRef} 
                  className="flex overflow-x-auto pb-6 space-x-6 cursor-grab no-scrollbar"
                >
                  {filteredAnime.map((anime, index) => (
                    <m.div 
                      key={anime.id}
                      className="anime-card relative flex-none w-[180px] sm:w-[200px] group cursor-pointer" 
                      onClick={() => handleCardClick(anime.id)}
                      whileHover="hover"
                      variants={cardHoverVariants}
                      initial="initial"
                      layout
                    >
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden">
                        <ImageSkeleton
                          src={anime.thumbnail || anime.image}
                          alt={anime.title}
                          className="w-full h-full object-cover transition-transform"
                        />
                        
                        {/* Card hover overlay */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 flex flex-col justify-end p-4">
                          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <div className="flex gap-1.5 mb-2">
                              <m.button 
                                className="p-1.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Play className="h-3.5 w-3.5" />
                              </m.button>
                              <m.button 
                                className="p-1.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </m.button>
                              <m.button 
                                className="p-1.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Info className="h-3.5 w-3.5" />
                              </m.button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full text-xs">
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <span>{anime.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="mt-2 px-1">
                        <h3 className="font-medium text-sm line-clamp-1 group-hover:text-[hsl(var(--primary))] transition-colors">{anime.title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{anime.status}</p>
                      </div>
                    </m.div>
                  ))}
                </div>
              ) : (
                <m.div 
                  className="text-gray-400 py-6 text-center bg-white/5 rounded-xl border border-white/10 p-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-lg font-medium mb-2">No anime found</p>
                  <p className="text-sm text-gray-500">No anime found in the "{selectedCategory}" category.</p>
                </m.div>
              )}
            </m.div>
          </AnimatePresence>
        </div>
      </m.section>

      <m.section variants={itemVariants}>
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-4">
            {localAnimeData.length > 0 && (
              <div className="h-12 w-12 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                <ImageSkeleton
                  src={localAnimeData[0]?.thumbnail || localAnimeData[0]?.image || "/placeholder.svg"}
                  alt={localAnimeData[0]?.title || "Recent episodes"}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h2 className="text-2xl font-bold text-white">Recent Episodes</h2>
          </div>
          <button className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white transition-colors">
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        <div 
          ref={recentEpisodesRef}
          className="flex overflow-x-auto pb-6 space-x-6 cursor-grab no-scrollbar"
        >
          {localAnimeData.slice(0, 8).map((anime, index) => (
            <m.div 
              key={`recent-${anime.id}-${index}`} 
              className="anime-card glass-effect rounded-xl overflow-hidden cursor-pointer flex-none w-[320px] sm:w-[340px] border border-white/5"
              onClick={() => handleCardClick(anime.id)}
              whileHover="hover"
              variants={cardHoverVariants}
              initial="initial"
            >
              <div className="aspect-video relative">
                <ImageSkeleton
                  src={anime.thumbnail || anime.image || "/placeholder.svg"}
                  alt={anime.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-70"></div>
                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-xs">
                  <Clock className="h-3 w-3" />
                  <span>24 min</span>
                </div>
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-purple-600/90 backdrop-blur-md px-2 py-1 rounded-full text-xs font-medium">
                  Episode 12
                </div>
                <m.button 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center border border-white/20
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.3)" }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Play className="h-6 w-6 text-white" />
                </m.button>
              </div>
              <div className="p-4">
                <h3 className="font-medium line-clamp-1 group-hover:text-[hsl(var(--primary))] transition-colors">{anime.title}</h3>
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>Latest episode</span>
                  <span>Just aired</span>
                </div>
              </div>
            </m.div>
          ))}
        </div>
      </m.section>

      <m.section variants={itemVariants}>
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-4">
            {localAnimeData.sort((a, b) => b.rating - a.rating).length > 0 && (
              <div className="h-12 w-12 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                <ImageSkeleton
                  src={localAnimeData.sort((a, b) => b.rating - a.rating)[0]?.thumbnail || 
                       localAnimeData.sort((a, b) => b.rating - a.rating)[0]?.image || 
                       "/placeholder.svg"}
                  alt="Highest rated anime"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h2 className="text-2xl font-bold text-white">Highest Rated</h2>
          </div>
          <button className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white transition-colors">
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        <div 
          ref={highestRatedRef}
          className="flex overflow-x-auto pb-6 space-x-6 cursor-grab no-scrollbar"
        >
          {localAnimeData
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 10)
            .map((anime) => (
              <m.div 
                key={`top-${anime.id}`}
                className="anime-card relative flex-none w-[180px] sm:w-[200px] group cursor-pointer" 
                onClick={() => handleCardClick(anime.id)}
                whileHover="hover"
                variants={cardHoverVariants}
                initial="initial"
              >
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden">
                  <ImageSkeleton
                    src={anime.thumbnail || anime.image}
                    alt={anime.title}
                    className="w-full h-full object-cover transition-transform"
                  />
                  
                  {/* Card hover overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 flex flex-col justify-end p-4">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="flex gap-1.5 mb-2">
                        <m.button 
                          className="p-1.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </m.button>
                        <m.button 
                          className="p-1.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </m.button>
                        <m.button 
                          className="p-1.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </m.button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full text-xs">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span>{anime.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="mt-2 px-1">
                  <h3 className="font-medium text-sm line-clamp-1 group-hover:text-[hsl(var(--primary))] transition-colors">{anime.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{anime.status}</p>
                </div>
              </m.div>
            ))}
        </div>
      </m.section>

      <m.section variants={itemVariants}>
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-4">
            {localAnimeData.slice(3, 11).length > 0 && (
              <div className="h-12 w-12 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0">
                <ImageSkeleton
                  src={localAnimeData.slice(3, 11)[0]?.thumbnail || 
                       localAnimeData.slice(3, 11)[0]?.image || 
                       "/placeholder.svg"}
                  alt="Coming soon anime"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h2 className="text-2xl font-bold text-white">Coming Soon</h2>
          </div>
          <button className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white transition-colors">
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        <div 
          ref={comingSoonRef}
          className="flex overflow-x-auto pb-6 space-x-6 cursor-grab no-scrollbar"
        >
          {localAnimeData.slice(3, 11).map((anime, idx) => (
            <m.div 
              key={`coming-${anime.id}-${idx}`}
              className="anime-card relative flex-none w-[250px] sm:w-[280px] group cursor-pointer" 
              onClick={() => handleCardClick(anime.id)}
              whileHover="hover"
              variants={cardHoverVariants}
              initial="initial"
            >
              <div className="relative rounded-xl overflow-hidden">
                <div className="aspect-[16/10]">
                  <ImageSkeleton
                    src={anime.image}
                    alt={anime.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-medium text-white line-clamp-1 mb-1 group-hover:text-[hsl(var(--primary))] transition-colors">{anime.title}</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-gray-300">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Coming {idx < 3 ? "Next Month" : "Soon"}</span>
                    </div>
                    <div className="flex items-center gap-0.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-xs">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      <span>{anime.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </m.div>
          ))}
        </div>
      </m.section>
    </m.div>
  )
}