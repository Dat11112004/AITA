import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classService } from '@/services'

const CLASSES_QUERY_KEY = ['classes']

/**
 * Hook to fetch all classes
 */
export function useClasses() {
  return useQuery({
    queryKey: CLASSES_QUERY_KEY,
    queryFn: classService.getClasses,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to fetch students in a specific class
 */
export function useClassStudents(classId: string | null) {
  return useQuery({
    queryKey: ['classes', classId, 'students'],
    queryFn: () => classService.getClassStudents(classId!),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to create a new class
 */
export function useCreateClass() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => classService.createClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASSES_QUERY_KEY })
    },
  })
}
