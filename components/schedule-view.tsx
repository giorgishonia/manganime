import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { getAnimeSchedule, formatAiringTime, getAiringDay } from "@/lib/anilist"
import { ListItemSkeleton } from "@/components/ui/skeleton"

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
      staggerChildren: 0.05 
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
    scale: 1.02,
    y: -5,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

export function ScheduleView() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [scheduleData, setScheduleData] = useState<any[]>([])
  const [groupedSchedule, setGroupedSchedule] = useState<Record<string, any[]>>({})
  const scheduleRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  useEffect(() => {
    async function fetchScheduleData() {
      try {
        const data = await getAnimeSchedule()
        
        // Sort by airing date
        const sortedData = [...data].sort((a, b) => a.airingAt - b.airingAt)
        setScheduleData(sortedData)
        
        // Group by day
        const grouped = sortedData.reduce((acc: Record<string, any[]>, schedule) => {
          const day = formatFullDate(schedule.airingAt)
          if (!acc[day]) {
            acc[day] = []
          }
          acc[day].push(schedule)
          return acc
        }, {})
        
        setGroupedSchedule(grouped)
        
        // Delay to allow for animations
        setTimeout(() => {
          setIsLoading(false)
        }, 500)
      } catch (error) {
        console.error("Error fetching schedule data:", error)
        setIsLoading(false)
      }
    }
    
    fetchScheduleData()
  }, [])

  // Navigate to anime detail page
  const handleAnimeClick = (animeId: number) => {
    router.push(`/anime/${animeId}`)
  }

  // Format date like "Thursday, Apr 17, 2025"
  function formatFullDate(timestamp: number) {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  // Format time like "6:30 AM"
  function formatTime(timestamp: number) {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
  
  // Check if date is today
  function isToday(timestamp: number) {
    const date = new Date(timestamp * 1000)
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }
  
  // Set up refs and scrolling effects for each day section
  useEffect(() => {
    // Cleanup functions array
    const cleanupFunctions: Array<() => void> = [];
    
    // Apply drag scroll and auto scroll to each section
    Object.keys(groupedSchedule).forEach((day, index) => {
      const ref = scheduleRefs.current.get(day);
      if (ref) {
        // Set up drag scrolling
        const dragCleanup = setupDragScroll(ref);
        cleanupFunctions.push(dragCleanup);
        
        // Set up auto scrolling with different intervals per day
        const baseInterval = 5000;
        const interval = baseInterval + (index * 300); // Slightly offset each day
        const autoScrollCleanup = setupAutoScroll(ref, interval);
        cleanupFunctions.push(autoScrollCleanup);
      }
    });
    
    // Return a cleanup function that calls all the individual cleanup functions
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [groupedSchedule]);

  // Callback ref function to store references to schedule section carousels
  const setScheduleRef = (day: string) => (el: HTMLDivElement | null) => {
    scheduleRefs.current.set(day, el)
  }

  if (isLoading) {
    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <motion.h1 
          variants={itemVariants}
          className="text-3xl font-bold text-center mb-8"
        >
          Airing schedule
        </motion.h1>
        
        {[1, 2, 3].map((day) => (
          <motion.section key={day} className="space-y-4" variants={itemVariants}>
            <motion.div className="flex items-center">
              <motion.div className="w-32 h-6 bg-gray-800 rounded animate-pulse"></motion.div>
            </motion.div>
            <motion.div className="flex overflow-x-hidden space-x-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <ListItemSkeleton key={`day-${day}-item-${item}`} />
              ))}
            </motion.div>
          </motion.section>
        ))}
      </motion.div>
    )
  }

  if (Object.keys(groupedSchedule).length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center py-8"
      >
        <p>No schedule data available</p>
      </motion.div>
    )
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.h1 
        variants={itemVariants}
        className="text-3xl font-bold text-center mb-8"
      >
        Airing schedule
      </motion.h1>

      <AnimatePresence>
        {Object.entries(groupedSchedule).map(([date, schedules], dayIndex) => {
          return (
            <motion.section 
              key={date} 
              className="space-y-4"
              variants={itemVariants}
              layout
            >
              <motion.h2 
                className="text-xl font-semibold flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * dayIndex }}
              >
                {date}
                {isToday(schedules[0].airingAt) && (
                  <motion.span 
                    className="ml-2 text-sm bg-gray-800 px-2 py-0.5 rounded"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * dayIndex + 0.2 }}
                  >
                    Today
                  </motion.span>
                )}
              </motion.h2>

              <div 
                ref={setScheduleRef(date)}
                className="flex overflow-x-auto pb-4 space-x-4 cursor-grab no-scrollbar"
              >
                {schedules.map((schedule, idx) => (
                  <motion.div 
                    key={schedule.id} 
                    className="flex items-center gap-3 bg-gray-800 rounded-md p-3 hover:bg-gray-700 transition-colors cursor-pointer flex-none w-[280px]"
                    onClick={() => handleAnimeClick(schedule.media.id)}
                    variants={cardHoverVariants}
                    initial="initial"
                    whileHover="hover"
                    animate={{ 
                      opacity: 1, 
                      x: 0, 
                      transition: { delay: 0.03 * idx }
                    }}
                  >
                    <img
                      src={schedule.media.coverImage.medium || "/placeholder.svg"}
                      alt={schedule.media.title.english || schedule.media.title.romaji}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2">
                        {schedule.media.title.english || schedule.media.title.romaji}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Ep {schedule.episode} airing at {formatTime(schedule.airingAt)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )
        })}
      </AnimatePresence>
    </motion.div>
  )
}
