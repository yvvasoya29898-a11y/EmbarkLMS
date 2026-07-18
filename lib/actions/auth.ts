"use server"

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

export async function signUpAction(prevState: { error?: string } | null, formData: FormData) {
  const supabase = await createClient()

  try {
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const password = formData.get('password') as string
    const next = formData.get('next') as string

    if (!fullName || !email || !phone || !password) {
      return { error: 'All fields are required.' }
    }

    // Simple Indian phone validation
    const phoneClean = phone.replace(/\s+/g, '')
    const phoneRegex = /^(\+91[\-\s]?)?[6789]\d{9}$/
    if (!phoneRegex.test(phoneClean)) {
      return { error: 'Please enter a valid 10-digit Indian phone number (e.g. +91 98250 XXXXX).' }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
        data: {
          full_name: fullName,
          phone: phoneClean,
        },
      },
    })

    if (error) {
      return { error: error.message }
    }

    // Redirect to login page with success status and carry next param
    const loginRedirect = next
      ? `/auth/login?message=Signup successful! Please check your email for confirmation.&next=${encodeURIComponent(next)}`
      : '/auth/login?message=Signup successful! Please check your email for confirmation.'
    redirect(loginRedirect)
  } catch (err: unknown) {
    if (err && typeof err === 'object' && ('message' in err || 'digest' in err)) {
      const obj = err as Record<string, unknown>
      if (obj.message === 'NEXT_REDIRECT' || String(obj.digest).includes('NEXT_REDIRECT')) {
        throw err
      }
    }
    const msg = err instanceof Error ? err.message : String(err)
    return { error: msg || 'An unexpected error occurred during signup.' }
  }
}

export async function signInAction(prevState: { error?: string } | null, formData: FormData) {
  const supabase = await createClient()

  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const next = formData.get('next') as string

    if (!email || !password) {
      return { error: 'Email and password are required.' }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: error.message }
    }

    if (next) {
      redirect(next)
    } else {
      redirect('/dashboard')
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && ('message' in err || 'digest' in err)) {
      const obj = err as Record<string, unknown>
      if (obj.message === 'NEXT_REDIRECT' || String(obj.digest).includes('NEXT_REDIRECT')) {
        throw err
      }
    }
    const msg = err instanceof Error ? err.message : String(err)
    return { error: msg || 'An unexpected error occurred during login.' }
  }
}

export async function completeProfileAction(prevState: { error?: string } | null, formData: FormData) {
  const supabase = await createClient()

  try {
    const phone = formData.get('phone') as string

    if (!phone) {
      return { error: 'Phone number is required.' }
    }

    const phoneClean = phone.replace(/\s+/g, '')
    const phoneRegex = /^(\+91[\-\s]?)?[6789]\d{9}$/
    if (!phoneRegex.test(phoneClean)) {
      return { error: 'Please enter a valid 10-digit Indian phone number.' }
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: 'User session not found. Please log in again.' }
    }

    const serviceClient = createServiceRoleClient()

    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (fetchError) {
      return { error: fetchError.message }
    }

    if (existingProfile) {
      // Update the existing profile row's phone number
      const { error: profileError } = await serviceClient
        .from('profiles')
        .update({ phone: phoneClean })
        .eq('id', user.id)

      if (profileError) {
        return { error: profileError.message }
      }
    } else {
      // Insert new profile row
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student'
      const { error: profileError } = await serviceClient
        .from('profiles')
        .insert({
          id: user.id,
          phone: phoneClean,
          full_name: fullName,
          role: 'student'
        })

      if (profileError) {
        return { error: profileError.message }
      }
    }

    redirect('/dashboard')
  } catch (err: unknown) {
    if (err && typeof err === 'object' && ('message' in err || 'digest' in err)) {
      const obj = err as Record<string, unknown>
      if (obj.message === 'NEXT_REDIRECT' || String(obj.digest).includes('NEXT_REDIRECT')) {
        throw err
      }
    }
    const msg = err instanceof Error ? err.message : String(err)
    return { error: msg || 'An unexpected error occurred while completing profile.' }
  }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export async function requestPasswordResetAction(
  prevState: { error?: string; message?: string } | null,
  formData: FormData
) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required.' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { message: 'Password reset link sent! Please check your email inbox.' }
}

export async function updatePasswordAction(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'Both password fields are required.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/auth/login?message=Password updated successfully! Please log in with your new password.')
}
