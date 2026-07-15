import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, supabase, user } = await updateSession(request)

  const url = new URL(request.url)
  const path = url.pathname

  // Define route check helpers
  const isDashboardRoute = path.startsWith('/dashboard')
  const isAdminRoute = path.startsWith('/admin')
  const isLearnRoute = path.startsWith('/learn')
  const isCompleteProfileRoute = path === '/auth/complete-profile'

  const isProtectedRoute = isDashboardRoute || isAdminRoute || isLearnRoute || isCompleteProfileRoute

  if (isProtectedRoute) {
    if (!user) {
      // User is not logged in, redirect to login
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('next', path)
      return NextResponse.redirect(loginUrl)
    }

    // Fetch user profile from DB to check role and phone
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, phone')
      .eq('id', user.id)
      .single()

    const hasPhone = profile?.phone && profile.phone.trim().length > 0

    if (!hasPhone) {
      // User does not have a phone number. Force redirect to complete-profile unless already there.
      if (!isCompleteProfileRoute) {
        const completeProfileUrl = new URL('/auth/complete-profile', request.url)
        return NextResponse.redirect(completeProfileUrl)
      }
    } else {
      // User has a phone number. If on complete-profile page, redirect to dashboard.
      if (isCompleteProfileRoute) {
        const dashboardUrl = new URL('/dashboard', request.url)
        return NextResponse.redirect(dashboardUrl)
      }
    }

    // Protect admin routes
    if (isAdminRoute) {
      const isAdmin = profile?.role === 'admin'
      if (!isAdmin) {
        // Not an admin, redirect to student dashboard
        const dashboardUrl = new URL('/dashboard', request.url)
        return NextResponse.redirect(dashboardUrl)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, SVGs)
     */
    '/((?!_next/static|_next/image|favicon.ico|privacy|terms|refund-policy|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
