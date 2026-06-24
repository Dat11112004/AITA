import { PrismaClient } from '@prisma/client'
import { IStatsRepository } from '../../domain/repositories/stats-repository.interface.js'

export class PrismaStatsRepository implements IStatsRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async getAdminSummary() {
        const [users, classes, exams] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.class.count(),
            this.prisma.exam.count(),
        ])
        return { users, classes, exams, uptime: '99.9%' }
    }

    async getLecturerSummary(lecturerId: string) {
        const myClasses = await this.prisma.class.findMany({
            where: { InstructorClass: { some: { UserId: lecturerId } } },
        })
        const classIds = myClasses.map((c: any) => c.Id)
        const exams = await this.prisma.exam.count()
        const [pendingGrading, students] = await Promise.all([
            this.prisma.submission.count({
                where: { ClassId: { in: classIds }, GradingStatus: 'Pending' },
            }),
            this.prisma.studentClass.count({ where: { ClassId: { in: classIds } } }),
        ])
        return {
            classes: myClasses.length,
            pending: pendingGrading,
            exams,
            students,
        }
    }

    async getStudentSummary(studentId: string) {
        const enrolled = await this.prisma.studentClass.findMany({ where: { UserId: studentId } })
        const classIds = enrolled.map((e: any) => e.ClassId)
        const [exams, subs] = await Promise.all([
            this.prisma.exam.count({ where: { Status: 'Published' } }),
            this.prisma.submission.findMany({ where: { StudentId: studentId } }),
        ])

        return {
            classes: classIds.length,
            exams,
            submissions: subs.length,
            graded: subs.filter((s: any) => s.GradingStatus === 'Graded').length,
        }
    }

    async getLecturerReport(lecturerId: string, classId?: string) {
        const classes = await this.prisma.class.findMany({
            where: {
                InstructorClass: { some: { UserId: lecturerId } },
                ...(classId ? { Id: classId } : {}),
            },
        })
        const classIds = classes.map((c: any) => c.Id)

        const submissions = await this.prisma.submission.findMany({
            where: { ClassId: { in: classIds }, GradingStatus: 'Graded' },
            select: { TotalScore: true, FinalScore: true },
        })

        const scores = submissions.map((s: any) => Number(s.TotalScore ?? s.FinalScore ?? 0)).filter((n: number) => n > 0)
        const avg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0

        return {
            avgScore: Math.round(avg * 100) / 100,
            submitRate: submissions.length ? '78%' : '—',
            passRate: scores.length ? `${Math.round((scores.filter((s: number) => s >= 5).length / scores.length) * 100)}%` : '—',
        }
    }

    async getStudentProgress(studentId: string) {
        const subs = await this.prisma.submission.findMany({
            where: { StudentId: studentId, GradingStatus: 'Graded' },
            include: { Exam: true } as any,
        })

        const scores = subs.map((s: any) => Number(s.TotalScore ?? 0)).filter((n: number) => n > 0)
        const gpa = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0

        return {
            gpa: Math.round(gpa * 100) / 100,
            done: subs.length,
            rank: '—',
            streak: subs.length > 0 ? String(subs.length) : '0',
            history: subs.map((s: any) => ({
                assignment: s.Exam?.Title,
                score: s.TotalScore,
                date: s.SubmittedAt?.toISOString(),
            })),
        }
    }

    async getStudentHistory(studentId: string) {
        const subs = await this.prisma.submission.findMany({
            where: { StudentId: studentId },
            include: { Exam: true, Class: true } as any,
            orderBy: { SubmittedAt: 'desc' },
        })

        return subs.map((s: any) => ({
            id: s.Id,
            assignment: s.Exam?.Title,
            className: s.Class?.ClassCode,
            submittedAt: s.SubmittedAt?.toISOString(),
            totalScore: s.TotalScore,
            finalScore: s.FinalScore,
            status: s.GradingStatus?.toLowerCase(),
        }))
    }

    async getActivityLogs(params: { action?: string; limit?: number }) {
        const where: any = {}
        if (params.action) where.Action = params.action

        const logs = await this.prisma.auditLog.findMany({
            take: params.limit ?? 50,
            where,
            orderBy: { CreatedAt: 'desc' },
            include: { User: true } as any,
        })

        return logs.map((log: any) => ({
            id: log.Id,
            action: log.Action,
            entity: log.EntityName,
            entityId: log.EntityId,
            user: log.User?.FullName ?? 'Hệ thống',
            email: log.User?.Email,
            createdAt: log.CreatedAt?.toISOString() ?? null,
        }))
    }
}
