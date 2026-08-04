// ──────────────────────────────────────────────────────────────
// Value Object: TestCase
// ──────────────────────────────────────────────────────────────

/**
 * Represents a test case for an exam.
 * Used for automated testing of student submissions.
 */
export class TestCase {
  readonly id: string
  readonly examId: string | null
  readonly input: string | null
  readonly expectedOutput: string | null
  readonly isHidden: boolean | null
  readonly timeoutMs: number | null
  readonly memoryLimitMb: number | null
  readonly points: number | null
  readonly sortOrder: number | null

  private constructor(
    id: string,
    examId: string | null,
    input: string | null,
    expectedOutput: string | null,
    isHidden: boolean | null,
    timeoutMs: number | null,
    memoryLimitMb: number | null,
    points: number | null,
    sortOrder: number | null
  ) {
    this.id = id
    this.examId = examId
    this.input = input
    this.expectedOutput = expectedOutput
    this.isHidden = isHidden
    this.timeoutMs = timeoutMs
    this.memoryLimitMb = memoryLimitMb
    this.points = points
    this.sortOrder = sortOrder
  }

  // ── Factory Methods ──

  static create(
    id: string,
    examId: string,
    input: string,
    expectedOutput: string,
    params?: {
      isHidden?: boolean
      timeoutMs?: number
      memoryLimitMb?: number
      points?: number
      sortOrder?: number
    }
  ): TestCase {
    return new TestCase(
      id, examId, input, expectedOutput,
      params?.isHidden ?? false,
      params?.timeoutMs ?? null,
      params?.memoryLimitMb ?? null,
      params?.points ?? null,
      params?.sortOrder ?? null
    )
  }

  static restore(
    id: string,
    examId: string | null,
    input: string | null,
    expectedOutput: string | null,
    isHidden: boolean | null,
    timeoutMs: number | null,
    memoryLimitMb: number | null,
    points: number | null,
    sortOrder: number | null
  ): TestCase {
    return new TestCase(id, examId, input, expectedOutput, isHidden, timeoutMs, memoryLimitMb, points, sortOrder)
  }

  // ── Equality ──

  equals(other: TestCase): boolean {
    return this.id === other.id
  }

  toJSON() {
    return {
      id: this.id,
      examId: this.examId,
      input: this.input,
      expectedOutput: this.expectedOutput,
      isHidden: this.isHidden,
      timeoutMs: this.timeoutMs,
      memoryLimitMb: this.memoryLimitMb,
      points: this.points,
      sortOrder: this.sortOrder,
    }
  }
}
