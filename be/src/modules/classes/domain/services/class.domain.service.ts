export class ClassDomainService {
  validateClassCode(code: string): { valid: boolean; message?: string } {
    if (!code || code.trim().length === 0) {
      return { valid: false, message: 'Class code cannot be empty' }
    }
    if (code.length > 20) {
      return { valid: false, message: 'Class code must be 20 characters or less' }
    }
    return { valid: true }
  }

  validateClassName(name: string): { valid: boolean; message?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, message: 'Class name cannot be empty' }
    }
    if (name.length > 255) {
      return { valid: false, message: 'Class name must be 255 characters or less' }
    }
    return { valid: true }
  }

  generateClassCode(baseCode: string, index: number = 0): string {
    return `${baseCode.toUpperCase()}-${index > 0 ? index : ''}`.replace(/-$/, '')
  }
}
