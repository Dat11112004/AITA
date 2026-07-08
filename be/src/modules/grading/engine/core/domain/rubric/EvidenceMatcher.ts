// @ts-nocheck
export type EvidenceType =
  | "browser.screenshot.captured"   // Playwright — needs sandbox
  | "runtime.http.probed"           // HTTPProbe — needs sandbox
  | "ai.code.reviewed"              // Gemini reads source — no sandbox needed
  | "runtime.stdio.probed"          // StdInOutProbe — Docker stdin/stdout
  | "ai.text.analyzed"              // AiTextAnalysis — text comparison
  | "manual.teacher.reviewed";      // Manual — human grading

export interface HTTPProbeStep {
  stepId: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  pathTemplate: string;
  body?: object;
  expectedStatus: number;
  captureFromResponse?: {
    variable: string;
    jsonPath: string;
  };
  assertions?: Array<{
    jsonPath: string;
    assertType: "exists" | "equals" | "contains" | "isArray" | "count_equals" | "count_gt" | "not_exists" | "not_empty" | "greater_than" | "less_than";
    value?: any;
  }>;
}

export interface HTTPProbeSpec {
  description: string;
  steps: HTTPProbeStep[];
}

export interface StdInOutTestCase {
  id: string;
  /** Exact string piped to stdin (use \n for newlines) */
  input: string;
  /** Expected stdout output (trimmed, whitespace-normalized for comparison) */
  expectedOutput: string;
  /** Timeout in ms for this test case. Default: 5000 */
  timeoutMs?: number;
}

export interface StdInOutProbeSpec {
  description: string;
  /** Override build command (auto-detected if not specified) */
  buildCommand?: string;
  /** Override run command (auto-detected if not specified) */
  runCommand?: string;
  testCases: StdInOutTestCase[];
}

export interface BrowserProbeSpec {
  description: string;
  /** Target relative path to navigate to, e.g., '/login' or '/dashboard' */
  path: string;
}

export interface EvidenceMatcher {
  evidenceType: EvidenceType;
  minimumConfidence: number;
  httpProbe?: HTTPProbeSpec;
  stdInOutProbe?: StdInOutProbeSpec;
  browserProbe?: BrowserProbeSpec;
  semanticDescription?: string;
  payloadMatcher?: Record<string, any>;
}

