const { scrypt, timingSafeEqual } = require('crypto');
const repository = require('../../../database/adapters/postgresRepository');

const allowedUsers = new Set(['07105563211', '40214552362']);

function verifyPassword(password, encoded) {
  const [algorithm, salt, expectedHex] = String(encoded || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return Promise.resolve(false);
  return new Promise((resolve, reject) =>
    scrypt(String(password), salt, 64, (error, derived) => {
      if (error) return reject(error);
      const expected = Buffer.from(expectedHex, 'hex');
      resolve(expected.length === derived.length && timingSafeEqual(expected, derived));
    }),
  );
}

async function authenticate(input = {}) {
  const username = String(input.username || '').trim();
  if (!username || !input.password)
    return { status: 400, body: { error: 'Escribe la cédula y la contraseña asignada.' } };
  if (!allowedUsers.has(username))
    return { status: 401, body: { error: 'Usuario o contraseña incorrectos.' } };
  const { rows } = await repository.query(
    `SELECT id,username,name,national_id,password_hash,role,active
     FROM technicians WHERE company_id='now' AND national_id=$1 AND active=true LIMIT 1`,
    [username],
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(input.password, user.password_hash)))
    return { status: 401, body: { error: 'Usuario o contraseña incorrectos.' } };
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return {
    status: 200,
    body: {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.name,
        initials,
        company: 'now',
        companyId: 'now',
        nationalId: user.national_id,
        role: user.role,
      },
    },
  };
}

module.exports = { authenticate, verifyPassword, allowedUsers };
