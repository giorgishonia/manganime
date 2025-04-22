"use client"

import React, { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Heart, 
  Info, 
  MoreHorizontal, 
  Play, 
  Plus, 
  Star, 
  Video, 
  Users, 
  BookOpen, 
  Download, 
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageSkeleton } from "@/components/image-skeleton"
import { VideoPlayer } from "@/components/video-player"
import { CharacterList } from "@/components/character-list"
import { RelatedContent } from "@/components/related-content"
import { RecommendedContent } from "@/components/recommended-content"
import { getAnimeById, formatDate, formatStatus, formatAiringTime, getSeasonName, stripHtml, getAiringDay } from "@/lib/anilist"
import { DetailViewSkeleton } from "@/components/ui/skeleton"

// Animation variants
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

const sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

export default function AnimePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  // Workaround for TypeScript errors with React.use()
  // This satisfies the Next.js recommendation while keeping TypeScript happy
  const unwrappedParams = React.use(params as any) as { id: string };
  const animeId = unwrappedParams.id;
  const [isStreamingOpen, setIsStreamingOpen] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState(0)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [showUnwatched, setShowUnwatched] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [animeData, setAnimeData] = useState<any>(null)

  // Handle scroll effect for background
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const position = scrollRef.current.scrollTop
        setScrollPosition(position)
      }
    }

    const currentScrollRef = scrollRef.current
    if (currentScrollRef) {
      currentScrollRef.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      if (currentScrollRef) {
        currentScrollRef.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  // Fetch anime data from AniList API
  useEffect(() => {
    async function fetchAnimeData() {
      try {
        const data = await getAnimeById(animeId);
        setAnimeData(data);
      } catch (error) {
        console.error("Error fetching anime data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnimeData();
  }, [animeId]);

  const handleBackClick = () => {
    if (isStreamingOpen) {
      setIsStreamingOpen(false)
    } else {
      router.back()
    }
  }

  const handleStreamingClick = (episodeIndex = 0) => {
    setSelectedEpisode(episodeIndex)
    setIsStreamingOpen(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const toggleWatchlist = () => {
    setInWatchlist(!inWatchlist);
  }

  // Process data for UI if available
  const processedData = animeData ? {
    id: animeData.id,
    title: animeData.title.english || animeData.title.romaji,
    subtitle: animeData.title.native,
    coverImage: animeData.coverImage.large,
    bannerImage: animeData.bannerImage,
    releaseDate: `${getSeasonName(animeData.season)} ${animeData.seasonYear}`,
    status: formatStatus(animeData.status),
    episodes: animeData.episodes || 0,
    currentEpisode: animeData.nextAiringEpisode ? animeData.nextAiringEpisode.episode - 1 : 0,
    nextEpisode: {
      number: animeData.nextAiringEpisode ? animeData.nextAiringEpisode.episode : 1,
      title: "Next Episode",
      airsIn: animeData.nextAiringEpisode ? formatAiringTime(animeData.nextAiringEpisode.timeUntilAiring) : "N/A",
      airsOn: animeData.nextAiringEpisode ? getAiringDay(animeData.nextAiringEpisode.airingAt) : "N/A",
    },
    rating: animeData.averageScore / 10,
    popularity: animeData.popularity,
    genres: animeData.genres,
    studio: animeData.studios.nodes[0]?.name || "Unknown",
    synopsis: stripHtml(animeData.description),
    episodeList: Array.from({length: animeData.nextAiringEpisode ? animeData.nextAiringEpisode.episode : (animeData.episodes || 3)}, (_, i) => ({
      number: i + 1,
      title: i + 1 === (animeData.nextAiringEpisode?.episode || 0) ? "Coming Soon" : `Episode ${i + 1}`,
      thumbnail: animeData.coverImage.large,
      aired: i + 1 === (animeData.nextAiringEpisode?.episode || 0) 
        ? `In ${formatAiringTime(animeData.nextAiringEpisode?.timeUntilAiring || 0)}` 
        : i + 1 > (animeData.nextAiringEpisode?.episode || 0) 
        ? "Not yet aired" 
        : "Available",
      watched: false,
    })),
    characters: animeData.characters.nodes.map((character: any, index: number) => ({
      id: character.id,
      name: character.name.full,
      age: character.age || "Unknown",
      role: animeData.characters.edges[index]?.role || "SUPPORTING",
      image: character.image.large,
    })),
    relations: animeData.relations.edges.map((relation: any) => ({
      id: relation.node.id,
      title: relation.node.title.romaji,
      type: relation.relationType,
      year: relation.node.startDate?.year || "Unknown",
      image: relation.node.coverImage.large,
    })),
    recommendations: animeData.recommendations.nodes.map((rec: any) => ({
      id: rec.mediaRecommendation.id,
      title: rec.mediaRecommendation.title.romaji,
      year: rec.mediaRecommendation.startDate?.year || "Unknown",
      image: rec.mediaRecommendation.coverImage.large,
    })),
  } : null;

  // Calculate gradient opacity based on scroll
  const topGradientOpacity = Math.min(0.7, scrollPosition / 500)
  const sideGradientOpacity = Math.min(0.6, 0.3 + (scrollPosition / 800))

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="w-12 h-12 rounded-full border-4 border-t-yellow-500 border-r-yellow-500 border-b-yellow-300 border-l-yellow-300 animate-spin"></div>
      </div>
    );
  }

  if (!processedData) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Anime not found</h1>
          <button onClick={() => router.back()} className="px-4 py-2 bg-yellow-500 rounded-md">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#070707] text-white antialiased">
      <motion.div 
        ref={scrollRef}
        className="flex-1 min-h-screen text-white relative overflow-y-auto overflow-x-hidden"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
      {/* Background image with gradient overlay */}
        <AnimatePresence>
          {!isLoading && (
            <motion.div 
              className="fixed inset-0 z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              {/* Background image - higher quality with better cropping */}
              <div
                className="absolute inset-0 bg-cover bg-top"
                style={{ 
                  backgroundImage: `url(${processedData.bannerImage || processedData.coverImage})`,
                  filter: 'brightness(0.9) contrast(1.1)'
                }}
              />
              
              {/* Dynamic gradient overlays */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top gradient - lighter initially, gets darker on scroll */}
                <div 
                  className="absolute inset-0 bg-gradient-to-b from-[#070707]/30 via-[#070707]/60 to-[#070707]"
                  style={{ opacity: topGradientOpacity }}
                />
                
                {/* Always present bottom and side gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/90 to-transparent" />
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-[#070707]/80 via-[#070707]/40 to-transparent"
                  style={{ opacity: sideGradientOpacity }}
                />
                <div 
                  className="absolute inset-0 bg-gradient-to-l from-[#070707]/80 via-[#070707]/40 to-transparent"
                  style={{ opacity: sideGradientOpacity }}
                />
                
                {/* Left side vertical gradient - new */}
                <div className="absolute left-0 top-0 h-full w-48 bg-gradient-to-r from-[#070707] via-[#070707]/50 to-transparent z-10" />
                
                {/* Subtle texture overlay for more depth */}
                <div className="absolute inset-0 opacity-30" 
                  style={{ 
                    backgroundImage: 'url("/noise-texture.png")',
                    backgroundRepeat: 'repeat',
                    mixBlendMode: 'overlay'
                  }} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-6 pb-20 ml-[78px]">
          {isStreamingOpen ? (
            <motion.div
              key="streaming-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <motion.button 
                  onClick={handleBackClick} 
                  className="flex items-center gap-2 text-gray-400 hover:text-white"
                  whileHover={{ x: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Close online streaming</span>
                </motion.button>
                <div className="text-gray-400">Episode {processedData.episodeList[selectedEpisode].number} of {processedData.episodes}</div>
              </div>
              
              <VideoPlayer
                episode={processedData.episodeList[selectedEpisode]}
                onClose={() => setIsStreamingOpen(false)}
                episodeList={processedData.episodeList}
                onEpisodeSelect={setSelectedEpisode}
              />
            </motion.div>
          ) : (
            <>
              {/* Back button */}
              <motion.button 
                onClick={handleBackClick} 
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ x: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </motion.button>

              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DetailViewSkeleton />
                  </motion.div>
                ) : (
                  <motion.div
                    key="details"
                    variants={sectionVariants}
                    initial="initial"
                    animate="animate"
                    exit={{ opacity: 0 }}
                  >
                    {/* Title section */}
                    <motion.div className="mb-8 pl-[80px]" variants={itemVariants}>
                      <motion.h1 
                        className="text-4xl font-bold mb-2 tracking-tight"
                        variants={itemVariants}
                      >
                        {processedData.title}
                      </motion.h1>
                      
                      {processedData.subtitle && (
                        <motion.h2 
                          className="text-xl text-gray-400 mb-2"
                          variants={itemVariants}
                        >
                          {processedData.subtitle}
                        </motion.h2>
                      )}
                    </motion.div>

                    {/* Main content grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                      {/* Left column - Cover and metadata */}
                      <motion.div className="lg:col-span-1" variants={itemVariants}>
                        {/* Cover image with actions */}
                        <div className="relative mb-4">
                          <motion.div 
                            className="rounded-lg overflow-hidden shadow-lg"
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.3 }}
                          >
                            <ImageSkeleton
                              src={processedData.coverImage || "/placeholder.svg"}
                              alt={processedData.title}
                              className="w-full aspect-[2/3] object-cover"
                            />
                          </motion.div>
                          
                          {/* Actions overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                            <div className="flex justify-between">
                              <motion.button
                                className={`p-2 rounded-full ${inWatchlist ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                onClick={toggleWatchlist}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                {inWatchlist ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                              </motion.button>
                              <motion.button
                                className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </motion.button>
                            </div>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-1">
                              <Heart className="h-4 w-4 text-green-500" />
                              <span className="font-medium">{processedData.rating.toFixed(1)}</span>
                            </div>
                            <div className="h-4 w-px bg-gray-700"></div>
                            <div className="text-sm text-gray-400">
                              #{processedData.popularity} Most Popular
                            </div>
                          </div>

                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Format</span>
                              <span>TV</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Episodes</span>
                              <span>{processedData.episodes}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Status</span>
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                                {processedData.status}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Season</span>
                              <span>{processedData.releaseDate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Studio</span>
                              <span>{processedData.studio}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Genres</span>
                              <div className="text-right">{processedData.genres.slice(0, 3).join(", ")}</div>
                            </div>
                          </div>

                          {processedData.nextEpisode.number > 0 && (
                            <div className="mt-4 border-t border-white/10 pt-4">
                              <div className="text-sm text-gray-400 mb-2">Next episode</div>
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">Episode {processedData.nextEpisode.number}</div>
                                  <div className="text-sm text-gray-400">{processedData.nextEpisode.airsOn}</div>
                                </div>
                                <div className="text-yellow-500 text-sm font-medium">
                                  in {processedData.nextEpisode.airsIn}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>

                      {/* Right column - Main content */}
                      <motion.div className="lg:col-span-3 space-y-8" variants={itemVariants}>
                        {/* Synopsis */}
                        <motion.div variants={itemVariants}>
                          <h2 className="text-xl font-bold mb-3 flex items-center">
                            <Info className="h-5 w-5 mr-2 text-yellow-500" />
                            Synopsis
                          </h2>
                          <p className="text-gray-300 leading-relaxed">
                            {processedData.synopsis}
                          </p>
                        </motion.div>

                        {/* Episodes */}
                        <motion.div variants={itemVariants}>
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center">
                              <Video className="h-5 w-5 mr-2 text-yellow-500" />
                              Episodes
                            </h2>
                            <motion.button
                              className="px-4 py-1.5 bg-yellow-500 text-black rounded-md flex items-center gap-2 font-medium"
                              onClick={() => handleStreamingClick(0)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Play className="h-4 w-4" />
                              Watch now
                            </motion.button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {processedData.episodeList.map((episode: any, index: number) => (
                              <motion.div
                                key={episode.number}
                                className="relative group rounded-lg overflow-hidden border border-white/5 bg-black/20 backdrop-blur-sm"
                                whileHover={{ y: -5 }}
                                onClick={() => episode.aired === "Available" ? handleStreamingClick(index) : {}}
                              >
                                <div className="relative aspect-video">
                                  <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="h-12 w-12 rounded-full bg-yellow-500 flex items-center justify-center">
                                      <Play className="h-6 w-6 text-black" />
                                    </div>
                                  </div>
                                  
                                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent group-hover:opacity-80 transition-opacity z-0"></div>
                                  
                                  <ImageSkeleton
                                    src={episode.thumbnail}
                                    alt={`Episode ${episode.number}`}
                                    className="w-full h-full object-cover brightness-75 group-hover:brightness-100 transition-all"
                                  />
                                  
                                  {episode.aired !== "Available" && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                      <div className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                                        {episode.aired}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="p-3">
                                  <div className="flex justify-between items-center mb-1">
                                    <div className="font-bold">Episode {episode.number}</div>
                                    <div className="flex items-center gap-1">
                                      {episode.watched && <Check className="h-4 w-4 text-green-500" />}
                                      {episode.aired === "Available" && (
                                        <motion.button
                                          className="p-1 rounded-full bg-white/10 hover:bg-white/20"
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Download logic would go here
                                          }}
                                        >
                                          <Download className="h-3 w-3" />
                                        </motion.button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-400 truncate">{episode.title}</div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                          
                          {processedData.episodeList.length < processedData.episodes && (
                            <div className="flex justify-center mt-4">
                              <motion.button
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-md flex items-center gap-2"
                                whileHover={{ x: 5 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                View all episodes
                                <ChevronRight className="h-4 w-4" />
                              </motion.button>
                            </div>
                          )}
                        </motion.div>

                        {/* Characters */}
                        {processedData.characters.length > 0 && (
                          <motion.div variants={itemVariants}>
                            <h2 className="text-xl font-bold mb-4 flex items-center">
                              <Users className="h-5 w-5 mr-2 text-yellow-500" />
                              Characters
                            </h2>
                            <CharacterList characters={processedData.characters} />
                          </motion.div>
                        )}

                        {/* Related anime */}
                        {processedData.relations.length > 0 && (
                          <motion.div variants={itemVariants}>
                            <h2 className="text-xl font-bold mb-4 flex items-center">
                              <BookOpen className="h-5 w-5 mr-2 text-yellow-500" />
                              Related anime
                            </h2>
                            <RelatedContent items={processedData.relations} />
                          </motion.div>
                        )}

                        {/* Recommendations */}
                        {processedData.recommendations.length > 0 && (
                          <motion.div variants={itemVariants}>
                            <h2 className="text-xl font-bold mb-4 flex items-center">
                              <Star className="h-5 w-5 mr-2 text-yellow-500" />
                              You might also like
                            </h2>
                            <RecommendedContent items={processedData.recommendations} />
                          </motion.div>
                        )}
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function Check(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
