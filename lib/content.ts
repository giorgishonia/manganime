import { supabase } from './supabase'
import { Content, Episode, Chapter } from './supabase'

// Get all content (anime or manga)
export async function getAllContent(type: 'anime' | 'manga', limit = 20, page = 0) {
  try {
    const { data, error, count } = await supabase
      .from('content')
      .select('*', { count: 'exact' })
      .eq('type', type)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)

    if (error) {
      throw error
    }

    return { 
      success: true, 
      content: data, 
      totalCount: count,
      currentPage: page,
      totalPages: count ? Math.ceil(count / limit) : 0
    }
  } catch (error) {
    console.error(`Get ${type} error:`, error)
    return { success: false, error }
  }
}

// Get content by ID
export async function getContentById(id: string) {
  try {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw error
    }

    return { success: true, content: data }
  } catch (error) {
    console.error('Get content error:', error)
    return { success: false, error }
  }
}

// Get content by genre
export async function getContentByGenre(genre: string, type?: 'anime' | 'manga', limit = 20) {
  try {
    let query = supabase
      .from('content')
      .select('*')
      .contains('genres', [genre])
      .order('rating', { ascending: false })
      .limit(limit)
    
    if (type) {
      query = query.eq('type', type)
    }
    
    const { data, error } = await query

    if (error) {
      throw error
    }

    return { success: true, content: data }
  } catch (error) {
    console.error('Get content by genre error:', error)
    return { success: false, error }
  }
}

// Get trending content
export async function getTrendingContent(type?: 'anime' | 'manga', limit = 10) {
  try {
    let query = supabase
      .from('content')
      .select('*')
      .order('rating', { ascending: false })
      .limit(limit)
    
    if (type) {
      query = query.eq('type', type)
    }
    
    const { data, error } = await query

    if (error) {
      throw error
    }

    return { success: true, content: data }
  } catch (error) {
    console.error('Get trending content error:', error)
    return { success: false, error }
  }
}

// Create new content (admin only)
export async function createContent(contentData: Omit<Content, 'id' | 'created_at' | 'updated_at'>) {
  try {
    // Create a minimal payload with only the essential fields we're certain exist
    const payload = {
      title: contentData.title,
      description: contentData.description || '',
      type: contentData.type,
      status: contentData.status,
      thumbnail: contentData.thumbnail,
      genres: Array.isArray(contentData.genres) ? contentData.genres : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Sending minimal content payload:', payload);
    
    const { data, error } = await supabase
      .from('content')
      .insert(payload)
      .select();

    if (error) {
      console.error('Error inserting content:', error);
      throw error;
    }

    return { success: true, content: data };
  } catch (error) {
    console.error('Create content error:', error);
    return { success: false, error };
  }
}

// Update content (admin only)
export async function updateContent(id: string, contentData: Partial<Content>) {
  try {
    // Extract all camelCase properties and convert them to snake_case
    const {
      alternativeTitles,
      bannerImage,
      releaseYear,
      anilistId,
      malId,
      ...restData
    } = contentData as any;
    
    // Prepare the data with snake_case column names
    const dataToUpdate = {
      ...restData,
      updated_at: new Date().toISOString()
    };
    
    // Add converted fields if they exist
    if (alternativeTitles !== undefined) {
      dataToUpdate.alternative_titles = alternativeTitles;
    }
    if (bannerImage !== undefined) {
      dataToUpdate.banner_image = bannerImage;
    }
    if (releaseYear !== undefined) {
      dataToUpdate.release_year = releaseYear;
    }
    if (anilistId !== undefined) {
      dataToUpdate.anilist_id = anilistId;
    }
    if (malId !== undefined) {
      dataToUpdate.mal_id = malId;
    }

    const { data, error } = await supabase
      .from('content')
      .update(dataToUpdate)
      .eq('id', id)
      .select()

    if (error) {
      throw error
    }

    return { success: true, content: data }
  } catch (error) {
    console.error('Update content error:', error)
    return { success: false, error }
  }
}

// Delete content (admin only)
export async function deleteContent(id: string) {
  try {
    const { error } = await supabase
      .from('content')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Delete content error:', error)
    return { success: false, error }
  }
}

// Get episodes for anime
export async function getEpisodes(contentId: string) {
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('content_id', contentId)
      .order('number', { ascending: true })

    if (error) {
      throw error
    }

    return { success: true, episodes: data }
  } catch (error) {
    console.error('Get episodes error:', error)
    return { success: false, error }
  }
}

// Get episode by number
export async function getEpisodeByNumber(contentId: string, episodeNumber: number) {
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('content_id', contentId)
      .eq('number', episodeNumber)
      .single()

    if (error) {
      throw error
    }

    return { success: true, episode: data }
  } catch (error) {
    console.error('Get episode error:', error)
    return { success: false, error }
  }
}

// Add episode (admin only)
export async function addEpisode(episodeData: Omit<Episode, 'id' | 'created_at'>) {
  try {
    const { data, error } = await supabase
      .from('episodes')
      .insert({
        ...episodeData,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      throw error
    }

    return { success: true, episode: data }
  } catch (error) {
    console.error('Add episode error:', error)
    return { success: false, error }
  }
}

// Get chapters for manga
export async function getChapters(contentId: string) {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('content_id', contentId)
      .order('number', { ascending: true })

    if (error) {
      throw error
    }

    return { success: true, chapters: data }
  } catch (error) {
    console.error('Get chapters error:', error)
    return { success: false, error }
  }
}

// Get chapter by number
export async function getChapterByNumber(contentId: string, chapterNumber: number) {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('content_id', contentId)
      .eq('number', chapterNumber)
      .single()

    if (error) {
      throw error
    }

    return { success: true, chapter: data }
  } catch (error) {
    console.error('Get chapter error:', error)
    return { success: false, error }
  }
}

// Add chapter (admin only)
export async function addChapter(chapterData: Omit<Chapter, 'id' | 'created_at'>) {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert({
        ...chapterData,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      throw error
    }

    return { success: true, chapter: data }
  } catch (error) {
    console.error('Add chapter error:', error)
    return { success: false, error }
  }
}

// Search content
export async function searchContent(query: string, type?: 'anime' | 'manga', limit = 20) {
  try {
    let supabaseQuery = supabase
      .from('content')
      .select('*')
      .or(`title.ilike.%${query}%, description.ilike.%${query}%`)
      .limit(limit)
    
    if (type) {
      supabaseQuery = supabaseQuery.eq('type', type)
    }
    
    const { data, error } = await supabaseQuery

    if (error) {
      throw error
    }

    return { success: true, content: data }
  } catch (error) {
    console.error('Search content error:', error)
    return { success: false, error }
  }
} 