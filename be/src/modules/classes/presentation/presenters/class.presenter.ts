export class ClassPresenter {
  static toJSON(classEntity: any) {
    return {
      id: classEntity.id,
      code: classEntity.code,
      name: classEntity.name,
      lecturerId: classEntity.lecturerId,
      status: classEntity.status,
      description: classEntity.description,
      createdAt: classEntity.createdAt.toISOString(),
      updatedAt: classEntity.updatedAt?.toISOString(),
    }
  }

  static toListJSON(classes: any[]) {
    return classes.map(c => this.toJSON(c))
  }
}
