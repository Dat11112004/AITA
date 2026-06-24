import { z } from 'zod'

export const CreateUserDto = z.object({
    email: z.string().email(),
    fullName: z.string().min(2),
    password: z.string().min(6),
    role: z.enum(['ADMIN', 'LECTURER', 'STUDENT']),
})

export const UpdateUserDto = z.object({
    email: z.string().email().optional(),
    fullName: z.string().min(2).optional(),
    status: z.enum(['Active', 'Locked']).optional(),
})

export type CreateUserDto = z.infer<typeof CreateUserDto>
export type UpdateUserDto = z.infer<typeof UpdateUserDto>

export class UserResponseDto {
    static from(user: any) {
        return {
            id: user.Id,
            email: user.Email,
            fullName: user.FullName,
            status: user.Status,
            roles: user.UserRole?.map((ur: any) => ur.Role?.RoleName) || []
        }
    }
}
