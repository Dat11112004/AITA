/**
 * Base Use Case interface
 * All use cases should implement this interface
 */
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>
}

/**
 * Base DTO (Data Transfer Object)
 * All DTOs should extend this class
 */
export abstract class BaseDTO {
  abstract toJSON(): Record<string, any>
}
