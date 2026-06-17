export class UserPresenter {
  static toJSON(user: any) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    }
  }

  static toListJSON(users: any[]) {
    return users.map(user => this.toJSON(user))
  }
}
