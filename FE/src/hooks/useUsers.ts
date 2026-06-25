import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services'

const USERS_QUERY_KEY = ['users']

/**
 * Hook to fetch all users, optionally filtered by role
 */
export function useUsers(role = 'all') {
  return useQuery({
    queryKey: [...USERS_QUERY_KEY, role],
    queryFn: () => userService.getUsers(role),
    staleTime: 10 * 60 * 1000, // 10 minutes - user lists change less frequently
    gcTime: 15 * 60 * 1000,
  })
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
    },
  })
}
