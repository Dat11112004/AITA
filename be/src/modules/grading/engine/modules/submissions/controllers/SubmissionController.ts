// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
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

  private enqueueSubmissionJob(submissionId: string, publishedAssignment: any, submission: Submission, extractDir: string) {
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

  streamProgress = (req: Request, res: Response) => {
      const id = req.params.id as string;
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Send initial state
      const job = globalJobManager.getJob(id);
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
          throw new BadRequestError('Job not found or already completed/cleared.');
      }
      
      if (job.state === 'completed' || job.state === 'failed') {
          throw new BadRequestError(`Cannot cancel job in state: ${job.state}`);
      }

      globalJobManager.cancelJob(id);
      this.ok(res, { success: true }, 'Job cancellation requested.');
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
          if (job.state !== 'completed') {
              throw new BadRequestError('Job is not completed yet. Current state: ' + job.state);
          }
          report = job.result;
          // Clear job to save memory since we've already saved it to History DB
          globalJobManager.clearJob(id);
      }

      this.ok(res, { submissionId: id, score: report.totalScore || 0, maxScore: report.maxPossibleScore || 0, rules: report.passedRules || [], failedRules: report.failedRules || [], manualReviewNotes: report.manualReviewNotes || [] }, 'Result fetched successfully');
  };

  getHistory = async (req: Request, res: Response) => {
      try {
          const assignmentId = req.query.assignmentId as string | undefined;
          const items = await this.historyRepo.getAllAsync(assignmentId);
          this.ok(res, { history: items.map(x => ({
              id: x.id,
              title: x.title,
              assignmentId: x.assignmentId,
              studentId: x.studentId,
              score: x.score,
              maxScore: x.maxScore,
              assessedAt: x.assessedAt
          })) }, 'History fetched successfully');
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

  /**
   * GET /api/submissions/health
   * Simple health check for the submissions module.
   */
  healthCheck = (_req: Request, res: Response): void => {
    this.ok(res, { module: 'submissions', status: 'healthy', timestamp: new Date().toISOString() }, 'Healthy');
  };
}



