(() => {
  const { h, money, ppApi, json, empty, badge } = window.printpilotHelpers;
  window.printpilotPages['printpilot-supplies'] = async () => {
    const [items, movements] = await Promise.all([
      ppApi('/api/printpilot/supplies'),
      ppApi('/api/printpilot/supplies/movements'),
    ]);
    return `<div class="pp-heading"><div><span class="pp-eyebrow">CONSUMIBLES DE PRODUCCIÓN</span><h2>Insumos</h2><p>Control de gas y tinta. Cada solicitud de gas debe generar un correo a Compras.</p></div></div><div class="grid pp-supply-grid">${items.map((i) => `<article class="card pp-supply"><span class="pp-eyebrow">${h(i.kind)}</span><h3>${h(i.name)}</h3><b>${h(i.quantity)} ${h(i.unit)}</b><small>Existencia mínima: ${h(i.minimum_quantity)} ${h(i.unit)}</small><div><button class="btn" data-pp-action="supplyIn" data-id="${h(i.id)}">Registrar entrada</button><button class="btn secondary" data-pp-action="supplyUse" data-id="${h(i.id)}">Registrar uso</button><button class="btn secondary" data-pp-action="purchase" data-id="${h(i.id)}">Ordenar</button></div></article>`).join('')}</div><div class="card table-card pp-top-space"><h3 class="section-title">Movimientos recientes</h3>${movements.length ? `<table><thead><tr><th>FECHA</th><th>INSUMO</th><th>MOVIMIENTO</th><th>CANTIDAD</th><th>TÉCNICO</th><th>NOTA</th></tr></thead><tbody>${movements.map((m) => `<tr><td>${h(String(m.created_at).slice(0, 10))}</td><td>${h(m.supply_name)}</td><td>${h(m.movement_type)}</td><td>${h(m.quantity)}</td><td>${h(m.technician_name || '—')}</td><td>${h(m.note)}</td></tr>`).join('')}</tbody></table>` : empty('Aún no hay movimientos registrados.')}</div>`;
  };
  window.ppSupplyMovement = async (id, movementType) => {
    const isEntry = movementType === 'ENTRADA';
    window.openModal(
      `<h2>${isEntry ? 'Registrar entrada de insumo' : 'Registrar uso de insumo'}</h2><form class="form" data-pp-submit="save-supply" data-id="${h(id)}" data-movement-type="${h(movementType)}"><label>${isEntry ? 'Cantidad recibida' : 'Cantidad utilizada'}<input type="number" name="quantity" min="0.01" step="0.01" required></label><label>Nota<input name="note" placeholder="${isEntry ? 'Proveedor o referencia' : 'Detalle del uso'}"></label><div class="modal-actions wide"><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button><button class="btn">Guardar ${isEntry ? 'entrada' : 'consumo'}</button></div></form>`,
    );
  };
  window.ppSaveSupply = async (event, id, movementType) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    data.quantity = Number(data.quantity);
    data.movementType = movementType;
    const response = await window.apiRequest(
      `/api/printpilot/supplies/${id}/movements`,
      json('POST', data),
    );
    if (!response.ok) return window.formError(await response.json());
    window.closeModal();
    window.navigate('printpilot-supplies');
  };
  window.ppPurchase = async (id) => {
    const item = (await ppApi('/api/printpilot/supplies')).find((x) => x.id === id);
    if (!item) return;
    window.openModal(
      `<h2>Ordenar ${h(item.name)}</h2><p class="muted">${item.kind === 'GAS' ? 'Al confirmar, el sistema enviará automáticamente una solicitud a printpilot@notions.com.do. Si Gmail no está configurado, el sistema no registrará el pedido.' : 'Registra una solicitud de compra del insumo.'}</p><form class="form" data-pp-submit="send-purchase" data-id="${h(id)}"><label>Cantidad (${h(item.unit)})<input type="number" name="quantity" min="0.01" step="0.01" required></label><label class="wide">Nota<input name="note"></label><div class="modal-actions wide"><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button><button class="btn">${item.kind === 'GAS' ? 'Enviar solicitud a Compras' : 'Registrar solicitud'}</button></div></form>`,
    );
  };
  window.ppSendPurchase = async (event, id) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    body.quantity = Number(body.quantity);
    const response = await window.apiRequest(
      `/api/printpilot/supplies/${id}/purchase`,
      json('POST', body),
    );
    const result = await response.json();
    if (!response.ok) return window.formError(result);
    window.closeModal();
    alert(
      result.emailStatus === 'ENVIADO'
        ? `Aviso enviado a ${result.recipient}.`
        : 'Solicitud registrada.',
    );
    window.navigate('printpilot-supplies');
  };
})();
