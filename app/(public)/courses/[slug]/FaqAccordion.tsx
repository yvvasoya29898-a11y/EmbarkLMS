"use client"

import React, { useState } from 'react'

interface FaqItem {
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How does the offline payment process work?",
    answer: "After clicking 'Request enrollment', our team will contact you within 24 hours on your registered phone number to confirm details and collect payment offline (via UPI or bank transfer). Once payment is received, the admin will grant you access."
  },
  {
    question: "What are the live batch timings?",
    answer: "Live batch sessions are typically scheduled in the evenings (starting around 7:00 PM IST) to accommodate faculty and working professionals. Recordings are posted within 12 hours of the live session."
  },
  {
    question: "How is attendance tracked for the certificate?",
    answer: "When you click the 'Join Session' button from your student dashboard, your click is logged automatically. You must attend at least 75% of live classes (or watch recordings if permitted by criteria) and pass all quizzes to receive the certificate."
  },
  {
    question: "Can I access the course material on mobile?",
    answer: "Yes! Embark LMS is mobile-responsive and supports PWA (Progressive Web App) installation. You can install it on your Android or iOS device for self-paced study."
  }
]

interface FaqAccordionProps {
  faqs?: FaqItem[] | null
}

export default function FaqAccordion({ faqs }: FaqAccordionProps = {}) {
  const displayFaqs = (faqs && faqs.length > 0) ? faqs : FAQ_ITEMS
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  return (
    <div className="space-y-3 font-body">
      {displayFaqs.map((item, idx) => {
        const isExpanded = expandedIndex === idx

        return (
          <div
            key={idx}
            className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-3xs transition-all hover:border-slate-350"
          >
            <button
              onClick={() => toggleFaq(idx)}
              className="w-full text-left px-5 py-4 flex justify-between items-center gap-4 transition-all cursor-pointer select-none"
            >
              <span className="text-xs font-bold text-slate-800 tracking-tight">
                {item.question}
              </span>
              <span className={`text-[10px] font-bold text-slate-400 transition-transform duration-250 ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            <div className={`transition-all duration-350 overflow-hidden ${isExpanded ? 'max-h-[250px] border-t border-slate-100' : 'max-h-0'}`}>
              <div className="px-5 py-4 text-[11px] font-medium text-slate-500 bg-slate-50/20 leading-relaxed whitespace-pre-line">
                {item.answer}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
