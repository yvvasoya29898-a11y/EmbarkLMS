'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import {
  Trophy,
  Heart,
  HelpCircle,
  Megaphone,
  MessageSquare,
  Send,
  PlusCircle,
  Lock,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  ShieldCheck,
  Trash2,
  Share2
} from 'lucide-react'
import { createPostAction, deletePostAction, toggleLikeAction, addCommentAction, deleteCommentAction } from '@/lib/actions/posts'
import { formatISTDateTime } from '@/lib/date'
import DownloadAppButton from '@/components/DownloadAppButton'
import { useToast } from '@/components/ToastProvider'
import Footer from '@/components/Footer'

interface Post {
  id: string
  content: string
  post_type: string
  image_url?: string | null
  video_url?: string | null
  created_at: string
  profiles: {
    id: string
    full_name: string
    role: string
  } | null
  likes: { user_id: string }[]
  comments: {
    id: string
    content: string
    created_at: string
    user_id: string
    profiles: {
      id: string
      full_name: string
      role: string
    } | null
  }[]
}

interface CommunityClientProps {
  initialPosts: Post[]
  currentUser: User | null
  userRole: 'student' | 'admin' | null
}

const POST_TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; colorClass: string; bgClass: string; borderClass: string }> = {
  achievement: {
    label: 'Achievement',
    icon: Trophy,
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-100'
  },
  thanks: {
    label: 'Say Thanks',
    icon: Heart,
    colorClass: 'text-teal-600',
    bgClass: 'bg-teal-50',
    borderClass: 'border-teal-100'
  },
  help: {
    label: 'Need Help',
    icon: HelpCircle,
    colorClass: 'text-rose-600',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-100'
  },
  announcement: {
    label: 'Announcement',
    icon: Megaphone,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-100'
  },
  update: {
    label: 'Update',
    icon: Sparkles,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-100'
  }
}

export default function CommunityClient({
  initialPosts,
  currentUser,
  userRole
}: CommunityClientProps) {
  const router = useRouter()
  const { toast, confirm } = useToast()
  const posts = initialPosts
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Interactive UI States
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null)

  // Form State
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [postType, setPostType] = useState<'achievement' | 'thanks' | 'help' | 'announcement' | 'update'>('achievement')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!content.trim()) {
      setError('Please write some content before sharing.')
      return
    }

    startTransition(async () => {
      const res = await createPostAction(content, postType, imageUrl, videoUrl)
      
      if (res.error) {
        setError(res.error)
        return
      }

      setContent('')
      setImageUrl('')
      setVideoUrl('')
      if (res.pending) {
        setSuccess('Your post has been submitted to the admin team for approval. It will appear here once approved!')
      } else {
        setSuccess('Post published successfully!')
        // Optimistically reload page or add post to state if we are admin
        router.refresh()
      }
    })
  }

  const handleDeletePost = async (postId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Post',
      message: 'Are you sure you want to permanently delete this post?',
      confirmText: 'Delete',
      isDestructive: true
    })
    if (!isConfirmed) return

    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const res = await deletePostAction(postId)
      if (res.error) {
        setError(res.error)
        return
      }
      setSuccess('Post deleted successfully.')
      router.refresh()
    })
  }

  const handleToggleLike = (postId: string) => {
    if (!currentUser) {
      toast.warning('You must be logged in to like posts.', 'Authentication Required')
      return
    }
    startTransition(async () => {
      const res = await toggleLikeAction(postId)
      if (res.error) {
        toast.error(res.error)
      } else {
        router.refresh()
      }
    })
  }

  const handlePostComment = (e: React.FormEvent, postId: string) => {
    e.preventDefault()
    const commentText = commentDrafts[postId] || ''
    if (!commentText.trim()) return

    if (!currentUser) {
      toast.warning('You must be logged in to post comments.', 'Authentication Required')
      return
    }

    startTransition(async () => {
      const res = await addCommentAction(postId, commentText)
      if (res.error) {
        toast.error(res.error)
      } else {
        setCommentDrafts(prev => ({ ...prev, [postId]: '' }))
        router.refresh()
      }
    })
  }

  const handleDeleteComment = async (commentId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment?',
      confirmText: 'Delete',
      isDestructive: true
    })
    if (!isConfirmed) return

    startTransition(async () => {
      const res = await deleteCommentAction(commentId)
      if (res.error) {
        toast.error(res.error)
      } else {
        router.refresh()
      }
    })
  }

  const handleSharePost = (postId: string) => {
    const shareUrl = `${window.location.origin}/community#post-${postId}`
    navigator.clipboard.writeText(shareUrl)
    setCopiedPostId(postId)
    setTimeout(() => {
      setCopiedPostId(null)
    }, 2000)
  }

  // Filter & Search Logic
  const filteredPosts = posts.filter(post => {
    const matchesFilter =
      activeFilter === 'all' ||
      post.post_type === activeFilter ||
      (activeFilter === 'announcement' && (post.post_type === 'announcement' || post.post_type === 'update'))

    const matchesSearch =
      searchQuery.trim() === '' ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())

    return matchesFilter && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-hidden font-body">
      {/* Brand ambient light decoration */}
      <div className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] bg-primary-light/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0">
            <Image src="/Logo.svg" alt="Embark AI" width={112} height={28} priority className="h-7 sm:h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden md:block">
              <DownloadAppButton />
            </div>
            <Link
              href="/courses"
              className="text-[10px] sm:text-xs font-bold text-slate-600 hover:text-primary transition-colors uppercase tracking-wider font-mono"
            >
              Courses
            </Link>
            <Link
              href="/community"
              className="text-[10px] sm:text-xs font-bold text-primary transition-colors uppercase tracking-wider font-mono border-b-2 border-primary pb-0.5"
            >
              Community
            </Link>
            {currentUser ? (
              <Link
                href="/dashboard"
                className="bg-primary hover:bg-primary-light text-white font-bold py-1.5 px-3 sm:py-2 sm:px-5 rounded-xl text-[10px] sm:text-xs transition-all duration-200 shadow-xs hover:scale-[1.02] cursor-pointer shrink-0"
              >
                My Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-[10px] sm:text-xs font-bold text-slate-600 hover:text-primary transition-colors uppercase tracking-wider font-mono"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-primary hover:bg-primary-light text-white font-bold py-1.5 px-3 sm:py-2 sm:px-5 rounded-xl text-[10px] sm:text-xs transition-all duration-200 shadow-xs hover:scale-[1.02] cursor-pointer shrink-0"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 relative z-10">
        
        {/* Page Hero */}
        <div className="space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Embark AI Network
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-display">
            Welcome to the{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-dark via-primary to-primary-light font-display">
              Embark Community
            </span>
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">
            Connect with other students, share your learning milestones, thank teammates, and read official announcements.
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left / Main Column: Filters & Post Feed */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Filter Tabs & Search Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs">
              {/* Tabs */}
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'achievement', label: '🏆 Achievements' },
                  { id: 'thanks', label: '🙏 Thanks' },
                  { id: 'help', label: '🙋‍♂️ Help' },
                  { id: 'announcement', label: '📢 Updates' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeFilter === tab.id
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search posts or people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full sm:w-60 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
                />
              </div>
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => {
                  const isPostAdmin = post.profiles?.role === 'admin'
                  const typeConfig = POST_TYPE_CONFIG[post.post_type] || {
                    label: post.post_type,
                    icon: MessageSquare,
                    colorClass: 'text-slate-600',
                    bgClass: 'bg-slate-50',
                    borderClass: 'border-slate-100'
                  }
                  const TypeIcon = typeConfig.icon

                  return (
                    <article
                      key={post.id}
                      className={`p-6 rounded-2xl border shadow-xs transition-all duration-200 hover:shadow-md/5 hover:translate-y-[-1px] ${
                        isPostAdmin
                          ? 'border-slate-200/80 border-l-4 border-l-primary bg-gradient-to-br from-primary/[0.03] via-white to-white'
                          : 'border-slate-200/60 bg-white'
                      }`}
                    >
                      {/* Post Header */}
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm text-white select-none shadow-inner ${
                            isPostAdmin
                              ? 'bg-gradient-to-br from-primary-dark via-primary to-primary-light'
                              : 'bg-gradient-to-br from-slate-400 to-slate-500'
                          }`}>
                            {(post.profiles?.full_name || 'U').substring(0, 2).toUpperCase()}
                          </div>
                          
                          {/* Poster Info */}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 text-sm">
                                {post.profiles?.full_name || 'Anonymous User'}
                              </span>
                              {isPostAdmin && (
                                <span className="inline-flex items-center gap-0.5 border border-primary/20 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  <ShieldCheck className="h-3 w-3" />
                                  Staff
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {formatISTDateTime(post.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Post Type Badge */}
                        <div className={`inline-flex items-center gap-1 border ${typeConfig.borderClass} ${typeConfig.bgClass} ${typeConfig.colorClass} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider`}>
                          <TypeIcon className="h-3.5 w-3.5" />
                          <span>{typeConfig.label}</span>
                        </div>
                      </div>

                      {/* Post Content */}
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-body pl-1">
                        {post.content}
                      </p>

                      {/* Image Upload Display */}
                      {post.image_url && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 max-h-96 bg-slate-50 relative aspect-video">
                          <Image
                            src={post.image_url}
                            alt="Uploaded media"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      {/* Video Embed Display */}
                      {post.video_url && (
                        (() => {
                          const embedUrl = getYouTubeEmbedUrl(post.video_url)
                          return embedUrl ? (
                            <div className="mt-4 aspect-video rounded-xl overflow-hidden border border-slate-100 shadow-xs bg-slate-900 relative">
                              <iframe
                                src={embedUrl}
                                className="absolute inset-0 w-full h-full border-none"
                                allowFullScreen
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              />
                            </div>
                          ) : (
                            <div className="mt-3 pl-1">
                              <a href={post.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
                                🎥 Watch Shared Video Link
                              </a>
                            </div>
                          )
                        })()
                      )}
                      
                      {/* Likes, Comments & Share Toolbar */}
                      <div className="border-t border-slate-100 mt-4 pt-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          {/* Like Button */}
                          <button
                            onClick={() => handleToggleLike(post.id)}
                            disabled={isPending}
                            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                              currentUser && post.likes.some(like => like.user_id === currentUser.id)
                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                : 'bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${currentUser && post.likes.some(like => like.user_id === currentUser.id) ? 'fill-rose-500' : ''}`} />
                            <span>{post.likes.length}</span>
                          </button>

                          {/* Comment Toggle Button */}
                          <button
                            onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                              expandedComments[post.id]
                                ? 'bg-primary/5 text-primary border-primary/20'
                                : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>
                              {post.comments.length} {post.comments.length === 1 ? 'Comment' : 'Comments'}
                            </span>
                          </button>
                        </div>

                        {/* Share Button */}
                        <button
                          onClick={() => handleSharePost(post.id)}
                          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                            copiedPostId === post.id
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          <Share2 className="h-4 w-4" />
                          <span>{copiedPostId === post.id ? 'Copied!' : 'Share'}</span>
                        </button>
                      </div>

                      {/* Comments Feed Section */}
                      {expandedComments[post.id] && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                          {/* Comments List */}
                          {post.comments.length > 0 ? (
                            <div className="space-y-3.5 pl-1">
                              {post.comments.map((comment) => {
                                const isCommentAdmin = comment.profiles?.role === 'admin'
                                return (
                                  <div key={comment.id} className="flex gap-2.5 items-start text-xs group">
                                    {/* Avatar */}
                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-inner select-none ${
                                      isCommentAdmin
                                        ? 'bg-gradient-to-br from-primary-dark via-primary to-primary-light'
                                        : 'bg-gradient-to-br from-slate-400 to-slate-500'
                                    }`}>
                                      {(comment.profiles?.full_name || 'U').substring(0, 2).toUpperCase()}
                                    </div>
                                    
                                    {/* Comment Bubble */}
                                    <div className="flex-1 bg-slate-50 rounded-2xl py-2.5 px-3.5 border border-slate-200/40 relative">
                                      <div className="flex items-center justify-between gap-3 mb-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-slate-900 text-[11px]">
                                            {comment.profiles?.full_name || 'Anonymous User'}
                                          </span>
                                          {isCommentAdmin && (
                                            <span className="inline-flex items-center border border-primary/20 bg-primary/10 text-primary text-[8px] font-bold px-1.5 py-0.2 rounded-md">
                                              Staff
                                            </span>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-slate-400">
                                            {formatISTDateTime(comment.created_at)}
                                          </span>
                                          
                                          {/* Delete button (Admin can delete any comment, owner can delete own comment) */}
                                          {(userRole === 'admin' || (currentUser && currentUser.id === comment.user_id)) && (
                                            <button
                                              onClick={() => handleDeleteComment(comment.id)}
                                              className="opacity-0 group-hover:opacity-100 text-[10px] text-rose-600 hover:text-rose-700 transition-opacity font-semibold cursor-pointer"
                                              title="Delete Comment"
                                            >
                                              Delete
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[11px] font-body pl-0.5">
                                        {comment.content}
                                      </p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200/60 text-slate-400 text-[11px]">
                              No comments yet. Be the first to reply!
                            </div>
                          )}

                          {/* Add Comment Form */}
                          {currentUser ? (
                            <form onSubmit={(e) => handlePostComment(e, post.id)} className="flex gap-2.5 items-end pl-0.5">
                              <textarea
                                value={commentDrafts[post.id] || ''}
                                onChange={(e) => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                placeholder="Write a comment..."
                                rows={1}
                                className="flex-1 border border-slate-200 rounded-xl py-2 px-3.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50/50 resize-none h-9 pt-2.5"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handlePostComment(e, post.id)
                                  }
                                }}
                              />
                              <button
                                type="submit"
                                disabled={isPending || !(commentDrafts[post.id] || '').trim()}
                                className="bg-primary hover:bg-primary-light text-white font-bold h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          ) : (
                            <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-150 text-[11px] text-slate-500">
                              Please <Link href="/auth/login?next=/community" className="text-primary font-semibold hover:underline">log in</Link> to post a comment.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Admin Deletion Moderation */}
                      {userRole === 'admin' && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            disabled={isPending}
                            className="text-xs text-rose-655 hover:text-rose-700 font-semibold flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Post
                          </button>
                        </div>
                      )}
                    </article>
                  )
                })
              ) : (
                <div className="text-center bg-white border border-slate-200/60 rounded-2xl p-16">
                  <div className="text-4xl mb-3">🌌</div>
                  <h3 className="text-slate-800 font-bold font-display text-base">No posts found</h3>
                  <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No posts matched your current search filters. Try clearing some criteria.'
                      : 'The community is quiet. Be the first to share your thoughts or ask a question!'}
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Create Post / Login CTA */}
          <div className="space-y-6">
            
            {/* Create Post Section */}
            {currentUser ? (
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-xs sticky top-24">
                <h3 className="text-slate-900 font-bold font-display text-base mb-4 flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  Share with Community
                </h3>

                <form onSubmit={handleCreatePost} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2 text-emerald-800 text-xs">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{success}</span>
                    </div>
                  )}

                  {/* Post Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Category
                    </label>
                    <select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value as 'achievement' | 'thanks' | 'help' | 'announcement' | 'update')}
                      className="w-full border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50/50 cursor-pointer font-medium"
                    >
                      <option value="achievement">🏆 Share Achievement</option>
                      <option value="thanks">🙏 Say Thanks</option>
                      <option value="help">🙋‍♂️ Need Help</option>
                      {userRole === 'admin' && (
                        <>
                          <option value="announcement">📢 Post Announcement</option>
                          <option value="update">📢 Post Update</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Content Area */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Message
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={
                        postType === 'achievement'
                          ? 'What did you accomplish? Did you pass a quiz, build a project, or finish a class?'
                          : postType === 'thanks'
                          ? 'Who helped you? Tag them and write a small thank you note.'
                          : postType === 'help'
                          ? 'What concept or bug are you stuck on? Be descriptive so others can help.'
                          : 'Write the official update or announcement...'
                      }
                      rows={5}
                      className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50/50 resize-y"
                    />
                  </div>

                  {/* Image URL Area */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50/50"
                    />
                  </div>

                  {/* Video URL Area */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Video Link (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50/50"
                    />
                  </div>

                  {/* Submission Helper Details */}
                  {userRole !== 'admin' ? (
                    <div className="p-3 bg-amber-50/80 border border-amber-100 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 leading-relaxed">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Moderation Note:</strong> Your post will be queued for admin approval before it goes public.
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-start gap-2 text-[11px] text-blue-800 leading-relaxed">
                      <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Admin Quick-Post:</strong> Your post will be published instantly.
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Posting...' : 'Share Post'}
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-md text-white sticky top-24 space-y-4">
                <div className="h-10 w-10 rounded-xl bg-primary/25 border border-primary/40 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary-light" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-base text-white">Join the Community</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    Sign in to share your achievements, thank fellow students, or request support from classmates and teachers.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link
                    href="/auth/login?next=/community"
                    className="bg-transparent border border-slate-700 hover:border-slate-500 text-slate-350 hover:text-white font-semibold py-2 px-3 rounded-xl text-xs text-center transition-all cursor-pointer"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/auth/signup?next=/community"
                    className="bg-primary hover:bg-primary-light text-white font-bold py-2 px-3 rounded-xl text-xs text-center transition-all shadow-xs cursor-pointer"
                  >
                    Register
                  </Link>
                </div>
              </div>
            )}

            {/* Network Guidelines / Info */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-slate-800 font-bold text-xs uppercase tracking-wider">
                Community Guidelines
              </h4>
              <ul className="space-y-3 text-[11px] text-slate-500 leading-relaxed pl-4 list-disc">
                <li>Share authentic accomplishments related to your course projects and quizzes.</li>
                <li>Express gratitude to mentors and fellow students who helped you debug or learn.</li>
                <li>Ask questions clearly. Share error messages or details of the concepts you are stuck on.</li>
                <li>Respect all members. Spam, self-promotion, or abusive comments will result in instant ban.</li>
              </ul>
            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <Footer />

    </div>
  )
}

function getYouTubeEmbedUrl(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11)
    ? `https://www.youtube.com/embed/${match[2]}`
    : null
}
