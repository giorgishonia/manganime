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
  
  // Filter anime based on selected category
  const filteredAnime = selectedCategory === "All" 
    ? localAnimeData 
    : localAnimeData.filter(anime => anime.genres?.includes(selectedCategory))

  // Handle card click - navigate to anime detail page
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

  // Set up drag scrolling for categories
  useEffect(() => {
    if (categoriesRef.current) {
      const cleanup = setupDragScroll(categoriesRef.current);
      return cleanup;
    }
  }, []);

  // If animeData is not provided, fetch it
  useEffect(() => {
    if (animeData.length > 0) {
      setLocalAnimeData(animeData);
      setLocalLoading(false);
      return;
    }
    
    async function fetchData() {
      try {
        // Get anime from our database
        const response = await getAllContent('anime', 50);
        
        if (response.success && response.content) {
          const transformedData = response.content.map((content: any) => ({
            id: content.id,
            title: content.title,
            description: content.description?.substring(0, 160) + "..." || "აღწერა არ არის ხელმისაწვდომი",
            image: content.banner_image || content.thumbnail,
            thumbnail: content.thumbnail,
            rating: content.rating || 0,
            status: content.status,
            releaseYear: content.release_year,
            genres: content.genres
          }));
          
          setLocalAnimeData(transformedData);
        }
      } catch (error) {
        console.error("Error fetching anime:", error);
      } finally {
        setLocalLoading(false);
      }
    }
    
    fetchData();
  }, [animeData]);

  if (localLoading) {
    return <CategorySkeleton />;
  }

  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12"
    >
      {/* Categories filter */}
      <div className="relative">
        <div className="flex items-center mb-2">
          <h2 className="text-xl font-bold">კატეგორიები</h2>
        </div>
        <div className="relative group">
          <div
            ref={categoriesRef}
            className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide"
          >
            <button
              onClick={() => setSelectedCategory("All")}
              className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === "All"
                  ? "bg-primary text-white"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              ყველა
            </button>
          </div>
          
          {/* Navigation buttons */}
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 bg-black/30 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
            onClick={() => scrollCategories('left')}
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 bg-black/30 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
            onClick={() => scrollCategories('right')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Anime grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">ხელმისაწვდომი ანიმე</h2>
        </div>
        
        {filteredAnime.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-xl">
            <p className="text-white/60">ამ კატეგორიაში ანიმე ვერ მოიძებნა</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredAnime.map((anime) => (
              <m.div
                key={anime.id}
                variants={itemVariants}
                onClick={() => handleCardClick(anime.id)}
                className="cursor-pointer relative group"
              >
                <m.div
                  initial="initial"
                  whileHover="hover"
                  variants={cardHoverVariants}
                  className="relative overflow-hidden rounded-lg aspect-[2/3] bg-white/5"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                  <ImageSkeleton
                    src={anime.thumbnail}
                    alt={anime.title}
                    className="object-cover w-full h-full transition-transform"
                  />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
                    <div className="flex justify-between items-end">
                      <div>
                        <h3 className="text-sm font-medium line-clamp-2">{anime.title}</h3>
                        <div className="flex items-center mt-1 text-xs text-white/60">
                          {anime.releaseYear && <span className="mr-2">{anime.releaseYear}</span>}
                          <span className="capitalize">{anime.status}</span>
                        </div>
                      </div>
                      
                      {anime.rating > 0 && (
                        <div className="flex items-center bg-black/40 rounded px-1.5 py-0.5">
                          <Star className="w-3 h-3 text-yellow-400 mr-1" />
                          <span className="text-xs">{anime.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </m.div>
              </m.div>
            ))}
          </div>
        )}
      </div>
    </m.div>
  );
}