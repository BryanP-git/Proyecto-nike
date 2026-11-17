/*
 Base de datos MySQL / MariaDB (XAMPP).
 - Al arrancar crea la base "armario", las tablas y el catálogo (1000 unidades por producto + color + talla).
 - Compatible con MariaDB 10.4 (la de XAMPP) y MySQL 8.
 - Si existe data/db.json de la versión anterior, importa usuarios y pedidos una sola vez.
*/
const mysql=require("mysql2/promise"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const CFG=require("./config"),{buildCatalog}=require("./catalog");

const T="ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
const SCHEMA=[
`CREATE TABLE IF NOT EXISTS productos(
 id VARCHAR(40) NOT NULL PRIMARY KEY,
 genero ENUM('hombre','mujer') NOT NULL,
 categoria ENUM('camisas','hoodies','pantalones','zapatos') NOT NULL,
 orden SMALLINT NOT NULL DEFAULT 0,
 nombre VARCHAR(120) NOT NULL,
 precio INT UNSIGNED NOT NULL,
 activo TINYINT(1) NOT NULL DEFAULT 1,
 creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_cat(genero,categoria,orden)
) ${T}`,
`CREATE TABLE IF NOT EXISTS inventario(
 producto_id VARCHAR(40) NOT NULL,
 color VARCHAR(30) NOT NULL,
 talla VARCHAR(6) NOT NULL,
 posicion TINYINT NOT NULL DEFAULT 0,
 stock INT NOT NULL DEFAULT 0,
 PRIMARY KEY(producto_id,color,talla),
 CONSTRAINT fk_inv_prod FOREIGN KEY(producto_id) REFERENCES productos(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT chk_stock CHECK (stock>=0)
) ${T}`,
`CREATE TABLE IF NOT EXISTS usuarios(
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(40) NOT NULL,
 email VARCHAR(100) NOT NULL,
 salt CHAR(16) NOT NULL,
 hash CHAR(64) NOT NULL,
 pais CHAR(2) NOT NULL DEFAULT 'CO',
 celular VARCHAR(15) NOT NULL DEFAULT '',
 telefono VARCHAR(25) NOT NULL DEFAULT '',
 direccion VARCHAR(160) NOT NULL DEFAULT '',
 ciudad VARCHAR(60) NOT NULL DEFAULT '',
 avatar MEDIUMTEXT NULL,
 acepta_datos DATETIME NULL,
 creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_nombre(nombre),
 UNIQUE KEY uq_email(email)
) ${T}`,
`CREATE TABLE IF NOT EXISTS sesiones(
 token CHAR(64) NOT NULL PRIMARY KEY,
 usuario_id INT UNSIGNED NOT NULL,
 expira DATETIME NOT NULL,
 creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_ses_user FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ${T}`,
`CREATE TABLE IF NOT EXISTS pedidos(
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(12) NOT NULL,
 factura VARCHAR(12) NULL,
 usuario_id INT UNSIGNED NULL,
 fecha DATETIME NOT NULL,
 cliente_nombre VARCHAR(80) NOT NULL,
 cliente_email VARCHAR(100) NOT NULL,
 cliente_telefono VARCHAR(30) NOT NULL DEFAULT '',
 cliente_direccion VARCHAR(160) NOT NULL,
 cliente_ciudad VARCHAR(60) NOT NULL,
 subtotal INT UNSIGNED NOT NULL,
 envio INT UNSIGNED NOT NULL DEFAULT 0,
 total INT UNSIGNED NOT NULL,
 base INT UNSIGNED NOT NULL,
 iva INT UNSIGNED NOT NULL,
 metodo ENUM('tarjeta','contraentrega') NOT NULL,
 franquicia VARCHAR(12) NULL,
 ultimos4 CHAR(4) NULL,
 tipo_tarjeta ENUM('credito','debito') NULL,
 cuotas TINYINT UNSIGNED NULL,
 estado ENUM('nuevo','pagado','enviado','entregado','cancelado') NOT NULL DEFAULT 'nuevo',
 acepta_terminos DATETIME NULL,
 UNIQUE KEY uq_codigo(codigo),
 UNIQUE KEY uq_factura(factura),
 KEY idx_user(usuario_id,fecha),
 CONSTRAINT fk_ped_user FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ${T}`,
`CREATE TABLE IF NOT EXISTS pedido_items(
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 pedido_id INT UNSIGNED NOT NULL,
 producto_id VARCHAR(40) NOT NULL,
 nombre VARCHAR(120) NOT NULL,
 color VARCHAR(30) NOT NULL,
 talla VARCHAR(6) NOT NULL,
 cantidad INT UNSIGNED NOT NULL,
 precio INT UNSIGNED NOT NULL,
 CONSTRAINT fk_item_ped FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
) ${T}`,
`CREATE TABLE IF NOT EXISTS pedido_historial(
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 pedido_id INT UNSIGNED NOT NULL,
 estado VARCHAR(20) NOT NULL,
 nota VARCHAR(160) NOT NULL DEFAULT '',
 fecha DATETIME NOT NULL,
 CONSTRAINT fk_hist_ped FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
) ${T}`,
`CREATE TABLE IF NOT EXISTS pqrs(
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 radicado VARCHAR(16) NULL,
 usuario_id INT UNSIGNED NULL,
 tipo ENUM('peticion','queja','reclamo','sugerencia','retracto','garantia') NOT NULL,
 nombre VARCHAR(80) NOT NULL,
 email VARCHAR(100) NOT NULL,
 pedido VARCHAR(12) NULL,
 mensaje TEXT NOT NULL,
 estado ENUM('abierto','en_proceso','cerrado') NOT NULL DEFAULT 'abierto',
 respuesta TEXT NULL,
 fecha DATETIME NOT NULL,
 actualizado DATETIME NULL,
 UNIQUE KEY uq_radicado(radicado),
 CONSTRAINT fk_pqrs_user FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ${T}`
];

/* filas del catálogo inicial (también se usan para generar database/armario.sql) */
function seedRows(){
 const cat=buildCatalog(),prods=[],inv=[];
 for(const p of cat){prods.push([p.id,p.g,p.cat,p.orden,p.n,p.p]);for(const c of p.c)p.sz.forEach((t,i)=>inv.push([p.id,c,t,i,CFG.stockInicial]))}
 return {prods,inv};
}

let pool;
async function init(){
 const {database,...conn}=CFG.db;
 const root=await mysql.createConnection({...conn,charset:"utf8mb4"}).catch(e=>{throw new Error(`No pude conectar con MySQL en ${conn.host}:${conn.port} (${e.code||e.message}). ¿Está encendido MySQL en el panel de XAMPP?`)});
 await root.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
 await root.end();
 pool=mysql.createPool({...CFG.db,charset:"utf8mb4",connectionLimit:10,dateStrings:true,decimalNumbers:true});
 for(const s of SCHEMA)await pool.query(s);
 /* catálogo: agrega productos y combinaciones color/talla nuevas; NO toca precios ni stock que ya existan */
 const {prods,inv}=seedRows();
 await pool.query("INSERT IGNORE INTO productos(id,genero,categoria,orden,nombre,precio) VALUES ?",[prods]);
 for(let i=0;i<inv.length;i+=500)await pool.query("INSERT IGNORE INTO inventario(producto_id,color,talla,posicion,stock) VALUES ?",[inv.slice(i,i+500)]);
 await pool.query("DELETE FROM sesiones WHERE expira<NOW()");
 await importJson();
 /* usuario de prueba */
 if(!(await one("SELECT id FROM usuarios WHERE nombre='guesst'"))){const salt=crypto.randomBytes(8).toString("hex");
  await q("INSERT INTO usuarios(nombre,email,salt,hash,pais,celular,telefono,direccion,ciudad,acepta_datos) VALUES ('guesst','guesst@nike.test',?,?,'CO','3001234567','+57 3001234567','Calle 100 # 15-20','Bogotá',NOW())",[salt,crypto.scryptSync("guesst123",salt,32).toString("hex")])}
 return pool;
}
const q=(sql,args)=>pool.query(sql,args).then(r=>r[0]);
const one=async(sql,args)=>(await q(sql,args))[0]||null;
async function tx(fn){const c=await pool.getConnection();try{await c.beginTransaction();const r=await fn((s,a)=>c.query(s,a).then(x=>x[0]));await c.commit();return r}catch(e){await c.rollback().catch(()=>{});throw e}finally{c.release()}}

/* importa una sola vez la base anterior (data/db.json): usuarios con su contraseña y pedidos con su factura */
async function importJson(){
 const f=path.join(__dirname,"data","db.json");
 if(!fs.existsSync(f))return;
 const n=(await one("SELECT (SELECT COUNT(*) FROM usuarios)+(SELECT COUNT(*) FROM pedidos) n")).n;
 if(n>0)return;
 let d;try{d=JSON.parse(fs.readFileSync(f,"utf8"))}catch{return}
 await tx(async x=>{
  const ids={};
  for(const u of d.users||[]){const r=await x("INSERT INTO usuarios(nombre,email,salt,hash,pais,celular,telefono,direccion,ciudad,avatar,acepta_datos) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())",[u.username,u.email,u.salt,u.hash,u.pc||"CO",u.pn||"",u.phone||"",u.address||"",u.city||"",u.avatar||null]);ids[u.id]=r.insertId}
  for(const o of [...(d.orders||[])].reverse()){
   const num=+(String(o.invoice||"").replace(/\D/g,""))||null,pm=o.payment||{method:"contraentrega"},sub=o.items.reduce((a,l)=>a+l.price*l.q,0);
   const r=await x(`INSERT INTO pedidos(id,codigo,factura,usuario_id,fecha,cliente_nombre,cliente_email,cliente_telefono,cliente_direccion,cliente_ciudad,subtotal,envio,total,base,iva,metodo,franquicia,ultimos4,tipo_tarjeta,cuotas,estado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [num,o.id,o.invoice||null,ids[o.uid]||null,new Date(o.date),o.customer.name,o.customer.email,o.customer.phone||"",o.customer.address,o.customer.city,sub,Math.max(0,o.total-sub),o.total,o.base,o.iva,pm.method,pm.brand||null,pm.last4||null,pm.kind||null,pm.cuotas||null,o.status||"nuevo"]);
   const pid=r.insertId;
   for(const l of o.items)await x("INSERT INTO pedido_items(pedido_id,producto_id,nombre,color,talla,cantidad,precio) VALUES (?,?,?,?,?,?,?)",[pid,l.id,l.n,l.col,l.size,l.q,l.price]);
   await x("INSERT INTO pedido_historial(pedido_id,estado,nota,fecha) VALUES (?,?,?,?)",[pid,o.status||"nuevo","Importado de la versión anterior",new Date(o.date)]);
  }
 });
 fs.renameSync(f,f+".importado");
 console.log(`Importados ${(d.users||[]).length} usuarios y ${(d.orders||[]).length} pedidos de data/db.json`);
}
module.exports={init,q,one,tx,SCHEMA,seedRows,get pool(){return pool}};
