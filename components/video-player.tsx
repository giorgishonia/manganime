"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  FastForward, 
  Maximize2, 
  Minimize2, 
  Pause, 
  Play, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  X,
  ChevronDown,
  ChevronRight,
  Settings,
  PictureInPicture2,
  Minimize,
  Maximize
} from "lucide-react"
import { ImageSkeleton } from "@/components/image-skeleton"
import { cn } from "@/lib/utils"

interface Episode {
  number: number
  title: string
  thumbnail: string
  releaseDate: string
  watched?: boolean
  duration?: number
  description?: string
  videoUrl?: string
}

interface VideoPlayerProps {
  url?: string
  title: string
  onClose: () => void
  episodeList?: Episode[]
  onEpisodeSelect?: (index: number) => void
  currentEpisode?: number
}

// Animation variants
const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } }
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 30 
    } 
  }
};

export function VideoPlayer({ 
  url = "/video-placeholder.mp4", 
  title, 
  onClose, 
  episodeList = [], 
  onEpisodeSelect,
  currentEpisode = 0
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showChapterList, setShowChapterList] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [quality, setQuality] = useState("1080p")
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Simulate video loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current) {
        setDuration(1447) // 24:07 in seconds
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [title])

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }

      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false)
        }
      }, 3000)
    }

    document.addEventListener("mousemove", handleMouseMove)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying])

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

  // Auto-enter fullscreen when player opens
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.requestFullscreen().catch((err) => {
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

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setVolume(newVolume)
      setIsMuted(newVolume === 0)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = Number.parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime
      setCurrentTime(seekTime)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && playerRef.current) {
      playerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const changePlaybackSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    }
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
    }
  };

  return (
    <motion.div
      ref={playerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "relative bg-black w-full h-full flex items-center justify-center",
        isFullscreen ? "fixed inset-0 z-50" : "aspect-video"
      )}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Video */}
      <video
        ref={videoRef}
        className="max-w-full max-h-full object-contain bg-black"
        poster="/placeholder.svg?height=720&width=1280"
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
      >
        <source src={url} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Video Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"
          >
            {/* Top controls - title and close button */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
              <motion.h3 
                className="font-medium text-lg truncate max-w-[70%]"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                {title}
              </motion.h3>
              
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  onClick={() => setShowChapterList(!showChapterList)}
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* Center play button */}
            <motion.button
              onClick={togglePlay}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isPlaying ? 
                <Pause className="h-10 w-10" /> : 
                <Play className="h-10 w-10 ml-1" />
              }
            </motion.button>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {/* Progress bar */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium">{formatTime(currentTime)}</span>
                <div className="relative flex-1 group">
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="absolute h-3 w-3 bg-primary rounded-full top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{formatTime(duration)}</span>
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.button 
                    onClick={togglePlay}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </motion.button>
                  
                  <motion.button
                    onClick={skipBackward}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <SkipBack className="h-5 w-5" />
                  </motion.button>
                  
                  <motion.button
                    onClick={skipForward}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <SkipForward className="h-5 w-5" />
                  </motion.button>
                  
                  <div className="flex items-center gap-2">
                    <motion.button 
                      onClick={toggleMute}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </motion.button>
                    
                    <div className="relative w-20 group">
                      <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300 ease-out"
                          style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  <div className="text-xs font-medium bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition-colors cursor-pointer">
                    {playbackSpeed}x
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <motion.button 
                    onClick={toggleFullscreen}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            variants={scaleVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute top-16 right-4 w-60 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg p-4 shadow-xl"
          >
            <h4 className="font-medium mb-3 flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              პარამეტრები
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <h5 className="text-xs text-white/60">დაკვრის სიჩქარე</h5>
                <div className="grid grid-cols-4 gap-2">
                  {[0.5, 1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      className={cn(
                        "text-xs py-1 px-2 rounded transition-colors",
                        playbackSpeed === speed ? "bg-primary text-white" : "bg-white/10 hover:bg-white/20"
                      )}
                      onClick={() => changePlaybackSpeed(speed)}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <h5 className="text-xs text-white/60">ხარისხი</h5>
                <div className="space-y-1">
                  {["480p", "720p", "1080p"].map((q) => (
                    <button
                      key={q}
                      className={cn(
                        "text-xs py-1.5 px-3 rounded transition-colors w-full text-left",
                        quality === q ? "bg-primary text-white" : "bg-white/10 hover:bg-white/20"
                      )}
                      onClick={() => setQuality(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Episode list panel */}
      <AnimatePresence>
        {showChapterList && episodeList.length > 0 && (
          <motion.div
            variants={scaleVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute top-16 right-4 w-64 max-h-[70vh] bg-black/90 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-xl flex flex-col"
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <h4 className="font-medium flex items-center">
                <ChevronRight className="h-4 w-4 mr-1" />
                ეპიზოდები 
                <span className="ml-1 text-xs text-white/60">({episodeList.length})</span>
              </h4>
              <button 
                className="text-white/60 hover:text-white"
                onClick={() => setShowChapterList(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2">
              <div className="space-y-2">
                {episodeList.map((episode, index) => (
                  <motion.button
                    key={episode.number}
                    className={cn(
                      "w-full rounded-md p-2 text-left text-sm flex items-start gap-2 transition-colors",
                      currentEpisode === index ? "bg-primary/20 text-primary" : "hover:bg-white/10"
                    )}
                    onClick={() => onEpisodeSelect?.(index)}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-16 h-9 rounded overflow-hidden relative flex-shrink-0">
                      <ImageSkeleton
                        src={episode.thumbnail}
                        alt={`Episode ${episode.number}`}
                        className="object-cover"
                      />
                      {currentEpisode === index && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Play className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">
                        Ep {episode.number}
                      </div>
                      <div className="text-xs text-white/60 truncate">
                        {episode.title}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
