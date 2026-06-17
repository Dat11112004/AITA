/**
 * Logger service for consistent logging across the application
 */
export interface ILogger {
  debug(message: string, meta?: Record<string, any>): void
  info(message: string, meta?: Record<string, any>): void
  warn(message: string, meta?: Record<string, any>): void
  error(message: string, error?: Error | Record<string, any>): void
}

export class Logger implements ILogger {
  private context: string

  constructor(context: string = 'App') {
    this.context = context
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.context}] 🔍 ${message}`, meta || '')
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    console.info(`[${this.context}] ℹ️  ${message}`, meta || '')
  }

  warn(message: string, meta?: Record<string, any>): void {
    console.warn(`[${this.context}] ⚠️  ${message}`, meta || '')
  }

  error(message: string, error?: Error | Record<string, any>): void {
    console.error(`[${this.context}] ❌ ${message}`, error || '')
  }

  createChild(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`)
  }
}

export const logger = new Logger('App')
