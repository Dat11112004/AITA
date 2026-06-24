export interface IAIService {
    generateExercise(input: any): Promise<any>
    assess(content: string, language?: string, assignmentTitle?: string, assignmentDescription?: string): Promise<any>
    learningFeedback(studentId: string): Promise<any>
}
