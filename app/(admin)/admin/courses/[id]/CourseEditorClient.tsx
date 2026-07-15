"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useToast } from '@/components/ToastProvider'
import {
  updateCourse,
  deleteCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  createResource,
  deleteResource,
  createBatch
} from '@/lib/actions/courses'
import { formatISTDate } from '@/lib/date'
import { COURSE_CATEGORIES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

interface HighlightItem {
  title: string
  desc: string
  icon: 'Brain' | 'GraduationCap' | 'Cpu' | 'Code' | 'Award'
}

interface InstructorItem {
  name: string
  title: string
  bio: string
  avatar_url?: string | null
}

interface FaqItem {
  question: string
  answer: string
}

interface Course {
  id: string
  slug: string
  title: string
  description: string | null
  categories: string[] | null
  delivery_type: 'recorded' | 'live' | 'hybrid'
  price_inr_display: number
  original_price_inr: number
  status: 'draft' | 'published' | 'archived'
  completion_criteria: {
    min_attendance_pct: number
    all_quizzes_passed: boolean
    all_lessons_completed: boolean
  }
  thumbnail_url: string | null
  is_popular?: boolean
  highlights?: HighlightItem[] | null
  instructors?: InstructorItem[] | null
  faqs?: FaqItem[] | null
  sort_order: number
  category_sort_orders: Record<string, number> | null
}

interface Module {
  id: string
  course_id: string
  title: string
  sort_order: number
  drip_locked: boolean
}

interface Lesson {
  id: string
  module_id: string
  title: string
  type: 'video' | 'notes' | 'quiz' | 'recording'
  video_url: string | null
  content_md: string | null
  sort_order: number
  is_free_preview: boolean
}

interface Resource {
  id: string
  lesson_id: string
  title: string
  file_url: string
}

interface Batch {
  id: string
  course_id: string
  name: string
  starts_at: string | null
  ends_at: string | null
  invite_code: string | null
  status: 'open' | 'running' | 'completed'
}

interface CourseEditorClientProps {
  course: Course
  initialModules: Module[]
  initialLessons: Lesson[]
  initialResources: Resource[]
  initialBatches: Batch[]
}

export default function CourseEditorClient({
  course,
  initialModules,
  initialLessons,
  initialResources,
  initialBatches
}: CourseEditorClientProps) {
  const router = useRouter()
  const { toast, confirm } = useToast()

  // --- Curriculum States ---
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons)
  const [resources, setResources] = useState<Resource[]>(initialResources)
  const [batches, setBatches] = useState<Batch[]>(initialBatches)

  // --- Course Settings Form State ---
  const [title, setTitle] = useState(course.title)
  const [slug, setSlug] = useState(course.slug)
  const [description, setDescription] = useState(course.description || '')
  const [categories, setCategories] = useState<string[]>(course.categories || [])
  const [deliveryType, setDeliveryType] = useState<'recorded' | 'live' | 'hybrid'>(course.delivery_type)
  const [priceInrDisplay, setPriceInrDisplay] = useState(course.price_inr_display)
  const [originalPriceInr, setOriginalPriceInr] = useState(course.original_price_inr || 0)
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(course.status)
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url || '')
  const [isPopular, setIsPopular] = useState(course.is_popular || false)
  const [sortOrder, setSortOrder] = useState(course.sort_order || 0)
  const [categorySortOrders, setCategorySortOrders] = useState<Record<string, number>>(course.category_sort_orders || {})
  
  // Completion Criteria States
  const [minAttendancePct, setMinAttendancePct] = useState(course.completion_criteria.min_attendance_pct)
  const [allQuizzesPassed, setAllQuizzesPassed] = useState(course.completion_criteria.all_quizzes_passed)
  const [allLessonsCompleted, setAllLessonsCompleted] = useState(course.completion_criteria.all_lessons_completed)

  // Custom highlights and instructors states
  const [highlights, setHighlights] = useState<HighlightItem[]>(() => course.highlights || [])
  const [instructors, setInstructors] = useState<InstructorItem[]>(() => course.instructors || [])

  // Custom highlights handlers
  const handleAddHighlight = () => {
    setHighlights([...highlights, { title: '', desc: '', icon: 'Code' }])
  }
  const handleRemoveHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index))
  }
  const handleUpdateHighlight = (index: number, field: keyof HighlightItem, value: string) => {
    const updated = [...highlights]
    updated[index] = { ...updated[index], [field]: value } as HighlightItem
    setHighlights(updated)
  }

  // Custom instructors handlers
  const handleAddInstructor = () => {
    setInstructors([...instructors, { name: '', title: '', bio: '', avatar_url: '' }])
  }
  const handleRemoveInstructor = (index: number) => {
    setInstructors(instructors.filter((_, i) => i !== index))
  }
  const handleUpdateInstructor = (index: number, field: keyof InstructorItem, value: string) => {
    const updated = [...instructors]
    updated[index] = { ...updated[index], [field]: value }
    setInstructors(updated)
  }

  // Custom FAQs states and handlers
  const [faqs, setFaqs] = useState<FaqItem[]>(() => course.faqs || [])
  const handleAddFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }])
  }
  const handleRemoveFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index))
  }
  const handleUpdateFaq = (index: number, field: keyof FaqItem, value: string) => {
    const updated = [...faqs]
    updated[index] = { ...updated[index], [field]: value }
    setFaqs(updated)
  }

  const [isSavingCourse, setIsSavingCourse] = useState(false)
  const [courseError, setCourseError] = useState('')
  const [courseSuccess, setCourseSuccess] = useState(false)

  const [isUploading, setIsUploading] = useState(false)

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setCourseError('')

    try {
      const supabase = createClient()
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${course.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { data, error } = await supabase.storage
        .from('thumbnails')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        throw error
      }

      const { data: { publicUrl } } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(filePath)

      setThumbnailUrl(publicUrl)
    } catch (err: unknown) {
      console.error('Error uploading thumbnail:', err)
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setCourseError(`Failed to upload thumbnail: ${msg}. Make sure you have created a public bucket named "thumbnails" in your Supabase Storage dashboard.`)
    } finally {
      setIsUploading(false)
    }
  }

  const [avatarUploadLoading, setAvatarUploadLoading] = useState<number | null>(null)

  const handleInstructorAvatarUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarUploadLoading(idx)
    setCourseError('')

    try {
      const supabase = createClient()
      
      const fileExt = file.name.split('.').pop()
      const fileName = `instructor-${idx}-${course.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error } = await supabase.storage
        .from('thumbnails')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        throw error
      }

      const { data: { publicUrl } } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(filePath)

      handleUpdateInstructor(idx, 'avatar_url', publicUrl)
    } catch (err: unknown) {
      console.error('Error uploading avatar:', err)
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setCourseError(`Failed to upload photo: ${msg}.`)
    } finally {
      setAvatarUploadLoading(null)
    }
  }

  // --- Batch Modal/Form State ---
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [batchName, setBatchName] = useState('')
  const [batchInviteCode, setBatchInviteCode] = useState('')
  const [batchStartsAt, setBatchStartsAt] = useState('')
  const [batchEndsAt, setBatchEndsAt] = useState('')
  const [batchStatus, setBatchStatus] = useState<'open' | 'running' | 'completed'>('open')
  const [batchError, setBatchError] = useState('')
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false)

  // --- Module Modal States ---
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false)
  const [moduleModalMode, setModuleModalMode] = useState<'create' | 'edit'>('create')
  const [editingModuleId, setEditingModuleId] = useState('')
  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleDripLocked, setModuleDripLocked] = useState(false)
  const [moduleError, setModuleError] = useState('')

  // --- Lesson Modal States ---
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [lessonModalMode, setLessonModalMode] = useState<'create' | 'edit'>('create')
  const [targetModuleId, setTargetModuleId] = useState('')
  const [editingLessonId, setEditingLessonId] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonType, setLessonType] = useState<'video' | 'notes' | 'quiz' | 'recording'>('video')
  const [lessonVideoUrl, setLessonVideoUrl] = useState('')
  const [lessonContentMd, setLessonContentMd] = useState('')
  const [lessonIsFreePreview, setLessonIsFreePreview] = useState(false)
  const [lessonError, setLessonError] = useState('')

  // --- Resources (Materials) inline Form State ---
  const [newMaterialTitle, setNewMaterialTitle] = useState('')
  const [newMaterialUrl, setNewMaterialUrl] = useState('')
  const [materialError, setMaterialError] = useState('')

  // ==========================================================================
  // COURSE SETTINGS ACTIONS
  // ==========================================================================
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setCourseError('')
    setCourseSuccess(false)

    // PRD & Wireframe validation: Publish validates required fields (thumbnail, >=1 module, price)
    if (status === 'published') {
      const missingFields: string[] = []
      if (!thumbnailUrl || thumbnailUrl.trim().length === 0) {
        missingFields.push('Thumbnail Image URL')
      }
      if (modules.length === 0) {
        missingFields.push('at least 1 Module in the curriculum')
      }
      if (Number(priceInrDisplay) < 0) {
        missingFields.push('a valid display price (₹0 or greater)')
      }

      if (missingFields.length > 0) {
        setCourseError(`Cannot publish course. Please provide: ${missingFields.join(', ')}.`)
        return
      }
    }

    setIsSavingCourse(true)

    const criteria = {
      min_attendance_pct: Number(minAttendancePct),
      all_quizzes_passed: allQuizzesPassed,
      all_lessons_completed: allLessonsCompleted
    }

    const res = await updateCourse(course.id, {
      title,
      slug,
      categories,
      delivery_type: deliveryType,
      price_inr_display: Number(priceInrDisplay),
      original_price_inr: Number(originalPriceInr),
      status,
      is_popular: isPopular,
      completion_criteria: criteria,
      thumbnail_url: thumbnailUrl || null,
      highlights,
      instructors,
      faqs,
      sort_order: Number(sortOrder),
      category_sort_orders: categorySortOrders
    })

    setIsSavingCourse(false)
    if (res.error) {
      setCourseError(res.error)
    } else {
      setCourseSuccess(true)
      // Clear success banner after 4s
      setTimeout(() => setCourseSuccess(false), 4050)
      router.refresh()
    }
  }

  const handleDeleteCourse = async () => {
    const isConfirmed = await confirm({
      title: 'Delete Course',
      message: `Are you absolutely sure you want to delete "${course.title}"? This will delete all modules, lessons, student progress records, and resources. This action cannot be undone.`,
      confirmText: 'Delete',
      isDestructive: true
    })
    if (!isConfirmed) {
      return
    }

    const res = await deleteCourse(course.id)
    if (res.error) {
      toast.error(`Error deleting course: ${res.error}`)
    } else {
      router.push('/admin/courses')
    }
  }

  // ==========================================================================
  // BATCH CREATION ACTIONS
  // ==========================================================================
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setBatchError('')
    
    if (!batchName.trim()) {
      setBatchError('Batch name is required.')
      return
    }

    setIsSubmittingBatch(true)
    const res = await createBatch(
      course.id,
      batchName,
      batchStartsAt,
      batchEndsAt,
      batchInviteCode,
      batchStatus
    )
    setIsSubmittingBatch(false)

    if (res.error) {
      setBatchError(res.error)
    } else {
      // Fetch latest batches (simplified refresh by reloading window or refreshing routes)
      setIsBatchModalOpen(false)
      // Reset form
      setBatchName('')
      setBatchInviteCode('')
      setBatchStartsAt('')
      setBatchEndsAt('')
      setBatchStatus('open')
      window.location.reload() // Fully refresh to load batches lists
    }
  }

  // ==========================================================================
  // MODULE CRUD ACTIONS
  // ==========================================================================
  const openAddModule = () => {
    setModuleModalMode('create')
    setModuleTitle('')
    setModuleDripLocked(false)
    setModuleError('')
    setIsModuleModalOpen(true)
  }

  const openEditModule = (mod: Module) => {
    setModuleModalMode('edit')
    setEditingModuleId(mod.id)
    setModuleTitle(mod.title)
    setModuleDripLocked(mod.drip_locked)
    setModuleError('')
    setIsModuleModalOpen(true)
  }

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModuleError('')

    if (!moduleTitle.trim()) {
      setModuleError('Module title is required.')
      return
    }

    if (moduleModalMode === 'create') {
      const nextSortOrder = modules.length > 0 ? Math.max(...modules.map(m => m.sort_order)) + 1 : 1
      const res = await createModule(course.id, moduleTitle, nextSortOrder)
      if (res.error) {
        setModuleError(res.error)
      } else if (res.success && res.moduleId) {
        setModules([...modules, {
          id: res.moduleId,
          course_id: course.id,
          title: moduleTitle,
          sort_order: nextSortOrder,
          drip_locked: false
        }])
        setIsModuleModalOpen(false)
      }
    } else {
      const targetMod = modules.find(m => m.id === editingModuleId)
      if (!targetMod) return
      
      const res = await updateModule(editingModuleId, course.id, {
        title: moduleTitle,
        sort_order: targetMod.sort_order,
        drip_locked: moduleDripLocked
      })
      if (res.error) {
        setModuleError(res.error)
      } else {
        setModules(modules.map(m => m.id === editingModuleId ? { ...m, title: moduleTitle, drip_locked: moduleDripLocked } : m))
        setIsModuleModalOpen(false)
      }
    }
  }

  const handleDeleteModule = async (moduleId: string, title: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Module',
      message: `Are you sure you want to delete module "${title}"? This will cascade delete all lessons inside this module.`,
      confirmText: 'Delete',
      isDestructive: true
    })
    if (!isConfirmed) {
      return
    }

    const res = await deleteModule(moduleId, course.id)
    if (res.error) {
      toast.error(res.error)
    } else {
      setModules(modules.filter(m => m.id !== moduleId))
      setLessons(lessons.filter(l => l.module_id !== moduleId))
    }
  }

  const handleMoveModule = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= modules.length) return

    const updated = [...modules]
    // Swap sort order values
    const tempSort = updated[index].sort_order
    updated[index].sort_order = updated[targetIndex].sort_order
    updated[targetIndex].sort_order = tempSort

    // Swap elements
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp

    setModules(updated)

    // Save sort order in database
    await updateModule(updated[index].id, course.id, {
      title: updated[index].title,
      sort_order: updated[index].sort_order,
      drip_locked: updated[index].drip_locked
    })
    await updateModule(updated[targetIndex].id, course.id, {
      title: updated[targetIndex].title,
      sort_order: updated[targetIndex].sort_order,
      drip_locked: updated[targetIndex].drip_locked
    })
  }

  // ==========================================================================
  // LESSON CRUD ACTIONS
  // ==========================================================================
  const openAddLesson = (moduleId: string) => {
    setLessonModalMode('create')
    setTargetModuleId(moduleId)
    setLessonTitle('')
    setLessonType('video')
    setLessonVideoUrl('')
    setLessonContentMd('')
    setLessonIsFreePreview(false)
    setLessonError('')
    setNewMaterialTitle('')
    setNewMaterialUrl('')
    setMaterialError('')
    setIsLessonModalOpen(true)
  }

  const openEditLesson = (les: Lesson) => {
    setLessonModalMode('edit')
    setEditingLessonId(les.id)
    setTargetModuleId(les.module_id)
    setLessonTitle(les.title)
    setLessonType(les.type)
    setLessonVideoUrl(les.video_url || '')
    setLessonContentMd(les.content_md || '')
    setLessonIsFreePreview(les.is_free_preview)
    setLessonError('')
    setNewMaterialTitle('')
    setNewMaterialUrl('')
    setMaterialError('')
    setIsLessonModalOpen(true)
  }

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLessonError('')

    if (!lessonTitle.trim()) {
      setLessonError('Lesson title is required.')
      return
    }

    if (lessonModalMode === 'create') {
      const moduleLessons = lessons.filter(l => l.module_id === targetModuleId)
      const nextSortOrder = moduleLessons.length > 0 ? Math.max(...moduleLessons.map(l => l.sort_order)) + 1 : 1
      
      const res = await createLesson(course.id, targetModuleId, {
        title: lessonTitle,
        type: lessonType,
        video_url: lessonVideoUrl,
        content_md: lessonContentMd,
        sort_order: nextSortOrder,
        is_free_preview: lessonIsFreePreview
      })

      if (res.error) {
        setLessonError(res.error)
      } else if (res.success && res.lessonId) {
        setLessons([...lessons, {
          id: res.lessonId,
          module_id: targetModuleId,
          title: lessonTitle,
          type: lessonType,
          video_url: lessonVideoUrl || null,
          content_md: lessonContentMd || null,
          sort_order: nextSortOrder,
          is_free_preview: lessonIsFreePreview
        }])
        setIsLessonModalOpen(false)
      }
    } else {
      const targetLes = lessons.find(l => l.id === editingLessonId)
      if (!targetLes) return

      const res = await updateLesson(editingLessonId, course.id, {
        title: lessonTitle,
        type: lessonType,
        video_url: lessonVideoUrl,
        content_md: lessonContentMd,
        sort_order: targetLes.sort_order,
        is_free_preview: lessonIsFreePreview
      })

      if (res.error) {
        setLessonError(res.error)
      } else {
        setLessons(lessons.map(l => l.id === editingLessonId ? {
          ...l,
          title: lessonTitle,
          type: lessonType,
          video_url: lessonVideoUrl || null,
          content_md: lessonContentMd || null,
          is_free_preview: lessonIsFreePreview
        } : l))
        setIsLessonModalOpen(false)
      }
    }
  }

  const handleDeleteLesson = async (lessonId: string, title: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Lesson',
      message: `Are you sure you want to delete lesson "${title}"?`,
      confirmText: 'Delete',
      isDestructive: true
    })
    if (!isConfirmed) {
      return
    }

    const res = await deleteLesson(lessonId, course.id)
    if (res.error) {
      toast.error(res.error)
    } else {
      setLessons(lessons.filter(l => l.id !== lessonId))
      setResources(resources.filter(r => r.lesson_id !== lessonId))
    }
  }

  const handleMoveLesson = async (moduleId: string, index: number, direction: 'up' | 'down') => {
    const moduleLessons = lessons
      .filter((l) => l.module_id === moduleId)
      .sort((a, b) => a.sort_order - b.sort_order)
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= moduleLessons.length) return

    const les1 = moduleLessons[index]
    const les2 = moduleLessons[targetIndex]

    // Swap sorting order in local states
    const tempSort = les1.sort_order
    les1.sort_order = les2.sort_order
    les2.sort_order = tempSort

    setLessons(
      lessons.map((l) => {
        if (l.id === les1.id) return { ...l, sort_order: les1.sort_order }
        if (l.id === les2.id) return { ...l, sort_order: les2.sort_order }
        return l;
      })
    )

    // Save in DB
    await updateLesson(les1.id, course.id, {
      title: les1.title,
      type: les1.type,
      video_url: les1.video_url,
      content_md: les1.content_md,
      sort_order: les1.sort_order,
      is_free_preview: les1.is_free_preview
    })
    await updateLesson(les2.id, course.id, {
      title: les2.title,
      type: les2.type,
      video_url: les2.video_url,
      content_md: les2.content_md,
      sort_order: les2.sort_order,
      is_free_preview: les2.is_free_preview
    })
  }

  // ==========================================================================
  // DOWNLOADABLE MATERIALS (RESOURCES) ACTIONS
  // ==========================================================================
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    setMaterialError('')

    if (!newMaterialTitle.trim()) {
      setMaterialError('Resource title is required.')
      return
    }
    if (!newMaterialUrl.trim()) {
      setMaterialError('File link / URL is required.')
      return
    }

    const res = await createResource(course.id, editingLessonId, newMaterialTitle, newMaterialUrl)
    if (res.error) {
      setMaterialError(res.error)
    } else {
      // Re-fetch resources list (simplified mock refresh, we fetch the complete list again via router or local state)
      // Since createResource inserts to DB, let's append to local state
      const tempId = Math.random().toString() // Temporary ID until page refreshes
      setResources([...resources, {
        id: tempId, // Temporary unique key
        lesson_id: editingLessonId,
        title: newMaterialTitle,
        file_url: newMaterialUrl
      }])
      setNewMaterialTitle('')
      setNewMaterialUrl('')
      // Trigger a soft data revalidation
      router.refresh()
    }
  }

  const handleDeleteMaterial = async (resourceId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Reference Material',
      message: 'Delete this reference material resource?',
      confirmText: 'Delete',
      isDestructive: true
    })
    if (!isConfirmed) {
      return
    }
    const res = await deleteResource(resourceId, course.id)
    if (res.error) {
      toast.error(res.error)
    } else {
      setResources(resources.filter(r => r.id !== resourceId))
    }
  }

  return (
    <div className="font-body text-xs space-y-6">
      
      {/* Title Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Course Builder</span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">{course.title}</h2>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/courses/${course.slug}`}
            target="_blank"
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
          >
            👁 Public Page
          </Link>
          <button
            onClick={handleDeleteCourse}
            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
          >
            ⌫ Delete Course
          </button>
        </div>
      </div>

      {courseSuccess && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-700 font-semibold p-4 rounded-xl shadow-3xs flex items-center justify-between animate-fade-in">
          <span>✓ Course details saved successfully. All changes are live.</span>
        </div>
      )}

      {courseError && (
        <div className="bg-rose-50 border border-rose-250 text-rose-700 font-semibold p-4 rounded-xl shadow-3xs animate-fade-in">
          ⚠️ {courseError}
        </div>
      )}

      {/* Main Split Grid (Settings / Curriculum) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Course Settings (4 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-6 shadow-3xs h-fit">
          <form onSubmit={handleSaveCourse} className="space-y-4">
            <h3 className="text-slate-900 font-bold text-sm font-display pb-2 border-b border-slate-100 flex items-center gap-1.5">
              ⚙ Course Settings
            </h3>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white py-2 px-3 rounded-xl outline-hidden text-slate-800 transition-all font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">URL Slug</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9-]/g, ''))}
                className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white py-2 px-3 rounded-xl outline-hidden text-slate-800 transition-all font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-xs">Delivery Type</label>
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as 'recorded' | 'live' | 'hybrid')}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white py-2.5 px-3 rounded-xl outline-hidden text-slate-855 font-medium cursor-pointer text-xs"
                >
                  <option value="hybrid">Hybrid (Live + Recorded)</option>
                  <option value="recorded">Recorded (Self-paced)</option>
                  <option value="live">Live (Cohort schedule)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-xs">Discounted Price (INR)</label>
                <input
                  type="number"
                  required
                  value={priceInrDisplay}
                  onChange={(e) => setPriceInrDisplay(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white py-2.5 px-3 rounded-xl outline-hidden text-slate-800 font-mono text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-xs">Original Price (INR)</label>
                <input
                  type="number"
                  required
                  value={originalPriceInr}
                  onChange={(e) => setOriginalPriceInr(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white py-2.5 px-3 rounded-xl outline-hidden text-slate-800 font-mono text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <label className="font-bold text-slate-700 block text-xs">Categories</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-[140px] overflow-y-auto">
                  {COURSE_CATEGORIES.map((c) => {
                    const checked = categories.includes(c)
                    return (
                      <label key={c} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setCategories(categories.filter(item => item !== c))
                            } else {
                              setCategories([...categories, c])
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
            </div>

            {/* Tab Sort Orders Overrides */}
            {categories.length > 0 && (
              <div className="space-y-2 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/65 mt-3">
                <label className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider">
                  Tab-Specific Sequences
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {categories.map((c) => (
                    <div key={c} className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 block truncate">{c}</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={categorySortOrders[c] ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0
                          setCategorySortOrders({
                            ...categorySortOrders,
                            [c]: val
                          })
                        }}
                        className="w-full bg-white border border-slate-200 py-1 px-2 rounded-lg text-slate-800 font-semibold font-mono text-xs focus:border-primary outline-hidden"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'archived')}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white py-2 px-3 rounded-xl outline-hidden text-slate-855 font-semibold cursor-pointer"
                >
                  <option value="draft">Draft (Invisible)</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Sequence Order</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white py-2 px-3 rounded-xl outline-hidden text-slate-855 font-semibold font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="is-popular-checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="w-4 h-4 text-primary border-slate-300 rounded-sm focus:ring-primary cursor-pointer"
              />
              <label htmlFor="is-popular-checkbox" className="font-bold text-slate-700 select-none cursor-pointer">
                ⭐ Mark as Popular Course (Show on homepage)
              </label>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Thumbnail Image</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    disabled={isUploading}
                    className="hidden"
                    id="thumbnail-file-upload"
                  />
                  <label
                    htmlFor="thumbnail-file-upload"
                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed text-slate-600 font-bold py-2 px-3 rounded-xl transition-all cursor-pointer text-center block"
                  >
                    {isUploading ? 'Uploading to Supabase...' : '📁 Upload Image File'}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">OR</span>
                  <input
                    type="text"
                    placeholder="Paste direct URL (https://...)"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white py-1.5 px-3 rounded-xl outline-hidden text-slate-800 transition-all font-mono text-[11px]"
                  />
                </div>
                {thumbnailUrl && (
                  <div className="relative h-20 w-full rounded-xl overflow-hidden border border-slate-150 bg-slate-50 mt-1">
                    <Image src={thumbnailUrl} alt="Thumbnail preview" fill className="object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="font-bold text-slate-700 block border-b border-slate-100 pb-1">🎓 Certificate Criteria</label>
              
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-650 block">Min Attendance Threshold (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minAttendancePct}
                    onChange={(e) => setMinAttendancePct(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 focus:border-slate-400 py-1.5 px-3 rounded-lg outline-hidden text-slate-800 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 font-semibold text-slate-750 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allQuizzesPassed}
                      onChange={(e) => setAllQuizzesPassed(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>All Quizzes must be Passed</span>
                  </label>

                  <label className="flex items-center gap-2 font-semibold text-slate-750 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allLessonsCompleted}
                      onChange={(e) => setAllLessonsCompleted(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>All Lessons must be Marked Complete</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Highlights Section */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                <label className="font-bold text-slate-700 block">✨ Course Highlights ({highlights.length})</label>
                <button
                  type="button"
                  onClick={handleAddHighlight}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1 px-2.5 rounded-lg transition-colors text-[10px] cursor-pointer"
                >
                  + Add Highlight
                </button>
              </div>

              <div className="space-y-3">
                {highlights.map((hl, idx) => (
                  <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 relative space-y-2.5">
                    <button
                      type="button"
                      onClick={() => handleRemoveHighlight(idx)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-600 text-[10px] font-bold py-0.5 px-1.5 hover:bg-slate-150 rounded-md cursor-pointer transition-colors"
                      title="Remove highlight"
                    >
                      ✕ Remove
                    </button>
                    <div className="space-y-1 pr-20">
                      <label className="font-bold text-slate-550 block text-[10px]">Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AI Pedagogy"
                        value={hl.title}
                        onChange={(e) => handleUpdateHighlight(idx, 'title', e.target.value)}
                        className="w-full bg-white border border-slate-205 focus:border-slate-400 py-1 px-2.5 rounded-lg outline-hidden text-slate-800 font-semibold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-550 block text-[10px]">Description</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Key outcome explanation..."
                        value={hl.desc}
                        onChange={(e) => handleUpdateHighlight(idx, 'desc', e.target.value)}
                        className="w-full bg-white border border-slate-205 focus:border-slate-400 py-1 px-2.5 rounded-lg outline-hidden text-slate-800 font-medium leading-relaxed text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-550 block text-[10px]">Icon</label>
                      <select
                        value={hl.icon}
                        onChange={(e) => handleUpdateHighlight(idx, 'icon', e.target.value)}
                        className="w-full bg-white border border-slate-205 focus:border-slate-400 py-1.5 px-2 rounded-lg outline-hidden text-slate-800 font-semibold cursor-pointer text-xs"
                      >
                        <option value="Brain">Brain 🧠</option>
                        <option value="GraduationCap">Graduation Cap 🎓</option>
                        <option value="Cpu">CPU/Microchip ⚙️</option>
                        <option value="Code">Code/Terminal 💻</option>
                        <option value="Award">Award/Badge 🎖️</option>
                      </select>
                    </div>
                  </div>
                ))}
                {highlights.length === 0 && (
                  <p className="text-[10px] text-slate-400 italic text-center py-2">No highlights added yet.</p>
                )}
              </div>
            </div>

            {/* Instructors Section */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                <label className="font-bold text-slate-700 block">👥 Instructors ({instructors.length})</label>
                <button
                  type="button"
                  onClick={handleAddInstructor}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1 px-2.5 rounded-lg transition-colors text-[10px] cursor-pointer"
                >
                  + Add Instructor
                </button>
              </div>

              <div className="space-y-3">
                {instructors.map((inst, idx) => (
                  <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 relative space-y-2.5">
                    <button
                      type="button"
                      onClick={() => handleRemoveInstructor(idx)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-600 text-[10px] font-bold py-0.5 px-1.5 hover:bg-slate-150 rounded-md cursor-pointer transition-colors"
                      title="Remove instructor"
                    >
                      ✕ Remove
                    </button>
                    <div className="space-y-1 pr-20">
                      <label className="font-bold text-slate-550 block text-[10px]">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ravi Patel"
                        value={inst.name}
                        onChange={(e) => handleUpdateInstructor(idx, 'name', e.target.value)}
                        className="w-full bg-white border border-slate-205 focus:border-slate-400 py-1 px-2.5 rounded-lg outline-hidden text-slate-800 font-semibold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-550 block text-[10px]">Title/Credentials</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Founder, Embark AI Institute"
                        value={inst.title}
                        onChange={(e) => handleUpdateInstructor(idx, 'title', e.target.value)}
                        className="w-full bg-white border border-slate-205 focus:border-slate-400 py-1 px-2.5 rounded-lg outline-hidden text-slate-800 font-semibold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-550 block text-[10px]">Photo / Avatar URL (Optional)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Paste image link (https://...)"
                          value={inst.avatar_url || ''}
                          onChange={(e) => handleUpdateInstructor(idx, 'avatar_url', e.target.value)}
                          className="flex-1 bg-white border border-slate-205 focus:border-slate-400 py-1 px-2.5 rounded-lg outline-hidden text-slate-800 font-semibold text-xs font-mono"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleInstructorAvatarUpload(idx, e)}
                          disabled={avatarUploadLoading === idx}
                          className="hidden"
                          id={`instructor-avatar-upload-${idx}`}
                        />
                        <label
                          htmlFor={`instructor-avatar-upload-${idx}`}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1 px-2.5 rounded-lg transition-colors text-[10px] cursor-pointer whitespace-nowrap border border-slate-200 flex items-center justify-center"
                        >
                          {avatarUploadLoading === idx ? 'Uploading...' : '📁 Upload Photo'}
                        </label>
                      </div>
                      {inst.avatar_url && inst.avatar_url.trim().length > 0 && (
                        <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mt-1">
                          <Image src={inst.avatar_url} alt="Instructor preview" fill className="object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-550 block text-[10px]">Biography</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Instructor background details..."
                        value={inst.bio}
                        onChange={(e) => handleUpdateInstructor(idx, 'bio', e.target.value)}
                        className="w-full bg-white border border-slate-205 focus:border-slate-400 py-1 px-2.5 rounded-lg outline-hidden text-slate-800 font-medium leading-relaxed text-xs"
                      />
                    </div>
                  </div>
                ))}
                {instructors.length === 0 && (
                  <p className="text-[10px] text-slate-400 italic text-center py-2">No instructors added yet.</p>
                )}
              </div>
            </div>

            {/* FAQs Section */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                <label className="font-bold text-slate-700 block">❓ Frequently Asked Questions ({faqs.length})</label>
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1 px-2.5 rounded-lg transition-colors text-[10px] cursor-pointer"
                >
                  + Add FAQ
                </button>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 relative space-y-2.5">
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(idx)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-600 text-[10px] font-bold py-0.5 px-1.5 hover:bg-slate-150 rounded-md cursor-pointer transition-colors"
                      title="Remove FAQ"
                    >
                      ✕ Remove
                    </button>
                    <div className="space-y-1 pr-20">
                      <label className="font-bold text-slate-550 block text-[10px]">Question</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. What are the timings?"
                        value={faq.question}
                        onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                        className="w-full bg-white border border-slate-205 focus:border-slate-400 py-1 px-2.5 rounded-lg outline-hidden text-slate-800 font-semibold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-550 block text-[10px]">Answer</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="FAQ answer details..."
                        value={faq.answer}
                        onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                        className="w-full bg-white border border-slate-205 focus:border-slate-400 py-1 px-2.5 rounded-lg outline-hidden text-slate-800 font-medium leading-relaxed text-xs"
                      />
                    </div>
                  </div>
                ))}
                {faqs.length === 0 && (
                  <p className="text-[10px] text-slate-400 italic text-center py-2">No custom FAQs added yet (will fall back to general defaults).</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingCourse}
              className="w-full bg-primary hover:bg-primary-light text-white font-bold py-2 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50 text-center block shadow-xs"
            >
              {isSavingCourse ? 'Saving changes...' : 'Save Settings ✓'}
            </button>
          </form>

          {/* Quick Batches Manager Section */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-xs">👥 Course Batches ({batches.length})</h4>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1 px-2.5 rounded-lg transition-colors text-[10px] cursor-pointer"
              >
                + Create Batch
              </button>
            </div>

            {batches.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {batches.map((b) => (
                  <div key={b.id} className="p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4">
                    <div>
                      <div className="font-bold text-slate-800">{b.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Code: <span className="font-mono">{b.invite_code || 'No Invite Code'}</span>
                        {b.starts_at && ` · Starts ${formatISTDate(b.starts_at, { day: 'numeric', month: 'short' })}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 border rounded ${
                        b.status === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        b.status === 'running' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {b.status}
                      </span>
                      <Link
                        href={`/admin/batches/${b.id}`}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1 px-2 rounded-md transition-colors text-[9px] cursor-pointer"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-450 italic">
                No batches created for this course. Create one to enable cohort enrollments and schedules.
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Curriculum Builder (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-6 shadow-3xs">
          
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-slate-900 font-bold text-sm font-display flex items-center gap-1.5">
              📖 Curriculum Modules
            </h3>
            <button
              onClick={openAddModule}
              className="bg-primary hover:bg-primary-light text-white font-bold py-1 px-3 rounded-lg transition-colors text-[10px] shadow-2xs cursor-pointer"
            >
              + Add Module
            </button>
          </div>

          {modules.length > 0 ? (
            <div className="space-y-4">
              {modules
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((mod, index) => {
                  const moduleLessons = lessons
                    .filter((l) => l.module_id === mod.id)
                    .sort((a, b) => a.sort_order - b.sort_order)

                  return (
                    <div key={mod.id} className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-2xs">
                      {/* Module Header */}
                      <div className="bg-slate-50/70 border-b border-slate-150 px-4 py-3 flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-450 font-bold font-mono">⠿</span>
                          <span className="font-bold text-slate-850 text-xs sm:text-sm">
                            {mod.title}
                          </span>
                          {mod.drip_locked && (
                            <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded font-mono">
                              Drip
                            </span>
                          )}
                        </div>

                        {/* Module Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            disabled={index === 0}
                            onClick={() => handleMoveModule(index, 'up')}
                            className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer text-xs"
                            title="Move Module Up"
                          >
                            ▲
                          </button>
                          <button
                            disabled={index === modules.length - 1}
                            onClick={() => handleMoveModule(index, 'down')}
                            className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer text-xs"
                            title="Move Module Down"
                          >
                            ▼
                          </button>
                          <button
                            onClick={() => openEditModule(mod)}
                            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-1 px-2.5 rounded-lg text-[9px] cursor-pointer ml-1 font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteModule(mod.id, mod.title)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 py-1 px-2 rounded-lg text-[9px] cursor-pointer ml-1 font-semibold"
                          >
                            ⌫
                          </button>
                        </div>
                      </div>

                      {/* Lessons List inside Module */}
                      <div className="divide-y divide-slate-100">
                        {moduleLessons.length > 0 ? (
                          moduleLessons.map((les, lIdx) => {
                            const lessonIcon = ({
                              video: '▶',
                              notes: '📄',
                              quiz: '❓',
                              recording: '🎥'
                            })[les.type]

                            const lessonBadge = ({
                              video: 'Video',
                              notes: 'Notes',
                              quiz: 'Quiz',
                              recording: 'Live Class Recording'
                            })[les.type]

                            const lessonMaterials = resources.filter((r) => r.lesson_id === les.id)

                            return (
                              <div key={les.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/30 transition-colors gap-4">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 font-bold font-mono">{lessonIcon}</span>
                                    <span className="font-semibold text-slate-800">{les.title}</span>
                                    {les.is_free_preview && (
                                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded font-mono">
                                        Free Preview
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                                    <span className="font-medium bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.2 rounded">{lessonBadge}</span>
                                    {lessonMaterials.length > 0 && (
                                      <span className="font-medium text-indigo-600">📂 {lessonMaterials.length} materials</span>
                                    )}
                                    {les.video_url && (
                                      <span className="font-mono truncate max-w-[150px]">{les.video_url}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Lesson Actions */}
                                <div className="flex items-center gap-1">
                                  <button
                                    disabled={lIdx === 0}
                                    onClick={() => handleMoveLesson(mod.id, lIdx, 'up')}
                                    className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer text-[10px]"
                                    title="Move Lesson Up"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    disabled={lIdx === moduleLessons.length - 1}
                                    onClick={() => handleMoveLesson(mod.id, lIdx, 'down')}
                                    className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer text-[10px]"
                                    title="Move Lesson Down"
                                  >
                                    ▼
                                  </button>
                                  
                                  {les.type === 'quiz' && (
                                    <Link
                                      href={`/admin/lessons/${les.id}/quiz`}
                                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 py-1 px-2.5 rounded-lg text-[9px] font-bold cursor-pointer transition-colors"
                                    >
                                      📝 Edit Quiz
                                    </Link>
                                  )}

                                  <button
                                    onClick={() => openEditLesson(les)}
                                    className="bg-white hover:bg-slate-150 border border-slate-200 text-slate-650 py-1 px-2.5 rounded-lg text-[9px] cursor-pointer font-semibold"
                                  >
                                    Edit Details &amp; Materials
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLesson(les.id, les.title)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 py-1 px-2 rounded-lg text-[9px] cursor-pointer font-bold"
                                    title="Delete Lesson"
                                  >
                                    ⌫
                                  </button>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="p-4 text-center text-slate-400 italic">
                            No lessons added to this module.
                          </div>
                        )}
                        
                        {/* Add Lesson CTA */}
                        <div className="bg-slate-50/30 p-2.5 flex justify-center">
                          <button
                            onClick={() => openAddLesson(mod.id)}
                            className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 border-dashed text-[9px] font-bold py-1 px-4 rounded-lg transition-all cursor-pointer w-full text-center"
                          >
                            + Add Lesson
                          </button>
                        </div>
                      </div>

                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 italic">
              No modules added yet. Click &ldquo;+ Add Module&rdquo; to start structuring your course curriculum.
            </div>
          )}

        </div>

      </div>

      {/* ====================================================================
          MODAL: ADD/EDIT MODULE
          ==================================================================== */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base font-display">
                {moduleModalMode === 'create' ? 'Add Curriculum Module' : 'Edit Module Settings'}
              </h3>
              <button
                onClick={() => setIsModuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {moduleError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-xl">
                ⚠️ {moduleError}
              </div>
            )}

            <form onSubmit={handleModuleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Module Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Module 1: AI Foundations"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-2 px-3 rounded-xl outline-hidden transition-all font-medium"
                />
              </div>

              {moduleModalMode === 'edit' && (
                <label className="flex items-center gap-2 font-bold text-slate-750 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={moduleDripLocked}
                    onChange={(e) => setModuleDripLocked(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Drip Lock module content (visible but content locked for students initially)</span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModuleModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-light text-white font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {moduleModalMode === 'create' ? 'Add Module ✓' : 'Save Module ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: ADD/EDIT LESSON (WITH MATERIALS/RESOURCES INTERNAL FLOW)
          ==================================================================== */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden flex flex-col p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base font-display">
                {lessonModalMode === 'create' ? 'Add Lesson Content' : 'Edit Lesson & Materials'}
              </h3>
              <button
                onClick={() => setIsLessonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {lessonError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2.5 rounded-xl font-semibold">
                ⚠️ {lessonError}
              </div>
            )}

            <form onSubmit={handleLessonSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Lesson Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1.1 Intro video"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-2 px-3 rounded-xl outline-hidden transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Lesson Type</label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value as 'video' | 'notes' | 'quiz' | 'recording')}
                    className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-2 px-3 rounded-xl outline-hidden transition-all cursor-pointer font-medium"
                  >
                    <option value="video">▶ Pre-recorded Video (YouTube Embed)</option>
                    <option value="notes">📄 Markdown text notes</option>
                    <option value="quiz">❓ Interactive Quiz</option>
                    <option value="recording">🎥 Live Session Recording link</option>
                  </select>
                </div>
              </div>

              {(lessonType === 'video' || lessonType === 'recording') && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Video URL (Unlisted YouTube Embed Link)</label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={lessonVideoUrl}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-2 px-3 rounded-xl outline-hidden transition-all font-mono"
                  />
                </div>
              )}

              {lessonType === 'notes' && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Content Notes (Markdown format support)</label>
                  <textarea
                    rows={6}
                    placeholder="# Hello, in this lesson we will study..."
                    value={lessonContentMd}
                    onChange={(e) => setLessonContentMd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-2 px-3 rounded-xl outline-hidden transition-all font-mono text-[11px]"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 font-bold text-slate-750 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={lessonIsFreePreview}
                  onChange={(e) => setLessonIsFreePreview(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span>Enable Free Preview badge (accessible without enrollment)</span>
              </label>

              {/* DOWNLOADABLE MATERIALS (RESOURCES) SUB-SECTION */}
              {lessonModalMode === 'edit' && (
                <div className="border-t border-slate-150 pt-4 mt-4 space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    📂 Downloadable Reference Materials (Download links)
                  </h4>
                  
                  {materialError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] p-2 rounded-lg">
                      ⚠️ {materialError}
                    </div>
                  )}

                  {/* Materials list */}
                  <div className="space-y-2">
                    {resources.filter(r => r.lesson_id === editingLessonId).length > 0 ? (
                      <div className="divide-y divide-slate-100 border border-slate-150 rounded-xl overflow-hidden text-[11px] bg-slate-50/50">
                        {resources
                          .filter(r => r.lesson_id === editingLessonId)
                          .map((res) => (
                            <div key={res.id} className="p-2.5 flex justify-between items-center gap-4">
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-800 block truncate">{res.title}</span>
                                <span className="text-[9px] text-slate-400 font-mono block truncate">{res.file_url}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteMaterial(res.id)}
                                className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-bold px-2 py-1 rounded-md text-[9px]"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-150 text-slate-450 italic">
                        No downloadable materials added to this lesson yet.
                      </div>
                    )}
                  </div>

                  {/* Add material inline form */}
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Add Reference Material (Material link)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Material Title (e.g. Class slides PDF)"
                        value={newMaterialTitle}
                        onChange={(e) => setNewMaterialTitle(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-slate-400 py-1.5 px-3.5 rounded-lg outline-hidden text-[11px]"
                      />
                      <input
                        type="url"
                        placeholder="File link / Google Drive URL"
                        value={newMaterialUrl}
                        onChange={(e) => setNewMaterialUrl(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-slate-400 py-1.5 px-3.5 rounded-lg outline-hidden text-[11px]"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddMaterial}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1 px-3 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                      >
                        + Add Material link
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-light text-white font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {lessonModalMode === 'create' ? 'Create Lesson ✓' : 'Save Lesson Details ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: CREATE BATCH
          ==================================================================== */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base font-display">
                Create Course Batch (Cohort)
              </h3>
              <button
                onClick={() => {
                  setIsBatchModalOpen(false)
                  setBatchError('')
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {batchError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2.5 rounded-xl font-medium">
                ⚠️ {batchError}
              </div>
            )}

            <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Batch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Batch 3 — Aug 2026"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-2 px-3 rounded-xl outline-hidden transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Invite Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. CVM-B3-2026"
                  value={batchInviteCode}
                  onChange={(e) => setBatchInviteCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-2 px-3 rounded-xl outline-hidden transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Start Date</label>
                  <input
                    type="date"
                    value={batchStartsAt}
                    onChange={(e) => setBatchStartsAt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-2 px-3 rounded-xl outline-hidden transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">End Date</label>
                  <input
                    type="date"
                    value={batchEndsAt}
                    onChange={(e) => setBatchEndsAt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-2 px-3 rounded-xl outline-hidden transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Initial Status</label>
                <select
                  value={batchStatus}
                  onChange={(e) => setBatchStatus(e.target.value as 'open' | 'running' | 'completed')}
                  className="w-full bg-slate-50 border border-slate-250 focus:border-slate-400 focus:bg-white text-slate-800 py-2 px-3 rounded-xl outline-hidden transition-all cursor-pointer font-medium"
                >
                  <option value="open">Open (Enrolling)</option>
                  <option value="running">Running (Class ongoing)</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsBatchModalOpen(false)
                    setBatchError('')
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="bg-primary hover:bg-primary-light text-white font-bold py-2 px-4 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmittingBatch ? 'Creating...' : 'Create Batch ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

// Shared COURSE_CATEGORIES used from Constants
