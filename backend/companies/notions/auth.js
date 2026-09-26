function authenticate() {
  return { status: 503, body: { error: 'La autenticación de Notions Group aún no está conectada.' } };
}

module.exports = { authenticate };
