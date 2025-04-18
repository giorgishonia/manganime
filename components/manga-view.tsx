import { useEffect, useState, useRef } from "react"
import { Star, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ImageSkeleton } from "@/components/image-skeleton"
import { getTrendingManga, stripHtml, formatStatus } from "@/lib/anilist"
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
    const walk = (x - startX) * 2; // Scroll speed multiplier
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
      staggerChildren: 0.1 
    } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

const cardHoverVariants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.05,
    transition: { duration: 0.3, ease: "easeOut" }
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
        const data = await getTrendingManga(15)
        
        // Transform data to match UI needs
        const transformedData = data.map((manga: any) => ({
          id: manga.id,
          title: manga.title.english || manga.title.romaji,
          description: stripHtml(manga.description || "").substring(0, 200) + "...",
          image: manga.coverImage.large,
          thumbnail: manga.coverImage.large,
          rating: manga.averageScore / 10,
          status: formatStatus(manga.status),
          genres: manga.genres,
          year: manga.startDate?.year || "Unknown",
          chapters: manga.chapters || "?"
        }))
        
        setMangaData(transformedData)
        
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
      <motion.div 
        className="space-y-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold mb-6">Trending Manga</h1>
          <CategorySkeleton count={8} />
          <div className="mt-6">
            <CarouselSkeleton count={6} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4">Trending Manhwa</h2>
          <CarouselSkeleton count={5} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4">Popular Series</h2>
          <CarouselSkeleton count={5} />
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="space-y-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.section variants={itemVariants}>
        <h1 className="text-3xl font-bold mb-6">Trending Manga</h1>

        <div className="mb-6 relative">
          <div 
            ref={categoriesRef}
            className="flex overflow-x-auto space-x-2 pb-2 no-scrollbar scroll-smooth"
          >
            {["All", ...categories.filter(cat => cat !== "All")].map((category) => (
              <motion.button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2 rounded-md text-sm whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-white text-black"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {category}
              </motion.button>
            ))}
          </div>
          <motion.button 
            onClick={() => scrollCategories('right')}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-[#070707] via-[#070707]/80 to-transparent pl-6 pr-1 py-4"
            whileHover={{ x: -2 }}
            whileTap={{ x: 2 }}
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
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
                  className="flex overflow-x-auto pb-4 space-x-4 cursor-grab no-scrollbar"
                >
                  {manga.map((item) => (
                    <motion.div 
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
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded text-xs">
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <span>{item.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <h3 className="mt-1 text-sm font-medium line-clamp-2">{item.title}</h3>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  className="text-gray-400 py-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  No manga found in this category.
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.section>

      <motion.section variants={itemVariants}>
        <h2 className="text-2xl font-bold mb-4">Trending Manhwa</h2>
        <div 
          ref={trendingManhwaRef}
          className="flex overflow-x-auto pb-4 space-x-4 cursor-grab no-scrollbar"
        >
          {manhwa.length > 0 ? manhwa.map((item) => (
            <motion.div 
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
            </motion.div>
          )) : filteredManga.slice(0, 7).map((item, index) => (
            <motion.div 
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
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section variants={itemVariants}>
        <h2 className="text-2xl font-bold mb-4">Popular Series</h2>
        <div 
          ref={popularSeriesRef}
          className="flex overflow-x-auto pb-4 space-x-4 cursor-grab no-scrollbar"
        >
          {others.length > 0 ? others.map((item, index) => (
            <motion.div 
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
            </motion.div>
          )) : filteredManga.slice(0, 7).map((item, index) => (
            <motion.div 
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
            </motion.div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  )
}
