"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Play, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageSkeleton } from "@/components/image-skeleton"

interface Episode {
  number: number
  title: string
  thumbnail: string
  releaseDate: string
  description?: string
  videoUrl?: string
  watched?: boolean
  duration?: number
}

interface EpisodeListProps {
  episodes: Episode[]
  currentEpisode?: number
  onSelectEpisode: (index: number) => void
}

// Animation variants
const listVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.05,
      ease: [0.22, 1, 0.36, 1]
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

export function EpisodeList({ episodes, currentEpisode, onSelectEpisode }: EpisodeListProps) {
  const [hoveredEpisode, setHoveredEpisode] = useState<number | null>(null)

  return (
    <motion.div 
      className="space-y-3"
      variants={listVariants}
      initial="hidden"
      animate="visible"
    >
      {episodes.map((episode, index) => (
        <motion.div
          key={episode.number}
          variants={itemVariants}
          className={cn(
            "bg-white/5 hover:bg-white/10 rounded-lg overflow-hidden cursor-pointer group transition-all duration-200",
            currentEpisode === index && "ring-2 ring-primary/80"
          )}
          whileHover={{ scale: 1.01, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onSelectEpisode(index)}
          onMouseEnter={() => setHoveredEpisode(index)}
          onMouseLeave={() => setHoveredEpisode(null)}
        >
          <div className="flex flex-col sm:flex-row">
            <div className="w-full sm:w-36 aspect-video relative flex-shrink-0">
              <ImageSkeleton
                src={episode.thumbnail}
                alt={`Episode ${episode.number}`}
                className="w-full h-full object-cover"
              />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              
              {/* Play overlay */}
              <motion.div 
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: hoveredEpisode === index ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div 
                  className="bg-primary/90 rounded-full p-3 shadow-xl"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Play className="h-5 w-5" />
                </motion.div>
              </motion.div>
              
              {/* Episode number badge */}
              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                Ep {episode.number}
              </div>
              
              {/* Watched badge */}
              {episode.watched && (
                <div className="absolute top-2 right-2 bg-primary/90 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Watched</span>
                </div>
              )}
            </div>
            
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-medium text-sm mb-1 group-hover:text-primary/90 transition-colors">
                  {episode.title}
                </h3>
                {episode.description && (
                  <p className="text-white/60 text-xs line-clamp-2 mb-2">
                    {episode.description}
                  </p>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-xs">
                  {episode.releaseDate}
                </span>
                <div className="flex items-center gap-2">
                  {episode.duration && (
                    <span className="text-white/50 text-xs">
                      {episode.duration} min
                    </span>
                  )}
                  <motion.div 
                    className="text-primary/80"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Play className="h-4 w-4" />
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
} 