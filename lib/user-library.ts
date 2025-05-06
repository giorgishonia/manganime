// Types for user library management
import { supabase } from './supabase';
import { toast } from '@/components/ui/use-toast';

// Define the type for media status
export type MediaStatus = 'reading' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_read' |
                         'watching' | 'plan_to_watch' | null;

// Define the type for media type - ADD 'comics'
export type MediaType = 'anime' | 'manga' | 'comics';

export interface LibraryItem {
  id: string;
  type: MediaType;
  title: string;
  thumbnail: string;
  status: MediaStatus;
  progress: number; // Chapter or episode number
  totalItems?: number; // Total chapters or episodes
  score?: number; // User rating (1-10)
  startDate?: number; // Timestamp
  finishDate?: number; // Timestamp
  lastUpdated: number; // Timestamp
}

// LocalStorage keys (used as fallback when offline or not logged in)
const USER_LIBRARY_KEY = 'manganime-user-library';

// Get current user ID
function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try to get from Supabase
  const user = supabase.auth.getUser();
  return user ? user.data?.user?.id || null : null;
}

// Get all items in user's library (combines Supabase and localStorage)
export async function getUserLibrary(): Promise<LibraryItem[]> {
  const userId = getCurrentUserId();

  // If not logged in or running on server side, use localStorage only
  if (!userId || typeof window === 'undefined') {
    return getLocalLibrary();
  }
  
  try {
    // Get data from Supabase
    const { data, error } = await supabase
      .from('watchlist')
      .select('*, content(*)')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Failed to get watchlist from Supabase:', error);
      return getLocalLibrary(); // Fallback to localStorage if Supabase fails
    }
    
    // Convert Supabase watchlist format to LibraryItem format
    const libraryItems: LibraryItem[] = data.map(item => ({
      id: item.content_id,
      type: item.content_type as MediaType,
      title: item.content?.title || 'Unknown',
      thumbnail: item.content?.thumbnail || '',
      status: mapStatusFromServer(item.status),
      progress: item.progress || 0,
      totalItems: item.content_type === 'manga' 
        ? item.content?.chapters_count 
        : item.content?.episodes_count,
      score: item.rating,
      startDate: item.started_at ? new Date(item.started_at).getTime() : undefined,
      finishDate: item.finished_at ? new Date(item.finished_at).getTime() : undefined,
      lastUpdated: item.updated_at ? new Date(item.updated_at).getTime() : Date.now()
    }));
    
    // Get local items too and merge them (for items not yet synced)
    const localItems = getLocalLibrary();
    const serverIds = new Set(libraryItems.map(item => `${item.id}-${item.type}`));
    
    // Add local items that aren't on the server yet
    const unsyncdLocalItems = localItems.filter(
      item => !serverIds.has(`${item.id}-${item.type}`)
    );
    
    if (unsyncdLocalItems.length > 0) {
      console.log(`Found ${unsyncdLocalItems.length} items in localStorage that need syncing to server`);
      // Sync these items to server
      for (const item of unsyncdLocalItems) {
        syncItemToServer(item);
      }
      
      // Include these items in the result
      libraryItems.push(...unsyncdLocalItems);
    }
    
    return libraryItems;
  } catch (error) {
    console.error('Error fetching user library:', error);
    return getLocalLibrary(); // Fallback to localStorage
  }
}

// Helper function to get library from localStorage
function getLocalLibrary(): LibraryItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const library = localStorage.getItem(USER_LIBRARY_KEY);
    return library ? JSON.parse(library) : [];
  } catch (error) {
    console.error('Failed to get user library from localStorage:', error);
    return [];
  }
}

// Helper function to map status from server format to client format
function mapStatusFromServer(serverStatus: string): MediaStatus {
  const statusMap: Record<string, MediaStatus> = {
    'watching': 'watching',
    'completed': 'completed',
    'on_hold': 'on_hold',
    'dropped': 'dropped',
    'plan_to_watch': 'plan_to_watch',
    'reading': 'reading',
    'plan_to_read': 'plan_to_read'
  };
  
  return statusMap[serverStatus] || 'plan_to_read';
}

// Helper function to map status from client format to server format
function mapStatusToServer(status: MediaStatus, type: MediaType): string {
  if (type === 'anime') {
    // Use anime-specific terms
    const animeStatusMap: Record<MediaStatus, string> = {
      'reading': 'watching', // 'reading' in code maps to 'watching' for anime
      'completed': 'completed',
      'on_hold': 'on_hold',
      'dropped': 'dropped',
      'plan_to_read': 'plan_to_watch' // 'plan_to_read' in code maps to 'plan_to_watch' for anime
    };
    return animeStatusMap[status];
  } else {
    // Use manga-specific terms
    const mangaStatusMap: Record<MediaStatus, string> = {
      'reading': 'reading',
      'completed': 'completed',
      'on_hold': 'on_hold',
      'dropped': 'dropped',
      'plan_to_read': 'plan_to_read'
    };
    return mangaStatusMap[status];
  }
}

// Helper function to sync an item from localStorage to server
async function syncItemToServer(item: LibraryItem): Promise<boolean> {
  const userId = getCurrentUserId();
  if (!userId) return false;
  
  try {
    // Handle statuses
    const { error } = await supabase
      .from('watchlist')
      .upsert({
        user_id: userId,
        content_id: item.id,
        content_type: item.type,
        status: mapStatusToServer(item.status, item.type),
        progress: item.progress,
        rating: item.score,
        started_at: item.startDate ? new Date(item.startDate).toISOString() : null,
        finished_at: item.finishDate ? new Date(item.finishDate).toISOString() : null,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to sync library item to server:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error syncing item to server:', error);
    return false;
  }
}

// Get items filtered by type and/or status
export async function getLibraryItems(type?: MediaType, status?: MediaStatus): Promise<LibraryItem[]> {
  const library = await getUserLibrary();
  
  return library.filter(item => {
    if (type && item.type !== type) return false;
    if (status && item.status !== status) return false;
    return true;
  });
}

// Get a specific item from library
export async function getLibraryItem(id: string, type: MediaType): Promise<LibraryItem | undefined> {
  // First check faster localStorage
  const localItem = getLocalLibrary().find(item => item.id === id && item.type === type);
  if (localItem) return localItem;
  
  // If not found locally, check server
  const items = await getUserLibrary();
  return items.find(item => item.id === id && item.type === type);
}

// Synchronous version that only checks localStorage (for immediate UI feedback)
export function getLibraryItemSync(id: string, type: MediaType): LibraryItem | undefined {
  return getLocalLibrary().find(item => item.id === id && item.type === type);
}

// Check if an item exists in library
export async function isInLibrary(id: string, type: MediaType): Promise<boolean> {
  // First check faster localStorage
  const inLocalLibrary = getLocalLibrary().some(item => item.id === id && item.type === type);
  if (inLocalLibrary) return true;
  
  // If not found locally, check server
  const items = await getUserLibrary();
  return items.some(item => item.id === id && item.type === type);
}

// Synchronous version that only checks localStorage (for immediate UI feedback)
export function isInLibrarySync(id: string, type: MediaType): boolean {
  return getLocalLibrary().some(item => item.id === id && item.type === type);
}

// Check if an item has a specific status
export async function hasStatus(id: string, type: MediaType, status: MediaStatus): Promise<boolean> {
  const item = await getLibraryItem(id, type);
  return item ? item.status === status : false;
}

// Synchronous version that only checks localStorage (for immediate UI feedback)
export function hasStatusSync(id: string, type: MediaType, status: MediaStatus): boolean {
  const item = getLibraryItemSync(id, type);
  return item ? item.status === status : false;
}

// Add or update item in library
export async function updateLibraryItem(item: LibraryItem): Promise<void> {
  // Update localStorage first for immediate feedback
  updateLocalLibraryItem(item);
  
  // Then update server if user is logged in
  const userId = getCurrentUserId();
  if (!userId) return;
  
  try {
    await syncItemToServer(item);
  } catch (error) {
    console.error('Failed to update server library item:', error);
    toast({
      title: "Sync Error",
      description: "Failed to sync with server. Changes saved locally.",
      duration: 3000,
    });
  }
}

// Helper function to update item in localStorage
function updateLocalLibraryItem(item: LibraryItem): void {
  if (typeof window === 'undefined') return;
  
  try {
    const library = getLocalLibrary();
    const existingIndex = library.findIndex(
      existing => existing.id === item.id && existing.type === item.type
    );
    
    // Update lastUpdated timestamp
    const updatedItem = {
      ...item,
      lastUpdated: Date.now()
    };
    
    let updatedLibrary;
    if (existingIndex >= 0) {
      // Update existing item
      updatedLibrary = [
        ...library.slice(0, existingIndex),
        updatedItem,
        ...library.slice(existingIndex + 1)
      ];
    } else {
      // Add new item to beginning
      updatedLibrary = [updatedItem, ...library];
    }
    
    localStorage.setItem(USER_LIBRARY_KEY, JSON.stringify(updatedLibrary));
  } catch (error) {
    console.error('Failed to update local library item:', error);
  }
}

// Remove item from library
export async function removeFromLibrary(id: string, type: MediaType): Promise<void> {
  // Update localStorage first for immediate feedback
  removeFromLocalLibrary(id, type);
  
  // Then update server if user is logged in
  const userId = getCurrentUserId();
  if (!userId) return;
  
  try {
    // Remove from watchlist
    const { error: watchlistError } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('content_id', id)
      .eq('content_type', type);
      
    if (watchlistError) {
      console.error('Failed to remove watchlist item from server:', watchlistError);
      toast({
        title: "Sync Error",
        description: "Failed to remove from server. Removed locally.",
        duration: 3000,
      });
    }
  } catch (error) {
    console.error('Failed to remove library item from server:', error);
  }
}

// Helper function to remove from localStorage
function removeFromLocalLibrary(id: string, type: MediaType): void {
  if (typeof window === 'undefined') return;
  
  try {
    const library = getLocalLibrary();
    const updatedLibrary = library.filter(
      item => !(item.id === id && item.type === type)
    );
    
    localStorage.setItem(USER_LIBRARY_KEY, JSON.stringify(updatedLibrary));
  } catch (error) {
    console.error('Failed to remove library item from localStorage:', error);
  }
}

// Update item status
export async function updateItemStatus(
  id: string, 
  type: MediaType, 
  status: MediaStatus, 
  title: string, 
  thumbnail: string,
  progress: number = 0,
  totalItems?: number,
  score?: number
): Promise<void> {
  const existingItem = await getLibraryItem(id, type);
  
  await updateLibraryItem({
    id,
    type,
    title,
    thumbnail,
    status,
    progress: existingItem?.progress || progress,
    totalItems: totalItems || existingItem?.totalItems,
    score: score || existingItem?.score,
    startDate: existingItem?.startDate || (status === 'reading' ? Date.now() : undefined),
    finishDate: existingItem?.finishDate || (status === 'completed' ? Date.now() : undefined),
    lastUpdated: Date.now()
  });
}

// Get library statistics
export async function getLibraryStats(type: MediaType): Promise<{
  total: number;
  reading: number;
  completed: number;
  onHold: number;
  dropped: number;
  planToRead: number;
}> {
  const library = await getLibraryItems(type);
  
  return {
    total: library.length,
    reading: library.filter(item => item.status === 'reading').length,
    completed: library.filter(item => item.status === 'completed').length,
    onHold: library.filter(item => item.status === 'on_hold').length,
    dropped: library.filter(item => item.status === 'dropped').length,
    planToRead: library.filter(item => item.status === 'plan_to_read').length
  };
}

// Update progress for an item
export async function updateProgress(id: string, type: MediaType, progress: number): Promise<void> {
  const item = await getLibraryItem(id, type);
  
  if (item) {
    await updateLibraryItem({
      ...item,
      progress,
      // If progress is set to total items, mark as completed
      status: progress > 0 && item.totalItems && progress >= item.totalItems 
        ? 'completed' 
        : (item.status === 'plan_to_read' ? 'reading' : item.status)
    });
  }
}

// Update score for an item
export async function updateScore(id: string, type: MediaType, score: number): Promise<void> {
  const item = await getLibraryItem(id, type);
  
  if (item) {
    await updateLibraryItem({
      ...item,
      score
    });
  }
}

// Sync all localStorage items to server
export async function syncAllToServer(): Promise<number> {
  const userId = getCurrentUserId();
  if (!userId) return 0;
  
  const localItems = getLocalLibrary();
  if (localItems.length === 0) return 0;
  
  let syncedCount = 0;
  
  for (const item of localItems) {
    const success = await syncItemToServer(item);
    if (success) syncedCount++;
  }
  
  console.log(`Synced ${syncedCount} of ${localItems.length} items to server`);
  
  if (syncedCount > 0) {
    toast({
      title: "Sync Complete",
      description: `Synced ${syncedCount} items to your account`,
      duration: 3000,
    });
  }
  
  return syncedCount;
} 