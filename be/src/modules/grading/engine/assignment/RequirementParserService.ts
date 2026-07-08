// @ts-nocheck
import { IAiProvider } from '../core/contracts/IAiProvider';

export class RequirementParserService {
    constructor(private readonly aiProvider: IAiProvider) {}

    /**
     * Parses raw assignment text into a structured Draft Blueprint using AI.
     */
    public async parseRequirementsAsync(rawText: string): Promise<any> {
        console.log(`[RequirementParserService] Parsing requirements via AI...`);
        
        try {
            const draftBlueprint = await this.aiProvider.parseRequirementsAsync(rawText);
            
            // Add ID and Status before returning
            return {
                ...draftBlueprint,
                id: `bp-${Date.now()}`,
                version: '1.0.0',
                status: 'draft',
                originalContent: rawText
            };
        } catch (error) {
            console.error('[RequirementParserService] AI Parsing failed, returning fallback.', error);
            // Fallback for when API keys are missing or invalid
            return {
                id: `bp-${Date.now()}`,
                version: '1.0.0',
                status: 'draft',
                projectType: 'backend',
                language: 'csharp',
                framework: 'net8',
                assignmentTitle: 'Extracted Title (Fallback)',
                description: 'Short description',
                requirements: ['Requirement 1 (Fallback)']
            };
        }
    }
}

