// @ts-nocheck
import OpenAI from 'openai';
import { config } from '../../config/index.js'; // Adjust if needed
import { prisma } from '../../../../../database/prisma.js';

export class AiCache {
    private static cache: Record<string, any> = {};

    public static clearCache(): void {
        this.cache = {};
    }

    public static get(key: string): any {
        return this.cache[key];
    }

    public static set(key: string, value: any) {
        this.cache[key] = value;
    }
}

class Semaphore {
    private permits: number;
    private queue: Array<() => void> = [];

    constructor(permits: number) {
        this.permits = permits;
    }

    async acquire(): Promise<void> {
        if (this.permits > 0) {
            this.permits--;
            return Promise.resolve();
        }
        return new Promise<void>(resolve => {
            this.queue.push(resolve);
        });
    }

    release(): void {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next();
        } else {
            this.permits++;
        }
    }
}

const globalAiSemaphore = new Semaphore(3);

export class AiClientManager {
    private static currentKeyIndex = 0;
    private static rateLimitExpiry = new Map<string, number>();

    public static async executeWithFallback<T>(
        apiCall: (client: OpenAI, model: string) => Promise<T>,
        cacheKey?: string
    ): Promise<T> {
        if (cacheKey) {
            const cachedValue = AiCache.get(cacheKey);
            if (cachedValue !== undefined) {
                console.log("[AiClientManager] Cache HIT for key: " + cacheKey.substring(0, 16));
                return cachedValue as T;
            }
        }

        let lastError: any;
        const maxGlobalAttempts = 10;

        for (let globalAttempt = 1; globalAttempt <= maxGlobalAttempts; globalAttempt++) {
            // Try Gemini keys first
            if (config.ai.geminiKeys && config.ai.geminiKeys.length > 0) {
                const model = config.ai.geminiModel;
                const totalKeys = config.ai.geminiKeys.length;

                // Round-robin starting index
                const startIndex = AiClientManager.currentKeyIndex;
                AiClientManager.currentKeyIndex = (AiClientManager.currentKeyIndex + 1) % totalKeys;

                let minWaitTime = Infinity;
                let triedAnyKey = false;

                for (let i = 0; i < totalKeys; i++) {
                    const keyIndex = (startIndex + i) % totalKeys;
                    const key = config.ai.geminiKeys[keyIndex];

                    const expiry = AiClientManager.rateLimitExpiry.get(key) || 0;
                    const now = Date.now();

                    if (expiry > now) {
                        const wait = expiry - now;
                        if (wait < minWaitTime) minWaitTime = wait;
                        continue; // Skip key because it is on cooldown
                    }

                    triedAnyKey = true;

                    const client = new OpenAI({
                        apiKey: key,
                        baseURL: config.ai.geminiBaseUrl,
                        timeout: config.ai.timeoutMs,
                        maxRetries: 0
                    });

                    try {
                        await globalAiSemaphore.acquire();
                        try {
                            const startTime = Date.now();
                            const result = await apiCall(client, model);
                            const duration = Date.now() - startTime;

                            // Log usage to DB
                            try {
                                await prisma.aiUsageLog.create({
                                    data: {
                                        Provider: 'Gemini',
                                        ModelUsed: model,
                                        IsSuccess: true,
                                        DurationMs: duration
                                    }
                                });
                            } catch (e) {
                                console.error('Failed to log AI usage to DB', e);
                            }

                            if (cacheKey) AiCache.set(cacheKey, result);
                            return result;
                        } finally {
                            globalAiSemaphore.release();
                        }
                    } catch (err: any) {
                        lastError = err;

                        const status = err.status || err.statusCode || 'unknown';
                        const errBody = err.error ? JSON.stringify(err.error) : (err.message || String(err));

                        if (status === 429 || (err.message && err.message.includes('429'))) {
                            console.warn(`[AiClientManager] Key #${keyIndex + 1} rate limited (429). Cooldown for 15s...`);
                            const newExpiry = Date.now() + 15000;
                            AiClientManager.rateLimitExpiry.set(key, newExpiry);

                            const wait = newExpiry - Date.now();
                            if (wait < minWaitTime) minWaitTime = wait;

                            // Immediately continue to next key without blocking
                            continue;
                        } else {
                            console.error(`[AiClientManager] Key #${keyIndex + 1} failed (HTTP ${status}): ${errBody}`);
                            // Log failure to DB
                            try {
                                await prisma.aiUsageLog.create({
                                    data: {
                                        Provider: 'Gemini',
                                        ModelUsed: model,
                                        IsSuccess: false,
                                        ErrorMessage: `HTTP ${status}: ${err.message || String(err)}`
                                    }
                                });
                            } catch (e) { }

                            // Fail fast on Bad Request as retrying another key won't fix bad JSON/Prompt
                            if (status === 400) {
                                throw lastError;
                            }
                        }
                    }
                } // End of key loop

                if (!triedAnyKey && minWaitTime !== Infinity) {
                    lastError = new Error("AI_TIMEOUT: All keys on cooldown");
                    console.warn(`[AiClientManager] All keys on cooldown. Waiting ${Math.ceil(minWaitTime / 1000)}s before retry...`);
                    await new Promise(resolve => setTimeout(resolve, minWaitTime));
                    continue;
                }

                if (lastError && (lastError.status === 429 || lastError.message?.includes('429'))) {
                    const wait = minWaitTime === Infinity ? 5000 : minWaitTime;
                    console.warn(`[AiClientManager] Exhausted all healthy keys. Waiting ${Math.ceil(wait / 1000)}s before next global attempt...`);
                    await new Promise(resolve => setTimeout(resolve, wait));
                    continue;
                }
            }

            const isTimeoutOrRateLimit = lastError && (lastError.status === 429 || lastError.message?.includes('429') || lastError.message?.includes('AI_TIMEOUT'));
            if (globalAttempt < maxGlobalAttempts && isTimeoutOrRateLimit) {
                console.warn(`[AiClientManager] Global Pool Exhausted (Attempt ${globalAttempt}/${maxGlobalAttempts}). Cooling down for 10 seconds before retrying all keys...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else if (globalAttempt < maxGlobalAttempts) {
                // Short cooldown for non-rate limit errors
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                break;
            }
        }

        throw lastError || new Error("All AI providers failed and no keys are configured.");
    }
}

