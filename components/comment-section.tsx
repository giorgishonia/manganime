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
  ChevronRight,
  CornerUpLeft
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ka } from 'date-fns/locale'
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

// Define UserProfile interface with is_vip property
interface UserProfile {
  username: string;
  avatar_url: string;
  is_vip?: boolean;
}

// Extended Comment interface that includes the properties used in this component
interface CommentWithDetails extends Comment {
  media_url?: string;
  user_profile?: UserProfile;
  like_count?: number;
  user_has_liked?: boolean;
  replies?: CommentWithDetails[];
}

// Placeholder type for the return value of the assumed paginated function
type PaginatedCommentsResponse = {
  success: boolean;
  comments: CommentWithDetails[];
  totalCount: number | null;
  error?: any;
};

// Placeholder for the actual paginated fetching function
async function getPaginatedComments(
  contentId: string,
  contentType: 'anime' | 'manga' | 'comics',
  page: number,
  limit: number
): Promise<PaginatedCommentsResponse> {
  console.warn("Using placeholder getPaginatedComments. Implement actual fetching in lib/comments.ts");
  
  const { success, comments, error } = await getAllComments(contentId, contentType);
  if (!success || !comments) {
    return { success: false, comments: [], totalCount: 0, error };
  }
  const totalCount = comments.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedComments = comments.slice(startIndex, endIndex);
  return { success: true, comments: paginatedComments, totalCount, error: null };
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
  
  const [comments, setComments] = useState<CommentWithDetails[]>([])
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
  const [commentToDelete, setCommentToDelete] = useState<CommentWithDetails | null>(null)
  
  const commentBoxRef = useRef<HTMLTextAreaElement>(null)
  const replyBoxRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [commentsPerPage] = useState(5) // Comments per page

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
  useEffect(() => {
    if (!isLoading && contentId) {
      getAllComments(contentId, contentType, userId).then(({ success, comments }) => {
        if (success && comments) {
          setComments(comments);
        }
      });
    }
  }, [isAuthenticated, userId, avatarUrl, contentId, contentType, isLoading]);

  // Auto focus when editing or replying
  useEffect(() => {
    if (editingId && commentBoxRef.current) {
      commentBoxRef.current.focus()
    }
    if (replyingTo && replyBoxRef.current) {
        replyBoxRef.current.focus();
    }
  }, [editingId, replyingTo])

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

  // Submit a new comment or save an edit
  const handlePostOrUpdateComment = async () => {
    if (editingId) {
      await saveEdit();
    } else {
      await handlePostComment();
    }
  };

  // Submit a new comment
  const handlePostComment = async () => {
    if (!newComment.trim() && !selectedSticker) return
    
    if (!isAuthenticated || !userId) {
      toast.error("კომენტარის დასატოვებლად უნდა იყოთ ავტორიზებული.");
      router.push('/login')
      return
    }

    try {
      setIsSubmitting(true)
      
      const tableCheck = await ensureCommentsTable();
      if (!tableCheck.success) {
        console.error("Failed to ensure comments table structure:", tableCheck.error);
        toast.error("სერვერის პრობლემა. გთხოვთ, სცადოთ ხელახლა ცოტა ხანში.");
        return;
      }
      
      const mediaUrl = selectedSticker ? selectedSticker.url : null
      
      const { success, comment, error } = await addComment(
        userId,
        contentId,
        contentType,
        newComment.trim(),
        username || 'მომხმარებელი',
        avatarUrl,
        mediaUrl
      )
      
      if (success && comment) {
        // Add to the beginning of the full comments list
        setComments(prevComments => [comment, ...prevComments])
        // If on a page other than 1, new comment might not be visible, consider going to page 1
        // For simplicity now, it just adds to the master list.
        setCurrentPage(1); // Go to first page to see new comment
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
  const isOwnComment = (comment: CommentWithDetails): boolean => {
    if (!userId) return false
    return comment.user_id === ensureUUID(userId);
  }

  // Start editing a comment
  const handleEditComment = (comment: CommentWithDetails) => {
    setEditingId(comment.id)
    setEditText(comment.text)
    setEditMedia(comment.media_url || null)
    setSelectedSticker(null) // Clear main sticker selector when editing
    if (comment.media_url && comment.media_url.startsWith('http')) { // Assuming stickers are URLs
        // Attempt to find sticker object if media_url matches a known sticker
        // This part is tricky if you don't have the original sticker objects easily available.
        // For now, we just set editMedia. If you have a list of all possible stickers, you could find it here.
    }
    setShowStickerSelector(false);
    if(commentBoxRef.current) commentBoxRef.current.focus();
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
        editMedia // This now correctly passes the media_url for the sticker or other media
      )
      
      if (success && comment) {
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
    // If editing, this means we want to remove the sticker/media from the comment upon saving
  }

  // Handle deleting a comment - NOW SETS STATE TO SHOW CONFIRMATION
  const handleDeleteCommentRequest = (commentToConfirm: CommentWithDetails) => {
    if (!userId) return; // Should not happen if button is shown correctly
    setCommentToDelete(commentToConfirm);
  };

  // Actual deletion logic after confirmation
  const confirmActualDelete = async () => {
    if (!commentToDelete || !userId) return;

    try {
      // Call the existing deleteComment function from lib/comments
      const { success, error } = await deleteComment(commentToDelete.id, userId);

      if (success) {
        setComments(prevComments => prevComments.filter(c => c.id !== commentToDelete.id));
        toast.success("კომენტარი წაიშალა");
      } else {
        console.error('Error deleting comment:', error);
        toast.error("კომენტარის წაშლა ვერ მოხერხდა");
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error("დაფიქსირდა შეცდომა კომენტარის წაშლისას");
    } finally {
      setCommentToDelete(null); // Hide modal
    }
  };

  const cancelActualDelete = () => {
    setCommentToDelete(null); // Hide modal
  };

  // Function to update like state locally
  const updateLocalLikeState = (commentId: string, liked: boolean, newCount: number) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, user_has_liked: liked, like_count: newCount };
      }
      if (c.replies && c.replies.length > 0) {
        let replyUpdated = false;
        const updatedReplies = c.replies.map(r => {
          if (r.id === commentId) {
            replyUpdated = true;
            return { ...r, user_has_liked: liked, like_count: newCount };
          }
          return r;
        });
        if (replyUpdated) {
          return { ...c, replies: updatedReplies };
        }
      }
      return c;
    }));
  };

  // Handle Liking a comment or reply
  const handleLikeCommentOrReply = async (item: CommentWithDetails) => {
    if (!isAuthenticated || !userId) {
      toast.error("კომენტარების მოსაწონებლად უნდა იყოთ ავტორიზებული");
      router.push('/login');
      return;
    }

    const originalLiked = item.user_has_liked ?? false; 
    const originalCount = item.like_count || 0;
    const optimisticNewLiked = !originalLiked;
    const optimisticNewCount = optimisticNewLiked ? originalCount + 1 : Math.max(0, originalCount - 1);

    updateLocalLikeState(item.id, optimisticNewLiked, optimisticNewCount);

    try {
      const { success, liked, newLikeCount, error } = await toggleCommentLike(item.id, userId);

      if (!success) {
        updateLocalLikeState(item.id, originalLiked, originalCount);
        toast.error("მოწონების განახლება ვერ მოხერხდა");
        console.error("Like toggle error:", error);
        return;
      }
      // The backend now returns the definitive state, so update with that.
      updateLocalLikeState(item.id, liked, newLikeCount);
      
      if (liked && item.user_id !== ensureUUID(userId)) {
        const parentCommentForNotification = item.parent_comment_id 
            ? comments.find(c => c.id === item.parent_comment_id) 
            : item;
        if (!parentCommentForNotification) return;

        console.log(`Attempting to send 'like' notification to user: ${item.user_id}`);
        try {
           const notificationType = contentType === 'comics' ? 'manga' : contentType;
           const notificationResult = await createNotification( 
               item.user_id, 
               'comment_like', 
               { 
                 sender_user_id: userId, 
                 sender_username: username, 
                 comment_id: item.id, 
                 content_id: contentId, 
                 content_type: notificationType, 
                 comment_snippet: item.text.substring(0, 50) + (item.text.length > 50 ? '...' : '') 
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
    } catch (err) {
      updateLocalLikeState(item.id, originalLiked, originalCount);
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
    setShowReplyStickerSelector(false);
    setTimeout(() => replyBoxRef.current?.focus(), 0);
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
  
  const handleRemoveReplySticker = () => {
    setReplySticker(null);
  };
  
  const toggleReplyStickerSelector = () => {
    setShowReplyStickerSelector(!showReplyStickerSelector);
  };

  // Submit a reply
  const handlePostReply = async () => {
    if (!replyingTo || (!replyText.trim() && !replySticker) || !isAuthenticated || !userId) {
      if(!isAuthenticated) toast.error("პასუხის დასატოვებლად უნდა იყოთ ავტორიზებული.")
      return;
    }

    try {
      setIsSubmitting(true);
      const tableCheck = await ensureCommentsTable();
      if (!tableCheck.success) {
        toast.error("სერვერის პრობლემა. გთხოვთ, სცადოთ ხელახლა ცოტა ხანში.");
        return;
      }
      
      const parentComment = comments.flatMap(c => [c, ...(c.replies || [])]).find(c => c.id === replyingTo);
      if (!parentComment) {
        toast.error("კომენტარი ვერ მოიძებნა");
        return;
      }
      
      const mediaUrl = replySticker ? replySticker.url : null;
      
      const { success, comment: newReply, error } = await addComment(
        userId,
        contentId,
        contentType,
        replyText.trim(),
        username || 'მომხმარებელი',
        avatarUrl,
        mediaUrl,
        replyingTo // Pass the parent comment ID
      );
      
      if (success && newReply) {
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === replyingTo ? { ...c, replies: [...(c.replies || []), newReply] } : c
          )
        );
        
        setReplyingTo(null);
        setReplyText('');
        setReplySticker(null);
        toast.success("პასუხი დაემატა!");
        
        if (parentComment.user_id !== ensureUUID(userId)) {
          try {
            const notificationType = contentType === 'comics' ? 'manga' : contentType;
            const notificationResult = await createNotification(
              parentComment.user_id,
              'comment_reply',
              {
                sender_user_id: userId,
                sender_username: username,
                comment_id: parentComment.id,
                content_id: contentId,
                content_type: notificationType,
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
  const allTopLevelComments = comments;
  const totalTopLevelCommentsCount = allTopLevelComments.length;
  const totalPagesCalculated = Math.ceil(totalTopLevelCommentsCount / commentsPerPage);
  
  const indexOfLastTopLevelComment = currentPage * commentsPerPage;
  const indexOfFirstTopLevelComment = indexOfLastTopLevelComment - commentsPerPage;
  const currentTopLevelComments = allTopLevelComments.slice(indexOfFirstTopLevelComment, indexOfLastTopLevelComment);
  
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPagesCalculated) {
      setCurrentPage(pageNumber);
    }
  };

  // Combined state for edit sticker selection
  const [showEditStickerSelector, setShowEditStickerSelector] = useState(false);
  const handleEditStickerSelect = (sticker: Sticker) => {
    setEditMedia(sticker.url);
    setShowEditStickerSelector(false);
  };
  const toggleEditStickerSelector = () => {
    setShowEditStickerSelector(!showEditStickerSelector);
  };

  return (
    <div className="w-full mt-8 md:mt-12"> {/* Added margin top */} 
      {/* New comment box / Edit comment box */} 
      {isAuthenticated ? (
        <motion.div 
          className="mb-6 p-4 rounded-lg bg-transparent border border-white/10 shadow-md" // Transparent BG, border
          variants={itemVariants}
        >
          <div className="flex items-start space-x-3">
            <Avatar className="h-10 w-10 flex-shrink-0"> {/* Slightly larger avatar */} 
              <AvatarImage src={avatarUrl || ''} alt={username || 'მომხმარებელი'} />
              <AvatarFallback>
                <UserCircle className="h-10 w-10 text-white/70" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <Textarea
                ref={commentBoxRef}
                value={editingId ? editText : newComment}
                onChange={(e) => editingId ? setEditText(e.target.value) : setNewComment(e.target.value)}
                placeholder={editingId ? "კომენტარის რედაქტირება..." : "დაწერეთ კომენტარი..."}
                className="resize-none mb-3 bg-transparent border-white/20 placeholder:text-white/50 focus:border-purple-500/60 transition-colors duration-150 p-3 rounded-md text-white" // Transparent BG, improved focus
                rows={editingId || newComment.length > 70 ? 3 : 1} // Dynamic rows
              />
            
              {/* Sticker/Media Preview Area */} 
              {(editingId && editMedia) || (!editingId && selectedSticker) ? (
                <div className="relative inline-block mb-3 ml-1 group">
                  <div className="relative w-24 h-24 rounded-md overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
                    <Image
                      src={editingId ? editMedia! : selectedSticker!.url}
                      alt={editingId ? "მედია" : selectedSticker!.alt}
                      width={96}
                      height={96}
                      className="object-contain max-w-full max-h-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={editingId ? handleRemoveEditMedia : handleRemoveSticker}
                    className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    title={editingId ? "მედიის წაშლა" : "სტიკერის წაშლა"}
                  >
                    <X className="h-3.5 w-3.5 text-white/80" />
                  </button>
                </div>
              ) : null}
            
              <div className="flex justify-between items-center mt-1">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={editingId ? toggleEditStickerSelector : toggleStickerSelector}
                    className="h-9 w-9 text-white/70 hover:text-purple-400 hover:bg-purple-500/10 relative"
                    title="სტიკერის დამატება"
                  >
                    <StickyNote className="h-5 w-5" />
                    {(showStickerSelector && !editingId) && (
                      <StickerSelector
                        onSelectSticker={handleStickerSelect}
                        onClose={() => setShowStickerSelector(false)}
                      />
                    )}
                    {(showEditStickerSelector && editingId) && (
                        <StickerSelector
                            onSelectSticker={handleEditStickerSelect} // Use specific handler for edit mode
                            onClose={() => setShowEditStickerSelector(false)}
                        />
                    )}
                  </Button>
                  {/* Add more media buttons here if needed */}
                </div>
                
                <div className="flex items-center gap-2">
                    {editingId && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={cancelEdit}
                            className="text-white/70 hover:text-white hover:bg-white/10 px-3 py-1.5 h-auto"
                        >
                            გაუქმება
                        </Button>
                    )}
                    <Button 
                      onClick={handlePostOrUpdateComment} 
                      disabled={((editingId ? !editText.trim() && !editMedia : !newComment.trim() && !selectedSticker)) || isSubmitting}
                      className="bg-purple-600 text-white hover:bg-purple-500 transition-colors duration-150 px-4 py-2 h-auto text-sm rounded-md"
                    >
                        {isSubmitting ? 
                          <Loader2 className="h-4 w-4 animate-spin" /> : 
                          editingId ? 'შენახვა' : 'გამოქვეყნება'
                        }
                        {!isSubmitting && <Send className="ml-2 h-4 w-4" />}
                    </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          className="mb-6 border border-white/10 p-6 rounded-lg bg-transparent text-center shadow-sm"
          variants={itemVariants}
        >
          <AlertCircle className="h-8 w-8 mx-auto mb-3 text-purple-400" />
          <p className="text-white mb-3">კომენტარის დასატოვებლად გაიარეთ ავტორიზაცია.</p>
          <Button 
            onClick={() => router.push('/login')}
            className="bg-purple-600 text-white hover:bg-purple-500 transition-colors duration-150"
          >
            ავტორიზაცია
          </Button>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
          <p className="mt-3 text-sm text-white/70">კომენტარები იტვირთება...</p>
        </div>
      ) : currentTopLevelComments.length === 0 ? (
        <motion.div 
          className="text-center py-10 border border-dashed border-white/10 rounded-lg bg-transparent mt-4"
          variants={itemVariants}
        >
          <MessageSquare className="h-10 w-10 mx-auto mb-3 text-purple-400/70" />
          <p className="text-white/70">კომენტარები ჯერ არ არის.</p>
          <p className="text-sm text-white/50 mt-1">იყავით პირველი!</p>
          <img src="/images/mascot/no-comments.png" alt="No comments mascot" className="mx-auto mt-4 w-32 h-32" />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-5">
          {currentTopLevelComments.map((comment) => (
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
              handleLikeCommentOrReply={handleLikeCommentOrReply}
              handleEditComment={handleEditComment}
              handleDeleteComment={handleDeleteCommentRequest}
            />
          ))}
        </motion.div>
      )}

      {totalPagesCalculated > 1 && (
        <motion.div 
          className="flex justify-center items-center gap-2 mt-10 pt-4 border-t border-white/10"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="bg-transparent border-white/20 text-white/80 hover:bg-white/5 hover:border-purple-500/50 transition-colors duration-150"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            წინა
          </Button>
          
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPagesCalculated }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "ghost"}
                size="icon"
                onClick={() => handlePageChange(page)}
                className={cn(
                  "h-9 w-9 rounded-md text-sm flex items-center justify-center transition-colors duration-150",
                  currentPage === page 
                    ? "bg-purple-600 text-white font-medium hover:bg-purple-500 shadow-md"
                    : "bg-transparent text-white/70 border border-white/20 hover:bg-white/5 hover:border-purple-500/50 hover:text-white"
                )}
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPagesCalculated}
            className="bg-transparent border-white/20 text-white/80 hover:bg-white/5 hover:border-purple-500/50 transition-colors duration-150"
          >
            შემდეგი
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {commentToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={cancelActualDelete} // Click outside to cancel
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-gray-900 p-6 rounded-lg shadow-xl border border-gray-700 max-w-sm w-full text-center relative"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
              <button 
                onClick={cancelActualDelete}
                className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-700/80 text-gray-400 hover:text-white transition-colors"
                title="დახურვა"
              >
                <X className="h-5 w-5" />
              </button>
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">კომენტარის წაშლა</h3>
              <p className="text-sm text-gray-300 mb-6">
                დარწმუნებული ხართ, რომ გსურთ ამ კომენტარის წაშლა?
              </p>
              <div className="flex justify-center gap-3">
                <Button 
                  variant="outline"
                  onClick={cancelActualDelete}
                  className="border-gray-600 hover:bg-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-6"
                >
                  არა
                </Button>
                <Button 
                  variant="destructive"
                  onClick={confirmActualDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-6"
                >
                  დიახ
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

const CommentItem = ({ 
  comment, userId, replyingTo, setReplyingTo, replyText, setReplyText, replySticker, setReplySticker,
  showReplyStickerSelector, setShowReplyStickerSelector, handleReplyToComment, handlePostReply, cancelReply,
  toggleReplyStickerSelector, handleReplyStickerSelect, handleRemoveReplySticker, replyBoxRef, isSubmitting,
  avatarUrl, username, handleLikeCommentOrReply, handleEditComment, handleDeleteComment
}: { 
  comment: CommentWithDetails; userId: string | null; replyingTo: string | null; setReplyingTo: (id: string | null) => void;
  replyText: string; setReplyText: (text: string) => void; replySticker: Sticker | null; setReplySticker: (sticker: Sticker | null) => void;
  showReplyStickerSelector: boolean; setShowReplyStickerSelector: (show: boolean) => void;
  handleReplyToComment: (id: string) => void; handlePostReply: () => void; cancelReply: () => void;
  toggleReplyStickerSelector: () => void; handleReplyStickerSelect: (sticker: Sticker) => void;
  handleRemoveReplySticker: () => void; replyBoxRef: React.RefObject<HTMLTextAreaElement>;
  isSubmitting: boolean; avatarUrl: string | null; username: string | null;
  handleLikeCommentOrReply: (comment: CommentWithDetails) => void; 
  handleEditComment: (comment: CommentWithDetails) => void; 
  handleDeleteComment: (comment: CommentWithDetails) => void;
}) => {
  const isOwn = (() => userId && comment.user_id === ensureUUID(userId))();
  const hasMedia = comment.media_url && comment.media_url.trim() !== '';
  const isSticker = hasMedia && (comment.media_url?.includes('/stickers/') || comment.media_url?.includes('tenor.com') || comment.media_url?.endsWith('.gif'));
  
  return (
    <motion.div
      key={comment.id}
      className="p-4 rounded-lg bg-transparent border border-white/10 shadow-sm hover:border-purple-500/30 transition-all duration-150 ease-in-out relative"
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex gap-3.5">
        <Avatar className="h-9 w-9 flex-shrink-0 ring-1 ring-white/15"> {/* Slightly smaller avatar for items */}
          <AvatarImage src={comment.user_profile?.avatar_url || ''} alt={comment.user_profile?.username || 'Avatar'} />
          <AvatarFallback>
            <UserCircle className="h-9 w-9 text-white/60" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-start mb-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-white flex items-center">
                {comment.user_profile?.username || 'მომხმარებელი'}
                {comment.user_profile?.is_vip && <VIPBadge className="ml-1.5" />} 
              </span>
              <span className="text-xs text-white/50 whitespace-nowrap">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ka })}
              </span>
            </div>
            
            {isOwn && (
              <div className="flex items-center gap-0.5 absolute top-2 right-2 bg-gray-800/50 p-0.5 rounded-md"> {/* Positioned top-right */} 
                <Button variant="ghost" size="icon" onClick={() => handleEditComment(comment)} className="h-7 w-7 text-white/60 hover:text-purple-300 hover:bg-purple-500/20" title="რედაქტირება">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteComment(comment)} className="h-7 w-7 text-white/60 hover:text-red-400 hover:bg-red-500/20" title="წაშლა">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {comment.text && (
            <p className="text-sm text-white/90 mb-2 whitespace-pre-wrap break-words">
              {comment.text}
            </p>
          )}
          
          {isSticker && (
            <div className="mb-2 max-w-[180px] bg-transparent p-0.5 rounded-md border border-white/10 inline-block shadow-sm">
              <Image src={comment.media_url || ''} alt="სტიკერი" width={180} height={180} className="rounded object-contain" />
            </div>
          )}
          {!isSticker && hasMedia && (
            <div className="mb-2">
              <img src={comment.media_url || ''} alt="მედია" className="rounded-md max-h-[250px] w-auto border border-white/10 shadow-sm" />
            </div>
          )}
          
          <div className="mt-2.5 flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLikeCommentOrReply(comment)}
              className={cn(
                "px-2.5 py-1 h-auto text-xs flex items-center gap-1.5 rounded-full transition-colors duration-150",
                comment.user_has_liked 
                  ? "text-purple-300 bg-purple-500/20 hover:bg-purple-500/30"
                  : "text-white/60 hover:text-purple-300 hover:bg-purple-500/10"
              )}
              title="მოწონება"
            >
              <ThumbsUp className={cn("h-4 w-4", comment.user_has_liked && "fill-purple-300")} />
              <span>{comment.like_count || 0}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReplyToComment(comment.id)}
              className="px-2.5 py-1 h-auto text-xs text-white/60 hover:text-purple-300 hover:bg-purple-500/10 rounded-full transition-colors duration-150 flex items-center gap-1"
              title="პასუხი"
            >
              <CornerUpLeft className="h-4 w-4"/> {/* Changed icon */} 
              პასუხი
            </Button>
          </div>
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="ml-2 pl-3 border-l-2 border-white/10 space-y-3">
                {comment.replies.map(reply => (
                  <ReplyItem 
                    key={reply.id} 
                    reply={reply} 
                    parentCommentId={comment.id} 
                    userId={userId}
                    handleLikeCommentOrReply={handleLikeCommentOrReply}
                    handleDeleteComment={handleDeleteComment}
                    handleEditComment={handleEditComment}
                  />
                ))}
              </div>
            </div>
          )}
          
          {replyingTo === comment.id && (
            <div className="mt-3.5 pt-3 border-t border-white/10">
              <div className="flex items-start gap-2.5">
                <Avatar className="h-8 w-8 flex-shrink-0"> {/* Reply avatar consistent with main input */} 
                  <AvatarImage src={avatarUrl || ''} alt={username || 'მომხმარებელი'} />
                  <AvatarFallback><UserCircle className="h-8 w-8 text-white/70" /></AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <Textarea
                    ref={replyBoxRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="დაწერეთ პასუხი..."
                    className="resize-none mb-2 bg-transparent border-white/20 placeholder:text-white/50 focus:border-purple-500/60 text-sm p-2.5 rounded-md text-white" // Consistent styling
                    rows={replyText.length > 60 ? 2 : 1}
                  />
                  
                  {replySticker && (
                    <div className="relative inline-block mb-2 group">
                      <div className="relative w-20 h-20 rounded-md overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
                        <Image src={replySticker.url} alt={replySticker.alt} width={80} height={80} className="object-contain"/>
                      </div>
                      <button type="button" onClick={handleRemoveReplySticker} className="absolute -top-1.5 -right-1.5 bg-gray-800 rounded-full p-0.5 border border-white/20 opacity-0 group-hover:opacity-100" title="სტიკერის წაშლა">
                        <X className="h-3 w-3 text-white/80" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-0.5">
                    <div className="flex gap-1">
                       <Button variant="ghost" size="icon" onClick={toggleReplyStickerSelector} className="h-8 w-8 text-white/60 hover:text-purple-300 hover:bg-purple-500/10 relative" title="სტიკერის დამატება">
                        <StickyNote className="h-4 w-4" />
                        {showReplyStickerSelector && (
                            <StickerSelector onSelectSticker={handleReplyStickerSelect} onClose={() => setShowReplyStickerSelector(false)}/>
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={cancelReply} className="text-white/60 hover:text-white hover:bg-white/10 px-3 py-1 h-auto text-xs">
                            გაუქმება
                        </Button>
                        <Button size="sm" onClick={handlePostReply} disabled={(!replyText.trim() && !replySticker) || isSubmitting} className="bg-purple-600 text-white hover:bg-purple-500 px-3 py-1 h-auto text-xs rounded-md">
                            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'პასუხი'}
                        </Button>
                    </div>
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

const ReplyItem = ({ 
  reply, parentCommentId, userId, handleLikeCommentOrReply, handleDeleteComment, handleEditComment
}: { 
  reply: CommentWithDetails; parentCommentId: string; userId: string | null;
  handleLikeCommentOrReply: (comment: CommentWithDetails) => void;
  handleDeleteComment: (comment: CommentWithDetails) => void;
  handleEditComment: (comment: CommentWithDetails) => void;
}) => {
  const isOwn = (() => userId && reply.user_id === ensureUUID(userId))();
  const hasMedia = reply.media_url && reply.media_url.trim() !== '';
  const isSticker = hasMedia && (reply.media_url?.includes('/stickers/') || reply.media_url?.includes('tenor.com') || reply.media_url?.endsWith('.gif'));
  
  return (
    <div className="flex gap-2.5 py-2 pr-2 rounded-md hover:bg-white/5 transition-colors duration-150 ease-in-out">
      <Avatar className="h-7 w-7 flex-shrink-0 ring-1 ring-white/10 mt-0.5"> {/* Slightly smaller reply avatar */}
        <AvatarImage src={reply.user_profile?.avatar_url || ''} alt={reply.user_profile?.username || 'Avatar'} />
        <AvatarFallback><UserCircle className="h-7 w-7 text-white/60" /></AvatarFallback>
      </Avatar>
      
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-xs text-white flex items-center">
                {reply.user_profile?.username || 'მომხმარებელი'}
                {reply.user_profile?.is_vip && <VIPBadge className="ml-1" size="sm" />} 
            </span>
            <span className="text-[11px] text-white/50 whitespace-nowrap">
              {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ka })}
            </span>
          </div>
          
          {isOwn && (
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" onClick={() => handleDeleteComment(reply)} className="h-6 w-6 text-white/50 hover:text-red-400 hover:bg-red-500/10" title="წაშლა">
                  <Trash2 className="h-3.5 w-3.5" />
               </Button>
            </div>
          )}
        </div>
        
        {reply.text && (
          <p className="text-xs text-white/80 mb-1.5 whitespace-pre-wrap break-words">
            {reply.text}
          </p>
        )}
        
        {isSticker && (
          <div className="mb-1.5 max-w-[120px] bg-transparent p-0.5 rounded border border-white/5 inline-block shadow-xs">
            <Image src={reply.media_url || ''} alt="სტიკერი" width={120} height={120} className="rounded object-contain" />
          </div>
        )}
        {!isSticker && hasMedia && (
          <div className="mb-1.5">
            <img src={reply.media_url || ''} alt="მედია" className="rounded max-h-[180px] w-auto border border-white/5 shadow-xs" />
          </div>
        )}
        
        <div className="mt-1.5 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleLikeCommentOrReply(reply)}
            className={cn(
              "px-2 py-0.5 h-auto text-xs flex items-center gap-1 rounded-full transition-colors duration-150",
              reply.user_has_liked 
                ? "text-purple-300 bg-purple-500/15 hover:bg-purple-500/25"
                : "text-white/50 hover:text-purple-300 hover:bg-purple-500/10"
            )}
            title="მოწონება"
          >
            <ThumbsUp className={cn("h-3 w-3", reply.user_has_liked && "fill-purple-300")} />
            <span>{reply.like_count || 0}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}; 