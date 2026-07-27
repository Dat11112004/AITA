/**
 * Jest configuration for the AITA backend (ESM + NodeNext + ts-jest).
 *
 * The project is native ESM ("type": "module") with NodeNext module resolution,
 * so source imports carry explicit ".js" specifiers. This config lets ts-jest
 * compile the ".ts" specs as ESM and rewrites the ".js" import specifiers back to
 * their TypeScript sources when Jest resolves them.
 *
 * Run with:  npm test            (all specs)
 *            npm test -- login   (filter by path)
 */
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleNameMapper: {
    // Strip the ".js" that NodeNext requires so Jest resolves the ".ts" source.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        // Tests intentionally build partial mocks and unused params; relax the
        // strict "noUnused*" flags the production build enforces.
        tsconfig: {
          isolatedModules: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
          verbatimModuleSyntax: false,
        },
      },
    ],
  },
}
