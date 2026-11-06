const nodeGlobals = Object.fromEntries(
  [
    'Buffer',
    '__dirname',
    '__filename',
    'clearInterval',
    'clearTimeout',
    'console',
    'exports',
    'module',
    'process',
    'require',
    'setInterval',
    'setTimeout',
    'URL',
  ].map((name) => [name, 'readonly']),
);

const browserGlobals = Object.fromEntries(
  [
    'AbortController',
    'alert',
    'Blob',
    'confirm',
    'document',
    'EventSource',
    'fetch',
    'FileReader',
    'FormData',
    'Headers',
    'localStorage',
    'location',
    'navigator',
    'pages',
    'sessionStorage',
    'setTimeout',
    'clearTimeout',
    'TextDecoder',
    'URL',
    'URLSearchParams',
    'window',
  ].map((name) => [name, 'readonly']),
);

module.exports = [
  { ignores: ['node_modules/**', 'target/**'] },
  {
    files: ['backend/server.js', 'backend/companies/printpilot/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    rules: { 'no-undef': 'error' },
  },
  {
    files: ['frontend/companies/printpilot/**/*.js', 'frontend/utils/app.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: browserGlobals,
    },
    rules: { 'no-undef': 'error' },
  },
];
