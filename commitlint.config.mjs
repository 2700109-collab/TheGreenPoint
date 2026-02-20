/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting (no code change)
        'refactor', // Code restructuring
        'perf',     // Performance improvement
        'test',     // Adding tests
        'build',    // Build system changes
        'ci',       // CI config changes
        'chore',    // Maintenance
        'revert',   // Revert commit
      ],
    ],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 100],
  },
};
