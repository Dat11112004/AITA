// @ts-nocheck
import { Request, Response } from 'express';
import { assignments } from '../data/assignments';
import { AssignmentManagementService } from '../../../assignment/AssignmentManagementService';
import { DocumentExtractor, ExtractedImage } from '../../../assignment/DocumentExtractor';
import { RequirementParserService } from '../../../assignment/RequirementParserService';
import { BlueprintService } from '../../../assignment/BlueprintService';
import { RubricGeneratorService } from '../../../assignment/RubricGeneratorService';
import { TestSuiteGeneratorService } from '../../../assignment/TestSuiteGeneratorService';
import { PublishedAssignmentRepository, globalAssignmentRepository } from '../../../assignment/PublishedAssignmentRepository';
import { GeminiAiProvider } from '../../../infrastructure/ai/GeminiAiProvider';
import { PublishedAssignment } from '../../../core/domain/submission/PublishedAssignment';
import { DocumentImage } from '../../../core/contracts/IAiProvider';
import { BadRequestError } from '../../../shared/errors';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as path from 'path';
import { sanitizeCloudinaryPathSegment } from '../../../../../../shared/utils/cloudinary-path.util.js';

import { BaseController } from '../../../../../../shared/presentation/base-controller.js';
import { prisma } from '../../../../../../database/prisma.js';
import { CloudinaryService } from '../../../../../../shared/infrastructure/services/cloudinary.service.js';
import { globalJobManager } from '../../../application/queue/SubmissionJobManager.js';
import { SendAssignmentNotificationUseCase } from '../../../../../../modules/notifications/application/use-cases/send-assignment-notification.use-case.js';
import { NodemailerService } from '../../../../../../shared/infrastructure/email/nodemailer.service.js';

// ─── Server-Side Image Cache ─────────────────────────────────────────
// Stores extracted document images in-memory so they never need to
// round-trip through the frontend. Auto-expires after 30 minutes.
interface CachedImageEntry {
    images: DocumentImage[];
    createdAt: number;
}
const IMAGE_CACHE = new Map<string, CachedImageEntry>();
const IMAGE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cleanExpiredImageCache(): void {
    const now = Date.now();
    for (const [key, entry] of IMAGE_CACHE.entries()) {
        if (now - entry.createdAt > IMAGE_CACHE_TTL_MS) {
            IMAGE_CACHE.delete(key);
        }
    }
}

export class AssignmentController extends BaseController {
    private assignmentRepository: PublishedAssignmentRepository;
    private aiProvider: GeminiAiProvider;

    constructor(documentExtractor: DocumentExtractor, artifactStore: any) {
        super();
        this.aiProvider = new GeminiAiProvider();
        this.assignmentRepository = globalAssignmentRepository;
    }

    uploadAssignment = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) throw new BadRequestError('No file');
            // mock impl
            this.ok(res, { id: 'temp' }, 'Assignment uploaded');
        } catch (err) {
            throw new Error('Error upload');
        }
    };

    extractText = async (req: Request, res: Response): Promise<void> => {
        try {
            const { file } = req;
            const { semester, subject } = req.body;
            if (!file) throw new BadRequestError('No file');
            if (!semester || !subject) throw new BadRequestError('Semester and Subject are required');
            const docExt = new DocumentExtractor();
            const extractedDoc = await docExt.extractAsync(file.buffer, file.mimetype);

            // Collect ALL images from all sections for the image cache
            const allImages: DocumentImage[] = [];
            for (const section of extractedDoc.sections) {
                for (const img of section.images) {
                    allImages.push({
                        buffer: img.buffer,
                        contentType: img.contentType,
                        label: img.label,
                        isMockup: img.isMockup,
                    });
                }
            }

            // Cache images server-side if any exist
            let documentImageKey: string | null = null;
            if (allImages.length > 0) {
                documentImageKey = crypto.createHash('sha256')
                    .update(extractedDoc.rawText.substring(0, 500) + allImages.length)
                    .digest('hex')
                    .substring(0, 16);

                cleanExpiredImageCache();
                IMAGE_CACHE.set(documentImageKey, {
                    images: allImages,
                    createdAt: Date.now(),
                });
                console.log(`[AssignmentController] Cached ${allImages.length} document images under key: ${documentImageKey}`);
            }

            // Upload file to Cloudinary directly for Lecturer Assignment Attachment
            let uploadedFileUrl: string | null = null;
            let uploadErrorMessage: string | null = null;
            try {
                // Do NOT use `use_filename` here: it derives the public_id from the raw
                // upload name, so any document titled "... A & B.docx" is rejected with
                // "public_id is invalid". Build a sanitized id ourselves instead.
                const baseName = path.parse(file.originalname).name;
                const uploadOptions = {
                    folder: 'aita/assignments',
                    resource_type: 'raw' as any,
                    public_id: `${sanitizeCloudinaryPathSegment(baseName, 'assignment')}_${Date.now()}`,
                };
                const cloudinaryRes = await CloudinaryService.uploadStream(file.buffer, uploadOptions);
                uploadedFileUrl = cloudinaryRes.secure_url;
                console.log(`[AssignmentController] Uploaded assignment document to Cloudinary: ${uploadedFileUrl}`);
            } catch (uploadError: any) {
                // Non-fatal: the extracted text is still useful. But report the reason
                // instead of silently returning uploadedFile: null.
                uploadErrorMessage = uploadError?.message || 'Unknown Cloudinary error';
                console.error(`[AssignmentController] Failed to upload assignment to Cloudinary:`, uploadError);
            }

            this.ok(res, {
                text: extractedDoc,
                documentImageKey,
                uploadedFile: uploadedFileUrl ? {
                    url: uploadedFileUrl,
                    fileName: file.originalname,
                    fileType: file.mimetype
                } : null,
                uploadError: uploadErrorMessage
            }, 'Text extracted');
        } catch (error: any) {
            // Preserve the original failure — a bare `new Error('Error extracting text')`
            // hides the real cause (bad mimetype, corrupt docx, Cloudinary rejection).
            console.error('[AssignmentController] extractText failed:', error);
            throw error instanceof Error ? error : new Error(`Error extracting text: ${String(error)}`);
        }
    };

    generateContent = async (req: Request, res: Response): Promise<void> => {
        try {
            const { prompt, semester, subject, pageImages } = req.body;
            if (!semester || !subject) throw new BadRequestError('Semester and Subject are required');
            const markdown = await this.aiProvider.generateAssignmentContentAsync(prompt, pageImages);
            this.ok(res, { markdown }, 'Content generated');
        } catch (error) {
            throw new Error('Error generating content');
        }
    };

    parseRubric = async (req: Request, res: Response): Promise<void> => {
        try {
            const { content, documentImageKey } = req.body;
            if (!content) throw new BadRequestError('No content');

            const requirementParser = new RequirementParserService(this.aiProvider);
            const rubricGenerator = new RubricGeneratorService(this.aiProvider);

            let contentStr = typeof content === 'string' ? content : JSON.stringify(content);
            if (typeof content === 'object' && content.rawText) {
                contentStr = content.rawText;
            }
            console.log(`[AssignmentController] parseRubric: contentStr length is ${contentStr.length}`);

            // Retrieve cached images if key was provided
            let documentImages: DocumentImage[] | undefined;
            if (documentImageKey && IMAGE_CACHE.has(documentImageKey)) {
                documentImages = IMAGE_CACHE.get(documentImageKey)!.images;
                console.log(`[AssignmentController] parseRubric: Retrieved ${documentImages.length} cached images for key: ${documentImageKey}`);
            }

            const draftBlueprint = await requirementParser.parseRequirementsAsync(contentStr, documentImages);
            const rubric = await rubricGenerator.generateRubricAsync(draftBlueprint);

            this.ok(res, { rubric, blueprint: draftBlueprint }, 'Rubric parsed');
        } catch (error) {
            throw new Error('Error parsing rubric');
        }
    };

    parseSqlKey = async (req: Request, res: Response): Promise<void> => {
        try {
            const { file } = req;
            const { rubricRules } = req.body;
            if (!file) throw new BadRequestError('No file provided');
            if (!rubricRules) throw new BadRequestError('Rubric rules are required');

            const sqlContent = file.buffer.toString('utf-8');
            const rules = typeof rubricRules === 'string' ? JSON.parse(rubricRules) : rubricRules;

            let updatedRules = await this.aiProvider.parseSqlAnswerKeyAsync(sqlContent, rules);

            // Automatically extract and inject setupScript from sqlContent
            const rubricGenerator = new RubricGeneratorService(this.aiProvider);
            updatedRules = rubricGenerator.extractAndInjectSqlSetupScript(updatedRules, sqlContent);

            this.ok(res, { rules: updatedRules }, 'SQL Key parsed');
        } catch (error: any) {
            console.error('[AssignmentController] Error parsing SQL Key:', error);
            throw new Error(`Error parsing SQL Key: ${error.message}`);
        }
    };

    parseRequirements = async (req: Request, res: Response): Promise<void> => {
        try {
            const { content, documentImageKey } = req.body;
            if (!content) throw new BadRequestError('No content');
            const requirementParser = new RequirementParserService(this.aiProvider);

            let contentStr = typeof content === 'string' ? content : JSON.stringify(content);
            if (typeof content === 'object' && content.rawText) {
                contentStr = content.rawText;
            }
            console.log(`[AssignmentController] parseRequirements: contentStr length is ${contentStr.length}`);

            // Retrieve cached images if key was provided
            let documentImages: DocumentImage[] | undefined;
            if (documentImageKey && IMAGE_CACHE.has(documentImageKey)) {
                documentImages = IMAGE_CACHE.get(documentImageKey)!.images;
                console.log(`[AssignmentController] parseRequirements: Retrieved ${documentImages.length} cached images for key: ${documentImageKey}`);
            }

            const draftBlueprint = await requirementParser.parseRequirementsAsync(contentStr, documentImages);
            this.ok(res, { blueprint: draftBlueprint }, 'Requirements parsed');
        } catch (error) {
            throw new Error('Error parsing requirements');
        }
    };

    generateRubric = async (req: Request, res: Response): Promise<void> => {
        try {
            const { blueprint } = req.body;
            if (!blueprint) throw new BadRequestError('No blueprint');
            const rubricGenerator = new RubricGeneratorService(this.aiProvider);
            const rubric = await rubricGenerator.generateRubricAsync(blueprint);
            this.ok(res, { rubric }, 'Rubric generated');
        } catch (error) {
            throw new Error('Error generating rubric');
        }
    };

    publish = async (req: Request, res: Response): Promise<void> => {
        try {
            const { metadata, blueprint, rubric } = req.body;
            const testSuiteGen = new TestSuiteGeneratorService();
            const testSuites = await testSuiteGen.generateTestSuitesAsync(blueprint);

            const publishedAssignmentId = uuidv4();
            const publishedAssignment: PublishedAssignment = {
                id: publishedAssignmentId,
                version: '1.0.0',
                metadata,
                blueprintId: blueprint.id,
                rubric,
                testSuites
            };

            await this.assignmentRepository.saveAsync(publishedAssignment);

            // INTEGRATION WITH AITA CORE
            const { title, description, subject, semesterId, classIds, dueDate, fileUrl, fileName, fileType, examType, weightPercentage, gradingStrategy } = metadata;
            const selectedGradingStrategy = gradingStrategy || 'CONTINUOUS_QUEUE';

            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

            // 1. Resolve subject code or ID to SubjectId safely
            let subjectRecord: any = null;
            if (subject && typeof subject === 'string') {
                const isSubjectUuid = uuidRegex.test(subject);
                subjectRecord = await prisma.subject.findFirst({
                    where: isSubjectUuid
                        ? { OR: [{ Id: subject }, { SubjectCode: subject }] }
                        : { SubjectCode: subject }
                });
            }

            // Weight validation
            if (weightPercentage) {
                const existingExams = await prisma.exam.findMany({
                    where: { SubjectId: subjectRecord?.Id || null }
                });
                const currentTotalWeight = existingExams.reduce((sum, exam) => {
                    let w = 0;
                    if ((exam as any).WeightPercentage) w = Number((exam as any).WeightPercentage);
                    else if (exam.AiGeneratedContent) {
                        try {
                            const parsed = JSON.parse(exam.AiGeneratedContent);
                            if (parsed.weightPercentage) w = Number(parsed.weightPercentage);
                        } catch(e) {}
                    }
                    return sum + w;
                }, 0);
                if (currentTotalWeight + Number(weightPercentage) > 70) {
                    throw new BadRequestError(`Tổng tỷ trọng điểm không được vượt quá 70%. Tổng hiện tại là ${currentTotalWeight}%.`);
                }
            }

            const examId = publishedAssignmentId; // Keep 1:1 mapping
            const totalPoints = rubric?.rules ? rubric.rules.reduce((sum: number, r: any) => sum + (Number(r.weight) || 0), 0) : 10;
            if (rubric?.rules && Array.isArray(rubric.rules) && rubric.rules.length > 0) {
                if (Math.abs(totalPoints - 10) > 0.01) {
                    return res.status(400).json({
                        error: `Tổng điểm của các tiêu chí Rubric phải bằng chính xác 10.0 điểm. Hiện tại: ${totalPoints.toFixed(2)} điểm.`
                    });
                }
            }

            let parsedDueDate: Date | undefined;
            if (dueDate) {
                const d = new Date(dueDate);
                if (!isNaN(d.getTime())) parsedDueDate = d;
            }

            const validClassIds = Array.isArray(classIds) ? classIds.filter((c: any) => typeof c === 'string' && uuidRegex.test(c)) : [];
            const creatorId = (req.user?.id && uuidRegex.test(req.user.id)) ? req.user.id : null;

            await prisma.exam.create({
                data: {
                    Id: examId,
                    Title: title || 'AI Assignment',
                    Description: description || '',
                    SubjectId: subjectRecord?.Id || null,
                    ExamType: examType || 'Assignment',
                    Status: 'Published',
                    TotalPoints: totalPoints,
                    CreatedBy: creatorId,
                    StartDate: new Date(),
                    DueDate: parsedDueDate,
                    GradingStrategy: selectedGradingStrategy,
                    AiGeneratedContent: JSON.stringify({ blueprintId: blueprint?.id, weightPercentage: weightPercentage ? Number(weightPercentage) : 0 }),
                    ...(validClassIds.length > 0 ? {
                        ExamClass: {
                            create: validClassIds.map((cId: string) => ({
                                ClassId: cId,
                                DueDate: parsedDueDate
                            }))
                        }
                    } : {})
                }
            });

            // 3. Create ExamAttachment if a file was uploaded
            if (fileUrl) {
                await prisma.examAttachment.create({
                    data: {
                        ExamId: examId,
                        FileUrl: fileUrl,
                        FileName: fileName || 'Assignment Document',
                        FileType: fileType || 'application/octet-stream'
                    }
                });
            }

            // 4. Send Notifications (In-App & Email)
            try {
                const sendNotificationUseCase = new SendAssignmentNotificationUseCase(new NodemailerService());
                sendNotificationUseCase.execute({
                    examId: examId,
                    title: title || 'AI Assignment',
                    type: 'Assignment',
                    classIds: validClassIds,
                    subjectId: subjectRecord?.Id,
                    dueDate: parsedDueDate,
                    createdBy: creatorId || 'system'
                }).catch((err) => console.error("Error sending assignment notification:", err));
            } catch (notifErr) {
                console.error("Failed to initialize assignment notification:", notifErr);
            }

            this.created(res, publishedAssignment, 'Assignment published successfully');
        } catch (error: any) {
            console.error("Publish Error:", error);
            res.status(500).json({ error: error.message || "Error publishing assignment" });
        }
    };

    getAll = async (_req: Request, res: Response): Promise<void> => {
        try {
            const assignments = await this.assignmentRepository.getAllAsync();

            if (!assignments || assignments.length === 0) {
                this.ok(res, [], 'Assignments fetched');
                return;
            }

            const examIds = assignments.map(a => a.id);

            // Get Exam dates and related class/submission data
            const exams = await prisma.exam.findMany({
                where: { Id: { in: examIds } },
                select: {
                    Id: true,
                    StartDate: true,
                    DueDate: true,
                    GradingStrategy: true,
                    _count: {
                        select: { Submission: true }
                    },
                    ExamClass: {
                        select: {
                            Class: {
                                select: {
                                    _count: {
                                        select: { StudentClass: true }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // Build a map for quick lookup
            const statsMap = new Map();
            exams.forEach(exam => {
                let totalStudents = 0;
                exam.ExamClass.forEach(ec => {
                    totalStudents += ec.Class?._count?.StudentClass || 0;
                });

                statsMap.set(exam.Id, {
                    createdAt: exam.StartDate,
                    dueDate: exam.DueDate,
                    gradingStrategy: (exam as any).GradingStrategy || 'CONTINUOUS_QUEUE',
                    submitted: exam._count.Submission || 0,
                    totalStudents: totalStudents
                });
            });

            // Attach stats to assignment response
            const enhancedAssignments = assignments.map(a => {
                const stats = statsMap.get(a.id) || {
                    createdAt: new Date(),
                    dueDate: null,
                    gradingStrategy: 'CONTINUOUS_QUEUE',
                    submitted: 0,
                    totalStudents: 0
                };

                const percentage = stats.totalStudents > 0
                    ? Math.round((stats.submitted / stats.totalStudents) * 100)
                    : 0;

                return {
                    ...a,
                    stats: {
                        ...stats,
                        percentage
                    }
                };
            });

            this.ok(res, enhancedAssignments, 'Assignments fetched');
        } catch (error) {
            console.error("GetAll Error:", error);
            throw new Error('Error fetching assignments');
        }
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id;
            const assignment = await this.assignmentRepository.getAsync(id);
            if (assignment) {
                // Fetch detailed stats for this single assignment
                const exam = await prisma.exam.findUnique({
                    where: { Id: id },
                    select: {
                        StartDate: true,
                        DueDate: true,
                        GradingStrategy: true,
                        ExamClass: {
                            select: {
                                Class: {
                                    select: {
                                        _count: { select: { StudentClass: true } }
                                    }
                                }
                            }
                        },
                        Submission: {
                            select: {
                                TotalScore: true,
                                GradingStatus: true
                            }
                        }
                    }
                });

                let stats = {
                    totalStudents: 0,
                    submitted: 0,
                    notSubmitted: 0,
                    grading: 0,
                    averageScore: 0,
                    submittedPercentage: 0,
                    notSubmittedPercentage: 0,
                    gradingPercentage: 0,
                    createdAt: new Date(),
                    dueDate: null as any
                };

                if (exam) {
                    let totalStudents = 0;
                    exam.ExamClass.forEach(ec => {
                        totalStudents += ec.Class?._count?.StudentClass || 0;
                    });

                    const submittedCount = exam.Submission.length;
                    const notSubmittedCount = Math.max(0, totalStudents - submittedCount);

                    // Only 'Processing' is considered "Đang chấm" (grading).
                    // 'Pending' means it was uploaded but hasn't started grading yet (Đã nộp).
                    const gradingCount = exam.Submission.filter(s => s.GradingStatus === 'Processing').length;

                    // Average score is calculated for 'Graded' submissions
                    const gradedSubmissions = exam.Submission.filter(s => s.GradingStatus === 'Graded' && s.TotalScore !== null);
                    let averageScore = 0;
                    if (gradedSubmissions.length > 0) {
                        const totalScore = gradedSubmissions.reduce((sum, s) => sum + Number(s.TotalScore || 0), 0);
                        averageScore = totalScore / gradedSubmissions.length;
                    }

                    stats = {
                        totalStudents,
                        submitted: submittedCount,
                        notSubmitted: notSubmittedCount,
                        grading: gradingCount,
                        averageScore: Number(averageScore.toFixed(2)),
                        submittedPercentage: totalStudents > 0 ? Number(((submittedCount / totalStudents) * 100).toFixed(1)) : 0,
                        notSubmittedPercentage: totalStudents > 0 ? Number(((notSubmittedCount / totalStudents) * 100).toFixed(1)) : 0,
                        gradingPercentage: submittedCount > 0 ? Number(((gradingCount / submittedCount) * 100).toFixed(1)) : 0, // Grading percentage usually relative to submitted
                        createdAt: exam.StartDate as any,
                        dueDate: exam.DueDate as any,
                        gradingStrategy: (exam as any).GradingStrategy || 'CONTINUOUS_QUEUE'
                    };
                }

                const enhancedAssignment = {
                    ...assignment,
                    metadata: {
                        ...assignment.metadata,
                        gradingStrategy: (stats as any)?.gradingStrategy || assignment.metadata?.gradingStrategy || 'CONTINUOUS_QUEUE'
                    },
                    stats
                };

                this.ok(res, enhancedAssignment, 'Assignment fetched');
            } else {
                throw new BadRequestError('Not found');
            }
        } catch (error) {
            throw new Error('Error fetching assignment');
        }
    };

    update = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id;
            const { title, description, dueDate, gradingStrategy } = req.body;

            const assignment = await this.assignmentRepository.getAsync(id);
            if (!assignment) {
                throw new BadRequestError('Assignment not found');
            }

            // 1. Update Prisma Exam Record
            const examRecord = await prisma.exam.findUnique({ where: { Id: id } });
            if (!examRecord) {
                throw new BadRequestError('Exam record not found in database');
            }

            let parsedDueDate: Date | undefined;
            if (dueDate) {
                parsedDueDate = new Date(dueDate);
                if (parsedDueDate < examRecord.StartDate) {
                    throw new BadRequestError('Due date cannot be earlier than the assignment start date');
                }
            }

            await prisma.exam.update({
                where: { Id: id },
                data: {
                    Title: title,
                    Description: description,
                    DueDate: parsedDueDate,
                    GradingStrategy: gradingStrategy || examRecord.GradingStrategy || 'CONTINUOUS_QUEUE'
                }
            });

            // 2. Update Prisma ExamClass Records
            await prisma.examClass.updateMany({
                where: { ExamId: id },
                data: {
                    DueDate: parsedDueDate
                }
            });

            // 3. Update Document Store Metadata
            const updatedAssignment = {
                ...assignment,
                metadata: {
                    ...assignment.metadata,
                    title,
                    description,
                    dueDate,
                    gradingStrategy: gradingStrategy || examRecord.GradingStrategy || 'CONTINUOUS_QUEUE'
                }
            };

            await this.assignmentRepository.saveAsync(updatedAssignment);

            this.ok(res, updatedAssignment, 'Assignment updated successfully');
        } catch (error) {
            console.error("Update Error:", error);
            throw new Error('Error updating assignment');
        }
    };

    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id;

            // 1. Delete Core SQL records to ensure it's removed from Student view
            try {
                await prisma.examClass.deleteMany({ where: { ExamId: id } });
                await prisma.examAttachment.deleteMany({ where: { ExamId: id } });
                await prisma.submission.deleteMany({ where: { ExamId: id } });
                await prisma.exam.delete({ where: { Id: id } });
            } catch (e) {
                console.warn(`[AssignmentController] Failed to clean up core exam records for ${id}:`, e);
            }

            // 2. Delete from Document DB
            await this.assignmentRepository.deleteAsync(id);
            this.ok(res, null, 'Assignment deleted successfully');
        } catch (error) {
            throw new Error('Error deleting assignment');
        }
    };

    updateAllStrategy = async (req: Request, res: Response): Promise<void> => {
        try {
            const { strategy } = req.body;
            if (!strategy || !['CONTINUOUS_QUEUE', 'BATCH_POST_DEADLINE'].includes(strategy)) {
                throw new BadRequestError('Invalid grading strategy');
            }

            // Update all exams in SQL Database
            await prisma.exam.updateMany({
                data: { GradingStrategy: strategy }
            });

            // Update all published assignments in Document Store
            const allAssignments = await this.assignmentRepository.getAllAsync();
            for (const assignment of allAssignments) {
                const updated = {
                    ...assignment,
                    metadata: {
                        ...assignment.metadata,
                        gradingStrategy: strategy
                    }
                };
                await this.assignmentRepository.saveAsync(updated);
            }

            this.ok(res, { strategy }, 'All assignment grading strategies updated successfully');
        } catch (error: any) {
            console.error("UpdateAllStrategy Error:", error);
            res.status(500).json({ error: error.message || "Error updating all grading strategies" });
        }
    };

    streamAssignmentEvents = async (req: Request, res: Response): Promise<void> => {
        const id = req.params.id;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Send initial heartbeat
        res.write(`data: ${JSON.stringify({ type: 'CONNECTED', assignmentId: id })}\n\n`);

        const onAssignmentEvent = (eventData: any) => {
            try {
                res.write(`data: ${JSON.stringify(eventData)}\n\n`);
            } catch (e) {}
        };

        globalJobManager.on(`assignment_event:${id}`, onAssignmentEvent);

        req.on('close', () => {
            globalJobManager.removeListener(`assignment_event:${id}`, onAssignmentEvent);
        });
    };
}


