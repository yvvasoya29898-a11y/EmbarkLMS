import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOutAction } from '@/lib/actions/auth'
import Link from 'next/link'
import Image from 'next/image'
import { getPendingPostsCountAction } from '@/lib/actions/posts'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Double check admin role in layout
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Fetch count of active 'new' requests
  const { count } = await supabase
    .from('enrollment_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'new')

  const newRequestsBadge = count && count > 0 ? String(count) : undefined

  // Fetch count of pending community posts
  const pendingPostsCount = await getPendingPostsCountAction()
  const pendingPostsBadge = pendingPostsCount && pendingPostsCount > 0 ? String(pendingPostsCount) : undefined

  const navItems = [
    { label: 'Overview', href: '/admin' },
    { label: 'Lead inbox', href: '/admin/requests', badge: newRequestsBadge },
    { label: 'Community Mod', href: '/admin/community', badge: pendingPostsBadge },
    { label: 'Courses', href: '/admin/courses' },
    { label: 'Batches & sessions', href: '/admin/batches' },
    { label: 'Attendance', href: '/admin/attendance' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Reports', href: '/admin/reports' },
    { label: 'Feedback', href: '/admin/feedback' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-body">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-slate-100 flex flex-col justify-between p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <Link href="/" className="block">
              <Image src="/Logo.svg" alt="Embark AI" width={112} height={28} priority className="h-7 w-auto" />
            </Link>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Management Portal</span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between py-2 px-3 rounded-xl text-sm text-slate-600 hover:text-primary hover:bg-slate-50 transition-all font-medium"
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-100 mt-6 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            Logged in as <span className="text-slate-700 block font-semibold truncate max-w-[120px]">{user.email}</span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs py-1.5 px-3 rounded-xl transition-all cursor-pointer font-semibold"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 p-8 overflow-y-auto bg-white">
        {children}
      </main>
    </div>
  )
}
