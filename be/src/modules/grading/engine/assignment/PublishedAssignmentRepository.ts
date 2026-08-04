// @ts-nocheck
import { PublishedAssignment } from '../core/domain/submission/PublishedAssignment';
import { prisma } from '../../../../database/prisma.js';

export class PublishedAssignmentRepository {
    constructor() {}

    public async saveAsync(assignment: PublishedAssignment): Promise<void> {
        const dataStr = JSON.stringify(assignment);
        await prisma.publishedAssignment.upsert({
            where: { Id: assignment.id },
            update: {
                Version: assignment.version,
                Title: assignment.metadata?.title,
                Description: assignment.metadata?.description,
                ProjectType: assignment.metadata?.projectType,
                BlueprintId: assignment.blueprintId,
                Data: dataStr,
            },
            create: {
                Id: assignment.id,
                Version: assignment.version,
                Title: assignment.metadata?.title,
                Description: assignment.metadata?.description,
                ProjectType: assignment.metadata?.projectType,
                BlueprintId: assignment.blueprintId,
                Data: dataStr,
            }
        });
        console.log(`[PublishedAssignmentRepository] Saved assignment ${assignment.id} to DB.`);
    }

    public async getAsync(id: string): Promise<PublishedAssignment | undefined> {
        const row = await prisma.publishedAssignment.findUnique({ where: { Id: id } });
        if (row && row.Data) {
            return JSON.parse(row.Data) as PublishedAssignment;
        }
        return undefined;
    }
    
    public async getLatestAsync(): Promise<PublishedAssignment | undefined> {
        const row = await prisma.publishedAssignment.findFirst({
            orderBy: { CreatedAt: 'desc' }
        });
        if (row && row.Data) {
            return JSON.parse(row.Data) as PublishedAssignment;
        }
        return undefined;
    }

    public async getAllAsync(): Promise<PublishedAssignment[]> {
        const rows = await prisma.publishedAssignment.findMany({
            orderBy: { CreatedAt: 'desc' }
        });
        return rows.map(r => JSON.parse(r.Data!) as PublishedAssignment);
    }

    public async deleteAsync(id: string): Promise<boolean> {
        try {
            await prisma.publishedAssignment.delete({ where: { Id: id } });
            console.log(`[PublishedAssignmentRepository] Deleted assignment ${id} from DB.`);
            return true;
        } catch (error) {
            return false;
        }
    }
}

export const globalAssignmentRepository = new PublishedAssignmentRepository();

