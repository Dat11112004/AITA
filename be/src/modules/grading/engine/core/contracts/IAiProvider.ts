// @ts-nocheck
export interface ParsedRequirement {
  id: string;
  title: string;
  description: string;
  marks: number | null;
  complexity: "low" | "medium" | "high";
  complexityReason: string;
  isUIVisible: boolean;
  isCRUD: boolean;
  groupId?: string;
  crudOperations?: Array<"create" | "read" | "update" | "delete" | "search">;
  /** True when the student must write a text/essay answer (design questions, debugging explanations, analysis reports) */
  isWrittenAnswer?: boolean;
  /** True when the task demands implementing a specific codebase architecture/pattern (MVC, Clean Architecture, Repository, etc.) */
  isArchitectureCode?: boolean;
  /** True when the task requires the student to draw or create a diagram */
  isDiagramTask?: boolean;
  /** True when the task requires implementing a logical soft delete rather than a hard physical delete */
  isSoftDelete?: boolean;
  /** Reference/model answer for AiTextAnalysis comparison (optional, teacher can provide later) */
  referenceAnswer?: string;
  partLabel?: string;
  recommendedEngineReason?: string;
  recommendedEngine?: 'AICodeReview' | 'AiTextAnalysis' | 'AIVision' | 'HTTPProbe' | 'Boolean' | 'Manual';
}

export interface ParsedBlueprint {
  projectType: string;
  language: string;
  framework: string;
  assignmentTitle: string;
  description: string;
  totalMarks: number | null;
  gradingGroups?: { id: string, name: string, points: number }[];
  requirements: ParsedRequirement[];
}

/**
 * Represents the AI Providers available to assist in requirement parsing and review.
 * AI Providers MUST NOT participate in final scoring.
 */
export interface IAiProvider {
    /**
     * Parses a natural language requirement into structured Rubric rules.
     */
    parseRequirementsAsync(prompt: string): Promise<ParsedBlueprint>;

    /**
     * Evaluates a screenshot or image against a specific requirement.
     * Returns the confidence score (0.0 to 1.0) and AI's explanation.
     */
    evaluateImageAsync(imageBuffers: { buffer: Buffer, isMockup?: boolean }[], requirement: string): Promise<{ score: number; explanation: string, relevantImageIndices?: number[] }>;

    /**
     * Provides qualitative feedback on code snippets or screenshots.
     */
    generateFeedbackAsync(context: string, payload: any): Promise<string>;

    /**
     * Generates a detailed JSON array of RubricRules from requirements.
     */
    generateRubricRulesAsync(requirements: ParsedRequirement[], projectType: string, assignmentDescription?: string): Promise<any[]>;
    
    /**
     * Generates assignment markdown content from a text prompt.
     */
    generateAssignmentContentAsync(prompt: string): Promise<string>;
}

