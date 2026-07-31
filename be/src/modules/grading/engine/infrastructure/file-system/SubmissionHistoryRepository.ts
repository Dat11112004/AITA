import { prisma } from '../../../../../database/prisma.js';
import { Prisma } from '@prisma/client';
import { calculateLatePenalty } from '../../../../submissions/domain/utils/late-penalty-calculator.js';

export interface GradedSubmission {
    id: string;
    assignmentId?: string;
    studentId?: string;
    score: number;
    maxScore: number;
    assessedAt: string;
    title?: string;
    report: any;
}

const isValidUUID = (id: string | undefined) => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export class SubmissionHistoryRepository {
    constructor() {}

    async getAllAsync(
        assignmentId?: string,
        options?: { page?: number; limit?: number; search?: string }
    ): Promise<{ data: GradedSubmission[]; total: number }> {
        const page = options?.page || 1;
        const limit = options?.limit || 10;
        const search = options?.search?.trim();

        const where: Prisma.SubmissionWhereInput = {
            GradingStatus: 'GRADED',
        };

        const andConditions: any[] = [];

        if (assignmentId) {
            andConditions.push({
                OR: [
                    { ExamId: assignmentId },
                    { ReportData: { contains: `"assignmentId":"${assignmentId}"` } }
                ]
            });
        }

        if (search) {
            andConditions.push({
                OR: [
                    { StudentId: { contains: search } },
                    { Id: { contains: search } },
                    { ReportData: { contains: `"studentId":"${search}"` } }
                ]
            });
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        const total = await prisma.submission.count({ where });

        const submissions = await prisma.submission.findMany({
            where,
            include: { Exam: true },
            orderBy: { GradedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        const data = submissions.map(s => {
            const graded = this.toGradedSubmission(s);
            graded.report = {}; // Empty to save massive memory during list fetch!
            return graded;
        });

        return { data, total };
    }

    async getByIdAsync(id: string): Promise<GradedSubmission | null> {
        const s = await prisma.submission.findUnique({
            where: { Id: id },
            include: { Exam: true },
        });

        if (!s) return null;
        return this.toGradedSubmission(s);
    }

    async saveAsync(submission: GradedSubmission): Promise<void> {
        // Embed metadata into report for safe storage if they are not valid UUIDs
        const enrichedReport = {
            ...submission.report,
            __metadata: {
                assignmentId: submission.assignmentId,
                studentId: submission.studentId,
                title: submission.title,
            }
        };
        const reportJson = JSON.stringify(enrichedReport);
        
        let validExamId = isValidUUID(submission.assignmentId) ? submission.assignmentId : undefined;
        let validStudentId = isValidUUID(submission.studentId) ? submission.studentId : undefined;

        // Verify that the Exam actually exists to prevent Foreign Key constraint violations
        if (validExamId) {
            const examExists = await prisma.exam.findUnique({ where: { Id: validExamId }, select: { Id: true } });
            if (!examExists) validExamId = undefined;
        }

        // Verify that the Student actually exists
        if (validStudentId) {
            const studentExists = await prisma.user.findUnique({ where: { Id: validStudentId }, select: { Id: true } });
            if (!studentExists) validStudentId = undefined;
        }

        const existing = await prisma.submission.findUnique({ where: { Id: submission.id } });

        // ── Apply the late penalty at AI-grading time ────────────────────────────
        // Previously FinalScore was the raw AI score and the deduction only happened
        // when the lecturer published, so a late submission looked un-penalised until
        // then. The same calculateLatePenalty() used at publish time runs here, so
        // both paths agree.
        const penalty = await this.resolveLatePenalty(
            submission.score,
            existing?.SubmittedAt ?? null,
            validExamId,
            validStudentId
        );

        if (existing) {
            await prisma.submission.update({
                where: { Id: submission.id },
                data: {
                    GradingStatus: 'GRADED',
                    RawScore: penalty.rawScore,
                    LatePenaltyAmount: penalty.latePenaltyAmount,
                    FinalScore: penalty.finalScore,
                    TotalScore: submission.maxScore,
                    GradedAt: new Date(submission.assessedAt),
                    ReportData: reportJson,
                    ExamId: validExamId,
                    StudentId: validStudentId,
                } as any,
            });
        } else {
            // Batch grading creates UUIDs in memory that may not exist in DB yet
            const randomAttempt = Math.floor(Math.random() * 2147483647); // Bypass SQL Server NULL unique constraint
            await prisma.submission.create({
                data: {
                    Id: submission.id,
                    ExamId: validExamId,
                    StudentId: validStudentId,
                    AttemptNumber: randomAttempt,
                    GradingStatus: 'GRADED',
                    FinalScore: submission.score,
                    TotalScore: submission.maxScore,
                    GradedAt: new Date(submission.assessedAt),
                    ReportData: reportJson,
                    SubmittedAt: new Date(),
                },
            });
        }
    }

    /**
     * Resolve the late penalty for an AI-graded submission.
     *
     * Honours the per-student SubmissionOverride (the lecturer's "reopen" dialog)
     * ahead of the exam-level policy, exactly as publish-grade does — so whatever the
     * lecturer picked there (waive / custom rate / flat / score cap) is what applies
     * when the student resubmits.
     *
     * Never throws: if the exam or override cannot be read, the raw score stands
     * rather than a wrong deduction being applied.
     */
    private async resolveLatePenalty(
        rawScore: number,
        submittedAt: Date | null,
        examId?: string,
        studentId?: string
    ): Promise<{ rawScore: number; latePenaltyAmount: number; finalScore: number; isLate: boolean }> {
        const untouched = { rawScore, latePenaltyAmount: 0, finalScore: rawScore, isLate: false };
        if (!examId || !submittedAt) return untouched;

        try {
            const exam = await prisma.exam.findUnique({
                where: { Id: examId },
                select: {
                    DueDate: true,
                    LatePenaltyType: true,
                    LatePenaltyValue: true,
                    MaxLatePenalty: true,
                } as any,
            });
            if (!exam) return untouched;

            let override: any = null;
            if (studentId && (prisma as any).submissionOverride?.findUnique) {
                try {
                    override = await (prisma as any).submissionOverride.findUnique({
                        where: { ExamId_StudentId: { ExamId: examId, StudentId: studentId } },
                    });
                } catch {
                    // Model/table may not exist in every environment — treated as "no override".
                }
            }

            const e = exam as any;
            return calculateLatePenalty({
                rawScore,
                submittedAt: new Date(submittedAt),
                originalDueDate: e.DueDate ? new Date(e.DueDate) : null,
                override: override
                    ? {
                        extendedDueDate: override.ExtendedDueDate,
                        penaltyMode: override.PenaltyMode,
                        customPenaltyRate: override.CustomPenaltyRate != null ? Number(override.CustomPenaltyRate) : null,
                        flatPenaltyAmount: override.FlatPenaltyAmount != null ? Number(override.FlatPenaltyAmount) : null,
                        scoreCap: override.ScoreCap != null ? Number(override.ScoreCap) : null,
                    }
                    : null,
                examPenaltyType: e.LatePenaltyType,
                examPenaltyValue: e.LatePenaltyValue != null ? Number(e.LatePenaltyValue) : null,
                maxLatePenalty: e.MaxLatePenalty != null ? Number(e.MaxLatePenalty) : null,
            });
        } catch (err) {
            console.error('[SubmissionHistoryRepository] Late-penalty resolution failed, keeping raw score:', err);
            return untouched;
        }
    }

    async deleteAsync(id: string): Promise<boolean> {
        try {
            await prisma.submission.delete({ where: { Id: id } });
            return true;
        } catch {
            return false;
        }
    }

    // ── Private helper ──────────────────────────────────
    private toGradedSubmission(s: any): GradedSubmission {
        let report: any = {};
        if (s.ReportData) {
            try {
                report = JSON.parse(s.ReportData);
            } catch {
                // Corrupted JSON — return empty report rather than crashing
                report = {};
            }
        }

        return {
            id: s.Id,
            assignmentId: s.ExamId || report.__metadata?.assignmentId || undefined,
            studentId: s.StudentId || report.__metadata?.studentId || undefined,
            score: report.totalScore !== undefined ? Number(report.totalScore) : (s.FinalScore !== null ? Number(s.FinalScore) : 0),
            maxScore: report.maxPossibleScore !== undefined ? Number(report.maxPossibleScore) : (s.TotalScore !== null ? Number(s.TotalScore) : 10),
            assessedAt: s.GradedAt ? s.GradedAt.toISOString() : new Date().toISOString(),
            title: s.Exam?.Title || report.__metadata?.title || 'Grading Report',
            report,
        };
    }
}


