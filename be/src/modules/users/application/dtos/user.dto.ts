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
    updatedClasses: z.array(z.object({
        classId: z.string(),
        newClassCode: z.string(),
        newSubjectCode: z.string().optional()
    })).optional(),
    addedClasses: z.array(z.string()).optional(),
    deletedClasses: z.array(z.string()).optional()
})

export type CreateUserDto = z.infer<typeof CreateUserDto>
export type UpdateUserDto = z.infer<typeof UpdateUserDto>

export const ImportUserDto = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    classCode: z.string().min(2).optional(),
    semesterCode: z.string().min(2).optional(),
    subjectCode: z.string().min(2).optional(),
    role: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.enum(['ADMIN', 'LECTURER', 'STUDENT'])).default('STUDENT'),
    status: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.enum(['ACTIVE', 'INACTIVE', 'LOCKED'])).default('ACTIVE'),
})

export const ImportUsersBatchDto = z.object({
    users: z.array(ImportUserDto)
})

export type ImportUserDto = z.infer<typeof ImportUserDto>
export type ImportUsersBatchDto = z.infer<typeof ImportUsersBatchDto>

export class UserResponseDto {
    static from(user: any) {
        // Support both Domain User entity and raw Prisma object
        const roles = user.roles || (user.UserRole?.map((ur: any) => ur.Role?.RoleName) || [])
        const primaryRole = roles[0] ?? 'STUDENT'
        
        return {
            id: user.id || user.Id,
            name: user.fullName || user.FullName,
            fullName: user.fullName || user.FullName,
            email: user.email || user.Email,
            role: primaryRole.toLowerCase(),
            status: (user.status || user.Status || 'active').toLowerCase(),
            studentCode: user.studentCode || user.StudentCode,
            phone: user.phone || user.Phone,
            avatar: user.avatarUrl || user.AvatarUrl || user.avatar || user.Avatar,
            lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : (user.LastLoginAt ? user.LastLoginAt.toISOString() : null),
            requirePasswordChange: user.requirePasswordChange ?? user.RequirePasswordChange ?? false,
            roles: roles
        }
    }
}
