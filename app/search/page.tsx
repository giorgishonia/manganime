"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion as m, AnimatePresence } from 'framer-motion'
import { Search, X, BookOpen, TrendingUp, Timer, Filter, Grid3X3, Loader2, Bookmark, Star, Play, Clock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ImageSkeleton } from '@/components/image-skeleton'
import { AppSidebar } from '@/components/app-sidebar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import debounce from 'lodash.debounce'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.06,
      ease: [0.22, 1, 0.36, 1]
    } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  }
};

type SearchResult = {
  id: string;
  type: 'manga' | 'anime';
  title: string;
  image: string;
  banner_image?: string;
  status?: string;
  year?: number;
  score?: number;
};

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams?.get('q') || ''
  
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeType, setActiveType] = useState<'all' | 'manga' | 'anime'>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'rating'>('relevance')
  const [showFilters, setShowFilters] = useState(false)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])
  
  // Perform search when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    
    const performSearch = async () => {
      setIsLoading(true)
      
      try {
        // In a real app, this would be an API call.
        // For now, we'll simulate a search with fake data
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 600))
        
        // Generate fake search results based on query
        const fakeResults: SearchResult[] = [
          // Manga results
          {
            id: 'manga-1',
            type: 'manga',
            title: `One Piece - ${searchQuery}`,
            image: 'https://m.media-amazon.com/images/I/51oBw4FDkIL._SY445_SX342_.jpg',
            status: 'Ongoing',
            year: 1999,
            score: 9.6
          },
          {
            id: 'manga-2',
            type: 'manga',
            title: `Demon Slayer - ${searchQuery}`,
            image: 'https://m.media-amazon.com/images/I/51j8bRH5sDL._SY445_SX342_.jpg',
            status: 'Completed',
            year: 2016,
            score: 8.9
          },
          {
            id: 'manga-3',
            type: 'manga',
            title: `Attack on Titan - ${searchQuery}`,
            image: 'https://m.media-amazon.com/images/I/91M9VaZWxOL._SY466_.jpg',
            status: 'Completed',
            year: 2009,
            score: 9.4
          },
          {
            id: 'manga-4',
            type: 'manga',
            title: `Jujutsu Kaisen - ${searchQuery}`,
            image: 'https://m.media-amazon.com/images/I/51QQS+xc6RL._SY445_SX342_.jpg',
            status: 'Ongoing',
            year: 2018,
            score: 8.8
          },
          // Anime results
          {
            id: 'anime-1',
            type: 'anime',
            title: `Fullmetal Alchemist: Brotherhood - ${searchQuery}`,
            image: 'https://flxt.tmsimg.com/assets/p7886595_b_v13_ab.jpg',
            status: 'Completed',
            year: 2009,
            score: 9.7
          },
          {
            id: 'anime-2',
            type: 'anime',
            title: `Death Note - ${searchQuery}`,
            image: 'https://m.media-amazon.com/images/M/MV5BNjRiNmNjMmMtN2U2Yi00ODgxLTk3OTMtMmI1MTI1NjYyZTEzXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_FMjpg_UX1000_.jpg',
            status: 'Completed',
            year: 2006,
            score: 9.0
          },
          {
            id: 'anime-3',
            type: 'anime',
            title: `Steins;Gate - ${searchQuery}`,
            image: 'https://m.media-amazon.com/images/M/MV5BMjUxMzE4ZDctODNjMS00MzIwLThjNDktODkwYjc5YWU0MDc0XkEyXkFqcGdeQXVyNjc3OTE4Nzk@._V1_FMjpg_UX1000_.jpg',
            status: 'Completed',
            year: 2011,
            score: 9.2
          },
          {
            id: 'anime-4',
            type: 'anime',
            title: `My Hero Academia - ${searchQuery}`,
            image: 'https://flxt.tmsimg.com/assets/p12220111_b_v13_be.jpg',
            status: 'Ongoing',
            year: 2016,
            score: 8.7
          }
        ]
        
        // Filter by type if needed
        let filteredResults = fakeResults
        if (activeType !== 'all') {
          filteredResults = fakeResults.filter(item => item.type === activeType)
        }
        
        // Sort results
        switch (sortBy) {
          case 'newest':
            filteredResults.sort((a, b) => (b.year || 0) - (a.year || 0))
            break
          case 'rating':
            filteredResults.sort((a, b) => (b.score || 0) - (a.score || 0))
            break
          case 'relevance':
          default:
            // Already sorted by relevance (in a real app)
            break
        }
        
        setSearchResults(filteredResults)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Debounce search to avoid too many requests
    const debouncedSearch = debounce(performSearch, 500)
    debouncedSearch()
    
    return () => {
      debouncedSearch.cancel()
    }
  }, [searchQuery, activeType, sortBy])
  
  // Update URL when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`, { scroll: false })
    } else {
      router.push('/search', { scroll: false })
    }
  }, [searchQuery, router])
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }
  
  const clearSearch = () => {
    setSearchQuery('')
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }
  
  const handleResultClick = (result: SearchResult) => {
    router.push(`/${result.type}/${result.id}`)
  }
  
  const filterCount = 
    (activeType !== 'all' ? 1 : 0) + 
    (sortBy !== 'relevance' ? 1 : 0)
  
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#070707] to-[#0a0118] text-white">
      <AppSidebar />
      
      <main className="flex-1 overflow-x-hidden pl-0 md:pl-[77px] pb-20">
        {/* Hero / Search Header */}
        <m.div 
          className="relative w-full bg-gradient-to-b from-black/40 to-transparent"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
            <div className="mb-8">
              <m.h1 
                className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80 mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                ძიება
              </m.h1>
              <m.p 
                className="text-white/60 text-sm md:text-base"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                მოძებნე შენთვის სასურველი ანიმე და მანგა
              </m.p>
            </div>
            
            <m.div 
              className="relative"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="relative flex gap-2 items-center mb-4">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                    <Search className="h-5 w-5" />
                  </div>
                  <Input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="აკრიფე კონტენტის სახელი..."
                    className="bg-black/40 border-white/10 pl-10 pr-10 py-6 text-base md:text-lg rounded-xl focus-visible:ring-purple-500 focus-visible:ring-offset-purple-500/20 focus-visible:ring-offset-2 placeholder:text-white/30"
                  />
                  <AnimatePresence>
                    {searchQuery && (
                      <m.button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                        onClick={clearSearch}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="h-5 w-5" />
                      </m.button>
                    )}
                  </AnimatePresence>
                </div>
                
                <m.button
                  className={cn(
                    "p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center relative",
                    showFilters && "bg-purple-900/20 border-purple-500/50"
                  )}
                  onClick={() => setShowFilters(!showFilters)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Filter className="h-5 w-5" />
                  {filterCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {filterCount}
                    </span>
                  )}
                </m.button>
              </div>
              
              <AnimatePresence>
                {showFilters && (
                  <m.div 
                    className="mb-6 p-4 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl"
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm text-white/70 mb-2 font-medium">ტიპი</div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveType('all')}
                            className={cn(
                              "rounded-lg border",
                              activeType === 'all'
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent"
                                : "bg-black/30 text-white/70 border-white/10 hover:bg-black/50 hover:text-white"
                            )}
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            ყველა
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveType('manga')}
                            className={cn(
                              "rounded-lg border",
                              activeType === 'manga'
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent"
                                : "bg-black/30 text-white/70 border-white/10 hover:bg-black/50 hover:text-white"
                            )}
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            მანგა
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveType('anime')}
                            className={cn(
                              "rounded-lg border",
                              activeType === 'anime'
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent"
                                : "bg-black/30 text-white/70 border-white/10 hover:bg-black/50 hover:text-white"
                            )}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            ანიმე
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-white/70 mb-2 font-medium">სორტირება</div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSortBy('relevance')}
                            className={cn(
                              "rounded-lg border",
                              sortBy === 'relevance'
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent"
                                : "bg-black/30 text-white/70 border-white/10 hover:bg-black/50 hover:text-white"
                            )}
                          >
                            <Grid3X3 className="h-4 w-4 mr-2" />
                            რელევანტურობა
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSortBy('newest')}
                            className={cn(
                              "rounded-lg border",
                              sortBy === 'newest'
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent"
                                : "bg-black/30 text-white/70 border-white/10 hover:bg-black/50 hover:text-white"
                            )}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            უახლესი
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSortBy('rating')}
                            className={cn(
                              "rounded-lg border",
                              sortBy === 'rating'
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent"
                                : "bg-black/30 text-white/70 border-white/10 hover:bg-black/50 hover:text-white"
                            )}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            რეიტინგი
                          </Button>
                        </div>
                      </div>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          </div>
        </m.div>
        
        {/* Results Area */}
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Loading Indicator */}
          <AnimatePresence>
            {isLoading && (
              <m.div 
                className="flex justify-center items-center py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <m.div 
                  className="flex items-center gap-3 px-6 py-3 bg-black/40 backdrop-blur-sm rounded-full border border-white/10"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                  <span className="text-sm text-white/70">იძებნება...</span>
                </m.div>
              </m.div>
            )}
          </AnimatePresence>
          
          {/* Empty State */}
          <AnimatePresence>
            {!isLoading && searchQuery && searchResults.length === 0 && (
              <m.div 
                className="text-center py-16 px-4"
                variants={fadeVariants}
                initial="hidden"
                animate="visible"
              >
                <m.div 
                  className="mb-6"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <img src="/images/mascot/no-search.png" alt="No search results mascot" className="mx-auto w-40 h-40" />
                </m.div>
                <h3 className="text-xl md:text-2xl font-medium text-white mb-2">
                  ვერაფერი მოიძებნა
                </h3>
                <p className="text-white/60 max-w-md mx-auto mb-8">
                  სამწუხაროდ, თქვენი ძიებით არაფერი მოიძებნა. სცადეთ სხვა საძიებო სიტყვების გამოყენება ან შეამოწმეთ მართლწერა.
                </p>
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  onClick={clearSearch}
                >
                  თავიდან ცდა
                </Button>
              </m.div>
            )}
          </AnimatePresence>
          
          {/* Empty state when no search yet */}
          <AnimatePresence>
            {!isLoading && !searchQuery && (
              <m.div 
                className="text-center py-16 px-4"
                variants={fadeVariants}
                initial="hidden"
                animate="visible"
              >
                <m.div 
                  className="w-20 h-20 mx-auto relative mb-6"
                  animate={{ 
                    rotate: [0, 10, 0, -10, 0],
                    y: [0, -5, 0] 
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                >
                  <Search className="w-full h-full text-purple-400/80" />
                  <m.div 
                    className="absolute inset-0 bg-purple-500/10 rounded-full blur-xl"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.6, 0.3] 
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </m.div>
                <h2 className="text-2xl md:text-3xl font-semibold mb-4">რას ეძებ დღეს?</h2>
                <p className="text-white/60 max-w-md mx-auto">
                  ჩაწერე ანიმეს ან მანგის სახელი ზემოთ მოცემულ საძიებო ველში და იპოვე შენთვის სასურველი კონტენტი.
                </p>
                
                <m.div 
                  className="mt-10 flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="text-sm font-medium text-white/70 mb-3">პოპულარული ძიებები</div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['Naruto', 'One Piece', 'Attack on Titan', 'Demon Slayer', 'My Hero Academia', 'Jujutsu Kaisen'].map((term) => (
                      <m.div 
                        key={term}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Badge 
                          variant="outline" 
                          className="bg-black/40 border-white/10 hover:border-purple-500/50 backdrop-blur-sm cursor-pointer py-1.5 px-3"
                          onClick={() => setSearchQuery(term)}
                        >
                          {term}
                        </Badge>
                      </m.div>
                    ))}
                  </div>
                </m.div>
              </m.div>
            )}
          </AnimatePresence>
          
          {/* Search Results */}
          <AnimatePresence>
            {!isLoading && searchQuery && searchResults.length > 0 && (
              <m.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="pb-12"
              >
                <div className="flex justify-between items-center mb-6">
                  <m.h2 
                    className="text-lg md:text-xl font-medium"
                    variants={itemVariants}
                  >
                    ნაპოვნია <span className="text-purple-400">{searchResults.length}</span> შედეგი
                  </m.h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                  {searchResults.map((result, index) => (
                    <m.div 
                      key={`${result.type}-${result.id}`}
                      variants={itemVariants}
                      className="group cursor-pointer bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all duration-300"
                      onClick={() => handleResultClick(result)}
                      whileHover={{ scale: 1.03, y: -5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <div className="relative aspect-[2/3]">
                        <ImageSkeleton
                          src={result.image}
                          alt={result.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        
                        {/* Overlay gradients */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/70 to-transparent" />
                        
                        {/* Type badge with animation */}
                        <m.div 
                          className={`absolute top-2 left-2 backdrop-blur-sm px-2 py-0.5 rounded-md text-xs font-medium border shadow-lg
                            ${result.type === 'manga' 
                              ? 'bg-purple-900/40 text-purple-200 border-purple-500/30 shadow-purple-900/20' 
                              : 'bg-indigo-900/40 text-indigo-200 border-indigo-500/30 shadow-indigo-900/20'}`}
                          whileHover={{ scale: 1.05 }}
                        >
                          {result.type === 'manga' ? 'მანგა' : 'ანიმე'}
                        </m.div>
                        
                        {/* Rating badge */}
                        {result.score && (
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-xs font-medium text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400" />
                            {result.score}
                          </div>
                        )}
                        
                        {/* Year badge */}
                        {result.year && (
                          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-xs font-medium text-white/80 border border-white/10">
                            {result.year}
                          </div>
                        )}
                        
                        {/* Status badge */}
                        {result.status && (
                          <div className={`absolute bottom-2 left-2 backdrop-blur-sm px-2 py-0.5 rounded-md text-xs font-medium border
                            ${result.status === 'Ongoing' 
                              ? 'bg-green-900/40 text-green-200 border-green-500/30' 
                              : 'bg-blue-900/40 text-blue-200 border-blue-500/30'}`}
                          >
                            {result.status === 'Ongoing' ? 'მიმდინარე' : 'დასრულებული'}
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 md:p-4">
                        <m.h3 
                          className="text-sm md:text-base font-semibold text-white truncate line-clamp-2 h-10" 
                          title={result.title}
                          whileHover={{ x: 3 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          {result.title}
                        </m.h3>
                      </div>
                    </m.div>
                  ))}
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
} 