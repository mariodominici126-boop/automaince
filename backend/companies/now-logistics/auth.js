function authenticate() {
  return { status: 503, body: { error: 'La autenticación de NOW Logistics aún no está conectada.' } };
}

module.exports = { authenticate };
