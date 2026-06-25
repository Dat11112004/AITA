import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assignmentService } from '@/services'

const ASSIGNMENTS_QUERY_KEY = ['assignments']

/**
 * Hook to fetch assignments with optional filters
 */
export function useAssignments(classId?: string) {
  return useQuery({
    queryKey: [...ASSIGNMENTS_QUERY_KEY, classId],
    queryFn: () => assignmentService.getAssignments(classId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Hook to create a new assignment
 */
export function useCreateAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => assignmentService.createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_QUERY_KEY })
    },
  })
}

/**
 * Hook to update an assignment
 */
export function useUpdateAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      assignmentService.updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_QUERY_KEY })
    },
  })
}
