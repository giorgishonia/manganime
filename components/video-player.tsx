"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { FastForward, Maximize2, Minimize2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react"
import { ImageSkeleton } from "@/components/image-skeleton"
import { cn } from "@/lib/utils"

interface Episode {
  number: number
  title: string
  thumbnail: string
  aired: string
  watched: boolean
}

interface VideoPlayerProps {
  episode: Episode
  onClose: () => void
  episodeList: Episode[]
  onEpisodeSelect: (index: number) => void
}

export function VideoPlayer({ episode, onClose, episodeList, onEpisodeSelect }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
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
  }, [episode])

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

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }

  return (
    <motion.div
      ref={playerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "relative bg-black rounded-lg overflow-hidden",
        isFullscreen ? "fixed inset-0 z-50" : "aspect-video",
      )}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        poster="/placeholder.svg?height=720&width=1280"
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
      >
        <source src="/video-placeholder.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Video Controls */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-lg">
              Episode {episode.number}: {episode.title}
            </h3>
          </div>
        </div>

        {/* Center play button */}
        <button
          onClick={togglePlay}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          {isPlaying ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10" />}
        </button>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
            <span className="text-sm">{formatTime(duration)}</span>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button>
                <SkipBack className="h-5 w-5" />
              </button>
              <button>
                <SkipForward className="h-5 w-5" />
              </button>
              <button>
                <FastForward className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Episode list */}
      <div className="absolute top-0 right-0 bottom-0 w-64 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
        <h3 className="font-medium mb-4">Episodes</h3>
        <div className="space-y-3">
          {episodeList.map((ep, index) => (
            <div
              key={ep.number}
              className={cn(
                "flex gap-3 p-2 rounded cursor-pointer",
                episode.number === ep.number ? "bg-gray-700" : "hover:bg-gray-800",
              )}
              onClick={() => onEpisodeSelect(index)}
            >
              <div className="w-16 flex-shrink-0">
                <ImageSkeleton
                  src={ep.thumbnail || "/placeholder.svg"}
                  alt={`Episode ${ep.number}`}
                  className="w-full aspect-video rounded"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Episode {ep.number}</div>
                <div className="text-xs text-gray-400 truncate">{ep.title}</div>
              </div>
            </div>
          ))}
          <div className="text-center py-2 text-gray-400">End</div>
        </div>
      </div>
    </motion.div>
  )
}
