import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ValidationError, ForbiddenError } from '../../../../shared/application/app.error.js'
import { CreateSubmissionRequestDto, SubmissionResponseDto } from '../dtos/submission.dto.js'
import { Submission } from '../../domain/entities/submission.entity.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { CloudinaryService } from '../../../../shared/infrastructure/services/cloudinary.service.js'
import path from 'path'
import fs from 'fs'

export class CreateSubmissionUseCase implements IUseCase<{ dto: CreateSubmissionRequestDto; file?: Express.Multer.File; user: AuthUser }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(
    private readonly submissionRepo: ISubmissionRepository,
    private readonly uow: IUnitOfWork
  ) { }

  async execute({ dto, file, user }: { dto: CreateSubmissionRequestDto; file?: Express.Multer.File; user: AuthUser }) {
    const examId = dto.data.examId ?? dto.data.assignmentId
    if (!examId) throw new ValidationError(MESSAGES.SUBMISSION_MISSING_EXAM_ID)

    // Uses uow for legacy exam checking until all modules are pure
    const exam = await this.uow.resolve<any>(Symbol.for('ExamRepository')).findById(examId)
    if (!exam) throw new NotFoundError(MESSAGES.EXAM_NOT_FOUND)

    let classId = dto.data.classId
    
    if (!classId) {
      // Find the intersection of ExamClasses and Student Enrollments
      const { prisma } = await import('../../../../database/prisma.js')
      const examClasses = await prisma.examClass.findMany({
        where: { ExamId: examId },
        select: { ClassId: true }
      });
      const enrollments = await prisma.studentClass.findMany({
        where: { UserId: user.id },
        select: { ClassId: true }
      });
      
      const enrolledClassIds = new Set(enrollments.map(e => e.ClassId));
      const matchingClass = examClasses.find(ec => enrolledClassIds.has(ec.ClassId));
      
      if (matchingClass) {
        classId = matchingClass.ClassId;
      }
    }

    if (!classId) throw new ValidationError("Sinh viên không thuộc bất kỳ lớp học nào được giao bài tập này")

    // Get Class and Subject details for Cloudinary folder structure
    const classRepo = this.uow.resolve<any>(Symbol.for('ClassRepository'))
    const classInfo = await classRepo.findById(classId)
    if (!classInfo) throw new NotFoundError('Không tìm thấy lớp học')

    const subjectRepo = this.uow.resolve<any>(Symbol.for('SubjectRepository'))
    const subjectInfo = await subjectRepo.findById(classInfo.subjectId)
    if (!subjectInfo) throw new NotFoundError('Không tìm thấy môn học')

    // Verify student is enrolled in the class using legacy repo access
    const enrollmentRepo = this.uow.resolve<any>(Symbol.for('EnrollmentRepository'))
    const enrollment = await enrollmentRepo.findMany({
      ClassId: classId,
      UserId: user.id,
    })
    if (!enrollment || enrollment.length === 0) {
      throw new ForbiddenError(MESSAGES.SUBMISSION_NOT_ENROLLED)
    }

    // Check for existing submission for this student & exam
    const existingSubmissionList = await this.submissionRepo.findMany({
      examId,
      studentId: user.id,
    })
    const existingSubmission = existingSubmissionList && existingSubmissionList.length > 0 ? existingSubmissionList[0] : null

    // Check deadline considering student-specific SubmissionOverride extension
    const { prisma } = await import('../../../../database/prisma.js')
    const override = await prisma.submissionOverride.findUnique({
      where: {
        ExamId_StudentId: {
          ExamId: examId,
          StudentId: user.id,
        }
      }
    })

    const effectiveDueDate = override?.ExtendedDueDate ? new Date(override.ExtendedDueDate) : (exam.dueDate ? new Date(exam.dueDate) : null)

    if (effectiveDueDate) {
      const now = new Date()
      if (now > effectiveDueDate) {
        throw new ValidationError('Hạn nộp bài (bao gồm thời gian gia hạn) đã hết, không thể nộp bài.')
      }
    }

    let fileUrl = dto.data.zipFileUrl ?? ''
    let uploadedPublicId: string | undefined;
    let localFilePath: string | undefined;

    if (file) {
      const subjectCode = subjectInfo.subjectCode || subjectInfo.Code || 'UnknownSubject'
      const classCode = classInfo.classCode || classInfo.Code || 'UnknownClass'
      const studentNameSafe = ((user as any).name || (user as any).email || user.id).replace(/[^a-zA-Z0-9]/g, '_')
      
      if (file.size > 10485760) {
        // Fallback to local storage for files > 10MB
        const uploadDir = path.join(process.cwd(), 'uploads', 'submissions', subjectCode, classCode);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const fileName = `${studentNameSafe}_${Date.now()}${path.extname(file.originalname) || '.zip'}`;
        localFilePath = path.join(uploadDir, fileName);
        fs.writeFileSync(localFilePath, file.buffer);
        
        // Use relative URL so frontend/API can serve it
        fileUrl = `/uploads/submissions/${subjectCode}/${classCode}/${fileName}?filename=${encodeURIComponent(file.originalname)}`;
      } else {
        const folderPath = `AITA/${subjectCode}/${classCode}/${exam.title || examId}`
        try {
          const uploadResult = await CloudinaryService.uploadStream(file.buffer, {
            folder: folderPath,
            public_id: `${studentNameSafe}_${Date.now()}`,
            resource_type: 'raw', // Use raw for zip/pdf/docx files
          });
          fileUrl = uploadResult.secure_url + `?filename=${encodeURIComponent(file.originalname)}`;
          uploadedPublicId = uploadResult.public_id;
        } catch (uploadError: any) {
          throw new ValidationError(`Lỗi khi tải file lên Cloudinary: ${uploadError.message || 'Unknown error'}`);
        }
      }
    } else if (fileUrl && !this.isValidFileUrl(fileUrl)) {
      throw new ValidationError(MESSAGES.SUBMISSION_INVALID_URL)
    }

    let targetSubmission: Submission

    if (existingSubmission) {
      // RESUBMISSION LOGIC:
      // Reset scores, feedback, and grading status to 'Pending' so the teacher MUST regrade it.
      existingSubmission.resubmit(fileUrl, dto.data.content)
      targetSubmission = existingSubmission
    } else {
      // NEW SUBMISSION LOGIC:
      targetSubmission = Submission.create(
        randomUUID(),
        user.id,
        examId,
        classId,
        1, // attemptNumber
        fileUrl
      )
      if (dto.data.content) {
        (targetSubmission as any).content = dto.data.content;
      }
    }

    try {
      await this.submissionRepo.save(targetSubmission)

      try {
        const { globalJobManager } = await import('../../../grading/engine/application/queue/SubmissionJobManager.js');
        globalJobManager.emit(`assignment_event:${examId}`, {
          type: 'SUBMISSION_CREATED',
          assignmentId: examId,
          submissionId: targetSubmission.id
        });
      } catch (e) {}

      // Clean up any deadline warning notifications for this student and assignment
      try {
        const { prisma } = await import('../../../../database/prisma.js');
        await prisma.notificationRecipient.deleteMany({
          where: {
            UserId: user.id,
            Notification: {
              OR: [
                { ReferenceId: examId },
                { Message: { contains: (exam as any).title || examId } },
                { Title: { contains: (exam as any).title || examId } }
              ],
              Type: { in: ['Reminder', 'DEADLINE_WARNING'] }
            }
          }
        });
      } catch (notifErr) {
        console.error('Failed to cleanup deadline notifications on submission:', notifErr);
      }

      // If continuous queue (Chấm ngầm) is enabled, auto-enqueue grading job immediately
      const { prisma } = await import('../../../../database/prisma.js');
      const dbExam = await prisma.exam.findUnique({
        where: { Id: examId },
        select: { GradingStrategy: true }
      });
      const strat = dbExam?.GradingStrategy || (exam as any).gradingStrategy || (exam as any).GradingStrategy || 'CONTINUOUS_QUEUE';
      const isContinuousQueue = strat === 'CONTINUOUS_QUEUE';
      if (isContinuousQueue) {
        try {
          const { engineSubmissionController } = await import('../../../grading/engine/modules/submissions/routes/index.js');
          if (engineSubmissionController) {
            engineSubmissionController.executeGradingForSubmission(targetSubmission.id).catch(err => {
              console.error('[ContinuousQueue] Error executing auto-grading job for submission:', targetSubmission.id, err);
            });
          }
        } catch (statusErr) {
          console.error('Failed to trigger auto-grading for continuous queue:', statusErr);
        }
      } else {
        console.log(`[BatchPostDeadline] Submission ${targetSubmission.id} held in pending status until lecturer triggers batch grading.`);
      }
    } catch (dbError: any) {
      if (uploadedPublicId) {
        try {
          await CloudinaryService.deleteFile(uploadedPublicId, 'raw')
        } catch (cleanupError) {
          console.error('Failed to cleanup Cloudinary file after DB save failure:', cleanupError)
        }
      }
      if (localFilePath) {
        try {
          if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
          }
        } catch (cleanupError) {
          console.error('Failed to cleanup Local file after DB save failure:', cleanupError)
        }
      }
      throw dbError
    }

    return SubmissionResponseDto.from(targetSubmission as any)
  }

  private isValidFileUrl(url: string): boolean {
    try {
      if (url.startsWith('data:')) return true;
      if (url.startsWith('blob:')) return true;
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
