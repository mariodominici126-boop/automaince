const service = require('./service');

function validId(value) {
  const id = String(value || '');
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id))
    throw new Error('El identificador no tiene un formato válido.');
  return id;
}

async function handle(req, res, url, session, parseBody, json) {
  if (session.companyId !== 'now')
    return json(res, 403, { error: 'Este módulo pertenece a NOW Logistics.' });
  const method = req.method;
  const path = url.pathname.replace(/\/$/, '');
  const user = session.user;
  if (method === 'GET') {
    if (path === '/api/now/dashboard') return json(res, 200, await service.dashboard());
    if (path === '/api/now/vehicles') return json(res, 200, await service.vehicles());
    if (path === '/api/now/maintenance') return json(res, 200, await service.maintenance());
    if (path === '/api/now/repairs') return json(res, 200, await service.repairs());
    if (path === '/api/now/fuel') return json(res, 200, await service.fuel());
    if (path === '/api/now/assignments') return json(res, 200, await service.assignments());
    if (path === '/api/now/providers') return json(res, 200, await service.providers());
    if (path === '/api/now/alerts') return json(res, 200, await service.alerts());
    if (path === '/api/now/audit') return json(res, 200, await service.auditLog());
  }
  if (method === 'POST') {
    const input = await parseBody(req);
    if (path === '/api/now/maintenance')
      return json(res, 201, await service.createMaintenance(input, user));
    if (path === '/api/now/repairs') return json(res, 201, await service.createRepair(input, user));
    if (path === '/api/now/fuel') return json(res, 201, await service.createFuel(input, user));
    if (path === '/api/now/assignments')
      return json(res, 201, await service.createAssignment(input, user));
    if (path === '/api/now/providers')
      return json(res, 201, await service.addProvider(input, user));
  }
  const vehicleMatch = path.match(/^\/api\/now\/vehicles\/([^/]+)$/);
  if (method === 'PATCH' && vehicleMatch)
    return json(
      res,
      200,
      await service.updateVehicle(validId(vehicleMatch[1]), await parseBody(req), user),
    );
  const rescheduleMatch = path.match(/^\/api\/now\/vehicles\/([^/]+)\/reschedule$/);
  if (method === 'POST' && rescheduleMatch)
    return json(
      res,
      200,
      await service.reschedule(validId(rescheduleMatch[1]), await parseBody(req), user),
    );
  return false;
}

module.exports = { handle };
