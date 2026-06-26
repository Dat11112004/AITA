import { z } from 'zod'

export const CreateUserDto = z.object({
    email: z.string().email(),
    fullName: z.string().min(2),
    password: z.string().min(6),
    role: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.enum(['ADMIN', 'LECTURER', 'STUDENT'])),
})

export const UpdateUserDto = z.object({
    email: z.string().email().optional(),
    fullName: z.string().min(2).optional(),
    status: z.enum(['Active', 'Inactive', 'Locked']).optional(),
    password: z.string().min(6).optional(),
    role: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.enum(['ADMIN', 'LECTURER', 'STUDENT'])).optional(),
})

export type CreateUserDto = z.infer<typeof CreateUserDto>
export type UpdateUserDto = z.infer<typeof UpdateUserDto>

export class UserResponseDto {
    static from(user: any) {
        const primaryRole = user.UserRole?.[0]?.Role?.RoleName ?? 'STUDENT'
        return {
            id: user.Id,
            name: user.FullName,
            fullName: user.FullName,
            email: user.Email,
            role: primaryRole.toLowerCase(),
            status: user.Status?.toLowerCase() ?? 'active',
            studentCode: user.StudentCode,
            phone: user.Phone,
            avatar: user.Avatar,
            lastLoginAt: user.LastLoginAt?.toISOString() ?? null,
            roles: user.UserRole?.map((ur: any) => ur.Role?.RoleName) || []
        }
    }
}
