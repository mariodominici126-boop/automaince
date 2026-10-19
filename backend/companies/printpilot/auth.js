const { scrypt, timingSafeEqual } = require('crypto');
const repository = require('../../../database/adapters/postgresRepository');

function verifyPassword(password, encoded) {
  const [algorithm,salt,expectedHex]=String(encoded||'').split('$');
  if(algorithm!=='scrypt'||!salt||!expectedHex)return Promise.resolve(false);
  return new Promise((resolve,reject)=>scrypt(String(password),salt,64,(error,derived)=>{
    if(error)return reject(error);
    const expected=Buffer.from(expectedHex,'hex');
    resolve(expected.length===derived.length&&timingSafeEqual(expected,derived));
  }));
}

async function authenticate(input={}) {
  const username=String(input.username||'').trim().toLowerCase();
  if(!username||!input.password)return {status:400,body:{error:'Escribe tu usuario y contraseña.'}};
  const {rows}=await repository.query(`SELECT id,username,name,national_id,company_name,password_hash,role,active
    FROM technicians WHERE company_id='printpilot' AND lower(username)=lower($1) LIMIT 1`,[username]);
  const user=rows[0];
  if(!user?.active||!(await verifyPassword(input.password,user.password_hash)))return {status:401,body:{error:'Usuario o contraseña incorrectos.'}};
  const initials=user.name.trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join('');
  return {status:200,body:{user:{id:user.id,username:user.username,displayName:user.name,initials,company:'PrintPilot',companyId:'printpilot',nationalId:user.national_id,role:user.role}}};
}

module.exports={authenticate,verifyPassword};
