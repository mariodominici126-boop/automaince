(() => {
  const { h, money, ppApi, json, empty, badge } = window.printpilotHelpers;
  window.printpilotPages['printpilot-documents'] = async () => {
    const [docs, assets, cases] = await Promise.all([
      ppApi('/api/printpilot/documents'),
      ppApi('/api/printpilot/assets'),
      ppApi('/api/printpilot/countermeasures'),
    ]);
    return `<div class="pp-heading"><div><span class="pp-eyebrow">SDS · MANUALES · EVIDENCIAS</span><h2>Documentos</h2><p>Adjunta SDS y vincúlalos con el activo o la contramedida correspondiente.</p></div><button class="btn" onclick="ppDocumentForm()">+ Adjuntar documento</button></div><div class="card table-card">${docs.length ? `<table><thead><tr><th>DOCUMENTO</th><th>TIPO</th><th>ACTIVO</th><th>CASO / CONTRAMEDIDA</th><th>TAMAÑO</th><th>FECHA</th><th></th></tr></thead><tbody>${docs.map((d) => `<tr><td><b>${h(d.name)}</b><small>${h(d.original_filename)}</small></td><td>${h(d.document_type)}</td><td>${h(d.asset_id || 'General')}</td><td>${h(d.countermeasure_id || '—')}</td><td>${(Number(d.size_bytes) / 1024).toFixed(0)} KB</td><td>${h(String(d.created_at).slice(0, 10))}</td><td><button class="table-action" data-pp-action="document" data-id="${h(d.id)}">Abrir</button></td></tr>`).join('')}</tbody></table>` : empty('Aún no hay documentos. Adjunta aquí las hojas SDS.')}</div><p class="muted">${assets.length} activos disponibles · ${cases.length} contramedidas vinculables</p>`;
  };
  window.ppDocumentForm = async () => {
    const [assets, cases] = await Promise.all([
      ppApi('/api/printpilot/assets'),
      ppApi('/api/printpilot/countermeasures'),
    ]);
    window.openModal(
      `<h2>Adjuntar documento</h2><form class="form pp-form" onsubmit="ppUploadDocument(event)"><label>Nombre<input name="name" required></label><label>Tipo<select name="documentType"><option>SDS</option><option>MANUAL</option><option>FACTURA</option><option>EVIDENCIA</option><option>GENERAL</option></select></label><label class="wide">Activo relacionado<select name="assetId"><option value="">Documento general</option>${assets.map((a) => `<option value="${h(a.id)}">${h(a.code)} · ${h(a.name)}</option>`).join('')}</select></label><label class="wide">Contramedida relacionada<select name="countermeasureId"><option value="">No relacionada</option>${cases.map((c) => `<option value="${h(c.id)}">${h(c.id)} · ${h(c.title)}</option>`).join('')}</select></label><label class="wide">Archivo<input name="file" type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" required></label><p class="muted wide">PDF, Word, texto o imagen · Máximo 8 MB.</p><div class="modal-actions wide"><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button><button class="btn">Guardar en PostgreSQL</button></div></form>`,
    );
  };
  window.ppUploadDocument = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target),
      file = form.get('file');
    if (file.size > 8 * 1024 * 1024)
      return window.formError({ error: 'El archivo supera el límite de 8 MB.' });
    const reader = new FileReader();
    reader.onload = async () => {
      const contentBase64 = String(reader.result).split(',')[1];
      const body = {
        name: form.get('name'),
        documentType: form.get('documentType'),
        assetId: form.get('assetId') || null,
        countermeasureId: form.get('countermeasureId') || null,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        contentBase64,
      };
      const response = await window.apiRequest('/api/printpilot/documents', json('POST', body));
      if (!response.ok) return window.formError(await response.json());
      window.closeModal();
      window.navigate('printpilot-documents');
    };
    reader.readAsDataURL(file);
  };
  window.ppOpenDocument = async (id) => {
    const tab = window.open('about:blank', '_blank');
    const response = await window.apiRequest(`/api/printpilot/documents/${id}/file`);
    if (!response.ok) {
      tab?.close();
      return window.formError(await response.json());
    }
    const objectUrl = URL.createObjectURL(await response.blob());
    if (tab) tab.location = objectUrl;
    else {
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = 'documento-printpilot';
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(objectUrl), 120000);
  };
})();
