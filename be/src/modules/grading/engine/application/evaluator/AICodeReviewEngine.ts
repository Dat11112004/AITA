// @ts-nocheck
import OpenAI from 'openai';
import { config } from '../../config';
import { AiClientManager } from '../../infrastructure/ai/AiClientManager';
import * as crypto from 'crypto';

export interface ProjectSourceSnapshot {
  projectType: string;
  files: Array<{
    relativePath: string;
    content: string;
  }>;
}

export interface CodeReviewResult {
  passed: boolean;
  confidence: number;
  reasoning: string;
  /** 0.0 to 1.0 — proportion of sub-requirements met (e.g. 3/4 APIs = 0.75) */
  percentageComplete: number;
  relevantSnippets?: Array<{
    codeSnippet: string;
    filePath: string;
    explanation: string;
  }>;
  relevantFiles: string[];
}

/**
 * Per-language file scoring weights for intelligent file selection.
 * These boost high-value files to the top of the context window.
 */
const LANGUAGE_SCORING: Record<string, Array<{ pattern: string, score: number }>> = {
  dart: [
    { pattern: 'main.dart', score: 20 },
    { pattern: 'viewmodel', score: 15 }, { pattern: 'view_model', score: 15 },
    { pattern: 'repository', score: 15 },
    { pattern: 'service', score: 10 }, { pattern: 'api_service', score: 15 },
    { pattern: 'screen', score: 10 }, { pattern: 'widget', score: 5 },
    { pattern: 'model', score: 10 },
    { pattern: 'pubspec.yaml', score: 20 },
    { pattern: 'bloc', score: 15 }, { pattern: 'cubit', score: 15 },
    { pattern: 'provider', score: 10 },
  ],
  csharp: [
    { pattern: 'program.cs', score: 20 }, { pattern: 'startup.cs', score: 20 },
    { pattern: 'dbcontext', score: 20 }, { pattern: 'context', score: 10 },
    { pattern: 'controller', score: 15 },
    { pattern: 'service', score: 10 }, { pattern: 'repository', score: 10 },
    { pattern: '.csproj', score: 15 },
    { pattern: '.razor', score: 5 },
  ],
  java: [
    { pattern: 'application', score: 15 }, { pattern: 'main', score: 15 },
    { pattern: 'controller', score: 15 }, { pattern: 'restcontroller', score: 15 },
    { pattern: 'service', score: 15 }, { pattern: 'serviceimpl', score: 15 },
    { pattern: 'repository', score: 15 }, { pattern: 'dao', score: 15 },
    { pattern: 'entity', score: 10 }, { pattern: 'model', score: 10 },
    { pattern: 'dto', score: 8 }, { pattern: 'mapper', score: 5 },
    { pattern: 'pom.xml', score: 20 }, { pattern: 'build.gradle', score: 20 },
    { pattern: 'application.properties', score: 10 }, { pattern: 'application.yml', score: 10 },
  ],
  kotlin: [
    { pattern: 'mainactivity', score: 20 }, { pattern: 'application', score: 15 },
    { pattern: 'viewmodel', score: 15 }, { pattern: 'repository', score: 15 },
    { pattern: 'fragment', score: 10 }, { pattern: 'adapter', score: 8 },
    { pattern: 'build.gradle', score: 20 },
  ],
  python: [
    { pattern: 'main.py', score: 20 }, { pattern: 'app.py', score: 20 },
    { pattern: 'views.py', score: 15 }, { pattern: 'urls.py', score: 15 },
    { pattern: 'models.py', score: 15 }, { pattern: 'serializers.py', score: 10 },
    { pattern: 'settings.py', score: 10 },
    { pattern: 'requirements.txt', score: 15 }, { pattern: 'pyproject.toml', score: 15 },
  ],
  golang: [
    { pattern: 'main.go', score: 20 },
    { pattern: 'handler', score: 15 }, { pattern: 'router', score: 15 },
    { pattern: 'service', score: 10 }, { pattern: 'repository', score: 10 },
    { pattern: 'go.mod', score: 20 },
  ],
  rust: [
    { pattern: 'main.rs', score: 20 }, { pattern: 'lib.rs', score: 15 },
    { pattern: 'handler', score: 10 }, { pattern: 'model', score: 10 },
    { pattern: 'cargo.toml', score: 20 },
  ],
  typescript: [
    { pattern: 'index.ts', score: 15 }, { pattern: 'app.ts', score: 15 },
    { pattern: 'controller', score: 15 }, { pattern: 'service', score: 10 },
    { pattern: 'route', score: 10 }, { pattern: 'middleware', score: 8 },
    { pattern: 'package.json', score: 20 }, { pattern: 'tsconfig', score: 5 },
  ],
  javascript: [
    { pattern: 'index.js', score: 15 }, { pattern: 'app.js', score: 15 },
    { pattern: 'server.js', score: 15 },
    { pattern: 'controller', score: 12 }, { pattern: 'route', score: 10 },
    { pattern: 'package.json', score: 20 },
  ],
  php: [
    { pattern: 'index.php', score: 15 }, { pattern: 'controller', score: 15 },
    { pattern: 'model', score: 10 }, { pattern: 'route', score: 10 },
    { pattern: 'composer.json', score: 20 },
  ],
  ruby: [
    { pattern: 'application_controller', score: 15 }, { pattern: 'controller', score: 12 },
    { pattern: 'model', score: 10 }, { pattern: 'route', score: 10 },
    { pattern: 'gemfile', score: 20 },
  ],
  cpp: [
    { pattern: 'main.cpp', score: 20 }, { pattern: 'main.c', score: 20 },
    { pattern: '.h', score: 5 }, { pattern: 'makefile', score: 15 },
    { pattern: 'cmakelists', score: 15 },
  ],
};

export class AICodeReviewEngine {
  constructor() {
    // Client initialized via AiClientManager
  }

  public async evaluateAsync(
    snapshot: ProjectSourceSnapshot,
    semanticDescription: string,
    ruleTitle: string
  ): Promise<CodeReviewResult> {
    if (!snapshot.files || snapshot.files.length === 0) {
      return {
        passed: false,
        confidence: 1.0,
        percentageComplete: 0.0,
        reasoning: "Hệ thống không tìm thấy bất kỳ mã nguồn nào để chấm điểm. Vui lòng kiểm tra lại cấu trúc thư mục nộp bài (thiếu thư mục lib, src...).",
        relevantFiles: []
      };
    }

    const relevantFiles = this.selectRelevantFiles(snapshot.files, semanticDescription);
    const maxContextLengths = [12000, 6000, 3000];
    let attempt = 0;
    let lastError: any = null;

    for (const MAX_CONTEXT_LENGTH of maxContextLengths) {
      attempt++;
      let filesContext = "";

      for (const f of relevantFiles) {
        const fileStr = `// FILE: ${f.relativePath}\n${f.content}\n\n---\n\n`;
        if (filesContext.length + fileStr.length > MAX_CONTEXT_LENGTH) {
          if (filesContext.length === 0) {
            filesContext = fileStr.substring(0, MAX_CONTEXT_LENGTH) + "\n\n... [CONTENT TRUNCATED DUE TO SIZE LIMIT]";
          } else {
            filesContext += `// [Skipped remaining files due to context size limit...]`;
          }
          break;
        }
        filesContext += fileStr;
      }

      const isArchitectural = ['architecture', 'repository', 'dependency injection', 'clean architecture', 'layered', 'mvc']
        .some(kw => (ruleTitle + ' ' + semanticDescription).toLowerCase().includes(kw));

      const isDatabase = ['database', 'entity framework', 'dbcontext', 'schema', 'tables', 'migration', 'models']
        .some(kw => (ruleTitle + ' ' + semanticDescription).toLowerCase().includes(kw));

      let scopeRule = "";
      if (isArchitectural) {
        scopeRule = `7. ARCHITECTURAL PRAGMATISM: This criterion enforces structural patterns (e.g., Repository Pattern, Dependency Injection, MVVM). Evaluate based on general adherence to the pattern. DO NOT penalize standard practices such as injecting an ApiService into a Repository, or a Repository into a ViewModel. Focus on whether the logical separation of concerns exists, not pedagogical perfection.`;
      } else if (isDatabase) {
        scopeRule = `7. DATABASE ISOLATION: This is a Database Setup/Model criterion. Focus ONLY on Entity Framework setup, DbContext, Models, and relationships. DO NOT evaluate Controllers or API endpoints (like GET/POST validation) here. DO NOT penalize architectural patterns.`;
      } else {
        scopeRule = `7. API/LOGIC ISOLATION: This is a functional/API criterion. DO NOT penalize the code for violating architectural patterns (like using DbContext directly in controllers). Evaluate ONLY the correctness of the functional logic, routing, and data validation.`;
      }

      const prompt = `You are an academic code grader for a university-level programming assignment.

═══════════════════════════════════════
GRADING CONTEXT
═══════════════════════════════════════
Project Type: ${snapshot.projectType}
Grading Criterion: "${ruleTitle}"

STRICT INSTRUCTIONS:
1. You MUST evaluate both the EXISTENCE and the CORRECTNESS of the implementation for the provided criterion.
2. If the criterion asks for specific functionality (e.g., a POST endpoint), you must verify that the logic is mathematically and logically sound (e.g., data is properly bound, foreign keys are handled, necessary calculations are correct).
3. If the code is present but buggy, incomplete, or fails to handle obvious edge cases related to the criterion, you MUST reduce the "percentageComplete" proportionally. Do NOT give 100% just because the function signature exists.
4. ISOLATION: ONLY penalize for bugs that are directly relevant to the current criterion. STRICT: DO NOT penalize for missing features (like API endpoints) if they are NOT explicitly requested in the criterion text. If a criterion only asks for Database Models or Setup, do not grade the Controllers.
5. ANTI-HALLUCINATION (OVER-STRICTNESS): DO NOT penalize for lack of Try-Catch, Exception handling, or Data Validation UNLESS the criterion EXPLICITLY asks for it. If the basic "Happy Path" logic works according to the criterion, give full points.
6. SOFT DELETE RULE: If the criterion mentions "IsDeleted = true", "IsDeleted", or "Soft delete", you MUST accept setting a flag as the correct implementation. Do NOT penalize the code for failing to permanently remove the record from the database.
${scopeRule}
═══════════════════════════════════════
YOUR TASK
═══════════════════════════════════════
${semanticDescription}

═══════════════════════════════════════
SOURCE CODE TO EVALUATE
═══════════════════════════════════════

${filesContext}

═══════════════════════════════════════
OUTPUT FORMAT — Return ONLY valid JSON:
{
  "passed": true | false,
  "confidence": 0.0 to 1.0,
  "percentageComplete": <MUST BE EXACTLY ONE OF: 0.0, 0.25, 0.5, 0.75, 1.0>,
  "reasoning": "one paragraph explaining what you found and your conclusion",
  "relevantSnippets": [
    {
      "codeSnippet": "A short exact code excerpt from the source that triggered your decision (max 15 lines). CRITICAL: MUST escape all newlines as \\n and quotes as \\\"! DO NOT output literal newlines.",
      "filePath": "relative path to the file containing this snippet",
      "explanation": "CRITICAL: Must match the code exactly. NEVER extract valid code and then falsely claim the feature doesn't exist!"
    }
  ],
  "relevantFiles": ["file paths that were decisive"]
}
STRICT RULES:
1. If the criterion requires multiple elements (e.g., GET, POST, PUT, DELETE APIs), you MUST extract multiple snippets in the 'relevantSnippets' array to prove each element exists. Do NOT just extract the first one you see.
2. "percentageComplete" MUST reflect how many sub-requirements are met. Example: If the criterion asks for 5 API endpoints and only 3 exist, set percentageComplete to 0.6. If everything is met, set to 1.0. If nothing is met, set to 0.0. This is CRITICAL for fair partial scoring.
3. Set "passed" to true ONLY if percentageComplete >= 0.9 (i.e., nearly all sub-requirements are met).
4. ANTI-HALLUCINATION: If you find the code, acknowledge it. Do NOT say a method is missing if you just extracted it.
5. PRESERVE FORMATTING: You MUST escape all line breaks as \\n and quotes as \\" inside the JSON string values. DO NOT output literal newlines inside strings. This causes JSON Parse errors!
6. CONCISENESS (CRITICAL): Your 'reasoning' MUST be strictly less than 80 words. Focus ONLY on the code logic (variables, logic, data). DO NOT describe UI elements.
7. CRITICAL: The "reasoning" and "explanation" fields MUST be written entirely in Vietnamese.
8. CRITICAL EVIDENCE REQUIREMENT: If percentageComplete > 0, you MUST ALWAYS provide at least one snippet in 'relevantSnippets'. Even if you only found partial code (like finding the UI Screen but missing the ViewModel), you MUST extract the partial code you did find as proof! Empty arrays [] are ABSOLUTELY FORBIDDEN if the score is greater than 0.`;

      try {
        const cacheKey = "code_" + crypto.createHash('sha256').update(prompt).digest('hex');
        let response: any;

        const finalParsed = await AiClientManager.executeWithFallback(async (client, model) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);
          try {
            const result = await Promise.race([
              client.chat.completions.create({
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.0,
                max_tokens: 4096,
                response_format: { type: "json_object" }
              }, { signal: controller.signal as any }),
              new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 90000))
            ]);

            let text = (result as any).choices[0].message.content?.trim() || "{}";
            text = text.replace(/^```json/g, "").replace(/```$/g, "").trim();

            // State-machine JSON sanitizer: Robustly fix literal newlines inside JSON string values.
            try {
              let sanitizedText = "";
              let inString = false;
              let isEscaped = false;
              for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === '\\') {
                  isEscaped = !isEscaped;
                  sanitizedText += char;
                } else if (char === '"' && !isEscaped) {
                  inString = !inString;
                  sanitizedText += char;
                  isEscaped = false;
                } else if (char === '\n' && inString) {
                  sanitizedText += '\\n'; // Escape literal newline
                  isEscaped = false;
                } else if (char === '\r' && inString) {
                  // Ignore carriage return inside string to prevent breaking JSON
                  isEscaped = false;
                } else {
                  sanitizedText += char;
                  isEscaped = false;
                }
              }
              text = sanitizedText;
            } catch (e) {
              // Ignore sanitizer errors
            }

            let parsedObj: any;
            try {
              parsedObj = JSON.parse(text);
              return parsedObj;
            } catch (parseError: any) {
              console.warn(`[AICodeReviewEngine] JSON Parse Failed: ${parseError.message}. Using REGEX fallback extraction...`);
              try {
                let passed = false;
                if (text.includes('"passed": true') || text.includes('"passed":true') || text.includes('"passed":  true')) {
                  passed = true;
                }

                let percentageComplete = 0;
                const pctMatch = text.match(/"percentageComplete"\s*:\s*([0-9.]+)/);
                if (pctMatch) {
                  percentageComplete = parseFloat(pctMatch[1]);
                }

                let reasoning = "Không thể trích xuất nhận xét do lỗi định dạng AI.";
                const reasoningMatch = text.match(/"reasoning"\s*:\s*"([\s\S]*?)"\s*(,\s*"relevantSnippets"|,\s*"relevantFiles"|})/);
                if (reasoningMatch) {
                  reasoning = reasoningMatch[1].replace(/\\n/g, ' ').replace(/\n/g, ' ').replace(/\\"/g, '"');
                } else {
                  const fallbackMatch = text.match(/"reasoning"\s*:\s*"([\s\S]*)$/); // Match until end of string if truncated
                  if (fallbackMatch) {
                    reasoning = fallbackMatch[1].replace(/\\n/g, ' ').replace(/\n/g, ' ').replace(/\\"/g, '"').replace(/"\s*\]?\s*\}?$/, '');
                  }
                }

                // Extract snippets via order-agnostic Regex
                const relevantSnippets: any[] = [];
                const arrayMatch = text.match(/"relevantSnippets"\s*:\s*\[([\s\S]*?)\]/);
                if (arrayMatch) {
                  const blocks = arrayMatch[1].match(/\{[\s\S]*?\}/g);
                  if (blocks) {
                    for (const block of blocks) {
                      let codeSnippet = "";
                      let filePath = "";
                      let explanation = "Được trích xuất qua luồng cứu hộ dự phòng.";

                      const codeM = block.match(/"codeSnippet"\s*:\s*"([\s\S]*?)"(?=\s*(?:,|}|$))/);
                      if (codeM) codeSnippet = codeM[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

                      const fileM = block.match(/"filePath"\s*:\s*"([\s\S]*?)"(?=\s*(?:,|}|$))/);
                      if (fileM) filePath = fileM[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

                      const expM = block.match(/"explanation"\s*:\s*"([\s\S]*?)"(?=\s*(?:,|}|$))/);
                      if (expM) explanation = expM[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

                      if (codeSnippet && filePath) {
                        relevantSnippets.push({ codeSnippet, filePath, explanation });
                      }
                    }
                  }
                }

                const regexFallbackObj = {
                  passed,
                  confidence: 0.5,
                  percentageComplete,
                  reasoning,
                  relevantSnippets,
                  relevantFiles: []
                };

                return regexFallbackObj;
              } catch (regexErr: any) {
                throw new Error(`AI Code Review service failed: Đoạn code trích xuất quá dài hoặc chứa ký tự đặc biệt khiến JSON bị vỡ (${parseError.message}).`);
              }
            }
          } finally {
            clearTimeout(timeoutId);
          }
        }, cacheKey);

        // --- ENFORCE RULE 8 WITHOUT RETRIES (SPEED OPTIMIZATION) ---
        // If the AI gives a score > 0 but stubbornly returns 0 valid snippets, synthesize the evidence
        // to prevent retries (which slow down the system).

        const scorePct = typeof finalParsed.percentageComplete === 'number' ? finalParsed.percentageComplete : (finalParsed.passed ? 1 : 0);
        if (!finalParsed.relevantSnippets) finalParsed.relevantSnippets = [];

        // Ensure snippets have the required fields to be rendered by the dashboard
        const hasValidSnippets = finalParsed.relevantSnippets.some((s: any) => s && s.codeSnippet && s.codeSnippet.trim() !== '' && s.filePath);

        if (scorePct > 0 && !hasValidSnippets) {
          finalParsed.relevantSnippets = []; // Clear invalid ones

          // Attempt to synthesize from relevantFiles
          if (finalParsed.relevantFiles && finalParsed.relevantFiles.length > 0) {
            for (const file of finalParsed.relevantFiles) {
              const escapedFile = file.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
              // Allow partial paths: match anything before the file name on the same line
              // Stop matching at \n\n--- OR \n\n... [CONTENT TRUNCATED
              const regex = new RegExp(`// FILE:\\s*(?:[^\\n]*?)${escapedFile}\\s*\\n([\\s\\S]*?)(?=\\n\\n---|\\n\\n\\.\\.\\. \\[CONTENT TRUNCATED)`);
              const match = prompt.match(regex);
              if (match) {
                let content = match[1].trim();
                finalParsed.relevantSnippets.push({
                  codeSnippet: content, // Return full file content
                  filePath: file,
                  explanation: "Toàn bộ mã nguồn tệp được trích xuất làm bằng chứng dự phòng."
                });
              }
            }
          }

          // Fallback to first file in prompt if STILL empty
          if (finalParsed.relevantSnippets.length === 0) {
            const match = prompt.match(/\/\/ FILE:\s*([^\n]+)\s*\n([\s\S]*?)(?=\n\n---|\n\n\.\.\. \[CONTENT TRUNCATED)/);
            if (match) {
              let content = match[2].trim();
              finalParsed.relevantSnippets.push({
                codeSnippet: content, // Return full file content
                filePath: match[1].trim(),
                explanation: "Toàn bộ mã nguồn tệp được trích xuất làm bằng chứng dự phòng."
              });
            }
          }
        }

        return finalParsed;
      } catch (error: any) {
        lastError = error;
        const isTimeoutOrRateLimit = error.message?.includes('AI_TIMEOUT') ||
          error.message?.includes('abort') ||
          error.status === 429 ||
          error.status === 503 ||
          error.message?.includes('fetch failed') ||
          error instanceof SyntaxError;

        if (error.status === 429 || (error.message && error.message.includes('429'))) {
          console.error(`[AICodeReviewEngine] Global rate limit (429) hit. Aborting code review for this rule to prevent nested retry floods.`);
          break;
        }

        if (isTimeoutOrRateLimit && attempt < maxContextLengths.length) {
          console.warn(`[AICodeReviewEngine] Attempt ${attempt} failed (Error: ${error.message}). Retrying with reduced context (${maxContextLengths[attempt]} chars)...`);
          continue; // Retry loop
        }

        // If it's a completely different error, or we exhausted all retries, break and return failure
        break;
      }
    }

    console.error(`[AICodeReviewEngine] Failed to evaluate after ${attempt} attempts:`, lastError);
    throw new Error(`AI Code Review service failed: ${lastError?.message || lastError || "Unknown error"}`);
  }

  /**
   * Language-agnostic file relevance scoring.
   * Supports: C#, Java, Python, Dart/Flutter, JS/TS, Go, Rust, C/C++, Kotlin, PHP, Ruby.
   */
  private selectRelevantFiles(files: ProjectSourceSnapshot['files'], semanticDescription: string): ProjectSourceSnapshot['files'] {
    const keywords = semanticDescription.toLowerCase().split(/\W+/).filter(w => w.length > 3);

    // Detect project language from file extensions
    const language = this.detectProjectLanguage(files);

    const scoredFiles = files.map(f => {
      let score = 0;
      const filePath = f.relativePath.toLowerCase();
      const content = f.content.toLowerCase();

      // 1. Exact keyword matches in path are highly relevant
      keywords.forEach(k => {
        if (filePath.includes(k)) score += 50;
        if (content.includes(k)) score += 2;
      });

      // 2. Language-specific structural file scoring
      const langPatterns = LANGUAGE_SCORING[language] || [];
      for (const lp of langPatterns) {
        if (filePath.includes(lp.pattern.toLowerCase())) {
          score += lp.score;
        }
      }

      // 3. Universal high-value patterns (cross-language)
      if (filePath.includes('controller') || filePath.includes('handler')) score += 12;
      if (filePath.includes('service')) score += 10;
      if (filePath.includes('repository') || filePath.includes('repo')) score += 10;
      if (filePath.includes('model') || filePath.includes('entity')) score += 8;
      if (filePath.includes('view') || filePath.includes('screen') || filePath.includes('page')) score += 6;

      // 4. Penalize non-source statics (universal)
      const skipPatterns = ['node_modules', '.git', 'bin/', 'obj/', 'build/', '__pycache__', '.gradle', 'wwwroot'];
      if (skipPatterns.some(sp => filePath.includes(sp))) score -= 200;

      const staticExts = ['.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.lock'];
      if (staticExts.some(ext => filePath.endsWith(ext))) score -= 100;

      // Allow config/manifest files but with lower priority
      const configExts = ['.json', '.xml', '.yaml', '.yml', '.toml', '.properties'];
      const isConfig = configExts.some(ext => filePath.endsWith(ext));
      const isManifest = ['pubspec.yaml', 'pom.xml', 'build.gradle', 'package.json', '.csproj', 'cargo.toml', 'go.mod', 'requirements.txt']
        .some(m => filePath.endsWith(m.toLowerCase()));
      if (isConfig && !isManifest) score -= 20;

      return { file: f, score };
    });

    // Only keep files with score > 0, sort by score descending
    const relevant = scoredFiles.filter(sf => sf.score > 0).sort((a, b) => b.score - a.score);
    return relevant.map(sf => sf.file);
  }

  /**
   * Detect the primary language of the project from file extensions.
   */
  private detectProjectLanguage(files: ProjectSourceSnapshot['files']): string {
    const extCount: Record<string, number> = {};
    for (const f of files) {
      const ext = '.' + f.relativePath.split('.').pop()?.toLowerCase();
      extCount[ext] = (extCount[ext] || 0) + 1;
    }

    // Priority-ordered language detection
    if (files.some(f => f.relativePath.endsWith('.dart'))) return 'dart';
    if (files.some(f => f.relativePath.endsWith('.cs') || f.relativePath.endsWith('.csproj'))) return 'csharp';
    if (files.some(f => f.relativePath.endsWith('.java'))) return 'java';
    if (files.some(f => f.relativePath.endsWith('.kt'))) return 'kotlin';
    if (files.some(f => f.relativePath.endsWith('.py'))) return 'python';
    if (files.some(f => f.relativePath.endsWith('.go'))) return 'golang';
    if (files.some(f => f.relativePath.endsWith('.rs'))) return 'rust';
    if (files.some(f => f.relativePath.endsWith('.rb'))) return 'ruby';
    if (files.some(f => f.relativePath.endsWith('.php'))) return 'php';
    if (files.some(f => f.relativePath.endsWith('.tsx') || f.relativePath.endsWith('.ts'))) return 'typescript';
    if (files.some(f => f.relativePath.endsWith('.jsx') || f.relativePath.endsWith('.js'))) return 'javascript';
    if (files.some(f => f.relativePath.endsWith('.cpp') || f.relativePath.endsWith('.c'))) return 'cpp';
    return 'unknown';
  }
}

