// @ts-nocheck
import { IAiProvider, ParsedBlueprint, ParsedRequirement } from '../../core/contracts/IAiProvider';
// import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { config } from '../../config';
import { AiClientManager } from './AiClientManager';
import * as crypto from 'crypto';

export class GeminiAiProvider implements IAiProvider {
    constructor() {
        // Handled by AiClientManager
    }


      public async parseRequirementsAsync(prompt: string): Promise<ParsedBlueprint> {
        const systemPrompt = `You are an expert software architect and academic grader at FPT University.

Extract ALL grading criteria from this assignment document — every concrete, testable requirement a student must implement OR answer to earn marks.

════════════════════════════════════════
STEP 0 — CRITICAL RULES
════════════════════════════════════════
1. NEVER SKIP ANY PART. If the document has PART A through PART H, you MUST extract requirements from ALL PARTS. Missing even one PART is a CRITICAL FAILURE.
2. Count the PARTS in the document FIRST, then verify your output covers ALL of them.
3. If a grader CANNOT verify it by running, inspecting, or reading the student's submission → discard.
4. EXCEPTION: You MUST KEEP all requirements regarding Data Models, Properties, APIs, Architecture, Database, UI features, written answers, debugging tasks, and code review tasks.
5. DO NOT FRAGMENT REQUIREMENTS: You MUST preserve the exact grouping and structure of the original document. DO NOT split features into tiny micro-requirements (like separating image, name, price).
6. FEATURE-BASED GROUPING RULE (CRITICAL): DO NOT split UI and Logic into separate micro-requirements. If a feature (like "Display In-Stock Products", "Skeleton Loading", "Pull-to-refresh", "Product Search") involves BOTH visual UI components AND underlying logic, you MUST group them into a SINGLE requirement (e.g., "Implement Product Search functionality including UI and Logic"). Splitting them causes system timeouts and ruins the grading context. Treat a feature as a complete End-to-End delivery.
7. THEORY/WRITTEN QUESTION GROUPING (CRITICAL): If a single PART contains multiple written/theory questions (e.g., 5 questions about Architecture, or 5 questions about AI Usage), DO NOT create separate micro-requirements for each question. You MUST GROUP ALL written questions within the SAME PART into a SINGLE requirement. The \`description\` must list all the sub-questions, and the \`marks\` must be the SUM of their points.

════════════════════════════════════════
STEP 1 — EXTRACT GRADING GROUPS & MARKS
════════════════════════════════════════
Extract the EXACT points mentioned in the document. Map each PART to a grading group.
CRITICAL SCORING RULE: If the teacher explicitly provides points (e.g. "15 POINTS", "20 POINTS"), extract them EXACTLY. If a part has sub-tasks, distribute the part's total points proportionally across sub-tasks.
If the document uses a 100-point scale, extract the raw points. The system will normalize to 10.0 later.
If NO points are mentioned anywhere, set "hasExplicitRubric" to false.

════════════════════════════════════════
STEP 2 — CLASSIFY EACH REQUIREMENT
════════════════════════════════════════
For EACH requirement, classify ALL of the following:

A) COMPLEXITY: "high", "medium", or "low".
B) COMPLEXITY REASON: 1 sentence justification.
C) IS UI VISIBLE: true ONLY if the requirement explicitly describes visual elements on screen (e.g. "Build a Product List screen", "Display product image"). Set false for written questions even if they mention UI concepts.
D) IS CRUD: boolean. True only for actual data manipulation operations.
E) IS WRITTEN ANSWER: true if the core deliverable is a written explanation, theoretical analysis, text report, or oral defense preparation. Do NOT set this to true if the primary deliverable is executable code.
F) IS ARCHITECTURE CODE: true if the core deliverable is the structural organization, file layering, or design pattern implementation within the source code itself. Do NOT set this to true for standard UI building, bug fixing, or functional logic.
G) IS DIAGRAM TASK: true if the core deliverable is a visual representation (e.g., UML, flowchart, architecture diagram).
H) IS SOFT DELETE: true if the task requires implementing a soft delete (logical deletion, hiding a record instead of physically dropping it from the database).
I) PART LABEL: The section of the exam this requirement belongs to (e.g. "PART A", "PART B", "PART D", "PART E").
J) PRESERVE KEYWORDS: You MUST PRESERVE all technical keywords, exact property names, HTTP methods, and exact rule logic in your description. DO NOT truncate technical details.
K) RECOMMENDED ENGINE REASON: First, briefly explain why a specific engine is needed based on the core deliverable. If the core deliverable is source code structure (like MVVM), explain that. If it's an image, explain that.
L) RECOMMENDED ENGINE: Based on the reason, output the exact engine name:
- "AiTextAnalysis": MUST be used for written essays, theory questions, text reports, or DIAGRAMS. CRITICAL: If IS WRITTEN ANSWER or IS DIAGRAM TASK is true, you MUST assign AiTextAnalysis.
- "AICodeReview": MUST be used for inspecting source code, architectural design patterns, invisible logic (e.g. offline storage, debouncing, state logic), or backend implementations.
- "AIVision": MUST be used ONLY for purely visual UI requirements. If a requirement includes ANY complex logic (e.g., offline storage, debounce, state logic, API integration) alongside UI, you MUST NOT use AIVision alone.
- "HybridVisionAndCode": MUST be used when a requirement contains BOTH visual UI features (that need screenshots) AND complex invisible logic (e.g., offline storage, debouncing, API integration, state management). This tells the system to evaluate BOTH the screenshot and the source code simultaneously.
- "HybridTextAndCode": MUST be used when a requirement asks for BOTH a written theory/essay answer AND an actual code implementation (e.g., "Design the architecture in code and explain your design choices in the document"). This tells the system to evaluate BOTH the written document and the source code simultaneously.
- "HTTPProbe": Use only if testing a REST API endpoint.

════════════════════════════════════════
MULTI-PART EXAM STRUCTURE
════════════════════════════════════════
University exams often have this structure:
- PART A: System Design (written answers + code architecture)
- PART B: MVP Building (code + UI screenshots)
- PART C: Change Requests (code + UI screenshots)  
- PART D: Advanced Features (code + UI + written answers)
- PART E: Debugging Challenge (written answer analyzing code)
- PART F: Code Review (written analysis of external project)
- PART G: AI Audit Report (written documentation)
- PART H: Oral Defense (written preparation)

You MUST create separate requirements for DIFFERENT TYPES of tasks:
1. Code/UI tasks (isUIVisible=true or isCRUD=true, isWrittenAnswer=false)
2. Written/essay tasks (isWrittenAnswer=true, isUIVisible=false)
Even within the SAME PART, if there is BOTH a coding task AND a written question, you MUST separate them. However, ALL coding tasks in that part should be grouped together into a SINGLE "Code Implementation" requirement, and ALL written questions in that part should be grouped together into a SINGLE "Written Analysis" requirement. DO NOT create more than 2 requirements per PART unless absolutely necessary.

════════════════════════════════════════
PROJECT TYPE CLASSIFICATION
════════════════════════════════════════
"projectType" values: "algorithm" | "web" | "desktop" | "mobile" | "unity"
- If the assignment mentions Flutter, Dart, Android, iOS → "mobile"
- If it mentions stdin/stdout algorithm problems → "algorithm"
- Only use "web" for HTTP APIs, REST services, or browser-based UIs.

════════════════════════════════════════
ALGORITHM PROJECTS SPECIAL RULE
════════════════════════════════════════
If projectType is "algorithm" and teacher did NOT provide explicit points:
Standardize to exactly TWO criteria: "Algorithmic Correctness (I/O)" and "Complexity & Architecture".

════════════════════════════════════════
OUTPUT FORMAT (JSON OBJECT)
════════════════════════════════════════
{
  "_planning": "Step-by-step reasoning. List ALL PARTS found. Show point distribution math.",
  "_partsCovered": ["PART A", "PART B", "PART C", "..."],
  "hasExplicitRubric": boolean,
  "projectType": "algorithm" | "web" | "desktop" | "mobile" | "unity",
  "language": "csharp" | "java" | "typescript" | "python" | "dart" | "other",
  "framework": "net8" | "spring" | "react" | "angular" | "flutter" | "wpf" | "maui" | "unity" | "other",
  "assignmentTitle": "string",
  "description": "2-3 sentence summary",
  "totalMarks": number | null,
  "gradingGroups": [
    { "id": "g1", "name": "PART A - System Design", "points": 15 }
  ],
  "requirements": [
    {
      "id": "req-1",
      "groupId": "g1",
      "partLabel": "PART A",
      "title": "Short title",
      "description": "Verifiable grading criterion with full technical details",
      "marks": 10,
      "complexity": "low" | "medium" | "high",
      "complexityReason": "string",
      "isUIVisible": boolean,
      "isCRUD": boolean,
      "isWrittenAnswer": boolean,
      "isArchitectureCode": boolean,
      "isDiagramTask": boolean,
      "isSoftDelete": boolean,
      "referenceAnswer": "string | null // Provide a short, factual model answer here ONLY IF recommendedEngine is AiTextAnalysis. This is what the student's answer will be compared against. If not a written answer, use null.",
      "recommendedEngineReason": "string",
      "recommendedEngine": "AICodeReview" | "AiTextAnalysis" | "AIVision" | "HTTPProbe" | "HybridVisionAndCode" | "HybridTextAndCode",
      "crudOperations": []
    }
  ]
}`;

        const fullPrompt = `${systemPrompt}\n\nDocument Text:\n${prompt}`;

        // Debug: Log prompt stats
        console.log(`[GeminiAiProvider] parseRequirementsAsync - systemPrompt: ${systemPrompt.length} chars, userPrompt: ${prompt.length} chars, total: ${(systemPrompt.length + prompt.length)} chars`);
        
        // Check for problematic content in prompt
        const hasNullBytes = prompt.includes('\0');
        const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(prompt);
        if (hasNullBytes || hasInvalidChars) {
            console.warn(`[GeminiAiProvider] WARNING: Prompt contains problematic characters! nullBytes=${hasNullBytes}, invalidChars=${hasInvalidChars}`);
        }

        let attempt = 0;
        const maxRetries = 2;
        while (attempt <= maxRetries) {
            try {
                let response: any;
                response = await AiClientManager.executeWithFallback(async (client, model) => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 120000);
                    try {
                        return await Promise.race([
                            client.chat.completions.create({
                                model: model,
                                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
                                temperature: 0
                            }, { signal: controller.signal as any }),
                            new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 120000))
                        ]);
                    } finally {
                        clearTimeout(timeoutId);
                    }
                });

                let jsonText = response.choices[0].message.content || "{}";
                jsonText = jsonText.replace(/^```json\s*/gi, '').replace(/^```\s*/g, '').replace(/```$/g, '').trim();
                let blueprint = JSON.parse(jsonText) as ParsedBlueprint;

                // ═══════════════════════════════════════════════════════
                // CODE-LEVEL ALGORITHM DETECTION FALLBACK
                // ═══════════════════════════════════════════════════════
                // If the AI misclassifies an algorithm problem as "backend" (e.g., because
                // the teacher mentioned "Node.js"), we detect it here using keyword analysis
                // on the ORIGINAL prompt text and forcefully correct the projectType.
                if (blueprint.projectType !== "algorithm") {
                    const lowerPrompt = prompt.toLowerCase();
                    const algoSignals = [
                        // I/O patterns
                        /\bstdin\b/, /\bstdout\b/, /\bstandard input\b/, /\bstandard output\b/,
                        /\bread.*input\b/, /\bprint.*output\b/, /\bconsole.*input\b/,
                        // Classic algorithm names
                        /\btwo sum\b/, /\bthree sum\b/, /\bfibonacci\b/, /\bprime\b/,
                        /\bpalindrome\b/, /\banagram\b/, /\bsubstring\b/, /\bsubarray\b/,
                        /\bknapsack\b/, /\blongest common\b/, /\bshortest path\b/,
                        // Data structures & techniques
                        /\blinked list\b/, /\bbinary tree\b/, /\bgraph\b/, /\bheap\b/, /\bstack\b/, /\bqueue\b/,
                        /\bsort(ing)?\b/, /\bbinary search\b/, /\bbfs\b/, /\bdfs\b/,
                        /\bdynamic programming\b/, /\bhash\s*map\b/, /\bhash\s*table\b/,
                        /\bgreedy\b/, /\brecursion\b/, /\bbacktracking\b/, /\bdivide and conquer\b/,
                        // Complexity analysis
                        /\bo\(n\)/, /\bo\(n\^2\)/, /\bo\(log\s*n\)/, /\bo\(n\s*log\s*n\)/,
                        /\btime complexity\b/, /\bspace complexity\b/,
                        // Vietnamese patterns
                        /đọc input/, /in ra màn hình/, /nhập.*từ bàn phím/, /xuất.*kết quả/
                    ];
                    const matchCount = algoSignals.filter(rx => rx.test(lowerPrompt)).length;
                    if (matchCount >= 2) {
                        console.log(`[GeminiAiProvider] Algorithm detection override: ${matchCount} signals found. Reclassifying from "${blueprint.projectType}" to "algorithm".`);
                        blueprint.projectType = "algorithm" as any;
                    }
                }

                // ═══════════════════════════════════════════════════════
                // DETERMINISTIC MATH DISTRIBUTION (SENIOR SOLUTION)
                // ═══════════════════════════════════════════════════════
                // We ONLY compute "pointsPerReq" for requirements that DO NOT already have explicit marks.
                // If the AI successfully extracted explicit marks, we preserve them to respect the teacher's exact grading scheme.
                if (blueprint.gradingGroups && blueprint.gradingGroups.length > 0) {
                    let totalComputed = 0;
                    for (const group of blueprint.gradingGroups) {
                        const reqsInGroup = blueprint.requirements.filter(r => r.groupId === group.id);
                        if (reqsInGroup.length === 0) continue;
                        
                        const reqsWithMarks = reqsInGroup.filter(r => typeof r.marks === 'number' && r.marks > 0);
                        const reqsWithoutMarks = reqsInGroup.filter(r => typeof r.marks !== 'number' || r.marks <= 0);
                        
                        const assignedPoints = reqsWithMarks.reduce((sum, r) => sum + (r.marks as number), 0);
                        
                        if (reqsWithoutMarks.length > 0) {
                            const remainingPoints = Math.max(0, group.points - assignedPoints);
                            
                            // Give each req a weight based on complexity
                            reqsWithoutMarks.forEach(r => {
                                (r as any)._weight = r.complexity === 'high' ? 3 : (r.complexity === 'low' ? 1 : 2);
                            });
                            const totalWeight = reqsWithoutMarks.reduce((sum, r) => sum + (r as any)._weight, 0);

                            // Base points (rounded to nearest 0.25)
                            let currentSum = 0;
                            reqsWithoutMarks.forEach(r => {
                                let exact = ((r as any)._weight / totalWeight) * remainingPoints;
                                let rounded = Math.round(exact * 4) / 4;
                                if (rounded === 0 && remainingPoints > 0) rounded = 0.25;
                                r.marks = rounded;
                                currentSum += rounded;
                            });

                            // Adjust to make sum EXACTLY equal to remainingPoints using 0.25 steps
                            let diff = remainingPoints - currentSum;
                            const step = 0.25;
                            let safetyCounter = 0;
                            
                            while (Math.abs(diff) > 0.01 && safetyCounter < 100) {
                                safetyCounter++;
                                if (diff > 0) {
                                    // Give 0.25 to the one with highest weight
                                    reqsWithoutMarks.sort((a, b) => (b as any)._weight - (a as any)._weight);
                                    (reqsWithoutMarks[0].marks as number) += step;
                                    diff -= step;
                                } else {
                                    // Take 0.25 from the one with lowest weight that has > 0.25
                                    reqsWithoutMarks.sort((a, b) => (a as any)._weight - (b as any)._weight);
                                    const target = reqsWithoutMarks.find(r => (r.marks as number) > step) || reqsWithoutMarks[0];
                                    (target.marks as number) -= step;
                                    diff += step;
                                }
                            }
                            
                            // Cleanup temp variable and round to 2 decimals to fix float math issues
                            reqsWithoutMarks.forEach(r => {
                                r.marks = Math.round((r.marks as number) * 100) / 100;
                                delete (r as any)._weight;
                            });
                        }
                        
                        // Re-sum to prevent AI rounding errors on the group total
                        const actualGroupPoints = reqsInGroup.reduce((sum, r) => sum + (r.marks as number), 0);
                        group.points = actualGroupPoints;
                        totalComputed += actualGroupPoints;
                    }
                    blueprint.totalMarks = totalComputed;
                }
                
                // ═══════════════════════════════════════════════════════
                // DETERMINISTIC ALGORITHM RUBRIC OVERRIDE (SENIOR SOLUTION)
                // ═══════════════════════════════════════════════════════
                // If this is an algorithm problem and the teacher did NOT provide explicit points,
                // we forcefully override the LLM's extraction to ensure EXACTLY 2 standard criteria.
                if (blueprint.projectType === "algorithm" && !(blueprint as any).hasExplicitRubric) {
                    blueprint.requirements = [
                        {
                            id: "req-algo-1",
                            groupId: "g1",
                            title: "Algorithmic Correctness (I/O)",
                            description: "Correctly implement the algorithmic logic, satisfying all input/output test cases.",
                            marks: 5,
                            complexity: "high",
                            complexityReason: "Core algorithmic logic",
                            isUIVisible: false,
                            isCRUD: false,
                            isWrittenAnswer: false,
                            isArchitectureCode: false,
                            isDiagramTask: false,
                            isSoftDelete: false
                        },
                        {
                            id: "req-algo-2",
                            groupId: "g1",
                            partLabel: "PART A",
                            title: "Complexity & Architecture",
                            description: "Adhere to specific time/space complexity constraints (e.g. O(n), Hash Map) if specified.",
                            marks: 5,
                            complexity: "medium",
                            complexityReason: "Algorithmic efficiency",
                            isUIVisible: false,
                            isCRUD: false,
                            isWrittenAnswer: false,
                            isArchitectureCode: true,
                            isDiagramTask: false,
                            isSoftDelete: false
                        }
                    ];
                    blueprint.totalMarks = 10;
                    blueprint.gradingGroups = [{ id: "g1", name: "Standard Algorithm Grading", points: 10 }];
                }

                return blueprint;
            } catch (error) {
                console.error(`[GeminiAiProvider] Error on attempt ${attempt + 1}:`, error);
                attempt++;
                if (attempt > maxRetries) {
                    throw new Error(`Failed to parse requirements after ${maxRetries} retries: ${(error as Error).message}`);
                }
            }
        }
        throw new Error('Unexpected error in parseRequirementsAsync');
    }

    public async generateFeedbackAsync(context: string, payload: any): Promise<string> {
        const prompt = `Review the following code or result context:\n${context}\n\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nProvide constructive feedback.`;
        const response = await AiClientManager.executeWithFallback(async (client, model) => {
            return await client.chat.completions.create({
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: config.ai.temperature
            });
        });
        return response.choices[0].message.content || "";
    }

    /**
     * Additional specific method for generating detailed RubricRules from requirements.
     */
    public async generateRubricRulesAsync(requirements: ParsedRequirement[], projectType: string, assignmentDescription?: string): Promise<any[]> {
        const rules: any[] = [];
        const pt = projectType.toLowerCase();
        const isWebProject = ["web", "backend", "frontend", "fullstack", "aspnet", "nodejs", "java", "php", "golang", "blazor"].includes(pt);

        // 1. Determine strategies deterministically
        const strategyMap = new Map<string, string>();
        let hasStdInOutProbe = false;
        
        for (const req of requirements) {
            let strategy = "AICodeReview";
            if (req.isWrittenAnswer) {
                // Written answers: will be overridden to AiTextAnalysis by applyScoringStrategies
                strategy = "AICodeReview";
            } else if (req.isUIVisible) {
                // Mobile and web projects with visual UI → AIVision (screenshots from device/emulator)
                strategy = ["web", "frontend", "fullstack", "blazor", "aspnet", "nodejs", "mobile", "flutter"].some(t => pt.includes(t)) ? "AIVision" : "AICodeReview";
            } else if (req.isCRUD) {
                strategy = isWebProject ? "HTTPProbe" : "AICodeReview";
            } else if (pt === "algorithm") {
                const isArchitectural = /hash|map|o\(n\)|complexity|time|space|loop|format/i.test(req.title) || /hash|map|o\(n\)|complexity|time|space|loop|format/i.test(req.description);
                if (!isArchitectural && !hasStdInOutProbe) {
                    strategy = "StdInOutProbe";
                    hasStdInOutProbe = true;
                } else {
                    strategy = "AICodeReview";
                }
            }
            strategyMap.set(req.id, strategy);
        }

        // 2. Fetch Probe Configs from AI if needed
        const probeReqs = requirements.filter(r => strategyMap.get(r.id) === "HTTPProbe" || strategyMap.get(r.id) === "StdInOutProbe" || strategyMap.get(r.id) === "AIVision");
        let probeConfigs: Record<string, any> = {};

        // ═══════════════════════════════════════════════════════
        // CODE-LEVEL TEST CASE EXTRACTION (BYPASS AI)
        // ═══════════════════════════════════════════════════════
        // For algorithm projects, attempt to extract I/O examples directly from
        // the assignment description HTML. This ensures 100% synchronization
        // between the examples shown in Màn 1 and the test cases in Màn 2.
        const stdioReqs = probeReqs.filter(r => strategyMap.get(r.id) === "StdInOutProbe");
        const httpReqs = probeReqs.filter(r => strategyMap.get(r.id) === "HTTPProbe");
        let extractedExamples: { input: string; output: string }[] = [];

        if (stdioReqs.length > 0 && assignmentDescription) {
            extractedExamples = this.extractExamplesFromDescription(assignmentDescription);
            if (extractedExamples.length > 0) {
                console.log(`[GeminiAiProvider] Extracted ${extractedExamples.length} test cases from assignment description (bypassing AI).`);
                for (const req of stdioReqs) {
                    probeConfigs[req.id] = {
                        type: "stdio",
                        config: {
                            description: "Test cases extracted from assignment examples",
                            testCases: extractedExamples.map((ex, i) => ({
                                id: `t${i + 1}`,
                                input: ex.input,
                                expectedOutput: ex.output,
                                timeoutMs: 5000
                            }))
                        }
                    };
                }
            }
        }

        // Only call AI for probes that weren't resolved by extraction
        const unresolvedProbeReqs = probeReqs.filter(r => !probeConfigs[r.id]);

        if (unresolvedProbeReqs.length > 0) {
            let systemPrompt = `You are a testing engineer. Generate test payloads for the following requirements.
OUTPUT A STRICT JSON OBJECT mapping requirement ID to its test configuration.

For HTTPProbe (REST APIs), generate:
{
  "req-id": {
    "type": "http",
    "config": {
      "description": "string",
      "steps": [
        {
          "stepId": "s1", "method": "POST", "pathTemplate": "/api/entity", "body": {}, "expectedStatus": 201,
          "assertions": [{ "jsonPath": "$.name", "assertType": "equals", "value": "test" }]
        }
      ]
    }
  }
}
* Infer realistic paths based on the requirement description.
* CRITICAL SEQUENCE (MANDATORY): You MUST ALWAYS sequence mutating requests (POST, PUT) BEFORE read/delete requests (GET, DELETE) within the "steps" array. This ensures the database has data before you assert it is notEmpty.
* SAFE ASSERTIONS (CRITICAL): If the exact JSON schema/property names are NOT explicitly defined in the assignment description, DO NOT invent them (e.g., guessing 'title' instead of 'name'). In the absence of a strict schema, rely ONLY on HTTP status codes (e.g., 201 Created, 200 OK) or safe generic assertions (e.g., '$.id notEmpty').
* If exact property names ARE explicitly mentioned, you MUST use them EXACTLY as written. DO NOT use synonyms.
* Ensure soft-delete checks use HTTP GET assertions.

For StdInOutProbe (Algorithms), generate test cases functioning strictly as an Automated Competitive Programming Judge.
{
  "req-id": {
    "type": "stdio",
    "config": {
      "description": "string",
      "javascriptSolver": "function solve(input) { ... return output; }",
      "testCases": [
        { 
          "id": "t1", 
          "input": "...", 
          "expectedOutput": "...", 
          "timeoutMs": 5000 
        }
      ]
    }
  }
}
* SYSTEMIC RULES FOR ALGORITHM JUDGE:
1. EXACT QUANTITY: You MUST generate EXACTLY 3 test cases for EVERY algorithm requirement.
2. CONTEXT AWARENESS: You are generating test cases for the ENTIRE algorithmic problem described below. Even if the specific requirement is narrowly focused on 'Input Reading' or 'Format', your test cases MUST represent full, valid inputs and outputs for the CORE algorithmic problem. Do NOT generate dummy strings like 'line1' unless explicitly requested.
3. PURE RAW DATA AND STRICT FORMAT ALIGNMENT (CRITICAL): Your 'input' MUST perfectly match the EXACT line-by-line format requested in the problem description.
   - If the description says "Line 1 contains N and K separated by a space", you MUST format the input as exactly "5 8\\n1 2 3 4 5". DO NOT put N and K on separate lines.
   - Use '\\n' for newlines. DO NOT add any extra text or labels like "Input:" or "Output:".
   - Your 'expectedOutput' MUST be the pure computational answer (e.g., "0 1" or "-1").
4. NO CHAT, NO STATUS: 'expectedOutput' MUST be the pure computational answer. NEVER invent status messages like "Input processed successfully" or describe complexity like "O(n)".
5. STRICT ALIGNMENT: Ensure the generated input and expectedOutput perfectly align with the required formatting in the problem description (e.g., correct number of lines, space separations, and fallback outputs like '-1').
6. DATA CONSISTENCY: If the input requires an integer N followed by N elements, you MUST ensure that the number of elements generated EXACTLY matches N.
7. EXTRACTING EXAMPLES: If the ORIGINAL ASSIGNMENT DESCRIPTION contains EXAMPLES, you MUST extract these examples to use as your 3 test cases. However, you MUST STILL LEAVE 'expectedOutput' EMPTY ("") and rely on the 'javascriptSolver'.
8. REFERENCE SOLUTION EXECUTION (ABSOLUTE MANDATE): NO MATTER WHAT, you MUST ALWAYS leave 'expectedOutput' empty ("") for ALL test cases. You MUST ALWAYS write a flawless algorithmic solver in JavaScript and put it in the 'javascriptSolver' field. The system will NEVER trust your expectedOutput strings and will ALWAYS execute your JavaScript code with your 'input' to compute the 100% correct 'expectedOutput'.
   - Your 'javascriptSolver' MUST be a single pure function named 'solve' that takes exactly one string parameter ('input') and returns exactly one string (the output).
   - EXTREMELY IMPORTANT: Your solver MUST flawlessly parse the EXACT input format you generated. Use 'input.trim().split("\\n")' and split lines carefully based on the problem description. Example: "function solve(input) { const lines = input.trim().split('\\n'); const [N, K] = lines[0].trim().split(' ').map(Number); const arr = lines[1].trim().split(' ').map(Number); ... return ans.toString(); }"

For AIVision (UI Web), generate:
{
  "req-id": {
    "type": "browser",
    "config": {
      "description": "Navigate to the specific page for this requirement",
      "path": "/login"
    }
  }
}
* CRITICAL: Infer the likely relative URL path (e.g., /, /admin, /dashboard, /users) for the feature described in the requirement.

OUTPUT JSON ONLY. NO MARKDOWN FENCES.`;

            if (assignmentDescription) {
                systemPrompt += `\n\n--- ORIGINAL ASSIGNMENT DESCRIPTION ---\n${assignmentDescription}\n---------------------------------------`;
            }
            
            const prompt = `Requirements to configure:\n${JSON.stringify(unresolvedProbeReqs, null, 2)}`;
            try {
                const response = await AiClientManager.executeWithFallback(async (client, model) => {
                    return await client.chat.completions.create({
                        model: model,
                        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
                        temperature: 0
                    });
                });
                const text = (response.choices[0].message.content || "{}").replace(/^```json\s*/gi, '').replace(/^```\s*/g, '').replace(/```$/g, '').trim();
                probeConfigs = { ...probeConfigs, ...JSON.parse(text) };
            } catch (err) {
                console.error("[GeminiAiProvider] Failed to generate probe configs", err);
            }
        }

        // 3. Construct Rules Deterministically
        for (const req of requirements) {
            const strategy = strategyMap.get(req.id) || "AICodeReview";
            let evidenceType = "ai.code.reviewed";
            if (strategy === "AIVision") evidenceType = "browser.screenshot.captured";
            if (strategy === "HTTPProbe") evidenceType = "runtime.http.probed";
            if (strategy === "StdInOutProbe") evidenceType = "runtime.stdio.probed";
            if (strategy === "Boolean") evidenceType = "static.code.analyzed";

            // Intelligent category assignment
            let category = req.isUIVisible ? "UI/UX" : (req.isCRUD ? "Functional" : "Architecture");
            if (req.isWrittenAnswer) {
                const text = (req.title + " " + req.description).toLowerCase();
                if (/debug|bug|fix|error/i.test(text)) category = "Functional";
                else if (/review|analysis|strength|weakness|improvement|scalab|maintain|test/i.test(text)) category = "Architecture";
                else if (/audit|report|document|usage/i.test(text)) category = "Architecture";
                else if (/oral|defense|question|prepare/i.test(text)) category = "Architecture";
                else category = "Theory";
            }

            const rule: any = {
                id: req.id,
                title: req.title,
                description: req.description,
                category: category,
                tags: req.isCRUD ? ["api", ...(req.crudOperations || [])] : (req.isUIVisible ? ["ui"] : []),
                weight: req.marks || 0,
                scoringStrategy: strategy,
                requiredEvidence: [
                    {
                        evidenceType: evidenceType,
                        minimumConfidence: 0.8,
                        semanticDescription: req.description
                    }
                ]
            };

            const probeCfg = probeConfigs[req.id];
            if (strategy === "HTTPProbe" && probeCfg?.type === "http") {
                rule.requiredEvidence[0].httpProbe = probeCfg.config;
            } else if (strategy === "StdInOutProbe" && probeCfg?.type === "stdio") {
                const config = probeCfg.config;
                // AI-Driven Reference Solution Execution
                if (config.javascriptSolver && config.testCases) {
                    try {
                        console.log(`[GeminiAiProvider] Executing AI Reference Solution for req ${req.id}...`);
                        const solveFn = new Function('input', config.javascriptSolver + '\nreturn solve(input);');
                        for (const tc of config.testCases) {
                            // FORCE EXECUTION: We never trust the AI's math. Always overwrite.
                            const computedOutput = solveFn(tc.input);
                            tc.expectedOutput = String(computedOutput).trim();
                            console.log(`[GeminiAiProvider] Computed output for input: ${tc.input.replace(/\\n/g, ' ')} -> ${tc.expectedOutput}`);
                        }
                    } catch (e) {
                        console.error(`[GeminiAiProvider] Failed to execute AI javascriptSolver for req ${req.id}:`, e);
                    }
                }
                rule.requiredEvidence[0].stdInOutProbe = config;
            } else if (strategy === "AIVision" && probeCfg?.type === "browser") {
                rule.requiredEvidence[0].browserProbe = probeCfg.config;
            }

            rules.push(rule);
        }

        return rules;
    }

    /**
     * Generates a comprehensive markdown assignment document from a short prompt.
     */
    public async generateAssignmentContentAsync(prompt: string): Promise<string> {
        // const model = this.genAi.getGenerativeModel({ 
        //     model: config.gemini.model,
        //     generationConfig: {
        //         temperature: 0.8
        //     }
        // });

        const systemPrompt = `You are a strict, professional Computer Science Professor.
The user will give you a short topic or idea for a programming assignment.
Your task is to generate a highly concise Assignment Document in pure HTML format.

RULES:
1. Include a clear Title (<h1>), Project Description, Technical Requirements, and Expected Behavior.
2. Be CONCRETE and SPECIFIC. List exactly what features need to be built using <ul> and <li>.
3. DO NOT include generic fluff or boilerplate advice. ABSOLUTELY NO sentences like:
   - "The system should demonstrate proper error handling..."
   - "Make sure to write clean, maintainable code..."
   - "Separation of concerns should be evident..."
   - "Ensure appropriate HTTP status codes are returned..."
   If a requirement doesn't explicitly state a feature to build, DO NOT write it.
4. DO NOT wrap your response in \`\`\`html ... \`\`\` code blocks. Just return the raw HTML string. DO NOT USE MARKDOWN. NO ** NO ##.
5. Only include a "Scoring Rubric" section in the HTML if the Instructor EXPLICITLY provides points or grading percentages. If the Instructor's text does not contain specific numbers for grading, COMPLETELY OMIT the Scoring Rubric section.
6. Only output the HTML content (no <html>, <head>, or <body> tags, just the inner content).
7. EXAMPLES: ONLY if the Instructor's idea explicitly contains example inputs and outputs, format them nicely in an "Expected Behavior" section. If the Instructor's idea DOES NOT contain examples, DO NOT invent any examples and DO NOT write an Expected Behavior section.
8. LANGUAGE: ALWAYS write the generated HTML content entirely in ENGLISH, regardless of the language used in the Instructor Idea. Do NOT use Vietnamese or any other language in your output.`;

        const fullPrompt = `${systemPrompt}\n\nInstructor Idea:\n${prompt}`;

        try {
            // const result = await model.generateContent(fullPrompt);
            // let text = result.response.text();
            const response = await AiClientManager.executeWithFallback(async (client, model) => {
                return await client.chat.completions.create({
                    model: model,
                    messages: [{ role: "user", content: fullPrompt }],
                    temperature: 0.2
                });
            });
            let text = response.choices[0].message.content || "";

            // Strip HTML block fences if the AI still includes them
            text = text.replace(/^```html\s*/gi, '').replace(/^```\s*/g, '').replace(/```$/g, '').trim();
            // Strip verification comments (used only for AI chain-of-thought math)
            text = text.replace(/<!--[\s\S]*?-->/g, '').replace(/\n{3,}/g, '\n\n').trim();

            return text;
        } catch (error) {
            console.error(`[GeminiAiProvider] Failed to generate assignment content:`, error);
            throw new Error('AI Generation failed. Please try again.');
        }
    }

    /**
     * Evaluates multiple screenshots against a specific requirement.
     */
    public async evaluateImageAsync(imageBuffers: { buffer: Buffer, isMockup?: boolean }[], requirement: string, isHybrid: boolean = false): Promise<{ score: number; explanation: string, relevantImageIndices?: number[] }> {
        // const model = this.genAi.getGenerativeModel({ 
        //     model: config.gemini.model,
        //     generationConfig: {
        //         temperature: 0.1, // Low temperature for consistent grading
        //         responseMimeType: "application/json"
        //     }
        // });

        const systemPrompt = `You are an automated UI grading assistant.
Examine the provided screenshot. Does the screenshot satisfy this specific requirement?
Requirement: "${requirement}"

CRITICAL INSTRUCTION REGARDING EMPTY STATES:
The application is running in a sandbox environment where the database is completely empty (0 rows of data). 
If the requirement asks for a "List of items in a table", and you see a correctly structured table or grid with the expected column headers (e.g., Id, Name, Age), but there are NO data rows, you MUST award FULL points. 
Do NOT penalize the student for missing data rows.
Similarly, if the requirement asks for row-level buttons (like "Update" or "Delete" in each row), but the table is empty, you MUST award FULL points for the existence of the List view. Do NOT penalize the absence of row-level buttons if the table itself is empty.

CRITICAL INSTRUCTION REGARDING MOCKUPS AND IMAGE SEQUENCE:
You will be provided with one or more images. Some images may be teacher mockups, templates, or requirement descriptions.
TEACHER MOCKUPS TYPICALLY HAVE:
- Dotted or grid backgrounds (design canvas)
- Perfect, professional alignment
- Explanatory arrows, dimensions, or red warning text
- No device emulator frame (no Android/iOS status bar or window borders)
STUDENT SUBMISSIONS TYPICALLY HAVE:
- Device emulator frames (Android/iOS status bar, navigation bar)
- Web browser borders
- Realistic, sometimes imperfect alignment or data.

You MUST evaluate the STUDENT'S ACTUAL SUBMISSION. 
If the ONLY images provided are clearly TEACHER MOCKUPS or templates, you MUST REJECT them and give a score of 0.0. 
If there are multiple images, always pick the one that is clearly a student's actual running application.
If you reject due to only finding teacher mockups, your explanation MUST be: "Chỉ tìm thấy ảnh mẫu của giáo viên, không có ảnh chụp màn hình bài làm thực tế của sinh viên. Đánh giá 0 điểm."

CRITICAL INSTRUCTION REGARDING DATA LOGIC (FILTERING/SORTING/STATES):
If the requirement involves business logic applied to data (e.g., filtering out certain items, sorting, or specific data states), evaluate ONLY the visible data in the screenshot. If the data shown logically satisfies the condition, you MUST award FULL points. DO NOT demand or expect visible UI controls (like filter buttons, sort dropdowns, or toggle switches) unless the requirement explicitly mentions building such UI controls. Assume the logic is handled at the code/backend level.

CRITICAL INSTRUCTION REGARDING TRANSIENT UI STATES (LOADING/EMPTY/DEBOUNCE):
You MUST evaluate EXACTLY what is shown in the screenshot. If the requirement explicitly asks for a UI state (like Skeleton Loading, Empty State, or Error State) and it is NOT visible in ANY of the provided screenshots, you MUST deduct points proportionally. Do NOT assume they implemented it. Grading must be strict and based purely on visible visual evidence.

${isHybrid ? `CRITICAL INSTRUCTION REGARDING LOGIC-DRIVEN UI BEHAVIOR (HYBRID RULES):
This requirement involves complex business logic (e.g., filtering, sorting, toggling states). YOUR JOB IS STRICTLY TO VERIFY VISUAL DESIGN, NOT LOGICAL BEHAVIOR.
1. Component Existence: For EACH required UI component (e.g., toggle switch, warning label, search bar), if it visually exists in AT LEAST ONE image, consider that component's UI requirement satisfied.
2. State Transitions: DO NOT attempt to verify if components change state correctly across multiple images (e.g., verifying if a toggle actually removes a label when switched off). State transitions and business logic are evaluated separately by the Code Review Engine.
3. Screen Identification & Anchoring Bias: You MUST visually scan the ENTIRE image from top to bottom. DO NOT reject a screenshot by assuming it is the "wrong screen" just because you see extra UI elements (e.g., heart icons, extra buttons). VLM models often suffer from anchoring bias (e.g., seeing a heart icon and immediately assuming it's a "Favorites" screen, thus blinding themselves to the Search Bar at the top). You MUST NOT do this. Focus ONLY on whether the SPECIFIC components requested in this requirement are present anywhere in the image. If they are present, it IS the correct screen.
4. Scoring: If all requested UI components are visually present and match the design requirements, award a 1.0 (FULL POINTS). Do not deduct points for broken logic or incorrect data states, as long as the UI elements themselves are visible.` : ''}

Answer ONLY with valid JSON in the following format:
{
  "score": <0.0, 0.25, 0.5, 0.75, or 1.0>,
  "explanation": "Brief reasoning for why this score was given. CRITICAL: MUST BE IN VIETNAMESE.",
  "relevantImageIndices": [0]
}
where 1.0 means fully satisfied, 0.0 means not satisfied at all, and anything in between is partial credit. The score MUST be exactly 0.0, 0.25, 0.5, 0.75, or 1.0. 'relevantImageIndices' is an array of integers (e.g. [0, 1]) indicating WHICH of the provided images contain the evidence. You MUST NOT return all indices blindly. Select ONLY the top 1 to 3 MOST distinct and representative images that best prove the requirement.`;


        const messageContent: any[] = [{ type: "text", text: systemPrompt }];
        imageBuffers.forEach((img, index) => {
            if (img.isMockup) {
                messageContent.push({ type: "text", text: `Image ${index} [TEACHER MOCKUP - DO NOT EVALUATE]:` });
            } else {
                messageContent.push({ type: "text", text: `Image ${index} [STUDENT SUBMISSION]:` });
            }
            messageContent.push({
                type: "image_url",
                image_url: { 
                    url: `data:image/jpeg;base64,${img.buffer.toString("base64")}`,
                    detail: "low"
                }
            });
        });

        console.log(`[GeminiAiProvider] Sending ${imageBuffers.length} images to Vision AI (detail: low) for rule: ${requirement.substring(0, 50)}...`);
        
        let imageHashData = '';
        imageBuffers.forEach((img) => {
            imageHashData += img.buffer.length.toString() + (img.isMockup ? '1' : '0');
        });
        const cacheKey = "vis_" + crypto.createHash('sha256').update(systemPrompt + requirement + imageHashData).digest('hex');

        const startTime = Date.now();

        try {
            const response: any = await AiClientManager.executeWithFallback(async (client, model) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout
                try {
                    return await Promise.race([
                        client.chat.completions.create({
                            model: model,
                            messages: [
                                {
                                    role: "user",
                                    content: messageContent
                                }
                            ],
                            temperature: 0.0
                        }, {
                            signal: controller.signal as any,
                            maxRetries: 0   // Don't retry at all internally to prevent hanging
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 45000))
                    ]);
                } finally {
                    clearTimeout(timeoutId);
                }
            }, cacheKey);
            
            let text = response.choices[0].message.content?.trim() || "{}";

            text = text.replace(/^```json/g, "").replace(/```$/g, "").trim();
            const parsedResult = JSON.parse(text);
            
            console.log(`[GeminiAiProvider] Vision API returned in ${Date.now() - startTime}ms. Confidence: ${parsedResult.score}`);

            const score = parseFloat(parsedResult.score);
            if (isNaN(score)) return { score: 0.0, explanation: "Failed to parse score from AI.", relevantImageIndices: [0] };
            return {
                score: Math.max(0.0, Math.min(1.0, score)),
                explanation: parsedResult.explanation || "No explanation provided.",
                relevantImageIndices: Array.isArray(parsedResult.relevantImageIndices) ? parsedResult.relevantImageIndices : [parsedResult.relevantImageIndex || 0]
            };
        } catch (error: any) {
            console.error(`[GeminiAiProvider] Failed to evaluate image (outer):`, error.message || error);
            return { score: 0.0, explanation: `Hệ thống chấm điểm AI Vision gặp sự cố: ${error.message}` };
        }
    }

    // ═══════════════════════════════════════════════════════
    // DETERMINISTIC EXAMPLE EXTRACTOR (CODE-LEVEL, NO AI)
    // ═══════════════════════════════════════════════════════
    // Parses Input/Output example blocks from the assignment description HTML.
    // This ensures test cases are IDENTICAL to the examples shown to students.
    private extractExamplesFromDescription(description: string): { input: string; output: string }[] {
        const examples: { input: string; output: string }[] = [];
        
        // Strip HTML tags but preserve whitespace structure
        const text = description
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?(p|div|li|pre|code|h[1-6]|ul|ol|tr|td|th)[^>]*>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .replace(/&#?\w+;/g, '');
        
        // Restrict search area to the examples section to avoid matching "input" in technical requirements
        let searchArea = text;
        const examplesSectionMatch = text.match(/expected behavior|example inputs and outputs|examples?|test cases?/i);
        if (examplesSectionMatch && examplesSectionMatch.index !== undefined) {
            searchArea = text.substring(examplesSectionMatch.index);
        }
        
        // Strategy 1: Find "Input:" / "Output:" blocks  
        // Matches patterns like:
        //   Input:\n  5\n  1 2 3 4 5\n  9\n  Output:\n  0 1
        const ioPattern = /(?:input|input example)[:\s]*\n([\s\S]*?)(?:output|expected output)[:\s]*\n([\s\S]*?)(?=(?:input|input example)[:\s]*\n|$)/gi;
        let match;
        
        while ((match = ioPattern.exec(searchArea)) !== null) {
            const rawInput = match[1].trim();
            const rawOutput = match[2].trim();
            
            if (rawInput && rawOutput) {
                // Clean each line: trim whitespace, join with \n
                const inputLines = rawInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                const outputLines = rawOutput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                
                if (inputLines.length > 0 && outputLines.length > 0) {
                    examples.push({
                        input: inputLines.join('\n'),
                        output: outputLines.join('\n')
                    });
                }
            }
        }
        
        if (examples.length > 0) {
            console.log(`[GeminiAiProvider] extractExamplesFromDescription: Found ${examples.length} examples via Input/Output pattern.`);
            return examples;
        }
        
        // Strategy 2: Find "In:" / "Out:" shorthand blocks
        const shortPattern = /(?:^|\n)\s*In:\s*([\s\S]*?)(?:^|\n)\s*Out:\s*([\s\S]*?)(?=(?:^|\n)\s*In:|$)/gim;
        while ((match = shortPattern.exec(searchArea)) !== null) {
            const inputLines = match[1].trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const outputLines = match[2].trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (inputLines.length > 0 && outputLines.length > 0) {
                examples.push({
                    input: inputLines.join('\n'),
                    output: outputLines.join('\n')
                });
            }
        }
        
        if (examples.length > 0) {
            console.log(`[GeminiAiProvider] extractExamplesFromDescription: Found ${examples.length} examples via In/Out pattern.`);
        }
        
        return examples;
    }
}

