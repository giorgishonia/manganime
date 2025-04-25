"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import { 
  ArrowLeft, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Settings, 
  X, 
  Menu,
  Info,
  Pause,
  Play,
  FastForward,
  Rewind
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { updateReadingProgress } from "@/lib/reading-history"

interface Chapter {
  number: number
  title: string
  thumbnail: string
  pages: string[]
  id?: string
}

interface MangaReaderProps {
  chapter: Chapter
  chapterList: Chapter[]
  onClose: () => void
  onChapterSelect: (index: number) => void
  mangaId: string
  mangaTitle: string
  initialPage?: number
}

type ReadingMode = "Long Strip" | "Single Page" | "Double Page"
type ReadingDirection = "Left to Right" | "Right to Left"
type PageFit = "Contain" | "Overflow" | "Cover" | "True size"
type PageStretch = "None" | "Stretch"

export function MangaReader({ chapter, chapterList, onClose, onChapterSelect, mangaId, mangaTitle, initialPage = 0 }: MangaReaderProps) {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [visibleStartPage, setVisibleStartPage] = useState(0) // Track the first visible page for scrolling up
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [readingMode, setReadingMode] = useState<ReadingMode>("Single Page")
  const [readingDirection, setReadingDirection] = useState<ReadingDirection>("Left to Right")
  const [pageFit, setPageFit] = useState<PageFit>("Contain")
  const [pageStretch, setPageStretch] = useState<PageStretch>("None")
  const [showPageGap, setShowPageGap] = useState(true)
  const [showProgressBar, setShowProgressBar] = useState(true)
  const [showBottomBar, setShowBottomBar] = useState(true)
  const [showChapterList, setShowChapterList] = useState(false)
  const [showPageNumbers, setShowPageNumbers] = useState(true)
  // Autoscroll states
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(1) // 1-5 scale
  
  // Track loaded state for each page
  const [loadedPages, setLoadedPages] = useState<Record<number, boolean>>({})
  
  // Local preloaded images cache
  const [preloadedImages, setPreloadedImages] = useState<Record<string, boolean>>({})

  const readerRef = useRef<HTMLDivElement>(null)
  const longStripRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const scrollListenerRef = useRef<any>(null)
  const [currentVisiblePage, setCurrentVisiblePage] = useState(0)
  const [isLongStripStabilized, setIsLongStripStabilized] = useState(false)
  
  // Use ref to prevent frequent re-renders causing stutter
  const pageProgressRef = useRef<number>(0)
  
  // ... existing refs ...
  const progressBarRef = useRef<HTMLDivElement>(null)
  
  const totalPages = chapter.pages.length

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }

      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }

    document.addEventListener("mousemove", handleMouseMove)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Auto-enter fullscreen when reader opens
  useEffect(() => {
    if (readerRef.current) {
      readerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    }
    
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.error(`Error attempting to exit fullscreen: ${err.message}`)
        })
      }
    }
  }, [])

  // Preload images
  useEffect(() => {
    const preloadImages = (startIndex: number, count: number) => {
      const endIndex = Math.min(startIndex + count, totalPages)
      
      for (let i = startIndex; i < endIndex; i++) {
        const imageUrl = chapter.pages[i]
        const cacheKey = `${chapter.number}-${i}-${imageUrl}`
        
        // Skip already preloaded images
        if (preloadedImages[cacheKey]) continue
        
        const img = new Image()
        img.src = imageUrl
        img.onload = () => {
          setPreloadedImages(prev => ({...prev, [cacheKey]: true}))
          setLoadedPages(prev => ({...prev, [i]: true}))
        }
      }
    }

    // Limit preloading to only necessary images
    if (readingMode === "Long Strip") {
      // In Long Strip mode, only preload visible pages and a few ahead
      preloadImages(currentPage, 5)
    } else {
      // For Single/Double Page modes, preload current page and next few
      preloadImages(currentPage, 3)
      
      // If in double page mode, also preload previous page if not at start
      if (readingMode === "Double Page" && currentPage > 0) {
        preloadImages(currentPage - 1, 1)
      }
    }
  }, [currentPage, chapter.number, chapter.pages, readingMode, totalPages, preloadedImages]);

  // More stable calculation for Long Strip progress based on visible pages
  const calculateLongStripProgress = (): number => {
    if (!longStripRef.current || totalPages === 0) return 0;
    
    // Return a percentage based on current visible page vs total pages
    const percentage = (currentVisiblePage / (totalPages - 1)) * 100;
    return Math.min(100, Math.max(0, percentage));
  };

  // Use Intersection Observer to track which page is most visible
  useEffect(() => {
    if (readingMode !== "Long Strip" || !longStripRef.current) return;
    
    const observerOptions = {
      root: longStripRef.current,
      rootMargin: '0px',
      threshold: 0.5, // Element is considered visible when 50% visible
    };
    
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const pageIndex = Number(entry.target.getAttribute('data-page-index'));
          if (!isNaN(pageIndex)) {
            setCurrentVisiblePage(pageIndex);
            // Update the ref value directly to avoid re-renders
            pageProgressRef.current = pageIndex;
            
            // Only update the DOM directly for the progress bar
            if (progressBarRef.current && readingMode === "Long Strip") {
              const percentage = (pageIndex / (totalPages - 1)) * 100;
              const progress = Math.min(100, Math.max(0, percentage));
              progressBarRef.current.style.transform = `translateX(-${100 - progress}%)`;
            }
          }
        }
      }
    };
    
    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    
    // Observe all page elements
    document.querySelectorAll('[data-page-element="true"]').forEach(element => {
      observer.observe(element);
    });
    
    return () => {
      observer.disconnect();
    };
  }, [readingMode, totalPages, visibleStartPage, currentPage]);

  // Use a separate effect to stabilize Long Strip once initial loading is done
  useEffect(() => {
    if (readingMode === "Long Strip" && !isLongStripStabilized) {
      // Delay to allow initial rendering to complete
      const timer = setTimeout(() => {
        setIsLongStripStabilized(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    return () => {
      if (readingMode !== "Long Strip") {
        setIsLongStripStabilized(false);
      }
    };
  }, [readingMode, isLongStripStabilized]);

  // Update for scroll handler to use the more stable calculation
  useEffect(() => {
    if (readingMode !== "Long Strip" || !longStripRef.current) return;
    
    const handleScroll = () => {
      if (!longStripRef.current) return;
      
      const container = longStripRef.current;
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Don't update the state for progress to avoid re-renders
      // Progress bar updates will happen through the Intersection Observer
      
      // Only load new pages when needed
      if (scrollTop < 200 && visibleStartPage > 0) {
        const newStart = Math.max(0, visibleStartPage - 5);
        setVisibleStartPage(newStart);
        
        const oldHeight = scrollHeight;
        
        setTimeout(() => {
          if (container.scrollHeight > oldHeight && scrollTop < 200) {
            container.scrollTop = container.scrollHeight - oldHeight + scrollTop;
          }
        }, 10);
      }
      
      if (scrollHeight - scrollTop - clientHeight < 500 && currentPage + 10 < totalPages) {
        setCurrentPage(prev => prev + 5);
      }
    };
    
    const scrollContainer = longStripRef.current;
    scrollContainer.addEventListener('scroll', handleScroll);
    scrollListenerRef.current = handleScroll;
    
    return () => {
      scrollContainer.removeEventListener('scroll', scrollListenerRef.current);
    };
  }, [readingMode, visibleStartPage, currentPage, totalPages]);

  // Save reading progress whenever the current page changes
  useEffect(() => {
    if (readingMode === "Long Strip") {
      // For long strip, save progress based on visible pages
      if (currentVisiblePage > 0) {
        updateReadingProgress({
          mangaId,
          chapterId: chapter.id || `chapter-${chapter.number}`,
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          currentPage: currentVisiblePage,
          totalPages: chapter.pages.length,
          lastRead: Date.now(),
          mangaTitle,
          mangaThumbnail: chapter.thumbnail
        });
      }
    } else {
      // For Single/Double Page modes
      updateReadingProgress({
        mangaId,
        chapterId: chapter.id || `chapter-${chapter.number}`,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        currentPage: currentPage,
        totalPages: chapter.pages.length,
        lastRead: Date.now(),
        mangaTitle,
        mangaThumbnail: chapter.thumbnail
      });
    }
  }, [currentPage, currentVisiblePage, readingMode, chapter, mangaId, mangaTitle]);

  // Update useEffect to set initial scroll position for Long Strip mode
  useEffect(() => {
    // If we have an initial page and we're in Long Strip mode, scroll to that position
    if (initialPage > 0 && readingMode === "Long Strip" && longStripRef.current) {
      // Give the component time to render before scrolling
      const timer = setTimeout(() => {
        const pageElements = document.querySelectorAll('[data-page-element="true"]');
        if (pageElements.length > initialPage) {
          const targetElement = pageElements[initialPage] as HTMLElement;
          if (targetElement && longStripRef.current) {
            targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
            // Update current visible page
            setCurrentVisiblePage(initialPage);
          }
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [initialPage, readingMode, isLongStripStabilized]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && readerRef.current) {
      readerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "right") {
      if (readingMode === "Long Strip") {
        // In Long Strip mode, scroll down by a fixed amount
        if (longStripRef.current) {
          longStripRef.current.scrollBy({
            top: 200,
            behavior: 'smooth'
          });
        }
      } else {
        // In Single/Double Page modes, navigate as before
        const direction = readingDirection === "Left to Right" ? goToNextPage : goToPrevPage
        direction()
      }
    } else if (e.key === "ArrowLeft" || e.key === "left") {
      if (readingMode === "Long Strip") {
        // In Long Strip mode, scroll up by a fixed amount
        if (longStripRef.current) {
          longStripRef.current.scrollBy({
            top: -200,
            behavior: 'smooth'
          });
        }
      } else {
        // In Single/Double Page modes, navigate as before
        const direction = readingDirection === "Left to Right" ? goToPrevPage : goToNextPage
        direction()
      }
    } else if (e.key === "Escape") {
      if (showSettings) {
        setShowSettings(false)
      } else if (isFullscreen) {
        document.exitFullscreen()
      } else {
        onClose()
      }
    } else if (e.key === "f") {
      toggleFullscreen()
    } else if (e.key === "s") {
      setShowSettings(!showSettings)
    } else if (e.key === "b") {
      setShowBottomBar(!showBottomBar)
    } else if (e.key === "[" || e.key === "(" || e.key === "{") {
      const prevChapterIndex = chapterList.findIndex(c => c.number === chapter.number) - 1
      if (prevChapterIndex >= 0) {
        onChapterSelect(prevChapterIndex)
      }
    } else if (e.key === "]" || e.key === ")" || e.key === "}") {
      const nextChapterIndex = chapterList.findIndex(c => c.number === chapter.number) + 1
      if (nextChapterIndex < chapterList.length) {
        onChapterSelect(nextChapterIndex)
      }
    } else if (e.key === "u") {
      // Update progress and go to next chapter
      const nextChapterIndex = chapterList.findIndex(c => c.number === chapter.number) + 1
      if (nextChapterIndex < chapterList.length) {
        onChapterSelect(nextChapterIndex)
      }
    }
  }

  const getPageFitClass = () => {
    switch (pageFit) {
      case "Contain":
        return "object-contain"
      case "Cover":
        return "object-cover"
      case "Overflow":
        return "object-none"
      case "True size":
        return "object-none h-auto w-auto"
      default:
        return "object-contain"
    }
  }

  const getStretchClass = () => {
    if (pageStretch === "Stretch" && readingMode === "Long Strip") {
      return "w-full"
    }
    return ""
  }

  // Skeleton placeholder for single/double page mode
  const PageSkeleton = ({ className, mode }: { className?: string, mode?: ReadingMode }) => {
    const currentMode = mode || readingMode;
    
    return (
      <div className={cn(
        "relative flex items-center justify-center bg-gray-800/40 rounded animate-pulse", 
        currentMode === "Long Strip" ? "h-32 w-full mb-4" : "h-[80vh] max-w-[80%]",
        className
      )}>
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-gray-700/60 flex items-center justify-center text-gray-500 font-bold text-2xl mb-2">
            M
          </div>
          {currentMode !== "Long Strip" && (
            <div className="text-xs text-gray-500">Loading...</div>
          )}
        </div>
      </div>
    );
  };

  // Memoize the PageImage component to reduce re-renders
  const PageImage = React.memo(({ 
    src, 
    alt, 
    index, 
    className,
    mode 
  }: { 
    src: string; 
    alt: string; 
    index: number; 
    className?: string;
    mode?: ReadingMode;
  }) => {
    const cacheKey = `${chapter.number}-${index}-${src}`;
    const [isLoaded, setIsLoaded] = useState(preloadedImages[cacheKey] || false);
    const currentMode = mode || readingMode;
    
    useEffect(() => {
      if (preloadedImages[cacheKey]) {
        setIsLoaded(true);
      }
    }, [cacheKey, preloadedImages]);

    return (
      <div 
        className={cn(
          "relative",
          currentMode === "Long Strip" ? "w-full" : "h-full"
        )}
        data-page-element="true"
        data-page-index={index}
      >
        {!isLoaded && <PageSkeleton className={className} mode={currentMode} />}
        <img
          src={src}
          alt={alt}
          className={cn(
            currentMode !== "Long Strip" ? getPageFitClass() : "w-full",
            currentMode !== "Long Strip" && getStretchClass(),
            currentMode === "Long Strip" ? "w-full" : "max-h-full",
            "pointer-events-auto", // Add this for better selectability
            className,
            !isLoaded && "hidden"
          )}
          onLoad={() => {
            setIsLoaded(true);
            setPreloadedImages(prev => ({...prev, [cacheKey]: true}));
            setLoadedPages(prev => ({...prev, [index]: true}));
          }}
          style={{ 
            transform: 'translateZ(0)', // Help prevent shaking
            willChange: 'transform', // Optimize for animations
            contain: 'paint' // Improve performance
          }}
        />
      </div>
    );
  });
  
  // Display name for React.memo component
  PageImage.displayName = 'PageImage';

  // Navigation functions
  const navigateToNextChapter = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const currentIndex = chapterList.findIndex(c => c.number === chapter.number);
    if (currentIndex < chapterList.length - 1) {
      // Mark current chapter as fully read when navigating to next chapter
      updateReadingProgress({
        mangaId,
        chapterId: chapter.id || `chapter-${chapter.number}`,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        currentPage: chapter.pages.length, // Mark as fully read
        totalPages: chapter.pages.length,
        lastRead: Date.now(),
        mangaTitle,
        mangaThumbnail: chapter.thumbnail
      });
      
      onChapterSelect(currentIndex + 1);
    }
  };

  const navigateToPrevChapter = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const prevChapterIndex = chapterList.findIndex(c => c.number === chapter.number) - 1;
    if (prevChapterIndex >= 0) {
      onChapterSelect(prevChapterIndex);
    }
  };

  // Autoscroll controls
  const toggleAutoScroll = () => {
    setIsAutoScrolling(!isAutoScrolling);
  };

  const increaseScrollSpeed = () => {
    setAutoScrollSpeed(prev => Math.min(prev + 0.5, 5));
  };

  const decreaseScrollSpeed = () => {
    setAutoScrollSpeed(prev => Math.max(prev - 0.5, 0.5));
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={readerRef}
        className="fixed inset-0 z-50 h-full w-full flex flex-col bg-black text-white"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => setShowControls(!showControls)}
      >
        {/* Top Bar */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              className="absolute hidden top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-4">
                <button onClick={onClose} className="hover:text-gray-300">
                  <X className="h-6 w-6" />
                </button>
                <h2 className="font-medium text-white/90 truncate">
                  {chapter.title}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowChapterList(!showChapterList)
                  }}
                  className="hover:text-gray-300"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowSettings(!showSettings)
                  }}
                  className="hover:text-gray-300"
                >
                  <Settings className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFullscreen()
                  }}
                  className="hover:text-gray-300"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Container */}
        <div className="flex-1 relative overflow-hidden">
          {/* Different layout based on reading mode */}
          {readingMode === "Long Strip" ? (
            // Long Strip Mode - Full height scrollable container
            <div 
              ref={longStripRef}
              className="absolute inset-0 overflow-y-auto" 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Use a container with a fixed height estimate to stabilize layout */}
              <div 
                className="flex flex-col items-center p-4"
                style={{ 
                  minHeight: isLongStripStabilized ? `${totalPages * 800}px` : 'auto'
                }}
              >
                {/* Load Previous Pages button */}
                {visibleStartPage > 0 && (
                  <button
                    onClick={() => {
                      const newStart = Math.max(0, visibleStartPage - 10);
                      setVisibleStartPage(newStart);
                    }}
                    className="mb-8 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
                  >
                    წინა გვერდების ჩატვირთვა
                  </button>
                )}
                
                {/* Render pages from visibleStartPage to currentPage + buffer */}
                {Array.from({ length: Math.min(currentPage + 10, totalPages) - visibleStartPage }).map((_, idx) => {
                  const pageIndex = visibleStartPage + idx;
                  return (
                    <div 
                      key={pageIndex} 
                      className="mb-4 w-full max-w-3xl"
                      style={{ contain: 'content' }} // Optimize rendering
                    >
                      <PageImage 
                        src={chapter.pages[pageIndex]} 
                        alt={`Page ${pageIndex + 1}`}
                        index={pageIndex}
                        className={cn(
                          "w-full",
                          pageStretch === "Stretch" ? "w-full" : ""
                        )}
                        mode="Long Strip"
                      />
                      {/* Page number indicator - now conditional */}
                      {showPageNumbers && (
                        <div className="text-center text-sm text-gray-400 mt-1">
                          გვერდი {pageIndex + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Load more button at the bottom */}
                {currentPage + 10 < totalPages && (
                  <button
                    onClick={() => setCurrentPage(prev => prev + 10)}
                    className="mb-8 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
                  >
                    მეტი გვერდის ჩატვირთვა
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Single/Double Page Mode - Centered content with page controls
            <>
              {/* Left page control area */}
              <div
                className="absolute left-0 top-0 h-full w-1/4 cursor-w-resize z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  readingDirection === "Left to Right" ? goToPrevPage() : goToNextPage()
                }}
              />

              {/* Right page control area */}
              <div
                className="absolute right-0 top-0 h-full w-1/4 cursor-e-resize z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  readingDirection === "Left to Right" ? goToNextPage() : goToPrevPage()
                }}
              />

              {/* Page Content with AnimatePresence */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full w-full flex items-center justify-center p-4"
                >
                  {readingMode === "Double Page" ? (
                    // Double Page mode
                    <div className="flex items-center justify-center">
                      {/* Add conditional rendering based on reading direction */}
                      {readingDirection === "Left to Right" ? (
                        // Left to Right layout
                        <>
                          {currentPage > 0 && (
                            <div className="h-full flex items-center relative">
                              <PageImage 
                                src={chapter.pages[currentPage - 1]} 
                                alt={`Page ${currentPage}`}
                                index={currentPage - 1}
                                className="max-h-full pointer-events-auto" 
                              />
                            </div>
                          )}
                          
                          {/* Use a fixed width div that shows/hides instead of conditional rendering */}
                          <div className={cn("h-full", showPageGap ? "w-6" : "w-0")} />
                          
                          <PageImage 
                            src={chapter.pages[currentPage]} 
                            alt={`Page ${currentPage + 1}`}
                            index={currentPage}
                            className="max-h-full pointer-events-auto" 
                          />
                          
                          {/* Use a fixed width div that shows/hides instead of conditional rendering */}
                          <div className={cn("h-full", showPageGap ? "w-6" : "w-0")} />
                          
                          {currentPage < totalPages - 1 && (
                            <div className="h-full flex items-center relative">
                              <PageImage 
                                src={chapter.pages[currentPage + 1]} 
                                alt={`Page ${currentPage + 2}`}
                                index={currentPage + 1}
                                className="max-h-full pointer-events-auto" 
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        // Right to Left layout
                        <>
                          {currentPage < totalPages - 1 && (
                            <div className="h-full flex items-center relative">
                              <PageImage 
                                src={chapter.pages[currentPage + 1]} 
                                alt={`Page ${currentPage + 2}`}
                                index={currentPage + 1}
                                className="max-h-full pointer-events-auto" 
                              />
                            </div>
                          )}
                          
                          {/* Use a fixed width div that shows/hides instead of conditional rendering */}
                          <div className={cn("h-full", showPageGap ? "w-6" : "w-0")} />
                          
                          <PageImage 
                            src={chapter.pages[currentPage]} 
                            alt={`Page ${currentPage + 1}`}
                            index={currentPage}
                            className="max-h-full pointer-events-auto" 
                          />
                          
                          {/* Use a fixed width div that shows/hides instead of conditional rendering */}
                          <div className={cn("h-full", showPageGap ? "w-6" : "w-0")} />
                          
                          {currentPage > 0 && (
                            <div className="h-full flex items-center relative">
                              <PageImage 
                                src={chapter.pages[currentPage - 1]} 
                                alt={`Page ${currentPage}`}
                                index={currentPage - 1}
                                className="max-h-full pointer-events-auto" 
                              />
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Page number indicator (centered below) - now conditional */}
                      {showPageNumbers && (
                        <div className="absolute bottom-2 left-0 right-0 text-center text-sm text-gray-400">
                          გვერდები {currentPage > 0 ? currentPage : ''}{currentPage > 0 && currentPage + 1 < totalPages ? '-' : ''}{currentPage + 1}
                          {currentPage + 1 < totalPages ? `-${currentPage + 2}` : ''}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Single Page mode
                    <div className="relative">
                      <PageImage 
                        src={chapter.pages[currentPage]} 
                        alt={`Page ${currentPage + 1}`}
                        index={currentPage}
                        className="max-h-full" 
                      />
                      
                      {/* Page number indicator (centered below) - now conditional */}
                      {showPageNumbers && (
                        <div className="absolute bottom-2 left-0 right-0 text-center text-sm text-gray-400">
                          გვერდი {currentPage + 1}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}
          
          {/* Auto-scroll controls for Long Strip mode */}
          {readingMode === "Long Strip" && showControls && (
            <div className="absolute bottom-20 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-2 flex flex-col items-center space-y-2 z-20">
              <button 
                onClick={toggleAutoScroll}
                className="p-2 hover:bg-gray-800 rounded-full"
                title={isAutoScrolling ? "პაუზა" : "დაკვრა"}
              >
                {isAutoScrolling ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <div className="text-xs font-mono text-center">
                {autoScrollSpeed.toFixed(1)}x
              </div>
              
              <button 
                onClick={increaseScrollSpeed}
                className="p-2 hover:bg-gray-800 rounded-full"
                title="აჩქარება"
              >
                <FastForward size={16} />
              </button>
              
              <button 
                onClick={decreaseScrollSpeed}
                className="p-2 hover:bg-gray-800 rounded-full"
                title="შენელება"
              >
                <Rewind size={16} />
              </button>
            </div>
          )}
          
          {/* Chapter List Sidebar */}
          <AnimatePresence>
            {showChapterList && (
              <motion.div
                initial={{ opacity: 0, x: -300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -300 }}
                transition={{ duration: 0.3 }}
                className="absolute left-0 top-0 h-full w-72 bg-gray-900/90 backdrop-blur-md z-20 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4">
                  <h3 className="text-lg font-bold mb-4">Chapters</h3>
                  <div className="space-y-2">
                    {chapterList.map((item, index) => (
                      <motion.button
                        key={item.number}
                        onClick={() => {
                          onChapterSelect(index)
                          setCurrentPage(0)
                          setShowChapterList(false)
                        }}
                        className={`w-full text-left p-2 rounded ${
                          chapter.number === item.number
                            ? "bg-pink-600/20 text-pink-400"
                            : "hover:bg-gray-800"
                        }`}
                        whileHover={{ x: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.title}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ duration: 0.3 }}
                className="absolute right-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-md z-20 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Reader Settings</h3>
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="text-gray-400 hover:text-white rounded-full hover:bg-gray-800 p-1"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-8">
                    {/* Reading Mode */}
                    <div className="space-y-3 bg-gray-800/40 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-white">კითხვის რეჟიმი</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {(["Long Strip", "Single Page", "Double Page"] as ReadingMode[]).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => {
                              setReadingMode(mode);
                              setIsLongStripStabilized(false);
                            }}
                            className={cn(
                              "px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 justify-center",
                              mode === readingMode 
                                ? "bg-blue-600 text-white shadow-md" 
                                : "bg-gray-800/70 text-gray-300 hover:bg-gray-700"
                            )}
                          >
                            {mode === "Long Strip" && "გრძელი ზოლი"}
                            {mode === "Single Page" && "ერთი გვერდი"}
                            {mode === "Double Page" && "ორი გვერდი"}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Reading Direction */}
                    <div className="space-y-3 bg-gray-800/40 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-white">კითხვის მიმართულება</h4>
                      <div className="flex gap-2">
                        {(["Left to Right", "Right to Left"] as ReadingDirection[]).map((direction) => (
                          <button
                            key={direction}
                            onClick={() => setReadingDirection(direction)}
                            className={cn(
                              "flex-1 px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1 justify-center",
                              direction === readingDirection 
                                ? "bg-blue-600 text-white shadow-md" 
                                : "bg-gray-800/70 text-gray-300 hover:bg-gray-700"
                            )}
                          >
                            {direction === "Left to Right" ? (
                              <ArrowRight className="h-3 w-3 opacity-70" />
                            ) : (
                              <ArrowLeft className="h-3 w-3 opacity-70" />
                            )}
                            {direction === "Left to Right" ? "მარცხნიდან მარჯვნივ" : "მარჯვნიდან მარცხნივ"}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Page Fit */}
                    <div className="space-y-3 bg-gray-800/40 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-white">გვერდის მორგება</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {(["Contain", "Overflow", "Cover", "True size"] as PageFit[]).map((fit) => (
                          <button
                            key={fit}
                            onClick={() => setPageFit(fit)}
                            className={cn(
                              "px-3 py-1.5 rounded-md text-sm transition-colors",
                              fit === pageFit 
                                ? "bg-blue-600 text-white shadow-md" 
                                : "bg-gray-800/70 text-gray-300 hover:bg-gray-700"
                            )}
                          >
                            {fit === "Contain" && "შემცველობა"}
                            {fit === "Overflow" && "გადავსება"}
                            {fit === "Cover" && "დაფარვა"}
                            {fit === "True size" && "ნამდვილი ზომა"}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Page Stretch */}
                    <div className="space-y-3 bg-gray-800/40 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-white">გვერდის გაჭიმვა</h4>
                      <div className="flex gap-2">
                        {(["None", "Stretch"] as PageStretch[]).map((stretch) => (
                          <button
                            key={stretch}
                            onClick={() => setPageStretch(stretch)}
                            className={cn(
                              "px-3 py-1.5 rounded-md text-sm transition-colors",
                              stretch === pageStretch 
                                ? "bg-blue-600 text-white shadow-md" 
                                : "bg-gray-800/70 text-gray-300 hover:bg-gray-700"
                            )}
                          >
                            {stretch === "None" && "არაფერი"}
                            {stretch === "Stretch" && "გაჭიმვა"}
                          </button>
                        ))}
                      </div>
                      
                      <p className="text-xs text-gray-400 italic mt-2">
                        'გაჭიმვა' გვერდებს აიძულებს ჰქონდეთ იგივე სიგანე, რაც კონტეინერს 'გრძელი ზოლის' რეჟიმში.
                      </p>
                    </div>
                    
                    {/* Toggle options */}
                    <div className="space-y-4 bg-gray-800/40 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-white mb-2">ჩვენების პარამეტრები</h4>
                      
                      <div className="flex items-center justify-between py-1 border-b border-gray-800">
                        <span className="text-sm text-gray-300">გვერდებს შორის მანძილი</span>
                        <button
                          onClick={() => setShowPageGap(!showPageGap)}
                          className={cn(
                            "w-10 h-5 rounded-full relative transition-colors duration-200",
                            showPageGap ? "bg-blue-500" : "bg-gray-700"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 bg-white rounded-full w-4 h-4 transition-transform duration-200 shadow-sm",
                              showPageGap && "transform translate-x-5"
                            )}
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between py-1 border-b border-gray-800">
                        <span className="text-sm text-gray-300">პროგრესის ზოლი</span>
                        <button
                          onClick={() => setShowProgressBar(!showProgressBar)}
                          className={cn(
                            "w-10 h-5 rounded-full relative transition-colors duration-200",
                            showProgressBar ? "bg-blue-500" : "bg-gray-700"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 bg-white rounded-full w-4 h-4 transition-transform duration-200 shadow-sm",
                              showProgressBar && "transform translate-x-5"
                            )}
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between py-1 border-b border-gray-800">
                        <span className="text-sm text-gray-300">გვერდის ნომრები</span>
                        <button
                          onClick={() => setShowPageNumbers(!showPageNumbers)}
                          className={cn(
                            "w-10 h-5 rounded-full relative transition-colors duration-200",
                            showPageNumbers ? "bg-blue-500" : "bg-gray-700"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 bg-white rounded-full w-4 h-4 transition-transform duration-200 shadow-sm",
                              showPageNumbers && "transform translate-x-5"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setReadingMode("Single Page");
                        setReadingDirection("Left to Right");
                        setPageFit("Contain");
                        setPageStretch("None");
                        setShowPageGap(true);
                        setShowProgressBar(true);
                        setShowPageNumbers(true);
                        setIsAutoScrolling(false);
                        setAutoScrollSpeed(1);
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm text-center text-white font-medium transition-colors shadow-md"
                    >
                      საწყის პარამეტრებზე დაბრუნება
                    </button>
                    
                    {/* Keyboard Shortcuts */}
                    <div className="space-y-3 bg-gray-800/40 rounded-lg p-4 mt-6">
                      <h4 className="text-sm font-medium text-white mb-2">კლავიატურის კომბინაციები</h4>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1">
                          <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400 text-xs font-mono">[</span>
                          <span className="text-sm text-gray-300">წინა თავი</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400 text-xs font-mono">]</span>
                          <span className="text-sm text-gray-300">შემდეგი თავი</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400 text-xs font-mono">←</span>
                          <span className="text-sm text-gray-300">წინა გვერდი</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400 text-xs font-mono">→</span>
                          <span className="text-sm text-gray-300">შემდეგი გვერდი</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400 text-xs font-mono">u</span>
                          <span className="text-sm text-gray-300">პროგრესის განახლება და შემდეგ თავზე გადასვლა</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400 text-xs font-mono">b</span>
                          <span className="text-sm text-gray-300">ქვედა ზოლის ჩვენება/დამალვა</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        <AnimatePresence>
          {(showControls || showBottomBar) && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-30 flex flex-col"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.2 }}
            >
              {/* Progress bar with chapter selector */}
              {showProgressBar && (
                <div className="h-2 bg-black/50 backdrop-blur-sm flex flex-col">
                  {readingMode === "Long Strip" ? (
                    // Custom progress bar for Long Strip mode
                    <div className="h-full w-full relative">
                      <div 
                        className="absolute inset-0 overflow-hidden rounded-none"
                        style={{
                          background: "linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)"
                        }}
                      >
                        <div
                          ref={progressBarRef}
                          className="h-full w-full transition-transform duration-300 ease-in-out"
                          style={{ 
                            transform: `translateX(-${100 - calculateLongStripProgress()}%)`,
                            background: "linear-gradient(90deg, #8A2BE2 0%, #4169E1 100%)",
                            boxShadow: "0 0 8px rgba(138, 43, 226, 0.5)"
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    // Original paged progress bar
                    <div className="h-full flex">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentPage(idx)
                          }}
                          className={cn(
                            "h-full flex-1 border-r border-black/20 hover:bg-gray-700/50 transition-colors relative group",
                            currentPage === idx && "bg-gradient-to-r from-purple-500 to-blue-500"
                          )}
                        >
                          <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black px-1.5 py-0.5 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Page {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Main controls bar */}
              <div className="py-3 px-4 bg-black/80 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onClose()
                    }}
                    className="mr-3 p-1 rounded-full hover:bg-gray-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <h3 className="text-sm font-medium">
                    Chapter {chapter.number}: {chapter.title}
                  </h3>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <button
                    onClick={navigateToPrevChapter}
                    className="p-1 rounded-full hover:bg-gray-800"
                    disabled={chapterList.findIndex(c => c.number === chapter.number) === 0}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  <div className="px-2">
                    <span className="font-bold">{currentPage + 1}</span>
                    <span className="mx-1 text-gray-400">/</span>
                    <span className="text-gray-300">{totalPages}</span>
                  </div>
                  
                  <button
                    onClick={navigateToNextChapter}
                    className="p-1 rounded-full hover:bg-gray-800"
                    disabled={chapterList.findIndex(c => c.number === chapter.number) === chapterList.length - 1}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowSettings(!showSettings)
                    }}
                    className="p-1 rounded-full hover:bg-gray-800"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFullscreen()
                    }}
                    className="p-1 rounded-full hover:bg-gray-800"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-5 w-5" />
                    ) : (
                      <Maximize2 className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Show info about the manga/chapter
                    }}
                    className="p-1 rounded-full hover:bg-gray-800"
                  >
                    <Info className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
