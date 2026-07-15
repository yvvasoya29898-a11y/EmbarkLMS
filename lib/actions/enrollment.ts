"use server"

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendEmail } from '@/lib/email/resend'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

export async function createEnrollmentRequest(courseId: string) {
  const supabase = await createClient()

  // 1. Get logged-in user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'You must be logged in to request enrollment.' }
  }

  // 2. Fetch course and user profile in parallel (performance optimization)
  const [courseRes, profileRes] = await Promise.all([
    supabase
      .from('courses')
      .select('slug, title')
      .eq('id', courseId)
      .single(),
    supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .single()
  ])

  const { data: course, error: courseError } = courseRes
  const { data: profile, error: profileError } = profileRes

  if (courseError || !course) {
    return { error: 'Course not found.' }
  }

  if (profileError || !profile || !profile.phone || profile.phone.trim().length === 0) {
    // If no phone number, return custom code so client can redirect or show prompt
    return { error: 'profile_incomplete', message: 'A phone number is required to request enrollment.' }
  }

  // 4. Try inserting the enrollment request
  const { error: insertError } = await supabase
    .from('enrollment_requests')
    .insert({
      user_id: user.id,
      course_id: courseId,
      status: 'new'
    })

  if (insertError) {
    // Check if it's the duplicate request constraint error (Postgres code 23505)
    if (insertError.code === '23505') {
      return {
        error: 'duplicate_request',
        message: `You already have an active request for "${course.title}". Our team will call you soon.`
      }
    }
    return { error: 'db_error', message: insertError.message }
  }

  // 5. On success, redirect to the request confirmation page S4
  redirect(`/courses/${course.slug}/requested`)
}

export async function updateRequestStudentNote(requestId: string, studentNote: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'You must be logged in.' }
  }

  const { error } = await supabase
    .from('enrollment_requests')
    .update({ student_note: studentNote, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('user_id', user.id) // Ensure student can only update their own request

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updateProfilePhone(phone: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'You must be logged in.' }
  }

  // Indian phone validation matching signUpAction
  const phoneClean = phone.replace(/\s+/g, '')
  const phoneRegex = /^(\+91[\-\s]?)?[6789]\d{9}$/
  if (!phoneRegex.test(phoneClean)) {
    return { error: 'Please enter a valid 10-digit Indian phone number (e.g. +91 98250 XXXXX).' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ phone: phoneClean })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true, phone: phoneClean }
}

export async function markRequestContacted(requestId: string) {
  const supabase = await createClient()

  // 1. Authenticate & authorize admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  // 2. Update request status to 'contacted'
  const { error } = await supabase
    .from('enrollment_requests')
    .update({
      status: 'contacted',
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function markRequestPaid(requestId: string, paymentReference: string) {
  const supabase = await createClient()

  // 1. Authenticate & authorize admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  if (!paymentReference || paymentReference.trim().length === 0) {
    return { error: 'Payment reference is required to mark as paid.' }
  }

  // 2. Update request status to 'paid' and store reference
  const { error } = await supabase
    .from('enrollment_requests')
    .update({
      status: 'paid',
      payment_reference: paymentReference,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function markRequestDropped(requestId: string, adminNotes?: string) {
  const supabase = await createClient()

  // 1. Authenticate & authorize admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  // 2. Update request status to 'dropped' and append admin notes if any
  const { error } = await supabase
    .from('enrollment_requests')
    .update({
      status: 'dropped',
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function grantEnrollmentAccess(
  requestId: string,
  batchId: string | null,
  paymentReference: string | null,
  adminNotes?: string
) {
  const supabase = await createClient()

  // 1. Authenticate & authorize admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  // 2. Fetch the request details to verify the course and user
  const { data: request, error: requestError } = await supabase
    .from('enrollment_requests')
    .select('user_id, course_id, status')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    return { error: 'Request not found.' }
  }

  // 3. Fetch course details to verify delivery type
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('delivery_type, title')
    .eq('id', request.course_id)
    .single()

  if (courseError || !course) {
    return { error: 'Associated course not found.' }
  }

  // 4. Validate batch selection for Live and Hybrid courses
  if (course.delivery_type !== 'recorded' && (!batchId || batchId.trim().length === 0)) {
    return { error: 'A batch selection is required for Live and Hybrid courses.' }
  }

  // 5. Validate payment reference
  if (!paymentReference || paymentReference.trim().length === 0) {
    return { error: 'Payment reference is required to grant access.' }
  }

  // 6. Idempotency Check: Verify if enrollment already exists (even if revoked)
  const { data: existingEnrollment } = await supabase
    .from('enrollments')
    .select('id, revoked_at')
    .eq('user_id', request.user_id)
    .eq('course_id', request.course_id)
    .maybeSingle()

  if (!existingEnrollment) {
    // 7. Create the enrollment
    const { error: enrollError } = await supabase
      .from('enrollments')
      .insert({
        user_id: request.user_id,
        course_id: request.course_id,
        batch_id: batchId || null,
        source: 'request',
        granted_by: user.id
      })

    if (enrollError) {
      if (enrollError.code === '23505') {
        // Handle race condition uniqueness gracefully
        console.log('Enrollment already exists via race condition constraint.')
      } else {
        return { error: enrollError.message }
      }
    }
  } else if (existingEnrollment.revoked_at !== null) {
    // 7. Re-grant enrollment by updating the revoked record
    const { error: enrollError } = await supabase
      .from('enrollments')
      .update({
        revoked_at: null,
        batch_id: batchId || null,
        source: 'request',
        granted_by: user.id,
        enrolled_at: new Date().toISOString()
      })
      .eq('id', existingEnrollment.id)

    if (enrollError) {
      return { error: enrollError.message }
    }
  }

  // 8. Update request status to 'enrolled', save reference & notes
  const { error: reqUpdateError } = await supabase
    .from('enrollment_requests')
    .update({
      status: 'enrolled',
      payment_reference: paymentReference,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (reqUpdateError) {
    return { error: reqUpdateError.message }
  }

  // 9. Fetch user details and send confirmation email
  const { data: studentProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', request.user_id)
    .single()

  let studentEmail: string | null = null
  try {
    const serviceClient = createServiceRoleClient()
    const { data: authUserData } = await serviceClient.auth.admin.getUserById(request.user_id)
    studentEmail = authUserData?.user?.email || null
  } catch (err) {
    console.error('Error fetching student auth email:', err)
  }

  if (studentEmail) {
    await sendEmail({
      to: studentEmail,
      subject: `Access Granted: ${course.title} | Embark LMS`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #e11d48; font-size: 20px; font-weight: bold; margin-bottom: 16px;">Enrollment Access Approved!</h2>
          <p>Hi ${studentProfile?.full_name || 'Student'},</p>
          <p>We are excited to let you know that your offline payment has been verified, and your enrollment access for the course <strong>${course.title}</strong> is now approved.</p>
          <p>Log in to your student dashboard to start studying right away:</p>
          <p style="margin: 24px 0 12px 0;">
            <a href="https://embarkai.in/dashboard" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 13px;">Go to Dashboard</a>
          </p>
          <br/>
          <p style="font-size: 12px; color: #64748b;">Best regards,<br/>The Embark AI Team</p>
        </div>
      `
    })
  }

  revalidatePath('/admin/requests')
  revalidatePath('/admin/users')
  revalidatePath('/dashboard')

  return { success: true }
}

export async function revokeEnrollmentAccess(requestId: string) {
  try {
    const supabase = await createClient()

    // 1. Authenticate & authorize admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Not authenticated')
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Unauthorized')

    // 2. Fetch the request details to verify the course and user
    const { data: request, error: requestError } = await supabase
      .from('enrollment_requests')
      .select('user_id, course_id')
      .eq('id', requestId)
      .single()

    if (requestError || !request) {
      return { error: 'Request not found.' }
    }

    // 3. Update the request status to 'dropped'
    const { error: reqUpdateError } = await supabase
      .from('enrollment_requests')
      .update({
        status: 'dropped',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (reqUpdateError) {
      return { error: reqUpdateError.message }
    }

    // 4. Update the enrollment row to set revoked_at = now()
    const { error: enrollError } = await supabase
      .from('enrollments')
      .update({
        revoked_at: new Date().toISOString()
      })
      .eq('user_id', request.user_id)
      .eq('course_id', request.course_id)

    if (enrollError) {
      return { error: enrollError.message }
    }

    // 5. Revalidate paths
    revalidatePath('/admin/requests')
    revalidatePath('/admin/users')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

export async function enrollInFreeCourse(courseId: string) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'You must be logged in to enroll.' }
    }

    // 2. Fetch course to verify it exists, is published, and has price = 0
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, slug, price_inr_display, delivery_type')
      .eq('id', courseId)
      .eq('status', 'published')
      .single()

    if (courseError || !course) {
      return { error: 'Course not found or is not published.' }
    }

    if (course.price_inr_display > 0) {
      return { error: 'This course is not free. Please request enrollment instead.' }
    }

    // 3. If Live/Hybrid course, check for an open batch automatically
    let batchId: string | null = null
    if (course.delivery_type !== 'recorded') {
      const { data: openBatch } = await supabase
        .from('batches')
        .select('id')
        .eq('course_id', courseId)
        .eq('status', 'open')
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (openBatch) {
        batchId = openBatch.id
      }
    }

    // 4. Use service role client to bypass student RLS write block on enrollments table
    const serviceClient = createServiceRoleClient()

    // 5. Idempotency Check: check if enrollment already exists
    const { data: existingEnrollment } = await serviceClient
      .from('enrollments')
      .select('id, revoked_at')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle()

    if (!existingEnrollment) {
      // 6. Insert new enrollment
      const { error: enrollError } = await serviceClient
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          batch_id: batchId,
          source: 'free_direct',
          granted_by: user.id
        })

      if (enrollError) {
        return { error: enrollError.message }
      }
    } else if (existingEnrollment.revoked_at !== null) {
      // 6. Re-grant access if previously revoked
      const { error: enrollError } = await serviceClient
        .from('enrollments')
        .update({
          revoked_at: null,
          batch_id: batchId,
          source: 'free_direct',
          granted_by: user.id,
          enrolled_at: new Date().toISOString()
        })
        .eq('id', existingEnrollment.id)

      if (enrollError) {
        return { error: enrollError.message }
      }
    }

    // 7. Also upsert a paid/enrolled enrollment request record for history tracking
    const { error: reqError } = await serviceClient
      .from('enrollment_requests')
      .upsert({
        user_id: user.id,
        course_id: courseId,
        status: 'enrolled',
        payment_reference: 'FREE_COMPLIMENTARY',
        admin_notes: 'Automatically enrolled in free/complimentary course.',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,course_id'
      })

    if (reqError) {
      console.error('Failed to create matching request history:', reqError)
    }

    // 8. Revalidate paths
    revalidatePath('/dashboard')
    revalidatePath(`/courses/${course.slug}`)
    revalidatePath('/courses')

    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

/**
 * Redeems a cohort invite code, enrolling the student directly into the associated open batch.
 */
export async function redeemInviteCodeAction(inviteCode: string) {
  try {
    const supabase = await createClient()

    // 1. Get authenticated user securely (verifies auth.uid())
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'You must be logged in to redeem an invite code.' }
    }

    const cleanCode = inviteCode.trim().toUpperCase()
    if (!cleanCode) {
      return { error: 'Invite code cannot be empty.' }
    }

    // 2. Query batch by invite code where status = 'open'
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('id, course_id, name, status, courses(title, slug)')
      .eq('invite_code', cleanCode)
      .eq('status', 'open')
      .maybeSingle()

    if (batchError || !batch) {
      return { error: 'Invalid or expired invite code.' }
    }

    const course = Array.isArray(batch.courses) ? batch.courses[0] : batch.courses
    if (!course) {
      return { error: 'Associated course not found.' }
    }

    // 3. Check if user is already enrolled in this course (idempotency check)
    const serviceClient = createServiceRoleClient()
    const { data: existingEnrollment } = await serviceClient
      .from('enrollments')
      .select('id, revoked_at')
      .eq('user_id', user.id)
      .eq('course_id', batch.course_id)
      .maybeSingle()

    if (existingEnrollment && existingEnrollment.revoked_at === null) {
      return { error: `You are already enrolled in "${course.title}".` }
    }

    // 4. Insert or update enrollment idempotently using service role client
    if (!existingEnrollment) {
      const { error: enrollError } = await serviceClient
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: batch.course_id,
          batch_id: batch.id,
          source: 'cohort',
          granted_by: user.id
        })

      if (enrollError) {
        return { error: enrollError.message }
      }
    } else {
      // Re-grant access if previously revoked
      const { error: enrollError } = await serviceClient
        .from('enrollments')
        .update({
          revoked_at: null,
          batch_id: batch.id,
          source: 'cohort',
          granted_by: user.id,
          enrolled_at: new Date().toISOString()
        })
        .eq('id', existingEnrollment.id)

      if (enrollError) {
        return { error: enrollError.message }
      }
    }

    // 5. Also upsert a request history log for analytics and reports
    const { error: reqError } = await serviceClient
      .from('enrollment_requests')
      .upsert({
        user_id: user.id,
        course_id: batch.course_id,
        status: 'enrolled',
        payment_reference: `COHORT_CODE_${cleanCode}`,
        admin_notes: `Sponsor cohort code redeemed: "${cleanCode}". Joined batch: "${batch.name}".`,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,course_id'
      })

    if (reqError) {
      console.error('Failed to create matching request history for invite code:', reqError)
    }

    // 6. Revalidate routes so updates display instantly
    revalidatePath('/dashboard')
    revalidatePath(`/courses/${course.slug}`)
    revalidatePath('/courses')

    return { success: true, courseTitle: course.title, courseSlug: course.slug }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

export interface BulkEnrollStudentInput {
  fullName: string
  email: string
  phone: string
  courseSlug: string
  batchName?: string
}

export async function bulkEnrollStudentsAction(students: BulkEnrollStudentInput[]) {
  try {
    const supabase = await createClient()

    // 1. Authenticate & authorize admin
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !adminUser) {
      return { error: 'Not authenticated.' }
    }
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return { error: 'Access denied: Admin role required.' }
    }

    if (!students || students.length === 0) {
      return { error: 'No student records provided.' }
    }

    const serviceClient = createServiceRoleClient()
    const results = []

    for (const student of students) {
      const email = student.email.trim().toLowerCase()
      const fullName = student.fullName.trim()
      const phone = student.phone.trim()
      const courseSlug = student.courseSlug.trim()
      const batchName = student.batchName?.trim()

      if (!email || !fullName || !courseSlug) {
        results.push({ email, success: false, error: 'Missing required fields (fullName, email, courseSlug).' })
        continue
      }

      // Check course exists
      const { data: course } = await serviceClient
        .from('courses')
        .select('id, title')
        .eq('slug', courseSlug)
        .maybeSingle()

      if (!course) {
        results.push({ email, success: false, error: `Course not found with slug: ${courseSlug}` })
        continue
      }

      // Resolve batch
      let batchId = null
      if (batchName) {
        const { data: batch } = await serviceClient
          .from('batches')
          .select('id')
          .eq('course_id', course.id)
          .eq('name', batchName)
          .maybeSingle()
        batchId = batch?.id || null
      }

      if (!batchId) {
        const { data: openBatch } = await serviceClient
          .from('batches')
          .select('id')
          .eq('course_id', course.id)
          .eq('status', 'open')
          .order('starts_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        batchId = openBatch?.id || null
      }

      // Check if user already exists in profiles
      let userId = null
      const { data: existingProfile } = await serviceClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existingProfile) {
        userId = existingProfile.id
      } else {
        // Create new user account in Supabase Auth
        const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
        const { data: createdAuthUser, error: createError } = await serviceClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            phone
          }
        })

        if (createError || !createdAuthUser.user) {
          results.push({ email, success: false, error: `Auth creation failed: ${createError?.message || 'Unknown'}` })
          continue
        }
        userId = createdAuthUser.user.id

        // Update profile
        await serviceClient
          .from('profiles')
          .update({
            full_name: fullName,
            phone
          })
          .eq('id', userId)
      }

      // Now create the enrollment idempotently
      const { data: existingEnrollment } = await serviceClient
        .from('enrollments')
        .select('id, revoked_at')
        .eq('user_id', userId)
        .eq('course_id', course.id)
        .maybeSingle()

      if (existingEnrollment) {
        if (existingEnrollment.revoked_at !== null) {
          await serviceClient
            .from('enrollments')
            .update({
              revoked_at: null,
              batch_id: batchId,
              source: 'admin_bulk',
              granted_by: adminUser.id,
              enrolled_at: new Date().toISOString()
            })
            .eq('id', existingEnrollment.id)
        }
      } else {
        await serviceClient
          .from('enrollments')
          .insert({
            user_id: userId,
            course_id: course.id,
            batch_id: batchId,
            source: 'admin_bulk',
            granted_by: adminUser.id
          })
      }

      // Upsert enrollment request history
      await serviceClient
        .from('enrollment_requests')
        .upsert({
          user_id: userId,
          course_id: course.id,
          status: 'enrolled',
          payment_reference: 'ADMIN_BULK_IMPORT',
          admin_notes: `Bulk imported by admin. Joined batch: ${batchName || 'Default open batch'}.`,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,course_id'
        })

      results.push({ email, success: true })
    }

    revalidatePath('/admin/users')
    return { success: true, results }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Internal bulk enroll error'
    return { error: errMsg }
  }
}

