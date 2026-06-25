import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services'

/**
 * Hook to fetch admin dashboard report
 */
export function useAdminReport(period: string) {
  return useQuery({
    queryKey: ['reports', 'admin', period],
    queryFn: () => reportService.getAdminReport(period),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!period,
  })
}

/**
 * Hook to fetch lecturer report
 */
export function useLecturerReport(classId?: string) {
  return useQuery({
    queryKey: ['reports', 'lecturer', classId],
    queryFn: () => reportService.getLecturerReport(classId),
    staleTime: 10 * 60 * 1000,
    enabled: !!classId,
  })
}

/**
 * Hook to fetch student progress data
 */
export function useStudentProgress(userId: string) {
  return useQuery({
    queryKey: ['student', 'progress', userId],
    queryFn: () => reportService.getStudentProgress(userId),
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  })
}

/**
 * Hook to fetch student feedback
 */
export function useStudentFeedback(userId: string) {
  return useQuery({
    queryKey: ['student', 'feedback', userId],
    queryFn: () => reportService.getStudentFeedback(userId),
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  })
}

/**
 * Hook to fetch student learning insights
 */
export function useStudentLearning(userId: string) {
  return useQuery({
    queryKey: ['student', 'learning', userId],
    queryFn: () => reportService.getStudentLearning(userId),
    staleTime: 10 * 60 * 1000,
    enabled: !!userId,
  })
}

/**
 * Hook to fetch system health status
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => reportService.getSystemHealth(),
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook to fetch activity logs
 */
export function useActivityLogs() {
  return useQuery({
    queryKey: ['activity'],
    queryFn: () => reportService.getActivity(),
    staleTime: 3 * 60 * 1000,
  })
}
