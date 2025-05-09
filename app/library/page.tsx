"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusSelector } from "@/components/ui/status-selector";
import { 
  BookOpen, 
  Play, 
  CheckCheck, 
  PauseCircle, 
  X, 
  BookmarkPlus 
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { getLibraryItems, getLibraryStats, MediaStatus, MediaType, LibraryItem, syncAllToServer } from "@/lib/user-library";
import { cn } from "@/lib/utils";

const statusFilters = [
  { value: "all", label: "All", icon: null },
  { value: "reading", label: "Reading/Watching", icon: <BookOpen className="h-4 w-4 mr-2" /> },
  { value: "plan_to_read", label: "Plan to Read/Watch", icon: <BookmarkPlus className="h-4 w-4 mr-2" /> },
  { value: "completed", label: "Completed", icon: <CheckCheck className="h-4 w-4 mr-2" /> },
  { value: "on_hold", label: "On Hold", icon: <PauseCircle className="h-4 w-4 mr-2" /> },
  { value: "dropped", label: "Dropped", icon: <X className="h-4 w-4 mr-2" /> }
];

// Helper function to get readable status label
function getStatusLabel(status: MediaStatus, type: MediaType): string {
  if (status === 'reading') {
    return type === 'anime' ? 'Watching' : 'Reading';
  }
  if (status === 'plan_to_read') {
    return type === 'anime' ? 'Plan to Watch' : 'Plan to Read';
  }
  return status.replace('_', ' ');
}

// Helper function to get status color
function getStatusColor(status: MediaStatus): string {
  const colorMap: Record<MediaStatus, string> = {
    'reading': 'text-green-400',
    'plan_to_read': 'text-purple-400',
    'completed': 'text-blue-400',
    'on_hold': 'text-yellow-400',
    'dropped': 'text-red-400'
  };
  
  return colorMap[status] || 'text-gray-400';
}

// Helper function to get status icon
function getStatusIcon(status: MediaStatus, type: MediaType): JSX.Element {
  if (status === 'reading') {
    return type === 'anime' 
      ? <Play className="h-4 w-4" />
      : <BookOpen className="h-4 w-4" />;
  }
  
  const iconMap: Record<string, JSX.Element> = {
    'plan_to_read': <BookmarkPlus className="h-4 w-4" />,
    'completed': <CheckCheck className="h-4 w-4" />,
    'on_hold': <PauseCircle className="h-4 w-4" />,
    'dropped': <X className="h-4 w-4" />
  };
  
  return iconMap[status] || <BookmarkPlus className="h-4 w-4" />;
}

function LibraryItemCard({ item, onStatusChange }: { 
  item: LibraryItem; 
  onStatusChange: (id: string, status: MediaStatus | null) => void;
}) {
  const mediaRoute = item.type === 'manga' ? '/manga' : '/anime';
  
  // Format date if available
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString();
  };
  
  return (
    <Card className="overflow-hidden border-gray-800 bg-black/40 backdrop-blur-lg hover:bg-gray-900/70 transition-all duration-300">
      <div className="relative aspect-[2/3] overflow-hidden">
        {item.thumbnail ? (
          <Link href={`${mediaRoute}/${item.id}`}>
            <Image
              src={item.thumbnail}
              alt={item.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          </Link>
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-gray-400">No Image</span>
          </div>
        )}
        
        <div className="absolute top-2 right-2">
          <StatusSelector 
            mediaId={item.id}
            mediaType={item.type}
            mediaTitle={item.title}
            mediaThumbnail={item.thumbnail}
            currentStatus={item.status}
            currentProgress={item.progress}
            totalItems={item.totalItems}
            score={item.score}
            onStatusChange={(newStatus) => onStatusChange(item.id, newStatus)}
            compact={true}
          />
        </div>
      </div>
      
      <CardContent className="p-4">
        <Link href={`${mediaRoute}/${item.id}`} className="hover:underline">
          <h3 className="font-bold text-lg truncate" title={item.title}>
            {item.title}
          </h3>
        </Link>
        
        <div className="mt-2 flex items-center gap-1.5">
          <span className={cn("flex items-center", getStatusColor(item.status))}>
            {getStatusIcon(item.status, item.type)}
          </span>
          <span className="text-sm text-gray-400">
            {getStatusLabel(item.status, item.type)}
          </span>
        </div>
        
        {item.progress > 0 && (
          <div className="mt-1 text-sm text-gray-400">
            Progress: {item.progress}{item.totalItems ? `/${item.totalItems}` : ''}
          </div>
        )}
        
        {item.score && (
          <div className="mt-1 text-sm text-yellow-400">
            Score: {item.score}/10
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0 text-xs text-gray-500">
        <div className="w-full flex flex-col gap-1">
          {item.startDate && (
            <div>Started: {formatDate(item.startDate)}</div>
          )}
          {item.finishDate && (
            <div>Finished: {formatDate(item.finishDate)}</div>
          )}
          <div>Updated: {formatDate(item.lastUpdated)}</div>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('type') === 'anime' ? 'anime' : 'manga';
  const initialFilter = searchParams.get('status') || 'all';
  
  const [activeTab, setActiveTab] = useState<'manga' | 'anime'>(initialTab as 'manga' | 'anime');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [mangaItems, setMangaItems] = useState<LibraryItem[]>([]);
  const [animeItems, setAnimeItems] = useState<LibraryItem[]>([]);
  const [mangaStats, setMangaStats] = useState<any>(null);
  const [animeStats, setAnimeStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const activeItems = activeTab === 'manga' ? mangaItems : animeItems;
  const filteredItems = statusFilter === 'all' 
    ? activeItems 
    : activeItems.filter(item => item.status === statusFilter);
  
  // Load library items
  useEffect(() => {
    async function loadLibrary() {
      setIsLoading(true);
      try {
        // Load manga items
        const mangaLibrary = await getLibraryItems('manga');
        setMangaItems(mangaLibrary);
        
        // Load anime items
        const animeLibrary = await getLibraryItems('anime');
        setAnimeItems(animeLibrary);
        
        // Load stats
        const mangaStatsData = await getLibraryStats('manga');
        setMangaStats(mangaStatsData);
        
        const animeStatsData = await getLibraryStats('anime');
        setAnimeStats(animeStatsData);
      } catch (error) {
        console.error("Error loading library:", error);
        toast({
          title: "Error",
          description: "Failed to load your library. Please try refreshing the page.",
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadLibrary();
  }, []);
  
  // Handle sync to server
  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const syncedCount = await syncAllToServer();
      
      if (syncedCount === 0) {
        toast({
          title: "No Changes",
          description: "There were no items to sync to the server.",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error syncing library:", error);
      toast({
        title: "Sync Error",
        description: "Failed to sync library to server. Please try again.",
        duration: 5000,
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Handle status change
  const handleStatusChange = async (id: string, newStatus: MediaStatus | null) => {
    // Update local state immediately for better UX
    const mediaType = activeTab;
    
    if (mediaType === 'manga') {
      setMangaItems(prev => {
        // If newStatus is null, remove item
        if (!newStatus) {
          return prev.filter(item => item.id !== id);
        }
        
        // Otherwise update status
        return prev.map(item => {
          if (item.id === id) {
            return { ...item, status: newStatus };
          }
          return item;
        });
      });
    } else {
      setAnimeItems(prev => {
        // If newStatus is null, remove item
        if (!newStatus) {
          return prev.filter(item => item.id !== id);
        }
        
        // Otherwise update status
        return prev.map(item => {
          if (item.id === id) {
            return { ...item, status: newStatus };
          }
          return item;
        });
      });
    }
    
    // Reload stats
    try {
      const statsData = await getLibraryStats(mediaType);
      if (mediaType === 'manga') {
        setMangaStats(statsData);
      } else {
        setAnimeStats(statsData);
      }
    } catch (error) {
      console.error("Error updating stats:", error);
    }
  };
  
  // Render stats counters
  const renderStats = (stats: any) => {
    if (!stats) return null;
    
    return (
      <div className="flex flex-wrap gap-2 md:gap-4 my-4">
        {statusFilters.map((filter) => {
          if (filter.value === 'all') {
            return (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
                className={statusFilter === filter.value ? "bg-primary" : "bg-black/40 border-white/10"}
              >
                All ({stats.total})
              </Button>
            );
          }
          
          // Map the filter value to the stats property
          let statCount = 0;
          switch (filter.value) {
            case 'reading': statCount = stats.reading; break;
            case 'completed': statCount = stats.completed; break;
            case 'on_hold': statCount = stats.onHold; break;
            case 'dropped': statCount = stats.dropped; break;
            case 'plan_to_read': statCount = stats.planToRead; break;
          }
          
          return (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                statusFilter === filter.value 
                  ? "bg-primary" 
                  : "bg-black/40 border-white/10",
                "flex items-center"
              )}
            >
              {filter.icon}
              <span className="truncate">{filter.label}</span>
              <span className="ml-1.5 text-xs opacity-75">({statCount})</span>
            </Button>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="container max-w-screen-2xl py-6 md:py-10">
      <PageHeader
        title="My Library"
        description="Manage your manga and anime collection"
      >
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSync} 
          disabled={isSyncing}
          className="bg-black/40 border-white/10"
        >
          {isSyncing ? "Syncing..." : "Sync to Server"}
        </Button>
      </PageHeader>
      
      <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as 'manga' | 'anime')} className="mt-6">
        <TabsList className="bg-black/40 border border-white/10 grid w-full md:w-80 grid-cols-2">
          <TabsTrigger value="manga" className="data-[state=active]:bg-primary">
            Manga
          </TabsTrigger>
          <TabsTrigger value="anime" className="data-[state=active]:bg-primary">
            Anime
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="manga" className="mt-4">
          {renderStats(mangaStats)}
          
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[2/3] rounded-md" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold mb-2">No manga found</h3>
              <p className="text-gray-400">
                {statusFilter === 'all' 
                  ? "You haven't added any manga to your library yet." 
                  : `You don't have any manga with ${statusFilter.replace('_', ' ')} status.`}
              </p>
              <Button asChild className="mt-4">
                <Link href="/manga">Browse Manga</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6">
              {filteredItems.map((item) => (
                <LibraryItemCard 
                  key={item.id} 
                  item={item} 
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="anime" className="mt-4">
          {renderStats(animeStats)}
          
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[2/3] rounded-md" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold mb-2">No anime found</h3>
              <p className="text-gray-400">
                {statusFilter === 'all' 
                  ? "You haven't added any anime to your library yet." 
                  : `You don't have any anime with ${statusFilter.replace('_', ' ')} status.`}
              </p>
              <Button asChild className="mt-4">
                <Link href="/anime">Browse Anime</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6">
              {filteredItems.map((item) => (
                <LibraryItemCard 
                  key={item.id} 
                  item={item} 
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 