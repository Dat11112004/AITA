import { createHash } from 'crypto'
import path from 'path'
import fs from 'fs'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ValidationError, ForbiddenError } from '../../../../shared/application/app.error.js'
import { prisma } from '../../../../database/prisma.js'

export interface DuplicateClusterMember {
  submissionId: string
  studentId: string | null
  studentName: string | null
  studentCode: string | null
  attemptNumber: number | null
  submittedAt: Date | null
  zipFileUrl: string | null
}

export interface DuplicateCluster {
  contentHash: string
  count: number
  submissions: DuplicateClusterMember[]
}

export interface DetectDuplicatesResult {
  assignmentId: string
  checkedCount: number
  failedCount: number
  failedSubmissionIds: string[]
  clusters: DuplicateCluster[]
}

// Downloads are bounded so one giant assignment can't hold every DB/HTTP
// resource at once, and one unreachable file must not sink the whole report.
const DOWNLOAD_CONCURRENCY = 5

export class DetectDuplicateSubmissionsUseCase implements IUseCase<{ assignmentId: string; user: AuthUser }, DetectDuplicatesResult> {
  async execute({ assignmentId, user }: { assignmentId: string; user: AuthUser }): Promise<DetectDuplicatesResult> {
    if (!assignmentId) throw new ValidationError('assignmentId là bắt buộc')
    if (user.role === 'STUDENT') {
      throw new ForbiddenError('Chỉ giảng viên hoặc quản trị viên được kiểm tra trùng bài')
    }

    const exam = await prisma.exam.findUnique({
      where: { Id: assignmentId },
      select: { Id: true },
    })
    if (!exam) throw new NotFoundError('Không tìm thấy bài tập/đề thi')

    const submissions = await prisma.submission.findMany({
      where: {
        ExamId: assignmentId,
        IsLatest: true,
        ZipFileUrl: { not: null },
      },
      select: {
        Id: true,
        StudentId: true,
        AttemptNumber: true,
        SubmittedAt: true,
        ZipFileUrl: true,
        User_Submission_StudentIdToUser: {
          select: { FullName: true, StudentCode: true, Email: true },
        },
      },
    })

    const hashed: Array<{ submission: (typeof submissions)[number]; hash: string | null }> = []
    for (let i = 0; i < submissions.length; i += DOWNLOAD_CONCURRENCY) {
      const batch = submissions.slice(i, i + DOWNLOAD_CONCURRENCY)
      const results = await Promise.all(
        batch.map(async (submission) => ({
          submission,
          hash: await this.hashSubmissionFile(submission.ZipFileUrl!),
        }))
      )
      hashed.push(...results)
    }

    const byHash = new Map<string, DuplicateClusterMember[]>()
    const failedSubmissionIds: string[] = []

    for (const { submission, hash } of hashed) {
      if (!hash) {
        failedSubmissionIds.push(submission.Id)
        continue
      }
      const member: DuplicateClusterMember = {
        submissionId: submission.Id,
        studentId: submission.StudentId,
        studentName:
          submission.User_Submission_StudentIdToUser?.FullName ||
          submission.User_Submission_StudentIdToUser?.Email ||
          null,
        studentCode: submission.User_Submission_StudentIdToUser?.StudentCode || null,
        attemptNumber: submission.AttemptNumber,
        submittedAt: submission.SubmittedAt,
        zipFileUrl: submission.ZipFileUrl,
      }
      const bucket = byHash.get(hash)
      if (bucket) bucket.push(member)
      else byHash.set(hash, [member])
    }

    const clusters: DuplicateCluster[] = []
    for (const [contentHash, members] of byHash) {
      // A "cluster" needs at least two DIFFERENT students — the same student
      // resubmitting an identical file is not an exchange.
      const distinctStudents = new Set(members.map((m) => m.studentId ?? m.submissionId))
      if (members.length < 2 || distinctStudents.size < 2) continue
      members.sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0))
      clusters.push({ contentHash, count: members.length, submissions: members })
    }
    clusters.sort((a, b) => b.count - a.count)

    return {
      assignmentId,
      checkedCount: hashed.length - failedSubmissionIds.length,
      failedCount: failedSubmissionIds.length,
      failedSubmissionIds,
      clusters,
    }
  }

  /** SHA-256 of the raw stored file. Returns null (never throws) when the file cannot be read. */
  private async hashSubmissionFile(fileUrl: string): Promise<string | null> {
    try {
      let buffer: Buffer
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        // Same convention as SubmissionsController.download: the query string
        // only carries the display filename, the file lives at the bare URL.
        const response = await fetch(fileUrl.split('?')[0])
        if (!response.ok) return null
        buffer = Buffer.from(await response.arrayBuffer())
      } else {
        const filePath = path.join(process.cwd(), fileUrl.split('?')[0])
        if (!fs.existsSync(filePath)) return null
        buffer = await fs.promises.readFile(filePath)
      }
      return createHash('sha256').update(buffer).digest('hex')
    } catch {
      return null
    }
  }
}
