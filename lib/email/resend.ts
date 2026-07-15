import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY

export const resend = apiKey ? new Resend(apiKey) : null

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!resend) {
    console.log(`
=========================================
[EMAIL MOCK STUB] (RESEND_API_KEY is not configured)
To: ${to}
Subject: ${subject}
Content snippet: ${html.replace(/<[^>]*>/g, ' ').substring(0, 150)}...
=========================================
    `)
    return { success: true, mock: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Embark LMS <onboarding@resend.dev>', // Default Resend test domain
      to,
      subject,
      html
    })

    if (error) {
      console.error('Resend send email error:', error)
      return { error: error.message }
    }

    return { success: true, data }
  } catch (e: unknown) {
    console.error('Failed to send email via Resend:', e)
    const message = e instanceof Error ? e.message : 'Unknown email error'
    return { error: message }
  }
}
