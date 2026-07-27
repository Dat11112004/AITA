// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../../database/prisma.js';
import { BadRequestError } from '../../../shared/errors';
import { ExecutionSandboxService, SandboxHandle } from '../../../application/sandbox/ExecutionSandboxService';

import { PlaywrightExecutor } from '../../../application/execution/PlaywrightExecutor';
import { RubricEvaluator, EvaluationContext } from '../../../application/evaluator/RubricEvaluator';
import { globalAssignmentRepository } from '../../../assignment/PublishedAssignmentRepository';
import { extractZipAsync } from '../../../shared/helpers/unzipHelper';
import { Submission } from '../../../core/domain/submission/Submission';
import { SubmissionState } from '../../../core/domain/submission/SubmissionState';
import { ProjectSourceSnapshot } from '../../../application/evaluator/AICodeReviewEngine';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { DocumentExtractor } from '../../../assignment/DocumentExtractor';
import { globalSubmissionQueue } from '../../../application/queue/SubmissionQueue';
import { globalJobManager } from '../../../application/queue/SubmissionJobManager';
import { SubmissionHistoryRepository } from '../../../infrastructure/file-system/SubmissionHistoryRepository';

import { BaseController } from '../../../../../../shared/presentation/base-controller.js';
export class SubmissionController extends BaseController {
  private readonly sandboxService: ExecutionSandboxService;
  private readonly playwrightExecutor: PlaywrightExecutor;
  private readonly evaluator: RubricEvaluator;
  private readonly historyRepo: SubmissionHistoryRepository;

  constructor(
    sandboxService: ExecutionSandboxService,
    playwrightExecutor: PlaywrightExecutor,
    evaluator: RubricEvaluator
  ) {
    super();
    this.sandboxService = sandboxService;
    this.playwrightExecutor = playwrightExecutor;
    this.evaluator = evaluator;
    this.historyRepo = new SubmissionHistoryRepository();
  }

  /**
   * POST /api/submissions
   * Accepts a .zip file upload, processes and returns the assessment.
   */
  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded. Please upload a .zip file.');
      }

      if (!req.file.originalname.endsWith('.zip')) {
        throw new BadRequestError('Only .zip files are accepted.');
      }

      const submissionId = uuidv4();
      
      const assignmentIdFromReq = req.body.assignmentId;
      
      let publishedAssignment = null;
      if (assignmentIdFromReq) {
          publishedAssignment = await globalAssignmentRepository.getAsync(assignmentIdFromReq);
      }
      
      if (!publishedAssignment) {
          // Fallback to latest published assignment
          publishedAssignment = await globalAssignmentRepository.getLatestAsync();
      }
      
      if (!publishedAssignment) {
          throw new BadRequestError('No published assignments found. Please publish an assignment first.');
      }

      const studentName = req.file.originalname.replace('.zip', '');

      const submission: Submission = {
        id: submissionId,
        assignmentId: publishedAssignment.id,
        studentId: studentName,
        sourceCodeUri: req.file.path,
        currentState: SubmissionState.Queued,
        statusHistory: []
      };

      // 1. Unzip the file
      const extractDir = path.join(process.cwd(), 'temp', 'submissions', submissionId);
      await extractZipAsync(req.file.path, extractDir);
      await this.extractNestedZips(extractDir);

      // Initialize Job
      globalJobManager.initJob(submissionId);

      this.enqueueSubmissionJob(submissionId, publishedAssignment, submission, extractDir);

      this.ok(res, { submissionId, statusUrl: `/api/submissions/${submissionId}/stream` }, 'Submission accepted for processing');

    } catch (error: any) {
      next(error);
    }
  };

  /**
   * POST /api/submissions/upload-batch
   * Accepts multiple .zip files, processes them in the queue, and returns an array of submissionIds.
   */
  submitBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new BadRequestError('No files uploaded. Please upload .zip files.');
      }

      const assignmentIdFromReq = req.body.assignmentId;
      
      let publishedAssignment = null;
      if (assignmentIdFromReq) {
          publishedAssignment = await globalAssignmentRepository.getAsync(assignmentIdFromReq);
      } else {
          publishedAssignment = await globalAssignmentRepository.getLatestAsync();
      }
      
      if (!publishedAssignment) {
          throw new BadRequestError('No published assignments found. Please publish an assignment first.');
      }

      const results = [];

      for (const file of files) {
          if (!file.originalname.endsWith('.zip')) {
              continue; // Skip non-zip files
          }

          const submissionId = uuidv4();
          
          // Use original file name without extension as student/submission name for display
          const studentName = file.originalname.replace('.zip', '');

          const submission: Submission = {
            id: submissionId,
            assignmentId: publishedAssignment.id,
            studentId: studentName, // Using filename as student identifier
            sourceCodeUri: file.path,
            currentState: SubmissionState.Queued,
            statusHistory: []
          };

          const extractDir = path.join(process.cwd(), 'temp', 'submissions', submissionId);
          await extractZipAsync(file.path, extractDir);
          await this.extractNestedZips(extractDir);

          globalJobManager.initJob(submissionId);
          this.enqueueSubmissionJob(submissionId, publishedAssignment, submission, extractDir);

          results.push({
              fileName: file.originalname,
              studentName: studentName,
              submissionId: submissionId
          });
      }

      this.ok(res, { jobs: results }, `${results.length} submissions accepted for processing`);

    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Helper to download file from URL (Cloudinary or local) and save to temp path
   */
  private async downloadFile(url: string, destPath: string): Promise<void> {
      try {
          if (url.startsWith('http://') || url.startsWith('https://')) {
              const fetchUrl = url.split('?')[0]; // Remove query params
              const response = await fetch(fetchUrl);
              if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
              }
              const buffer = await response.arrayBuffer();
              
              // Ensure directory exists
              const dir = path.dirname(destPath);
              await fs.mkdir(dir, { recursive: true });
              
              await fs.writeFile(destPath, Buffer.from(buffer));
          } else {
              // Local file path
              let localPath = url.split('?')[0];
              if (localPath.startsWith('/')) localPath = localPath.substring(1);
              const sourcePath = path.join(process.cwd(), localPath);
              
              // Ensure directory exists
              const dir = path.dirname(destPath);
              await fs.mkdir(dir, { recursive: true });
              
              await fs.copyFile(sourcePath, destPath);
          }
      } catch (err: any) {
          throw new Error(`Failed to download file from ${url}: ${err.message}`);
      }
  }

  public executeGradingForSubmission = async (submissionId: string): Promise<void> => {
      const submissionRecord = await prisma.submission.findUnique({
          where: { Id: submissionId },
          include: { User_Submission_StudentIdToUser: true }
      });

      if (!submissionRecord) {
          throw new BadRequestError('Submission not found');
      }

      if (!submissionRecord.ZipFileUrl) {
          throw new BadRequestError('Submission does not have an uploaded file (ZipFileUrl is null)');
      }

      const assignmentId = submissionRecord.ExamId;
      if (!assignmentId) {
          throw new BadRequestError('Submission is not linked to an Exam (assignment)');
      }

      const publishedAssignment = await globalAssignmentRepository.getAsync(assignmentId);
      if (!publishedAssignment) {
          throw new BadRequestError('Published assignment not found for this submission');
      }

      const studentCode = submissionRecord.User_Submission_StudentIdToUser?.StudentCode || 
                          submissionRecord.User_Submission_StudentIdToUser?.Username || 
                          submissionRecord.StudentId;

      // 1. Download file to temp directory
      const tempZipPath = path.join(process.cwd(), 'temp', 'uploads', `${submissionId}.zip`);
      await this.downloadFile(submissionRecord.ZipFileUrl, tempZipPath);

      // 2. Unzip file
      const extractDir = path.join(process.cwd(), 'temp', 'submissions', submissionId);
      await extractZipAsync(tempZipPath, extractDir);
      await this.extractNestedZips(extractDir);

      // 3. Update status to 'Processing'
      await prisma.submission.update({
          where: { Id: submissionId },
          data: { GradingStatus: 'Processing' }
      });

      const engineSubmission: Submission = {
          id: submissionId,
          assignmentId: assignmentId,
          studentId: studentCode!,
          sourceCodeUri: tempZipPath,
          currentState: SubmissionState.Queued,
          statusHistory: []
      };

      globalJobManager.initJob(submissionId);
      this.enqueueSubmissionJob(submissionId, publishedAssignment, engineSubmission, extractDir);
  };

  /**
   * POST /api/grading/submissions/grade-existing
   * Grades a single submission that has already been uploaded (has ZipFileUrl)
   */
  gradeExisting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
          const { submissionId } = req.body;
          if (!submissionId) {
              throw new BadRequestError('submissionId is required');
          }

          await this.executeGradingForSubmission(submissionId);

          this.ok(res, { submissionId, statusUrl: `/api/grading/submissions/${submissionId}/stream` }, 'Submission accepted for grading');

      } catch (error: any) {
          next(error);
      }
  };

  /**
   * POST /api/grading/submissions/grade-existing-batch
   * Grades all 'Pending' submissions for an assignment
   */
  gradeExistingBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
          const { assignmentId } = req.body;
          if (!assignmentId) {
              throw new BadRequestError('assignmentId is required');
          }

          const publishedAssignment = await globalAssignmentRepository.getAsync(assignmentId);
          if (!publishedAssignment) {
              throw new BadRequestError('Published assignment not found');
          }

          // Snapshot: Get all submissions for this exam that have a ZipFileUrl and are not currently processing or graded
          const pendingSubmissions = await prisma.submission.findMany({
              where: {
                  ExamId: assignmentId,
                  OR: [
                      { GradingStatus: { notIn: ['Processing', 'Graded', 'GRADED'] } },
                      { GradingStatus: null }
                  ],
                  IsLatest: true,
                  ZipFileUrl: { not: null }
              },
              include: { User_Submission_StudentIdToUser: true }
          });

          if (pendingSubmissions.length === 0) {
              this.ok(res, { jobs: [] }, 'No pending submissions found to grade');
              return;
          }

          const results = [];

          for (const record of pendingSubmissions) {
              const submissionId = record.Id;
              const studentCode = record.User_Submission_StudentIdToUser?.StudentCode || 
                                  record.User_Submission_StudentIdToUser?.Username || 
                                  record.StudentId;
              
              // Extract original file name from URL for display
              let fileName = 'submission.zip';
              if (record.ZipFileUrl) {
                  fileName = record.ZipFileUrl.split('/').pop()?.split('?')[0] || fileName;
              }

              try {
                  const tempZipPath = path.join(process.cwd(), 'temp', 'uploads', `${submissionId}.zip`);
                  await this.downloadFile(record.ZipFileUrl!, tempZipPath);

                  const extractDir = path.join(process.cwd(), 'temp', 'submissions', submissionId);
                  await extractZipAsync(tempZipPath, extractDir);
                  await this.extractNestedZips(extractDir);

                  const engineSubmission: Submission = {
                      id: submissionId,
                      assignmentId: assignmentId,
                      studentId: studentCode!,
                      sourceCodeUri: tempZipPath,
                      currentState: SubmissionState.Queued,
                      statusHistory: []
                  };

                  globalJobManager.initJob(submissionId);
                  this.enqueueSubmissionJob(submissionId, publishedAssignment, engineSubmission, extractDir);

                  results.push({
                      submissionId: submissionId,
                      studentName: studentCode,
                      fileName: fileName
                  });
              } catch (err: any) {
                  console.error(`[SubmissionController] Failed to queue batch submission ${submissionId}:`, err);
                  // Optionally mark as failed in DB here if you want
              }
          }

          // Update all successfully queued submissions to 'Processing'
          if (results.length > 0) {
              const queuedIds = results.map(r => r.submissionId);
              await prisma.submission.updateMany({
                  where: { Id: { in: queuedIds } },
                  data: { GradingStatus: 'Processing' }
              });
          }

          this.ok(res, { jobs: results }, `${results.length} submissions accepted for processing`);
      } catch (error: any) {
          next(error);
      }
  };

  /**
   * POST /api/grading/submissions/grade-selected-batch
   * Grades specific submissions based on their IDs
   */
  gradeSelectedBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
          const { assignmentId, submissionIds } = req.body;
          if (!assignmentId) {
              throw new BadRequestError('assignmentId is required');
          }
          if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
              throw new BadRequestError('submissionIds array is required');
          }

          const publishedAssignment = await globalAssignmentRepository.getAsync(assignmentId);
          if (!publishedAssignment) {
              throw new BadRequestError('Published assignment not found');
          }

          // Get submissions by IDs that have a ZipFileUrl
          const pendingSubmissions = await prisma.submission.findMany({
              where: {
                  Id: { in: submissionIds },
                  ExamId: assignmentId,
                  ZipFileUrl: { not: null }
              },
              include: { User_Submission_StudentIdToUser: true }
          });

          if (pendingSubmissions.length === 0) {
              this.ok(res, { jobs: [] }, 'No valid submissions found to grade from the selection');
              return;
          }

          const results = [];

          for (const record of pendingSubmissions) {
              const submissionId = record.Id;
              const studentCode = record.User_Submission_StudentIdToUser?.StudentCode || 
                                  record.User_Submission_StudentIdToUser?.Username || 
                                  record.StudentId;
              
              let fileName = 'submission.zip';
              if (record.ZipFileUrl) {
                  fileName = record.ZipFileUrl.split('/').pop()?.split('?')[0] || fileName;
              }

              try {
                  const tempZipPath = path.join(process.cwd(), 'temp', 'uploads', `${submissionId}.zip`);
                  await this.downloadFile(record.ZipFileUrl!, tempZipPath);

                  const extractDir = path.join(process.cwd(), 'temp', 'submissions', submissionId);
                  await extractZipAsync(tempZipPath, extractDir);
                  await this.extractNestedZips(extractDir);

                  const engineSubmission: Submission = {
                      id: submissionId,
                      assignmentId: assignmentId,
                      studentId: studentCode!,
                      sourceCodeUri: tempZipPath,
                      currentState: SubmissionState.Queued,
                      statusHistory: []
                  };

                  globalJobManager.initJob(submissionId);
                  this.enqueueSubmissionJob(submissionId, publishedAssignment, engineSubmission, extractDir);

                  results.push({
                      submissionId: submissionId,
                      studentName: studentCode,
                      fileName: fileName
                  });
              } catch (err: any) {
                  console.error(`[SubmissionController] Failed to queue selected submission ${submissionId}:`, err);
              }
          }

          if (results.length > 0) {
              const queuedIds = results.map(r => r.submissionId);
              await prisma.submission.updateMany({
                  where: { Id: { in: queuedIds } },
                  data: { GradingStatus: 'Processing' }
              });
          }

          this.ok(res, { jobs: results }, `${results.length} submissions accepted for processing`);
      } catch (error: any) {
          next(error);
      }
  };

  /**
   * GET /api/submissions/batch-status?ids=uuid1,uuid2
   * Returns current job status for multiple submissions.
   */
  getBatchStatus = async (req: Request, res: Response): Promise<void> => {
      try {
          const idsString = req.query.ids as string;
          if (!idsString) {
              throw new BadRequestError('Missing ids parameter');
              return;
          }

          const ids = idsString.split(',').filter(id => id.trim().length > 0);
          const statuses: Record<string, any> = {};

          for (const id of ids) {
              const job = globalJobManager.getJob(id);
              if (job) {
                  statuses[id] = {
                      state: job.state,
                      progressPercent: job.progressPercent,
                      currentTask: job.currentTask,
                      error: job.error,
                      score: job.result?.totalScore,
                      maxScore: job.result?.maxPossibleScore
                  };
              }
          }

          this.ok(res, { statuses }, 'Batch status fetched successfully');
      } catch (err) {
          res.status(500).json({ success: false, error: 'Failed to fetch batch status' });
      }
  };

  public enqueueSubmissionJob(submissionId: string, publishedAssignment: any, submission: Submission, extractDir: string) {
      globalSubmissionQueue.enqueue(async () => {
          let sandboxHandle: SandboxHandle | null = null;
          try {
              const checkCancelled = () => {
                  const job = globalJobManager.getJob(submissionId);
                  if (job?.isCancelled) throw new Error('Cancelled by user');
              };

              const evaluationPromise = (async () => {
                  checkCancelled();
                  globalJobManager.updateProgress(submissionId, 5, 'Khởi tạo môi trường chấm (Sandbox)...');
                  sandboxHandle = await this.sandboxService.startAsync(extractDir, publishedAssignment.metadata.projectType as any);

                  if (sandboxHandle.isReady && sandboxHandle.baseUrl) {
                      checkCancelled();
                      globalJobManager.updateProgress(submissionId, 10, 'Đang chạy Migration / Build DB...');
                      try {
                          await fetch(sandboxHandle.baseUrl);
                      } catch (err) {}
                  }

                  checkCancelled();
                  globalJobManager.updateProgress(submissionId, 15, 'Đang phân tích mã nguồn (Source Snapshot)...');
                  const sourceSnapshot = await this.buildSourceSnapshot(extractDir, sandboxHandle.projectType);

                  let playwrightEvidence: any[] = [];
                  if (sandboxHandle.isReady && sandboxHandle.baseUrl) {
                      checkCancelled();
                      globalJobManager.updateProgress(submissionId, 25, 'Đang chạy AI Vision / UI Tests...');
                      playwrightEvidence = await this.playwrightExecutor.executeAsync(
                          submissionId,
                          extractDir,
                          publishedAssignment,
                          sandboxHandle.baseUrl,
                          sandboxHandle.additionalUrls
                      );
                  }

                  checkCancelled();
                  globalJobManager.updateProgress(submissionId, 40, 'Đang đọc tài liệu báo cáo (DOCX/PDF)...');
                  let extractedDoc: any = undefined;
                  try {
                      async function findDocx(dir: string): Promise<string | null> {
                          const entries = await fs.readdir(dir, { withFileTypes: true });
                          for (const entry of entries) {
                              const fullPath = path.join(dir, entry.name);
                              if (entry.isDirectory()) {
                                  const res = await findDocx(fullPath);
                                  if (res) return res;
                              } else if (entry.name.toLowerCase().endsWith('.docx') || entry.name.toLowerCase().endsWith('.pdf')) {
                                  return fullPath;
                              }
                          }
                          return null;
                      }
                      const docPath = await findDocx(extractDir);
                      if (docPath) {
                          const buf = await fs.readFile(docPath);
                          const mime = docPath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                          const extractor = new DocumentExtractor();
                          extractedDoc = await extractor.extractAsync(buf, mime);
                      }
                  } catch (docErr) {}

                  checkCancelled();
                  globalJobManager.updateProgress(submissionId, 50, 'Bắt đầu chấm điểm các tiêu chí...');
                  const context: EvaluationContext = {
                      sandbox: sandboxHandle,
                      sourceSnapshot,
                      evidencePool: [...playwrightEvidence],
                      extractedDocument: extractedDoc,
                      submissionPath: extractDir,
                      crashLogs: sandboxHandle.isReady === false ? sandboxHandle.crashLogs : undefined,
                  };

                  return await this.evaluator.evaluateAsync(
                      submissionId,
                      publishedAssignment.id,
                      submission.studentId,
                      publishedAssignment.rubric,
                      context,
                      (current, total, msg, meta) => {
                          const pct = 50 + Math.floor((current / total) * 50);
                          globalJobManager.updateProgress(submissionId, pct, msg, meta);
                      }
                  );
              })();

              const timeoutPromise = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Global evaluation timeout (15 minutes) exceeded')), 900000)
              );

              const report = await Promise.race([evaluationPromise, timeoutPromise]) as any;
              
              globalJobManager.completeJob(submissionId, report);

              // --- Save to History DB ---
              try {
                  await this.historyRepo.saveAsync({
                      id: submissionId,
                      assignmentId: publishedAssignment.id,
                      studentId: submission.studentId,
                      score: report.totalScore || 0,
                      maxScore: report.maxPossibleScore || 0,
                      assessedAt: new Date().toISOString(),
                      title: publishedAssignment.metadata.title,
                      report: report
                  });
              } catch (historyErr) {
                  console.error(`[SubmissionController] Failed to save history for ${submissionId}:`, historyErr);
              }

          } catch (err: any) {
              console.error(`[SubmissionController] Job ${submissionId} failed:`, err);
              
              if (err.partialReport) {
                  try {
                      await this.historyRepo.saveAsync({
                          id: submissionId,
                          assignmentId: publishedAssignment.id,
                          studentId: submission.studentId,
                          score: err.partialReport.totalScore || 0,
                          maxScore: err.partialReport.maxPossibleScore || 0,
                          assessedAt: new Date().toISOString(),
                          title: publishedAssignment.metadata.title,
                          report: err.partialReport
                      });
                  } catch (historyErr) {
                      console.error(`[SubmissionController] Failed to save partial history for ${submissionId}:`, historyErr);
                  }
              }
              try {
                  await prisma.submission.update({
                      where: { Id: submissionId },
                      data: { GradingStatus: null }
                  });
              } catch (dbErr) {
                  console.error(`[SubmissionController] Failed to reset GradingStatus for ${submissionId}:`, dbErr);
              }
              
              globalJobManager.failJob(submissionId, err.message || 'Unknown error');
          } finally {
              if (sandboxHandle) {
                  await this.sandboxService.stopAsync(sandboxHandle);
              }
              try {
                  await fs.rm(extractDir, { recursive: true, force: true });
              } catch (cleanupErr) {}
          }
      }).catch(err => {
          console.error(`[SubmissionController] Queue error for ${submissionId}:`, err);
      });
  }

  streamProgress = async (req: Request, res: Response) => {
      const id = req.params.id as string;
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Send initial state
      let job = globalJobManager.getJob(id);
      if (!job) {
          try {
              const subRecord = await prisma.submission.findUnique({ where: { Id: id } });
              if (subRecord) {
                  if (subRecord.GradingStatus === 'Graded' || subRecord.GradingStatus === 'Completed' || subRecord.Score !== null) {
                      res.write(`data: ${JSON.stringify({
                          id,
                          state: 'completed',
                          progressPercent: 100,
                          currentTask: 'Chấm điểm hoàn tất',
                          result: { totalScore: subRecord.Score }
                      })}\n\n`);
                      res.end();
                      return;
                  } else if (subRecord.ZipFileUrl) {
                      // Self-healing: if in DB but memory job missing, start grading job immediately
                      await this.executeGradingForSubmission(id).catch(() => {});
                      job = globalJobManager.getJob(id);
                  }
              }
          } catch (e) {}
      }

      if (job) {
          res.write(`data: ${JSON.stringify(job)}\n\n`);
      } else {
          res.write(`data: ${JSON.stringify({ error: 'Job not found' })}\n\n`);
      }

      const onUpdate = (updatedJob: any) => {
          res.write(`data: ${JSON.stringify(updatedJob)}\n\n`);
          if (updatedJob.state === 'completed' || updatedJob.state === 'failed') {
              res.end();
              globalJobManager.removeListener(`update:${id}`, onUpdate);
          }
      };

      globalJobManager.on(`update:${id}`, onUpdate);

      req.on('close', () => {
          globalJobManager.removeListener(`update:${id}`, onUpdate);
      });
  };

  cancel = async (req: Request, res: Response) => {
      const id = req.params.id as string;
      const job = globalJobManager.getJob(id);
      
      if (!job) {
          try {
              await prisma.submission.update({
                  where: { Id: id },
                  data: { GradingStatus: null }
              });
          } catch (e) {}
          this.ok(res, { success: true }, 'Job not found in memory. Database state has been force reset.');
          return;
      }
      
      if (job.state === 'completed') {
          throw new BadRequestError(`Cannot cancel job in state: ${job.state}`);
      }

      globalJobManager.cancelJob(id);
      this.ok(res, { success: true }, 'Job cancellation requested.');
  };

  cancelBatch = async (req: Request, res: Response) => {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
          throw new BadRequestError('Missing or invalid ids array');
      }

      let cancelledCount = 0;
      for (const id of ids) {
          const job = globalJobManager.getJob(id);
          if (job && job.state !== 'completed') {
              globalJobManager.cancelJob(id);
              cancelledCount++;
          }
      }

      this.ok(res, { success: true, cancelledCount }, `Requested cancellation for ${cancelledCount} jobs.`);
  };

  getResult = async (req: Request, res: Response) => {
      const id = req.params.id as string;
      const job = globalJobManager.getJob(id);
      
      let report: any = null;

      if (!job) {
          // Fallback to History Database if RAM doesn't have it
          const historyItem = await this.historyRepo.getByIdAsync(id);
          if (historyItem && historyItem.report && Object.keys(historyItem.report).length > 0) {
              report = historyItem.report;
          } else {
              throw new BadRequestError('Submission report not found. The grading data may have expired — please re-submit and grade again.');
          }
      } else {
          if (job.state === 'completed') {
              report = job.result;
              // Clear job to save memory since we've already saved it to History DB
              globalJobManager.clearJob(id);
          } else if (job.state === 'failed') {
              // Try to fetch partial report from history db
              const historyItem = await this.historyRepo.getByIdAsync(id);
              if (historyItem && historyItem.report && Object.keys(historyItem.report).length > 0) {
                  report = historyItem.report;
              } else {
                  throw new BadRequestError('Job failed and no partial report was generated. Error: ' + job.error);
              }
              // Clear job to save memory
              globalJobManager.clearJob(id);
          } else {
              throw new BadRequestError('Job is not completed yet. Current state: ' + job.state);
          }
      }

      let isPublished = false;
      let reviewStatus = 'DRAFT';
      try {
        const subRecord = await prisma.submission.findUnique({
          where: { Id: id },
          select: { ReviewStatus: true }
        });
        reviewStatus = subRecord?.ReviewStatus || 'DRAFT';
        isPublished = reviewStatus === 'PUBLISHED';
      } catch (e) {}

      this.ok(res, {
        submissionId: id,
        score: report.totalScore || 0,
        maxScore: report.maxPossibleScore || 0,
        rules: report.passedRules || [],
        failedRules: report.failedRules || [],
        manualReviewNotes: report.manualReviewNotes || [],
        overallFeedback: report.overallFeedback,
        isPublished,
        reviewStatus
      }, 'Result fetched successfully');
  };

  publish = async (req: Request, res: Response) => {
      const id = req.params.id as string;
      try {
        await prisma.submission.update({
          where: { Id: id },
          data: { ReviewStatus: 'PUBLISHED' }
        });
      } catch (e) {}
      this.ok(res, { success: true, isPublished: true, reviewStatus: 'PUBLISHED' }, 'Đã công bố kết quả cho học sinh thành công!');
  };

  unpublish = async (req: Request, res: Response) => {
      const id = req.params.id as string;
      try {
        await prisma.submission.update({
          where: { Id: id },
          data: { ReviewStatus: 'DRAFT' }
        });
      } catch (e) {}
      this.ok(res, { success: true, isPublished: false, reviewStatus: 'DRAFT' }, 'Đã chuyển kết quả về trạng thái nháp.');
  };

  getHistory = async (req: Request, res: Response) => {
      try {
          const assignmentId = req.query.assignmentId as string | undefined;
          const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
          const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
          const search = req.query.search as string | undefined;
          const statusFilter = req.query.status as string | undefined;
          const scoreRange = req.query.scoreRange as string | undefined;
          const sortOrder = req.query.sort as string | undefined;

          if (!assignmentId) throw new BadRequestError('Assignment ID is required');

          // Fetch all students enrolled in the classes of this assignment
          const allStudentClasses = await prisma.studentClass.findMany({
              where: {
                  Class: {
                      ExamClass: {
                          some: {
                              ExamId: assignmentId
                          }
                      }
                  },
                  User: search ? {
                      OR: [
                          { FullName: { contains: search } },
                          { StudentCode: { contains: search } }
                      ]
                  } : undefined
              },
              include: {
                  User: true
              }
          });

          // Fetch latest submissions for these students
          const studentIds = allStudentClasses.map(sc => sc.UserId);
          const submissions = await prisma.submission.findMany({
              where: {
                  ExamId: assignmentId,
                  StudentId: { in: studentIds },
                  IsLatest: true
              }
          });

          const assignment = await prisma.exam.findUnique({
              where: { Id: assignmentId },
              select: { Title: true, TotalPoints: true }
          });

          const maxScore = assignment?.TotalPoints ? Number(assignment.TotalPoints) : 10;

          let history = allStudentClasses.map(sc => {
              const submission = submissions.find(s => s.StudentId === sc.UserId);
              
              let status = 'NotSubmitted';
              if (submission) {
                  if (submission.GradingStatus === 'Processing') {
                      status = 'Grading';
                  } else if (submission.GradingStatus === 'Graded' || submission.GradingStatus === 'GRADED') {
                      status = 'Graded';
                  } else {
                      status = 'Submitted';
                  }
              }

              const score = submission?.FinalScore !== null && submission?.FinalScore !== undefined ? Number(submission.FinalScore) : 0;
              const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

              return {
                  id: submission?.Id || `${sc.UserId}-${assignmentId}`,
                  title: assignment?.Title || 'Assignment',
                  assignmentId,
                  studentId: sc.User.StudentCode || sc.UserId,
                  studentName: sc.User.FullName || 'Chưa cập nhật',
                  studentCode: sc.User.StudentCode || sc.UserId,
                  studentAvatar: sc.User.Avatar,
                  score,
                  maxScore,
                  percentage,
                  assessedAt: submission?.SubmittedAt || new Date(0),
                  status
              };
          });

          // Apply Status Filter
          if (statusFilter && statusFilter !== 'ALL') {
              history = history.filter(h => h.status === statusFilter);
          }

          // Apply Score Range Filter
          if (scoreRange && scoreRange !== 'ALL') {
              history = history.filter(h => {
                  if (h.status !== 'Graded') return false;
                  if (scoreRange === '9-10') return h.percentage >= 90;
                  if (scoreRange === '8-9') return h.percentage >= 80 && h.percentage < 90;
                  if (scoreRange === '7-8') return h.percentage >= 70 && h.percentage < 80;
                  if (scoreRange === '5-7') return h.percentage >= 50 && h.percentage < 70;
                  if (scoreRange === '<5') return h.percentage < 50;
                  return true;
              });
          }

          // Apply Sorting
          if (sortOrder === 'score_desc') {
              history.sort((a, b) => b.score - a.score);
          } else if (sortOrder === 'score_asc') {
              history.sort((a, b) => a.score - b.score);
          } else if (sortOrder === 'name_asc') {
              history.sort((a, b) => a.studentName.localeCompare(b.studentName));
          } else {
              // Default sort: latest submission first
              history.sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());
          }

          const total = history.length;
          const paginatedHistory = history.slice((page - 1) * limit, page * limit);

          this.ok(res, { 
              history: paginatedHistory,
              meta: {
                  total,
                  page,
                  limit,
                  totalPages: Math.ceil(total / limit)
              }
          }, 'History fetched successfully');

      } catch (err) {
          res.status(500).json({ success: false, error: 'Failed to fetch history' });
      }
  };

  deleteHistory = async (req: Request, res: Response) => {
      try {
          const id = req.params.id as string;
          const deleted = await this.historyRepo.deleteAsync(id);
          if (deleted) {
              this.ok(res, null, 'Deleted successfully');
          } else {
              throw new BadRequestError('Not found');
          }
      } catch (err) {
          res.status(500).json({ success: false, error: 'Failed to delete history item' });
      }
  };

  private async buildSourceSnapshot(dir: string, projectType: string): Promise<ProjectSourceSnapshot> {
    const files: { relativePath: string; content: string }[] = [];

    async function walk(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          const ignoredDirs = ['bin', 'obj', 'node_modules', '.git', 'vendor', 'dist', 'build', 'out', '.next', '.nuxt', 'venv', 'target', 'Library', 'Temp', 'Logs', 'UserSettings'];
          if (ignoredDirs.includes(entry.name)) {
            continue;
          }
          await walk(fullPath);
        } else if (entry.isFile()) {
          const UNIVERSAL_SOURCE_EXTENSIONS = new Set([
            // Web & JS Ecosystem
            '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
            // C# / .NET
            '.cs', '.csproj', '.razor', '.xaml', '.fs', '.vb',
            // Java & JVM
            '.java', '.kt', '.scala', '.groovy', '.pom', '.gradle',
            // Python
            '.py', '.ipynb',
            // C / C++
            '.c', '.cpp', '.cxx', '.cc', '.h', '.hpp', '.hxx',
            // Go
            '.go', '.mod',
            // Rust
            '.rs', '.toml',
            // PHP & Ruby
            '.php', '.rb', '.erb',
            // Mobile (Swift, Dart, Kotlin)
            '.swift', '.dart',
            // Unity
            '.unity', '.asmdef', '.prefab', '.asset', '.shader', '.compute', '.hlsl', '.inputactions',
            // Database
            '.sql', '.prisma',
            // Config & Docs
            '.json', '.xml', '.yml', '.yaml', '.md', '.env', '.ini'
          ]);

          const ext = path.extname(entry.name).toLowerCase();
          if (UNIVERSAL_SOURCE_EXTENSIONS.has(ext) || entry.name.toLowerCase() === 'dockerfile' || entry.name.toLowerCase() === 'makefile') {
            const content = await fs.readFile(fullPath, 'utf8');
            files.push({ relativePath: fullPath.replace(dir, ''), content });
          }
        }
      }
    }

    await walk(dir);
    return { files, projectType };
  }

  private async extractNestedZips(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
              await this.extractNestedZips(fullPath);
          } else if (entry.name.toLowerCase().endsWith('.zip')) {
              const extractPath = path.join(dir, entry.name.slice(0, -4));
              try {
                  await extractZipAsync(fullPath, extractPath);
                  await fs.unlink(fullPath);
                  await this.extractNestedZips(extractPath);
              } catch (e) {
                  console.error(`[SubmissionController] Failed to extract nested zip ${fullPath}:`, e);
              }
          }
      }
  }

  /**
   * GET /api/submissions/health
   * Simple health check for the submissions module.
   */
  healthCheck = (_req: Request, res: Response): void => {
    this.ok(res, { module: 'submissions', status: 'healthy', timestamp: new Date().toISOString() }, 'Healthy');
  };
}



