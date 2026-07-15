import React from 'react'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-body">
      {/* Dashboard Header skeleton */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-40 px-6 py-4 animate-pulse">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="h-8 w-28 bg-slate-200 rounded-lg" />
          <div className="flex gap-4">
            <div className="h-8 w-20 bg-slate-200 rounded-full" />
            <div className="h-8 w-8 bg-slate-200 rounded-full" />
          </div>
        </div>
      </header>

      {/* Main Content Layout skeleton */}
      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Welcome Title */}
          <div className="space-y-2 animate-pulse">
            <div className="h-8 w-48 bg-slate-200 rounded-lg" />
            <div className="h-4 w-72 bg-slate-200 rounded-md" />
          </div>

          {/* Next Live Class Card skeleton */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden h-48 flex flex-col justify-between animate-pulse">
            <div className="space-y-3">
              <div className="h-5 w-24 bg-white/20 rounded-md" />
              <div className="h-7 w-3/4 bg-white/25 rounded-lg" />
            </div>
            <div className="flex justify-between items-end border-t border-white/10 pt-4">
              <div className="h-8 w-32 bg-white/20 rounded-md" />
              <div className="h-10 w-24 bg-white/30 rounded-xl" />
            </div>
          </div>

          {/* Enrolled Courses section skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-32 bg-slate-200 rounded-md animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((course) => (
                <div key={course} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 animate-pulse">
                  <div className="h-32 bg-slate-200 rounded-xl w-full" />
                  <div className="space-y-2">
                    <div className="h-5 w-3/4 bg-slate-200 rounded-lg" />
                    <div className="h-3.5 w-1/2 bg-slate-200 rounded-md" />
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs">
                      <div className="h-3.5 w-12 bg-slate-200 rounded-md" />
                      <div className="h-3.5 w-8 bg-slate-200 rounded-md" />
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-200 w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Sidebar widgets skeleton */}
        <div className="space-y-6">
          {/* Pending Requests skeleton */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-5 w-32 bg-slate-200 rounded-md" />
            <div className="space-y-3">
              {[1, 2].map((req) => (
                <div key={req} className="p-3 border border-slate-100 rounded-xl space-y-2">
                  <div className="h-4 w-28 bg-slate-200 rounded-md" />
                  <div className="h-3 w-16 bg-slate-200 rounded-md" />
                </div>
              ))}
            </div>
          </div>

          {/* Certificates widget skeleton */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-5 w-28 bg-slate-200 rounded-md" />
            <div className="h-12 border border-dashed border-slate-200 rounded-xl flex items-center justify-center" />
          </div>
        </div>

      </main>
    </div>
  )
}
