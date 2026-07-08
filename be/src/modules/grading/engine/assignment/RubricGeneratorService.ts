// @ts-nocheck
import { DraftBlueprint } from './BlueprintService';
import { RubricDefinition } from '../core/domain/rubric/RubricDefinition';
import { RubricRule } from '../core/domain/rubric/RubricRule';
import { IAiProvider, ParsedRequirement } from '../core/contracts/IAiProvider';

export class RubricGeneratorService {
    constructor(private readonly aiProvider: IAiProvider) {}

    /**
     * Generates a concrete RubricDefinition from a Blueprint.
     * 
     * ARCHITECTURE NOTE:
     * - The AI generates rule titles, descriptions, and categories.
     * - Weight assignment and scoringStrategy are computed DETERMINISTICALLY 
     *   in this service, NOT by the AI. This eliminates the problem of LLMs
     *   assigning identical weights or ignoring isUIVisible flags.
     */
    public async generateRubricAsync(blueprint: DraftBlueprint): Promise<RubricDefinition> {
        console.log(`[RubricGeneratorService] Generating Rubric for ${blueprint.id}...`);

        let rules: RubricRule[] = [];
        const requirements: ParsedRequirement[] = blueprint.requirements;
        const projectType = (blueprint as any).projectType || "unknown";

        try {
            rules = await this.aiProvider.generateRubricRulesAsync(requirements, projectType, (blueprint as any).originalContent || blueprint.description);
        } catch (error) {
            console.error('[RubricGeneratorService] AI Rule generation failed, falling back to basic rules.', error);
            rules = requirements.map((req: any, i) => ({
                id: `rule-${i}`,
                title: req.title || `Requirement ${i + 1}`,
                description: req.description || JSON.stringify(req),
                category: 'Functional',
                weight: 10,
                scoringStrategy: 'AICodeReview',
                requiredEvidence: []
            }));
        }

        // ═══════════════════════════════════════════════════════
        // DETERMINISTIC POST-PROCESSING — Override AI decisions
        // ═══════════════════════════════════════════════════════

        // 1. Force scoringStrategy based on isUIVisible from parsed requirements
        const fullContext = (blueprint.assignmentTitle + " " + blueprint.description + " " + requirements.map(r => r.title + " " + r.description).join(" "));
        rules = this.applyScoringStrategies(rules, requirements, projectType, fullContext);

        // 2. Compute weights deterministically from marks + complexity
        rules = this.computeWeights(rules, requirements);

        return {
            id: `rubric-${Date.now()}`,
            assignmentId: blueprint.id,
            version: blueprint.version,
            title: blueprint.assignmentTitle + ' Rubric',
            totalWeight: Math.round(rules.reduce((sum, r) => sum + r.weight, 0) * 100) / 100,
            passThreshold: 0.7,
            rules
        };
    }

    /**
     * Deterministically sets scoringStrategy based on requirement characteristics.
     * 
     * Priority order:
     * 0. isWrittenAnswer = true → AiTextAnalysis (student answers in .docx)
     * 1. isUIVisible = true  → AIVision (Playwright screenshot + Gemini Vision)
     * 2. isCRUD = true + AI generated HTTPProbe steps → PRESERVE HTTPProbe
     * 3. isCRUD = true but no HTTPProbe steps → AICodeReview fallback
     * 4. Structural/architectural → AICodeReview (flexible, not Boolean/Roslyn)
     * 5. Everything else → preserve AI decision (AICodeReview)
     */
    private applyScoringStrategies(rules: RubricRule[], requirements: ParsedRequirement[], projectType: string, fullContext?: string): RubricRule[] {
        const isHttpProbeAvailable = ["web", "backend", "frontend", "fullstack", "aspnet", "nodejs", "java", "php", "golang", "blazor"].some(pt => projectType.toLowerCase().includes(pt));
        
        // Intelligent Architecture Classification
        const contextText = (fullContext || "").toLowerCase();
        const isRestApi = contextText.includes("api") || contextText.includes("rest") || contextText.includes("swagger") || contextText.includes("endpoint");
        const isServerUI = contextText.includes("blazor") || contextText.includes("mvc") || contextText.includes("giao diện") || contextText.includes("interface") || contextText.includes("razor") || contextText.includes("html");

        // If it's explicitly a Server UI and NOT explicitly an API, we block HTTP Probe for CRUD
        const allowHttpProbe = isHttpProbeAvailable && (!isServerUI || isRestApi);

        return rules.map((rule, index) => {
            const req = requirements[index];
            if (!req) return rule;

            const textToCheck = (req.title + " " + req.description).toLowerCase();

            // ═══════════════════════════════════════════════════════
            // LLM-DIRECTED ROUTING (NEW INTELLIGENT SYSTEM)
            // ═══════════════════════════════════════════════════════
            
            // Safety override: If the requirement is clearly asking to answer questions, explain, or describe, force it to AiTextAnalysis.
            if (/^(explain|answer|describe|why|how|what|list|analyze)\b/i.test(req.title) || (/explain|describe|answer/i.test(textToCheck) && !/implement|build|create|add|display|show|design architecture/i.test(textToCheck))) {
                req.recommendedEngine = 'AiTextAnalysis';
                req.isWrittenAnswer = true;
            }

            // Safety override: If the requirement is clearly asking to implement code architecture patterns,
            // force it to AICodeReview, because LLM might confuse it with written design questions.
            if (/pattern|mvvm|mvc|clean architecture|repository|bloc/i.test(textToCheck) && !/explain|draw|analyze|list/i.test(textToCheck)) {
                req.recommendedEngine = 'AICodeReview';
                req.isArchitectureCode = true;
            }

            // Check if LLM explicitly requested AICodeReview for structural/pattern tasks
            if (req.recommendedEngine === 'AICodeReview' || (!req.recommendedEngine && req.isArchitectureCode && !req.isCRUD)) {
                // Determine if this is truly an architecture task or a generic logic task
                const isArchTask = req.isArchitectureCode || /architect|mvvm|mvc|clean|repository|layer/i.test(textToCheck);
                
                return {
                    ...rule,
                    category: isArchTask ? 'Architecture' as any : 'Functional' as any,
                    scoringStrategy: 'AICodeReview',
                    contextHint: req.partLabel || rule.contextHint || undefined,
                    requiredEvidence: [{
                        evidenceType: 'ai.code.reviewed' as any,
                        minimumConfidence: 0.85,
                        semanticDescription: isArchTask 
                            ? `Evaluate the project architecture. The student may use ANY architecture pattern (e.g., MVC, MVVM, Clean Architecture, Repository Pattern) or follow the requested design. Verify that there is a clear separation of concerns with distinct layers. Do NOT penalize for minor naming differences as long as the structural intent is correct.`
                            : rule.description
                    }]
                };
            }

            // Check if LLM explicitly requested AiTextAnalysis or HybridTextAndCode
            if (req.recommendedEngine === 'AiTextAnalysis' || req.recommendedEngine === 'HybridTextAndCode' || (!req.recommendedEngine && (req.isDiagramTask || req.isWrittenAnswer))) {
                let category: string = 'Theory';
                if (/debug|bug|fix|error/i.test(textToCheck)) category = 'Functional';
                if (/architect|design|pattern|mvvm|clean/i.test(textToCheck)) category = 'Architecture';
                if (/review|analysis|strength|weakness|improvement/i.test(textToCheck)) category = 'Architecture';

                return {
                    ...rule,
                    category: category as any,
                    scoringStrategy: 'AiTextAnalysis',
                    isHybrid: req.recommendedEngine === 'HybridTextAndCode',
                    contextHint: req.partLabel || undefined,
                    referenceAnswer: req.referenceAnswer || "Học sinh cần trả lời đúng trọng tâm câu hỏi. Đánh giá dựa trên sự hiểu biết và giải thích hợp lý.",
                    requiredEvidence: [{
                        evidenceType: 'ai.text.analyzed' as any,
                        minimumConfidence: 0.7,
                        semanticDescription: rule.description,
                    }]
                } as any;
            }

            // Check if LLM explicitly requested AIVision for UI tasks
            if (req.recommendedEngine === 'AIVision' || req.recommendedEngine === 'HybridVisionAndCode') {
                return {
                    ...rule,
                    scoringStrategy: 'AIVision',
                    isHybrid: req.recommendedEngine === 'HybridVisionAndCode',
                    contextHint: req.partLabel || rule.contextHint || undefined,
                    requiredEvidence: [{
                        evidenceType: 'browser.screenshot.captured' as any,
                        minimumConfidence: 0.9,
                    }]
                } as any;
            }

            // Special Case 1: Soft Delete
            if (req.isSoftDelete === true) {
                if (allowHttpProbe) {
                    const match = req.title.match(/(?:delete|remove)\s+([a-zA-Z]+)/i);
                    const entityName = match ? match[1].toLowerCase() : "item";
                    
                    return {
                        ...rule,
                        scoringStrategy: 'HTTPProbe',
                        requiredEvidence: [{
                            evidenceType: 'runtime.http.probed' as any,
                            minimumConfidence: 0.9,
                            httpProbe: {
                                description: `Multi-step probe to verify soft delete for ${entityName}`,
                                steps: [
                                    {
                                        stepId: "s1",
                                        method: "POST",
                                        pathTemplate: `/api/${entityName}s`,
                                        expectedStatus: 201,
                                        body: { name: `Test ${entityName}`, price: 100, stockQuantity: 10, category: "Test", isAvailable: true },
                                        captureFromResponse: { variable: "id", jsonPath: "$.id" },
                                        assertions: []
                                    },
                                    {
                                        stepId: "s2",
                                        method: "DELETE",
                                        pathTemplate: `/api/${entityName}s/{id}`,
                                        expectedStatus: 204,
                                        body: {},
                                        captureFromResponse: {},
                                        assertions: []
                                    },
                                    {
                                        stepId: "s3",
                                        method: "GET",
                                        pathTemplate: `/api/${entityName}s/{id}`,
                                        expectedStatus: 200,
                                        body: {},
                                        captureFromResponse: {},
                                        assertions: [
                                            { jsonPath: "$.isAvailable", assertType: "equals", value: false }
                                        ]
                                    },
                                    {
                                        stepId: "s4",
                                        method: "GET",
                                        pathTemplate: `/api/${entityName}s`,
                                        expectedStatus: 200,
                                        body: {},
                                        captureFromResponse: {},
                                        assertions: [
                                            { jsonPath: "$[?(@.id == {id})]", assertType: "notExists" }
                                        ]
                                    }
                                ]
                            }
                        }]
                    };
                } else {
                    return {
                        ...rule,
                        scoringStrategy: 'AICodeReview',
                        requiredEvidence: [{
                            evidenceType: 'ai.code.reviewed' as any,
                            minimumConfidence: 0.9,
                            semanticDescription: `Inspect the code for soft delete logic. Ensure the entity is NOT removed from the database, but rather its isActive or isAvailable property is set to false, and changes are saved.`
                        }]
                    };
                }
            }


            // Special Case 2: Architectural overrides for STRICT named patterns with exact keywords
            // (e.g., exam says "You MUST use Repository Pattern" — not "you may use any")
            if (req.isCRUD !== true && !req.isArchitectureCode) {
                if (["repository pattern", "repository"].some(kw => textToCheck.includes(kw)) && /must|required|bắt buộc/i.test(textToCheck)) {
                    return {
                        ...rule,
                        scoringStrategy: 'AICodeReview',
                        requiredEvidence: [{ 
                            evidenceType: 'ai.code.reviewed' as any, 
                            minimumConfidence: 0.9,
                            semanticDescription: `STRICT REQUIREMENT: Verify that the code explicitly implements the Repository Pattern. Look for interfaces and classes named *Repository that abstract data access.` 
                        }]
                    } as any;
                }
                const hasDI = textToCheck.includes("dependency injection") || /\bdi\b/.test(textToCheck);
                if (hasDI && /must|required|bắt buộc/i.test(textToCheck)) {
                    return {
                        ...rule,
                        scoringStrategy: 'AICodeReview',
                        requiredEvidence: [{ 
                            evidenceType: 'ai.code.reviewed' as any, 
                            minimumConfidence: 0.9,
                            semanticDescription: `STRICT REQUIREMENT: Verify that the code explicitly uses Dependency Injection. Look for constructor injection and services registered in a DI container.` 
                        }]
                    } as any;
                }
            }

            // Special Case 3: CRUD operations in Server UI (No API) -> Force AICodeReview
            // This must happen BEFORE Priority 1 (isUIVisible) so that Update/Delete aren't assigned AIVision (which fails on empty tables).
            if (req.isCRUD === true && !allowHttpProbe) {
                return {
                    ...rule,
                    scoringStrategy: 'AICodeReview',
                    requiredEvidence: [{
                        evidenceType: 'ai.code.reviewed' as any,
                        minimumConfidence: 0.85,
                        semanticDescription: rule.description,
                    }]
                };
            }

            // Priority 1: UI-visible → AIVision vs AICodeReview
            if (req.isUIVisible === true) {
                // If it already has AIVision from GeminiAiProvider, preserve it
                if (rule.scoringStrategy === 'AIVision') {
                    return rule;
                }
                // If it asks for integration, APIs, or fetch, use AICodeReview to inspect the frontend source code.
                if (["integration", "tích hợp", "api", "fetch", "ajax", "kết nối"].some(kw => textToCheck.includes(kw))) {
                    return {
                        ...rule,
                        scoringStrategy: 'AICodeReview',
                        requiredEvidence: [{
                            evidenceType: 'ai.code.reviewed' as any,
                            minimumConfidence: 0.9,
                            semanticDescription: `Inspect the frontend source code (e.g. index.html, app.js). Verify that it makes network calls (e.g. fetch, XMLHttpRequest) to the backend API to fulfill this requirement.`
                        }]
                    };
                }
                
                // Otherwise, use AIVision for layout and visual structure
                return {
                    ...rule,
                    scoringStrategy: 'AIVision',
                    requiredEvidence: [{
                        evidenceType: 'browser.screenshot.captured' as any,
                        minimumConfidence: 0.9,
                    }]
                };
            }

            // Priority 2: CRUD + AI generated valid HTTPProbe steps → PRESERVE IF ALLOWED
            if (req.isCRUD === true && rule.scoringStrategy === 'HTTPProbe'
                && rule.requiredEvidence?.some((e: any) => e.httpProbe?.steps?.length > 0)) {
                if (allowHttpProbe) return rule;
            }

            // Priority 3: CRUD but no valid HTTPProbe steps → AICodeReview
            if (req.isCRUD === true) {
                return {
                    ...rule,
                    scoringStrategy: 'AICodeReview',
                    requiredEvidence: [{
                        evidenceType: 'ai.code.reviewed' as any,
                        minimumConfidence: 0.85,
                        semanticDescription: rule.description,
                    }]
                };
            }

            // Priority 4: AI assigned StdInOutProbe for algorithm → preserve if has test cases
            if (rule.scoringStrategy === 'StdInOutProbe'
                && rule.requiredEvidence?.some((e: any) => e.stdInOutProbe?.testCases?.length > 0)) {
                return rule;
            }

            // Priority 5: AI assigned AICodeReview for complex logic → preserve
            if (rule.scoringStrategy === 'AICodeReview') {
                return rule;
            }

            // Priority 6: Fallback to AICodeReview for anything else to avoid overly strict structural rules
            return {
                ...rule,
                scoringStrategy: 'AICodeReview',
                requiredEvidence: rule.requiredEvidence?.length > 0
                    ? rule.requiredEvidence
                    : [{ 
                        evidenceType: 'ai.code.reviewed' as any, 
                        minimumConfidence: 0.85,
                        semanticDescription: rule.description 
                      }]
            };
        }) as RubricRule[];
    }

    private computeWeights(rules: RubricRule[], requirements: ParsedRequirement[]): RubricRule[] {
        // Find if ANY requirement has explicit marks assigned by the AI
        const withMarks = requirements.filter(r => typeof r.marks === 'number' && r.marks > 0);
        const hasExplicitMarks = withMarks.length > 0;

        let computedRules: RubricRule[] = [];

        if (hasExplicitMarks) {
            // Case 1: User provided explicit marks. We MUST follow them.
            // If the AI missed assigning marks to some requirements but assigned to others, 
            // we should not overwrite the assigned ones, just give a default minimal weight (1) to the unassigned ones.
            computedRules = rules.map((rule, index) => {
                const req = requirements[index];
                let weight = req?.marks;
                
                if (weight === undefined || weight === null || weight <= 0) {
                    weight = 1; // Fallback for missed requirements to keep them strictly minimal
                }
                
                return { ...rule, weight: weight };
            });
        } else {
            // Case 2: No marks were provided anywhere in the prompt.
            // We self-evaluate based on complexity.
            const COMPLEXITY_WEIGHTS: Record<string, number> = { high: 3, medium: 2, low: 1 };
            
            computedRules = rules.map((rule, index) => {
                const req = requirements[index];
                
                let base = 2;
                let reasonBonus = 0;
                
                if (req) {
                    base = COMPLEXITY_WEIGHTS[req.complexity] || 2;
                    // Add up to 2 bonus points for complex multi-step rules
                    if (req.complexityReason) {
                        const steps = req.complexityReason.split(/[,;]/).length;
                        reasonBonus = steps > 2 ? 2 : (steps > 1 ? 1 : 0);
                    }
                }
                
                return { ...rule, weight: base + reasonBonus };
            });
        }

        // =========================================================
        // NORMALIZE TO EXACTLY 10.0 POINTS (ALWAYS, AS AITA USES 10-POINT SCALE)
        // =========================================================
        const currentTotal = computedRules.reduce((sum, r) => sum + r.weight, 0);
        
        if (currentTotal > 0 && Math.abs(currentTotal - 10.0) > 0.01) {
            // Scale to exactly 10.0 using 0.05 steps to meet standard academic rubric increments while preserving parent weights
            const scale = 10.0 / currentTotal;
            const step = 0.05;
            let currentSum = 0;
            
            computedRules.forEach(rule => {
                let exact = rule.weight * scale;
                let rounded = Math.round(exact / step) * step; 
                if (rounded <= 0) rounded = step; // Ensure no rule is 0 points
                rule.weight = rounded;
                currentSum += rounded;
            });

            // Adjust to make sum EXACTLY equal to 10.0
            let diff = 10.0 - currentSum;
            let safetyCounter = 0;

            while (Math.abs(diff) > 0.01 && safetyCounter < 1000) {
                safetyCounter++;
                if (diff > 0) {
                    // Give to the one with max weight
                    computedRules.sort((a, b) => b.weight - a.weight);
                    computedRules[0].weight += step;
                    diff -= step;
                } else {
                    // Take from the one with min weight that is > step
                    computedRules.sort((a, b) => a.weight - b.weight);
                    const target = computedRules.find(r => r.weight > step + 0.01) || computedRules[0];
                    if (target.weight > step) {
                        target.weight -= step;
                        diff += step;
                    } else {
                        break;
                    }
                }
            }

            // Cleanup float math issues to ensure strict 2 decimal precision (e.g. 10.000000000000002)
            computedRules.forEach(r => {
                r.weight = Math.round(r.weight * 100) / 100;
            });
        }

        return computedRules;
    }
}

