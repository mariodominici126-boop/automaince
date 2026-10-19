const service = require('./service');

async function handle(req,res,url,session,parseBody,json) {
  const method=req.method,path=url.pathname.replace(/\/$/,'');
  const user=session.user;
  if(method==='GET'&&path==='/api/printpilot/dashboard')return json(res,200,await service.dashboard());
  if(method==='GET'&&path==='/api/printpilot/assets')return json(res,200,await service.listAssets(url.searchParams.get('category')));
  if(method==='POST'&&path==='/api/printpilot/assets')return json(res,201,await service.addAsset(await parseBody(req),user));
  if(method==='GET'&&/^\/api\/printpilot\/assets\/[^/]+\/readings$/.test(path))return json(res,200,await service.listAssetReadings(path.split('/')[4]));
  if(method==='POST'&&/^\/api\/printpilot\/assets\/[^/]+\/readings$/.test(path))return json(res,201,await service.addAssetReading(path.split('/')[4],await parseBody(req),user));
  if(method==='PATCH'&&path.startsWith('/api/printpilot/assets/')){
    const result=await service.updateAsset(path.split('/').pop(),await parseBody(req),user);
    return result?json(res,200,result):json(res,404,{error:'Activo no encontrado.'});
  }
  if(method==='GET'&&path==='/api/printpilot/technicians')return json(res,200,await service.listTechnicians());
  if(method==='POST'&&path==='/api/printpilot/technicians'){
    if(user.role!=='ADMINISTRADOR')return json(res,403,{error:'Solo un administrador puede registrar técnicos.'});
    return json(res,201,await service.addTechnician(await parseBody(req),user));
  }
  if(method==='PATCH'&&path.startsWith('/api/printpilot/technicians/')){
    if(user.role!=='ADMINISTRADOR')return json(res,403,{error:'Solo un administrador puede modificar técnicos.'});
    const result=await service.updateTechnician(path.split('/').pop(),await parseBody(req),user);
    return result?json(res,200,result):json(res,404,{error:'Técnico no encontrado.'});
  }
  if(method==='GET'&&path==='/api/printpilot/plans')return json(res,200,await service.listPlans());
  if(method==='POST'&&path==='/api/printpilot/plans')return json(res,201,await service.createPlan(await parseBody(req),user));
  if(method==='GET'&&path==='/api/printpilot/orders')return json(res,200,await service.listOrders(url.searchParams.get('from'),url.searchParams.get('to')));
  if(method==='GET'&&path==='/api/printpilot/maintenance')return json(res,200,await service.listMaintenance());
  if(method==='POST'&&path==='/api/printpilot/maintenance')return json(res,201,await service.completeOrder(await parseBody(req),user));
  if(method==='GET'&&path==='/api/printpilot/countermeasures')return json(res,200,await service.listCountermeasures());
  if(method==='POST'&&path==='/api/printpilot/countermeasures')return json(res,201,await service.createCountermeasure(await parseBody(req),user));
  if(method==='PATCH'&&path.startsWith('/api/printpilot/countermeasures/')){
    const result=await service.updateCountermeasure(path.split('/').pop(),await parseBody(req),user);
    return result?json(res,200,result):json(res,404,{error:'Contramedida no encontrada.'});
  }
  if(method==='GET'&&path==='/api/printpilot/supplies')return json(res,200,await service.listSupplies());
  if(method==='GET'&&path==='/api/printpilot/supplies/movements')return json(res,200,await service.supplyMovements());
  if(method==='POST'&&path.startsWith('/api/printpilot/supplies/')&&path.endsWith('/movements')){
    const id=path.split('/')[4];return json(res,201,await service.recordSupplyMovement(id,await parseBody(req),user));
  }
  if(method==='POST'&&path.startsWith('/api/printpilot/supplies/')&&path.endsWith('/purchase')){
    const id=path.split('/')[4];return json(res,201,await service.requestPurchase(id,await parseBody(req),user));
  }
  if(method==='GET'&&path==='/api/printpilot/documents')return json(res,200,await service.documents());
  if(method==='POST'&&path==='/api/printpilot/documents')return json(res,201,await service.addDocument(await parseBody(req),user));
  if(method==='GET'&&path.startsWith('/api/printpilot/documents/')&&path.endsWith('/file')){
    const id=path.split('/')[4],item=await service.documentContent(id);
    if(!item)return json(res,404,{error:'Archivo no encontrado.'});
    const filename=String(item.original_filename).replace(/[\r\n"\\]/g,'_');
    res.writeHead(200,{'Content-Type':item.mime_type,'Content-Length':item.contents.length,'Content-Disposition':`inline; filename="${filename}"`,'X-Content-Type-Options':'nosniff'});return res.end(item.contents);
  }
  if(method==='GET'&&path==='/api/printpilot/reports')return json(res,200,await service.report({assetId:url.searchParams.get('assetId'),from:url.searchParams.get('from'),to:url.searchParams.get('to'),technicianId:url.searchParams.get('technicianId'),kind:url.searchParams.get('kind')}));
  if(method==='GET'&&path==='/api/printpilot/audit')return json(res,200,await service.auditLog());
  return false;
}

module.exports={handle};
