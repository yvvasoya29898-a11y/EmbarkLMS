export const COURSE_CATEGORIES = [
  'AI for Everyone',
  'AI for Students',
  'AI for Educators',
  'AI for Business & Professionals',
  'Content Creation',
  'Agentic AI & Automation',
  'Vibe Coding',
  'Career & Communication Skills'
] as const;

export type CourseCategory = typeof COURSE_CATEGORIES[number];
