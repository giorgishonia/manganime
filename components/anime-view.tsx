import { useEffect, useState, useRef } from "react"
import { Star, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ImageSkeleton } from "@/components/image-skeleton"
import { getTrendingAnime } from "@/lib/anilist"
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
  
  // Refs for carousel containers
  const trendingAnimeRef = useRef<HTMLDivElement>(null)
  const recentEpisodesRef = useRef<HTMLDivElement>(null)
  const highestRatedRef = useRef<HTMLDivElement>(null)
  const comingSoonRef = useRef<HTMLDivElement>(null)
  
  // Filter anime based on selected category
  const filteredAnime = selectedCategory === "All" 
    ? animeData 
    : animeData.filter(anime => anime.genres?.includes(selectedCategory))

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
      { ref: trendingAnimeRef.current, interval: 5000 },
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

  // Simulate data loading if animeData is provided but we want to show loading animation
  useEffect(() => {
    if (animeData.length > 0) {
      // Artificial delay for smooth animation when data is already available
      const timer = setTimeout(() => {
        setLocalLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [animeData]);

  if (localLoading) {
    return (
      <motion.div 
        className="space-y-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold mb-4">Trending this season</h1>
          <CategorySkeleton count={8} />
          <div className="mt-6">
            <CarouselSkeleton count={6} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4">Recent episodes</h2>
          <CarouselSkeleton count={4} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4">Highest rated</h2>
          <CarouselSkeleton count={5} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4">Coming soon</h2>
          <CarouselSkeleton count={5} />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.section variants={itemVariants}>
        <h1 className="text-3xl font-bold mb-4">Trending this season</h1>

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
            {filteredAnime.length > 0 ? (
              <div 
                ref={trendingAnimeRef} 
                className="flex overflow-x-auto pb-4 space-x-4 cursor-grab no-scrollbar"
              >
                {filteredAnime.map((anime) => (
                  <motion.div 
                    key={anime.id}
                    className="relative flex-none w-[160px] sm:w-[180px] group cursor-pointer" 
                    onClick={() => handleCardClick(anime.id)}
                    whileHover="hover"
                    variants={cardHoverVariants}
                    layout
                  >
                    <div className="relative aspect-[2/3] rounded-md overflow-hidden">
                      <ImageSkeleton
                        src={anime.thumbnail || anime.image}
                        alt={anime.title}
                        className="w-full h-full object-cover transition-transform"
                      />
                      <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded text-xs">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        <span>{anime.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <h3 className="mt-1 text-sm font-medium line-clamp-2">{anime.title}</h3>
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
                No anime found in this category.
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.section>

      <motion.section variants={itemVariants}>
        <h2 className="text-2xl font-bold mb-4">Recent episodes</h2>
        <div 
          ref={recentEpisodesRef}
          className="flex overflow-x-auto pb-4 space-x-4 cursor-grab no-scrollbar"
        >
          {animeData.slice(0, 8).map((anime, index) => (
            <motion.div 
              key={`recent-${anime.id}-${index}`} 
              className="bg-gray-800 rounded-md overflow-hidden cursor-pointer flex-none w-[300px] sm:w-[320px]"
              onClick={() => handleCardClick(anime.id)}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="aspect-video relative">
                <ImageSkeleton
                  src={anime.thumbnail || anime.image || "/placeholder.svg"}
                  alt={anime.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <h3 className="font-medium line-clamp-1">{anime.title}</h3>
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>Latest episode</span>
                  <span>Recently aired</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section variants={itemVariants}>
        <h2 className="text-2xl font-bold mb-4">Highest rated</h2>
        <div 
          ref={highestRatedRef}
          className="flex overflow-x-auto pb-4 space-x-4 cursor-grab no-scrollbar"
        >
          {animeData
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 10)
            .map((anime) => (
              <motion.div 
                key={`top-${anime.id}`}
                className="relative flex-none w-[160px] sm:w-[180px] group cursor-pointer" 
                onClick={() => handleCardClick(anime.id)}
                whileHover="hover"
                variants={cardHoverVariants}
              >
                <div className="relative aspect-[2/3] rounded-md overflow-hidden">
                  <ImageSkeleton
                    src={anime.thumbnail || anime.image}
                    alt={anime.title}
                    className="w-full h-full object-cover transition-transform"
                  />
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded text-xs">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span>{anime.rating.toFixed(1)}</span>
                  </div>
                </div>
                <h3 className="mt-1 text-sm font-medium line-clamp-2">{anime.title}</h3>
              </motion.div>
            ))}
        </div>
      </motion.section>

      <motion.section variants={itemVariants}>
        <h2 className="text-2xl font-bold mb-4">Coming soon</h2>
        <div 
          ref={comingSoonRef}
          className="flex overflow-x-auto pb-4 space-x-4 cursor-grab no-scrollbar"
        >
          {animeData
            .filter(anime => anime.status === "Coming Soon" || anime.status === "Releasing")
            .slice(0, 10)
            .map((anime) => (
              <motion.div 
                key={`upcoming-${anime.id}`}
                className="relative flex-none w-[160px] sm:w-[180px] group cursor-pointer" 
                onClick={() => handleCardClick(anime.id)}
                whileHover="hover"
                variants={cardHoverVariants}
              >
                <div className="relative aspect-[2/3] rounded-md overflow-hidden">
                  <ImageSkeleton
                    src={anime.thumbnail || anime.image}
                    alt={anime.title}
                    className="w-full h-full object-cover transition-transform"
                  />
                </div>
                <h3 className="mt-1 text-sm font-medium line-clamp-2">{anime.title}</h3>
                <p className="text-xs text-gray-400">{anime.year || "Coming soon"}</p>
              </motion.div>
            ))}
        </div>
      </motion.section>
    </motion.div>
  )
}
