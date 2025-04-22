"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { motion as m, AnimatePresence } from "framer-motion"
import { Film, BookOpen, Search } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface SearchResult {
  id: string
  title: string
  image: string
  type: "anime" | "manga"
  description?: string
  year?: string
  genres?: string[]
  rating?: number
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  const type = (searchParams.get("type") || "anime") as "anime" | "manga"
  
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Only perform search if query exists
    if (!query) {
      setResults([])
      setIsLoading(false)
      return
    }
    
    async function fetchResults() {
      setIsLoading(true)
      try {
        // This would be an actual API call
        // For demo, we'll use mock data with a delay
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Mock search results
        const mockResults: SearchResult[] = Array.from({ length: 12 }, (_, i) => ({
          id: `${i + 1}`,
          title: `${type === "anime" ? "Anime" : "Manga"}: ${query} Result ${i + 1}`,
          image: "/placeholder.svg",
          type,
          description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla vitae diam euismod, aliquam nunc sit amet, consectetur nisl.",
          year: `${2020 + (i % 5)}`,
          genres: ["Action", "Fantasy", "Adventure"].slice(0, (i % 3) + 1),
          rating: 7 + (i % 3)
        }))
        
        setResults(mockResults)
      } catch (error) {
        console.error("Error fetching search results:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchResults()
  }, [query, type])
  
  return (
    <div className="flex min-h-screen bg-[#070707] text-white antialiased">
      <m.div 
        className="flex-1 min-h-screen text-white relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Content container */}
        <div className="ml-[78px] relative z-10 container mx-auto px-4 py-8">
          {/* Search header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-5 w-5 text-gray-400" />
              <h1 className="text-2xl font-bold">Search Results</h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-gray-400">
                Showing results for <span className="text-white font-medium">"{query}"</span>
              </p>
              
              <div className="flex items-center gap-2 ml-auto">
                <Link
                  href={`/search?q=${encodeURIComponent(query)}&type=anime`}
                  className={cn(
                    "py-1 px-3 rounded-full text-xs flex items-center gap-1.5 transition-colors",
                    type === "anime"
                      ? "bg-blue-500/20 text-blue-400 font-medium"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  )}
                >
                  <Film className="h-3.5 w-3.5" />
                  Anime
                </Link>
                
                <Link
                  href={`/search?q=${encodeURIComponent(query)}&type=manga`}
                  className={cn(
                    "py-1 px-3 rounded-full text-xs flex items-center gap-1.5 transition-colors",
                    type === "manga"
                      ? "bg-purple-500/20 text-purple-400 font-medium"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Manga
                </Link>
              </div>
            </div>
          </div>
          
          {/* Results grid */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <m.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-[50vh] flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-blue-500 border-b-blue-300 border-l-blue-300 animate-spin mb-4"></div>
                <p className="text-gray-400">Searching for {type}...</p>
              </m.div>
            ) : results.length > 0 ? (
              <m.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  <AnimatePresence>
                    {results.map((result, index) => (
                      <m.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          transition: { delay: index * 0.05, duration: 0.3 }
                        }}
                        className="bg-black/30 backdrop-blur-sm rounded-lg overflow-hidden border border-white/5 hover:border-white/10 transition-all group"
                      >
                        <Link href={`/${result.type}/${result.id}`}>
                          <div className="relative aspect-[2/3] overflow-hidden">
                            <img
                              src={result.image}
                              alt={result.title}
                              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70"></div>
                            <div className="absolute bottom-3 left-3 right-3">
                              <div className="flex items-center gap-1 mb-1">
                                <span className={cn(
                                  "py-0.5 px-2 rounded-full text-xs flex items-center gap-1",
                                  result.type === "anime" 
                                    ? "bg-blue-500/20 text-blue-400" 
                                    : "bg-purple-500/20 text-purple-400"
                                )}>
                                  {result.type === "anime" ? (
                                    <Film className="h-3 w-3 mr-0.5" />
                                  ) : (
                                    <BookOpen className="h-3 w-3 mr-0.5" />
                                  )}
                                  {result.type}
                                </span>
                                {result.year && (
                                  <span className="py-0.5 px-2 rounded-full text-xs bg-white/10 text-gray-300">
                                    {result.year}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
                                {result.title}
                              </h3>
                            </div>
                          </div>
                          
                          <div className="p-3">
                            {result.genres && result.genres.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {result.genres.map(genre => (
                                  <span 
                                    key={genre} 
                                    className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded"
                                  >
                                    {genre}
                                  </span>
                                ))}
                              </div>
                            )}
                            {result.description && (
                              <p className="text-xs text-gray-400 line-clamp-2">{result.description}</p>
                            )}
                          </div>
                        </Link>
                      </m.div>
                    ))}
                  </AnimatePresence>
                </div>
              </m.div>
            ) : (
              <m.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-[50vh] flex flex-col items-center justify-center text-center"
              >
                <div className="bg-white/5 rounded-full p-6 mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">No results found</h2>
                <p className="text-gray-400 max-w-md">
                  We couldn't find any {type} matching "{query}". Try different keywords or browse our trending content.
                </p>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </m.div>
    </div>
  )
} 