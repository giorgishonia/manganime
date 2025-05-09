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
  Share,
  Users,
  Info,
  Book,
  Home,
  Search,
  BookMarked,
  History,
  Settings,
  ListChecks,
  Plus,
  Check,
  CheckCheck,
  PauseCircle,
  XCircle,
  X,
  ChevronDown,
  Bell,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MangaReader } from '@/components/manga-reader'
import { ImageSkeleton } from '@/components/image-skeleton'
import { RelatedContent } from '@/components/related-content'
import { RecommendedContent } from '@/components/recommended-content'
import { DetailViewSkeleton } from '@/components/ui/skeleton'
import { getMangaById, stripHtml, formatStatus } from '@/lib/anilist'
import { getContentById, getChapters } from '@/lib/content'
import { CharacterSection } from '@/components/character-section'
import { CommentSection } from '@/components/comment-section'
import ChapterManager from '@/components/admin/chapter-manager'
import { isValid } from "date-fns";
import { getMangaProgress, getChapterProgress, getReadPercentage, getMangaTotalProgress, getLatestChapterRead, calculateMangaProgressByChapter } from '@/lib/reading-history'
import { Progress } from '@/components/ui/progress'
import { MediaStatus, MediaType, getLibraryItem, getLibraryItemSync, hasStatus, hasStatusSync, updateItemStatus } from '@/lib/user-library'
import { toast } from '@/components/ui/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useUnifiedAuth } from '@/components/unified-auth-provider'
import { useAuth } from '@/components/supabase-auth-provider'

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

// Helper function to safely create a valid date string or undefined
const formatSafeDate = (dateString: string | undefined) => {
  if (!dateString) return undefined;
  
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? undefined : dateString;
  } catch (e) {
    console.warn("Invalid date format:", dateString);
    return undefined;
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
  const [isFromDatabase, setIsFromDatabase] = useState(false)
  const [readingProgress, setReadingProgress] = useState<any>(null)
  const [initialReaderPage, setInitialReaderPage] = useState(0)
  const [libraryStatus, setLibraryStatus] = useState<MediaStatus | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSubProcessing, setIsSubProcessing] = useState(false)
  const { userId, isAuthenticated } = useUnifiedAuth()
  const { user } = useAuth(); // Get user from Supabase auth for admin check
  const [isAdmin, setIsAdmin] = useState(false); // State for admin status in page
  const [isAdminCheckComplete, setIsAdminCheckComplete] = useState(false); // Track completion
  const [overlayOpacity, setOverlayOpacity] = useState(20);
  const previousScrollY = useRef(0);
  const [isFavorite, setIsFavorite] = useState(false); // Add state for favorite

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

  // Update the useEffect for scroll handling to only affect the overlay div
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 20; // Reduced from 100 to 20 for faster response
      
      // Calculate opacity based on scroll position
      let newOpacity = 20;
      if (currentScrollY > scrollThreshold) {
        // Map scroll position to opacity (20-100) with higher multiplier
        newOpacity = Math.min(100, 20 + (currentScrollY - scrollThreshold) * 3);
      }
      
      setOverlayOpacity(Math.floor(newOpacity));
      previousScrollY.current = currentScrollY;
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Clean up
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Define fetchMangaData outside useEffect
  const fetchMangaData = async () => {
    try {
      setIsLoading(true);
      // First, try to get the content from our database
      const dbResult = await getContentById(mangaId);
      
      if (dbResult.success && dbResult.content && dbResult.content.type === 'manga') {
        console.log("Found manga in database:", dbResult.content);
        
        // Fetch chapters for this manga
        const chaptersResult = await getChapters(mangaId);
        const chapters = chaptersResult.success ? chaptersResult.chapters : [];
        console.log("Fetched chapters:", chapters);
        
        // Format content with chapters data
        setMangaData({
          ...formatDatabaseContent(dbResult.content),
          chaptersData: chapters
        });
        setIsFromDatabase(true);
      } else {
        // If not found in database, try AniList
        try {
          console.log("Manga not found in database, fetching from AniList API");
          const anilistData = await getMangaById(mangaId);
          console.log("AniList data received:", anilistData ? "Data found" : "No data");
          
          // Debug log the full character data structure
          if (anilistData && anilistData.characters) {
            console.log("Full character data from AniList:", {
              edges: anilistData.characters.edges,
              nodes: anilistData.characters.nodes,
              rawData: anilistData.characters
            });
          }
          
          if (anilistData) {
            console.log("AniList data structure check:", {
              hasRecommendations: !!anilistData.recommendations,
              recCount: anilistData.recommendations?.nodes?.length,
              hasRelations: !!anilistData.relations,
              relCount: anilistData.relations?.edges?.length,
              hasCharacters: !!anilistData.characters,
              charCount: anilistData.characters?.nodes?.length,
              score: anilistData.averageScore
            });
          }
          setMangaData(anilistData);
        } catch (anilistError) {
          console.error("Error fetching from AniList:", anilistError);
          throw anilistError; // Re-throw to trigger the not found state
        }
      }
    } catch (error) {
      console.error("Error fetching manga data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch manga data on component mount
  useEffect(() => {
    fetchMangaData();
  }, [mangaId]);

  // Add useEffect for admin check within the page component
  useEffect(() => {
    async function checkIfAdmin() {
      console.log("MangaPage: Starting admin check...");
      setIsAdminCheckComplete(false);
      if (!user) {
        console.log("MangaPage: No user, not admin.");
        setIsAdmin(false);
        setIsAdminCheckComplete(true);
        return;
      }

      // DEVELOPMENT MODE BYPASS - Temporarily removing this section
      /*
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        console.log("MangaPage: DEVELOPMENT MODE - Bypassing admin check.");
        setIsAdmin(true);
        setIsAdminCheckComplete(true);
        return;
      }
      */

      try {
        console.log("MangaPage: Fetching admin status...");
        const response = await fetch('/api/admin/check');
        const data = await response.json();
        console.log("MangaPage: Admin check response:", data);
        setIsAdmin(data.isAdmin || false);
      } catch (error) {
        console.error("MangaPage: Failed to check admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsAdminCheckComplete(true);
        console.log(`MangaPage: Admin check complete. isAdmin: ${isAdmin}`);
      }
    }
    checkIfAdmin();
  }, [user]); // Rerun check if user changes

  // Get reading progress for this manga
  useEffect(() => {
    if (mangaId) {
      const progress = getMangaProgress(mangaId)
      setReadingProgress(progress)
    }
  }, [mangaId, isReaderOpen])

  // Updated formatDatabaseContent function to remove volumes
  const formatDatabaseContent = (content: any) => {
    console.log("Formatting database content:", content);

    // --- DEBUG: Log raw image values ---
    console.log(`[manga formatDB] Raw Banner: ${content.bannerImage}, Raw Thumb: ${content.thumbnail}`);
    const bannerToUse = (content.bannerImage && content.bannerImage.trim() !== '') ? content.bannerImage : content.thumbnail;
    console.log(`[manga formatDB] Banner to use: ${bannerToUse}`);
    // ---------------------------------

    // Extract release date details for logging
    const releaseYear = content.release_year || null;
    const releaseMonth = content.release_month || null;
    const releaseDay = content.release_day || null;
    
    console.log("Release date information:", { 
      year: releaseYear, 
      month: releaseMonth, 
      day: releaseDay 
    });
    
    // Return content in a format that matches what the UI expects
    return {
      id: content.id,
      title: {
        english: content.title,
        romaji: content.title,
        native: content.georgian_title || content.alternative_titles?.[0] || content.title,
      },
      description: content.description,
      coverImage: {
        large: content.thumbnail,
        extraLarge: content.thumbnail,
      },
      bannerImage: bannerToUse,
      status: content.status.toUpperCase(),
      averageScore: typeof content.rating === 'number' ? content.rating * 10 : 70, // Convert 0-10 to 0-100
      popularity: content.popularity || 0,
      genres: content.genres || [],
      startDate: {
        year: releaseYear !== null ? parseInt(releaseYear) : new Date().getFullYear(),
        month: releaseMonth !== null ? parseInt(releaseMonth) : 1,
        day: releaseDay !== null ? parseInt(releaseDay) : 1,
      },
      chapters: content.chapters || 12, // Default value
      // Remove volumes
      // Add empty relation and recommendation objects for consistent structure
      relations: { 
        edges: content.relations?.map((rel: any) => ({
          relationType: rel.type || "RELATED",
          node: {
            id: rel.id,
            title: {
              romaji: rel.title,
              english: rel.title
            },
            coverImage: {
              large: rel.image
            },
            startDate: {
              year: rel.year
            }
          }
        })) || [] 
      },
      recommendations: { 
        nodes: content.recommendations?.map((rec: any) => ({
          mediaRecommendation: {
            id: rec.id,
            title: {
              romaji: rec.title,
              english: rec.title
            },
            coverImage: {
              large: rec.image
            },
            startDate: {
              year: rec.year
            },
            genres: rec.genres || []
          }
        })) || [] 
      },
      characters: { 
        nodes: content.characters?.map((char: any) => ({
          id: char.id,
          name: {
            full: char.name
          },
          image: {
            large: char.image
          }
        })) || [],
        edges: content.characters?.map((char: any) => ({
          role: char.role || "MAIN",
          node: {
            id: char.id
          }
        })) || []
      },
      staff: {
        edges: content.staff?.map((staff: any) => ({
          role: staff.role,
          node: {
            id: staff.id,
            name: {
              full: staff.name
            },
            image: {
              large: staff.image
            }
          }
        })) || []
      }
    };
  };

  const handleBackClick = () => {
    if (isReaderOpen) {
      setIsReaderOpen(false)
    } else {
      router.back()
    }
  }

  const handleReadClick = (chapterIndex = 0, resumeFromProgress = false) => {
    let selectedIndex = chapterIndex;
    let initialPage = 0;
    
    // If resuming from progress, find the chapter index that matches the stored progress
    if (resumeFromProgress && readingProgress && processedData) {
      const progressChapterIndex = processedData.chapterList.findIndex(
        (ch: any) => ch.id === readingProgress.chapterId || 
                     ch.number === readingProgress.chapterNumber
      );
      
      if (progressChapterIndex !== -1) {
        selectedIndex = progressChapterIndex;
        // Also set the initial page to resume from
        initialPage = readingProgress.currentPage;
      }
    }
    
    setSelectedChapter(selectedIndex);
    // Store the initial page to use when opening the reader
    setInitialReaderPage(initialPage);
    setIsReaderOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Replace the generateMockChapters function with a formatChapters function
  const formatChapters = (chaptersData: any[] = []) => {
    if (!chaptersData || chaptersData.length === 0) {
      // Return empty array or fallback to mock data if needed
      console.log("No chapters available, returning empty array");
      return Array.from({ length: 1 }, (_, i) => ({
        number: i + 1,
        title: `No chapters available`,
        releaseDate: new Date().toLocaleDateString(),
        thumbnail: mangaData.coverImage?.large || "/placeholder.svg", 
        pages: ["/manga-page-placeholder.jpg"]
      }));
    }
    
    return chaptersData.map((chapter) => ({
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      releaseDate: chapter.release_date ? new Date(chapter.release_date).toLocaleDateString() : "Unknown",
      thumbnail: chapter.thumbnail || mangaData.coverImage?.large || "/placeholder.svg",
      pages: chapter.pages || ["/manga-page-placeholder.jpg"]
    }));
  };

  // Update the processedData to display actual chapter amounts and remove volumes
  const processedData = mangaData ? {
    id: mangaData.id,
    title: mangaData.title?.english || mangaData.title?.romaji || "Unknown Title",
    subtitle: mangaData.title?.native,
    georgianTitle: isFromDatabase ? mangaData.georgian_title : null,
    coverImage: mangaData.coverImage?.large || "/placeholder.svg",
    bannerImage: mangaData.bannerImage || mangaData.coverImage?.large || "/placeholder.svg",
    // Better release date formatting with fallback - only display year
    releaseDate: mangaData.startDate && mangaData.startDate.year 
      ? `${mangaData.startDate.year}`
      : "Unknown",
    status: formatStatus(mangaData.status || ""),
    // Use actual chapter count if available, otherwise show chapter list length
    chapters: mangaData.chaptersData?.length || mangaData.chapters || "?",
    // Remove volumes info
    rating: mangaData.averageScore ? Math.max(0, Math.min(10, mangaData.averageScore / 10)) : null,
    popularity: mangaData.popularity || 0,
    genres: mangaData.genres || [],
    author: mangaData.staff?.edges?.find((staff: any) => 
      staff.role?.toLowerCase().includes('author') || 
      staff.role?.toLowerCase().includes('story')
    )?.node?.name?.full || "Unknown Author",
    synopsis: isFromDatabase ? mangaData.description : stripHtml(mangaData.description || "No description available"),
    chapterList: formatChapters(mangaData.chaptersData),
    // Fix the relations mapping to handle edge cases better
    relations: mangaData.relations?.edges?.filter((edge: any) => edge?.node && edge?.node?.id)
      .map((relation: any) => ({
        id: relation.node.id,
        title: relation.node.title?.english || relation.node.title?.romaji || "Unknown",
        type: relation.relationType || "RELATED",
        year: relation.node.startDate?.year || "Unknown",
        image: relation.node.coverImage?.large || relation.node.coverImage?.medium || "/placeholder.svg",
      })) || [],
    // Fix the recommendations mapping to handle edge cases better
    recommendations: mangaData.recommendations?.nodes?.filter((node: any) => node?.mediaRecommendation && node?.mediaRecommendation?.id)
      .map((rec: any) => ({
        id: rec.mediaRecommendation.id,
        title: rec.mediaRecommendation.title?.english || rec.mediaRecommendation.title?.romaji || "Unknown",
        year: rec.mediaRecommendation.startDate?.year || "Unknown",
        image: rec.mediaRecommendation.coverImage?.large || rec.mediaRecommendation.coverImage?.medium || "/placeholder.svg",
        genres: rec.mediaRecommendation.genres || [],
      })) || [],
    // Fix the characters mapping to ensure proper extraction
    characters: mapCharacters(mangaData)
  } : null;

  // Add a debug log for the processed data
  if (processedData) {
    console.log("Final processed data:", {
      dataAvailable: !!processedData,
      hasCharacters: !!processedData.characters,
      characterCount: processedData.characters?.length || 0,
      charactersSample: processedData.characters?.slice(0, 2) || []
    });
  }

  // Add this useEffect for debug logging
  useEffect(() => {
    if (processedData) {
      if (!processedData.relations || processedData.relations.length === 0) {
        console.log("No relations data to display");
      }
      if (!processedData.recommendations || processedData.recommendations.length === 0) {
        console.log("No recommendations data to display");
      }
    }
  }, [processedData]);

  // Add a debug effect to specifically log character data
  useEffect(() => {
    // Debug logging for character data
    console.log("Character data available:", !!mangaData?.characters);
    
    if (mangaData?.characters) {
      console.log("Raw character data from API:", {
        nodes: mangaData.characters.nodes?.length || 0,
        edges: mangaData.characters.edges?.length || 0,
        sample: mangaData.characters.nodes?.[0] || 'No characters'
      });
    }
    
    if (processedData && processedData.characters) {
      console.log("Processed character data:", {
        count: processedData.characters.length,
        sample: processedData.characters[0] || 'No processed characters'
      });
    }
  }, [mangaData, processedData]);

  function mapCharacters(data: any) {
    if (!data) {
      console.log('No data provided for character mapping');
      return [];
    }
    
    try {
      // Check if characters data exists in any expected format
      if (!data.characters) {
        console.log('No characters property in data');
        
        // WORKAROUND: Try to extract character data from alternative_titles
        if (data.alternative_titles && Array.isArray(data.alternative_titles)) {
          const characterEntries = data.alternative_titles.filter((entry: string) => 
            typeof entry === 'string' && entry.startsWith('character:')
          );
          
          if (characterEntries.length > 0) {
            console.log(`Found ${characterEntries.length} characters in alternative_titles`);
            const extractedCharacters = characterEntries.map((entry: string) => {
              // Extract the JSON part after "character:"
              const jsonStr = entry.substring(10); // 'character:'.length = 10
              const charData = JSON.parse(jsonStr);
              console.log('Extracted character:', charData);
              return {
                id: charData.id || `char-${Math.random().toString(36).substring(2, 9)}`,
                name: charData.name || 'Unknown',
                image: charData.image || '/placeholder-character.jpg',
                role: charData.role || 'SUPPORTING',
                age: charData.age || null,
                gender: charData.gender || null,
                voiceActor: null
              };
            });
            console.log(`Successfully extracted ${extractedCharacters.length} characters`);
            return extractedCharacters;
          }
        }
        
        return [];
      }
      
      console.log('Character data structure:', {
        hasCharacters: !!data.characters,
        hasEdges: !!data.characters.edges,
        edgeCount: data.characters.edges?.length || 0,
        hasNodes: !!data.characters.nodes,
        nodeCount: data.characters.nodes?.length || 0
      });

      // Similar to anime page: Map nodes with roles from edges
      if (data.characters.nodes && data.characters.nodes.length > 0) {
        console.log('Mapping characters from nodes with roles from edges');
        
        const mappedChars = data.characters.nodes
          .filter((node: any) => node?.id && node?.name)
          .map((char: any) => {
            // Try to find the role from edges
            const role = data.characters?.edges?.find((edge: any) => 
              edge?.node?.id === char.id
            )?.role || char.role || 'SUPPORTING';
            
            return {
              id: char.id || `char-${Math.random().toString(36).substring(2, 9)}`,
              name: char.name?.full || 'Unknown',
              image: char.image?.large || char.image?.medium || '/placeholder-character.jpg',
              role: role,
              age: char.age || null,
              gender: char.gender || null,
              voiceActor: null
            };
          });
        
        console.log(`Mapped ${mappedChars.length} characters from nodes with roles`);
        return mappedChars;
      }
      
      // Fallback to edges if nodes aren't available
      if (data.characters.edges && data.characters.edges.length > 0) {
        console.log('Mapping characters from edges data');
        
        const mappedChars = data.characters.edges
          .filter((char: any) => char && char.node)
          .map((char: any) => {
            const nodeData = char.node;
            return {
              id: nodeData.id || `char-${Math.random().toString(36).substring(2, 9)}`,
              name: nodeData.name?.full || 'Unknown',
              image: nodeData.image?.large || nodeData.image?.medium || '/placeholder-character.jpg',
              role: char.role || 'SUPPORTING',
              age: nodeData.age || null,
              gender: nodeData.gender || null,
              voiceActor: null
            };
          });
        
        console.log(`Mapped ${mappedChars.length} characters from edges`);
        return mappedChars;
      }
      
      // Last resort - handle array of character objects (database format)
      if (Array.isArray(data.characters)) {
        console.log('Mapping characters from array data (database format)');
        
        const mappedChars = data.characters
          .filter((char: any) => char)
          .map((char: any) => {
            return {
              id: char.id || `char-${Math.random().toString(36).substring(2, 9)}`,
              name: char.name || 'Unknown',
              image: char.image || '/placeholder-character.jpg',
              role: char.role || 'SUPPORTING',
              age: char.age || null,
              gender: char.gender || null,
              voiceActor: null
            };
          });
        
        console.log(`Mapped ${mappedChars.length} characters from array`);
        return mappedChars;
      }
      
      console.log('No usable character data found in any expected format');
      return [];
    } catch (err) {
      console.error('Error mapping characters:', err);
      return [];
    }
  }

  // Once processedData is defined, add the URL check effect here
  // Check for resume parameter in URL after processedData is defined
  useEffect(() => {
    if (processedData && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const shouldResume = urlParams.get('resume') === 'true';
      const pageParam = urlParams.get('page');
      const startPage = pageParam ? parseInt(pageParam, 10) : 0;
      
      if (shouldResume && readingProgress) {
        // Find chapter index that matches the stored reading progress
        const chapterIndex = processedData.chapterList.findIndex(
          (ch: any) => ch.id === readingProgress.chapterId || 
                       ch.number === readingProgress.chapterNumber
        );
        
        if (chapterIndex !== -1) {
          // Use the page from URL if available, otherwise use the stored progress
          const initialPage = startPage || readingProgress.currentPage;
          setInitialReaderPage(initialPage);
          handleReadClick(chapterIndex, true);
        }
      }
    }
  }, [readingProgress, processedData]);

  // Check library status when manga data is loaded
  useEffect(() => {
    async function checkLibraryStatus() {
      if (mangaId && processedData) {
        try {
          const item = await getLibraryItem(mangaId, 'manga');
          if (item) {
            setLibraryStatus(item.status);
          } else {
            setLibraryStatus(null);
          }
        } catch (error) {
          console.error("Error checking library status:", error);
          // Fallback to sync check for immediate feedback
          const item = getLibraryItemSync(mangaId, 'manga');
          if (item) {
            setLibraryStatus(item.status);
          } else {
            setLibraryStatus(null);
          }
        }
      }
    }
    
    checkLibraryStatus();
  }, [mangaId, processedData]);

  // Check subscription status when manga data and user ID are available
  useEffect(() => {
    async function checkSub() {
      if (mangaId && userId) {
        // Conceptual: Call checkSubscription
        // const { success, subscribed } = await checkSubscription(userId, mangaId);
        const success = true; // Placeholder
        const subscribed = false; // Placeholder
        if (success) {
          setIsSubscribed(subscribed);
        }
      }
    }
    checkSub();
  }, [mangaId, userId]);

  // Handle subscription toggle
  const handleToggleSubscription = async () => {
    if (!isAuthenticated || !userId) {
      toast({ title: "Please log in to subscribe.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (!processedData) return;

    setIsSubProcessing(true);
    const originalSubscribed = isSubscribed;

    // Optimistic update
    setIsSubscribed(!originalSubscribed);

    try {
      // Conceptual: Call backend toggle function
      // const { success, subscribed, error } = await toggleSubscription(userId, mangaId);
      const success = true; // Placeholder
      const subscribed = !originalSubscribed; // Placeholder
      const error: any = null; // Placeholder - explicitly type as any

      if (!success) {
        setIsSubscribed(originalSubscribed); // Revert optimistic update
        // Check error exists and has a message property before accessing it
        const errorMessage = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unknown error';
        toast({ title: "Failed to update subscription", description: errorMessage, variant: "destructive" });
      } else {
        setIsSubscribed(subscribed); // Confirm state
        toast({ title: subscribed ? "Subscribed!" : "Unsubscribed", description: `You will ${subscribed ? 'now' : 'no longer'} receive notifications for ${processedData?.title || 'this manga'}.` });
      }
    } catch (err: any) { // Explicitly type caught err as any
      setIsSubscribed(originalSubscribed); // Revert on error
      toast({ title: "Error updating subscription", variant: "destructive" });
      console.error("Subscription toggle error:", err);
    } finally {
      setIsSubProcessing(false);
    }
  };

  const handleStatusChange = async (status: MediaStatus) => {
    if (!processedData) return;
    
    // Get total chapters as a number for progress tracking
    const totalChapters = typeof processedData.chapters === 'number' 
      ? processedData.chapters 
      : processedData.chapterList?.length || 0;
    
    // Get current progress from reading history
    const progress = readingProgress ? readingProgress.chapterNumber : 0;
    
    try {
      await updateItemStatus(
        mangaId, 
        'manga', 
        status, 
        processedData.title, 
        processedData.coverImage,
        progress,
        totalChapters
      );
      
      setLibraryStatus(status);
      
      toast({
        title: "სტატუსი განახლდა",
        description: `"${processedData.title}" - მარკირებულია როგორც ${status ? status.replace('_', ' ') : 'Removed'}`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "შეცდომა",
        description: "სტატუსის განახლება ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.",
        duration: 3000,
      });
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: MediaStatus | null) => {
    switch (status) {
      case 'reading':
        return { icon: <BookOpen className="h-5 w-5" />, label: 'ვკითხულობ', color: 'text-green-500' };
      case 'completed':
        return { icon: <CheckCheck className="h-5 w-5" />, label: 'დასრულებული', color: 'text-blue-500' };
      case 'on_hold':
        return { icon: <PauseCircle className="h-5 w-5" />, label: 'შეჩერებული', color: 'text-yellow-500' };
      case 'dropped':
        return { icon: <XCircle className="h-5 w-5" />, label: 'მიტოვებული', color: 'text-red-500' };
      case 'plan_to_read':
        return { icon: <Bookmark className="h-5 w-5" />, label: 'სამომავლოდ', color: 'text-purple-500' };
      default:
        return { icon: <Plus className="h-5 w-5" />, label: 'დამატება ბიბლიოთეკაში', color: 'text-gray-400' };
    }
  };

  const statusInfo = getStatusInfo(libraryStatus);

  // Add useEffect to check favorite status
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!userId || !mangaId) return;
      
      try {
        // Get favorites from localStorage for now
        const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
        setIsFavorite(!!favorites[`manga-${mangaId}`]);
      } catch (error) {
        console.error("Error checking favorite status:", error);
      }
    };
    
    checkFavoriteStatus();
  }, [userId, mangaId]);

  // Add function to toggle favorite status
  const handleToggleFavorite = async () => {
    if (!isAuthenticated || !userId) {
      toast({ title: "Please log in to add favorites.", variant: "destructive" });
      router.push('/login');
      return;
    }
    
    try {
      // Toggle the state for immediate UI feedback
      setIsFavorite(!isFavorite);
      
      // For now, store favorites in localStorage
      const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
      
      if (isFavorite) {
        // Remove from favorites
        delete favorites[`manga-${mangaId}`];
      } else {
        // Add to favorites
        favorites[`manga-${mangaId}`] = {
          id: mangaId,
          type: 'manga',
          title: processedData?.title || '',
          image: processedData?.coverImage || '',
          addedAt: new Date().toISOString()
        };
      }
      
      localStorage.setItem('favorites', JSON.stringify(favorites));
      
      toast({
        title: isFavorite ? "რჩეულებიდან ამოშლილია" : "რჩეულებში დამატებულია",
        description: isFavorite 
          ? `"${processedData?.title}" ამოშლილია რჩეულებიდან` 
          : `"${processedData?.title}" დამატებულია რჩეულებში`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error toggling favorite status:", error);
      // Revert UI state if operation failed
      setIsFavorite(!isFavorite);
      toast({
        title: "შეცდომა",
        description: "რჩეულების განახლება ვერ მოხერხდა.",
        duration: 3000,
      });
    }
  };

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
          <h1 className="text-2xl font-bold mb-4">მანგა ვერ მოიძებნა</h1>
          <button onClick={() => router.back()} className="px-4 py-2 bg-purple-600 rounded-md">
            უკან დაბრუნება
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#070707] text-white antialiased">

      <motion.div 
        ref={scrollRef}
        className="flex-1 min-h-screen text-white relative overflow-y-auto overflow-x-hidden md:pl-20"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Background image with gradient overlay */}
        <AnimatePresence>
          {!isLoading && (
            <motion.div 
              className="fixed inset-0 z-0 md:pl-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              {/* --- DEBUG LOG --- */}
              {(() => { console.log("[app/manga/[id]] Rendering Banner. processedData.bannerImage:", processedData?.bannerImage); return null; })()}
              {/* Background image - higher quality with better cropping */}
              <div
                className="absolute inset-0 bg-auto bg-top"
                style={{ 
                  // Explicitly prioritize bannerImage, fallback to coverImage
                  backgroundImage: `url(${processedData.bannerImage || processedData.coverImage || '/placeholder.svg'})`,
                }}
              />
              
              {/* Replace the simplified overlay div with the original gradient structure */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/100 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#070707]/100 via-[#070707]/0 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-l from-[#070707]/80 via-[#070707]/0 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#070707]/80 via-[#070707]/0 to-transparent" />
                <div 
                  className="absolute inset-0 bg-[#070707] transition-opacity duration-500 ease-in-out" 
                  style={{ opacity: overlayOpacity / 100 }}
                />
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
        <div className="relative z-10 container mx-auto px-6 py-6 pb-20">
          {/* Back button */}
          <motion.button 
            onClick={handleBackClick} 
            className="flex items-center gap-6 text-gray-400 hover:text-white mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ x: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{isReaderOpen ? "დახურვა" : "უკან"}</span>
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
                      {processedData.georgianTitle || processedData.title}: {processedData.chapterList[selectedChapter].title}
                    </h2>
                    <span className="text-gray-400">{processedData.chapterList[selectedChapter].releaseDate}</span>
                  </div>
                </div>

                <MangaReader
                  chapter={processedData.chapterList[selectedChapter]}
                  onClose={() => setIsReaderOpen(false)}
                  chapterList={processedData.chapterList}
                  onChapterSelect={setSelectedChapter}
                  mangaId={mangaId}
                  mangaTitle={processedData.title}
                  initialPage={initialReaderPage}
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
                  className="flex flex-col md:flex-row gap-8 mt-24 mb-12"
                  variants={itemVariants}
                >
                  {/* Cover image - Adjust width slightly */}
                  <motion.div 
                    className="w-full sm:w-60 md:w-[260px] flex-shrink-0 mx-auto md:mx-0" /* Center on mobile */
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="relative">
                      <ImageSkeleton
                        src={processedData.coverImage || "/placeholder.svg"}
                        alt={processedData.title}
                        className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-2xl"
                      />
                    </div>
                  </motion.div>

                  {/* Details */}
                  {/* Center text on mobile */} 
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2 text-sm">
                      <div className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full">
                        {processedData.status}
                      </div>
                      
                      {processedData.genres.slice(0, 3).map((genre: string, idx: number) => (
                        <div key={idx} className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full">
                          {genre}
                        </div>
                      ))}
                    </div>
                
                    {/* Display native title as subtitle if no Georgian title */}
                    {!processedData.georgianTitle && processedData.subtitle && (
                      <motion.h2 
                        className="text-4xl font-bold mb-2"
                        variants={itemVariants}
                      >
                        {processedData.subtitle}
                      </motion.h2>
                    )}

                    <motion.h1 
                      className="text-xl text-gray-400 mb-4"
                      variants={itemVariants}
                    >
                      {processedData.georgianTitle || processedData.title}
                    </motion.h1>

                    {/* Responsive grid columns for details */}
                    <motion.div 
                      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6 text-sm justify-items-center md:justify-items-start" /* Adjusted grid/justify */
                      variants={itemVariants}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-gray-400" />
                        <span>{processedData.releaseDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-400" />
                        <span>
                          {typeof processedData.chapters === 'number' 
                            ? `${processedData.chapters} chapter${processedData.chapters !== 1 ? 's' : ''}`
                            : `${processedData.chapters} chapters`
                          }
                        </span>
                      </div>
                      {/* Add rating here */}
                      {processedData.rating && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-medium text-white">{processedData.rating.toFixed(1)}</span>
                          <span className="text-xs text-gray-500">/10</span>
                        </div>
                      )}
                    </motion.div>

                    <motion.p 
                      className="text-gray-300 mb-8 max-w-3xl"
                      variants={itemVariants}
                    >
                      {processedData.synopsis}
                    </motion.p>
                  </div>
                </motion.div>

                {/* Button alignment */}
                <motion.div 
                  className="mt-8">
                   {/* Make buttons stack on mobile */}
                  <motion.div 
                    className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full max-w-xs sm:max-w-none mx-auto sm:mx-0 md:w-auto justify-center md:justify-start"
                    variants={itemVariants}
                  >
                    {readingProgress ? (
                      <motion.button
                        className=" px-6 py-3 flex justify-center bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 shadow-lg shadow-purple-900/20 font-medium"
                        onClick={() => handleReadClick(0, true)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <BookOpen className="h-5 w-5" />
                        გაგრძელება
                        <span className="ml-1 text-xs bg-purple-500 px-2 py-0.5 rounded-full">
                          {readingProgress.chapterNumber}
                        </span>
                      </motion.button>
                    ) : (
                      <motion.button
                        className="w-full md:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center md:justify-start gap-2 shadow-lg shadow-purple-900/20 font-medium"
                        onClick={() => handleReadClick(0)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <BookOpen className="h-5 w-5" />
                        კითხვის დაწყება
                      </motion.button>
                    )}
                    
                    {/* Library Status Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          style={{height: "52px"}}
                          className="w-full md:w-auto bg-black/30 border-gray-700 hover:border-gray-500 flex justify-center md:justify-start"
                        >
                          <span className={statusInfo.color}>{statusInfo.icon}</span>
                          <span className="ml-2">{statusInfo.label}</span>
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      
                      <DropdownMenuContent className="w-48 bg-gray-900/95 backdrop-blur-md border-white/10">
                        <DropdownMenuItem 
                          className={libraryStatus === 'reading' ? "bg-green-900/20 text-green-400" : ""} 
                          onClick={() => handleStatusChange('reading')}
                        >
                          <BookOpen className="mr-2 h-4 w-4" />
                          <span>ვკითხულობ</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          className={libraryStatus === 'plan_to_read' ? "bg-purple-900/20 text-purple-400" : ""} 
                          onClick={() => handleStatusChange('plan_to_read')}
                        >
                          <Bookmark className="mr-2 h-4 w-4" />
                          <span>სამომავლოდ</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          className={libraryStatus === 'completed' ? "bg-blue-900/20 text-blue-400" : ""} 
                          onClick={() => handleStatusChange('completed')}
                        >
                          <CheckCheck className="mr-2 h-4 w-4" />
                          <span>დასრულებული</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          className={libraryStatus === 'on_hold' ? "bg-yellow-900/20 text-yellow-400" : ""} 
                          onClick={() => handleStatusChange('on_hold')}
                        >
                          <PauseCircle className="mr-2 h-4 w-4" />
                          <span>შეჩერებული</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          className={libraryStatus === 'dropped' ? "bg-red-900/20 text-red-400" : ""} 
                          onClick={() => handleStatusChange('dropped')}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          <span>მიტოვებული</span>
                        </DropdownMenuItem>

                        {libraryStatus && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-gray-400"
                              onClick={() => {
                                setLibraryStatus(null);
                                updateItemStatus(mangaId, 'manga', 'plan_to_read', '', '', 0);
                              }}
                            >
                              <X className="mr-2 h-4 w-4" />
                              <span>ამოშლა ბიბლიოთეკიდან</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Favorite Button */}
                    <motion.button
                      className={cn(
                        "p-2 border rounded-md transition-colors flex items-center gap-1.5 text-sm h-[52px]",
                        "w-full md:w-auto justify-center md:justify-start",
                        isFavorite 
                          ? "bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30"
                          : "text-gray-300 hover:text-white border-gray-700 hover:border-gray-500 hover:bg-white/5"
                      )}
                      onClick={handleToggleFavorite}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <motion.div
                        initial={{ scale: 1 }}
                        animate={isFavorite ? 
                          { scale: 1.2 } : 
                          { scale: 1 }
                        }
                        whileTap={{ scale: 0.8 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 500,
                          damping: 10
                        }}
                      >
                        <Heart className={cn("h-5 w-5", isFavorite && "fill-red-500 text-red-500")} />
                      </motion.div>
                      <span>{isFavorite ? "რჩეულია" : "რჩეულებში დამატება"}</span>
                    </motion.button>

                    {/* Subscribe Button */}
                    <motion.button
                      className={cn(
                        "p-2 border rounded-md transition-colors flex items-center gap-1.5 text-sm h-[52px]",
                        "w-full md:w-auto justify-center md:justify-start",
                        isSubscribed 
                          ? "bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30"
                          : "text-gray-300 hover:text-white border-gray-700 hover:border-gray-500 hover:bg-white/5"
                      )}
                      onClick={handleToggleSubscription}
                      disabled={isSubProcessing}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title={isSubscribed ? "Unsubscribe from new chapter notifications" : "Subscribe to new chapter notifications"}
                    >
                      {isSubProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSubscribed ? (
                        <Bell className="h-4 w-4" /> // Or Check? Or BellOff?
                      ) : (
                        <Bell className="h-4 w-4" /> // Or BellPlus?
                      )}
                      <span>{isSubscribed ? "გამოწერილია" : "გამოწერა"}</span>
                    </motion.button>
                  </motion.div>
                </motion.div>

                {/* --- RESTORED CONTENT SECTIONS START --- */}
                {/* Main content container - Make single column on mobile */}
                <div className="flex flex-col mt-8 mb-12">
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left side: Chapters list */}
                    <div className="lg:w-3/5 order-2 lg:order-1"> {/* Chapters second on mobile */}
                      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold">თავები</h2>
                        
                        {/* Enhanced Chapter selection dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <motion.button
                              className="bg-black/40 border border-white/10 hover:border-purple-500/50 text-white px-4 py-2 rounded-lg flex items-center gap-2 w-full sm:w-auto justify-center"
                              whileHover={{ scale: 1.02, backgroundColor: "rgba(128, 90, 213, 0.2)" }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <BookOpen className="h-4 w-4 text-purple-400" />
                              <span>{readingProgress ? 'გაგრძელება' : 'თავის არჩევა'}</span>
                              <ChevronDown className="h-4 w-4 text-purple-400 ml-1" />
                            </motion.button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            className="bg-gray-900/95 backdrop-blur-md border-white/10 border max-h-[400px] overflow-y-auto w-[300px]"
                          >
                            <div className="p-3 sticky top-0 bg-gray-900/95 border-b border-gray-700/50 flex items-center justify-between">
                              <span className="font-semibold text-sm">თავების სია</span>
                              <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded-full">
                                {processedData?.chapterList?.length} თავი
                              </span>
                            </div>
                            
                            {/* Simple chapter list for dropdown */}
                            <div className="py-2">
                              {processedData?.chapterList?.map((chapter: any, index: number) => {
                                const chapterId = chapter.id || `chapter-${chapter.number}`;
                                const readPercentage = getReadPercentage(mangaId, chapterId);
                                const isCurrentlyReading = readingProgress?.chapterId === chapterId || readingProgress?.chapterNumber === chapter.number;
                                
                                return (
                                  <div 
                                    key={`chapter-dropdown-${index}`}
                                    onClick={() => handleReadClick(index)}
                                    className={cn(
                                      "flex items-center p-2 hover:bg-purple-900/20 rounded cursor-pointer transition-colors mx-2",
                                      isCurrentlyReading && "bg-purple-900/20 text-purple-300"
                                    )}
                                  >
                                    <div className={cn(
                                      "h-7 w-7 rounded-full flex items-center justify-center text-xs mr-3 flex-shrink-0",
                                      isCurrentlyReading 
                                        ? "bg-purple-700 text-white ring-2 ring-purple-500/50" 
                                        : readPercentage > 0 
                                          ? "bg-green-700/70 text-white" 
                                          : "bg-gray-800"
                                    )}>
                                      {chapter.number}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-sm truncate">{chapter.title}</span>
                                        {isCurrentlyReading && (
                                          <BookOpen className="h-4 w-4 flex-shrink-0 text-purple-400 ml-1" />
                                        )}
                                      </div>
                                      
                                      <div className="text-xs text-gray-400 mt-1 flex items-center">
                                        <CalendarDays className="h-3 w-3 mr-1" />
                                        {chapter.releaseDate}
                                      </div>
                                      
                                      {readPercentage > 0 && (
                                        <div className="mt-2 w-full">
                                          <Progress 
                                            value={readPercentage} 
                                            className="h-1.5 bg-gray-800/50 w-full" 
                                            indicatorClassName={isCurrentlyReading ? "bg-purple-500" : "bg-green-500"}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Responsive chapter list */}
                      <div className="space-y-2">
                        {processedData?.chapterList?.map((chapter: any, index: number) => {
                          const chapterId = chapter.id || `chapter-${chapter.number}`;
                          const readPercentage = getReadPercentage(mangaId, chapterId);
                          const isCurrentlyReading = readingProgress?.chapterId === chapterId || readingProgress?.chapterNumber === chapter.number;
                          
                          return (
                            <motion.div
                              key={`chapter-${index}`}
                              className="flex items-center justify-between bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden hover:bg-gray-800/40 transition-all duration-200 hover:border-purple-500/30"
                              whileHover={{ scale: 1.01, y: -2 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <div className="flex items-center flex-1 p-3 md:p-4">
                                <div className={cn(
                                  "h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center text-sm mr-3 md:mr-4 flex-shrink-0",
                                  isCurrentlyReading 
                                    ? "bg-purple-700 text-white ring-2 ring-purple-500/50" 
                                    : readPercentage > 0 
                                      ? "bg-green-700/70 text-white" 
                                      : "bg-gray-800"
                                )}>
                                  <Book className="h-4 w-4 md:h-5 md:w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-base md:text-lg truncate">
                                    Chapter {chapter.number}: {chapter.title}
                                  </h3>
                                  
                                  <div className="text-xs text-gray-400 flex items-center gap-2">
                                    <CalendarDays className="h-3 w-3" />
                                    {chapter.releaseDate}
                                    
                                    {readPercentage > 0 && (
                                      <span className={cn(
                                        "ml-2 px-1.5 py-0.5 rounded text-xs",
                                        isCurrentlyReading ? "bg-purple-900/50 text-purple-300" : "bg-green-900/50 text-green-300"
                                      )}>
                                        {isCurrentlyReading ? "Reading" : `${readPercentage}%`}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {readPercentage > 0 && (
                                    <div className="mt-2 w-full max-w-xs">
                                      <Progress 
                                        value={readPercentage} 
                                        className="h-1.5 bg-gray-800/50" 
                                        indicatorClassName={isCurrentlyReading ? "bg-purple-500" : "bg-green-500"}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <button 
                                onClick={() => handleReadClick(index)}
                                className="rounded-l-lg bg-purple-600 hover:bg-purple-700 text-white px-3 md:px-6 h-full flex items-center justify-center transition-colors"
                              >
                                <Book className="h-4 w-4 md:hidden" />
                                <span className="font-medium hidden md:inline">წაკითხვა</span>
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Right side: Characters grid */}
                    <div className="lg:w-2/5 order-1 lg:order-2"> {/* Characters first on mobile */}
                      <h2 className="text-xl font-bold mb-4">პერსონაჟები</h2>
                      
                      {/* Display characters section in the UI */}
                      {processedData?.characters && processedData.characters.length > 0 && (
                        <div className="mt-12">
                          <div className={`grid ${
                            processedData.characters.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' :
                            processedData.characters.length <= 4 ? 'grid-cols-2 sm:grid-cols-2' :
                            processedData.characters.length <= 6 ? 'grid-cols-2 sm:grid-cols-3' :
                            processedData.characters.length <= 8 ? 'grid-cols-2 sm:grid-cols-4' :
                            'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                          } gap-4`}>
                            {processedData.characters.map((character: any) => (
                              <div 
                                key={character.id} 
                                className="bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors h-full flex flex-col"
                              >
                                <div className="aspect-[3/4] relative overflow-hidden w-full">
                                  <img 
                                    src={character.image} 
                                    alt={character.name}
                                    className="object-cover w-full h-full"
                                    onError={(e) => {
                                      e.currentTarget.src = '/placeholder-character.jpg';
                                    }}
                                  />
                                  <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/60 to-transparent p-2 pt-10">
                                    <div className={`text-xs px-2 py-0.5 rounded-full inline-block font-medium ${
                                      character.role === 'MAIN' 
                                        ? 'bg-purple-500/90 text-white' 
                                        : character.role === 'SUPPORTING' 
                                          ? 'bg-blue-500/80 text-white' 
                                          : 'bg-gray-500/80 text-white'
                                    }`}>
                                      {character.role === 'MAIN' ? 'მთავარი' : 
                                       character.role === 'SUPPORTING' ? 'მეორეხარისხოვანი' : 'მეორადი'}
                                    </div>
                                  </div>
                                </div>
                                <div className="p-3 flex-1 flex flex-col justify-between">
                                  <h3 className="font-semibold text-sm break-words" title={character.name}>
                                    {character.name}
                                  </h3>
                                  <div className="flex flex-wrap gap-2 mt-1.5">
                                    {character.gender && (
                                      <span className="text-xs text-muted-foreground bg-gray-800/60 px-1.5 py-0.5 rounded">
                                        {character.gender}
                                      </span>
                                    )}
                                    {character.age && (
                                      <span className="text-xs text-muted-foreground bg-gray-800/60 px-1.5 py-0.5 rounded">
                                        {character.age} years
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    
                      {/* Right side (continued): Related/Recommended - Move inside the same column div */}
                      {/* Adjust spacing */} 
                      {/* Related manga */} 
                      {processedData.relations && processedData.relations.length > 0 && (
                        <motion.section 
                          className="mb-12 mt-8 lg:mt-8" /* Consistent margin top */
                          variants={sectionVariants}
                          initial="initial" /* Add animation props */
                          animate="animate"
                        >
                          <motion.h2 
                            className="text-xl font-bold mb-6 flex items-center"
                            variants={itemVariants}
                          >
                            <ChevronRight className="mr-2 h-5 w-5 text-purple-400" />
                            მსგავსი კონტენტი
                          </motion.h2>
                          <RelatedContent items={processedData.relations} />
                        </motion.section>
                      )}

                      {/* Recommendations */} 
                      {processedData.recommendations && processedData.recommendations.length > 0 && (
                        <motion.section
                          className="mb-12"
                          variants={sectionVariants}
                          initial="initial" /* Add animation props */
                          animate="animate"
                        >
                          <motion.h2 
                            className="text-xl font-bold mb-6 flex items-center"
                            variants={itemVariants}
                          >
                            <Bookmark className="mr-2 h-5 w-5 text-purple-400" />
                            შეიძლება მოგეწონოთ
                          </motion.h2>
                          <RecommendedContent items={processedData.recommendations} />
                        </motion.section>
                      )}
                    </div>

                  </div>
                  {/* Add Chapter Manager & Comments after the main grid layout */}
                  <div className="lg:col-span-2 order-3 w-full mt-16">
                    {/* Add Chapter Manager as a separate section but only if from database AND user is admin */}
                      {isFromDatabase && isAdminCheckComplete && isAdmin && (
                        <motion.section 
                          className="mb-12 mt-8"
                          variants={sectionVariants}
                          initial="initial" /* Add animation props */
                          animate="animate"
                        >
                          <ChapterManager 
                            contentId={mangaId}
                            onChaptersUpdated={fetchMangaData}
                            initialChapters={processedData.chapterList.map((chapter: any) => ({
                              id: chapter.id || `temp-${chapter.number}`,
                              number: chapter.number,
                              title: chapter.title,
                              releaseDate: formatSafeDate(chapter.releaseDate),
                              thumbnail: chapter.thumbnail,
                              pages: Array.isArray(chapter.pages) ? chapter.pages : []
                            }))}
                          />
                        </motion.section>
                      )}

                      {/* Comments section */}
                      <CommentSection 
                        contentId={mangaId}
                        contentType="manga"
                        sectionVariants={sectionVariants} // Pass variants
                        itemVariants={itemVariants}     // Pass variants
                      />
                    </div>
                </div>
                {/* --- RESTORED CONTENT SECTIONS END --- */}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
