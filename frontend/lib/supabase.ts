import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'student' | 'parent'
export type AttendanceStatus = 'present' | 'absent' | 'late'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  school_id: string | null
  created_at: string
  updated_at: string
}

export interface School {
  id: string
  name: string
  school_code?: string
  school_type?: string
  address?: string
  contact_email?: string
  contact_phone?: string
  created_at: string
}

export interface Class {
  id: string
  school_id: string
  name: string
  grade_level?: string
  teacher_id?: string
  academic_year: string
  created_at: string
}

export interface Student {
  id: string
  user_id: string
  class_id?: string
  roll_number?: string
  admission_date?: string
  parent_id?: string
  created_at: string
}

export interface Exam {
  id: string
  school_id: string
  class_id?: string
  title: string
  description?: string
  exam_date: string
  total_marks: number
  school_type?: string
  subject_id?: string
  school_name?: string
  class_name?: string
  subject_name?: string
  graded_count?: number
  total_students?: number
  created_by: string
  created_at: string
}

export interface ExamResult {
  id: string
  exam_id: string
  student_id: string
  marks_obtained?: number
  remarks?: string
  graded_by?: string
  graded_at?: string
  created_at: string
}