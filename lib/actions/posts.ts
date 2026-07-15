"use server"

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

export async function createPostAction(
  content: string,
  postType: 'achievement' | 'thanks' | 'help' | 'announcement' | 'update',
  imageUrl?: string,
  videoUrl?: string
) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'You must be logged in to share a post.' }
  }

  // 2. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'student'

  // Verification & Rate limiting
  if (userRole !== 'admin') {
    // Check enrollment
    const { count: enrollCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('revoked_at', null)

    if (!enrollCount || enrollCount === 0) {
      return { error: 'Access denied: You must be enrolled in at least one course to participate.' }
    }

    // Rate limit: 1 post per minute
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { count: postCount } = await supabase
      .from('community_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneMinAgo)

    if (postCount && postCount >= 1) {
      return { error: 'Rate limit reached: Please wait 1 minute before posting again.' }
    }
  }

  // 3. Validation and status setting
  let status: 'pending' | 'approved' = 'pending'
  let approvedBy: string | null = null
  let approvedAt: string | null = null

  if (userRole === 'admin') {
    status = 'approved'
    approvedBy = user.id
    approvedAt = new Date().toISOString()
  } else {
    // Student can only post certain types
    if (postType === 'announcement' || postType === 'update') {
      return { error: 'Students cannot post announcements or updates.' }
    }
  }

  if (!content || content.trim().length === 0) {
    return { error: 'Post content cannot be empty.' }
  }

  // 4. Insert post
  const { error } = await supabase
    .from('community_posts')
    .insert({
      user_id: user.id,
      content: content.trim(),
      post_type: postType,
      status,
      image_url: imageUrl?.trim() || null,
      video_url: videoUrl?.trim() || null,
      approved_by: approvedBy,
      approved_at: approvedAt
    })

  if (error) {
    console.error('Error creating post:', error.message, error.details, error.hint)
    return { error: error.message }
  }

  revalidatePath('/community')
  revalidatePath('/admin/community')

  return { success: true, pending: status === 'pending' }
}

export async function getApprovedPostsAction() {
  // Since students cannot read profiles of other students due to RLS,
  // we use the service role client on the server to safely join and fetch public fields.
  const serviceClient = createServiceRoleClient()

  const { data, error } = await serviceClient
    .from('community_posts')
    .select(`
      id,
      content,
      post_type,
      image_url,
      video_url,
      created_at,
      profiles:profiles!community_posts_user_id_fkey (
        id,
        full_name,
        role
      ),
      community_post_likes (
        user_id
      ),
      community_post_comments (
        id,
        content,
        created_at,
        user_id,
        profiles (
          id,
          full_name,
          role
        )
      )
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching approved posts:', error.message, error.details, error.hint)
    return { error: error.message, posts: [] }
  }

  // Map nested profiles, likes and comments correctly
  const posts = (data || []).map((post) => {
    const prof = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
    
    // Map comments and comment authors
    const rawComments = post.community_post_comments || []
    const comments = (Array.isArray(rawComments) ? rawComments : [rawComments]).map((c) => {
      const commenterProf = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
      return {
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        user_id: c.user_id,
        profiles: commenterProf || null
      }
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    // Convert likes to clean array
    const likes = Array.isArray(post.community_post_likes)
      ? post.community_post_likes
      : post.community_post_likes
      ? [post.community_post_likes]
      : []

    return {
      ...post,
      profiles: prof || null,
      likes,
      comments
    }
  })

  return { posts }
}

export async function getPendingPostsAction() {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized', posts: [] }
  }

  // 2. Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Unauthorized', posts: [] }
  }

  // 3. Admin can read all profiles, so we can use standard client or service role client.
  // Standard client is fine. Let's use service client to ensure we get user info seamlessly
  const serviceClient = createServiceRoleClient()

  const { data, error } = await serviceClient
    .from('community_posts')
    .select(`
      id,
      content,
      post_type,
      image_url,
      video_url,
      created_at,
      profiles:profiles!community_posts_user_id_fkey (
        id,
        full_name,
        role,
        phone
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching pending posts:', error.message, error.details, error.hint)
    return { error: error.message, posts: [] }
  }

  const posts = (data || []).map((post) => {
    const prof = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
    return {
      ...post,
      profiles: prof || null
    }
  })

  return { posts }
}

export async function approvePostAction(postId: string) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // 2. Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  // 3. Update status
  const { error } = await supabase
    .from('community_posts')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', postId)

  if (error) {
    console.error('Error approving post:', error.message, error.details, error.hint)
    return { error: error.message }
  }

  revalidatePath('/community')
  revalidatePath('/admin/community')

  return { success: true }
}

export async function rejectPostAction(postId: string) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // 2. Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  // 3. Update status to rejected
  const { error } = await supabase
    .from('community_posts')
    .update({
      status: 'rejected'
    })
    .eq('id', postId)

  if (error) {
    console.error('Error rejecting post:', error.message, error.details, error.hint)
    return { error: error.message }
  }

  revalidatePath('/community')
  revalidatePath('/admin/community')

  return { success: true }
}

export async function getPendingPostsCountAction() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return 0

  const { count, error } = await supabase
    .from('community_posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) {
    console.error('Error fetching pending posts count:', error.message, error.details, error.hint)
    return 0
  }

  return count || 0
}

export async function deletePostAction(postId: string) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // 2. Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  // 3. Delete the post
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId)

  if (error) {
    console.error('Error deleting post:', error.message, error.details, error.hint)
    return { error: error.message }
  }

  revalidatePath('/community')
  revalidatePath('/admin/community')

  return { success: true }
}

export async function toggleLikeAction(postId: string) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'You must be logged in to like a post.' }
  }

  // Verify role & enrollment
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    const { count: enrollCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('revoked_at', null)

    if (!enrollCount || enrollCount === 0) {
      return { error: 'Access denied: You must be enrolled in at least one course to participate.' }
    }
  }

  // 2. Check if already liked
  const { data: existingLike } = await supabase
    .from('community_post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingLike) {
    // Unlike
    const { error } = await supabase
      .from('community_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error unliking post:', error.message, error.details, error.hint)
      return { error: error.message }
    }
  } else {
    // Like
    const { error } = await supabase
      .from('community_post_likes')
      .insert({
        post_id: postId,
        user_id: user.id
      })

    if (error) {
      console.error('Error liking post:', error.message, error.details, error.hint)
      return { error: error.message }
    }
  }

  revalidatePath('/community')
  return { success: true }
}

export async function addCommentAction(postId: string, content: string) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'You must be logged in to comment.' }
  }

  // Verify role & enrollment
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    // Check enrollment
    const { count: enrollCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('revoked_at', null)

    if (!enrollCount || enrollCount === 0) {
      return { error: 'Access denied: You must be enrolled in at least one course to participate.' }
    }

    // Rate limit: 5 comments per minute
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { count: commentCount } = await supabase
      .from('community_post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneMinAgo)

    if (commentCount && commentCount >= 5) {
      return { error: 'Rate limit reached: Please wait 1 minute before commenting again.' }
    }
  }

  if (!content || content.trim().length === 0) {
    return { error: 'Comment content cannot be empty.' }
  }

  // 2. Insert comment
  const { error } = await supabase
    .from('community_post_comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      content: content.trim()
    })

  if (error) {
    console.error('Error adding comment:', error.message, error.details, error.hint)
    return { error: error.message }
  }

  revalidatePath('/community')
  return { success: true }
}

export async function deleteCommentAction(commentId: string) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // 2. Fetch comment to verify ownership or admin role
  const { data: comment } = await supabase
    .from('community_post_comments')
    .select('user_id')
    .eq('id', commentId)
    .single()

  if (!comment) {
    return { error: 'Comment not found.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isOwner = comment.user_id === user.id

  if (!isOwner && !isAdmin) {
    return { error: 'Unauthorized' }
  }

  // 3. Delete comment
  const { error } = await supabase
    .from('community_post_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('Error deleting comment:', error.message, error.details, error.hint)
    return { error: error.message }
  }

  revalidatePath('/community')
  return { success: true }
}


