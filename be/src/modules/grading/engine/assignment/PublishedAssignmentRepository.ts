// @ts-nocheck
import { PublishedAssignment } from '../core/domain/submission/PublishedAssignment';
import * as fs from 'fs';
import * as path from 'path';

export class PublishedAssignmentRepository {
    private readonly store: Map<string, PublishedAssignment> = new Map();
    private readonly dataFilePath = path.join(process.cwd(), 'data', 'assignments.json');

    constructor() {
        this.loadFromFile();
    }

    private loadFromFile() {
        try {
            if (fs.existsSync(this.dataFilePath)) {
                const data = fs.readFileSync(this.dataFilePath, 'utf-8');
                const parsed = JSON.parse(data);
                for (const key of Object.keys(parsed)) {
                    this.store.set(key, parsed[key]);
                }
                console.log(`[PublishedAssignmentRepository] Loaded ${this.store.size} assignments from disk.`);
            }
        } catch (error) {
            console.error('[PublishedAssignmentRepository] Error loading assignments from disk:', error);
        }
    }

    private saveToFile() {
        try {
            const dir = path.dirname(this.dataFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data = Object.fromEntries(this.store);
            fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.error('[PublishedAssignmentRepository] Error saving assignments to disk:', error);
        }
    }

    public async saveAsync(assignment: PublishedAssignment): Promise<void> {
        this.store.set(assignment.id, assignment);
        this.saveToFile();
        console.log(`[PublishedAssignmentRepository] Saved assignment ${assignment.id} to disk.`);
    }

    public async getAsync(id: string): Promise<PublishedAssignment | undefined> {
        return this.store.get(id);
    }
    
    public async getLatestAsync(): Promise<PublishedAssignment | undefined> {
        // Simple hack to get the latest for MVP
        const values = Array.from(this.store.values());
        return values[values.length - 1];
    }

    public async getAllAsync(): Promise<PublishedAssignment[]> {
        return Array.from(this.store.values());
    }

    public async deleteAsync(id: string): Promise<boolean> {
        if (this.store.has(id)) {
            this.store.delete(id);
            this.saveToFile();
            console.log(`[PublishedAssignmentRepository] Deleted assignment ${id} from disk.`);
            return true;
        }
        return false;
    }
}

export const globalAssignmentRepository = new PublishedAssignmentRepository();

