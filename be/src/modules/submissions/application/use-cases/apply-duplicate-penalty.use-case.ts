import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ValidationError, ForbiddenError } from '../../../../shared/application/app.error.js'
import { prisma } from '../../../../database/prisma.js'

export type DuplicatePenaltyType = 'NONE' | 'FLAT_POINTS' | 'PERCENT' | 'ZERO_SCORE'

export interface ApplyDuplicatePenaltyDto {
  assignmentId: string
  submissionIds: string[]
  penaltyType: DuplicatePenaltyType
  penaltyValue: number
  reason?: string
}

export interface ApplyDuplicatePenaltyResult {
  success: boolean
  updatedCount: number
  updatedSubmissions: Array<{
    id: string
    studentName: string | null
    oldScore: number | null
    newScore: number
    deductedPoints: number
  }>
}

export class ApplyDuplicatePenaltyUseCase implements IUseCase<
  { dto: ApplyDuplicatePenaltyDto; user: AuthUser },
  ApplyDuplicatePenaltyResult
> {
  async execute({
    dto,
    user
  }: {
    dto: ApplyDuplicatePenaltyDto
    user: AuthUser
  }): Promise<ApplyDuplicatePenaltyResult> {
    if (!dto.assignmentId) throw new ValidationError('assignmentId là bắt buộc')
    if (!dto.submissionIds || !Array.isArray(dto.submissionIds) || dto.submissionIds.length === 0) {
      throw new ValidationError('submissionIds phải là mảng không rỗng')
    }
    if (user.role === 'STUDENT') {
      throw new ForbiddenError('Chỉ giảng viên hoặc quản trị viên mới có quyền áp dụng trừ điểm bài trùng lặp')
    }

    const exam = await prisma.exam.findUnique({
      where: { Id: dto.assignmentId },
      select: { Id: true, Title: true }
    })
    if (!exam) throw new NotFoundError('Không tìm thấy bài tập/đề thi')

    const penaltyType = dto.penaltyType || 'FLAT_POINTS'
    const penaltyValue = Number(dto.penaltyValue) || 0

    // Fetch the target submissions
    const submissions = await prisma.submission.findMany({
      where: {
        Id: { in: dto.submissionIds },
        ExamId: dto.assignmentId
      },
      select: {
        Id: true,
        StudentId: true,
        RawScore: true,
        TotalScore: true,
        FinalScore: true,
        InstructorFeedback: true,
        ReportData: true,
        User_Submission_StudentIdToUser: {
          select: { FullName: true, StudentCode: true }
        }
      }
    })

    if (submissions.length === 0) {
      throw new NotFoundError('Không tìm thấy bài nộp nào phù hợp để trừ điểm')
    }

    // Safeguard: Check if all submissions have already been penalized
    const alreadyPenalized = submissions.filter(sub =>
      sub.InstructorFeedback && sub.InstructorFeedback.includes('[Trừ điểm trùng lặp')
    )

    if (alreadyPenalized.length === submissions.length) {
      throw new ValidationError('Các bài nộp này đã được áp dụng trừ điểm trùng lặp rồi. Hệ thống chỉ cho phép áp dụng trừ điểm 1 lần duy nhất.')
    }

    const updatedSubmissions: ApplyDuplicatePenaltyResult['updatedSubmissions'] = []

    for (const sub of submissions) {
      // Skip if this specific submission has already been penalized
      if (sub.InstructorFeedback && sub.InstructorFeedback.includes('[Trừ điểm trùng lặp')) {
        continue
      }
      const currentScore = sub.FinalScore !== null && sub.FinalScore !== undefined
        ? Number(sub.FinalScore)
        : (sub.RawScore !== null && sub.RawScore !== undefined ? Number(sub.RawScore) : (sub.TotalScore ? Number(sub.TotalScore) : 10))

      let newScore = currentScore
      let deductedPoints = 0

      if (penaltyType === 'ZERO_SCORE') {
        deductedPoints = currentScore
        newScore = 0
      } else if (penaltyType === 'PERCENT') {
        const pct = Math.min(100, Math.max(0, penaltyValue))
        deductedPoints = Number((currentScore * (pct / 100)).toFixed(2))
        newScore = Number(Math.max(0, currentScore - deductedPoints).toFixed(2))
      } else if (penaltyType === 'FLAT_POINTS') {
        deductedPoints = Math.min(currentScore, Math.max(0, penaltyValue))
        newScore = Number(Math.max(0, currentScore - deductedPoints).toFixed(2))
      }

      // Build audit feedback note
      const reasonText = dto.reason?.trim() || 'Phát hiện nội dung mã nguồn trùng lặp với bài nộp khác trong cùng bài tập'
      const penaltyNote = `[Trừ điểm trùng lặp / Plagiarism]: Đã trừ ${deductedPoints} điểm (${penaltyType === 'PERCENT' ? `-${penaltyValue}%` : penaltyType === 'ZERO_SCORE' ? 'về 0 điểm' : `-${penaltyValue}đ`}). Lý do: ${reasonText}.`

      const existingFeedback = sub.InstructorFeedback ? sub.InstructorFeedback.trim() : ''
      const updatedFeedback = existingFeedback
        ? (existingFeedback.includes('[Trừ điểm trùng lặp')
          ? existingFeedback.replace(/\[Trừ điểm trùng lặp[^\]]*\]:[^\n]*/g, penaltyNote)
          : `${existingFeedback}\n\n${penaltyNote}`)
        : penaltyNote

      // Update ReportData JSON for AI feedback & score synchronization
      let updatedReportData: string | null = null
      const aiDuplicateNote = `\n\n> ⚠️ **Lưu ý chống gian lận & Trùng lặp**: Bài làm có nội dung mã nguồn trùng lặp với 1 số học sinh khác trong cùng bài tập. ${deductedPoints > 0 ? `Đã áp dụng trừ ${deductedPoints} điểm theo quy định đối soát mã nguồn.` : 'Đã ghi nhận cảnh báo trùng lặp.'}`

      if (sub.ReportData) {
        try {
          const parsedReport = JSON.parse(sub.ReportData)
          parsedReport.totalScore = newScore
          let currentOverall = parsedReport.overallFeedback || ''
          if (currentOverall.includes('Lưu ý chống gian lận & Trùng lặp')) {
            currentOverall = currentOverall.replace(/> ⚠️ \*\*Lưu ý chống gian lận & Trùng lặp\*\*:[^\n]*/g, aiDuplicateNote.trim())
          } else {
            currentOverall = `${currentOverall}${aiDuplicateNote}`
          }
          parsedReport.overallFeedback = currentOverall
          updatedReportData = JSON.stringify(parsedReport)
        } catch (e) { }
      }

      await prisma.submission.update({
        where: { Id: sub.Id },
        data: {
          TotalScore: newScore,
          FinalScore: newScore,
          InstructorFeedback: updatedFeedback,
          ...(updatedReportData ? { ReportData: updatedReportData } : {}),
          ReviewedBy: user.id,
          ReviewedAt: new Date()
        }
      })

      updatedSubmissions.push({
        id: sub.Id,
        studentName: sub.User_Submission_StudentIdToUser?.FullName || sub.StudentId,
        oldScore: currentScore,
        newScore,
        deductedPoints
      })
    }

    return {
      success: true,
      updatedCount: updatedSubmissions.length,
      updatedSubmissions
    }
  }
}
