"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Play } from "lucide-react"
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
}

interface EpisodeListProps {
  episodes: Episode[]
  currentEpisode?: number
  onSelectEpisode: (index: number) => void
}

export function EpisodeList({ episodes, currentEpisode, onSelectEpisode }: EpisodeListProps) {
  const [hoveredEpisode, setHoveredEpisode] = useState<number | null>(null)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {episodes.map((episode, index) => (
        <motion.div
          key={episode.number}
          className={cn(
            "bg-gray-800/30 rounded-lg overflow-hidden cursor-pointer group relative",
            currentEpisode === index && "ring-2 ring-primary"
          )}
          whileHover={{ scale: 1.03 }}
          onMouseEnter={() => setHoveredEpisode(index)}
          onMouseLeave={() => setHoveredEpisode(null)}
          onClick={() => onSelectEpisode(index)}
        >
          <div className="aspect-video relative">
            <ImageSkeleton
              src={episode.thumbnail}
              alt={`Episode ${episode.number}`}
              className="w-full h-full object-cover"
            />
            
            {/* Play overlay */}
            <div 
              className={cn(
                "absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200",
                hoveredEpisode === index ? "opacity-100" : "opacity-0"
              )}
            >
              <div className="bg-primary/90 rounded-full p-3">
                <Play className="h-6 w-6" />
              </div>
            </div>
            
            {/* Episode number badge */}
            <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs font-medium">
              Episode {episode.number}
            </div>
            
            {/* Watched badge */}
            {episode.watched && (
              <div className="absolute top-2 right-2 bg-primary px-2 py-1 rounded text-xs font-medium">
                Watched
              </div>
            )}
          </div>
          
          <div className="p-3">
            <h3 className="font-medium text-sm mb-1 truncate">
              {episode.title}
            </h3>
            <p className="text-gray-400 text-xs">
              {episode.releaseDate}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
} 