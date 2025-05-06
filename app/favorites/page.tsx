"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion as m, AnimatePresence } from 'framer-motion'
import { Heart, X, Bookmark, BookOpen, Clock, ChevronRight, Filter, TrendingUp, LayoutGrid, Layers, Sparkles, BookMarked } from 'lucide-react'
import { ImageSkeleton } from '@/components/image-skeleton'
import { cn } from '@/lib/utils'
import { useUnifiedAuth } from '@/components/unified-auth-provider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AppSidebar } from '@/components/app-sidebar'

// Animation variants with improved easing
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

// Filter animations
const filterVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

interface FavoriteItem {
  id: string;
  type: 'manga' | 'anime' | 'comics';
  title: string;
  image: string;
  addedAt: string;
}

export default function FavoritesPage() {
  const router = useRouter()
  const { userId, isAuthenticated } = useUnifiedAuth()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  useEffect(() => {
    // Redirect if not logged in
    if (!isAuthenticated && typeof window !== 'undefined') {
      router.push('/login?returnUrl=/favorites')
      return
    }
    
    // Load favorites from localStorage
    const loadFavorites = () => {
      try {
        const storedFavorites = localStorage.getItem('favorites')
        if (storedFavorites) {
          const parsedFavorites = JSON.parse(storedFavorites)
          const favoritesArray = Object.values(parsedFavorites) as FavoriteItem[]
          
          // Sort by most recently added
          favoritesArray.sort((a, b) => {
            return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
          })
          
          setFavorites(favoritesArray)
        }
      } catch (error) {
        console.error('Error loading favorites:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadFavorites()
    
    // Add event listener to refresh favorites when storage changes
    window.addEventListener('storage', loadFavorites)
    
    return () => {
      window.removeEventListener('storage', loadFavorites)
    }
  }, [isAuthenticated, router])
  
  const handleRemoveFavorite = (itemId: string, type: 'manga' | 'anime' | 'comics') => {
    try {
      // Get current favorites
      const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '{}')
      
      // Delete the item
      delete storedFavorites[`${type}-${itemId}`]
      
      // Save back to localStorage
      localStorage.setItem('favorites', JSON.stringify(storedFavorites))
      
      // Update state
      setFavorites(prev => prev.filter(item => !(item.id === itemId && item.type === type)))
      
      // Trigger storage event to update other tabs
      window.dispatchEvent(new Event('storage'))
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }
  
  const filteredFavorites = activeTab === 'all' 
    ? favorites 
    : favorites.filter(item => item.type === activeTab)
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070707]">
        <div className="flex flex-col items-center gap-4">
          <m.div 
            className="w-12 h-12 relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Heart className="absolute inset-0 w-12 h-12 text-pink-500 opacity-75" />
            <Heart className="absolute inset-0 w-12 h-12 text-purple-500 opacity-75" style={{ transform: 'rotate(45deg)' }} />
          </m.div>
          <m.p 
            className="text-white/50 text-sm"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            იტვირთება...
          </m.p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#070707] to-[#0a0118] text-white">
      <AppSidebar />

      <main className="flex-1 overflow-x-hidden pl-0 md:pl-[77px] pb-20">
        {/* Hero section */}
        <m.div 
          className="relative w-full h-[180px] md:h-[240px] overflow-hidden mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Background gradients and effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-indigo-900/20"></div>
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
          
          {/* Content overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-transparent"></div>
          
          {/* Hero content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
            <div className="max-w-7xl mx-auto w-full">
              <m.div 
                className="flex items-center gap-3 mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <m.div 
                  className="relative"
                  whileHover={{ scale: 1.1, rotate: 15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Heart className="w-10 h-10 md:w-12 md:h-12 text-red-500 fill-red-500 drop-shadow-lg" />
                  <m.div 
                    className="absolute inset-0 bg-red-500 rounded-full filter blur-md opacity-30"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </m.div>
                <div>
                  <m.h1 
                    className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    ჩემი რჩეულები
                  </m.h1>
                  <m.p 
                    className="text-white/60 text-sm md:text-base"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    თქვენი შენახული საყვარელი კონტენტი
                  </m.p>
                </div>
              </m.div>
            </div>
          </div>
        </m.div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Filter and view controls */}
          <m.div 
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
            variants={filterVariants}
            initial="hidden"
            animate="visible"
          >
            <Tabs 
              defaultValue="all" 
              onValueChange={setActiveTab} 
              className="w-full md:w-auto"
            >
              <TabsList className="bg-black/40 border border-white/10 p-1 w-full md:w-auto backdrop-blur-sm rounded-xl overflow-hidden">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-4 py-2 rounded-lg"
                >
                  <m.div className="flex items-center gap-2" whileHover={{ x: 2 }}>
                    <Sparkles className="w-4 h-4" />
                    <span>ყველა ({favorites.length})</span>
                  </m.div>
                </TabsTrigger>
                <TabsTrigger 
                  value="manga" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-4 py-2 rounded-lg"
                >
                  <m.div className="flex items-center gap-2" whileHover={{ x: 2 }}>
                    <BookOpen className="w-4 h-4" />
                    <span>მანგა ({favorites.filter(f => f.type === 'manga').length})</span>
                  </m.div>
                </TabsTrigger>
                <TabsTrigger 
                  value="comics" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-4 py-2 rounded-lg"
                >
                  <m.div className="flex items-center gap-2" whileHover={{ x: 2 }}>
                    <BookMarked className="w-4 h-4" />
                    <span>კომიქსი ({favorites.filter(f => f.type === 'comics').length})</span>
                  </m.div>
                </TabsTrigger>
                <TabsTrigger 
                  value="anime" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-4 py-2 rounded-lg"
                >
                  <m.div className="flex items-center gap-2" whileHover={{ x: 2 }}>
                    <TrendingUp className="w-4 h-4" />
                    <span>ანიმე ({favorites.filter(f => f.type === 'anime').length})</span>
                  </m.div>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-3">
              <div className="text-xs text-white/60">ხედი:</div>
              <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-lg">
                <m.button
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'}`}
                  onClick={() => setViewMode('grid')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LayoutGrid className="w-4 h-4" />
                </m.button>
                <m.button
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'}`}
                  onClick={() => setViewMode('list')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Layers className="w-4 h-4" />
                </m.button>
              </div>
            </div>
          </m.div>
          
          {filteredFavorites.length === 0 ? (
            <m.div 
              className="text-center py-20 bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Background effects */}
              <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 to-indigo-900/5"></div>
              <div className="absolute -top-24 right-1/3 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-24 left-1/3 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl"></div>
              
              <m.div 
                className="relative z-10 max-w-md mx-auto"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <m.div 
                  className="mx-auto w-16 h-16 md:w-20 md:h-20 relative mb-6"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Heart className="w-full h-full text-gray-400" />
                  <m.div 
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-gray-600 opacity-50"
                    animate={{ scale: [1, 0.8, 1], opacity: [0.5, 0.3, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Heart />
                  </m.div>
                </m.div>
                
                <h3 className="text-xl md:text-2xl font-medium text-white mb-3">
                  {activeTab === 'all' 
                    ? 'თქვენ არ გაქვთ რჩეული კონტენტი' 
                    : activeTab === 'manga' 
                      ? 'თქვენ არ გაქვთ რჩეული მანგა' 
                      : activeTab === 'comics'
                        ? 'თქვენ არ გაქვთ რჩეული კომიქსი'
                      : 'თქვენ არ გაქვთ რჩეული ანიმე'}
                </h3>
                
                <p className="text-gray-400 mb-8 px-4">
                  {activeTab === 'all' 
                    ? 'დაამატე შენი საყვარელი კონტენტი რჩეულებში და ნახავ აქ' 
                    : activeTab === 'manga' 
                      ? 'დაამატე შენი საყვარელი მანგა რჩეულებში და ნახავ აქ' 
                      : activeTab === 'comics'
                        ? 'დაამატე შენი საყვარელი კომიქსი რჩეულებში და ნახავ აქ'
                      : 'დაამატე შენი საყვარელი ანიმე რჩეულებში და ნახავ აქ'}
                </p>
                
                <m.div whileHover={{ y: -3 }} whileTap={{ y: 0 }}>
                  <Button 
                    className="relative overflow-hidden px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-medium shadow-xl shadow-purple-800/20 group"
                    onClick={() => router.push(`/${activeTab === 'manga' ? 'manga' : activeTab === 'comics' ? 'comics' : activeTab === 'anime' ? 'anime' : '/'}`)}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <span>
                        {activeTab === 'manga' 
                          ? 'ნახე მანგები' 
                          : activeTab === 'comics'
                            ? 'ნახე კომიქსები'
                          : activeTab === 'anime' 
                            ? 'ნახე ანიმეები' 
                            : 'მთავარ გვერდზე გადასვლა'}
                      </span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  </Button>
                </m.div>
              </m.div>
            </m.div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <m.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
                >
                  <AnimatePresence>
                    {filteredFavorites.map((item) => (
                      <m.div 
                        key={`${item.type}-${item.id}`}
                        variants={itemVariants}
                        className="group cursor-pointer bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all duration-300"
                        layoutId={`${item.type}-${item.id}`}
                        onClick={() => router.push(`/${item.type}/${item.id}`)}
                        whileHover={{ scale: 1.03, y: -5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        {/* Add Image Container */}
                        <div className="aspect-[2/3] relative overflow-hidden">
                          <ImageSkeleton
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          {/* Add a subtle gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity"></div>
                           {/* Type Badge */}
                          <m.div 
                            className={cn(
                              "absolute top-2 left-2 px-2 py-0.5 rounded-md text-xs font-medium border",
                              item.type === 'manga' ? 'bg-purple-900/50 text-purple-200 border-purple-500/30' 
                              : item.type === 'comics' ? 'bg-yellow-900/50 text-yellow-200 border-yellow-500/30'
                              : 'bg-indigo-900/50 text-indigo-200 border-indigo-500/30'
                            )}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            {item.type === 'manga' ? 'მანგა' : item.type === 'comics' ? 'კომიქსი' : 'ანიმე'}
                          </m.div>
                           {/* Remove Button (positioned inside image) */}
                           <m.button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFavorite(item.id, item.type);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-red-400 border border-red-500/30 opacity-0 group-hover:opacity-100 hover:bg-red-800/60 transition-all duration-200 z-10"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ delay: 0.1 }}
                          >
                            <X className="w-4 h-4" />
                          </m.button>
                        </div>

                        {/* Text content below image */}
                        <div className="p-3 md:p-4">
                          <m.h3 
                            className="text-sm md:text-base font-semibold text-white truncate mb-1" 
                            title={item.title}
                            whileHover={{ x: 3 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            {item.title}
                          </m.h3>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(item.addedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </m.div>
                    ))}
                  </AnimatePresence>
                </m.div>
              ) : (
                <m.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col gap-4"
                >
                  {filteredFavorites.map((item) => (
                    <m.div 
                      key={`list-${item.type}-${item.id}`}
                      variants={itemVariants}
                      className="group cursor-pointer bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all duration-300"
                      layoutId={`list-${item.type}-${item.id}`}
                      onClick={() => router.push(`/${item.type}/${item.id}`)}
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <div className="flex flex-row items-center p-3 md:p-4">
                        {/* Thumbnail */}
                        <div className="relative w-16 h-24 md:w-20 md:h-30 rounded-lg overflow-hidden border border-white/10 mr-4">
                          <ImageSkeleton
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <m.h3 
                              className="text-base md:text-lg font-semibold text-white truncate" 
                              title={item.title}
                            >
                              {item.title}
                            </m.h3>
                            <m.div 
                              className={cn(
                                `px-2 py-0.5 rounded-md text-xs font-medium border`,
                                item.type === 'manga' ? 'bg-purple-900/40 text-purple-200 border border-purple-500/30' 
                                : item.type === 'comics' ? 'bg-yellow-900/40 text-yellow-200 border border-yellow-500/30'
                                : 'bg-indigo-900/40 text-indigo-200 border border-indigo-500/30'
                              )}
                            >
                              {item.type === 'manga' ? 'მანგა' : item.type === 'comics' ? 'კომიქსი' : 'ანიმე'}
                            </m.div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>დამატებულია: {new Date(item.addedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <m.button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveFavorite(item.id, item.type)
                            }}
                            className="p-2 rounded-full border border-red-500/30 bg-black/40 text-red-400 hover:bg-red-800/40"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <X className="w-4 h-4" />
                          </m.button>
                          
                          <m.button
                            className="p-2 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </m.button>
                        </div>
                      </div>
                    </m.div>
                  ))}
                </m.div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
} 