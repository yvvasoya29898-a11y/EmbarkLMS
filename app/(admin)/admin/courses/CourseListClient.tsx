"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { createCourse, updateCourseSortOrder, updateCourseCategorySortOrder } from '@/lib/actions/courses'
import { useRouter } from 'next/navigation'
import { COURSE_CATEGORIES } from '@/lib/constants'

interface CourseItem {
  id: string
  slug: string
  title: string
  categories: string[] | null
  delivery_type: 'recorded' | 'live' | 'hybrid'
  price_inr_display: number
  original_price_inr: number
  status: 'draft' | 'published' | 'archived'
  thumbnail_url: string | null
  created_at: string
  batch_count: number
  student_count: number
  sort_order: number
  category_sort_orders: Record<string, number> | null
}

interface CourseListClientProps {
  initialCourses: CourseItem[]
}

const CATEGORIES = [
  'All',
  ...COURSE_CATEGORIES
]

function SortOrderInput({ courseId, initialValue, category }: { courseId: string; initialValue: number; category: string }) {
  const [value, setValue] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)

  const handleBlur = async () => {
    if (value === initialValue) return
    setIsSaving(true)
    if (category === 'All') {
      await updateCourseSortOrder(courseId, value)
    } else {
      await updateCourseCategorySortOrder(courseId, category, value)
    }
    setIsSaving(false)
  }

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => setValue(parseInt(e.target.value) || 0)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        }
      }}
      disabled={isSaving}
      className="w-16 px-2.5 py-1 bg-slate-50 border border-slate-250 rounded-lg text-center font-mono font-bold text-xs text-slate-855 focus:bg-white focus:border-primary outline-hidden disabled:opacity-50 transition-all cursor-text"
    />
  )
}

export default function CourseListClient({ initialCourses }: CourseListClientProps) {
  const router = useRouter()
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newCategories, setNewCategories] = useState<string[]>([])
  const [newDeliveryType, setNewDeliveryType] = useState<'recorded' | 'live' | 'hybrid'>('hybrid')
  const [newPrice, setNewPrice] = useState(2999)
  const [newOriginalPrice, setNewOriginalPrice] = useState(9999)
  const [newSortOrder, setNewSortOrder] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-generate slug from title
  const handleTitleChange = (val: string) => {
    setNewTitle(val)
    // Convert to lowercase, remove non-alphanumeric except hyphen, replace spaces with hyphens
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
    setNewSlug(generatedSlug)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    
    if (!newTitle.trim()) {
      setErrorMsg('Course title is required.')
      return
    }
    if (!newSlug.trim()) {
      setErrorMsg('Course slug URL is required.')
      return
    }

    setIsSubmitting(true)
    const res = await createCourse({
      title: newTitle,
      slug: newSlug,
      categories: newCategories,
      delivery_type: newDeliveryType,
      price_inr_display: newPrice,
      original_price_inr: newOriginalPrice,
      sort_order: newSortOrder
    })

    setIsSubmitting(false)
    if (res.error) {
      setErrorMsg(res.error)
    } else if (res.success && res.courseId) {
      setIsModalOpen(false)
      // Reset form
      setNewTitle('')
      setNewSlug('')
      setNewCategories([])
      setNewDeliveryType('hybrid')
      setNewPrice(2999)
      setNewOriginalPrice(9999)
      setNewSortOrder(0)
      // Redirect to course editor
      router.push(`/admin/courses/${res.courseId}`)
    }
  }

  // Filter Courses list
  const filteredCourses = initialCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (course.slug && course.slug.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'All' || (course.categories && course.categories.includes(selectedCategory))
    return matchesSearch && matchesCategory
  })

  // Format Currency Helper
  const formatCurrency = (amount: number) => {
    if (amount === 0) return 'Free'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Export CSV Helper
  const exportToCSV = () => {
    const headers = ['Title', 'Slug', 'Categories', 'Delivery Type', 'Price (INR)', 'Original Price (INR)', 'Status', 'Batches', 'Students']
    const rows = filteredCourses.map((c) => [
      c.title,
      c.slug,
      c.categories && c.categories.length > 0 ? c.categories.join('; ') : '',
      c.delivery_type,
      c.price_inr_display,
      c.original_price_inr ?? 0,
      c.status,
      c.batch_count,
      c.student_count
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `embark-courses-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">
            Courses
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage course content, modules, lessons, downloadable resources, and pricing.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={exportToCSV}
            className="flex-1 sm:flex-initial bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            📊 Export CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial bg-primary hover:bg-primary-light text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
          >
            ➕ Create Course
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shadow-3xs">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white text-slate-800 py-2 pl-8 pr-4 rounded-xl outline-hidden transition-all"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>
      </div>

      {/* Courses List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-5 font-semibold text-center w-20">Seq</th>
                <th className="py-3.5 px-5 font-semibold">Course</th>
                <th className="py-3.5 px-5 font-semibold">Category</th>
                <th className="py-3.5 px-5 font-semibold">Delivery Type</th>
                <th className="py-3.5 px-5 font-semibold">Price</th>
                <th className="py-3.5 px-5 font-semibold">Batches</th>
                <th className="py-3.5 px-5 font-semibold">Students</th>
                <th className="py-3.5 px-5 font-semibold">Status</th>
                <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((c) => {
                  const statusColors = ({
                    published: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    draft: 'bg-amber-50 text-amber-700 border-amber-100',
                    archived: 'bg-slate-100 text-slate-500 border-slate-200'
                  } as Record<string, string>)[c.status]

                  const deliveryColors = ({
                    hybrid: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                    live: 'bg-rose-50 text-rose-700 border-rose-100',
                    recorded: 'bg-teal-50 text-teal-700 border-teal-100'
                  } as Record<string, string>)[c.delivery_type]

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-5 text-center">
                        <SortOrderInput
                          key={`${c.id}-${selectedCategory}`}
                          courseId={c.id}
                          initialValue={selectedCategory === 'All' ? (c.sort_order ?? 0) : (c.category_sort_orders?.[selectedCategory] ?? 0)}
                          category={selectedCategory}
                        />
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-900 text-sm">{c.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">/{c.slug}</div>
                      </td>
                      <td className="py-4 px-5 font-medium text-slate-650 text-xs">
                        {c.categories && c.categories.length > 0 ? c.categories.join(', ') : '—'}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${deliveryColors} capitalize`}>
                          {c.delivery_type}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-700 font-mono">
                        {formatCurrency(c.price_inr_display)}
                      </td>
                      <td className="py-4 px-5 font-semibold font-mono text-slate-600">
                        {c.batch_count}
                      </td>
                      <td className="py-4 px-5 font-semibold font-mono text-slate-600">
                        {c.student_count}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${statusColors}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right space-x-2">
                        <Link
                          href={`/admin/courses/${c.id}`}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-3 rounded-lg transition-colors inline-block text-[10px] shadow-2xs cursor-pointer"
                        >
                          ✎ Edit Course &amp; Curriculum
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    {initialCourses.length === 0 ? 'No courses found. Click "+ Create Course" to add your first one.' : 'No courses match the filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base font-display">
                Create New Course
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setErrorMsg('')
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2.5 rounded-xl font-medium">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI for Educators — 5-day program"
                  value={newTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-2 px-3 rounded-xl outline-hidden transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">URL Slug</label>
                <div className="flex items-center bg-slate-50 border border-slate-250 rounded-xl focus-within:border-slate-400 focus-within:bg-white overflow-hidden transition-all pr-3">
                  <span className="text-slate-400 font-mono pl-3 py-2 pr-1 select-none">/courses/</span>
                  <input
                    type="text"
                    required
                    placeholder="ai-for-educators"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full bg-transparent border-0 text-slate-800 py-2 outline-hidden font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">This will be the web address path for students to view this course.</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-xs">Categories</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-[140px] overflow-y-auto">
                  {COURSE_CATEGORIES.map((c) => {
                    const checked = newCategories.includes(c)
                    return (
                      <label key={c} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setNewCategories(newCategories.filter(item => item !== c))
                            } else {
                              setNewCategories([...newCategories, c])
                            }
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <span>{c}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-xs">Delivery Type</label>
                <select
                  value={newDeliveryType}
                  onChange={(e) => setNewDeliveryType(e.target.value as 'recorded' | 'live' | 'hybrid')}
                  className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-2 px-3 rounded-xl outline-hidden transition-all font-medium cursor-pointer text-xs"
                >
                  <option value="hybrid">Hybrid (Recorded + Live)</option>
                  <option value="recorded">Recorded (Self-paced)</option>
                  <option value="live">Live (Cohort sessions)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-[10px]">Price (INR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="2999"
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-1.5 px-2 rounded-xl outline-hidden transition-all text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-[10px]">Original Price</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="9999"
                    value={newOriginalPrice}
                    onChange={(e) => setNewOriginalPrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-1.5 px-2 rounded-xl outline-hidden transition-all text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-[10px]">Sequence</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={newSortOrder}
                    onChange={(e) => setNewSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-1.5 px-2 rounded-xl outline-hidden transition-all text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setErrorMsg('')
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary-light text-white font-bold py-2 px-4 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Course ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
