// @ts-nocheck
import { EventEmitter } from 'events';

type Job<T> = () => Promise<T>;

export class SubmissionQueue extends EventEmitter {
    private concurrency: number;
    private running: number = 0;
    private queue: { job: Job<any>, resolve: (value: any) => void, reject: (reason?: any) => void }[] = [];

    constructor(concurrency: number = 3) {
        super();
        this.concurrency = concurrency;
    }

    public async enqueue<T>(job: Job<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ job, resolve, reject });
            this.processNext();
        });
    }

    private async processNext() {
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return;
        }

        this.running++;
        const item = this.queue.shift();
        if (item) {
            try {
                const result = await item.job();
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            } finally {
                this.running--;
                this.processNext();
            }
        }
    }

    public getQueueLength(): number {
        return this.queue.length;
    }

    public getRunningCount(): number {
        return this.running;
    }
}

// Global instance to be used across requests
export const globalSubmissionQueue = new SubmissionQueue(3);

