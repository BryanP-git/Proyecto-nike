/*
 Armario · servidor (Node + MySQL de XAMPP).
 Datos en MySQL: productos, inventario por talla, usuarios, sesiones, pedidos, historial de estados y PQRS.
*/
const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto"),os=require("os");
const CFG=require("./config"),DB=require("./db"),{q,one,tx}=DB;
const {sizesOf}=require("./catalog"),RULES=require("./rules.json"),COUNTRIES=require("./countries.json");

const bad=(f,m)=>{throw Object.assign(new Error(m),{field:f})};
const fail=(code,m)=>{throw Object.assign(new Error(m),{code})};
function chkRule(k,v){const r=RULES[k];v=String(v??"");if(r.min&&v.length<r.min)return`Mínimo ${r.min} caracteres`;if(v.length>r.max)return`Máximo ${r.max} caracteres`;return r.re&&!new RegExp(r.re,"u").test(v)?r.msg:""}
function chkPass(v){v=String(v??"");const r=RULES.password;if(v.length<r.min)return`Mínimo ${r.min} caracteres`;if(v.length>r.max)return`Máximo ${r.max} caracteres`;for(const c of r.checks)if(!new RegExp(c.re).test(v))return`Contraseña no válida: ${c.t.toLowerCase()}`;return""}
function chkPhone(cc,n){const p=COUNTRIES.find(x=>x.c===cc),d=String(n??"").replace(/[\s-]/g,""),r=m=>({err:m});
 if(!p)return r("País no válido");if(!d)return r("Ingresa tu número");if(!/^\d+$/.test(d))return r("Solo números");
 if(d.length<p.min||d.length>p.max)return r(p.min===p.max?`Debe tener ${p.min} dígitos`:`Debe tener entre ${p.min} y ${p.max} dígitos`);
 if(p.re&&!new RegExp(p.re).test(d))return r(`No parece un celular de ${p.n}`);return{cc:p.c,n:d,full:`+${p.d} ${d}`}}
const EMAIL=/^\S+@\S+\.\S+$/,cl=(s,n)=>String(s??"").trim().slice(0,n);

/* ---------- contraseñas y sesiones (en la base se guarda solo el hash del token) ---------- */
const hashPw=(pw,salt)=>crypto.scryptSync(String(pw),salt,32).toString("hex");
const sha=t=>crypto.createHash("sha256").update(t).digest("hex");
const samePw=(u,pw)=>{const a=Buffer.from(u.hash),b=Buffer.from(hashPw(pw,u.salt));return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const pub=u=>({id:u.id,username:u.nombre,email:u.email,phone:u.telefono,pc:u.pais,pn:u.celular,address:u.direccion,city:u.ciudad,avatar:u.avatar||""});
async function startSession(u){const t=crypto.randomBytes(32).toString("hex");await q("INSERT INTO sesiones(token,usuario_id,expira) VALUES (?,?,DATE_ADD(NOW(),INTERVAL 30 DAY))",[sha(t),u.id]);return{token:t,user:pub(u)}}
const tokenOf=req=>(req.headers.authorization||"").slice(7);
const sessUser=async req=>{const t=tokenOf(req);if(!/^[a-f0-9]{64}$/.test(t))return null;return one("SELECT u.* FROM sesiones s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token=? AND s.expira>NOW()",[sha(t)])};
/* freno a la fuerza bruta: máximo 8 intentos fallidos cada 15 minutos por IP + usuario */
const tries=new Map();
const tooMany=k=>{const t=tries.get(k);return t&&t.n>=8&&Date.now()-t.t<9e5};
const failed=k=>{const t=tries.get(k);tries.set(k,!t||Date.now()-t.t>9e5?{n:1,t:Date.now()}:{n:t.n+1,t:t.t})};

/* ---------- catálogo con inventario por color y talla ---------- */
async function catalog(){
 const ps=await q("SELECT id,genero,categoria,nombre,precio FROM productos WHERE activo=1 ORDER BY genero,categoria,orden");
 const inv=await q("SELECT i.producto_id,i.color,i.talla,i.stock FROM inventario i JOIN productos p ON p.id=i.producto_id WHERE p.activo=1 ORDER BY i.producto_id,i.color,i.posicion");
 const by={};for(const r of inv)((by[r.producto_id]??={})[r.color]??={})[r.talla]=r.stock;
 const out={hombre:{},mujer:{}};
 for(const p of ps){const iv=by[p.id]||{},c=Object.keys(iv);if(!c.length)continue;
  const sz=Object.keys(iv[c[0]]);
  (out[p.genero][p.categoria]??=[]).push({id:p.id,n:p.nombre,p:p.precio,c,sz,inv:iv})}
 return out;
}
const shipping=sub=>sub>=CFG.envio.gratisDesde?0:CFG.envio.costo;

/* ---------- pedidos ---------- */
const ORDER_SQL="SELECT * FROM pedidos";
async function orderOut(o,withHist=true){
 if(!o)return null;
 const items=await q("SELECT producto_id id,nombre n,color col,talla size,cantidad q,precio price FROM pedido_items WHERE pedido_id=? ORDER BY id",[o.id]);
 const hist=withHist?await q("SELECT estado,nota,fecha FROM pedido_historial WHERE pedido_id=? ORDER BY id",[o.id]):[];
 return{id:o.codigo,invoice:o.factura,date:o.fecha,customer:{name:o.cliente_nombre,email:o.cliente_email,phone:o.cliente_telefono,address:o.cliente_direccion,city:o.cliente_ciudad},
  items,subtotal:o.subtotal,shipping:o.envio,total:o.total,base:o.base,iva:o.iva,
  payment:o.metodo==="tarjeta"?{method:"tarjeta",brand:o.franquicia,last4:o.ultimos4,kind:o.tipo_tarjeta,cuotas:o.cuotas}:{method:"contraentrega"},
  status:o.estado,history:hist,canCancel:["nuevo","pagado"].includes(o.estado)};
}
async function createOrder(b,uid){
 const c=b.customer||{};
 const cu={name:cl(c.name,80),email:cl(c.email,100).toLowerCase(),phone:cl(c.phone,30),address:cl(c.address,160),city:cl(c.city,60)};
 if(!cu.name||!EMAIL.test(cu.email)||!cu.address||!cu.city)throw new Error("Datos del cliente incompletos");
 if(b.terms!==true)throw new Error("Debes aceptar los términos y la política de datos");
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>30)throw new Error("El carrito está vacío");
 /* forma de pago: tarjeta (solo franquicia + últimos 4; nunca el número completo ni el CVV) o contra entrega */
 const pm=b.payment||{};let pay;
 if(pm.method==="tarjeta"){
  const brand=["visa","mastercard","amex","diners"].includes(pm.brand)?pm.brand:"",last4=String(pm.last4||"");
  if(!brand||!/^\d{4}$/.test(last4))throw new Error("Datos de la tarjeta incompletos");
  const kind=pm.kind==="debito"?"debito":"credito",cuotas=kind==="credito"&&[1,2,3,6,12,24,36].includes(+pm.cuotas)?+pm.cuotas:1;
  pay={method:"tarjeta",brand,last4,kind,cuotas};
 }else if(pm.method==="contraentrega")pay={method:"contraentrega"};
 else throw new Error("Elige una forma de pago");
 /* junta líneas repetidas (mismo producto, color y talla) */
 const want=new Map();
 for(const it of b.items){
  const qn=Number(it.q);if(!Number.isInteger(qn)||qn<1||qn>99)throw new Error("Cantidad inválida (máximo 99 por prenda)");
  const k=[cl(it.id,40),cl(it.col,30),cl(it.size,6)].join("|");want.set(k,(want.get(k)||0)+qn);
 }
 return tx(async x=>{
  const lines=[];
  for(const [k,qn] of want){
   const [id,col,size]=k.split("|");
   const p=(await x("SELECT id,nombre,precio,activo FROM productos WHERE id=?",[id]))[0];
   if(!p||!p.activo)throw new Error("Uno de los productos ya no está disponible");
   /* resta el stock solo si alcanza (en una sola sentencia: dos compras al tiempo no pueden dejarlo negativo) */
   const r=await x("UPDATE inventario SET stock=stock-? WHERE producto_id=? AND color=? AND talla=? AND stock>=?",[qn,id,col,size,qn]);
   if(!r.affectedRows){const s=(await x("SELECT stock FROM inventario WHERE producto_id=? AND color=? AND talla=?",[id,col,size]))[0];
    throw new Error(!s?`${p.nombre}: no existe en color ${col} talla ${size}`:s.stock?`${p.nombre} talla ${size}: solo quedan ${s.stock}`:`${p.nombre} talla ${size} está agotado`)}
   lines.push({id,n:p.nombre,col,size,q:qn,price:p.precio});
  }
  const sub=lines.reduce((a,l)=>a+l.price*l.q,0),env=shipping(sub),total=sub+env,base=Math.round(total/1.19);
  const code="A-"+crypto.randomBytes(3).toString("hex").toUpperCase(),estado=pay.method==="tarjeta"?"pagado":"nuevo";
  const r=await x(`INSERT INTO pedidos(codigo,usuario_id,fecha,cliente_nombre,cliente_email,cliente_telefono,cliente_direccion,cliente_ciudad,subtotal,envio,total,base,iva,metodo,franquicia,ultimos4,tipo_tarjeta,cuotas,estado,acepta_terminos)
   VALUES (?,?,NOW(),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,[code,uid||null,cu.name,cu.email,cu.phone,cu.address,cu.city,sub,env,total,base,total-base,pay.method,pay.brand||null,pay.last4||null,pay.kind||null,pay.cuotas||null,estado]);
  const pid=r.insertId;
  await x("UPDATE pedidos SET factura=CONCAT('NK-',LPAD(id,6,'0')) WHERE id=?",[pid]);
  await x("INSERT INTO pedido_items(pedido_id,producto_id,nombre,color,talla,cantidad,precio) VALUES ?",[lines.map(l=>[pid,l.id,l.n,l.col,l.size,l.q,l.price])]);
  await x("INSERT INTO pedido_historial(pedido_id,estado,nota,fecha) VALUES (?,?,?,NOW())",[pid,estado,pay.method==="tarjeta"?"Pago aprobado (demostración)":"Pedido recibido · pago contra entrega"]);
  return pid;
 }).then(async pid=>orderOut(await one(ORDER_SQL+" WHERE id=?",[pid])));
}
/* cambia el estado; si se cancela, devuelve las unidades al inventario */
async function setStatus(code,status,nota,onlyFrom){
 return tx(async x=>{
  const o=(await x("SELECT id,estado FROM pedidos WHERE codigo=? FOR UPDATE",[code]))[0];if(!o)fail(404,"Pedido no existe");
  if(onlyFrom&&!onlyFrom.includes(o.estado))fail(400,"Este pedido ya no se puede cancelar: ya fue enviado o cancelado");
  if(o.estado===status)return o.id;
  if(o.estado==="cancelado")fail(400,"El pedido ya estaba cancelado");
  if(status==="cancelado")for(const l of await x("SELECT producto_id,color,talla,cantidad FROM pedido_items WHERE pedido_id=?",[o.id]))
   await x("UPDATE inventario SET stock=stock+? WHERE producto_id=? AND color=? AND talla=?",[l.cantidad,l.producto_id,l.color,l.talla]);
  await x("UPDATE pedidos SET estado=? WHERE id=?",[status,o.id]);
  await x("INSERT INTO pedido_historial(pedido_id,estado,nota,fecha) VALUES (?,?,?,NOW())",[o.id,status,cl(nota,160)]);
  return o.id;
 }).then(async id=>orderOut(await one(ORDER_SQL+" WHERE id=?",[id])));
}

/* ---------- PQRS (peticiones, quejas, reclamos, sugerencias, retracto, garantía) con número de radicado ---------- */
const PQ_TIPOS=["peticion","queja","reclamo","sugerencia","retracto","garantia"];
async function createPqrs(b,u){
 const t=PQ_TIPOS.includes(b.tipo)?b.tipo:bad("tipo","Elige el tipo de solicitud");
 const nombre=cl(u?u.nombre:b.nombre,80),email=cl(u?u.email:b.email,100).toLowerCase(),msg=cl(b.mensaje,2000),ped=cl(b.pedido,12).toUpperCase()||null;
 if(nombre.length<3)bad("nombre","Escribe tu nombre");if(!EMAIL.test(email))bad("email","Correo no válido");
 if(msg.length<10)bad("mensaje","Cuéntanos un poco más (mínimo 10 caracteres)");
 if(["retracto","garantia","reclamo"].includes(t)&&!ped)bad("pedido","Escribe el código del pedido (ej. A-1B2C3D)");
 if(ped&&!(await one(u?"SELECT id FROM pedidos WHERE codigo=? AND (cliente_email=? OR usuario_id=?)":"SELECT id FROM pedidos WHERE codigo=? AND cliente_email=?",u?[ped,email,u.id]:[ped,email])))bad("pedido","No encontramos ese pedido con tu correo");
 const r=await q("INSERT INTO pqrs(usuario_id,tipo,nombre,email,pedido,mensaje,fecha) VALUES (?,?,?,?,?,?,NOW())",[u?u.id:null,t,nombre,email,ped,msg]);
 const rad=`PQR-${new Date().getFullYear()}-${String(r.insertId).padStart(5,"0")}`;
 await q("UPDATE pqrs SET radicado=? WHERE id=?",[rad,r.insertId]);
 return one("SELECT radicado,tipo,pedido,mensaje,estado,respuesta,fecha FROM pqrs WHERE id=?",[r.insertId]);
}

/* ---------- utilidades http ---------- */
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".ico":"image/x-icon",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".woff2":"font/woff2",".webmanifest":"application/manifest+json",".json":"application/json"};
/* caché del navegador: los archivos de /assets llevan hash en el nombre (se guardan un año); el service worker y la página, nunca */
const cacheOf=(p,f)=>p==="/sw.js"||f.endsWith("index.html")||p==="/admin"?"no-cache":p.startsWith("/assets/")?"public, max-age=31536000, immutable":p.startsWith("/img/")||p.startsWith("/icons/")?"public, max-age=86400":"public, max-age=3600";
const SEC={"X-Content-Type-Options":"nosniff","Referrer-Policy":"same-origin","X-Frame-Options":"DENY"};
const send=(res,code,obj)=>{res.writeHead(code,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...SEC});res.end(JSON.stringify(obj))};
const body=req=>new Promise((ok,no)=>{let b="";req.on("data",c=>{b+=c;if(b.length>3e5){no(new Error("Solicitud demasiado grande"));req.destroy()}});req.on("end",()=>{try{ok(JSON.parse(b||"{}"))}catch{no(new Error("JSON inválido"))}})});
const isAdmin=req=>{const a=Buffer.from(req.headers.authorization||""),b=Buffer.from("Bearer "+CFG.adminToken);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const ipOf=req=>req.socket.remoteAddress||"";
const PUB=path.join(__dirname,"public"),DIST=path.join(__dirname,"client","dist"),IMG=path.join(__dirname,"imagenes");

async function api(req,res,p){
 const M=req.method;
 if(p==="/api/catalog"&&M==="GET")return send(res,200,await catalog());
 if(p==="/api/rules"&&M==="GET")return send(res,200,{rules:RULES,countries:COUNTRIES,store:CFG.tienda,shipping:CFG.envio});
 if(p==="/api/orders"&&M==="POST"){const u=await sessUser(req);return send(res,201,await createOrder(await body(req),u&&u.id))}
 if(p==="/api/pqrs"&&M==="POST"){const u=await sessUser(req);return send(res,201,await createPqrs(await body(req),u))}
 if(p==="/api/register"&&M==="POST"){
  const b=await body(req),name=cl(b.name,60),em=cl(b.email,120).toLowerCase(),ad=cl(b.address,200),ci=cl(b.city,80);let e;
  if(e=chkRule("name",name))bad("name",e);
  if(e=chkRule("email",em))bad("email",e);
  const ph=chkPhone(b.pc,b.pn);if(ph.err)bad("phone",ph.err);
  if(e=chkPass(b.password))bad("password",e);
  if(b.password!==b.password2)bad("password2","Las contraseñas no coinciden");
  if(e=chkRule("address",ad))bad("address",e);
  if(e=chkRule("city",ci))bad("city",e);
  if(b.accept!==true)bad("accept","Debes aceptar los términos y la política de tratamiento de datos");
  if(await one("SELECT id FROM usuarios WHERE nombre=?",[name]))bad("name","Ese nombre ya está en uso");
  if(await one("SELECT id FROM usuarios WHERE email=?",[em]))bad("email","Ese correo ya está registrado");
  const salt=crypto.randomBytes(8).toString("hex");
  const r=await q("INSERT INTO usuarios(nombre,email,salt,hash,pais,celular,telefono,direccion,ciudad,acepta_datos) VALUES (?,?,?,?,?,?,?,?,?,NOW())",[name,em,salt,hashPw(b.password,salt),ph.cc,ph.n,ph.full,ad,ci]);
  return send(res,201,await startSession(await one("SELECT * FROM usuarios WHERE id=?",[r.insertId])));
 }
 if(p==="/api/login"&&M==="POST"){
  const b=await body(req),k=cl(b.user,120).toLowerCase(),key=ipOf(req)+"|"+k;
  if(tooMany(key))return send(res,429,{error:"Demasiados intentos. Espera 15 minutos e intenta de nuevo."});
  const u=await one("SELECT * FROM usuarios WHERE email=? OR nombre=?",[k,k]);
  if(!u||!samePw(u,b.password||"")){failed(key);return send(res,401,{error:"Usuario o contraseña incorrectos"})}
  tries.delete(key);return send(res,200,await startSession(u));
 }
 if(p==="/api/logout"||p.startsWith("/api/me")){
  const u=await sessUser(req);if(!u)return send(res,401,{error:"Inicia sesión"});
  if(p==="/api/logout"){await q("DELETE FROM sesiones WHERE token=?",[sha(tokenOf(req))]);return send(res,200,{ok:true})}
  if(p==="/api/me"&&M==="GET")return send(res,200,pub(u));
  if(p==="/api/me"&&M==="PATCH"){const b=await body(req),ad=cl(b.address??u.direccion,200),ci=cl(b.city??u.ciudad,80);let e;
   const ph=chkPhone(b.pc??u.pais,b.pn??u.celular);if(ph.err)bad("phone",ph.err);if(e=chkRule("address",ad))bad("address",e);if(e=chkRule("city",ci))bad("city",e);
   await q("UPDATE usuarios SET pais=?,celular=?,telefono=?,direccion=?,ciudad=? WHERE id=?",[ph.cc,ph.n,ph.full,ad,ci,u.id]);
   return send(res,200,pub(await one("SELECT * FROM usuarios WHERE id=?",[u.id])))}
  if(p==="/api/me/avatar"&&M==="POST"){const im=String((await body(req)).image||"");if(im.length>2e5||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(im))throw new Error("Imagen inválida o muy grande");
   await q("UPDATE usuarios SET avatar=? WHERE id=?",[im,u.id]);return send(res,200,pub({...u,avatar:im}))}
  if(p==="/api/me/password"&&M==="POST"){const b=await body(req);let e;
   if(!samePw(u,b.current||""))bad("current","La contraseña actual no es correcta");
   if(e=chkPass(b.password))bad("password",e);if(b.password!==b.password2)bad("password2","Las contraseñas no coinciden");
   if(b.password===b.current)bad("password","La nueva contraseña debe ser distinta");
   const salt=crypto.randomBytes(8).toString("hex");
   await q("UPDATE usuarios SET salt=?,hash=? WHERE id=?",[salt,hashPw(b.password,salt),u.id]);
   await q("DELETE FROM sesiones WHERE usuario_id=? AND token<>?",[u.id,sha(tokenOf(req))]); /* cierra las demás sesiones */
   return send(res,200,{ok:true})}
  if(p==="/api/me/orders"&&M==="GET"){const os=await q(ORDER_SQL+" WHERE usuario_id=? OR (usuario_id IS NULL AND cliente_email=?) ORDER BY id DESC",[u.id,u.email]);return send(res,200,await Promise.all(os.map(o=>orderOut(o))))}
  const mc=p.match(/^\/api\/me\/orders\/(A-[A-F0-9]{6})\/cancel$/);
  if(mc&&M==="POST"){const o=await one("SELECT id FROM pedidos WHERE codigo=? AND (usuario_id=? OR (usuario_id IS NULL AND cliente_email=?))",[mc[1],u.id,u.email]);if(!o)fail(404,"Pedido no existe");
   return send(res,200,await setStatus(mc[1],"cancelado","Cancelado por el cliente",["nuevo","pagado"]))}
  if(p==="/api/me/pqrs"&&M==="GET")return send(res,200,await q("SELECT radicado,tipo,pedido,mensaje,estado,respuesta,fecha,actualizado FROM pqrs WHERE usuario_id=? OR email=? ORDER BY id DESC",[u.id,u.email]));
  return send(res,404,{error:"No encontrado"});
 }
 if(p.startsWith("/api/admin/")){
  if(!isAdmin(req))return send(res,401,{error:"No autorizado"});
  if(p==="/api/admin/orders"&&M==="GET"){
   const os=await q(ORDER_SQL+" ORDER BY id DESC LIMIT 300"),orders=await Promise.all(os.map(o=>orderOut(o,false)));
   const low=await q("SELECT p.nombre n,p.genero g,i.color,i.talla,i.stock FROM inventario i JOIN productos p ON p.id=i.producto_id ORDER BY i.stock,p.nombre LIMIT 10");
   const k=await one("SELECT COUNT(*) pedidos,COALESCE(SUM(CASE WHEN estado<>'cancelado' THEN total END),0) ventas,(SELECT SUM(stock) FROM inventario) unidades,(SELECT COUNT(*) FROM usuarios) clientes,(SELECT COUNT(*) FROM pqrs WHERE estado<>'cerrado') pqrs FROM pedidos");
   return send(res,200,{orders,low,kpi:k})}
  const m=p.match(/^\/api\/admin\/orders\/(A-[A-F0-9]{6})$/);
  if(m&&M==="PATCH"){const s=(await body(req)).status;if(!["nuevo","pagado","enviado","entregado","cancelado"].includes(s))return send(res,400,{error:"Estado inválido"});
   return send(res,200,await setStatus(m[1],s,"Cambio desde el panel"))}
  if(p==="/api/admin/inventory"&&M==="GET"){
   const ps=await q("SELECT id,genero,categoria,nombre,precio,activo FROM productos ORDER BY genero,categoria,orden");
   const inv=await q("SELECT producto_id,color,talla,stock FROM inventario ORDER BY producto_id,color,posicion");
   const by={};for(const r of inv)(by[r.producto_id]??=[]).push({color:r.color,talla:r.talla,stock:r.stock});
   return send(res,200,ps.map(x=>({...x,inv:by[x.id]||[]})))}
  if(p==="/api/admin/inventory"&&M==="PATCH"){const b=await body(req),st=Number(b.stock);
   if(!Number.isInteger(st)||st<0||st>1e6)return send(res,400,{error:"Stock inválido"});
   const r=await q("UPDATE inventario SET stock=? WHERE producto_id=? AND color=? AND talla=?",[st,cl(b.id,40),cl(b.color,30),cl(b.talla,6)]);
   return r.affectedRows?send(res,200,{ok:true}):send(res,404,{error:"No existe"})}
  const mp=p.match(/^\/api\/admin\/products\/([\w-]{1,40})$/);
  if(mp&&M==="PATCH"){const b=await body(req),set=[],args=[];
   if(b.precio!==undefined){const v=Number(b.precio);if(!Number.isInteger(v)||v<1000||v>1e8)return send(res,400,{error:"Precio inválido"});set.push("precio=?");args.push(v)}
   if(b.activo!==undefined){set.push("activo=?");args.push(b.activo?1:0)}
   if(b.nombre!==undefined){const v=cl(b.nombre,120);if(v.length<3)return send(res,400,{error:"Nombre muy corto"});set.push("nombre=?");args.push(v)}
   if(!set.length)return send(res,400,{error:"Nada que cambiar"});
   await q(`UPDATE productos SET ${set.join(",")} WHERE id=?`,[...args,mp[1]]);return send(res,200,{ok:true})}
  if(p==="/api/admin/pqrs"&&M==="GET")return send(res,200,await q("SELECT id,radicado,tipo,nombre,email,pedido,mensaje,estado,respuesta,fecha,actualizado FROM pqrs ORDER BY id DESC LIMIT 300"));
  const mq=p.match(/^\/api\/admin\/pqrs\/(\d+)$/);
  if(mq&&M==="PATCH"){const b=await body(req),est=["abierto","en_proceso","cerrado"].includes(b.estado)?b.estado:"en_proceso";
   await q("UPDATE pqrs SET estado=?,respuesta=?,actualizado=NOW() WHERE id=?",[est,cl(b.respuesta,2000)||null,+mq[1]]);return send(res,200,{ok:true})}
  return send(res,404,{error:"No encontrado"});
 }
 return send(res,404,{error:"No encontrado"});
}

DB.init().then(()=>{
 http.createServer(async(req,res)=>{
  try{
   const p=decodeURIComponent(new URL(req.url,"http://x").pathname);
   if(p.startsWith("/api/"))return await api(req,res,p);
   const adm=path.join(PUB,"admin.html"),f=path.normalize(p==="/admin"?adm:p.startsWith("/img/")?path.join(IMG,p.slice(5)):path.join(DIST,p==="/"?"index.html":p));
   if(!(f===adm||f.startsWith(DIST+path.sep)||f.startsWith(IMG+path.sep))||!fs.existsSync(f)||fs.statSync(f).isDirectory()){
    /* rutas del front (recargar la página) → index.html */
    if(!path.extname(p)&&fs.existsSync(path.join(DIST,"index.html"))){res.writeHead(200,{"Content-Type":MIME[".html"],"Cache-Control":"no-cache",...SEC});return fs.createReadStream(path.join(DIST,"index.html")).pipe(res)}
    res.writeHead(404,SEC);return res.end("No encontrado")}
   res.writeHead(200,{"Content-Type":MIME[path.extname(f).toLowerCase()]||"application/octet-stream","Cache-Control":cacheOf(p,f),...SEC});fs.createReadStream(f).pipe(res);
  }catch(e){
   const code=typeof e.code==="number"?e.code:e.sqlState?500:400;
   if(code===500)console.error(e);
   send(res,code,{error:code===500?"Error de base de datos, intenta de nuevo":e.message,field:e.field});
  }
 }).listen(CFG.port,()=>{
  console.log(`Armario en http://localhost:${CFG.port}  ·  panel: /admin  ·  base: MySQL ${CFG.db.host}:${CFG.db.port}/${CFG.db.database}`);
  /* direcciones para abrir la tienda desde el celular o la APK (misma red WiFi) */
  const ips=Object.values(os.networkInterfaces()).flat().filter(i=>i&&i.family==="IPv4"&&!i.internal).map(i=>i.address);
  if(ips.length)console.log("Desde el celular (misma red WiFi): "+ips.map(ip=>`http://${ip}:${CFG.port}`).join("  ·  "));
 });
}).catch(e=>{console.error("\n✖ "+e.message+"\n");process.exit(1)});
