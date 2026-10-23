const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const repository = require('../database/adapters/postgresRepository');
const { metrics } = require('./services/analytics_service/analyticsService');
const { alerts } = require('./services/alert_service/alertService');
const { anomalies } = require('../intelligence/anomaly_detection/anomalyService');
const { risk } = require('../intelligence/prioritization/riskService');
const orders = require('./services/maintenance_service/maintenanceOrderService');
const printpilotRoutes = require('./companies/printpilot/routes');

const companyAuth = {
  gtg: require('./companies/gtg/auth'),
  notions: require('./companies/notions/auth'),
  now: require('./companies/now-logistics/auth'),
  printpilot: require('./companies/printpilot/auth'),
};
const root = path.resolve(__dirname, '..');
const frontendRoot = path.join(root, 'frontend');
const sessions = new Map();
const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const eventClients = new Map();

async function companyData(companyId) {
  const entries=await Promise.all(repository.collections.map(async name=>[name,await repository.list(name,companyId)]));
  return Object.fromEntries(entries);
}
function getSession(req, url) {
  const bearer=req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token=bearer||url.searchParams.get('token'),session=token&&sessions.get(token);
  if(!session||session.expiresAt<=Date.now()){if(token)sessions.delete(token);return null;}
  return session;
}
function publishChange(companyId) {
  for(const [client,clientCompany] of eventClients)if(clientCompany===companyId)client.write('event: data-changed\ndata: {}\n\n');
}
const json=(res,status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(payload));};
const parseBody=req=>new Promise((resolve,reject)=>{
  let raw='',length=0;
  req.on('data',chunk=>{length+=chunk.length;if(length>12*1024*1024){reject(Object.assign(new Error('El archivo o solicitud supera 12 MB.'),{code:'BODY_TOO_LARGE'}));req.destroy();return;}raw+=chunk;});
  req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{});}catch{reject(new Error('JSON inválido.'));}});
  req.on('error',reject);
});
function serve(res,file) {
  const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2'};
  fs.readFile(file,(error,content)=>{if(error)return json(res,404,{error:'Archivo no encontrado.'});res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'text/plain'});res.end(content);});
}
function resolveFrontendFile(urlPath) {
  let decodedPath;
  try { decodedPath=decodeURIComponent(urlPath); } catch { return null; }
  if(decodedPath==='/')return path.join(frontendRoot,'index.html');
  if(!decodedPath.startsWith('/frontend/'))return null;
  const file=path.resolve(frontendRoot,decodedPath.slice('/frontend/'.length));
  return file.startsWith(`${frontendRoot}${path.sep}`)?file:null;
}
async function detail(item,data,companyId) {
  return {...item,maintenance:data.maintenance.filter(x=>x.vehicleId===item.id),fuel:data.fuel.filter(x=>x.vehicleId===item.id),repairs:data.repairs.filter(x=>x.vehicleId===item.id),documents:data.documents.filter(x=>x.vehicleId===item.id),orders:(await orders.list(companyId)).filter(x=>x.vehicleId===item.id),risk:risk(item,data)};
}
function vehicle(input,data) {
  if(!input.plate?.trim()||!input.brand?.trim()||!input.model?.trim())throw new Error('Placa, marca y modelo son obligatorios.');
  if(!Number.isInteger(Number(input.year))||Number(input.year)<1950||Number(input.year)>new Date().getFullYear()+1)throw new Error('El año no es válido.');
  if(data.vehicles.some(item=>item.plate.toLowerCase()===input.plate.trim().toLowerCase()))throw new Error('Ya existe un vehículo con esa placa.');
  return {id:`V-${String(data.vehicles.length+1).padStart(3,'0')}`,status:'Activo',mileage:0,failures:0,downtime:0,monthlyCost:0,baseConsumption:0,recentConsumption:0,...input,plate:input.plate.trim(),year:Number(input.year)};
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  try {
    if(url.pathname.startsWith('/api/auth/')&&url.pathname!=='/api/auth/logout'&&req.method==='POST'){
      const companyId=url.pathname.slice('/api/auth/'.length),auth=companyAuth[companyId];
      if(!auth)return json(res,404,{error:'Empresa no encontrada.'});
      const result=await auth.authenticate(await parseBody(req));
      if(result.status!==200)return json(res,result.status,result.body);
      const token=randomBytes(32).toString('hex');
      sessions.set(token,{companyId,user:result.body.user,expiresAt:Date.now()+sessionLifetimeMs});
      return json(res,200,{...result.body,token});
    }
    if(url.pathname.startsWith('/api/')){
      const session=getSession(req,url);
      if(!session)return json(res,401,{error:'La sesión expiró. Inicia sesión de nuevo.'});
      const {companyId}=session;
      if(url.pathname==='/api/auth/logout'&&req.method==='POST'){
        const token=req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];if(token)sessions.delete(token);return json(res,200,{ok:true});
      }
      if(url.pathname==='/api/events'&&req.method==='GET'){
        res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});res.write(': connected\n\n');eventClients.set(res,companyId);res.on('close',()=>eventClients.delete(res));return;
      }
      if(url.pathname.startsWith('/api/printpilot/')){
        if(companyId!=='printpilot')return json(res,403,{error:'Este módulo pertenece a PrintPilot.'});
        const handled=await printpilotRoutes.handle(req,res,url,session,parseBody,json);
        if(handled!==false){if(['POST','PATCH','DELETE'].includes(req.method)&&res.statusCode<400)publishChange(companyId);return;}
        return json(res,404,{error:'Ruta PrintPilot no encontrada.'});
      }
      if(req.method==='GET'){
        if(url.pathname==='/api/companies')return json(res,200,await repository.listCompanies());
        if(url.pathname==='/api/dashboard'){
          const [data,orderList]=await Promise.all([companyData(companyId),orders.list(companyId)]);
          return json(res,200,{...metrics(data),alerts:alerts(data),orders:orderList});
        }
        if(url.pathname==='/api/vehicles')return json(res,200,await repository.list('vehicles',companyId));
        if(url.pathname.startsWith('/api/vehicles/')){
          const item=await repository.find('vehicles',url.pathname.split('/').pop(),companyId);
          return item?json(res,200,await detail(item,await companyData(companyId),companyId)):json(res,404,{error:'Vehículo no encontrado.'});
        }
        if(url.pathname==='/api/maintenance')return json(res,200,await repository.list('maintenance',companyId));
        if(url.pathname==='/api/orders')return json(res,200,await orders.list(companyId));
        if(url.pathname==='/api/fuel')return json(res,200,await repository.list('fuel',companyId));
        if(url.pathname==='/api/repairs')return json(res,200,await repository.list('repairs',companyId));
        if(url.pathname==='/api/parts')return json(res,200,await repository.list('parts',companyId));
        if(url.pathname==='/api/documents')return json(res,200,await repository.list('documents',companyId));
        if(url.pathname==='/api/alerts')return json(res,200,alerts(await companyData(companyId)));
        if(url.pathname==='/api/analytics')return json(res,200,metrics(await companyData(companyId)));
        if(url.pathname==='/api/intelligence'){
          const data=await companyData(companyId);return json(res,200,{anomalies:anomalies(data),risks:data.vehicles.map(item=>risk(item,data))});
        }
      }
      if(req.method==='POST'&&url.pathname==='/api/vehicles'){
        const data=await companyData(companyId),item=await repository.create('vehicles',vehicle(await parseBody(req),data),companyId);publishChange(companyId);return json(res,201,item);
      }
      if(req.method==='POST'&&url.pathname==='/api/orders'){
        const input=await parseBody(req);if(!await repository.find('vehicles',input.vehicleId,companyId))throw new Error('El vehículo no pertenece a esta empresa.');
        const item=await orders.create(input,companyId);publishChange(companyId);return json(res,201,item);
      }
      if(req.method==='POST'&&url.pathname==='/api/maintenance'){
        const input=await parseBody(req);if(!input.vehicleId||Number(input.mileage)<0||Number(input.cost)<0)throw new Error('Revise vehículo, kilometraje y costo.');
        if(!await repository.find('vehicles',input.vehicleId,companyId))throw new Error('El vehículo no pertenece a esta empresa.');
        const item=await repository.create('maintenance',{id:`M-${Date.now()}`,...input,cost:Number(input.cost),mileage:Number(input.mileage)},companyId);publishChange(companyId);return json(res,201,item);
      }
      if(req.method==='POST'&&url.pathname==='/api/fuel'){
        const input=await parseBody(req);if(!input.vehicleId||!input.date||Number(input.mileage)<0||Number(input.liters)<=0||Number(input.cost)<0||!input.provider?.trim())throw new Error('Revise vehículo, fecha, kilometraje, litros, costo y proveedor.');
        if(!await repository.find('vehicles',input.vehicleId,companyId))throw new Error('El vehículo no pertenece a esta empresa.');
        const item=await repository.create('fuel',{id:`F-${Date.now()}`,...input,mileage:Number(input.mileage),liters:Number(input.liters),cost:Number(input.cost)},companyId);publishChange(companyId);return json(res,201,item);
      }
      if(req.method==='PATCH'&&url.pathname.startsWith('/api/orders/')){
        const item=await orders.advance(url.pathname.split('/').pop(),companyId);if(!item)return json(res,404,{error:'Orden no encontrada.'});publishChange(companyId);return json(res,200,item);
      }
      return json(res,404,{error:'Ruta no encontrada.'});
    }
    if(!['GET','HEAD'].includes(req.method))return json(res,404,{error:'Ruta no encontrada.'});
    const requestedFile=resolveFrontendFile(url.pathname);
    if(!requestedFile)return json(res,404,{error:'Archivo no encontrado.'});
    return serve(res,requestedFile);
  }catch(error){
    if(res.writableEnded)return;
    const status=error.code==='23505'?409:error.code==='MAIL_NOT_CONFIGURED'||error.code==='MAIL_SEND_FAILED'?503:error.code==='BODY_TOO_LARGE'?413:error.code==='ECONNREFUSED'||error.code==='ENOTFOUND'?503:400;
    return json(res,status,{error:error.message||'No se pudo completar la operación.'});
  }
});

async function start(){
  await repository.initialize();
  const port=Number(process.env.PORT||3000),host=process.env.HOST||(process.env.PORT?'0.0.0.0':'127.0.0.1');
  server.listen(port,host,()=>{console.log(`AutoMaince en http://${host}:${port}`);console.log(`Base de datos PostgreSQL: ${process.env.DATABASE_URL?'DATABASE_URL':'127.0.0.1:5432/automaince'}`);});
}
if(require.main===module)start().catch(error=>{console.error('No se pudo iniciar PostgreSQL. Revisa DATABASE_URL y que el servicio esté iniciado.',error.message);process.exitCode=1;});

module.exports={server,resolveFrontendFile};
