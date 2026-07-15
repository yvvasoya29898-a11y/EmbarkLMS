import React from 'react'
import { Metadata } from 'next'
import Home from '../../page'

export const revalidate = 3600 // Cache catalog page for 1 hour

export const metadata: Metadata = {
  title: "Explore Syllabus & Courses — Embark LMS",
  description: "Browse our catalog of implementation-first AI courses. Explore recorded, live, and hybrid formats.",
  openGraph: {
    title: "Explore Syllabus & Courses — Embark LMS",
    description: "Browse our catalog of implementation-first AI courses. Explore recorded, live, and hybrid formats.",
    url: "https://embarkai.in/courses",
    images: [
      {
        url: "https://embarkai.in/Logo.png",
        width: 1200,
        height: 630,
        alt: "Embark LMS Courses Catalog",
      }
    ],
    type: "website",
  }
}

interface CoursesPageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  return <Home searchParams={searchParams} />
}
