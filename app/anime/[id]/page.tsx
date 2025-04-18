"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Calendar, Clock, Heart, Info, MoreHorizontal, Play, Plus, Star, Video, Users, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageSkeleton } from "@/components/image-skeleton"
import { VideoPlayer } from "@/components/video-player"
import { CharacterCard } from "@/components/character-card"
import { RelatedContent } from "@/components/related-content"
import { RecommendedContent } from "@/components/recommended-content"
import { getAnimeById, formatDate, formatStatus, formatAiringTime, getSeasonName, stripHtml, getAiringDay } from "@/lib/anilist"
import { DetailViewSkeleton } from "@/components/ui/skeleton"
import { CharacterList } from "@/components/character-list"

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
  const animeId = params.id
  const [isStreamingOpen, setIsStreamingOpen] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState(0)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [showUnwatched, setShowUnwatched] = useState(true)
  const [showDownloaded, setShowDownloaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [animeData, setAnimeData] = useState<any>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

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
    rankings: [
      { title: `#${animeData.popularity} Most Popular Anime`, icon: "trending-up" },
    ],
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
    })).slice(0, 3),
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="w-12 h-12 rounded-full border-4 border-t-purple-500 border-r-purple-500 border-b-purple-300 border-l-purple-300 animate-spin"></div>
      </div>
    );
  }

  if (!processedData) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Anime not found</h1>
          <button onClick={() => router.back()} className="px-4 py-2 bg-purple-600 rounded-md">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-black text-white"
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
            <div className="absolute inset-0">
              {/* Multiple gradient overlays from all sides */}
              <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-transparent" /> {/* Top */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" /> {/* Bottom - stronger */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" /> {/* Left */}
              <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/50 to-transparent" /> {/* Right */}
            </div>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${processedData.bannerImage || processedData.coverImage})` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Back button */}
        <motion.button 
          onClick={handleBackClick} 
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ x: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="h-5 w-5" />
          <span>{isStreamingOpen ? "Close online streaming" : "Back"}</span>
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
          ) : isStreamingOpen ? (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">
                    Episode {processedData.episodeList[selectedEpisode].number} in {processedData.nextEpisode.airsIn}
                  </h2>
                  <span className="text-gray-400">{processedData.nextEpisode.airsOn}</span>
                </div>
              </div>

              <VideoPlayer
                episode={processedData.episodeList[selectedEpisode]}
                onClose={() => setIsStreamingOpen(false)}
                episodeList={processedData.episodeList}
                onEpisodeSelect={setSelectedEpisode}
              />
            </motion.div>
          ) : (
            <motion.div
              key="details"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0 }}
            >
              {/* Anime header */}
              <motion.div 
                className="flex flex-col md:flex-row gap-6 mb-8"
                variants={itemVariants}
              >
                {/* Cover image */}
                <motion.div 
                  className="w-full md:w-64 flex-shrink-0"
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.3 }}
                >
                  <ImageSkeleton
                    src={processedData.coverImage || "/placeholder.svg"}
                    alt={processedData.title}
                    className="w-full aspect-[2/3] rounded-lg overflow-hidden"
                  />
                </motion.div>

                {/* Details */}
                <div className="flex-1">
                  <motion.h1 
                    className="text-3xl font-bold mb-1"
                    variants={itemVariants}
                  >
                    {processedData.title}
                  </motion.h1>
                  
                  {processedData.subtitle && (
                    <motion.h2 
                      className="text-xl text-gray-400 mb-4"
                      variants={itemVariants}
                    >
                      {processedData.subtitle}
                    </motion.h2>
                  )}

                  <motion.div 
                    className="flex items-center gap-4 mb-4"
                    variants={itemVariants}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{processedData.releaseDate}</span>
                    </div>
                    <div className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm">
                      {processedData.status}
                    </div>
                  </motion.div>

                  <motion.div 
                    className="grid grid-cols-2 gap-4 mb-4"
                    variants={itemVariants}
                  >
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <span>{processedData.rating ? `${processedData.rating.toFixed(1)}/10` : "No rating"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{processedData.episodes} episodes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      <span>{processedData.studio}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{processedData.genres.join(", ")}</span>
                    </div>
                  </motion.div>

                  <motion.p 
                    className="text-gray-300 mb-6"
                    variants={itemVariants}
                  >
                    {processedData.synopsis}
                  </motion.p>

                  <motion.div variants={itemVariants}>
                    <motion.button
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md flex items-center gap-2"
                      onClick={() => setIsStreamingOpen(true)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Play className="h-4 w-4" />
                      Watch now
                    </motion.button>
                  </motion.div>
                </div>
              </motion.div>

              {/* Characters */}
              <motion.section 
                className="mb-8"
                variants={sectionVariants}
              >
                <motion.h2 
                  className="text-2xl font-bold mb-4"
                  variants={itemVariants}
                >
                  Characters
                </motion.h2>
                <CharacterList characters={processedData.characters} />
              </motion.section>

              {/* Related anime */}
              {processedData.relations.length > 0 && (
                <motion.section 
                  className="mb-8"
                  variants={sectionVariants}
                >
                  <motion.h2 
                    className="text-2xl font-bold mb-4"
                    variants={itemVariants}
                  >
                    Related anime
                  </motion.h2>
                  <RelatedContent items={processedData.relations} />
                </motion.section>
              )}

              {/* Recommendations */}
              {processedData.recommendations.length > 0 && (
                <motion.section
                  variants={sectionVariants}
                >
                  <motion.h2 
                    className="text-2xl font-bold mb-4"
                    variants={itemVariants}
                  >
                    You might also like
                  </motion.h2>
                  <RecommendedContent items={processedData.recommendations} />
                </motion.section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
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
