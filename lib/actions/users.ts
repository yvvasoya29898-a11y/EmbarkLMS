"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Update user role between 'student' and 'admin'
 */
export async function updateUserRole(targetUserId: string, newRole: 'student' | 'admin') {
  try {
    const supabase = await createClient()

    // 1. Authenticate caller
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !currentUser) {
      return { error: 'You must be logged in to modify user roles.' }
    }

    // 2. Authorize admin check
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return { error: 'Unauthorized: Admin access required.' }
    }

    // 3. Prevent self lockout
    if (targetUserId === currentUser.id) {
      return { error: 'Self-lockout prevention: You cannot modify your own admin role.' }
    }

    // 4. Perform the update
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId)

    if (updateError) {
      return { error: updateError.message }
    }

    // 5. Revalidate routes
    revalidatePath('/admin/users')
    revalidatePath('/admin')
    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}
