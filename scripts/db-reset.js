const { URL } = require('node:url');
const repository = require('../database/adapters/postgresRepository');

function assertLocalDemoDatabase(connectionString) {
  if (process.env.NODE_ENV === 'production') throw new Error('El reinicio está deshabilitado en producción.');
  const connection = new URL(connectionString);
  const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
  if (!localHosts.has(connection.hostname) || connection.pathname.slice(1) !== 'automaince') {
    throw new Error('Protección activada: db:reset solo funciona con la base local automaince en localhost.');
  }
}

async function reset() {
  assertLocalDemoDatabase(repository.connectionString);
  try {
    await repository.pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await repository.pool.query('CREATE SCHEMA public AUTHORIZATION CURRENT_USER');
    await repository.initialize();
    console.log('Base local automaince recreada. Se cargaron el esquema, los activos PrintPilot y la cuenta de demostración.');
  } finally {
    await repository.close();
  }
}

if (require.main === module) reset().catch(error => { console.error(error.message); process.exitCode = 1; });

module.exports = { assertLocalDemoDatabase, reset };
