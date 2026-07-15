import React from 'react'
import SignupForm from '@/components/auth/SignupForm'

interface SignupPageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedParams = await searchParams

  return (
    <SignupForm
      next={resolvedParams.next}
    />
  )
}
