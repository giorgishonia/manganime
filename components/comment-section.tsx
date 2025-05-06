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
import { VIPBadge } from "@/components/ui/vip-badge"

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
  contentType: 'anime' | 'manga' | 'comics'
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySticker, setReplySticker] = useState<Sticker | null>(null)
  const [showReplyStickerSelector, setShowReplyStickerSelector] = useState(false)
  
  const commentBoxRef = useRef<HTMLTextAreaElement>(null)
  const replyBoxRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [commentsPerPage] = useState(5)

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
        
        // Then get the comments, passing the userId
        const { success, comments } = await getAllComments(contentId, contentType, userId);
        
        if (success && comments) {
          // The comments fetched now include like_count and user_has_liked
          setComments(comments);
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
    // Add userId to dependencies so likes update on login/logout
  }, [contentId, contentType, userId]);

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
    setSelectedSticker(sticker);
    setShowStickerSelector(false);
  }
  
  // Remove selected sticker
  const handleRemoveSticker = () => {
    setSelectedSticker(null)
  }
  
  // Toggle sticker selector
  const toggleStickerSelector = () => {
    setShowStickerSelector(!showStickerSelector);
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
      
      // Use sticker URL as mediaUrl if a sticker is selected
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
    setComments(prev => prev.map(c => {
      // If this is the top-level comment being liked/unliked
      if (c.id === commentId) {
        return { ...c, user_has_liked: liked, like_count: newCount };
      }
      
      // If this comment has replies, check if the liked item is among them
      if (c.replies && c.replies.length > 0) {
        let replyUpdated = false;
        const updatedReplies = c.replies.map(r => {
          if (r.id === commentId) {
            replyUpdated = true;
            return { ...r, user_has_liked: liked, like_count: newCount };
          }
          return r;
        });
        
        // If a reply was updated, return the parent comment with updated replies
        if (replyUpdated) {
          return { ...c, replies: updatedReplies };
        }
      }
      
      // Otherwise, return the comment unchanged
      return c;
    }));
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

  // Start replying to a comment
  const handleReplyToComment = (commentId: string) => {
    if (!isAuthenticated) {
      toast.error("კომენტარის დასატოვებლად უნდა იყოთ ავტორიზებული");
      router.push('/login');
      return;
    }
    
    setReplyingTo(commentId);
    setReplyText('');
    setReplySticker(null);
    
    // Focus the reply input after the component renders
    setTimeout(() => {
      if (replyBoxRef.current) {
        replyBoxRef.current.focus();
      }
    }, 100);
  };

  // Cancel replying
  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
    setReplySticker(null);
  };

  // Handle reply sticker selection
  const handleReplyStickerSelect = (sticker: Sticker) => {
    setReplySticker(sticker);
    setShowReplyStickerSelector(false);
  };
  
  // Remove selected reply sticker
  const handleRemoveReplySticker = () => {
    setReplySticker(null);
  };
  
  // Toggle reply sticker selector
  const toggleReplyStickerSelector = () => {
    setShowReplyStickerSelector(!showReplyStickerSelector);
  };

  // Submit a reply
  const handlePostReply = async () => {
    if (!replyingTo || (!replyText.trim() && !replySticker)) return;
    
    if (!isAuthenticated || !userId) {
      router.push('/login');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Ensure the comments table structure is correct before posting
      const tableCheck = await ensureCommentsTable();
      if (!tableCheck.success) {
        console.error("Failed to ensure comments table structure:", tableCheck.error);
        toast.error("სერვერის პრობლემა. გთხოვთ, სცადოთ ხელახლა ცოტა ხანში.");
        return;
      }
      
      // Find the parent comment to get original author's ID for notification
      const parentComment = comments.find(c => c.id === replyingTo);
      
      if (!parentComment) {
        toast.error("კომენტარი ვერ მოიძებნა");
        return;
      }
      
      // Use sticker URL as media URL if a sticker is selected
      const mediaUrl = replySticker ? replySticker.url : null;
      
      const { success, comment, error } = await addComment(
        userId,
        contentId,
        contentType,
        replyText.trim(),
        username || 'User',
        avatarUrl,
        mediaUrl,
        replyingTo // Pass the parent comment ID
      );
      
      if (success && comment) {
        // Update the comments state with the new reply
        setComments(prevComments => {
          return prevComments.map(c => {
            if (c.id === replyingTo) {
              // Add the reply to the parent comment
              return {
                ...c,
                replies: [...(c.replies || []), comment]
              };
            }
            return c;
          });
        });
        
        // Reset reply form
        setReplyingTo(null);
        setReplyText('');
        setReplySticker(null);
        toast.success("პასუხი დაემატა!");
        
        // Send notification to comment author if it's not the current user
        if (parentComment.user_id !== ensureUUID(userId)) {
          try {
            const notificationResult = await createNotification(
              parentComment.user_id,
              'comment_reply',
              {
                sender_user_id: userId,
                sender_username: username,
                comment_id: parentComment.id,
                content_id: contentId,
                content_type: contentType,
                comment_snippet: parentComment.text.substring(0, 50) + (parentComment.text.length > 50 ? '...' : '')
              }
            );
            
            if (notificationResult.success) {
              console.log("Reply notification created successfully.");
            } else {
              console.error("Failed to create reply notification:", notificationResult.error);
            }
          } catch (notifError) {
            console.error("Error calling createNotification for reply:", notifError);
          }
        }
      } else {
        console.error('Error posting reply:', error);
        toast.error("პასუხის დამატება ვერ მოხერხდა");
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error("დაფიქსირდა შეცდომა");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Pagination Logic --- 
  const totalCommentsCount = comments.length;
  const totalPagesCalculated = Math.ceil(totalCommentsCount / commentsPerPage);
  
  // Calculate comments for the current page
  const indexOfLastComment = currentPage * commentsPerPage;
  const indexOfFirstComment = indexOfLastComment - commentsPerPage;
  const currentComments = comments.slice(indexOfFirstComment, indexOfLastComment);
  
  // Change page handler
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPagesCalculated) {
      setCurrentPage(pageNumber);
      // Optionally scroll to top of comments section
      // scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  // -----------------------

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="mt-2 text-sm text-white">კომენტარები იტვირთება...</p>
        </div>
      ) : (
        <motion.div 
          className="space-y-6"
          variants={sectionVariants}
          initial="initial"
          animate="animate"
        >
          {/* New comment box */}
          {isAuthenticated ? (
            <motion.div 
              className="mb-6 border border-white/10 p-4 rounded-lg bg-gray-900/70 backdrop-blur-sm shadow-xl"
              variants={itemVariants}
            >
              <div className="flex items-start space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl || ''} alt={username || ''} />
                  <AvatarFallback>
                    <UserCircle className="h-8 w-8 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <Textarea
                    ref={commentBoxRef}
                    value={editingId ? editText : newComment}
                    onChange={(e) => editingId ? setEditText(e.target.value) : setNewComment(e.target.value)}
                    placeholder={editingId ? "დაარედაქტირეთ კომენტარი..." : "დაწერეთ კომენტარი..."}
                    className="resize-none mb-3 bg-gray-800/50 border-white/10 placeholder:text-white/50 h-[40px] focus:border-purple-500/50 transition-colors"
                  />
                
                  {/* Selected sticker preview */}
                  {selectedSticker && !editingId && (
                    <div className="relative inline-block mb-3 ml-1">
                      <div className="relative w-20 h-20 rounded-md overflow-hidden border border-white/10">
                        <Image
                          src={selectedSticker.url}
                          alt={selectedSticker.alt}
                          width={80}
                          height={80}
                          className="object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveSticker}
                        className="absolute -top-2 -right-2 bg-black rounded-full p-0.5 border border-white/10"
                      >
                        <X className="h-3.5 w-3.5 text-white/70" />
                      </button>
                    </div>
                  )}
                
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        role="button"
                        onClick={toggleStickerSelector}
                        className="flex items-center justify-center h-8 w-8 rounded-md text-white/70 hover:text-white hover:bg-white/10 cursor-pointer relative"
                      >
                        <StickyNote className="h-4 w-4" />
                        {showStickerSelector && (
                          <AnimatePresence>
                            <StickerSelector
                              onSelectSticker={handleStickerSelect}
                              onClose={() => setShowStickerSelector(false)}
                            />
                          </AnimatePresence>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handlePostComment} 
                      disabled={((!newComment.trim() && !selectedSticker) || isSubmitting)}
                      className="bg-purple-600 text-white hover:bg-purple-700 transition-all"
                    >
                      {isSubmitting ? 
                        <Loader2 className="h-4 w-4 animate-spin" /> : 
                        editingId ? 'შენახვა' : 'გაგზავნა'
                      }
                      {!isSubmitting && !editingId && <Send className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              {editingId && (
                <div className="mt-2 flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={cancelEdit}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    გაუქმება
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              className="mb-6 border border-white/20 p-4 rounded-md bg-black text-center"
              variants={itemVariants}
            >
              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-white" />
              <p className="text-sm text-white mb-2">კომენტარის დასატოვებლად უნდა იყოთ ავტორიზებული</p>
              <Button 
                onClick={() => router.push('/login')}
                className="bg-white text-black hover:bg-white/80"
              >
                შესვლა
              </Button>
            </motion.div>
          )}

          {/* Comments list */}
          {comments.length === 0 ? (
            <motion.div 
              className="text-center py-8 border border-white/10 rounded-lg bg-gray-900/70 backdrop-blur-sm"
              variants={itemVariants}
            >
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50 text-purple-400" />
              <p className="text-white/70">კომენტარები არ არის</p>
              <p className="text-sm text-white/50 mt-1">იყავით პირველი ვინც დატოვებს კომენტარს!</p>
            </motion.div>
          ) : (
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
                ) : (
                  <div 
                    key={`comments-page-${currentPage}`}
                    className="space-y-4"
                  >
                    {currentComments.map((comment) => (
                      <CommentItem 
                        key={comment.id} 
                        comment={comment} 
                        userId={userId}
                        replyingTo={replyingTo}
                        setReplyingTo={setReplyingTo}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        replySticker={replySticker}
                        setReplySticker={setReplySticker}
                        showReplyStickerSelector={showReplyStickerSelector}
                        setShowReplyStickerSelector={setShowReplyStickerSelector}
                        handleReplyToComment={handleReplyToComment}
                        handlePostReply={handlePostReply}
                        cancelReply={cancelReply}
                        toggleReplyStickerSelector={toggleReplyStickerSelector}
                        handleReplyStickerSelect={handleReplyStickerSelect}
                        handleRemoveReplySticker={handleRemoveReplySticker}
                        replyBoxRef={replyBoxRef}
                        isSubmitting={isSubmitting}
                        avatarUrl={avatarUrl}
                        username={username}
                        handleLikeComment={handleLikeComment}
                        handleEditComment={handleEditComment}
                        handleDeleteComment={handleDeleteComment}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* --- Pagination Controls --- */}
          {totalPagesCalculated > 1 && (
            <motion.div 
              className="flex justify-center items-center gap-2 mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="bg-gray-900/70 border-white/10 hover:bg-gray-800 hover:border-purple-500/30"
              >
                <ChevronLeft className="h-4 w-4" />
                წინა
              </Button>
              
              <div className="flex items-center gap-1">
                {/* Simple page number display for now */} 
                {Array.from({ length: totalPagesCalculated }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="icon"
                    onClick={() => handlePageChange(page)}
                    className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center",
                      currentPage === page 
                        ? "bg-purple-600 text-white font-medium hover:bg-purple-700" 
                        : "bg-gray-900/70 text-white border border-white/10 hover:bg-gray-800/80"
                    )}
                  >
                    {page}
                  </Button>
                ))}
                {/* TODO: Add ellipsis logic for many pages */} 
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPagesCalculated}
                className="bg-gray-900/70 border-white/10 hover:bg-gray-800 hover:border-purple-500/30"
              >
                შემდეგი
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
          {/* ------------------------- */} 
        </motion.div>
      )}
    </div>
  )
}

// Update the comment component
const CommentItem = ({ 
  comment, 
  userId,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  replySticker,
  setReplySticker,
  showReplyStickerSelector,
  setShowReplyStickerSelector,
  handleReplyToComment,
  handlePostReply,
  cancelReply,
  toggleReplyStickerSelector,
  handleReplyStickerSelect,
  handleRemoveReplySticker,
  replyBoxRef,
  isSubmitting,
  avatarUrl,
  username,
  handleLikeComment,
  handleEditComment,
  handleDeleteComment
}: { 
  comment: Comment, 
  userId: string | null,
  replyingTo: string | null,
  setReplyingTo: (id: string | null) => void,
  replyText: string,
  setReplyText: (text: string) => void,
  replySticker: Sticker | null,
  setReplySticker: (sticker: Sticker | null) => void,
  showReplyStickerSelector: boolean,
  setShowReplyStickerSelector: (show: boolean) => void,
  handleReplyToComment: (id: string) => void,
  handlePostReply: () => void,
  cancelReply: () => void,
  toggleReplyStickerSelector: () => void,
  handleReplyStickerSelect: (sticker: Sticker) => void,
  handleRemoveReplySticker: () => void,
  replyBoxRef: React.RefObject<HTMLTextAreaElement>,
  isSubmitting: boolean,
  avatarUrl: string | null,
  username: string | null,
  handleLikeComment: (comment: Comment) => void,
  handleEditComment: (comment: Comment) => void,
  handleDeleteComment: (commentId: string) => Promise<void>
}) => {
  // Use the inline function to check if comment is own, rather than reference to isOwnComment
  const isOwn = (() => {
    if (!userId) return false;
    return comment.user_id === ensureUUID(userId);
  })();
  
  const hasMedia = comment.media_url && comment.media_url.trim() !== '';
  const isSticker = hasMedia && (
    comment.media_url.includes('/stickers/') || 
    comment.media_url.includes('tenor.com') || 
    comment.media_url.includes('.gif')
  );
  
  return (
    <motion.div
      key={comment.id}
      className="border border-white/10 p-4 rounded-lg bg-gray-900/70 backdrop-blur-sm mb-4 shadow-lg hover:border-purple-500/20 transition-all"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-white/10">
          <AvatarImage src={comment.user_profile?.avatar_url || ''} alt={comment.user_profile?.username || ''} />
          <AvatarFallback>
            <UserCircle className="h-8 w-8 text-white" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">
                {comment.user_profile?.username || 'User'}
              </span>
              <span className="text-xs text-white/50">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {isOwn && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditComment(comment)}
                  className="h-7 w-7 text-white/70 hover:text-white"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="h-7 w-7 text-white/70 hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          
          {comment.text && (
            <div className="text-sm text-white mb-3">
              {comment.text}
            </div>
          )}
          
          {/* Display sticker if available */}
          {isSticker && (
            <div className="mb-3 max-w-[200px] bg-black/30 p-1 rounded-md border border-white/5 inline-block">
              <Image
                src={comment.media_url}
                alt="Sticker"
                width={200}
                height={200} 
                className="rounded object-contain"
              />
            </div>
          )}
          
          {/* Display other media if available */}
          {hasMedia && !isSticker && (
            <div className="mb-3">
              <img 
                src={comment.media_url} 
                alt="Media" 
                className="rounded-md max-h-[300px] w-auto" 
              />
            </div>
          )}
          
          <div className="mt-3 flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLikeComment(comment)}
              className={cn(
                "px-2 h-7 text-xs flex items-center gap-1 rounded-full",
                comment.user_has_liked ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <ThumbsUp className={cn("h-3.5 w-3.5", comment.user_has_liked && "fill-white")} />
              <span>{comment.like_count || 0}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReplyToComment(comment.id)}
              className="px-2 h-7 text-xs text-white/60 hover:text-white hover:bg-white/5 rounded-full"
            >
              პასუხი
            </Button>
          </div>
          
          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="ml-3 pl-3 border-l border-white/10 space-y-3">
                {comment.replies.map(reply => (
                  <ReplyItem 
                    key={reply.id} 
                    reply={reply} 
                    parentComment={comment} 
                    userId={userId}
                    handleLikeComment={handleLikeComment}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Reply form */}
          {replyingTo === comment.id && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-start gap-2">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage src={avatarUrl || ''} alt={username || ''} />
                  <AvatarFallback>
                    <UserCircle className="h-6 w-6 text-white" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <Textarea
                    ref={replyBoxRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="დაწერეთ პასუხი..."
                    className="resize-none mb-2 bg-black border-white/20 placeholder:text-white/50 h-[40px] text-sm"
                  />
                  
                  {/* Selected reply sticker preview */}
                  {replySticker && (
                    <div className="relative inline-block mb-3">
                      <div className="relative w-16 h-16 rounded-md overflow-hidden border border-white/10">
                        <Image
                          src={replySticker.url}
                          alt={replySticker.alt}
                          width={64}
                          height={64}
                          className="object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveReplySticker}
                        className="absolute -top-2 -right-2 bg-black rounded-full p-0.5 border border-white/10"
                      >
                        <X className="h-3.5 w-3.5 text-white/70" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelReply}
                        className="h-7 text-white/70 hover:text-white"
                      >
                        გაუქმება
                      </Button>
                      
                      <div 
                        role="button"
                        onClick={toggleReplyStickerSelector}
                        className="flex items-center justify-center h-7 px-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 cursor-pointer relative"
                      >
                        <StickyNote className="h-3.5 w-3.5" />
                        {showReplyStickerSelector && (
                          <AnimatePresence>
                            <StickerSelector
                              onSelectSticker={handleReplyStickerSelect}
                              onClose={() => setShowReplyStickerSelector(false)}
                            />
                          </AnimatePresence>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={handlePostReply}
                      disabled={(!replyText.trim() && !replySticker) || isSubmitting}
                      className="h-7 bg-white text-black hover:bg-white/80"
                    >
                      {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'პასუხი'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Reply item component
const ReplyItem = ({ 
  reply, 
  parentComment, 
  userId,
  handleLikeComment 
}: { 
  reply: Comment, 
  parentComment: Comment, 
  userId: string | null,
  handleLikeComment: (comment: Comment) => void
}) => {
  // Use the inline function to check if comment is own, rather than reference to isOwnComment
  const isOwn = (() => {
    if (!userId) return false;
    return reply.user_id === ensureUUID(userId);
  })();
  
  const hasMedia = reply.media_url && reply.media_url.trim() !== '';
  const isSticker = hasMedia && (
    reply.media_url.includes('/stickers/') || 
    reply.media_url.includes('tenor.com') || 
    reply.media_url.includes('.gif')
  );
  
  return (
    <div className="flex gap-2 hover:bg-gray-800/40 p-2 rounded-lg transition-colors">
      <Avatar className="h-6 w-6 flex-shrink-0 ring-1 ring-white/10">
        <AvatarImage src={reply.user_profile?.avatar_url || ''} alt={reply.user_profile?.username || ''} />
        <AvatarFallback>
          <UserCircle className="h-6 w-6 text-white" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm text-white">
              {reply.user_profile?.username || 'User'}
            </span>
            <span className="text-xs text-white/50">
              {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
            </span>
          </div>
          
          {isOwn && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteComment(reply.id)}
                className="h-6 w-6 text-white/70 hover:text-white"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        
        {reply.text && (
          <div className="text-xs text-white mb-2">
            {reply.text}
          </div>
        )}
        
        {/* Display sticker if available */}
        {isSticker && (
          <div className="mb-2 max-w-[150px] bg-black/30 p-1 rounded-md border border-white/5 inline-block">
            <Image
              src={reply.media_url}
              alt="Sticker"
              width={150}
              height={150} 
              className="rounded object-contain"
            />
          </div>
        )}
        
        {/* Display other media if available */}
        {hasMedia && !isSticker && (
          <div className="mb-2">
            <img 
              src={reply.media_url} 
              alt="Media" 
              className="rounded-md max-h-[200px] w-auto" 
            />
          </div>
        )}
        
        <div className="mt-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleLikeComment(reply)}
            className={cn(
              "px-1.5 h-6 text-xs flex items-center gap-1 rounded-full",
              reply.user_has_liked ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <ThumbsUp className={cn("h-3 w-3", reply.user_has_liked && "fill-white")} />
            <span>{reply.like_count || 0}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}; 