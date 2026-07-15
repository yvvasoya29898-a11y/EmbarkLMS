'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useToast } from '@/components/ToastProvider'
import {
  Check,
  X,
  Trophy,
  Heart,
  HelpCircle,
  Megaphone,
  Sparkles,
  Download,
  AlertCircle,
  Search,
  MessageSquare
} from 'lucide-react'
import { approvePostAction, deletePostAction } from '@/lib/actions/posts'
import { formatISTDateTime, formatISTDate } from '@/lib/date'

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
    phone: string
  } | null
}

interface CommunityModClientProps {
  initialPosts: Post[]
}

const POST_TYPE_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; colorClass: string; bgClass: string }> = {
  achievement: { label: 'Achievement', icon: Trophy, colorClass: 'text-purple-700', bgClass: 'bg-purple-50' },
  thanks: { label: 'Say Thanks', icon: Heart, colorClass: 'text-teal-700', bgClass: 'bg-teal-50' },
  help: { label: 'Need Help', icon: HelpCircle, colorClass: 'text-rose-700', bgClass: 'bg-rose-50' },
  announcement: { label: 'Announcement', icon: Megaphone, colorClass: 'text-amber-700', bgClass: 'bg-amber-50' },
  update: { label: 'Update', icon: Sparkles, colorClass: 'text-indigo-700', bgClass: 'bg-indigo-50' }
}

export default function CommunityModClient({ initialPosts }: CommunityModClientProps) {
  const router = useRouter()
  const { confirm } = useToast()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.profiles?.phone || '').includes(searchQuery)

    const matchesType = typeFilter === 'all' || post.post_type === typeFilter
    return matchesSearch && matchesType
  })

  // Approve post handler
  const handleApprove = (postId: string) => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const res = await approvePostAction(postId)
      if (res.error) {
        setError(res.error)
        return
      }
      setSuccess('Post approved successfully!')
      // Remove approved post from state
      setPosts(prev => prev.filter(p => p.id !== postId))
      router.refresh()
    })
  }

  // Reject post handler (deletes permanently)
  const handleReject = async (postId: string) => {
    const isConfirmed = await confirm({
      title: 'Reject and Delete Post',
      message: 'Are you sure you want to permanently delete and reject this post?',
      confirmText: 'Reject & Delete',
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
      setSuccess('Post rejected and deleted successfully!')
      // Remove rejected post from state
      setPosts(prev => prev.filter(p => p.id !== postId))
      router.refresh()
    })
  }

  // Export pending posts to CSV
  const handleCSVExport = () => {
    const headers = ['Submitted Date', 'Author Name', 'Role', 'Phone', 'Post Type', 'Content']
    const rows = filteredPosts.map(post => [
      formatISTDate(post.created_at, { day: 'numeric', month: 'short', year: 'numeric' }),
      post.profiles?.full_name || 'Anonymous',
      post.profiles?.role || 'student',
      post.profiles?.phone || 'N/A',
      post.post_type,
      post.content
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `embark-community-pending-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 font-body text-xs text-slate-800">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">
            Community Moderation
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Review, approve, or reject community post submissions before they go public.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCSVExport}
            disabled={filteredPosts.length === 0}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2 text-emerald-800">
          <Check className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by author name, content, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-xs"
          />
        </div>

        {/* Filter type */}
        <div className="w-full sm:w-48">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-xs cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="achievement">🏆 Achievements</option>
            <option value="thanks">🙏 Say Thanks</option>
            <option value="help">🙋‍♂️ Need Help</option>
          </select>
        </div>
      </div>

      {/* Pending posts table/grid */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {filteredPosts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-450 uppercase text-[10px] tracking-wider font-mono">
                  <th className="py-3 px-4 font-semibold">Author</th>
                  <th className="py-3 px-4 font-semibold">Post Type</th>
                  <th className="py-3 px-4 font-semibold">Content</th>
                  <th className="py-3 px-4 font-semibold">Submitted</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPosts.map((post) => {
                  const typeCfg = POST_TYPE_LABELS[post.post_type] || {
                    label: post.post_type,
                    icon: MessageSquare,
                    colorClass: 'text-slate-700',
                    bgClass: 'bg-slate-50'
                  }
                  const TypeIcon = typeCfg.icon

                  return (
                    <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Author Details */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-semibold text-slate-900 text-sm">
                          {post.profiles?.full_name || 'Anonymous'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {post.profiles?.phone || 'No phone'}
                        </div>
                      </td>

                      {/* Post Type */}
                      <td className="py-4 px-4 align-top">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${typeCfg.bgClass} ${typeCfg.colorClass} border-current/15`}>
                          <TypeIcon className="h-3 w-3" />
                          {typeCfg.label}
                        </span>
                      </td>

                      {/* Content Preview */}
                      <td className="py-4 px-4 align-top max-w-sm">
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[11px] font-body">
                          {post.content}
                        </p>
                        {post.image_url && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-slate-100 w-[150px] h-20 bg-slate-50 relative">
                            <Image src={post.image_url} alt="Attached attachment" fill className="object-cover" />
                          </div>
                        )}
                        {post.video_url && (
                          <div className="mt-1 text-[10px] text-primary font-semibold">
                            🎥 Video: <a href={post.video_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{post.video_url}</a>
                          </div>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-4 px-4 align-top text-slate-500 whitespace-nowrap">
                        {formatISTDateTime(post.created_at)}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => handleApprove(post.id)}
                            disabled={isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-0.5 transition-all shadow-xs cursor-pointer text-[10px]"
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(post.id)}
                            disabled={isPending}
                            className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 font-semibold py-1.5 px-3 rounded-lg flex items-center gap-0.5 transition-all cursor-pointer text-[10px]"
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-16">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="font-bold text-slate-800 text-sm">Inbox cleared!</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              There are currently no pending community posts requiring your approval.
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
