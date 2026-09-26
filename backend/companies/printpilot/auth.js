function authenticate() {
  return { status: 503, body: { error: 'La autenticación de PrintPilot aún no está conectada.' } };
}

module.exports = { authenticate };
