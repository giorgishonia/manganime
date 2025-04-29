// Helper functions for tracking anime watching progress

// Check if an anime has been watched
export function hasAnimeBeenWatched(animeId) {
  if (typeof window === 'undefined') return false;
  
  try {
    const watchingHistory = JSON.parse(localStorage.getItem('animeWatchingHistory') || '{}');
    return animeId in watchingHistory;
  } catch (error) {
    console.error('Error checking anime watch status:', error);
    return false;
  }
}

// Get anime watching progress
export function getAnimeProgress(animeId) {
  if (typeof window === 'undefined') return null;
  
  try {
    const watchingHistory = JSON.parse(localStorage.getItem('animeWatchingHistory') || '{}');
    return watchingHistory[animeId] || null;
  } catch (error) {
    console.error('Error getting anime progress:', error);
    return null;
  }
}

// Get the latest episode watched for an anime
export function getLatestEpisodeWatched(animeId) {
  if (typeof window === 'undefined') return 0;
  
  try {
    const progress = getAnimeProgress(animeId);
    return progress ? progress.episodeNumber : 0;
  } catch (error) {
    console.error('Error getting latest episode watched:', error);
    return 0;
  }
}

// Calculate watching percentage for an anime based on episodes
export function calculateAnimeProgressByEpisode(currentEpisode, totalEpisodes) {
  if (!currentEpisode || !totalEpisodes) return 0;
  
  // Ensure we have valid numbers
  const current = parseInt(currentEpisode.toString(), 10) || 0;
  const total = parseInt(totalEpisodes.toString(), 10) || 1; // Avoid division by zero
  
  const percentage = Math.min(100, Math.round((current / total) * 100));
  return percentage;
}

// Get watching percentage for a specific episode
export function getWatchPercentage(animeId, episodeId) {
  if (typeof window === 'undefined') return 0;
  
  try {
    const progress = getAnimeProgress(animeId);
    if (!progress) return 0;
    
    // For specific episode watching percentage
    if (progress.episodeId === episodeId && progress.totalTime > 0) {
      return Math.min(100, Math.round((progress.currentTime / progress.totalTime) * 100));
    }
    
    // If we're looking at an episode that's been completed
    if (progress.completedEpisodes && progress.completedEpisodes.includes(episodeId)) {
      return 100;
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting watch percentage:', error);
    return 0;
  }
}

// Get total progress for an anime series
export function getAnimeTotalProgress(animeId) {
  if (typeof window === 'undefined') return 0;
  
  try {
    const progress = getAnimeProgress(animeId);
    if (!progress || !progress.episodeNumber || !progress.totalEpisodes) return 0;
    
    return calculateAnimeProgressByEpisode(progress.episodeNumber, progress.totalEpisodes);
  } catch (error) {
    console.error('Error calculating total anime progress:', error);
    return 0;
  }
}

// Update watching progress
export function updateWatchingProgress(animeId, episodeId, episodeNumber, currentTime, totalTime, episodeTitle = '', totalEpisodes = 0, animeThumbnail = '') {
  if (typeof window === 'undefined') return;
  
  try {
    const watchingHistory = JSON.parse(localStorage.getItem('animeWatchingHistory') || '{}');
    
    // Update this anime's progress
    watchingHistory[animeId] = {
      animeId,
      episodeId,
      episodeNumber,
      episodeTitle,
      currentTime,
      totalTime,
      totalEpisodes,
      completedEpisodes: [...(watchingHistory[animeId]?.completedEpisodes || [])],
      lastWatched: new Date().toISOString(),
      animeThumbnail
    };
    
    // Mark episode as completed if watched over 90%
    if (currentTime / totalTime > 0.9) {
      if (!watchingHistory[animeId].completedEpisodes.includes(episodeId)) {
        watchingHistory[animeId].completedEpisodes.push(episodeId);
      }
    }
    
    localStorage.setItem('animeWatchingHistory', JSON.stringify(watchingHistory));
    
    // Also update recently watched list
    updateRecentlyWatched(animeId, episodeId, episodeNumber, currentTime, totalTime, episodeTitle, animeThumbnail);
    
  } catch (error) {
    console.error('Error updating watching progress:', error);
  }
}

// Update recently watched anime list
function updateRecentlyWatched(animeId, episodeId, episodeNumber, currentTime, totalTime, episodeTitle, animeThumbnail) {
  try {
    const recentlyWatched = JSON.parse(localStorage.getItem('recentlyWatchedAnime') || '[]');
    
    // Remove this anime if it already exists in the list
    const filtered = recentlyWatched.filter(item => item.animeId !== animeId);
    
    // Add to the beginning of the list
    filtered.unshift({
      animeId,
      episodeId,
      episodeNumber,
      episodeTitle,
      currentTime,
      totalTime,
      lastWatched: new Date().toISOString(),
      animeThumbnail
    });
    
    // Limit to 20 most recent items
    localStorage.setItem('recentlyWatchedAnime', JSON.stringify(filtered.slice(0, 20)));
  } catch (error) {
    console.error('Error updating recently watched:', error);
  }
}

// Get recently watched anime
export function getRecentlyWatched(limit = 10) {
  if (typeof window === 'undefined') return [];
  
  try {
    const recentlyWatched = JSON.parse(localStorage.getItem('recentlyWatchedAnime') || '[]');
    return recentlyWatched.slice(0, limit);
  } catch (error) {
    console.error('Error getting recently watched:', error);
    return [];
  }
} 