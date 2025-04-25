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

    // Process the data to extract character information from alternative_titles
    if (data && data.alternative_titles && Array.isArray(data.alternative_titles)) {
      // Extract character data from alternative_titles
      const characterEntries = data.alternative_titles.filter((title: string) => 
        typeof title === 'string' && title.startsWith('character:')
      );
      
      if (characterEntries.length > 0) {
        console.log(`Found ${characterEntries.length} characters in content data`);
        
        try {
          const characters = characterEntries.map((entry: string) => {
            // Extract the JSON part after "character:"
            const jsonStr = entry.substring(10); // 'character:'.length = 10
            return JSON.parse(jsonStr);
          });
          
          // Add characters array to the content data
          data.characters = characters;
          console.log(`Successfully extracted ${characters.length} characters`);
        } catch (err) {
          console.error('Error extracting characters from alternative_titles:', err);
          data.characters = []; // Set empty array on error
        }
      } else {
        data.characters = []; // Set empty array if no characters found
      }
      
      // Extract release date information
      const releaseYearEntry = data.alternative_titles.find((title: string) => 
        typeof title === 'string' && title.startsWith('release_year:')
      );
      
      if (releaseYearEntry) {
        // Extract the year part after "release_year:"
        const year = parseInt(releaseYearEntry.substring(13), 10); // 'release_year:'.length = 13
        if (!isNaN(year)) {
          data.release_year = year;
          console.log(`Extracted release year: ${year}`);
        }
      }
      
      // Extract release month if present
      const releaseMonthEntry = data.alternative_titles.find((title: string) => 
        typeof title === 'string' && title.startsWith('release_month:')
      );
      
      if (releaseMonthEntry) {
        // Extract the month part after "release_month:"
        const month = parseInt(releaseMonthEntry.substring(14), 10); // 'release_month:'.length = 14
        if (!isNaN(month) && month >= 1 && month <= 12) {
          data.release_month = month;
          console.log(`Extracted release month: ${month}`);
        }
      }
      
      // Extract release day if present
      const releaseDayEntry = data.alternative_titles.find((title: string) => 
        typeof title === 'string' && title.startsWith('release_day:')
      );
      
      if (releaseDayEntry) {
        // Extract the day part after "release_day:"
        const day = parseInt(releaseDayEntry.substring(12), 10); // 'release_day:'.length = 12
        if (!isNaN(day) && day >= 1 && day <= 31) {
          data.release_day = day;
          console.log(`Extracted release day: ${day}`);
        }
      }
      
      // Extract georgian title if present
      const georgianTitleEntry = data.alternative_titles.find((title: string) => 
        typeof title === 'string' && title.startsWith('georgian:')
      );
      
      if (georgianTitleEntry) {
        data.georgian_title = georgianTitleEntry.substring(9); // 'georgian:'.length = 9
      }
    } else {
      data.characters = []; // Set empty array if no alternative_titles
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
export async function createContent(contentData: any) {
  console.log("Creating content with data:", contentData);
  
  try {
    // Prepare database data object - we'll handle special fields that don't directly map to DB columns
    const alternative_titles = Array.isArray(contentData.alternative_titles) 
      ? [...contentData.alternative_titles] 
      : [];
    
    // Add georgian title to alternative_titles if provided
    if (contentData.georgian_title) {
      alternative_titles.push(`georgian:${contentData.georgian_title}`);
      console.log("Georgian title added to alternative_titles");
    }
    
    // Process characters and add them to alternative_titles
    if (contentData.characters && Array.isArray(contentData.characters) && contentData.characters.length > 0) {
      console.log(`Processing ${contentData.characters.length} characters for storage`);
      
      contentData.characters.forEach((character: any, index: number) => {
        // Ensure character has all required fields
        if (!character.name || !character.image) {
          console.warn(`Skipping character at index ${index} due to missing required fields`);
          return;
        }
        
        const characterData = JSON.stringify({
          id: character.id || `char-${Math.random().toString(36).substring(2, 9)}`,
          name: character.name,
          image: character.image,
          role: character.role || 'SUPPORTING',
          age: character.age,
          gender: character.gender
        });
        
        alternative_titles.push(`character:${characterData}`);
      });
      
      console.log(`Successfully added ${contentData.characters.length} characters to alternative_titles`);
    } else {
      console.log("No character data provided");
    }
    
    // Store release date information in alternative_titles if provided
    if (contentData.release_year) {
      // Make sure it's a number
      const year = parseInt(contentData.release_year.toString(), 10);
      if (!isNaN(year)) {
        // Store in a special format
        alternative_titles.push(`release_year:${year}`);
        console.log(`Added release year ${year} to alternative_titles`);
      }
    }
    
    // Handle release month if provided
    if (contentData.release_month) {
      const month = parseInt(contentData.release_month.toString(), 10);
      if (!isNaN(month) && month >= 1 && month <= 12) {
        alternative_titles.push(`release_month:${month}`);
      }
    }
    
    // Handle release day if provided
    if (contentData.release_day) {
      const day = parseInt(contentData.release_day.toString(), 10);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        alternative_titles.push(`release_day:${day}`);
      }
    }
    
    // Prepare final database content object
    const dbContent = {
      title: contentData.title,
      description: contentData.description || "",
      type: contentData.type || 'anime',
      status: contentData.status || 'ongoing',
      thumbnail: contentData.thumbnail,
      genres: contentData.genres || [],
      alternative_titles: alternative_titles,
      rating: contentData.rating,
      season: contentData.season,
      anilist_id: contentData.anilist_id,
      mal_id: contentData.mal_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Log the prepared data
    console.log("Prepared database data:", dbContent);
    
    // Insert into database
    const { data, error } = await supabase
      .from('content')
      .insert(dbContent)
      .select()
      .single();

    if (error) {
      console.error("Error creating content:", error);
      return { success: false, error: error.message };
    }

    console.log("Content created successfully:", data);
    return { success: true, content: data };
  } catch (error) {
    console.error("Unexpected error creating content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Update content (admin only)
export async function updateContent(id: string, contentData: any) {
  console.log(`Updating content ${id} with data:`, contentData);
  
  try {
    // First, get the existing content to handle alternative_titles properly
    const { data: existingContent, error: fetchError } = await supabase
      .from('content')
      .select('alternative_titles')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error("Error fetching existing content:", fetchError);
      return { success: false, error: fetchError.message };
    }
    
    // Process alternative_titles to separate characters, release date, and other special entries
    const existingAltTitles = existingContent?.alternative_titles || [];
    const nonSpecialEntries = existingAltTitles.filter((title: string) => 
      !title.startsWith('character:') && 
      !title.startsWith('georgian:') && 
      !title.startsWith('release_year:') &&
      !title.startsWith('release_month:') &&
      !title.startsWith('release_day:')
    );
    
    // Start with basic alternative_titles
    const updatedAltTitles = [...nonSpecialEntries];
    
    // Add georgian title if provided
    if (contentData.georgian_title) {
      updatedAltTitles.push(`georgian:${contentData.georgian_title}`);
      console.log("Updated georgian title in alternative_titles");
    } else {
      // Try to preserve existing georgian title if any
      const existingGeorgianTitle = existingAltTitles.find((title: string) => 
        title.startsWith('georgian:')
      );
      if (existingGeorgianTitle) {
        updatedAltTitles.push(existingGeorgianTitle);
      }
    }
    
    // Process release date fields
    if (contentData.release_year !== undefined) {
      if (contentData.release_year) {
        const year = parseInt(contentData.release_year.toString(), 10);
        if (!isNaN(year)) {
          updatedAltTitles.push(`release_year:${year}`);
          console.log(`Updated release year to ${year}`);
        }
      }
    } else {
      // Preserve existing release year
      const existingReleaseYear = existingAltTitles.find((title: string) => 
        title.startsWith('release_year:')
      );
      if (existingReleaseYear) {
        updatedAltTitles.push(existingReleaseYear);
      }
    }
    
    // Handle release month
    if (contentData.release_month !== undefined) {
      if (contentData.release_month) {
        const month = parseInt(contentData.release_month.toString(), 10);
        if (!isNaN(month) && month >= 1 && month <= 12) {
          updatedAltTitles.push(`release_month:${month}`);
        }
      }
    } else {
      // Preserve existing release month
      const existingReleaseMonth = existingAltTitles.find((title: string) => 
        title.startsWith('release_month:')
      );
      if (existingReleaseMonth) {
        updatedAltTitles.push(existingReleaseMonth);
      }
    }
    
    // Handle release day
    if (contentData.release_day !== undefined) {
      if (contentData.release_day) {
        const day = parseInt(contentData.release_day.toString(), 10);
        if (!isNaN(day) && day >= 1 && day <= 31) {
          updatedAltTitles.push(`release_day:${day}`);
        }
      }
    } else {
      // Preserve existing release day
      const existingReleaseDay = existingAltTitles.find((title: string) => 
        title.startsWith('release_day:')
      );
      if (existingReleaseDay) {
        updatedAltTitles.push(existingReleaseDay);
      }
    }
    
    // Process characters and add them to alternative_titles
    if (contentData.characters && Array.isArray(contentData.characters)) {
      console.log(`Processing ${contentData.characters.length} characters for update`);
      
      contentData.characters.forEach((character: any, index: number) => {
        // Ensure character has all required fields
        if (!character.name || !character.image) {
          console.warn(`Skipping character at index ${index} due to missing required fields`);
          return;
        }
        
        const characterData = JSON.stringify({
          id: character.id || `char-${Math.random().toString(36).substring(2, 9)}`,
          name: character.name,
          image: character.image,
          role: character.role || 'SUPPORTING',
          age: character.age,
          gender: character.gender
        });
        
        updatedAltTitles.push(`character:${characterData}`);
      });
      
      console.log(`Successfully added ${contentData.characters.length} characters to alternative_titles`);
    } else if (contentData.characters === undefined) {
      // If characters not provided in update, preserve existing character entries
      const existingCharacters = existingAltTitles.filter((title: string) => 
        title.startsWith('character:')
      );
      updatedAltTitles.push(...existingCharacters);
      console.log(`Preserved ${existingCharacters.length} existing characters`);
    } else {
      // If explicitly set to empty array, clear all characters
      console.log("Clearing all characters as empty array was provided");
    }
    
    // Prepare database update object, only include fields that are provided
    const dbContent: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Only add fields that are actually provided
    if (contentData.title !== undefined) dbContent.title = contentData.title;
    if (contentData.description !== undefined) dbContent.description = contentData.description;
    if (contentData.type !== undefined) dbContent.type = contentData.type;
    if (contentData.status !== undefined) dbContent.status = contentData.status;
    if (contentData.thumbnail !== undefined) dbContent.thumbnail = contentData.thumbnail;
    if (contentData.genres !== undefined) dbContent.genres = contentData.genres;
    if (contentData.rating !== undefined) dbContent.rating = contentData.rating;
    if (contentData.season !== undefined) dbContent.season = contentData.season;
    if (contentData.anilist_id !== undefined) dbContent.anilist_id = contentData.anilist_id;
    if (contentData.mal_id !== undefined) dbContent.mal_id = contentData.mal_id;
    
    // Always update alternative_titles to manage characters
    dbContent.alternative_titles = updatedAltTitles;
    
    // Log the prepared data
    console.log("Prepared update data:", dbContent);
    
    // Update in database
    const { data, error } = await supabase
      .from('content')
      .update(dbContent)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error updating content:", error);
      return { success: false, error: error.message };
    }

    console.log("Content updated successfully:", data);
    return { success: true, content: data };
  } catch (error) {
    console.error("Unexpected error updating content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
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
    // First try with contentId
    let { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('contentId', contentId)
      .order('number', { ascending: true })

    // If no results or error, try with content_id
    if ((error || !data || data.length === 0)) {
      const fallbackResult = await supabase
        .from('chapters')
        .select('*')
        .eq('content_id', contentId)
        .order('number', { ascending: true })
      
      if (!fallbackResult.error && fallbackResult.data && fallbackResult.data.length > 0) {
        data = fallbackResult.data
        error = null
      }
    }

    if (error) {
      throw error
    }

    return { success: true, chapters: data || [] }
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