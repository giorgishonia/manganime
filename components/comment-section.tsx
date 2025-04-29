"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { 
  Send, 
  MessageSquare, 
  AlertCircle, 
  Trash2, 
  Edit, 
  X,
  Loader2,
  UserCircle,
  StickyNote,
  XCircle,
  ThumbsUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { v5 as uuidv5 } from 'uuid'
import { 
  getCommentsByContentId, 
  getAllComments,
  addComment, 
  deleteComment, 
  updateComment, 
  Comment,
  ensureCommentsTable,
  toggleCommentLike
} from '@/lib/comments'
import { toast } from 'sonner'
import { useUnifiedAuth } from '@/components/unified-auth-provider'
import { StickerSelector, Sticker } from './sticker-selector'
import { cn } from '@/lib/utils'
import { createNotification } from "@/lib/notifications"

// UUID namespace for converting non-UUID IDs (same as in comments.ts)
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341'

// Helper function to ensure UUID format (copied from comments.ts)
function ensureUUID(id: string): string {
  // Check if already a valid UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id
  }
  
  // Convert to a deterministic UUID using the namespace
  return uuidv5(id, NAMESPACE)
}

// Placeholder type for the return value of the assumed paginated function
// Adjust this based on the actual implementation in lib/comments.ts
type PaginatedCommentsResponse = {
  success: boolean;
  comments: Comment[];
  totalCount: number | null; // Total number of comments for pagination
  error?: any;
};

// Placeholder for the actual paginated fetching function from lib/comments.ts
// You'll need to implement this function in lib/comments.ts
async function getPaginatedComments(
  contentId: string,
  contentType: 'anime' | 'manga',
  page: number,
  limit: number
): Promise<PaginatedCommentsResponse> {
  console.warn("Using placeholder getPaginatedComments. Implement actual fetching in lib/comments.ts");
  // --- This is placeholder logic --- 
  // In reality, call your Supabase function with LIMIT and OFFSET
  const { success, comments, error } = await getAllComments(contentId, contentType); // Fetch all for now
  if (!success || !comments) {
    return { success: false, comments: [], totalCount: 0, error };
  }
  const totalCount = comments.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedComments = comments.slice(startIndex, endIndex);
  return { success: true, comments: paginatedComments, totalCount, error: null };
  // --- End placeholder logic --- 
}

interface CommentSectionProps {
  contentId: string
  contentType: 'anime' | 'manga'
  sectionVariants?: any
  itemVariants?: any
}

export function CommentSection({
  contentId,
  contentType,
  sectionVariants = {
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
  },
  itemVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  }
}: CommentSectionProps) {
  // Use unified auth
  const { isAuthenticated, isLoading: authLoading, userId, username, avatarUrl } = useUnifiedAuth()
  
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null)
  const [showStickerSelector, setShowStickerSelector] = useState(false)
  const [editMedia, setEditMedia] = useState<string | null>(null)
  const commentBoxRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalComments, setTotalComments] = useState(0)
  const commentsPerPage = 5 // Number of comments per page

  // Print auth state for debugging
  useEffect(() => {
    console.log("CommentSection auth state:", { isAuthenticated, userId, username, authLoading });
  }, [isAuthenticated, userId, username, authLoading]);

  // Load comments for this content
  useEffect(() => {
    async function loadComments() {
      setIsLoading(true)
      
      try {
        // First ensure the comments table structure is correct
        await ensureCommentsTable();
        
        // Then get the comments
        const { success, comments } = await getAllComments(contentId, contentType)
        
        if (success && comments) {
          // Initialize with default like state - REAL STATE NEEDED FROM getAllComments!
          const commentsWithLikes = comments.map(c => ({ 
            ...c, 
            like_count: 0, // Default - should come from DB query
            user_has_liked: false // Default - should come from DB query
          }));
          setComments(commentsWithLikes)
        } else {
          toast.error("კომენტარების ჩატვირთვა ვერ მოხერხდა")
        }
      } catch (error) {
        console.error('Error loading comments:', error)
        toast.error("კომენტარების სერვერთან დაკავშირება ვერ მოხერხდა")
      } finally {
        setIsLoading(false)
      }
    }

    loadComments();
    // Restore dependencies, but keep userId out until initial like state fetching is implemented
  }, [contentId, contentType]);

  // Reload comments when user authentication state changes
  // This ensures profiles and avatars are up-to-date
  useEffect(() => {
    if (!isLoading && contentId) {
      getAllComments(contentId, contentType).then(({ success, comments }) => {
        if (success && comments) {
          setComments(comments);
        }
      });
    }
  }, [isAuthenticated, userId, avatarUrl, contentId, contentType, isLoading]);

  // Auto focus when editing a comment
  useEffect(() => {
    if (editingId && commentBoxRef.current) {
      commentBoxRef.current.focus()
    }
  }, [editingId])

  // Handle sticker selection
  const handleStickerSelect = (sticker: Sticker) => {
    setSelectedSticker(sticker)
    setShowStickerSelector(false)
  }
  
  // Remove selected sticker
  const handleRemoveSticker = () => {
    setSelectedSticker(null)
  }
  
  // Toggle sticker selector
  const toggleStickerSelector = () => {
    setShowStickerSelector(!showStickerSelector)
  }

  // Submit a new comment
  const handlePostComment = async () => {
    if (!newComment.trim() && !selectedSticker) return
    
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    try {
      setIsSubmitting(true)
      
      if (!userId) {
        toast.error("კომენტარის დასატოვებლად უნდა იყოთ ავტორიზებული")
        return
      }
      
      // Ensure the comments table structure is correct before posting
      const tableCheck = await ensureCommentsTable();
      if (!tableCheck.success) {
        console.error("Failed to ensure comments table structure:", tableCheck.error);
        toast.error("სერვერის პრობლემა. გთხოვთ, სცადოთ ხელახლა ცოტა ხანში.");
        return;
      }
      
      // Use sticker URL as media URL if a sticker is selected
      const mediaUrl = selectedSticker ? selectedSticker.url : null
      
      const { success, comment, error } = await addComment(
        userId,
        contentId,
        contentType,
        newComment.trim(),
        username || 'User',
        avatarUrl,
        mediaUrl
      )
      
      if (success && comment) {
        setComments(prevComments => [comment, ...prevComments])
        setNewComment('')
        setSelectedSticker(null)
        toast.success("კომენტარი დაემატა!")
      } else {
        console.error('Error posting comment:', error)
        toast.error("კომენტარის დამატება ვერ მოხერხდა")
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      toast.error("დაფიქსირდა შეცდომა")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Check if the current user can edit/delete a comment
  const isOwnComment = (comment: Comment): boolean => {
    if (!userId) return false
    return comment.user_id === ensureUUID(userId);
  }

  // Start editing a comment
  const handleEditComment = (comment: Comment) => {
    setEditingId(comment.id)
    setEditText(comment.text)
    setEditMedia(comment.media_url || null)
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
    setEditMedia(null)
  }

  // Save edited comment
  const saveEdit = async () => {
    if (!editingId || (!editText.trim() && !editMedia) || !userId) return
    
    try {
      setIsSubmitting(true)
      
      const { success, comment, error } = await updateComment(
        editingId,
        userId,
        editText.trim(),
        editMedia
      )
      
      if (success && comment) {
        // Update the comment in local state with the returned data
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === editingId ? comment : c
          )
        )
        
        setEditingId(null)
        setEditText('')
        setEditMedia(null)
        toast.success("კომენტარი განახლდა")
      } else {
        console.error('Error updating comment:', error)
        toast.error("კომენტარის განახლება ვერ მოხერხდა")
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      toast.error("კომენტარის განახლება ვერ მოხერხდა")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Remove media from a comment being edited
  const handleRemoveEditMedia = async () => {
    setEditMedia(null)
  }

  // Handle deleting a comment (with media cleanup)
  const handleDeleteComment = async (commentId: string) => {
    if (!userId) return
    
    try {
      if (window.confirm('დარწმუნებული ხართ, რომ გსურთ ამ კომენტარის წაშლა?')) {
        // Delete the comment
        const { success, error } = await deleteComment(commentId, userId)
        
        if (success) {
          // Stickers are pre-defined assets, not user uploads - no need to delete them
          setComments(prevComments => prevComments.filter(c => c.id !== commentId))
          toast.success("კომენტარი წაიშალა")
        } else {
          console.error('Error deleting comment:', error)
          toast.error("კომენტარის წაშლა ვერ მოხერხდა")
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast.error("დაფიქსირდა შეცდომა")
    }
  }

  // Function to update like state locally
  const updateLocalLikeState = (commentId: string, liked: boolean, newCount: number) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, user_has_liked: liked, like_count: newCount } : c
    ));
  };

  // Handle Liking a comment
  const handleLikeComment = async (comment: Comment) => {
    if (!isAuthenticated || !userId) {
      toast.error("კომენტარების მოსაწონებლად უნდა იყოთ ავტორიზებული");
      router.push('/login');
      return;
    }

    const originalLiked = comment.user_has_liked ?? false; 
    const originalCount = comment.like_count || 0;
    const optimisticNewLiked = !originalLiked;
    const optimisticNewCount = optimisticNewLiked ? originalCount + 1 : Math.max(0, originalCount - 1);

    // Optimistically update UI
    updateLocalLikeState(comment.id, optimisticNewLiked, optimisticNewCount);

    try {
      const { success, liked, newLikeCount, error } = await toggleCommentLike(comment.id, userId);

      if (!success) {
        // Revert optimistic update on failure
        updateLocalLikeState(comment.id, originalLiked, originalCount);
        toast.error("მოწონების განახლება ვერ მოხერხდა");
        console.error("Like toggle error:", error);
        return;
      }

      updateLocalLikeState(comment.id, liked, newLikeCount);

      // --- Send Notification Logic --- 
      if (liked && comment.user_id !== ensureUUID(userId)) {
        console.log(`Attempting to send 'like' notification to user: ${comment.user_id}`);
        
        // Call the actual createNotification function
        try {
           const notificationResult = await createNotification( 
               comment.user_id, // Recipient 
               'comment_like', // Type
               { // Data payload
                 sender_user_id: userId, 
                 sender_username: username, 
                 comment_id: comment.id, 
                 content_id: contentId, 
                 content_type: contentType, 
                 comment_snippet: comment.text.substring(0, 50) + (comment.text.length > 50 ? '...' : '') 
               }
           );
           if (notificationResult.success) {
               console.log("Like notification created successfully.");
           } else {
               console.error("Failed to create like notification:", notificationResult.error);
           }
        } catch (notifError) {
           console.error("Error calling createNotification:", notifError);
        }
      } 
      // --- End Notification Logic --- 

    } catch (err) {
      // Revert optimistic update on error
      updateLocalLikeState(comment.id, originalLiked, originalCount);
      toast.error("კომენტარის მოწონებისას დაფიქსირდა შეცდომა");
      console.error("Like handling error:", err);
    }
  };

  return (
    <motion.section
      className="mb-8"
      variants={sectionVariants}
    >
      <motion.h2 
        className="text-2xl font-bold mb-6 flex items-center"
        variants={itemVariants}
      >
        <MessageSquare className="mr-2 h-5 w-5 text-purple-400" />
        კომენტარები
      </motion.h2>

      {/* Comment form for authenticated users */}
      <motion.div 
        className="mb-8"
        variants={itemVariants}
      >
        {isAuthenticated ? (
          <div className="flex gap-4 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <Avatar className="h-10 w-10 border-2 border-purple-500/30">
              <AvatarImage src={avatarUrl || ''} alt={username || 'მომხმარებელი'} />
              <AvatarFallback className="bg-purple-900 text-white">
                {(username?.[0] || 'მ').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="გაგვიზიარეთ თქვენი აზრი..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none mb-3 bg-black/30 border-white/10 placeholder:text-white/40 h-[40px]"
              />
              
              {/* Sticker preview */}
              {selectedSticker && (
                <div className="relative mb-3 inline-block">
                  <div className="relative w-fit h-fit overflow-hidden rounded-md border border-white/10">
                    <Image 
                      src={selectedSticker.url} 
                      alt={selectedSticker.alt || 'სტიკერი'}
                      width={150}
                      height={150}
                      className="object-contain"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveSticker}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-black/80 hover:bg-black text-white p-0"
                  >
                    <XCircle className="h-6 w-6" />
                  </Button>
                </div>
              )}
              
              <div className="flex justify-between">
                {/* Sticker selector button */}
                <div className="relative">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleStickerSelector}
                    className="border-white/10 hover:bg-white/5"
                    disabled={isSubmitting}
                  >
                    <StickyNote className="h-4 w-4" />
                  </Button>
                  
                  {/* Sticker selector popup */}
                  <AnimatePresence>
                    {showStickerSelector && (
                      <StickerSelector 
                        onSelectSticker={handleStickerSelect} 
                        onClose={() => setShowStickerSelector(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>
                
                <Button 
                  onClick={handlePostComment} 
                  disabled={(!newComment.trim() && !selectedSticker) || isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center"
          >
            <UserCircle className="h-12 w-12 text-purple-400 mb-3" />
            <h3 className="text-lg font-medium mb-2">შემოგვიერთდით საუბარში!</h3>
            <p className="text-gray-300 mb-4 max-w-md">
              შედით სისტემაში თქვენი აზრის გასაზიარებლად და სხვა მომხმარებლებთან დასაკავშირებლად.
            </p>
            <Button 
              onClick={() => router.push('/login')}
              className="bg-purple-600 hover:bg-purple-700 px-6"
            >
              შესვლა
            </Button>
          </div>
        )}
      </motion.div>

      {/* Comments list */}
      <motion.div variants={itemVariants}>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-12"
            >
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            </motion.div>
          ) : comments.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-gray-400"
            >
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-500/50" />
              <p className="text-lg">კომენტარები არ არის.</p>
              <p>იყავით პირველი, ვინც აზრს გამოთქვამს!</p>
            </motion.div>
          ) : (
            <motion.div 
              key={`comments-page-${currentPage}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {comments.map((comment) => (
                <motion.div 
                  key={comment.id}
                  className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl p-5 transition-all hover:border-white/10"
                  variants={itemVariants}
                  layout
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center flex-1 min-w-0">
                      <Avatar className="h-10 w-10 border-2 border-purple-500/30 flex-shrink-0">
                        <AvatarImage src={comment.user_profile?.avatar_url || ''} alt={comment.user_profile?.username || 'მომხმარებელი'} />
                        <AvatarFallback className="bg-purple-900 text-white">
                          {(comment.user_profile?.username?.[0] || 'მ').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{comment.user_profile?.username || 'მომხმარებელი'}</p>
                        <p className="text-sm text-gray-400">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          {comment.updated_at && comment.updated_at !== comment.created_at && 
                            ' (რედაქტირებული)'}
                        </p>
                      </div>
                    </div>
                    
                    {isOwnComment(comment) && editingId !== comment.id && (
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditComment(comment)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteComment(comment.id)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {editingId === comment.id ? (
                    <div className="mt-3">
                      <Textarea
                        ref={commentBoxRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="resize-none mb-3 bg-black/30 border-white/10 min-h-[100px]"
                      />
                      
                      {/* Edit media preview */}
                      {editMedia && (
                        <div className="relative mb-3 inline-block">
                          <div className="relative w-fit h-fit overflow-hidden rounded-md border border-white/10">
                            <Image 
                              src={editMedia} 
                              alt="სტიკერი"
                              width={150}
                              height={150}
                              className="object-contain"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRemoveEditMedia}
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-black/80 hover:bg-black text-white p-0"
                          >
                            <XCircle className="h-6 w-6" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={cancelEdit}
                          className="border-white/10 hover:bg-white/5"
                        >
                          <X className="h-4 w-4 mr-1" />
                          გაუქმება
                        </Button>
                        <Button 
                          size="sm"
                          onClick={saveEdit}
                          disabled={(!editText.trim() && !editMedia) || isSubmitting}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Edit className="h-4 w-4 mr-1" />
                          )}
                          შენახვა
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="mt-3 text-gray-200 whitespace-pre-line break-words">{comment.text}</p>
                      
                      {/* Comment media/sticker */}
                      {comment.media_url && (
                        <div className="mt-3">
                          <div className="relative max-w-[200px] max-h-[200px] overflow-hidden rounded-md border border-white/10 inline-block">
                            <Image 
                              src={comment.media_url} 
                              alt="კომენტარის სტიკერი"
                              width={200}
                              height={200}
                              className="object-contain"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Like Button - Placed below content/edit form */} 
                  {editingId !== comment.id && ( 
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                      <Button 
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "flex items-center gap-1.5 text-xs h-7 px-2",
                          comment.user_has_liked 
                            ? "text-purple-400 hover:bg-purple-500/10"
                            : "text-gray-400 hover:text-purple-400 hover:bg-purple-500/10"
                        )}
                        onClick={() => handleLikeComment(comment)}
                        disabled={!isAuthenticated} // Disable if not logged in
                      >
                        <ThumbsUp className={cn("h-3.5 w-3.5", comment.user_has_liked && "fill-current")} />
                        <span>{comment.like_count || 0}</span>
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  )
} 