/**
 * Custom React Hooks for Data Fetching & Error Handling
 * Uses React Query for caching and optimistic updates
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { supabase } from './supabase'
import { toast } from 'sonner'

// ========== HOOKS TYPES ==========

export interface UseDataOptions {
  enabled?: boolean
  staleTime?: number
  gcTime?: number  // Cache time
  retry?: number
  onError?: (error: Error) => void
}

// ========== EXAMS HOOK ==========

export function useExams(schoolId: string | null, options: UseDataOptions = {}): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['exams', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID is required')
      
      const { data, error } = await supabase
        .from('exams')
        .select(`
          id,
          title,
          description,
          exam_date,
          total_marks,
          class_id,
          subject_id,
          is_submitted,
          created_by,
          created_at
        `)
        .eq('school_id', schoolId)
        .order('exam_date', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!schoolId && (options.enabled !== false),
    staleTime: options.staleTime ?? 1000 * 60 * 5, // 5 minutes
    gcTime: options.gcTime ?? 1000 * 60 * 10,      // 10 minutes
    retry: options.retry ?? 2,
  })
}

// ========== STUDENTS HOOK ==========

export function useStudents(schoolId: string | null, classId?: string | null, options: UseDataOptions = {}): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['students', schoolId, classId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID is required')
      
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          email,
          role,
          created_at
        `)
        .eq('school_id', schoolId)
        .eq('role', 'student')
      
      if (classId) {
        query = query.eq('class_id', classId)
      }
      
      const { data, error } = await query.order('full_name', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    enabled: !!schoolId && (options.enabled !== false),
    staleTime: options.staleTime ?? 1000 * 60 * 5,
    gcTime: options.gcTime ?? 1000 * 60 * 10,
    retry: options.retry ?? 2,
  })
}

// ========== CLASSES HOOK ==========

export function useClasses(schoolId: string | null, academicYear?: string, options: UseDataOptions = {}): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['classes', schoolId, academicYear],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID is required')
      
      let query = supabase
        .from('classes')
        .select(`
          id,
          grade_level,
          section,
          academic_year,
          class_teacher_id,
          max_capacity,
          created_at
        `)
        .eq('school_id', schoolId)
      
      if (academicYear) {
        query = query.eq('academic_year', academicYear)
      }
      
      const { data, error } = await query.order('grade_level', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    enabled: !!schoolId && (options.enabled !== false),
    staleTime: options.staleTime ?? 1000 * 60 * 10,
    gcTime: options.gcTime ?? 1000 * 60 * 15,
    retry: options.retry ?? 2,
  })
}

// ========== EXAM RESULTS HOOK ==========

export function useExamResults(examId: string | null, options: UseDataOptions = {}): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['exam_results', examId],
    queryFn: async () => {
      if (!examId) throw new Error('Exam ID is required')
      
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          id,
          exam_id,
          student_id,
          marks_obtained,
          percentage,
          grade,
          graded_by,
          graded_at,
          created_at
        `)
        .eq('exam_id', examId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    enabled: !!examId && (options.enabled !== false),
    staleTime: options.staleTime ?? 1000 * 60 * 5,
    gcTime: options.gcTime ?? 1000 * 60 * 10,
    retry: options.retry ?? 2,
  })
}

// ========== SUBJECTS HOOK ==========

export function useSubjects(schoolId: string | null, options: UseDataOptions = {}): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['subjects', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID is required')
      
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    enabled: !!schoolId && (options.enabled !== false),
    staleTime: options.staleTime ?? 1000 * 60 * 30,
    gcTime: options.gcTime ?? 1000 * 60 * 60,
    retry: options.retry ?? 2,
  })
}

// ========== MARKING PERIOD HOOK ==========

export function useMarkingPeriods(schoolId: string | null, options: UseDataOptions = {}): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['marking_periods', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID is required')
      
      const { data, error } = await supabase
        .from('exam_marking_periods')
        .select('*')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!schoolId && (options.enabled !== false),
    staleTime: options.staleTime ?? 1000 * 60 * 15,
    gcTime: options.gcTime ?? 1000 * 60 * 30,
    retry: options.retry ?? 2,
  })
}

// ========== MUTATION: CREATE EXAM ==========

export function useCreateExam(schoolId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (examData: any) => {
      const { data, error } = await supabase
        .from('exams')
        .insert([{ ...examData, school_id: schoolId }])
        .select()
      
      if (error) throw error
      return data?.[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', schoolId] })
      toast.success('Exam created successfully')
    },
    onError: (error: any) => {
      console.error('Exam creation error:', error)
      toast.error('Failed to create exam', { description: error.message })
    }
  })
}

// ========== MUTATION: UPDATE EXAM RESULTS ==========

export function useUpdateExamResult(examId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (resultData: any) => {
      const { data, error } = await supabase
        .from('exam_results')
        .update(resultData)
        .eq('id', resultData.id)
        .select()
      
      if (error) throw error
      return data?.[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_results', examId] })
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      toast.success('Result updated successfully')
    },
    onError: (error: any) => {
      console.error('Result update error:', error)
      toast.error('Failed to update result', { description: error.message })
    }
  })
}

// ========== MUTATION: DELETE EXAM ==========

export function useDeleteExam(schoolId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (examId: string) => {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', schoolId] })
      toast.success('Exam deleted successfully')
    },
    onError: (error: any) => {
      console.error('Exam deletion error:', error)
      toast.error('Failed to delete exam', { description: error.message })
    }
  })
}

// ========== PAGINATION HOOK ==========

export function usePaginatedData(
  table: string,
  schoolId: string | null,
  pageSize: number = 20,
  options: UseDataOptions = {}
) {
  const [page, setPage] = React.useState(1)
  
  const query = useQuery({
    queryKey: [table, schoolId, page],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID is required')
      
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .eq('school_id', schoolId)
        .range(from, to)
      
      if (error) throw error
      
      return {
        data: data || [],
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    },
    enabled: !!schoolId && (options.enabled !== false),
    staleTime: options.staleTime ?? 1000 * 60 * 5,
    gcTime: options.gcTime ?? 1000 * 60 * 10,
    retry: options.retry ?? 2,
  })
  
  return {
    ...query,
    page,
    setPage,
    nextPage: () => setPage(p => p + 1),
    prevPage: () => setPage(p => Math.max(1, p - 1))
  }
}

// Need to import React for the paginated hook
import React from 'react'
