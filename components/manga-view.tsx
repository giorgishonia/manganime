"use client"

import { useEffect, useState, useRef } from "react"
import { Star, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion as m, AnimatePresence } from "framer-motion"
import { ImageSkeleton } from "@/components/image-skeleton"
import { getAllContent } from "@/lib/content"
import { CategorySkeleton } from "@/components/ui/skeleton"

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
    const walk = (x - startX) * 0.8;
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
      boxShadow: { delay:.05 }
    }
  }
};

interface MangaViewProps {
  selectedCategory?: string
  setSelectedCategory?: (category: string) => void
  categories?: string[]
  hoveredCard?: number | null
  setHoveredCard?: (id: number | null) => void
  items?: any[]
  title?: string
}

export function MangaView({
  selectedCategory = "All",
  setSelectedCategory = () => {},
  categories = [],
  hoveredCard = null,
  setHoveredCard = () => {},
  items = [],
  title = "Available Manga"
}: MangaViewProps) {
  const router = useRouter()
  const categoriesRef = useRef<HTMLDivElement>(null)
  const [localLoading, setLocalLoading] = useState(items.length === 0)
  const [localMangaData, setLocalMangaData] = useState<any[]>(items)
  
  // Filter manga based on selected category
  const filteredManga = selectedCategory === "All" 
    ? localMangaData 
    : localMangaData.filter(manga => manga.genres?.includes(selectedCategory))

  // Handle card click - navigate to manga detail page
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

  // Set up drag scrolling for categories
  useEffect(() => {
    if (categoriesRef.current) {
      const cleanup = setupDragScroll(categoriesRef.current);
      return cleanup;
    }
  }, []);

  // If items is not provided, fetch manga data
  useEffect(() => {
    if (items.length > 0) {
      setLocalMangaData(items);
      setLocalLoading(false);
      return;
    }
    
    async function fetchData() {
      try {
        // Get manga from our database
        const response = await getAllContent('manga', 50);
        
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
          
          setLocalMangaData(transformedData);
        }
      } catch (error) {
        console.error("Error fetching manga:", error);
      } finally {
        setLocalLoading(false);
      }
    }
    
    fetchData();
  }, [items]);

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
            
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {category}
              </button>
            ))}
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

      {/* Manga grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        
        {filteredManga.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-xl">
            <p className="text-white/60">ამ კატეგორიაში მანგა ვერ მოიძებნა</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredManga.map((manga) => (
              <m.div
                key={manga.id}
                variants={itemVariants}
                onClick={() => handleCardClick(manga.id)}
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
                    src={manga.thumbnail}
                    alt={manga.title}
                    className="object-cover w-full h-full transition-transform"
                  />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
                    <div className="flex justify-between items-end">
                      <div>
                        <h3 className="text-sm font-medium line-clamp-2">{manga.title}</h3>
                        <div className="flex items-center mt-1 text-xs text-white/60">
                          {manga.releaseYear && <span className="mr-2">{manga.releaseYear}</span>}
                          <span className="capitalize">{manga.status}</span>
                        </div>
                      </div>
                      
                      {manga.rating > 0 && (
                        <div className="flex items-center bg-black/40 rounded px-1.5 py-0.5">
                          <Star className="w-3 h-3 text-yellow-400 mr-1" />
                          <span className="text-xs">{manga.rating.toFixed(1)}</span>
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
