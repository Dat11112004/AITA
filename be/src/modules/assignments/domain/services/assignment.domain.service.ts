export class AssignmentDomainService {
  validateTitle(title: string): { valid: boolean; message?: string } {
    if (!title || title.trim().length === 0) {
      return { valid: false, message: 'Assignment title cannot be empty' }
    }
    if (title.length > 200) {
      return { valid: false, message: 'Assignment title must be 200 characters or less' }
    }
    return { valid: true }
  }

  validateType(type: string): { valid: boolean; message?: string } {
    const validTypes = ['QUIZ', 'CODING', 'GROUP']
    if (!validTypes.includes(type)) {
      return { valid: false, message: `Invalid assignment type. Must be one of: ${validTypes.join(', ')}` }
    }
    return { valid: true }
  }

  validateMaxScore(score: number): { valid: boolean; message?: string } {
    if (score <= 0) {
      return { valid: false, message: 'Max score must be greater than 0' }
    }
    if (score > 100) {
      return { valid: false, message: 'Max score cannot exceed 100' }
    }
    return { valid: true }
  }

  validateDeadline(dueAt: Date): { valid: boolean; message?: string } {
    if (dueAt <= new Date()) {
      return { valid: false, message: 'Due date must be in the future' }
    }
    return { valid: true }
  }
}
