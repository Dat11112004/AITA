/**
 * Unit of Work interface — provides transactional scope.
 *
 * Repositories are injected directly into use cases via DI.
 * UoW is ONLY used when a use case needs to run multiple
 * repository operations within a single database transaction.
 */
export interface IUnitOfWork {
  /**
   * Run a set of operations within a database transaction.
   * The callback receives a transactional UoW whose repositories
   * share the same underlying transaction client.
   * If any operation fails, the entire transaction is rolled back.
   */
  runInTransaction<T>(work: (txUow: IUnitOfWork) => Promise<T>): Promise<T>

  /**
   * Resolve a repository instance from this UoW context.
   * Inside a transaction, the returned repo uses the transactional client.
   * @param token - unique symbol identifying the repository
   */
  resolve<T>(token: symbol): T

  /**
   * Escape hatch: the raw database client (e.g. PrismaClient), for read-side
   * queries that don't yet have a dedicated repository (e.g. cross-aggregate
   * list/count queries). Inside a transaction it returns the transactional
   * client. Prefer repositories via resolve(); use this sparingly. Typed as
   * `any` to keep this application-layer port free of a Prisma dependency.
   */
  getClient(): any
}
