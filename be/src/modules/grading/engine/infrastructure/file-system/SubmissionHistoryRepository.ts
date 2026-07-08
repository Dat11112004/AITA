import { prisma } from '../../../../../database/prisma.js';
import { Prisma } from '@prisma/client';

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

    async getAllAsync(assignmentId?: string): Promise<GradedSubmission[]> {
        const query = assignmentId 
            ? (isValidUUID(assignmentId) 
                ? Prisma.sql`
                    SELECT s.Id, s.ExamId, s.StudentId, s.FinalScore, s.TotalScore, s.GradedAt, 
                           JSON_VALUE(s.ReportData, '$.__metadata.assignmentId') as MetaAssignmentId,
                           JSON_VALUE(s.ReportData, '$.__metadata.studentId') as MetaStudentId,
                           JSON_VALUE(s.ReportData, '$.__metadata.title') as MetaTitle,
                           JSON_VALUE(s.ReportData, '$.totalScore') as JsonTotalScore,
                           JSON_VALUE(s.ReportData, '$.maxPossibleScore') as JsonMaxScore,
                           e.Title as ExamTitle
                    FROM [dbo].[Submission] s
                    LEFT JOIN [dbo].[Exam] e ON s.ExamId = e.Id
                    WHERE s.GradingStatus = 'GRADED' AND s.ExamId = CAST(${assignmentId} AS UNIQUEIDENTIFIER)
                    ORDER BY s.GradedAt DESC`
                : Prisma.sql`
                    SELECT s.Id, s.ExamId, s.StudentId, s.FinalScore, s.TotalScore, s.GradedAt, 
                           JSON_VALUE(s.ReportData, '$.__metadata.assignmentId') as MetaAssignmentId,
                           JSON_VALUE(s.ReportData, '$.__metadata.studentId') as MetaStudentId,
                           JSON_VALUE(s.ReportData, '$.__metadata.title') as MetaTitle,
                           JSON_VALUE(s.ReportData, '$.totalScore') as JsonTotalScore,
                           JSON_VALUE(s.ReportData, '$.maxPossibleScore') as JsonMaxScore,
                           e.Title as ExamTitle
                    FROM [dbo].[Submission] s
                    LEFT JOIN [dbo].[Exam] e ON s.ExamId = e.Id
                    WHERE s.GradingStatus = 'GRADED' 
                      AND s.ReportData LIKE ${'%"assignmentId":"' + assignmentId + '"%'}
                    ORDER BY s.GradedAt DESC`)
            : Prisma.sql`
                SELECT s.Id, s.ExamId, s.StudentId, s.FinalScore, s.TotalScore, s.GradedAt, 
                       JSON_VALUE(s.ReportData, '$.__metadata.assignmentId') as MetaAssignmentId,
                       JSON_VALUE(s.ReportData, '$.__metadata.studentId') as MetaStudentId,
                       JSON_VALUE(s.ReportData, '$.__metadata.title') as MetaTitle,
                       JSON_VALUE(s.ReportData, '$.totalScore') as JsonTotalScore,
                       JSON_VALUE(s.ReportData, '$.maxPossibleScore') as JsonMaxScore,
                       e.Title as ExamTitle
                FROM [dbo].[Submission] s
                LEFT JOIN [dbo].[Exam] e ON s.ExamId = e.Id
                WHERE s.GradingStatus = 'GRADED'
                ORDER BY s.GradedAt DESC`;

        const submissions: any[] = await prisma.$queryRaw(query);

        return submissions.map(s => ({
            id: s.Id,
            assignmentId: s.ExamId || s.MetaAssignmentId || undefined,
            studentId: s.StudentId || s.MetaStudentId || undefined,
            score: s.JsonTotalScore !== null && s.JsonTotalScore !== undefined ? Number(s.JsonTotalScore) : (s.FinalScore !== null ? Number(s.FinalScore) : 0),
            maxScore: s.JsonMaxScore !== null && s.JsonMaxScore !== undefined ? Number(s.JsonMaxScore) : (s.TotalScore !== null ? Number(s.TotalScore) : 10),
            assessedAt: s.GradedAt ? new Date(s.GradedAt).toISOString() : new Date().toISOString(),
            title: s.ExamTitle || s.MetaTitle || 'Grading Report',
            report: {} // Empty to save massive memory during list fetch!
        }));
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
        
        const validExamId = isValidUUID(submission.assignmentId) ? submission.assignmentId : undefined;
        const validStudentId = isValidUUID(submission.studentId) ? submission.studentId : undefined;

        const existing = await prisma.submission.findUnique({ where: { Id: submission.id } });

        if (existing) {
            await prisma.submission.update({
                where: { Id: submission.id },
                data: {
                    GradingStatus: 'GRADED',
                    FinalScore: submission.score,
                    TotalScore: submission.maxScore,
                    GradedAt: new Date(submission.assessedAt),
                    ReportData: reportJson,
                    ExamId: validExamId,
                    StudentId: validStudentId,
                },
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


