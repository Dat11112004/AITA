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
export function useStudentProgress() {
  return useQuery({
    queryKey: ['student', 'progress'],
    queryFn: reportService.getStudentProgress,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch student feedback
 */
export function useStudentFeedback() {
  return useQuery({
    queryKey: ['student', 'feedback'],
    queryFn: reportService.getStudentFeedback,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch student learning insights
 */
export function useStudentLearning() {
  return useQuery({
    queryKey: ['student', 'learning'],
    queryFn: reportService.getStudentLearning,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Hook to fetch system health status
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: reportService.getSystemHealth,
    staleTime: 2 * 60 * 1000, // 2 minutes - check health frequently
  })
}

/**
 * Hook to fetch activity logs
 */
export function useActivityLogs() {
  return useQuery({
    queryKey: ['activity'],
    queryFn: reportService.getActivity,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
}
