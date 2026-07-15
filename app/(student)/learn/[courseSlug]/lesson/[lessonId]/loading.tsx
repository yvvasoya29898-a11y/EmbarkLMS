import React from 'react'

export default function LessonLoading() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col justify-between font-body text-slate-800">
      
      {/* Header skeleton */}
      <header className="border-b border-slate-100 bg-white px-6 py-4 animate-pulse">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 bg-slate-200 rounded-lg" />
            <div className="h-5 w-40 bg-slate-200 rounded-md" />
          </div>
          <div className="h-8 w-24 bg-slate-200 rounded-xl" />
        </div>
      </header>

      {/* Main player layout skeleton */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Lesson Content and Tabs */}
        <div className="flex-1 space-y-6">
          {/* Aspect Video Player placeholder */}
          <div className="bg-slate-900 rounded-2xl aspect-video w-full flex items-center justify-center animate-pulse">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-[12px] border-l-white/30 ml-1" />
            </div>
          </div>

          {/* Lesson Title and mark complete */}
          <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 animate-pulse">
            <div className="space-y-2 flex-1">
              <div className="h-6 w-3/4 bg-slate-200 rounded-lg" />
              <div className="h-4 w-1/4 bg-slate-200 rounded-md" />
            </div>
            <div className="h-9 w-32 bg-slate-200 rounded-xl shrink-0" />
          </div>

          {/* Notes/Resources Tabs skeleton */}
          <div className="space-y-4 animate-pulse">
            <div className="flex gap-2 border-b border-slate-150 pb-2">
              <div className="h-8 w-20 bg-slate-200 rounded-lg" />
              <div className="h-8 w-24 bg-slate-200 rounded-lg" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-full bg-slate-200 rounded-md" />
              <div className="h-4 w-5/6 bg-slate-200 rounded-md" />
              <div className="h-4 w-4/5 bg-slate-200 rounded-md" />
            </div>
          </div>
        </div>

        {/* Right Column: Outline Sidebar skeleton */}
        <div className="w-full lg:w-80 space-y-4 shrink-0">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 animate-pulse">
            <div className="h-5 w-32 bg-slate-200 rounded-md" />
            
            {/* Outline structure list placeholders */}
            {[1, 2, 3].map((moduleIdx) => (
              <div key={moduleIdx} className="space-y-2">
                {/* Module Heading */}
                <div className="h-6 w-5/6 bg-slate-100 rounded-md mt-4" />
                {/* Lessons list inside module */}
                {[1, 2].map((lessonIdx) => (
                  <div key={lessonIdx} className="flex gap-2 items-center p-2 rounded-lg border border-slate-50">
                    <div className="h-4 w-4 bg-slate-200 rounded-full" />
                    <div className="h-3.5 w-full bg-slate-100 rounded-md" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  )
}
