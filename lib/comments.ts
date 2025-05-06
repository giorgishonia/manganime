import { supabase } from './supabase'
import { v5 as uuidv5 } from 'uuid'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// Create a service role client that can bypass RLS
const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { 
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )
  : null

// UUID namespace for converting non-UUID IDs
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341'

// Helper function to ensure UUID format
function ensureUUID(id: string): string {
  // Check if already a valid UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id
  }
  
  // Convert to a deterministic UUID using the namespace
  return uuidv5(id, NAMESPACE)
}

export interface Comment {
  id: string
  user_id: string
  content_id: string
  content_type: 'anime' | 'manga' | 'comics'
  text: string
  media_url?: string
  created_at: string
  updated_at: string
  parent_comment_id?: string | null
  user_profile?: {
    username: string
    avatar_url: string
  }
  like_count?: number;
  user_has_liked?: boolean;
  replies?: Comment[];
}

// Check if the comments table exists and has the right structure
export async function ensureCommentsTable() {
  try {
    // First check if we can access the media_url column
    const { error } = await supabase
      .from('comments')
      .select('media_url')
      .limit(1);
    
    // If there's no error, the table is fine
    if (!error) {
      return { success: true, message: "Comments table exists and has the correct structure" };
    }
    
    // If there's a specific error about the media_url column not existing,
    // redirect to the fix endpoint
    if (error.message.includes("Could not find the 'media_url' column")) {
      console.warn("Comments table is missing media_url column, attempting to fix...");
      
      // Try to fix it through the API endpoint
      const response = await fetch('/api/setup/fix-comments-table');
      const data = await response.json();
      
      return data;
    }
    
    // For other errors, just report them
    return { success: false, error: error.message };
  } catch (err) {
    console.error("Error checking comments table:", err);
    return { success: false, error: err.message || String(err) };
  }
}

// Fetch comments for a specific content
export async function getCommentsByContentId(
  contentId: string,
  contentType: 'anime' | 'manga' | 'comics'
) {
  try {
    // Use the public client for reading (RLS should allow reads)
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching comments:', error)
      return { success: false, error, comments: [] }
    }

    // If we have comments, fetch user profiles separately
    if (data && data.length > 0) {
      // Get unique user IDs from comments
      const userIds = [...new Set(data.map(comment => comment.user_id))]
      
      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds)
      
      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError)
        // Continue anyway, we'll just show comments without profiles
      }
      
      // Map profiles to comments
      const commentsWithProfiles = data.map(comment => {
        const profile = profiles?.find(p => p.id === comment.user_id)
        return {
          ...comment,
          user_profile: profile ? {
            username: profile.username || 'User',
            avatar_url: profile.avatar_url || null
          } : {
            username: 'User',
            avatar_url: null
          }
        }
      })
      
      return { success: true, comments: commentsWithProfiles as Comment[] }
    }

    return { success: true, comments: data as Comment[] }
  } catch (error) {
    console.error('Error fetching comments:', error)
    return { success: false, error, comments: [] }
  }
}

// Add a new comment
export async function addComment(
  userId: string,
  contentId: string,
  contentType: 'anime' | 'manga' | 'comics',
  text: string,
  username: string = 'User',
  avatarUrl: string | null = null,
  mediaUrl: string | null = null,
  parentCommentId: string | null = null
) {
  try {
    // Ensure userId is in UUID format
    const formattedUserId = ensureUUID(userId)
    
    // Create a new comment object
    const newComment = {
      user_id: formattedUserId,
      content_id: contentId,
      content_type: contentType,
      text: text,
      media_url: mediaUrl,
      parent_comment_id: parentCommentId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Try to insert the comment with the public client
    const { data, error } = await supabase
      .from('comments')
      .insert(newComment)
      .select('*')
      .single()

    if (error) {
      console.error('Error adding comment to Supabase:', error.message)
      return { success: false, error }
    }

    // If we're here, the insert worked - proceed with fetching user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', formattedUserId)
      .single()
    
    if (profileError && !profileError.message.includes('No rows found')) {
      console.warn('Error fetching profile:', profileError)
    }

    // Return the comment with the profile data
    return { 
      success: true, 
      comment: {
        ...data,
        user_profile: profile ? {
          username: profile.username || 'User',
          avatar_url: profile.avatar_url || null
        } : {
          username: username || 'User',
          avatar_url: avatarUrl
        }
      } as Comment
    }
  } catch (error) {
    console.error('Error adding comment:', error)
    return { success: false, error }
  }
}

// Delete a comment
export async function deleteComment(commentId: string, userId: string) {
  try {
    // Ensure userId is in UUID format
    const formattedUserId = ensureUUID(userId)
    
    // Use public client - may run into RLS issues
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', formattedUserId)
    
    if (error) {
      console.error('Error deleting comment:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting comment:', error)
    return { success: false, error }
  }
}

// Update a comment
export async function updateComment(
  commentId: string,
  userId: string,
  text: string,
  mediaUrl: string | null = null
) {
  try {
    // Ensure userId is in UUID format
    const formattedUserId = ensureUUID(userId)
    
    // Prepare update data
    const updateData: any = { 
      text,
      updated_at: new Date().toISOString()
    }
    
    // Only include media_url if it's provided
    if (mediaUrl !== undefined) {
      updateData.media_url = mediaUrl
    }
    
    // Use public client - may run into RLS issues
    const { data, error } = await supabase
      .from('comments')
      .update(updateData)
      .eq('id', commentId)
      .eq('user_id', formattedUserId)
      .select('*')
      .single()
    
    if (error) {
      console.error('Error updating comment:', error)
      return { success: false, error }
    }

    // Fetch the user's profile data separately
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', formattedUserId)
      .single()
    
    if (profileError) {
      console.warn('Error fetching profile:', profileError)
    }

    // Return the comment with the profile data
    return { 
      success: true, 
      comment: {
        ...data,
        user_profile: profile ? {
          username: profile.username || 'User',
          avatar_url: profile.avatar_url || null
        } : {
          username: 'User',
          avatar_url: null
        }
      } as Comment 
    }
  } catch (error) {
    console.error('Error updating comment:', error)
    return { success: false, error }
  }
}

// Get replies for a comment
export async function getCommentReplies(commentId: string) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_comment_id', commentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comment replies:', error);
      return { success: false, error, replies: [] };
    }

    // If we have replies, fetch user profiles
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(reply => reply.user_id))];
      
      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, vip_status, vip_tier, vip_theme')
        .in('id', userIds);
      
      if (profilesError) {
        console.warn('Error fetching profiles for replies:', profilesError);
      }
      
      // Map profiles to replies
      const repliesWithProfiles = data.map(reply => {
        const profile = profiles?.find(p => p.id === reply.user_id);
        return {
          ...reply,
          user_profile: profile ? {
            username: profile.username || 'User',
            avatar_url: profile.avatar_url || null,
            vip_status: profile.vip_status || false,
            vip_tier: profile.vip_tier || null,
            vip_theme: profile.vip_theme || null
          } : {
            username: 'User',
            avatar_url: null
          }
        };
      });
      
      return { success: true, replies: repliesWithProfiles as Comment[] };
    }

    return { success: true, replies: data as Comment[] };
  } catch (error) {
    console.error('Error fetching comment replies:', error);
    return { success: false, error, replies: [] };
  }
}

// Fetch all comments for a specific content with their replies
export async function getAllComments(
  contentId: string,
  contentType: 'anime' | 'manga' | 'comics',
  userId?: string | null
) {
  try {
    // Ensure userId is UUID if provided
    const formattedUserId = userId ? ensureUUID(userId) : null;
    
    // First try to get comments with parent_comment_id filter
    try {
      // Get only the top-level comments (those without a parent_comment_id)
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        // If the error is about the parent_comment_id column not existing,
        // we'll fall back to the simpler query below
        if (error.code === '42703' && error.message.includes('parent_comment_id')) {
          throw new Error('parent_comment_id column does not exist');
        }
        
        console.error('Error fetching comments:', error);
        return { success: false, error, comments: [] };
      }

      // If we have top-level comments, fetch their replies and user profiles
      if (data && data.length > 0) {
        // Get all top-level comment IDs to fetch their replies
        const commentIds = data.map(comment => comment.id);
        
        // Try to fetch all replies for these comments
        try {
          const { data: allReplies, error: repliesError } = await supabase
            .from('comments')
            .select('*')
            .eq('content_id', contentId)
            .eq('content_type', contentType)
            .in('parent_comment_id', commentIds)
            .order('created_at', { ascending: true });
          
          if (repliesError) {
            console.warn('Error fetching replies:', repliesError);
          }
          
          // Get unique user IDs from both comments and replies
          const userIds = [...new Set([
            ...data.map(comment => comment.user_id),
            ...(allReplies?.map(reply => reply.user_id) || [])
          ])];
          
          // Fetch all user profiles
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, vip_status, vip_tier, vip_theme')
            .in('id', userIds);
          
          if (profilesError) {
            console.warn('Error fetching profiles:', profilesError);
          }
          
          // Get all comment and reply IDs for like fetching
          const allCommentIds = [
            ...data.map(c => c.id),
            ...(allReplies?.map(r => r.id) || [])
          ];
          
          let likesData: any[] = [];
          let userLikesSet = new Set<string>();

          if (allCommentIds.length > 0) {
            // Fetch like counts for all comments/replies
            const { data: likeCounts, error: countError } = await supabase
              .from('comment_likes')
              .select('comment_id, user_id') // Select user_id to count
              .in('comment_id', allCommentIds);

            if (countError) {
              console.warn('Error fetching like counts:', countError);
            } else if (likeCounts) {
              // Calculate counts per comment_id
              const counts: Record<string, number> = {};
              likeCounts.forEach(like => {
                counts[like.comment_id] = (counts[like.comment_id] || 0) + 1;
              });
              likesData = Object.entries(counts).map(([comment_id, count]) => ({ comment_id, like_count: count }));
            }

            // Fetch likes for the current user if userId is provided
            if (formattedUserId) {
              const { data: userLikes, error: userLikesError } = await supabase
                .from('comment_likes')
                .select('comment_id')
                .eq('user_id', formattedUserId)
                .in('comment_id', allCommentIds);

              if (userLikesError) {
                console.warn('Error fetching user likes:', userLikesError);
              } else if (userLikes) {
                userLikes.forEach(like => userLikesSet.add(like.comment_id));
              }
            }
          }
          
          // Group replies by parent comment ID
          const repliesByParentId: Record<string, Comment[]> = {};
          
          if (allReplies) {
            allReplies.forEach(reply => {
              const parentId = reply.parent_comment_id;
              if (parentId) {
                if (!repliesByParentId[parentId]) {
                  repliesByParentId[parentId] = [];
                }
                
                // Add user profile and like info to reply
                const profile = profiles?.find(p => p.id === reply.user_id);
                const likeInfo = likesData.find(l => l.comment_id === reply.id);
                
                repliesByParentId[parentId].push({
                  ...reply,
                  user_profile: profile ? {
                    username: profile.username || 'User',
                    avatar_url: profile.avatar_url || null,
                    vip_status: profile.vip_status || false,
                    vip_tier: profile.vip_tier || null,
                    vip_theme: profile.vip_theme || null
                  } : {
                    username: 'User',
                    avatar_url: null
                  },
                  like_count: likeInfo?.like_count || 0,
                  user_has_liked: formattedUserId ? userLikesSet.has(reply.id) : false
                } as Comment);
              }
            });
          }
          
          // Add profiles, replies, and like info to comments
          const commentsWithProfiles = data.map(comment => {
            const profile = profiles?.find(p => p.id === comment.user_id);
            const likeInfo = likesData.find(l => l.comment_id === comment.id);
            
            return {
              ...comment,
              user_profile: profile ? {
                username: profile.username || 'User',
                avatar_url: profile.avatar_url || null,
                vip_status: profile.vip_status || false,
                vip_tier: profile.vip_tier || null,
                vip_theme: profile.vip_theme || null
              } : {
                username: 'User',
                avatar_url: null
              },
              replies: (repliesByParentId[comment.id] || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), // Ensure replies are sorted correctly
              like_count: likeInfo?.like_count || 0,
              user_has_liked: formattedUserId ? userLikesSet.has(comment.id) : false
            } as Comment;
          });
          
          return { success: true, comments: commentsWithProfiles };
        } catch (error) {
          console.warn('Error processing replies:', error);
          // Continue with just the comments without replies
        }
        
        // If we reach here, we have comments but couldn't process replies
        // Add just the user profiles to comments
        const userIds = [...new Set(data.map(comment => comment.user_id))];
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, vip_status, vip_tier, vip_theme')
          .in('id', userIds);
        
        if (profilesError) {
          console.warn('Error fetching profiles:', profilesError);
        }
        
        const commentsWithProfiles = data.map(comment => {
          const profile = profiles?.find(p => p.id === comment.user_id);
          
          return {
            ...comment,
            user_profile: profile ? {
              username: profile.username || 'User',
              avatar_url: profile.avatar_url || null,
              vip_status: profile.vip_status || false,
              vip_tier: profile.vip_tier || null,
              vip_theme: profile.vip_theme || null
            } : {
              username: 'User',
              avatar_url: null
            },
            replies: [],
            like_count: 0,
            user_has_liked: false
          } as Comment;
        });
        
        return { success: true, comments: commentsWithProfiles };
      }

      return { success: true, comments: data as Comment[] };
    } catch (error) {
      // Fall back to simpler query if parent_comment_id column doesn't exist
      console.log('Falling back to basic comments query due to:', error);
    }
    
    // FALLBACK QUERY - Get all comments without parent filtering
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('comments')
      .select('*')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .order('created_at', { ascending: false });
    
    if (fallbackError) {
      console.error('Error fetching comments (fallback):', fallbackError);
      return { success: false, error: fallbackError, comments: [] };
    }
    
    // Add profiles and like data in fallback mode
    if (fallbackData && fallbackData.length > 0) {
      const fallbackUserIds = [...new Set(fallbackData.map(comment => comment.user_id))];
      const { data: fallbackProfiles, error: fallbackProfilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, vip_status, vip_tier, vip_theme')
        .in('id', fallbackUserIds);
      
      if (fallbackProfilesError) {
        console.warn('Error fetching profiles (fallback):', fallbackProfilesError);
      }

      // Fetch likes data similarly for fallback
      let fallbackLikesData: any[] = [];
      let fallbackUserLikesSet = new Set<string>();
      const fallbackCommentIds = fallbackData.map(c => c.id); // Use fallbackData

      if (fallbackCommentIds.length > 0) {
        // Fetch like counts
        const { data: likeCounts, error: countError } = await supabase
          .from('comment_likes')
          .select('comment_id, user_id')
          .in('comment_id', fallbackCommentIds);
        
        if (countError) {
          console.warn('Error fetching fallback like counts:', countError);
        } else if (likeCounts) {
          const counts: Record<string, number> = {};
          likeCounts.forEach(like => {
            counts[like.comment_id] = (counts[like.comment_id] || 0) + 1;
          });
          fallbackLikesData = Object.entries(counts).map(([comment_id, count]) => ({ comment_id, like_count: count }));
        }

        // Fetch user likes
        if (formattedUserId) {
          const { data: userLikes, error: userLikesError } = await supabase
            .from('comment_likes')
            .select('comment_id')
            .eq('user_id', formattedUserId)
            .in('comment_id', fallbackCommentIds);

          if (userLikesError) {
            console.warn('Error fetching fallback user likes:', userLikesError);
          } else if (userLikes) {
            userLikes.forEach(like => fallbackUserLikesSet.add(like.comment_id));
          }
        }
      }
      
      const commentsWithProfiles = fallbackData.map(comment => { // Use fallbackData
        const profile = fallbackProfiles?.find(p => p.id === comment.user_id); // Use fallbackProfiles
        const likeInfo = fallbackLikesData.find(l => l.comment_id === comment.id);
        
        return {
          ...comment,
          user_profile: profile ? {
            username: profile.username || 'User',
            avatar_url: profile.avatar_url || null,
            vip_status: profile.vip_status || false,
            vip_tier: profile.vip_tier || null,
            vip_theme: profile.vip_theme || null
          } : {
            username: 'User',
            avatar_url: null
          },
          replies: [], // No replies in fallback mode
          like_count: likeInfo?.like_count || 0,
          user_has_liked: formattedUserId ? fallbackUserLikesSet.has(comment.id) : false
        } as Comment;
      });
      
      return { success: true, comments: commentsWithProfiles };
    }
    
    return { success: true, comments: fallbackData as Comment[] }; // Return fallbackData if empty
  } catch (error) {
    console.error('Error fetching comments:', error);
    return { success: false, error, comments: [] };
  }
}

// Upload a media file for a comment
export async function uploadCommentMedia(file: File): Promise<{ success: boolean; url?: string; error?: any }> {
  try {
    // Generate a unique filename with original extension
    const fileExt = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = `comment-media/${fileName}`
    
    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      throw error
    }
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)
    
    return { success: true, url: publicUrl }
  } catch (error) {
    console.error('Error uploading comment media:', error)
    return { success: false, error }
  }
}

// Delete a comment media file
export async function deleteCommentMedia(mediaUrl: string): Promise<{ success: boolean; error?: any }> {
  try {
    // Extract the path from the media URL
    const urlObj = new URL(mediaUrl)
    const pathParts = urlObj.pathname.split('/')
    const bucketNameIndex = pathParts.findIndex(part => part === 'media')
    
    if (bucketNameIndex === -1) {
      throw new Error('Invalid media URL format')
    }
    
    // Get the file path after the bucket name
    const filePath = pathParts.slice(bucketNameIndex + 1).join('/')
    
    // Delete the file from Supabase Storage
    const { error } = await supabase.storage
      .from('media')
      .remove([filePath])
    
    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting comment media:', error)
    return { success: false, error }
  }
}

// Conceptual: Function to toggle a like on a comment
export async function toggleCommentLike(commentId: string, userId: string): Promise<{ success: boolean; liked: boolean; newLikeCount: number; error?: any }> {
  if (!supabase) {
    return { success: false, liked: false, newLikeCount: 0, error: 'Supabase client not initialized' };
  }
  if (!userId || !commentId) {
    return { success: false, liked: false, newLikeCount: 0, error: 'User ID and Comment ID are required' };
  }

  const formattedUserId = ensureUUID(userId);

  try {
    // 1. Check if the user already liked this comment
    const { data: existingLike, error: checkError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', formattedUserId)
      .maybeSingle(); // Use maybeSingle to handle 0 or 1 result without erroring

    if (checkError) {
      console.error('Error checking for existing like:', checkError);
      throw checkError;
    }

    let liked = false;

    // 2. If like exists, delete it (unlike)
    if (existingLike) {
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('Error deleting like:', deleteError);
        throw deleteError;
      }
      liked = false;
      console.log(`User ${formattedUserId} unliked comment ${commentId}`);
    }
    // 3. If like doesn't exist, insert it (like)
    else {
      const { error: insertError } = await supabase
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: formattedUserId });

      if (insertError) {
        console.error('Error inserting like:', insertError);
        // Handle potential duplicate key error if race condition occurs
        if (insertError.code === '23505') { 
          console.warn('Like already existed (race condition?), treating as success.');
           liked = true; // Assume it's now liked
        } else {
          throw insertError;
        }
      } else {
        liked = true;
        console.log(`User ${formattedUserId} liked comment ${commentId}`);
      }
    }

    // 4. Get the new like count for the comment
    const { count: newLikeCount, error: countError } = await supabase
      .from('comment_likes')
      .select('id', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    if (countError) {
      console.error('Error fetching new like count:', countError);
      // Don't fail the whole operation, but log the error
      // Return the potentially inaccurate liked status with a count of 0
      return { success: true, liked: liked, newLikeCount: 0, error: countError };
    }

    // 5. Return success with the new state
    return { success: true, liked: liked, newLikeCount: newLikeCount ?? 0 };

  } catch (error) {
    console.error('Error in toggleCommentLike:', error);
    // Determine the likely state before the error for better UI reversion
    const likelyPreviousState = await checkUserLikedComment(commentId, formattedUserId); 
    const {count: fallbackCount} = await getCommentLikeCount(commentId);
    return { success: false, liked: likelyPreviousState, newLikeCount: fallbackCount, error };
  }
}

// Conceptual Helper: Check if user liked a comment (needed for error recovery)
async function checkUserLikedComment(commentId: string, userId: string): Promise<boolean> {
   if (!supabase || !userId || !commentId) return false;
   const formattedUserId = ensureUUID(userId);
   const { data } = await supabase
     .from('comment_likes')
     .select('id')
     .eq('comment_id', commentId)
     .eq('user_id', formattedUserId)
     .limit(1);
   return !!data && data.length > 0;
}

// Conceptual Helper: Get like count (needed for error recovery)
async function getCommentLikeCount(commentId: string): Promise<{count: number}> {
   if (!supabase || !commentId) return {count: 0};
   const { count } = await supabase
     .from('comment_likes')
     .select('id', { count: 'exact', head: true })
     .eq('comment_id', commentId);
   return {count: count ?? 0};
} 