import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { getApprovedPostsAction } from '@/lib/actions/posts'
import CommunityClient from './CommunityClient'

export const metadata = {
  title: 'Community | Embark LMS',
  description: 'Share achievements, say thanks, ask for help, and read announcements from the Embark AI team.',
}

export default async function CommunityPage() {
  const supabase = await createClient()

  // 1. Fetch user (for auth state and permissions)
  const { data: { user } } = await supabase.auth.getUser()

  let userRole: 'student' | 'admin' | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      userRole = profile.role as 'student' | 'admin'
    }
  }

  // 2. Fetch approved posts
  const { posts = [] } = await getApprovedPostsAction()

  return (
    <CommunityClient
      initialPosts={posts}
      currentUser={user}
      userRole={userRole}
    />
  )
}
