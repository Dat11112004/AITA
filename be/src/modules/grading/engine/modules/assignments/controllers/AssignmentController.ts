// @ts-nocheck
import { Request, Response } from 'express';
import { assignments } from '../data/assignments';
import { AssignmentManagementService } from '../../../assignment/AssignmentManagementService';
import { DocumentExtractor } from '../../../assignment/DocumentExtractor';
import { RequirementParserService } from '../../../assignment/RequirementParserService';
import { BlueprintService } from '../../../assignment/BlueprintService';
import { RubricGeneratorService } from '../../../assignment/RubricGeneratorService';
import { TestSuiteGeneratorService } from '../../../assignment/TestSuiteGeneratorService';
import { PublishedAssignmentRepository, globalAssignmentRepository } from '../../../assignment/PublishedAssignmentRepository';
import { GeminiAiProvider } from '../../../infrastructure/ai/GeminiAiProvider';
import { PublishedAssignment } from '../../../core/domain/submission/PublishedAssignment';
import { BadRequestError } from '../../../shared/errors';
import { v4 as uuidv4 } from 'uuid';

import { BaseController } from '../../../../../../shared/presentation/base-controller.js';

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
          if (!file) throw new BadRequestError('No file');
          const docExt = new DocumentExtractor();
          const text = await docExt.extractAsync(file.buffer, file.mimetype);
          this.ok(res, { text }, 'Text extracted');
      } catch (error) {
          throw new Error('Error extracting text');
      }
  };

  generateContent = async (req: Request, res: Response): Promise<void> => {
      try {
          const { prompt } = req.body;
          this.ok(res, { markdown: "mock" }, 'Content generated');
      } catch (error) {
          throw new Error('Error generating content');
      }
  };

  parseRubric = async (req: Request, res: Response): Promise<void> => {
      try {
          const { content } = req.body;
          if (!content) throw new BadRequestError('No content');

          const requirementParser = new RequirementParserService(this.aiProvider);
          const rubricGenerator = new RubricGeneratorService(this.aiProvider);

          let contentStr = typeof content === 'string' ? content : JSON.stringify(content);
          if (typeof content === 'object' && content.rawText) {
              contentStr = content.rawText;
          }
          console.log(`[AssignmentController] parseRubric: contentStr length is ${contentStr.length}`);

          const draftBlueprint = await requirementParser.parseRequirementsAsync(contentStr);
          const rubric = await rubricGenerator.generateRubricAsync(draftBlueprint);

          this.ok(res, { rubric, blueprint: draftBlueprint }, 'Rubric parsed');
      } catch (error) {
          throw new Error('Error parsing rubric');
      }
  };

  parseRequirements = async (req: Request, res: Response): Promise<void> => {
      try {
          const { content } = req.body;
          if (!content) throw new BadRequestError('No content');
          const requirementParser = new RequirementParserService(this.aiProvider);
          
          let contentStr = typeof content === 'string' ? content : JSON.stringify(content);
          if (typeof content === 'object' && content.rawText) {
              contentStr = content.rawText;
          }
          console.log(`[AssignmentController] parseRequirements: contentStr length is ${contentStr.length}`);
          
          const draftBlueprint = await requirementParser.parseRequirementsAsync(contentStr);
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

          const publishedAssignment: PublishedAssignment = {
              id: uuidv4(),
              version: '1.0.0',
              metadata,
              blueprintId: blueprint.id,
              rubric,
              testSuites
          };

          await this.assignmentRepository.saveAsync(publishedAssignment);
          this.created(res, publishedAssignment, 'Assignment published successfully');
      } catch (error) {
          throw new Error('Error publishing');
      }
  };

  getAll = async (_req: Request, res: Response): Promise<void> => {
      try {
          const assignments = await this.assignmentRepository.getAllAsync();
          this.ok(res, assignments, 'Assignments fetched');
      } catch (error) {
          throw new Error('Error fetching assignments');
      }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
      try {
          const id = req.params.id;
          const assignment = await this.assignmentRepository.getAsync(id);
          if (assignment) {
              this.ok(res, assignment, 'Assignment fetched');
          } else {
              throw new BadRequestError('Not found');
          }
      } catch (error) {
          throw new Error('Error fetching assignment');
      }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
      try {
          const id = req.params.id;
          await this.assignmentRepository.deleteAsync(id);
          this.ok(res, null, 'Assignment deleted successfully');
      } catch (error) {
          throw new Error('Error deleting assignment');
      }
  };
}

