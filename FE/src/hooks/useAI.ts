import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiService } from '@/services'

const AI_REVIEWS_QUERY_KEY = ['ai', 'reviews']
const AI_CONFIG_QUERY_KEY = ['ai', 'config']

/**
 * Hook to fetch AI reviews pending approval
 */
export function useAIReviews() {
  return useQuery({
    queryKey: AI_REVIEWS_QUERY_KEY,
    queryFn: aiService.getAIReviews,
    staleTime: 2 * 60 * 1000, // 2 minutes - check for new reviews frequently
  })
}

/**
 * Hook to generate an exercise using AI
 */
export function useGenerateExercise() {
  return useMutation({
    mutationFn: (data: unknown) => aiService.generateExercise(data),
  })
}

/**
 * Hook to save an AI-generated assignment
 */
export function useSaveAIAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: unknown) => aiService.saveAIAssignment(data),
    onSuccess: () => {
      // Invalidate assignments to reflect new AI assignment
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      // Invalidate reviews since one was just approved
      queryClient.invalidateQueries({ queryKey: AI_REVIEWS_QUERY_KEY })
    },
  })
}

/**
 * Hook to assess a submission using AI
 */
export function useAssessSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (submissionId: string) => aiService.assessSubmission(submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
    },
  })
}

/**
 * Hook to review an AI job
 */
export function useReviewAIJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      jobId,
      approved,
      note,
    }: {
      jobId: string
      approved: boolean
      note?: string
    }) => aiService.reviewAIJob(jobId, approved, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_REVIEWS_QUERY_KEY })
    },
  })
}

/**
 * Hook to fetch AI configuration
 */
export function useAIConfig() {
  return useQuery({
    queryKey: AI_CONFIG_QUERY_KEY,
    queryFn: aiService.getAIConfig,
    staleTime: 30 * 60 * 1000, // 30 minutes - config changes rarely
  })
}

/**
 * Hook to update AI configuration
 */
export function useUpdateAIConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (config: Record<string, string>) => aiService.updateAIConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_CONFIG_QUERY_KEY })
    },
  })
}
