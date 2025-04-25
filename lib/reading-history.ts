// Define types for reading history
export interface ReadingProgress {
  mangaId: string
  chapterId: string
  chapterNumber: number
  chapterTitle: string
  currentPage: number
  totalPages: number
  lastRead: number // timestamp
  mangaTitle: string
  mangaThumbnail: string
}

// Define types for the total manga pages information
export interface MangaTotalPages {
  id: string;
  totalPages: number;
}

// Key for localStorage
const READING_HISTORY_KEY = "manganime-reading-history";

// Get all reading history
export function getReadingHistory(): ReadingProgress[] {
  if (typeof window === "undefined") return [];
  
  try {
    const history = localStorage.getItem(READING_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error("Failed to get reading history:", error);
    return [];
  }
}

// Get reading progress for a specific manga
export function getMangaProgress(mangaId: string): ReadingProgress | undefined {
  return getReadingHistory().find(item => item.mangaId === mangaId);
}

// Get reading progress for a specific chapter
export function getChapterProgress(mangaId: string, chapterId: string): ReadingProgress | undefined {
  return getReadingHistory().find(
    item => item.mangaId === mangaId && item.chapterId === chapterId
  );
}

// Update reading progress
export function updateReadingProgress(progress: ReadingProgress): void {
  if (typeof window === "undefined") return;
  
  try {
    const history = getReadingHistory();
    
    // Find and remove existing entry for this manga
    const filteredHistory = history.filter(item => item.mangaId !== progress.mangaId);
    
    // Add the new progress to the beginning (most recent)
    const updatedHistory = [progress, ...filteredHistory];
    
    // Keep only the 50 most recent entries
    const limitedHistory = updatedHistory.slice(0, 50);
    
    // Save to localStorage
    localStorage.setItem(READING_HISTORY_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error("Failed to update reading history:", error);
  }
}

// Check if a manga has been read
export function hasMangaBeenRead(mangaId: string): boolean {
  return getReadingHistory().some(item => item.mangaId === mangaId);
}

// Get percentage read for a manga chapter
export function getReadPercentage(mangaId: string, chapterId: string): number {
  const progress = getChapterProgress(mangaId, chapterId);
  if (!progress) return 0;
  
  return Math.round((progress.currentPage / Math.max(1, progress.totalPages)) * 100);
}

// Get recently read manga
export function getRecentlyRead(limit: number = 10): ReadingProgress[] {
  return getReadingHistory().slice(0, limit);
}

// Clear reading history
export function clearReadingHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(READING_HISTORY_KEY);
}

// Mark a manga chapter as read
export function markChapterAsRead(
  mangaId: string,
  chapterId: string,
  chapterNumber: number,
  chapterTitle: string,
  mangaTitle: string,
  mangaThumbnail: string,
  totalPages: number
): void {
  const progress: ReadingProgress = {
    mangaId,
    chapterId,
    chapterNumber,
    chapterTitle,
    currentPage: totalPages, // Mark as fully read
    totalPages,
    lastRead: Date.now(),
    mangaTitle,
    mangaThumbnail
  };
  
  updateReadingProgress(progress);
}

// Get total manga progress - returns percentage of entire manga read
export function getMangaTotalProgress(mangaId: string, chapterList: any[]): number {
  if (!mangaId || !chapterList || chapterList.length === 0) return 0;
  
  try {
    // Calculate total pages in the manga
    const totalMangaPages = chapterList.reduce((sum, chapter) => {
      // Get the number of pages in this chapter
      const pageCount = Array.isArray(chapter.pages) ? chapter.pages.length : 0;
      return sum + pageCount;
    }, 0);
    
    if (totalMangaPages === 0) return 0;
    
    // Get all reading history
    const history = getReadingHistory();
    
    // Filter to only this manga's entries
    const mangaEntries = history.filter(item => item.mangaId === mangaId);
    
    if (mangaEntries.length === 0) return 0;
    
    // Find the furthest read chapter
    const latestEntry = mangaEntries.reduce((latest, entry) => {
      if (!latest) return entry;
      
      // Compare chapter numbers
      if (entry.chapterNumber > latest.chapterNumber) return entry;
      if (entry.chapterNumber < latest.chapterNumber) return latest;
      
      // If same chapter, compare page progress
      return entry.currentPage > latest.currentPage ? entry : latest;
    }, null);
    
    if (!latestEntry) return 0;
    
    // Count pages in all chapters up to the current chapter
    let readPages = 0;
    
    for (let i = 0; i < chapterList.length; i++) {
      const chapter = chapterList[i];
      const chapterNumber = chapter.number;
      const chapterPages = Array.isArray(chapter.pages) ? chapter.pages.length : 0;
      
      if (chapterNumber < latestEntry.chapterNumber) {
        // Add all pages from fully read chapters
        readPages += chapterPages;
      } else if (chapterNumber === latestEntry.chapterNumber) {
        // Add only read pages from current chapter
        readPages += Math.min(latestEntry.currentPage, chapterPages);
        break;
      } else {
        // Stop counting once we reach chapters beyond the current one
        break;
      }
    }
    
    // Calculate and return percentage
    return Math.round((readPages / totalMangaPages) * 100);
  } catch (error) {
    console.error("Error calculating total manga progress:", error);
    return 0;
  }
}

// Calculate manga progress based on chapter numbers (when we don't have all pages info)
export function calculateMangaProgressByChapter(
  readChapter: number,
  totalChapters: number
): number {
  if (!readChapter || !totalChapters || totalChapters <= 0) return 0;
  
  // Calculate percentage of chapters read
  const percentage = Math.floor((readChapter / totalChapters) * 100);
  
  // Ensure percentage is between 0 and 100
  return Math.max(0, Math.min(100, percentage));
}

// Get manga chapter progress - returns the latest chapter read
export function getLatestChapterRead(mangaId: string): number {
  if (typeof window === "undefined" || !mangaId) return 0;
  
  try {
    const history = getReadingHistory();
    
    // Find all entries for this manga
    const mangaEntries = history.filter(item => item.mangaId === mangaId);
    
    if (mangaEntries.length === 0) return 0;
    
    // Find the highest chapter number
    const latestChapter = mangaEntries.reduce((highest, entry) => {
      return Math.max(highest, entry.chapterNumber);
    }, 0);
    
    return latestChapter;
  } catch (error) {
    console.error("Failed to get latest chapter read:", error);
    return 0;
  }
} 