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
  XCircle
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
  ensureCommentsTable
} from '@/lib/comments'
import { toast } from 'sonner'
import { useUnifiedAuth } from '@/components/unified-auth-provider'
import { StickerSelector, Sticker } from './sticker-selector'

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
          setComments(comments)
        } else {
          toast.error("Failed to load comments")
        }
      } catch (error) {
        console.error('Error loading comments:', error)
        toast.error("Couldn't connect to the comment server")
      } finally {
        setIsLoading(false)
      }
    }

    loadComments()
  }, [contentId, contentType])

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
        toast.error("You must be logged in to comment")
        return
      }
      
      // Ensure the comments table structure is correct before posting
      const tableCheck = await ensureCommentsTable();
      if (!tableCheck.success) {
        console.error("Failed to ensure comments table structure:", tableCheck.error);
        toast.error("Server issue. Please try again in a moment.");
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
        toast.success("Comment posted!")
      } else {
        console.error('Error posting comment:', error)
        toast.error("Failed to post comment")
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      toast.error("Something went wrong")
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
        toast.success("Comment updated")
      } else {
        console.error('Error updating comment:', error)
        toast.error("Failed to update comment")
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      toast.error("Failed to update comment")
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
      if (window.confirm('Are you sure you want to delete this comment?')) {
        // Delete the comment
        const { success, error } = await deleteComment(commentId, userId)
        
        if (success) {
          // Stickers are pre-defined assets, not user uploads - no need to delete them
          setComments(prevComments => prevComments.filter(c => c.id !== commentId))
          toast.success("Comment deleted")
        } else {
          console.error('Error deleting comment:', error)
          toast.error("Failed to delete comment")
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast.error("Something went wrong")
    }
  }

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
              <AvatarImage src={avatarUrl || ''} alt={username || 'User'} />
              <AvatarFallback className="bg-purple-900 text-white">
                {(username?.[0] || 'U').toUpperCase()}
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
                  <div className="relative w-40 h-40 overflow-hidden rounded-md border border-white/10">
                    <Image 
                      src={selectedSticker.url} 
                      alt={selectedSticker.alt} 
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
                    <StickyNote className="h-4 w-4 mr-2" />
                    სტიკერის დამატება
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  კომენტარის დამატება
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
              შედით სისტემაში თქვენი აზრის გასაზიარებლად და სხვა ფანებთან დასაკავშირებლად.
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
              key="comments"
              className="space-y-4"
            >
              {comments.map((comment) => (
                <motion.div 
                  key={comment.id}
                  className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl p-5 transition-all hover:border-white/10"
                  variants={itemVariants}
                  initial="initial"
                  animate="animate"
                  layout
                >
                  <div className="flex justify-between">
                    <div className="flex gap-3 items-center">
                      <Avatar className="h-10 w-10 border-2 border-purple-500/30">
                        <AvatarImage src={comment.user_profile?.avatar_url || ''} alt={comment.user_profile?.username || 'User'} />
                        <AvatarFallback className="bg-purple-900 text-white">
                          {(comment.user_profile?.username?.[0] || 'U').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{comment.user_profile?.username || 'User'}</p>
                        <p className="text-sm text-gray-400">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          {comment.updated_at && comment.updated_at !== comment.created_at && 
                            ' (რედაქტირებული)'}
                        </p>
                      </div>
                    </div>
                    
                    {isOwnComment(comment) && (
                      <div className="flex gap-2">
                        {editingId !== comment.id && (
                          <>
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
                          </>
                        )}
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
                          <div className="relative w-40 h-40 overflow-hidden rounded-md border border-white/10">
                            <Image 
                              src={editMedia} 
                              alt="Sticker" 
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
                      <p className="mt-3 text-gray-200 whitespace-pre-line">{comment.text}</p>
                      
                      {/* Comment media/sticker */}
                      {comment.media_url && (
                        <div className="mt-3">
                          <div className="relative max-w-[200px] max-h-[200px] overflow-hidden rounded-md border border-white/10 inline-block">
                            <Image 
                              src={comment.media_url} 
                              alt="Comment sticker" 
                              width={200}
                              height={200}
                              className="object-contain"
                            />
                          </div>
                        </div>
                      )}
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