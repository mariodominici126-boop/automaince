function authenticate(input, env = process.env) {
  if ((env.NODE_ENV === 'production' || env.PORT || env.RENDER_SERVICE_ID) && (!env.GTG_DEMO_USER || !env.GTG_DEMO_PASSWORD)) {
    return { status: 503, body: { error: 'El acceso GTG no está configurado en el servidor.' } };
  }

  const username = env.GTG_DEMO_USER || 'admin.gtg';
  const password = env.GTG_DEMO_PASSWORD || 'GtgDemo2026!';
  if (input.username !== username || input.password !== password) {
    return { status: 401, body: { error: 'Usuario o contraseña incorrectos.' } };
  }

  return {
    status: 200,
    body: { user: { company: 'GTG', displayName: 'Administrador GTG', initials: 'GTG' } },
  };
}

module.exports = { authenticate };
