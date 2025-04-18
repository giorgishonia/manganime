"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Book,
  Calendar,
  Download,
  Heart,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Star,
  X,
  Clock,
  BookOpen,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageSkeleton } from "@/components/image-skeleton"
import { CharacterCard } from "@/components/character-card"
import { RelatedContent } from "@/components/related-content"
import { RecommendedContent } from "@/components/recommended-content"
import { MangaReader } from "@/components/manga-reader"
import { getMangaById, formatDate, formatStatus, stripHtml } from "@/lib/anilist"
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

export default function MangaPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isReaderOpen, setIsReaderOpen] = useState(false)
  const [selectedChapter, setSelectedChapter] = useState(0)
  const [inLibrary, setInLibrary] = useState(false)
  const [showUnread, setShowUnread] = useState(true)
  const [showDownloaded, setShowDownloaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [mangaData, setMangaData] = useState<any>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch manga data from AniList API
  useEffect(() => {
    async function fetchMangaData() {
      try {
        const data = await getMangaById(params.id);
        setMangaData(data);
      } catch (error) {
        console.error("Error fetching manga data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMangaData();
  }, [params.id]);

  const handleBackClick = () => {
    if (isReaderOpen) {
      setIsReaderOpen(false)
    } else {
      router.back()
    }
  }

  const handleReadClick = (chapterIndex = 0) => {
    setSelectedChapter(chapterIndex)
    setIsReaderOpen(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Process data for UI if available
  const processedData = mangaData ? {
    id: mangaData.id,
    title: mangaData.title.english || mangaData.title.romaji,
    subtitle: mangaData.title.english && mangaData.title.english !== mangaData.title.romaji ? mangaData.title.romaji : null,
    coverImage: mangaData.coverImage.large,
    bannerImage: mangaData.bannerImage,
    releaseDate: formatDate(mangaData.startDate),
    status: formatStatus(mangaData.status),
    chapters: mangaData.chapters || "?",
    volumes: mangaData.volumes || "?",
    rating: mangaData.averageScore ? mangaData.averageScore / 10 : null,
    genres: mangaData.genres,
    synopsis: stripHtml(mangaData.description),
    authors: mangaData.staff?.nodes.filter((person: any) => 
      person.role.includes("Story") || person.role.includes("Art")
    ).map((person: any) => person.name.full).join(", ") || "Unknown",
    popularity: mangaData.popularity || 0,
    chapterList: Array.from({ length: Math.min(mangaData.chapters || 10, 20) }, (_, i) => ({
      number: i + 1,
      title: `Chapter ${i + 1}`,
      thumbnail: mangaData.coverImage.large,
      pages: Array(20).fill(0).map(() => "/placeholder.svg")
    })),
    characters: mangaData.characters.nodes.map((character: any, index: number) => ({
      id: character.id,
      name: character.name.full,
      age: character.age || "Unknown",
      role: mangaData.characters.edges[index]?.role || "SUPPORTING",
      image: character.image.large,
    })),
    relations: mangaData.relations?.edges.map((relation: any) => ({
      id: relation.node.id,
      title: relation.node.title.romaji,
      type: relation.relationType,
      year: relation.node.startDate?.year || "Unknown",
      image: relation.node.coverImage.large,
    })) || [],
    recommendations: mangaData.recommendations?.nodes.map((rec: any) => ({
      id: rec.mediaRecommendation.id,
      title: rec.mediaRecommendation.title.romaji,
      year: rec.mediaRecommendation.startDate?.year || "Unknown",
      image: rec.mediaRecommendation.coverImage.large,
    })) || [],
  } : null;

  const filteredChapters = processedData?.chapterList.filter((chapter: any) => {
    if (searchQuery) {
      return (
        chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chapter.number.toString().includes(searchQuery)
      )
    }
    return true
  }) || [];

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
          <h1 className="text-2xl font-bold mb-4">Manga not found</h1>
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
          <span>{isReaderOpen ? "Close reader" : "Back"}</span>
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
          ) : isReaderOpen ? (
            <motion.div
              key="reader"
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="fixed inset-0 z-50 bg-black"
            >
              <MangaReader
                chapter={processedData.chapterList[selectedChapter]}
                onClose={() => setIsReaderOpen(false)}
                chapterList={processedData.chapterList}
                onChapterSelect={setSelectedChapter}
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
              {/* Manga header */}
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
                    <div className="px-2 py-1 bg-pink-600/20 text-pink-400 rounded-full text-sm">
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
                      <span>{processedData.chapters} chapters</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      <span>{processedData.volumes} volumes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{processedData.authors}</span>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="flex flex-wrap gap-2 mb-4" 
                    variants={itemVariants}
                  >
                    {processedData.genres?.map((genre: string) => (
                      <motion.span
                        key={genre}
                        className="px-3 py-1 bg-gray-800 rounded-full text-xs"
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(75, 85, 99, 0.8)" }}
                      >
                        {genre}
                      </motion.span>
                    ))}
                  </motion.div>

                  <motion.p 
                    className="text-gray-300 mb-6"
                    variants={itemVariants}
                  >
                    {processedData.synopsis}
                  </motion.p>

                  <motion.div variants={itemVariants}>
                    <motion.button
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-md flex items-center gap-2"
                      onClick={() => setIsReaderOpen(true)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <BookOpen className="h-4 w-4" />
                      Read now
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
                <div className="grid grid-cols-2 gap-3">
                  {processedData.characters.slice(0, 6).map((character: any) => (
                    <CharacterCard key={character.id} character={character} />
                  ))}
                </div>
                {processedData.characters.length > 6 && (
                  <button className="w-full mt-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm">
                    View all {processedData.characters.length} characters
                  </button>
                )}
              </motion.section>

              {/* Related manga */}
              {processedData.relations.length > 0 && (
                <motion.section 
                  className="mb-8"
                  variants={sectionVariants}
                >
                  <motion.h2 
                    className="text-2xl font-bold mb-4"
                    variants={itemVariants}
                  >
                    Related manga
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
