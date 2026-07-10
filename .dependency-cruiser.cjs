/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-no-angular-ionic',
      severity: 'error',
      comment:
        'Domain layer must be pure TypeScript — no Angular or Ionic framework imports allowed.',
      from: { path: '^src/app/domain' },
      to: { path: '^(@angular|@ionic)' },
    },
    {
      name: 'domain-no-dexie',
      severity: 'error',
      comment: 'Domain layer must never import Dexie — persistence is an infrastructure concern.',
      from: { path: '^src/app/domain' },
      to: { path: '^dexie' },
    },
    {
      name: 'domain-no-fflate',
      severity: 'error',
      comment: 'Domain layer must never import fflate — export/zip is an infrastructure concern.',
      from: { path: '^src/app/domain' },
      to: { path: '^fflate' },
    },
    {
      name: 'domain-no-application',
      severity: 'error',
      comment: 'Domain layer must not depend on the application layer (inward dependency only).',
      from: { path: '^src/app/domain' },
      to: { path: '^src/app/application' },
    },
    {
      name: 'domain-no-infrastructure',
      severity: 'error',
      comment: 'Domain layer must not depend on the infrastructure layer (inward dependency only).',
      from: { path: '^src/app/domain' },
      to: { path: '^src/app/infrastructure' },
    },
    {
      name: 'domain-no-presentation',
      severity: 'error',
      comment: 'Domain layer must not depend on the presentation layer (inward dependency only).',
      from: { path: '^src/app/domain' },
      to: { path: '^src/app/presentation' },
    },
    {
      name: 'application-no-infrastructure',
      severity: 'error',
      comment:
        'Application layer must depend only on domain ports and DI tokens, never directly on infrastructure implementations.',
      from: { path: '^src/app/application' },
      to: { path: '^src/app/infrastructure' },
    },
    {
      name: 'application-no-dexie',
      severity: 'error',
      comment: 'Application layer must never import Dexie directly.',
      from: { path: '^src/app/application' },
      to: { path: '^dexie' },
    },
    {
      name: 'application-no-fflate',
      severity: 'error',
      comment: 'Application layer must never import fflate directly.',
      from: { path: '^src/app/application' },
      to: { path: '^fflate' },
    },
    {
      name: 'dexie-only-in-indexeddb',
      severity: 'error',
      comment:
        'Dexie may only be imported inside infrastructure/persistence/indexeddb — it is the single confined persistence adapter.',
      from: { pathNot: '^src/app/infrastructure/persistence/indexeddb' },
      to: { path: '^dexie' },
    },
    {
      name: 'fflate-only-in-export',
      severity: 'error',
      comment:
        'fflate may only be imported inside infrastructure/export — it is confined to the zip export/import adapter.',
      from: { pathNot: '^src/app/infrastructure/export' },
      to: { path: '^fflate' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
