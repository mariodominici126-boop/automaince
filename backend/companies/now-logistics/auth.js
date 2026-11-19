const { scrypt, timingSafeEqual } = require('crypto');
const repository = require('../../../database/adapters/postgresRepository');

const authorizedUsers = [
  { username: 'yaifrynlo', nationalId: '07105563211' },
  { username: 'yanhoz', nationalId: '40214552362' },
];
const normalizeUsername = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const usersByLogin = new Map(authorizedUsers.map((user) => [normalizeUsername(user.username), user]));
const allowedUsers = new Set(usersByLogin.keys());

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
  const loginName = normalizeUsername(input.username);
  if (!loginName || !input.password)
    return { status: 400, body: { error: 'Escribe tu usuario y contraseña.' } };
  const account = usersByLogin.get(loginName);
  if (!account)
    return { status: 401, body: { error: 'Usuario o contraseña incorrectos.' } };
  const { rows } = await repository.query(
    `SELECT id,username,name,national_id,password_hash,role,active
     FROM technicians WHERE company_id='now' AND (username=$1 OR national_id=$2) AND active=true LIMIT 1`,
    [account.username, account.nationalId],
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
        username: account.username,
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

module.exports = { authenticate, verifyPassword, allowedUsers, normalizeUsername };
