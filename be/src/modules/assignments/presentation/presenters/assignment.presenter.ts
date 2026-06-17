export class AssignmentPresenter {
  static toJSON(assignment: any) {
    return {
      id: assignment.id,
      classId: assignment.classId,
      title: assignment.title,
      type: assignment.type,
      status: assignment.status,
      maxScore: assignment.maxScore,
      description: assignment.description,
      dueAt: assignment.dueAt?.toISOString(),
      content: assignment.content,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt?.toISOString(),
    }
  }

  static toListJSON(assignments: any[]) {
    return assignments.map(a => this.toJSON(a))
  }
}
