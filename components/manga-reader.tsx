"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Maximize2, Minimize2, Settings, X, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

interface Chapter {
  number: number
  title: string
  thumbnail: string
  pages: string[]
}

interface MangaReaderProps {
  chapter: Chapter
  chapterList: Chapter[]
  onClose: () => void
  onChapterSelect: (index: number) => void
}

type ReadingMode = "Long Strip" | "Single Page" | "Double Page"
type ReadingDirection = "Left to Right" | "Right to Left"
type PageFit = "Contain" | "Overflow" | "Cover" | "True size"
type PageStretch = "None" | "Stretch"

export function MangaReader({ chapter, chapterList, onClose, onChapterSelect }: MangaReaderProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [readingMode, setReadingMode] = useState<ReadingMode>("Single Page")
  const [readingDirection, setReadingDirection] = useState<ReadingDirection>("Left to Right")
  const [pageFit, setPageFit] = useState<PageFit>("Contain")
  const [pageStretch, setPageStretch] = useState<PageStretch>("None")
  const [showPageGap, setShowPageGap] = useState(true)
  const [showPageGapShadow, setShowPageGapShadow] = useState(true)
  const [showProgressBar, setShowProgressBar] = useState(true)
  const [showBottomBar, setShowBottomBar] = useState(true)
  const [showChapterList, setShowChapterList] = useState(false)

  const readerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      goToNextPage()
    } else if (e.key === "ArrowLeft") {
      goToPrevPage()
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
    }
  }

  return (
    <div
      ref={readerRef}
      className="h-full w-full flex flex-col bg-black text-white"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => setShowControls(!showControls)}
    >
      {/* Top Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="hover:text-gray-300">
                <X className="h-6 w-6" />
              </button>
              <h2 className="font-medium">
                {chapter.title} • Page {currentPage + 1} of {totalPages}
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
              <button className="hover:text-gray-300">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Left page control area */}
        <div
          className="absolute left-0 top-0 h-full w-1/4 cursor-w-resize z-10"
          onClick={(e) => {
            e.stopPropagation()
            goToPrevPage()
          }}
        />

        {/* Right page control area */}
        <div
          className="absolute right-0 top-0 h-full w-1/4 cursor-e-resize z-10"
          onClick={(e) => {
            e.stopPropagation()
            goToNextPage()
          }}
        />

        {/* Current Page */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-h-full max-w-full p-4 flex items-center justify-center"
          >
            <img
              src={chapter.pages[currentPage]}
              alt={`Page ${currentPage + 1}`}
              className="max-h-full max-w-full object-contain"
            />
          </motion.div>
        </AnimatePresence>

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
      </div>

      {/* Bottom Navigation */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToPrevPage()
              }}
              disabled={currentPage === 0}
              className={`p-2 rounded-full ${
                currentPage === 0 ? "text-gray-600" : "hover:bg-gray-800"
              }`}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <input
              type="range"
              min={0}
              max={totalPages - 1}
              value={currentPage}
              onChange={(e) => setCurrentPage(parseInt(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="w-1/2 accent-pink-500"
            />

            <button
              onClick={(e) => {
                e.stopPropagation()
                goToNextPage()
              }}
              disabled={currentPage === totalPages - 1}
              className={`p-2 rounded-full ${
                currentPage === totalPages - 1 ? "text-gray-600" : "hover:bg-gray-800"
              }`}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
