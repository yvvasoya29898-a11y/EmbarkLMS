import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPendingPostsAction } from '@/lib/actions/posts'
import CommunityModClient from './CommunityModClient'

export const metadata = {
  title: 'Community Moderation | Admin | Embark LMS',
}

export default async function AdminCommunityPage() {
  const supabase = await createClient()

  // 1. Fetch user & verify role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // 2. Fetch pending posts
  const { posts = [] } = await getPendingPostsAction()

  return <CommunityModClient initialPosts={posts} />
}
