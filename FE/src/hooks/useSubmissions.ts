import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { submissionService } from '@/services'

const SUBMISSIONS_QUERY_KEY = ['submissions']

/**
 * Hook to fetch submissions with optional filters
 */
export function useSubmissions(params?: Record<string, string>) {
  return useQuery({
    queryKey: [...SUBMISSIONS_QUERY_KEY, params],
    queryFn: () => submissionService.getSubmissions(params),
    staleTime: 3 * 60 * 1000, // 3 minutes - submissions change frequently
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Hook to fetch recent submissions
 */
export function useRecentSubmissions(limit = 5) {
  return useQuery({
    queryKey: ['submissions', 'recent', limit],
    queryFn: () => submissionService.getRecentSubmissions(limit),
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook to fetch a specific submission
 */
export function useSubmission(id: string | null) {
  return useQuery({
    queryKey: ['submissions', id],
    queryFn: () => submissionService.getSubmission(id!),
    enabled: !!id,
    staleTime: 3 * 60 * 1000,
  })
}

/**
 * Hook to submit work for an assignment
 */
export function useSubmitWork() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      assignmentId: string
      content?: string
      language?: string
      groupCode?: string
    }) => submissionService.submitWork(data),
    onSuccess: (newSubmission) => {
      queryClient.invalidateQueries({ queryKey: ['submissions', 'recent'] })
      queryClient.invalidateQueries({ queryKey: SUBMISSIONS_QUERY_KEY })
      // Add new submission to cache
      queryClient.setQueryData(['submissions', newSubmission.id], newSubmission)
    },
  })
}

/**
 * Hook to publish a submission
 */
export function usePublishSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, score }: { id: string; score?: number }) =>
      submissionService.publishSubmission(id, score),
    onSuccess: (updatedSubmission) => {
      queryClient.invalidateQueries({ queryKey: SUBMISSIONS_QUERY_KEY })
      queryClient.setQueryData(['submissions', updatedSubmission.id], updatedSubmission)
    },
  })
}
