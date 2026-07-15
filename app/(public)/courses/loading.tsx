import React from 'react'

export default function CatalogLoading() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between relative overflow-hidden font-body">
      {/* Brand-aligned soft ambient light effects */}
      <div className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] bg-primary-light/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Modern thin line grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 md:py-16 relative z-10 space-y-12">
        {/* Page Hero Title Skeleton */}
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-36 bg-slate-200 rounded-full" />
          <div className="h-10 md:h-12 w-96 bg-slate-200 rounded-xl" />
          <div className="space-y-2">
            <div className="h-4 w-full max-w-xl bg-slate-200 rounded-md" />
            <div className="h-4 w-96 bg-slate-200 rounded-md" />
          </div>
        </div>

        {/* Category Pill Filters Skeleton */}
        <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-24 bg-slate-200 rounded-full" />
          ))}
        </div>

        {/* Course Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-4">
          {[1, 2, 3, 4].map((card) => (
            <div
              key={card}
              className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between h-[420px] md:h-[450px] animate-pulse"
            >
              {/* Media Block placeholder */}
              <div className="bg-slate-200 aspect-video w-full" />

              {/* Text Blocks placeholder */}
              <div className="p-5 md:p-6 space-y-4 flex-1">
                <div className="flex justify-between items-start">
                  <div className="h-4 w-28 bg-slate-200 rounded-md" />
                  <div className="h-4 w-16 bg-slate-200 rounded-md" />
                </div>
                <div className="h-6 w-3/4 bg-slate-200 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-200 rounded-md" />
                  <div className="h-3 w-5/6 bg-slate-200 rounded-md" />
                </div>
              </div>

              {/* Footer CTA placeholder */}
              <div className="p-5 md:p-6 border-t border-slate-100 flex items-center justify-between gap-4">
                <div className="h-6 w-24 bg-slate-200 rounded-full" />
                <div className="h-9 w-28 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
