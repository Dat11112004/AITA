// @ts-nocheck
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
        const maxGlobalAttempts = 2;

        for (let globalAttempt = 1; globalAttempt <= maxGlobalAttempts; globalAttempt++) {
            // 1. Try Gemini keys first
            if (config.ai.geminiKeys && config.ai.geminiKeys.length > 0) {
                const displayModel = config.ai.geminiModel || 'gemini-3.6-flash';
                const model = (displayModel.includes('3.6') || displayModel.includes('flash-high')) ? 'gemini-1.5-flash' : displayModel;
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

                    let client: any;
                    const genAI = new GoogleGenerativeAI(key);
                    client = {
                        chat: {
                            completions: {
                                create: async (params: any) => {
                                    const systemMsg = params.messages?.find((m: any) => m.role === 'system')?.content || '';
                                    const userMsgs = params.messages?.filter((m: any) => m.role !== 'system') || [];

                                    let contents: any[] = [];
                                    for (const msg of userMsgs) {
                                        if (typeof msg.content === 'string') {
                                            contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
                                        } else if (Array.isArray(msg.content)) {
                                            const parts: any[] = [];
                                            for (const part of msg.content) {
                                                if (part.type === 'text') {
                                                    parts.push({ text: part.text });
                                                } else if (part.type === 'image_url') {
                                                    const url = part.image_url?.url || '';
                                                    const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
                                                    if (match) {
                                                        parts.push({
                                                            inlineData: {
                                                                mimeType: match[1],
                                                                data: match[2]
                                                            }
                                                        });
                                                    }
                                                }
                                            }
                                            contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });
                                        }
                                    }

                                    const targetModel = model;
                                    try {
                                        const genModel = genAI.getGenerativeModel({
                                            model: targetModel,
                                            systemInstruction: systemMsg ? systemMsg : undefined
                                        });

                                        const genResult = await genModel.generateContent({
                                            contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: '' }] }],
                                            generationConfig: {
                                                temperature: params.temperature ?? 0.7
                                            }
                                        });

                                        const text = genResult.response.text();
                                        return { choices: [{ message: { content: text } }] };
                                    } catch (sdkErr: any) {
                                        // Fallback to OpenAI REST client if SDK fails on key
                                        const openAiClient = new OpenAI({
                                            apiKey: key,
                                            baseURL: config.ai.geminiBaseUrl,
                                            timeout: config.ai.timeoutMs,
                                            maxRetries: 0
                                        });
                                        return await openAiClient.chat.completions.create(params);
                                    }
                                }
                            }
                        }
                    };

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

                        const status = Number(err.status || err.statusCode || 0);
                        const errBody = err.error ? JSON.stringify(err.error) : (err.message || String(err));

                        if (status === 429 || (err.message && err.message.includes('429'))) {
                            console.warn(`[AiClientManager] Key #${keyIndex + 1} rate limited (429). Short cooldown 2s...`);
                            const newExpiry = Date.now() + 2000;
                            AiClientManager.rateLimitExpiry.set(key, newExpiry);

                            const wait = newExpiry - Date.now();
                            if (wait < minWaitTime) minWaitTime = wait;
                            continue;
                        } else {
                            console.error(`[AiClientManager] Key #${keyIndex + 1} failed (HTTP ${status}): ${errBody}`);
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

                            // Put key on short 5s cooldown instead of 1h to allow quick recovery
                            AiClientManager.rateLimitExpiry.set(key, Date.now() + 5000);
                            continue;
                        }
                    }
                } // End of key loop

                if (!triedAnyKey) {
                    console.warn(`[AiClientManager] All keys are cooling down. Clearing cooldown locks...`);
                    AiClientManager.rateLimitExpiry.clear();
                }
            }

            // 2. Fallback to GitHub Models (GPT-4o-mini) if configured or if Gemini fails
            if (config.ai.githubToken) {
                console.log(`[AiClientManager] Attempting fallback to GitHub Models (${config.ai.githubModel})...`);
                try {
                    const ghClient = new OpenAI({
                        apiKey: config.ai.githubToken,
                        baseURL: config.ai.githubBaseUrl,
                        timeout: config.ai.timeoutMs,
                        maxRetries: 0
                    });

                    await globalAiSemaphore.acquire();
                    try {
                        const startTime = Date.now();
                        const result = await apiCall(ghClient, config.ai.githubModel);
                        const duration = Date.now() - startTime;

                        try {
                            await prisma.aiUsageLog.create({
                                data: {
                                    Provider: 'GitHubModels',
                                    ModelUsed: config.ai.githubModel,
                                    IsSuccess: true,
                                    DurationMs: duration
                                }
                            });
                        } catch (e) { }

                        if (cacheKey) AiCache.set(cacheKey, result);
                        return result;
                    } finally {
                        globalAiSemaphore.release();
                    }
                } catch (ghErr: any) {
                    console.error('[AiClientManager] GitHub Models fallback failed:', ghErr?.message || ghErr);
                    lastError = ghErr;
                }
            }

            const isTimeoutOrRateLimit = lastError && (lastError.status === 429 || lastError.message?.includes('429') || lastError.message?.includes('AI_TIMEOUT'));
            if (globalAttempt < maxGlobalAttempts && isTimeoutOrRateLimit) {
                console.warn(`[AiClientManager] Global Pool Exhausted (Attempt ${globalAttempt}/${maxGlobalAttempts}). Cooling down for 3 seconds...`);
                AiClientManager.rateLimitExpiry.clear(); // Reset cooldowns on retry attempt
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                break;
            }
        }

        const errMsg = lastError?.message || String(lastError || 'All AI providers failed');
        if (errMsg.includes('429') || lastError?.status === 429) {
            throw new AppError(
                'AI_RATE_LIMIT',
                'Hệ thống AI đang quá tải lượt gọi (Rate Limit 429). Vui lòng thử lại sau 5–10 giây.',
                503
            );
        }

        throw lastError || new Error("All AI providers failed and no valid keys are configured.");
    }
}

