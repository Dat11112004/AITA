// @ts-nocheck
import { RubricDefinition } from '../../core/domain/rubric/RubricDefinition';
import { RubricRule } from '../../core/domain/rubric/RubricRule';
import { Evidence } from '../../core/domain/evidence/Evidence';
import { AssessmentReport, ScoredRule, RuleEvidence } from '../../core/domain/review/AssessmentReport';
import { IAiProvider } from '../../core/contracts/IAiProvider';
import { IArtifactStore } from '../../core/contracts/IArtifactStore';
import { HTTPProbeEngine } from './HTTPProbeEngine';
import { AICodeReviewEngine, ProjectSourceSnapshot } from './AICodeReviewEngine';
import { StdInOutProbeEngine } from './StdInOutProbeEngine';
import { SandboxHandle } from '../sandbox/ExecutionSandboxService';
import { UniversalStaticAnalyzer } from './UniversalStaticAnalyzer';
import { AiTextAnalysisEngine } from './AiTextAnalysisEngine';
import { ExtractedDocument } from '../../assignment/DocumentExtractor';
import { globalJobManager } from '../queue/SubmissionJobManager';

export interface EvaluationContext {
    sandbox: SandboxHandle;
    sourceSnapshot: ProjectSourceSnapshot;
    evidencePool: Evidence[];
    /** Path to extracted submission on disk (needed for StdInOutProbe) */
    submissionPath?: string;
    /** Extracted document for AiTextAnalysis (from Docx/PDF) */
    extractedDocument?: ExtractedDocument;
}

interface RuleScore {
    ruleId: string;
    passed: boolean;
    score: number;
    reason: string;
    evidence?: RuleEvidence;
    needsReview?: boolean;
}

export class RubricEvaluator {
    private httpProbe = new HTTPProbeEngine();
    private aiCodeReview = new AICodeReviewEngine();
    private stdInOutProbe = new StdInOutProbeEngine();
    private staticAnalyzer = new UniversalStaticAnalyzer();
    private textAnalysisEngine = new AiTextAnalysisEngine();

    constructor(
        private readonly aiProvider: IAiProvider,
        private readonly artifactStore: IArtifactStore
    ) { }

    public async evaluateAsync(
        submissionId: string,
        assignmentId: string,
        studentId: string,
        rubric: RubricDefinition,
        context: EvaluationContext,
        onProgress?: (current: number, total: number, message: string, meta?: any) => void
    ): Promise<AssessmentReport> {
        let totalScore = 0;
        const passedRules: ScoredRule[] = [];
        const failedRules: ScoredRule[] = [];
        const manualReviewNotes: string[] = [];
        let requiresManualReview = false;
        // Shared variables for test chaining across multiple HTTP Probe rules in this session
        const sharedVariables: Record<string, any> = {};

        // Fix legacy assignments where sum of weights > totalWeight
        const rawSum = rubric.rules.reduce((sum, r) => sum + (r.weight || 0), 0);
        if (Math.abs(rawSum - rubric.totalWeight) > 0.05 && rawSum > 0) {
            console.log(`[RubricEvaluator] Normalizing legacy weights. Sum: ${rawSum}, Expected: ${rubric.totalWeight}`);
            rubric.rules.forEach(r => {
                r.weight = Math.round((r.weight / rawSum) * rubric.totalWeight * 100) / 100;
            });
        }

        let currentRuleIndex = 0;
        const totalRules = rubric.rules.length;

        for (const rule of rubric.rules) {
            const job = globalJobManager.getJob(submissionId);
            if (job?.isCancelled) {
                throw new Error('Cancelled by user');
            }
            
            currentRuleIndex++;

            if (onProgress) {
                let hackerMeta: any = null;
                const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                const ruleKeywords = (rule.title + " " + (rule.contextHint || "")).toLowerCase().split(/\s+/).filter(w => w.length > 3);

                const isUI = rule.scoringStrategy === 'AIVision' || rule.category === 'UI';
                const isDoc = rule.scoringStrategy === 'AiTextAnalysis' || rule.category === 'Theory' || rule.category === 'Design';

                if ((isUI || isDoc) && context.extractedDocument) {
                    // Deep Scan Document Sections
                    const scoredSections = context.extractedDocument.sections.map(s => {
                        const sTitle = sanitize(s.title);
                        const sLabel = sanitize(s.partLabel);
                        const sContent = s.textContent.toLowerCase();

                        let score = 0;
                        for (const kw of ruleKeywords) {
                            if (sTitle.includes(kw)) score += 15;
                            if (sLabel.includes(kw)) score += 15;
                            const occurrences = sContent.split(kw).length - 1;
                            score += Math.min(occurrences, 10);
                        }

                        // Give slight bump to sections that actually contain images if this is a UI rule
                        if (isUI && s.images && s.images.length > 0) {
                            score += 5;
                        }

                        return { section: s, score };
                    });

                    scoredSections.sort((a, b) => b.score - a.score);

                    // Pick best section ONLY IF it scored > 0, otherwise we don't confidently know the section yet.
                    let bestSection = scoredSections[0].score > 0 ? scoredSections[0].section : null;

                    if (!bestSection) {
                        bestSection = context.extractedDocument.sections[currentRuleIndex % context.extractedDocument.sections.length];
                    }

                    if (isUI) {
                        let images = bestSection?.images?.filter((img: any) => !img.isMockup) || [];
                        
                        if (scoredSections[0].score > 0 && images.length > 0) {
                            // Take the first image of the confidently matched section
                            const img = images[0];
                            const base64 = `data:${img.contentType};base64,${img.buffer.toString('base64')}`;
                            hackerMeta = { evidence: { screenshotBase64: base64 } };
                        } else {
                            // If no matching section or no images, show the rule description as a snippet
                            // This prevents LiveActivityLog from freezing on the previous rule's image!
                            hackerMeta = { evidence: { snippets: [{ codeSnippet: `// Đang tìm kiếm bằng chứng UI...\n// Tiêu chí: ${rule.title}\n\n${rule.description}` }] } };
                        }
                    } else {
                        // Document Rule
                        const docText = bestSection.title + "\n" + bestSection.textContent;
                        hackerMeta = { evidence: { snippets: [{ codeSnippet: docText.substring(0, 4000) }] } };
                    }
                } else if (context.sourceSnapshot && context.sourceSnapshot.files && context.sourceSnapshot.files.length > 0) {
                    // Code Rule: Exact Content Deep Scanning
                    // Calculate a relevance score for each file based on keyword matches in content and path
                    const scoredFiles = context.sourceSnapshot.files.map(f => {
                        const pathLower = f.relativePath.toLowerCase();
                        const contentLower = f.content.toLowerCase();
                        let score = 0;
                        for (const kw of ruleKeywords) {
                            if (pathLower.includes(kw)) score += 10; // Path matches are highly relevant
                            // Count occurrences safely without regex
                            const occurrences = contentLower.split(kw).length - 1;
                            score += Math.min(occurrences, 20); // Cap content matches to prevent huge files from dominating
                        }
                        return { file: f, score };
                    });

                    // Sort by highest score
                    scoredFiles.sort((a, b) => b.score - a.score);

                    // Pick the best file (or fallback if no keywords matched)
                    let bestFile = scoredFiles[0].file;
                    if (scoredFiles[0].score === 0) {
                        bestFile = context.sourceSnapshot.files[currentRuleIndex % context.sourceSnapshot.files.length];
                    }

                    const combinedCode = `// ${bestFile.relativePath}\n${bestFile.content}`;
                    hackerMeta = { evidence: { snippets: [{ codeSnippet: combinedCode.substring(0, 5000) }] } };
                }

                // Send currentRuleIndex - 1 so % only increases AFTER completion of previous tasks
                onProgress(currentRuleIndex - 1, totalRules, `Đang phân tích: ${rule.title}`, hackerMeta);
            }

            const ruleResult = await this.evaluateRuleAsync(rule, context, sharedVariables);

            if (ruleResult.needsReview) {
                requiresManualReview = true;
                manualReviewNotes.push(`Rule '${rule.title}' requires manual review: ${ruleResult.reason}`);
                continue;
            }

            // Senior Safety Net: Prevent NaN from contaminating the total score
            if (isNaN(ruleResult.score) || ruleResult.score === null || ruleResult.score === undefined) {
                ruleResult.score = 0;
            }

            // Academic Rounding: Round to nearest 0.05 step to eliminate weird values like 0.19 or 0.13
            // Valid partial scores for 0.25 max weight will be: 0.05, 0.15, 0.20, 0.25
            const SCORE_STEP = 0.05;
            ruleResult.score = Math.round(ruleResult.score / SCORE_STEP) * SCORE_STEP;

            // Prevent rounding up from exceeding the max weight
            if (ruleResult.score > rule.weight) {
                ruleResult.score = rule.weight;
            }

            // Fix floating point precision issues (e.g. 0.15000000000000002)
            ruleResult.score = Math.round(ruleResult.score * 100) / 100;

            totalScore += ruleResult.score;

            const scoredRule: ScoredRule = {
                ruleId: rule.id,
                title: rule.title,
                description: rule.description,
                weight: rule.weight,
                earnedScore: ruleResult.score,
                passed: ruleResult.passed,
                evidenceIds: [],
                evidence: ruleResult.evidence || {},
                details: ruleResult.reason
            };

            // Enhance evidence with DOCX extracted images ONLY if not already provided by AIVision
            if (context.extractedDocument && scoredRule.evidence && !scoredRule.evidence.screenshotBase64) {
                // Theory/Code Review rules should NOT extract random images even if they mention 'UI'.
                // Only explicitly UI/UX category or Vision-based rules should show fallback images.
                const isUI = rule.category === ('UI/UX' as any) || rule.scoringStrategy === 'AIVision';
                if (isUI) {
                    const sanitize = (str: string) => str.toLowerCase().replace(/[\s_]/g, '');
                    const hint = rule.contextHint ? sanitize(rule.contextHint) : sanitize(rule.title);

                    const getKeywords = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 3);
                    const ruleKeywords = getKeywords(rule.title + " " + (rule.contextHint || ""));

                    const matchingSections = context.extractedDocument.sections.filter((s, index, arr) => {
                        const pLabel = sanitize(s.partLabel);
                        const sTitle = sanitize(s.title);
                        if (pLabel.includes(hint) || hint.includes(pLabel) || sTitle.includes(hint) || hint.includes(sTitle)) return true;

                        let combinedText = s.title + " " + s.textContent;
                        // Include context from the immediately preceding section to bridge Question (PART D) and Answer (Task D1)
                        if (index > 0) {
                            combinedText += " " + arr[index - 1].title + " " + arr[index - 1].textContent;
                        }

                        const sectionKeywords = getKeywords(combinedText);
                        let matches = 0;
                        for (const kw of ruleKeywords) {
                            if (sectionKeywords.includes(kw)) matches++;
                        }
                        return ruleKeywords.length > 0 && matches >= (ruleKeywords.length * 0.6);
                    });

                    // Take all matching images up to 10 (we no longer slice from the end, we extract everything including mockups so the UI displays the full context)
                    const matchingImages = matchingSections.flatMap(s => s.images || []).slice(0, 10);

                    if (matchingImages.length > 0 && scoredRule.evidence) {
                        scoredRule.evidence.extractedImages = matchingImages.map(img => ({
                            label: img.label,
                            contentType: img.contentType,
                            base64: img.buffer.toString('base64')
                        }));
                    }
                }
            }

            if (ruleResult.passed) {
                passedRules.push(scoredRule);
            } else {
                failedRules.push(scoredRule);
            }
        }

        totalScore = Math.round(totalScore * 100) / 100;

        // Senior Safety Net: Cap score at total weight in case of legacy corrupted assignments
        if (totalScore > rubric.totalWeight) {
            totalScore = rubric.totalWeight;
        }

        const isPass = !requiresManualReview && (totalScore / rubric.totalWeight) >= rubric.passThreshold;

        return {
            submissionId,
            assignmentId,
            studentId,
            totalScore,
            maxPossibleScore: rubric.totalWeight,
            isPass,
            passedRules,
            failedRules,
            manualReviewNotes: requiresManualReview ? manualReviewNotes : undefined,
            auditMetadata: {
                evaluatorVersion: '3.0.0',
                timestamp: new Date().toISOString(),
                auditLogIds: []
            }
        };
    }

    private async evaluateRuleAsync(rule: RubricRule, context: EvaluationContext, sharedVariables: Record<string, any> = {}): Promise<RuleScore> {
        try {
            switch (rule.scoringStrategy as string) {
                case "AIVision": {
                    const ruleText = (rule.title + " " + (rule.description || "")).toLowerCase();
                    
                    // Get ALL screenshots from the pool (captured by Playwright's universal route discovery)
                    const screenshotEvidences = context.evidencePool.filter(e => e.type === 'browser.screenshot.captured');

                    // Fetch all image buffers
                    const imageBuffers: { buffer: Buffer, contentType: string, isMockup?: boolean, sectionIndex?: number }[] = [];
                    for (const ev of screenshotEvidences) {
                        if (ev.payload?.artifactId) {
                            const buffer = await this.artifactStore.getArtifactAsync(ev.payload.artifactId);
                            if (buffer) imageBuffers.push({ buffer, contentType: 'image/png', isMockup: false }); // Playwright defaults to PNG
                        }
                    }

                    // If no Playwright screenshots (e.g. Mobile project), fallback to DOCX extracted images
                    let extractedImages: any[] = [];
                    if (imageBuffers.length === 0 && context.extractedDocument) {
                        const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const hint = rule.contextHint ? sanitize(rule.contextHint) : sanitize(rule.title);
                        const getKeywords = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 3);
                        const ruleKeywords = getKeywords(rule.title + " " + (rule.contextHint || ""));

                        const matchingIndices: number[] = [];
                        const matchScores: { index: number, matches: number }[] = [];
                        context.extractedDocument.sections.forEach((s, index, arr) => {
                            const pLabel = sanitize(s.partLabel);
                            const sTitle = sanitize(s.title);

                            // 1. Direct match on identifiers
                            if (pLabel.includes(hint) || hint.includes(pLabel) || sTitle.includes(hint) || hint.includes(sTitle)) {
                                matchingIndices.push(index);
                                return;
                            }

                            // 2. Fuzzy match on text content (Widen sliding window to include next section)
                            let combinedText = s.title + " " + s.textContent;
                            if (index > 0) {
                                combinedText += " " + arr[index - 1].title + " " + arr[index - 1].textContent;
                            }
                            if (index < arr.length - 1) {
                                combinedText += " " + arr[index + 1].title + " " + arr[index + 1].textContent;
                            }

                            const sectionKeywords = getKeywords(combinedText);
                            let matches = 0;
                            for (const kw of ruleKeywords) {
                                if (sectionKeywords.includes(kw)) matches++;
                            }
                            
                            let studentImageCount = (s.images || []).filter(img => !img.isMockup).length;
                            if (index > 0) studentImageCount += (arr[index - 1].images || []).filter(img => !img.isMockup).length;
                            if (index < arr.length - 1) studentImageCount += (arr[index + 1].images || []).filter(img => !img.isMockup).length;
                            
                            let adjustedMatches = matches;
                            // Since this matching logic is purely for finding Evidence IMAGES to send to Gemini Vision,
                            // we heavily penalize text-only sections (like the teacher's exam prompt) to ensure 
                            // the algorithm anchors onto the student's actual answer section which contains their screenshots.
                            if (studentImageCount === 0) {
                                adjustedMatches = adjustedMatches * 0.1;
                            }

                            matchScores.push({ index, matches: adjustedMatches });
                            
                            // If more than 60% of keywords match AND it has images, consider it the correct section!
                            if (ruleKeywords.length > 0 && matches >= (ruleKeywords.length * 0.6) && studentImageCount > 0) {
                                matchingIndices.push(index);
                            }
                        });

                        // Fallback: If strict 60% threshold failed, find the section with the absolute highest keyword density (Relative Best Match)
                        if (matchingIndices.length === 0 && matchScores.length > 0) {
                            matchScores.sort((a, b) => b.matches - a.matches);
                            const bestMatch = matchScores[0];
                            // If it matches at least 15% of keywords OR at least 3 keywords, we consider it the best guess.
                            if (bestMatch.matches >= (ruleKeywords.length * 0.15) || bestMatch.matches >= 3) {
                                matchingIndices.push(bestMatch.index);
                                console.log(`[RubricEvaluator] Rule '${rule.title}' fell back to relative best match at section ${bestMatch.index} with ${bestMatch.matches} matches.`);
                            }
                        }

                        const expandedIndices = new Set<number>();
                        matchingIndices.forEach(idx => {
                            expandedIndices.add(idx);
                            // Expand up to 2 subsequent sections to capture subheadings containing images.
                            // We stop immediately if we hit a section that looks like a major new requirement heading.
                            for (let i = 1; i <= 2; i++) {
                                const nextIdx = idx + i;
                                if (nextIdx < context.extractedDocument!.sections.length) {
                                    const nextSection = context.extractedDocument!.sections[nextIdx];
                                    const nextPartLabel = (nextSection.partLabel || '').toLowerCase();
                                    
                                    // Stop expanding if the next section is a numbered major heading
                                    const isMajorHeading = /^(question|requirement|part|task|bài|câu)\s*[0-9]+/i.test(nextPartLabel) ||
                                                           /^[0-9]+[\.\)]\s*(question|requirement|part|task|bài|câu)/i.test(nextPartLabel);
                                    
                                    if (isMajorHeading) break;
                                    
                                    expandedIndices.add(nextIdx);
                                }
                            }
                        });
                        
                        const matchingSections = Array.from(expandedIndices).sort((a,b) => a-b).map(idx => context.extractedDocument!.sections[idx]);

                        extractedImages = matchingSections.flatMap((s, idx) => (s.images || []).map(img => ({ ...img, sectionIndex: idx })));

                        // If no hint matched, and it's definitely UI, just take all images except from DESCRIPTION or QUESTION sections
                        if (extractedImages.length === 0 && (rule.category?.toUpperCase().includes('UI') || rule.category?.toUpperCase().includes('UX'))) {
                            extractedImages = context.extractedDocument.sections
                                .map((s, idx) => ({ section: s, sectionIndex: idx }))
                                .filter(({section}) => {
                                    const lbl = (section.partLabel || '').toUpperCase();
                                    return !lbl.includes('DESCRIPTION') && !lbl.includes('QUESTION') && !lbl.includes('PROBLEM');
                                })
                                .flatMap(({section, sectionIndex}) => (section.images || []).map(img => ({ ...img, sectionIndex })));
                        }

                        // Prioritize student submissions (!isMockup) over teacher mockups
                        extractedImages.sort((a, b) => {
                            if (a.isMockup === b.isMockup) return 0;
                            return a.isMockup ? 1 : -1;
                        });

                        // Take up to 6 images (mockups included, they will be flagged and filtered by the AI prompt)
                        for (const img of extractedImages.slice(0, 6)) {
                            imageBuffers.push({ buffer: img.buffer, contentType: img.contentType, isMockup: img.isMockup, sectionIndex: img.sectionIndex });
                        }
                    }

                    if (imageBuffers.length === 0) {
                        console.log(`[RubricEvaluator] No screenshot for AIVision rule '${rule.title}'. Falling back to 100% AICodeReview.`);
                        return this.evaluateRuleAsync({ ...rule, scoringStrategy: "AICodeReview" }, context, sharedVariables);
                    }

                    // Determine if this is a HYBRID requirement (UI + Logic) based on LLM classification OR keyword fallback
                    const logicKeywords = ["logic", "offline", "storage", "debounce", "state", "sqlite", "hive", "sharedpreferences", "api", "integration", "network", "fetch", "ajax"];
                    const isHybrid = (rule as any).isHybrid === true || logicKeywords.some(kw => ruleText.includes(kw));

                    if (isHybrid) {
                        console.log(`[RubricEvaluator] Rule '${rule.title}' is HYBRID (UI + Logic). Executing AIVision + AICodeReview in parallel.`);
                    }

                    // --- 1. AIVision Execution ---
                    const visionPromise = (async () => {
                        const minConf = rule.requiredEvidence[0]?.minimumConfidence || 0.9;
                        const aiResult = await (this.aiProvider as any).evaluateImageAsync(imageBuffers.slice(0, 15), rule.description, isHybrid);
                        const aiScorePercentage = aiResult.score;
                        const relevantIndices = aiResult.relevantImageIndices || [0];
                        const primaryIndex = relevantIndices[0] ?? 0;
                        const primaryImage = imageBuffers[primaryIndex] || imageBuffers[0];
                        const primarySectionIndex = primaryImage?.sectionIndex;

                        const selectedImagesForUI = relevantIndices
                            .map((idx: number) => imageBuffers[idx])
                            .filter((img: any) => img); // Keep all images the AI deemed relevant, regardless of section index

                        const evaluatedStudentImages = selectedImagesForUI
                            .filter((img: any) => img && !img.isMockup)
                            .map((img: any) => ({
                                contentType: img.contentType,
                                base64: img.buffer.toString('base64')
                            }));

                        return { aiScorePercentage, aiResult, evaluatedStudentImages, minConf };
                    })();

                    // --- 2. AICodeReview Execution (If Hybrid) ---
                    const codePromise = (async () => {
                        if (isHybrid && context.sourceSnapshot) {
                            return await this.aiCodeReview.evaluateAsync(
                                context.sourceSnapshot,
                                `STRICT INSTRUCTION: This is a hybrid UI + Logic rule. Verify that the underlying logic (API integration, state management, offline storage, debouncing, etc.) is correctly implemented in the source code. YOU MUST EXTRACT AT LEAST ONE CODE SNIPPET (via relevantSnippets array) AS EVIDENCE TO PROVE YOUR CONCLUSION. \n\nRequirement: ${rule.description}`,
                                rule.title
                            );
                        }
                        return null;
                    })();

                    // --- Execute Parallel ---
                    const [visionOutput, codeResult] = await Promise.all([
                        visionPromise.catch(err => {
                            console.error(`[RubricEvaluator] Vision failed for ${rule.id}:`, err);
                            return null;
                        }),
                        codePromise.catch(err => {
                            console.warn(`[RubricEvaluator] Code Review failed for hybrid rule ${rule.id}:`, err);
                            return null;
                        })
                    ]);

                    // --- Combine Scores ---
                    let finalScore = 0;
                    let finalPassed = false;
                    let finalReason = "";
                    const evidencePayload: any = {};
                    
                    if (!visionOutput && !codeResult) {
                        return this.fail(rule, "Cả hai hệ thống AI Vision và AI Code Review đều gặp sự cố hoặc không có dữ liệu.");
                    }

                    if (isHybrid) {
                        // 50% Vision, 50% Code
                        let visionPct = 0;
                        let codePct = 0;

                        if (visionOutput) {
                            visionPct = visionOutput.aiScorePercentage;
                        }
                        if (codeResult) {
                            codePct = typeof codeResult.percentageComplete === 'number' ? codeResult.percentageComplete : (codeResult.passed ? 1.0 : 0.0);
                        }

                        let smartCompensationTriggered = false;
                        // SMART COMPENSATION ALGORITHM:
                        // Transient UI states (Loading, Debounce, Empty, Error) are notoriously difficult to capture in static screenshots.
                        // If the student provided the main UI (visionPct > 0) but the Code Review verifies that the underlying logic is highly complete,
                        // the system trusts the Code as the Ground Truth and forgives the missing visual evidence for those transient states.
                        if (visionPct > 0 && codePct > visionPct) {
                            console.log(`[RubricEvaluator] Smart Compensation triggered: Code (${codePct}) > UI (${visionPct}). Compensating UI score.`);
                            visionPct = codePct;
                            smartCompensationTriggered = true;
                        }

                        let visionScore = visionPct * (rule.weight * 0.5);
                        let codeScore = codePct * (rule.weight * 0.5);

                        if (visionOutput) {
                            evidencePayload.extractedImages = visionOutput.evaluatedStudentImages;
                            evidencePayload.visionExplanation = visionOutput.aiResult.explanation;
                        }

                        if (codeResult) {
                            evidencePayload.snippets = codeResult.relevantSnippets;
                            evidencePayload.codeExplanation = codeResult.reasoning;
                        }

                        finalScore = visionScore + codeScore;
                        finalPassed = finalScore >= (rule.weight * 0.7); // 70% threshold for hybrid
                        
                        // Only format the display strings to avoid mutating the actual mathematical score
                        const formatScore = (s: number) => parseFloat(s.toFixed(3));
                        
                        finalReason = `Phân tích Hybrid (50% UI, 50% Code). Điểm UI: ${formatScore(visionScore)}/${formatScore(rule.weight * 0.5)}, Điểm Code: ${formatScore(codeScore)}/${formatScore(rule.weight * 0.5)}.\n- Nhận xét UI: ${visionOutput?.aiResult?.explanation || 'Không có dữ liệu'}\n- Nhận xét Code: ${codeResult?.reasoning || 'Không có dữ liệu'}`;
                        
                        if (smartCompensationTriggered) {
                            finalReason += `\n\n💡 Bù trừ thông minh: Mặc dù ảnh chụp UI không thể hiện đầy đủ các trạng thái động (như Loading/Empty state), hệ thống phát hiện Mã nguồn (Code) đã triển khai phần logic tương ứng. Điểm UI được tự động bù trừ dựa trên Logic Code.`;
                        }

                        evidencePayload.hybridBreakdown = {
                            visionPct: visionPct,
                            codePct: codePct
                        };
                    } else {
                        // 100% Vision
                        if (!visionOutput) return this.fail(rule, "Lỗi phân tích hình ảnh.");
                        finalScore = Math.round((visionOutput.aiScorePercentage * rule.weight) * 100) / 100;
                        finalPassed = visionOutput.aiScorePercentage >= visionOutput.minConf;
                        finalReason = `Đánh giá Giao diện (Vision confidence: ${visionOutput.aiScorePercentage.toFixed(2)}): ${visionOutput.aiResult.explanation}`;
                        evidencePayload.extractedImages = visionOutput.evaluatedStudentImages;
                        evidencePayload.explanation = visionOutput.aiResult.explanation;
                    }

                    return {
                        ruleId: rule.id,
                        passed: finalPassed,
                        score: finalScore,
                        reason: finalReason,
                        evidence: evidencePayload
                    };
                }

                case "HTTPProbe": {
                    if (!context.sandbox?.isReady || !context.sandbox.baseUrl) {
                        // Silently fallback to AICodeReview for desktop/algorithm projects
                        console.log(`[RubricEvaluator] Sandbox not ready for HTTPProbe (Rule: ${rule.id}). Falling back to AICodeReview.`);
                        return this.evaluateRuleAsync({ ...rule, scoringStrategy: "AICodeReview" }, context, sharedVariables);
                    }

                    // ═══════════════════════════════════════════════════════
                    // 50/50 HYBRID SCORING: Test Results + Code Review
                    // ═══════════════════════════════════════════════════════

                    // --- PREPARE PARALLEL EXECUTION ---
                    // 1. HTTP Probe Promise (Runs steps sequentially to maintain shared variables state)
                    const probeExecutionPromise = (async () => {
                        const results = [];
                        for (const evidenceSpec of rule.requiredEvidence) {
                            if (evidenceSpec.httpProbe) {
                                const result = await this.httpProbe.evaluateAsync(
                                    context.sandbox!.baseUrl!,
                                    evidenceSpec.httpProbe as any,
                                    sharedVariables
                                );
                                results.push(result);
                            }
                        }
                        return results;
                    })();

                    // 2. AI Code Review Promise
                    const codeReviewPromise = (async () => {
                        if (context.sourceSnapshot) {
                            return await this.aiCodeReview.evaluateAsync(
                                context.sourceSnapshot,
                                rule.description,
                                rule.title
                            );
                        }
                        return null;
                    })();

                    // --- EXECUTE HYBRID ENGINE IN PARALLEL ---
                    const [probeResults, codeResult] = await Promise.all([
                        probeExecutionPromise,
                        codeReviewPromise.catch(err => {
                            console.warn(`[RubricEvaluator] AI Code Review failed for hybrid rule ${rule.id}:`, err);
                            return null;
                        })
                    ]);

                    // --- PROCESS HTTP PROBE RESULTS (50%) ---
                    let probeScore = 0;
                    let probeEvidence: any = {};
                    if (probeResults.length > 0) {
                        const avgConfidence = probeResults.reduce((s, r) => s + r.confidence, 0) / probeResults.length;
                        probeScore = avgConfidence * (rule.weight * 0.5); // 50% of weight
                        probeEvidence = {
                            httpSteps: probeResults.flatMap(r => r.stepResults.map(s => ({
                                method: s.method || "UNKNOWN",
                                url: s.url || "UNKNOWN",
                                status: s.httpStatus,
                                requestBody: s.requestBody,
                                responseBody: s.responseBody,
                                assertions: (s as any).assertions
                            })))
                        };
                    }

                    // --- PROCESS AI CODE REVIEW RESULTS (50%) ---
                    let codeScore = 0;
                    let codeEvidence: any = {};
                    if (codeResult) {
                        const pct = typeof codeResult.percentageComplete === 'number' ? codeResult.percentageComplete : (codeResult.passed ? 1.0 : 0.0);
                        codeScore = pct * (rule.weight * 0.5); // 50% of weight
                        codeEvidence = {
                            snippets: codeResult.relevantSnippets,
                            explanation: codeResult.reasoning
                        };
                    }

                    // --- COMBINE ---
                    const totalScore = Math.round((probeScore + codeScore) * 100) / 100;

                    return {
                        ruleId: rule.id,
                        passed: totalScore >= rule.weight * 0.7,
                        score: totalScore,
                        reason: codeEvidence.explanation || "Đã kiểm tra qua Test API và Source Code.",
                        evidence: {
                            ...probeEvidence,
                            ...codeEvidence,
                            hybridBreakdown: {
                                codePct: rule.weight > 0 ? (codeScore / (rule.weight * 0.5)) : 0,
                                probePct: rule.weight > 0 ? (probeScore / (rule.weight * 0.5)) : 0
                            }
                        }
                    };
                }


                case "AICodeReview": {
                    const spec = rule.requiredEvidence[0];
                    if (!context.sourceSnapshot) return this.fail(rule, "Source code not available");
                    const result = await this.aiCodeReview.evaluateAsync(
                        context.sourceSnapshot,
                        spec.semanticDescription || rule.description,
                        rule.title
                    );
                    // Use percentageComplete for proportional scoring
                    const pct = typeof result.percentageComplete === 'number'
                        ? result.percentageComplete
                        : (result.passed ? 1.0 : 0.0);
                    const score = Math.round(pct * rule.weight * 100) / 100;
                    return {
                        ruleId: rule.id,
                        passed: pct >= 0.9,
                        score: score,
                        reason: result.reasoning,
                        evidence: {
                            snippets: result.relevantSnippets,
                            codeSnippet: result.relevantSnippets?.[0]?.codeSnippet,
                            explanation: result.relevantSnippets?.[0]?.explanation,
                            filePath: result.relevantFiles?.join(", ")
                        }
                    };
                }

                case "UniversalStatic": {
                    if (!context.sourceSnapshot) return this.fail(rule, "Source code not available for static analysis");
                    if (!rule.staticPatterns || rule.staticPatterns.length === 0) return this.fail(rule, "No static patterns defined for rule");

                    // Map sourceSnapshot format to UniversalStaticAnalyzer format
                    const sourceFiles = context.sourceSnapshot.files.map(f => ({
                        relativePath: f.relativePath,
                        content: f.content
                    }));

                    const report = this.staticAnalyzer.analyze(sourceFiles, rule.staticPatterns as any);

                    // Simple scoring: percentage of passed patterns
                    const passedCount = report.passedPatterns.length;
                    const totalCount = rule.staticPatterns.length;
                    const scorePct = totalCount > 0 ? passedCount / totalCount : 0;

                    const evidenceSnippets = report.results
                        .filter(r => r.matches.length > 0)
                        .flatMap(r => r.matches.map(m => ({
                            codeSnippet: m.lineContent,
                            filePath: m.filePath,
                            explanation: `Found pattern: ${r.patternId}`
                        })));

                    return {
                        ruleId: rule.id,
                        passed: scorePct === 1.0, // Strictly require all patterns
                        score: Math.round((scorePct * rule.weight) * 100) / 100,
                        reason: report.summary,
                        evidence: {
                            snippets: evidenceSnippets.slice(0, 5) // Limit to top 5 snippets
                        }
                    };
                }

                case "AiTextAnalysis": {
                    if (!rule.referenceAnswer) return this.fail(rule, "No reference answer provided for AiTextAnalysis");

                    const isHybrid = (rule as any).isHybrid === true;

                    if (isHybrid) {
                        console.log(`[RubricEvaluator] Rule '${rule.title}' is HYBRID (Text + Code). Executing AiTextAnalysis + AICodeReview in parallel.`);
                    }

                    // --- 1. AiTextAnalysis Execution ---
                    const textPromise = (async () => {
                        let studentAnswer = "";

                        if (context.extractedDocument) {
                            const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const hint = rule.contextHint ? sanitize(rule.contextHint) : sanitize(rule.title);
                            
                            const getKeywords = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 3);
                            const ruleKeywords = getKeywords(rule.title + " " + (rule.contextHint || ""));

                            const matchingIndices: number[] = [];
                            context.extractedDocument.sections.forEach((s, index, arr) => {
                                const pLabel = sanitize(s.partLabel);
                                const sTitle = sanitize(s.title);
                                if (pLabel.includes(hint) || hint.includes(pLabel) || sTitle.includes(hint) || hint.includes(sTitle)) {
                                    matchingIndices.push(index);
                                    return;
                                }

                                let combinedText = s.title + " " + s.textContent;
                                if (index > 0) combinedText += " " + arr[index - 1].title + " " + arr[index - 1].textContent;
                                
                                const sectionKeywords = getKeywords(combinedText);
                                let matches = 0;
                                for (const kw of ruleKeywords) {
                                    if (sectionKeywords.includes(kw)) matches++;
                                }
                                if (ruleKeywords.length > 0 && matches >= (ruleKeywords.length * 0.6)) {
                                    matchingIndices.push(index);
                                }
                            });

                            const expandedIndices = new Set<number>();
                            matchingIndices.forEach(idx => {
                                expandedIndices.add(idx);
                                // Expand up to 15 subsequent sections to capture heavily fragmented answers (e.g., each bullet point is a heading)
                                // AI will naturally ignore irrelevant subsequent questions.
                                for (let i = 1; i <= 15; i++) {
                                    if (idx + i < context.extractedDocument!.sections.length) {
                                        expandedIndices.add(idx + i);
                                    }
                                }
                            });
                            
                            const matchingSections = Array.from(expandedIndices).sort((a,b) => a-b).map(idx => context.extractedDocument!.sections[idx]);

                            if (matchingSections.length > 0) {
                                studentAnswer = matchingSections.map(s => {
                                    let content = s.partLabel + ": " + s.title + "\n" + s.textContent;
                                    if (s.codeBlocks && s.codeBlocks.length > 0) {
                                        content += "\n" + s.codeBlocks.map(cb => `\`\`\`${cb.language}\n${cb.code}\n\`\`\``).join('\n');
                                    }
                                    return content;
                                }).join("\n\n");
                            } else {
                                studentAnswer = context.extractedDocument.rawText;
                                // Truncate to save tokens if we have to send the whole thing. Increased to 100,000 to prevent cutting off the end of long documents.
                                if (studentAnswer.length > 100000) studentAnswer = studentAnswer.substring(0, 100000) + "\n...[TRUNCATED]";
                            }
                        } else if (context.sourceSnapshot) {
                            const readme = context.sourceSnapshot.files.find(f => f.relativePath.toLowerCase().endsWith('readme.md'));
                            if (readme) {
                                studentAnswer = readme.content;
                            }
                        }

                        if (!studentAnswer || studentAnswer.trim().length === 0) {
                            return null;
                        }

                        let studentName = "Sinh viên";
                        if (context.submissionPath) {
                            const parts = context.submissionPath.split(/[\/\\]/);
                            const folderWithID = parts.find(p => /^[SsA-Za-z]+\d+_.+/.test(p));
                            if (folderWithID) {
                                const nameParts = folderWithID.split('_')[1]?.split(/(?=[A-Z])/);
                                if (nameParts && nameParts.length > 0) {
                                    studentName = nameParts[nameParts.length - 1]; // "Khanh"
                                }
                            }
                        }

                        return await this.textAnalysisEngine.evaluateAsync({
                            studentAnswer: studentAnswer,
                            referenceAnswer: rule.referenceAnswer!,
                            criterionDescription: rule.description,
                            maxPoints: rule.weight,
                            context: {
                                partLabel: rule.contextHint,
                                instruction: `IMPORTANT: Please refer to the student as "${studentName} đã nêu rõ" instead of "Sinh viên đã nêu rõ". Be strict but fair.`
                            }
                        });
                    })();

                    // --- 2. AICodeReview Execution (If Hybrid) ---
                    const codePromise = (async () => {
                        if (isHybrid && context.sourceSnapshot) {
                            return await this.aiCodeReview.evaluateAsync(
                                context.sourceSnapshot,
                                `STRICT INSTRUCTION: This is a hybrid Text + Code rule. The student was asked to design or explain an architecture/feature in text, AND implement it in code. Verify that the underlying code implementation matches the requirement. YOU MUST EXTRACT AT LEAST ONE CODE SNIPPET (via relevantSnippets array) AS EVIDENCE TO PROVE YOUR CONCLUSION. \n\nRequirement: ${rule.description}`,
                                rule.title
                            );
                        }
                        return null;
                    })();

                    // --- Execute Parallel ---
                    const [textResult, codeResult] = await Promise.all([
                        textPromise.catch(err => {
                            console.error(`[RubricEvaluator] Text Analysis failed for ${rule.id}:`, err);
                            return null;
                        }),
                        codePromise.catch(err => {
                            console.warn(`[RubricEvaluator] Code Review failed for hybrid rule ${rule.id}:`, err);
                            return null;
                        })
                    ]);

                    if (!textResult && !codeResult) {
                        return this.fail(rule, "Không tìm thấy tài liệu lý thuyết hoặc mã nguồn của sinh viên.");
                    }

                    let finalScore = 0;
                    let finalPassed = false;
                    let finalReason = "";
                    const evidencePayload: any = {};

                    if (isHybrid) {
                        // 50% Text, 50% Code
                        let textScore = 0;
                        let codeScore = 0;

                        if (textResult) {
                            const pct = typeof textResult.percentage === 'number' ? textResult.percentage : 0;
                            textScore = pct * (rule.weight * 0.5);
                            evidencePayload.textExplanation = `Lý thuyết: Điểm ${textScore}/${rule.weight * 0.5}\n` + textResult.reasoning;
                            evidencePayload.studentText = textResult.studentAnswerExtracted;
                        }

                        if (codeResult) {
                            const pct = typeof codeResult.percentageComplete === 'number' ? codeResult.percentageComplete : (codeResult.passed ? 1.0 : 0.0);
                            codeScore = pct * (rule.weight * 0.5);
                            evidencePayload.snippets = codeResult.relevantSnippets;
                            evidencePayload.codeExplanation = `Mã nguồn: Điểm ${codeScore}/${rule.weight * 0.5}\n` + codeResult.reasoning;
                        }

                        finalScore = Math.round((textScore + codeScore) * 100) / 100;
                        finalPassed = finalScore >= (rule.weight * 0.5);
                        finalReason = `Phân tích Hybrid (50% Lý thuyết, 50% Mã nguồn). Tổng điểm: ${finalScore}/${rule.weight}.\n\n- Lý thuyết: ${textResult ? textResult.reasoning : 'Không có dữ liệu'}\n\n- Mã nguồn: ${codeResult ? codeResult.reasoning : 'Không có dữ liệu'}`;
                        evidencePayload.hybridBreakdown = {
                            textPct: rule.weight > 0 ? (textScore / (rule.weight * 0.5)) : 0,
                            codePct: rule.weight > 0 ? (codeScore / (rule.weight * 0.5)) : 0
                        };
                    } else {
                        // 100% Text
                        if (!textResult) return this.fail(rule, "Không tìm thấy câu trả lời của sinh viên trong bài nộp.");
                        finalScore = Math.round(textResult.score * 100) / 100;
                        finalPassed = textResult.percentage >= 0.5;
                        finalReason = textResult.reasoning;
                        evidencePayload.explanation = `Key Concepts Covered: ${textResult.keyConceptsCovered.join(', ')}\nMissing: ${textResult.keyConceptsMissing.join(', ')}\n\nFeedback: ${textResult.suggestions}`;
                        evidencePayload.studentText = textResult.studentAnswerExtracted || "Đã phân tích toàn bộ tài liệu để tìm kiếm câu trả lời.";
                    }

                    return {
                        ruleId: rule.id,
                        passed: finalPassed,
                        score: finalScore,
                        reason: finalReason,
                        evidence: evidencePayload
                    };
                }

                default:
                    return this.fail(rule, `Unknown scoring strategy: ${rule.scoringStrategy}`);

                case "StdInOutProbe": {
                    if (!context.submissionPath) {
                        return this.fail(rule, "Submission path not available for StdInOutProbe");
                    }
                    const spec = rule.requiredEvidence?.find(e => e.stdInOutProbe);
                    if (!spec?.stdInOutProbe || spec.stdInOutProbe.testCases.length === 0) {
                        return this.fail(rule, "No test cases defined for StdInOutProbe");
                    }
                    if (spec.stdInOutProbe.testCases.length < 3) {
                        console.warn(`[RubricEvaluator] Rule ${rule.id} has only ${spec.stdInOutProbe.testCases.length} test cases (minimum 3 recommended)`);
                    }
                    const stdResult = await this.stdInOutProbe.evaluateAsync(
                        context.submissionPath,
                        spec.stdInOutProbe
                    );
                    // Proportional scoring: (passed / total) * weight
                    const proportionalScore = stdResult.totalCases > 0
                        ? (stdResult.passedCases / stdResult.totalCases) * rule.weight
                        : 0;
                    return {
                        ruleId: rule.id,
                        passed: stdResult.passed,
                        score: Math.round(proportionalScore * 100) / 100,
                        reason: `Passed ${stdResult.passedCases}/${stdResult.totalCases} test cases. ` +
                            stdResult.caseResults
                                .filter(c => !c.passed)
                                .map(c => `Case ${c.caseId}: expected "${c.expected.substring(0, 50)}" got "${c.actual.substring(0, 50)}"${c.timedOut ? ' [TIMEOUT]' : ''}`)
                                .join('; '),
                        evidence: {
                            ioTestCases: stdResult.caseResults.map(c => ({
                                caseId: c.caseId,
                                input: c.input,
                                expected: c.expected,
                                actual: c.actual,
                                passed: c.passed,
                                timedOut: c.timedOut
                            }))
                        }
                    };
                }
            }
        } catch (error: any) {
            console.error(`[RubricEvaluator] System/Infrastructure error evaluating rule ${rule.id}:`, error);
            throw error;
        }
    }

    private fail(rule: RubricRule, reason: string): RuleScore {
        return { ruleId: rule.id, passed: false, score: 0, reason };
    }

    private extractTagHints(title: string, category: string): string[] {
        const keywords = title.toLowerCase().split(/[\s\W]+/);
        keywords.push(category.toLowerCase());

        // Common mappings for architectural concepts
        const lower = title.toLowerCase();
        if (lower.includes("dependency")) keywords.push("di", "dependency-injection");
        if (lower.includes("repository")) keywords.push("repository", "data-access");
        if (lower.includes("controller")) keywords.push("controller", "api");
        if (lower.includes("interface")) keywords.push("interface", "abstraction");
        if (lower.includes("dbcontext")) keywords.push("dbcontext", "ef-core");
        if (lower.includes("service")) keywords.push("service", "business-logic");
        if (lower.includes("naming")) keywords.push("naming-convention", "csharp");
        if (lower.includes("method") && lower.includes("length")) keywords.push("method-length", "code-quality");
        if (lower.includes("layered") || lower.includes("separation")) keywords.push("mvc", "architecture");
        if (lower.includes("mvc") || lower.includes("model-view")) keywords.push("controller", "architecture");
        if (lower.includes("async")) keywords.push("async", "ef-core");

        return keywords.filter(k => k.length > 2);
    }
}

