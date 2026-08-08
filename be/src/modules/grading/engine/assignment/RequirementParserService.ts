// @ts-nocheck
import { IAiProvider, DocumentImage } from '../core/contracts/IAiProvider';

function cleanHtmlTags(text: string): string {
    if (!text) return '';
    return text
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<code>(.*?)<\/code>/gi, '`$1`')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/td>/gi, ' | ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function formatTaskDescription(text: string): string {
    if (!text) return '';
    let cleaned = cleanHtmlTags(text);
    return cleaned
        .replace(/(\d+\.\s*(?:Title|Problem Description|Technical Requirements|Technical Requirements & Constraints|Input \/ Output Examples|Solution Hints|Code Skeleton)[^\n]*)/gi, '\n\n**$1**\n')
        .replace(/(Language & Data Structures|Algorithm Optimization Analysis|Time Complexity|Space Complexity|Complexity Requirements|Concurrency Requirements):/gi, '\n**$1:**')
        .replace(/(Constraints:)/gi, '\n\n> **Constraints:**\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export class RequirementParserService {
    constructor(private readonly aiProvider: IAiProvider) {}

    /**
     * Parses raw assignment text into a structured Draft Blueprint using AI.
     * When documentImages are provided (from uploaded .docx files), they are sent
     * alongside the text to enable the AI to analyze DB schemas, UI mockups, etc.
     */
    public async parseRequirementsAsync(rawText: string, documentImages?: DocumentImage[], subject?: string | null): Promise<any> {
        console.log(`[RequirementParserService] Parsing requirements via AI... (images: ${documentImages?.length || 0}, subject: ${subject || 'unknown'})`);

        try {
            const draftBlueprint = await this.aiProvider.parseRequirementsAsync(rawText, documentImages, subject);
            
            // Validate that AI returned valid requirements and clean formatting
            if (draftBlueprint && Array.isArray(draftBlueprint.requirements) && draftBlueprint.requirements.length > 0) {
                draftBlueprint.requirements.forEach(req => {
                    if (req.title) req.title = cleanHtmlTags(req.title);
                    if (req.description) req.description = formatTaskDescription(req.description);
                });
                return {
                    ...draftBlueprint,
                    id: `bp-${Date.now()}`,
                    version: '1.0.0',
                    status: 'draft',
                    originalContent: rawText
                };
            }
            throw new Error("AI returned empty requirements array.");
        } catch (error) {
            console.error('[RequirementParserService] AI Parsing failed, running deterministic smart extractor fallback:', error);
            return this.extractRequirementsDeterministically(rawText);
        }
    }

    /**
     * Senior Deterministic Smart Extractor:
     * When AI API keys hit quota limits (429) or model 404, this parser extracts
     * actual problems/questions directly from the exam text (Problem 1, Problem 2, Câu 1, Câu 2, etc.)
     * and divides 10.0 points proportionally across extracted problems.
     */
    private extractRequirementsDeterministically(rawText: string): any {
        const text = rawText || '';
        
        // Regex to detect Problem 1, Problem 2, Câu 1, Bài 1, Task 1, Part 1, Part A...
        const pattern = /(?:Problem|Câu|Bài|Task|Part)\s*(?:\d+|[A-H])[\s\:\.\-][^\n]+/gi;
        const matches = Array.from(text.matchAll(pattern));

        let requirements: any[] = [];

        if (matches.length > 0) {
            for (let i = 0; i < matches.length; i++) {
                const startIdx = matches[i].index;
                const endIdx = (i < matches.length - 1) ? matches[i + 1].index : text.length;
                const block = text.substring(startIdx, endIdx).trim();
                const firstLineEnd = block.indexOf('\n');
                const rawTitle = firstLineEnd !== -1 ? block.substring(0, firstLineEnd).trim() : block;
                const description = firstLineEnd !== -1 ? block.substring(firstLineEnd + 1).trim() : block;

                // Clean title HTML and numbers
                let title = cleanHtmlTags(rawTitle).replace(/^[\#\*\-\s]+/, '').trim();
                if (title.length > 120) title = title.substring(0, 120) + '...';

                // Try to extract explicit marks from title/description (e.g. 2.5 marks, 3 điểm, 15 POINTS)
                let marks: number | undefined;
                const markMatch = title.match(/(\d+(?:\.\d+)?)\s*(?:marks?|points?|điểm)/i) || description.match(/(\d+(?:\.\d+)?)\s*(?:marks?|points?|điểm)/i);
                if (markMatch) {
                    marks = parseFloat(markMatch[1]);
                }

                requirements.push({
                    id: `req-auto-${i + 1}`,
                    groupId: 'g1',
                    title: title || `Task ${i + 1}`,
                    description: formatTaskDescription(description).substring(0, 1800) || title,
                    marks: marks || (10 / matches.length),
                    complexity: 'high',
                    isUIVisible: false,
                    isCRUD: false,
                    isWrittenAnswer: false,
                    isArchitectureCode: true,
                    isDiagramTask: false,
                    isSoftDelete: false,
                    recommendedEngine: 'AICodeReview'
                });
            }
        }

        if (requirements.length === 0) {
            // Fallback: split by double newlines or non-empty sections
            const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 20);
            const count = Math.min(blocks.length, 5);
            requirements = blocks.slice(0, count).map((b, i) => {
                const lines = b.trim().split('\n');
                return {
                    id: `req-block-${i + 1}`,
                    groupId: 'g1',
                    title: cleanHtmlTags(lines[0]).replace(/^[\#\*\-\s]+/, '').substring(0, 100) || `Task ${i + 1}`,
                    description: formatTaskDescription(b).substring(0, 1000),
                    marks: Math.round((10 / count) * 10) / 10,
                    complexity: 'medium',
                    isUIVisible: false,
                    isCRUD: false,
                    isWrittenAnswer: false,
                    isArchitectureCode: true,
                    isDiagramTask: false,
                    isSoftDelete: false,
                    recommendedEngine: 'AICodeReview'
                };
            });
        }

        if (requirements.length === 0) {
            requirements = [{
                id: 'req-auto-1',
                groupId: 'g1',
                title: 'General Assignment Implementation',
                description: formatTaskDescription(text).substring(0, 1000) || 'Implement the requirements specified in the assignment description.',
                marks: 10,
                complexity: 'medium',
                isUIVisible: false,
                isCRUD: false,
                isWrittenAnswer: false,
                isArchitectureCode: true,
                isDiagramTask: false,
                isSoftDelete: false,
                recommendedEngine: 'AICodeReview'
            }];
        }

        // Normalize marks to sum to 10.0
        const total = requirements.reduce((s, r) => s + (r.marks || 0), 0);
        if (total > 0 && Math.abs(total - 10.0) > 0.01) {
            requirements.forEach(r => {
                r.marks = Math.round(((r.marks || 1) / total) * 10 * 10) / 10;
            });
        }

        // Extract title & metadata from assignment text
        const titleMatch = text.match(/(?:Practical Assignment|Assignment Title|Assignment|Title)\s*[\:\-]\s*([^\n]+)/i);
        const assignmentTitle = cleanHtmlTags(titleMatch ? titleMatch[1].trim() : (text.split('\n')[0]?.replace(/^[\#\*\-\s]+/, '').substring(0, 80) || 'Shopee E-Commerce Engine Assignment'));

        const langMatch = text.match(/Java|C#|TypeScript|Python|Dart/i);
        const language = langMatch ? langMatch[0].toLowerCase() : 'java';

        return {
            id: `bp-${Date.now()}`,
            version: '1.0.0',
            status: 'draft',
            projectType: 'backend',
            language: language,
            framework: 'other',
            assignmentTitle: assignmentTitle,
            description: cleanHtmlTags(text).substring(0, 400),
            requirements,
            originalContent: text
        };
    }
}
