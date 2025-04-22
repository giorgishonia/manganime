"use client"

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Star, 
  CalendarDays, 
  Clock, 
  Heart, 
  BookOpen, 
  ChevronRight, 
  MenuIcon,
  Bookmark,
  Download,
  Share,
  Users,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MangaReader } from '@/components/manga-reader'
import { ImageSkeleton } from '@/components/image-skeleton'
import { RelatedContent } from '@/components/related-content'
import { RecommendedContent } from '@/components/recommended-content'
import { DetailViewSkeleton } from '@/components/ui/skeleton'
import { getMangaById, stripHtml, formatStatus } from '@/lib/anilist'

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  // Fix for Next.js params access - use React.use() to properly unwrap
  const unwrappedParams = React.use(params as any) as { id: string }
  const mangaId = unwrappedParams.id
  const [isReaderOpen, setIsReaderOpen] = useState(false)
  const [selectedChapter, setSelectedChapter] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mangaData, setMangaData] = useState<any>(null)

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

  // Fetch manga data from AniList API
  useEffect(() => {
    async function fetchMangaData() {
      try {
        const data = await getMangaById(mangaId);
        setMangaData(data);
      } catch (error) {
        console.error("Error fetching manga data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMangaData();
  }, [mangaId]);

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

  // Generate mock chapters since AniList doesn't provide chapter info
  const generateMockChapters = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      title: `Chapter ${i + 1}`,
      releaseDate: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)).toLocaleDateString(), // 1 week apart
      thumbnail: mangaData.coverImage.large, // Add thumbnail property
      pages: Array.from({ length: Math.floor(Math.random() * 10) + 15 }, (_, j) => 
        `/manga-page-placeholder.jpg` // Change to string array
      )
    }));
  };

  // Process data for UI if available
  const processedData = mangaData ? {
    id: mangaData.id,
    title: mangaData.title.english || mangaData.title.romaji,
    subtitle: mangaData.title.native,
    coverImage: mangaData.coverImage.large,
    bannerImage: mangaData.bannerImage,
    releaseDate: mangaData.startDate ? `${mangaData.startDate.year || "?"}-${mangaData.startDate.month || "?"}` : "Unknown",
    status: formatStatus(mangaData.status),
    chapters: mangaData.chapters || "Ongoing",
    volumes: mangaData.volumes || "?",
    rating: mangaData.averageScore / 10,
    popularity: mangaData.popularity,
    genres: mangaData.genres,
    author: "Unknown Author", // AniList doesn't provide author info directly
    synopsis: stripHtml(mangaData.description || "No description available"),
    chapterList: generateMockChapters(10),
    relations: mangaData.relations?.edges?.map((relation: any) => ({
      id: relation.node.id,
      title: relation.node.title.romaji,
      type: relation.relationType,
      year: relation.node.startDate?.year || "Unknown",
      image: relation.node.coverImage.large,
    })) || [],
    recommendations: mangaData.recommendations?.nodes?.map((rec: any) => ({
      id: rec.mediaRecommendation.id,
      title: rec.mediaRecommendation.title.romaji,
      year: rec.mediaRecommendation.startDate?.year || "Unknown",
      image: rec.mediaRecommendation.coverImage.large,
    })) || [],
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
          <h1 className="text-2xl font-bold mb-4">Manga not found</h1>
          <button onClick={() => router.back()} className="px-4 py-2 bg-purple-600 rounded-md">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Calculate gradient opacity based on scroll
  const topGradientOpacity = Math.min(0.7, scrollPosition / 500)
  const sideGradientOpacity = Math.min(0.6, 0.3 + (scrollPosition / 800))

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
        <div className="relative z-10 container mx-auto px-4 py-6 pb-20 pl-[100px]">
          {/* Back button */}
          <motion.button 
            onClick={handleBackClick} 
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 mt-2"
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">
                      {processedData.title}: {processedData.chapterList[selectedChapter].title}
                    </h2>
                    <span className="text-gray-400">{processedData.chapterList[selectedChapter].releaseDate}</span>
                  </div>
                </div>

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
                        <CalendarDays className="h-4 w-4 text-gray-400" />
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
                        <BookOpen className="h-4 w-4 text-gray-400" />
                        <span>{processedData.chapters} chapters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MenuIcon className="h-4 w-4 text-gray-400" />
                        <span>{processedData.volumes} volumes</span>
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

                    <motion.div 
                      className="flex gap-3"
                      variants={itemVariants}
                    >
                      <motion.button
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md flex items-center gap-2"
                        onClick={() => handleReadClick(0)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <BookOpen className="h-4 w-4" />
                        Read now
                      </motion.button>
                      
                      <motion.button
                        className="p-2 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md"
                        onClick={() => setIsBookmarked(!isBookmarked)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-purple-500 text-purple-500")} />
                      </motion.button>
                      
                      <motion.button
                        className="p-2 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Download className="h-4 w-4" />
                      </motion.button>
                      
                      <motion.button
                        className="p-2 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Share className="h-4 w-4" />
                      </motion.button>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Chapters */}
                <motion.section 
                  className="mb-8"
                  variants={sectionVariants}
                >
                  <motion.h2 
                    className="text-2xl font-bold mb-4"
                    variants={itemVariants}
                  >
                    Chapters
                  </motion.h2>
                  <div className="grid gap-2">
                    {processedData.chapterList.map((chapter: any, index: number) => (
                      <motion.div 
                        key={`chapter-${index}`}
                        className="bg-black/30 backdrop-blur-sm border border-white/5 rounded-lg p-4 hover:bg-black/50 transition-colors cursor-pointer"
                        onClick={() => handleReadClick(index)}
                        variants={itemVariants}
                        whileHover={{ x: 5 }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold">{chapter.title}</h3>
                            <p className="text-sm text-gray-400">{chapter.releaseDate}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
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
                      Related content
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
    </div>
  )
}
