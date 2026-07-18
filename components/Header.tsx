'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, Compass, MessageSquare } from 'lucide-react'
import { User } from '@supabase/supabase-js'
import DownloadAppButton from './DownloadAppButton'
import { signOutAction } from '@/lib/actions/auth'

interface HeaderProps {
  user?: User | null
  isDashboard?: boolean
  profileName?: string
}

export default function Header({ user, isDashboard = false, profileName }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close the mobile menu on pathname change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const navItems = [
    { label: 'Courses', href: '/courses', icon: Compass },
    { label: 'Community', href: '/community', icon: MessageSquare },
  ]

  const toggleMenu = () => setIsOpen(!isOpen)

  return (
    <>
      <header className="border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          
          {/* Left Side: Logo / Dashboard Title */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Image src="/Logo.svg" alt="Embark AI" width={112} height={28} priority className="h-7 sm:h-8 w-auto" />
            </Link>
            
            {isDashboard && (
              <>
                <div className="h-6 w-px bg-slate-200" />
                <div className="text-left">
                  <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 font-display">
                    Dashboard
                  </h1>
                  {profileName && (
                    <p className="text-slate-500 text-[10px] hidden sm:block mt-0.5">
                      Welcome back, {profileName.split(' ')[0]}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Center/Right Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-6 mr-2">
              <DownloadAppButton />
            </div>

            <nav className="flex items-center gap-6">
              {navItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`text-xs font-bold uppercase tracking-wider font-mono transition-colors ${
                      active
                        ? 'text-primary border-b-2 border-primary pb-0.5'
                        : 'text-slate-600 hover:text-primary'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="h-4 w-px bg-slate-200" />

            {/* User Auth CTAs */}
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  {!isDashboard ? (
                    <Link
                      href="/dashboard"
                      className="bg-primary hover:bg-primary-light text-white font-bold py-2 px-5 rounded-xl text-xs transition-all duration-200 shadow-xs hover:scale-[1.02] cursor-pointer"
                    >
                      My Dashboard
                    </Link>
                  ) : (
                    <form action={signOutAction} className="shrink-0">
                      <button
                        type="submit"
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl text-xs transition-all duration-150 cursor-pointer shadow-3xs"
                      >
                        Sign out
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="text-xs font-bold text-slate-600 hover:text-primary transition-colors uppercase tracking-wider font-mono"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="bg-primary hover:bg-primary-light text-white font-bold py-2 px-5 rounded-xl text-xs transition-all duration-200 shadow-xs hover:scale-[1.02] cursor-pointer"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-3">
            {isDashboard && profileName && (
              <span className="text-[10px] text-slate-500 font-semibold max-w-[80px] truncate sm:max-w-none">
                Hi, {profileName.split(' ')[0]}
              </span>
            )}
            <button
              onClick={toggleMenu}
              className="text-slate-600 hover:text-primary p-1.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Drawer (Overlay) */}
      {isOpen && (
        <div className="md:hidden fixed inset-x-0 top-[53px] sm:top-[65px] bottom-0 bg-white z-40 border-t border-slate-100 flex flex-col p-6 overflow-y-auto animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-6 pt-4 flex-1">
            {navItems.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 text-base font-bold uppercase tracking-wider font-mono p-3 rounded-2xl transition-all ${
                    active
                      ? 'bg-primary/5 text-primary'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-primary'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            <div className="border-t border-slate-100 my-2 pt-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <span className="text-xs font-semibold text-slate-500">Want offline access?</span>
                <DownloadAppButton />
              </div>
            </div>
          </nav>

          {/* Mobile Auth CTAs */}
          <div className="border-t border-slate-100 pt-6 pb-8 flex flex-col gap-3">
            {user ? (
              <>
                {!isDashboard ? (
                  <Link
                    href="/dashboard"
                    className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition-all duration-200 shadow-xs text-center cursor-pointer"
                  >
                    My Dashboard
                  </Link>
                ) : (
                  <form action={signOutAction} className="w-full">
                    <button
                      type="submit"
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-2xl text-sm transition-all duration-150 cursor-pointer text-center"
                    >
                      Sign out
                    </button>
                  </form>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition-all duration-200 shadow-xs text-center cursor-pointer"
                >
                  Get Started
                </Link>
                <Link
                  href="/auth/login"
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-2xl text-sm transition-all duration-150 text-center cursor-pointer"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
