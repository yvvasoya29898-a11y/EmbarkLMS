# Product Requirements Document (PRD)
## Embark LMS — Online Learning Platform (v1 — Lean Edition, Offline Payments + Live Classes)

**Organization:** Embark AI Institute (embarkai.in)
**Document Version:** 5.0
**Date:** July 2026
**Owner:** Yogi, Founder — Embark AI Institute
**Status:** Draft for Development
**Budget constraint:** ₹0 — free-tier infrastructure only; no payment gateway; live classes via free Google Meet/Zoom links (not hosted in-platform)

---

## 1. Overview

### 1.1 Purpose
Embark LMS is a lean online learning management system for delivering AI and technology courses in three formats: **pre-recorded, live, and hybrid (live + recorded)**. Two roles (Student and Admin). No online payment gateway — the Embark team collects payment offline (phone call + UPI/bank transfer), then Admin grants access. Live classes run on Google Meet/Zoom (free); the LMS manages scheduling, join links, attendance, and recordings. Built with Claude + Antigravity IDE at zero fixed cost.

### 1.2 Problem Statement
- Embark's training reach is limited by physical delivery (batch size, geography, trainer time).
- Most Embark courses are naturally hybrid: live interactive sessions (like the FDP format) plus recorded material for revision and self-paced modules.
- University partners (e.g., CVM University) need structured scheduling, attendance records, and progress tracking for faculty cohorts.
- Payment gateways and video hosting add cost and complexity not justified at current volume.

### 1.3 Goals (v1)
| Goal | Metric | Target (3 months post-launch) |
|---|---|---|
| Leads | Enrollment requests submitted | 300 |
| Conversion | Request → paid (offline) → enrolled | ≥ 40% |
| Live engagement | Average live-class attendance | ≥ 70% of enrolled |
| Engagement | Course completion rate | ≥ 40% |
| B2B | Institutional cohorts onboarded | 1–2 |
| Cost | Fixed monthly infrastructure cost | ₹0 |

### 1.4 Non-Goals (v1)
- In-platform video hosting or streaming (live classes via Meet/Zoom links; recordings via YouTube unlisted)
- Online payment gateway — v2
- Automatic attendance capture from Meet/Zoom APIs — v2 (v1 = join-click tracking + admin manual marking)
- AI features (tutor, quiz generation) — v2
- Instructor role, mobile apps, multi-language UI

---

## 2. Roles (2 only)

### Student
Registers, browses catalog, submits enrollment request, pays offline after team call, gets access. Then: attends live classes (join from LMS), watches recorded lessons, takes quizzes, tracks progress, downloads certificate.

### Admin (Embark team)
Manages courses/content; schedules live sessions and attaches Meet/Zoom links; posts recordings after sessions; marks attendance; manages lead inbox and grants access; manages cohorts; views reports and feedback.

---

## 3. Course Delivery Models

Every course has a `delivery_type`:

| Type | Description | Example |
|---|---|---|
| `recorded` | Self-paced modules/lessons only | Prompt engineering mini-course |
| `live` | Scheduled live sessions only, recordings posted after | Weekend live workshop |
| `hybrid` | Live sessions + recorded modules together (default for Embark) | 5-day FDP-style program: daily live class + recorded revision material + quizzes |

Live courses/batches are **cohort-based**: a course can have multiple batches (e.g., "Batch 3 — Aug 2026"), each with its own live schedule. Students are enrolled into a specific batch.

---

## 4. Core Features

### 4.1 Authentication
- Email/password + Google OAuth via Supabase Auth; phone number required at signup
- Role in `profiles.role` (`student` | `admin`), enforced with Supabase RLS

### 4.2 Course Catalog
- Public catalog; course cards show delivery type badge (Recorded / Live / Hybrid) and next batch start date for live/hybrid
- Course landing page: description, curriculum, **live schedule preview** (dates/times of upcoming batch), price (INR), free preview lesson
- CTA: "Request Enrollment" → team calls → offline payment → Admin grants access into a batch

### 4.3 Enrollment Request Flow (offline payments)
- Request statuses: `new → contacted → paid → enrolled` (or `dropped`); student note + admin notes + payment reference fields
- Admin lead inbox with status workflow; Grant Access assigns student to a course + batch
- Duplicate-request prevention; email notification on access grant

### 4.4 Live Classes
- **Session scheduling:** Admin creates sessions per batch: title, description, date/time (IST), duration, meeting link (Google Meet/Zoom — pasted in, free)
- **Student experience:**
  - "Upcoming live classes" section on dashboard and inside the course page
  - **Join button** activates 15 minutes before start; opens the Meet/Zoom link in a new tab
  - Session states: Upcoming → Live now → Completed
  - Add-to-calendar link (.ics download / Google Calendar URL — free, no API needed)
- **Attendance:**
  - v1: join-click logged automatically (student clicked Join during the live window) + Admin can manually mark/correct attendance after the session
  - Attendance % shown per student; exportable per batch (needed for institutional reports)
- **Recordings:** After class, Admin records via Meet/Zoom local recording → uploads to YouTube unlisted → pastes URL on the session → it appears as "Watch recording" for enrolled students (missed students can catch up)
- **Reminders:** email reminder 24h and 1h before session (Resend free tier); WhatsApp reminders manual in v1 (team broadcast list)

### 4.5 Recorded Content & Lesson Player
- Hierarchy: Course → Module → Lesson (video via YouTube unlisted, markdown notes, resources, quiz)
- Player: video + notes, mark complete, prev/next; server-side enrollment check; optional drip
- Live session recordings can also be attached into modules (so hybrid curriculum shows one unified outline: recorded lessons + past live recordings + upcoming live slots)

### 4.6 Progress Tracking
- Recorded: per-lesson completion %
- Live: attendance % per batch
- Combined course progress = weighted view of both, shown on dashboard

### 4.7 Quiz Engine
- MCQ, true/false; pass threshold, attempt limits, instant scoring with explanations

### 4.8 Certificates
- Auto-issued on completion criteria (Admin sets per course: e.g., ≥75% attendance + all quizzes passed, or 100% lessons for recorded courses)
- Free PDF via @react-pdf/renderer; verification page `embarkai.in/verify/{code}`

### 4.9 Student Dashboard
- **Next live class card** (with countdown + Join button) at the top
- Enrolled courses + progress, pending enrollment requests with status, certificates, quiz history

### 4.10 Admin Dashboard
- Course/module/lesson CRUD; delivery type + completion criteria settings
- **Batch manager:** create batches, schedule sessions, paste meeting links, post recordings, mark attendance
- Lead inbox (requests → grant access into batch); direct/bulk CSV enrollment; cohort invite codes
- Quiz builder
- Reports: per-batch attendance sheet, progress, request conversion, CSV exports
- Feedback form (per session and per course) + results

---

## 5. Technical Architecture (all free)

| Layer | Technology | Cost |
|---|---|---|
| Frontend + backend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4 | Free |
| Database + Auth + Storage | Supabase free tier | Free |
| Live classes | Google Meet (free, 60-min group limit) or Zoom free (40-min limit); paste link into LMS. Note: free-tier time limits may require splitting long sessions or using a Google Workspace account if available | Free |
| Recordings + lesson video | YouTube unlisted embeds | Free |
| Calendar invites | .ics file generation + Google Calendar URL scheme (no API) | Free |
| Reminders | Resend free tier (3K emails/mo) | Free |
| PDF certificates | @react-pdf/renderer | Free |
| Hosting | Vercel free tier | Free |
| Dev environment | Antigravity IDE + Claude; PRD + schema in repo root as AI context | — |

**Watchpoints:** Google Meet free = 60-min limit on group calls (plan sessions accordingly or use an institutional Google Workspace account); Supabase free tier pauses after 7 days inactivity; 1 GB storage cap.

### 5.1 Database Schema
```
profiles             (id, role, full_name, phone, created_at)
courses              (id, slug, title, description, category, delivery_type
                      [recorded|live|hybrid], price_inr_display, status,
                      completion_criteria_json, thumbnail_url)
batches              (id, course_id, name, starts_at, ends_at, invite_code, status)
live_sessions        (id, batch_id, title, description, starts_at, duration_min,
                      meeting_url, recording_url, status [upcoming|live|completed])
session_attendance   (id, session_id, user_id, joined_click_at,
                      attended [bool], marked_by [auto|admin])
modules              (id, course_id, title, sort_order, drip_locked)
lessons              (id, module_id, title, type [video|notes|quiz|recording],
                      video_url, content_md, sort_order, is_free_preview)
resources            (id, lesson_id, file_url, title)
enrollment_requests  (id, user_id, course_id, status [new|contacted|paid|enrolled|dropped],
                      student_note, admin_notes, payment_reference, created_at, updated_at)
enrollments          (id, user_id, course_id, batch_id, source [request|cohort|admin],
                      granted_by, enrolled_at, revoked_at)
progress             (id, user_id, lesson_id, completed_at)
quizzes              (id, lesson_id, pass_pct, max_attempts)
questions            (id, quiz_id, body, options_json, correct_index, explanation)
quiz_attempts        (id, user_id, quiz_id, score_pct, answers_json, attempted_at)
certificates         (id, user_id, course_id, verify_code, issued_at)
feedback             (id, user_id, course_id, session_id [nullable], rating,
                      comments, created_at)
```

### 5.2 Security
- Only admins create enrollments, batches, sessions (RLS + server actions)
- **Meeting URLs visible only to enrolled students of that batch** (server-side check; never in public payloads)
- Students read only their own requests/progress/attendance/certificates
- Lesson + recording content gated server-side; admin routes role-checked
- Certificate verify codes: UUID v4; phone numbers admin-only (PII in RLS)

---

## 6. Key User Flows

1. **Enrollment:** Sign up (phone) → catalog → course page (see live schedule) → Request Enrollment → team calls in 24h → pay via UPI/bank → Admin grants access into Batch → email confirmation
2. **Live class day:** Reminder email → dashboard shows "Live in 32 min" → Join button opens Meet/Zoom → join-click logged → after class Admin posts recording + finalizes attendance → absent students watch recording
3. **Hybrid learning loop:** Attend live session → watch recorded lessons/revision → quiz → meet completion criteria (attendance % + quizzes) → certificate → feedback
4. **Admin weekly ops:** Lead inbox calls → grant access → schedule next week's sessions → post recordings → mark attendance → export batch report for institution

---

## 7. Development Plan (Antigravity + Claude)

| Sprint | Duration | Deliverable |
|---|---|---|
| 0 | Week 1 | Repo, Supabase project, schema + RLS, auth with phone, PRD in repo |
| 1 | Week 2 | Catalog + course pages (with delivery badges + schedule preview) + Request Enrollment |
| 2 | Week 3 | Admin lead inbox + batches + grant access + email notifications |
| 3 | Week 4 | **Live sessions:** scheduling, Join button window, .ics/calendar links, join-click logging |
| 4 | Week 5 | Recordings flow + lesson player + progress + drip |
| 5 | Week 6 | Attendance marking + quiz engine |
| 6 | Week 7 | Certificates (criteria-based) + verification page |
| 7 | Week 8 | Admin reports (attendance sheets, exports), feedback, reminder emails |
| 8 | Week 9 | Content seeding (FDP → first hybrid course + batch), QA, pilot cohort |
| 9 | Week 10 | Launch |

**AI-assisted development rules:** one vertical slice per Antigravity session; PRD + schema as context; human review for RLS, enrollment-granting actions, meeting-URL gating; commit per slice.

---

## 8. Pricing & Sales Process
| Item | Approach |
|---|---|
| Hybrid course (live batch) | ₹1,999 – ₹4,999 displayed; collected offline after sales call |
| Recorded-only course | ₹999 – ₹2,999 |
| Institutional cohort/batch | Invoice/MOU offline; invite code |
| Sales SLA | Call within 24h; 2 follow-ups before `dropped`; payment reference recorded |

## 9. v2 Roadmap
- Online payments (Razorpay), Zoom/Meet API auto-attendance, in-platform streaming (Mux/100ms), AI tutor + AI quiz generator, instructor role, WhatsApp automation, Gujarati/Hindi UI

## 10. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Google Meet 60-min free limit | Structure sessions ≤55 min or use Workspace account; Zoom free (40 min) as backup |
| Meeting link leakage | Links gated to enrolled batch students; rotate link per session |
| Manual attendance errors | Auto join-click log as baseline + admin correction UI |
| Manual enrollment bottleneck | Lead inbox workflow + bulk CSV; Razorpay in v2 at scale |
| Recording upload delays | SOP: post recording within 12h; students notified by email |
| Supabase/YouTube free limits | Small files, Drive links for big resources; unlisted videos |
| Low completion | Live cohort momentum + drip + attendance-linked certificate criteria |

## 11. Open Questions
1. First hybrid course: replicate the 5-day FDP as a 2-week evening batch (10 × 55-min sessions)?
2. Certificate criteria default: 75% attendance + all quizzes passed — confirm?
3. Google Meet vs Zoom as the standard? (Meet: 60-min limit but no install; Zoom: 40-min limit)
4. Do institutions need attendance sheets in a specific format (for FDP credit records)?

---
*Living document — keep at `/docs/PRD.md`; it doubles as persistent context for Claude in Antigravity.*
