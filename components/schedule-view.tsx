"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion as m, AnimatePresence } from "framer-motion"
import { getAnimeSchedule, formatAiringTime, getAiringDay } from "@/lib/anilist"
import { ListItemSkeleton } from "@/components/ui/skeleton"
import { Play } from "lucide-react"

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

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 25,
      when: "beforeChildren",
      staggerChildren: 0.05
    }
  }
};

const cardHoverVariants = {
  initial: { 
    opacity: 0.9, 
    y: 10, 
    scale: 0.98 
  },
  hover: { 
    opacity: 1, 
    y: -3, 
    scale: 1.02,
    boxShadow: "0 14px 28px rgba(0,0,0,0.25)",
    transition: { duration: 0.2 }
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
      <m.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <m.h1 
          variants={sectionVariants}
          className="text-3xl font-bold text-center mb-8"
        >
          Airing schedule
        </m.h1>
        
        {[1, 2, 3].map((day) => (
          <m.section key={day} className="space-y-4" variants={sectionVariants}>
            <m.div className="flex items-center">
              <m.div className="w-32 h-6 bg-gray-800 rounded animate-pulse"></m.div>
            </m.div>
            <m.div className="flex overflow-x-hidden space-x-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <ListItemSkeleton key={`day-${day}-item-${item}`} />
              ))}
            </m.div>
          </m.section>
        ))}
      </m.div>
    )
  }

  if (Object.keys(groupedSchedule).length === 0) {
    return (
      <m.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center py-8"
      >
        <p>No schedule data available</p>
      </m.div>
    )
  }

  return (
    <m.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <h1 className="text-3xl font-bold mb-6 text-glow">Airing Schedule</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {Object.entries(groupedSchedule).map(([date, schedules], dayIndex) => {
            return (
              <m.section 
                key={date} 
                className="relative bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/5"
                variants={sectionVariants}
              >
                <div className="flex items-center mb-5 gap-3">
                  <div className={`${isToday(schedules[0].airingAt) ? 'bg-indigo-600' : 'bg-white/10'} px-3 py-1 rounded-full text-sm font-medium`}>
                    {getAiringDay(schedules[0].airingAt)}
            </div>
                  <h2 className="text-xl font-bold">
                    {formatFullDate(schedules[0].airingAt).replace(getAiringDay(schedules[0].airingAt) + ',', '')}
                  </h2>
                  {isToday(schedules[0].airingAt) && (
                    <span className="bg-indigo-600/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
          </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {schedules.map((schedule, idx) => (
                    <m.div 
                      key={schedule.id} 
                      className="flex items-center gap-3 backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer card-shadow transform hover:-translate-y-1 transition-transform duration-300"
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
                        className="w-12 h-12 object-cover rounded-md border border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm line-clamp-1 group-hover:text-white transition-colors">
                          {schedule.media.title.english || schedule.media.title.romaji}
                        </h3>
                        <div className="flex items-center mt-1 gap-2">
                          <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Play className="h-3 w-3" fill="currentColor" />
                            Ep {schedule.episode}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTime(schedule.airingAt)}
                          </span>
            </div>
          </div>
                    </m.div>
                  ))}
        </div>
              </m.section>
            )
          })}
        </AnimatePresence>
    </div>
    </m.div>
  )
}
