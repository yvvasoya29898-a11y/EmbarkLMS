import React from 'react'
import LoginForm from '@/components/auth/LoginForm'

interface LoginPageProps {
  searchParams: Promise<{ message?: string; error?: string; next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams

  return (
    <LoginForm
      message={resolvedParams.message}
      error={resolvedParams.error}
      next={resolvedParams.next}
    />
  )
}
