/* Genera database/armario.sql (estructura + catálogo con 1000 unidades por talla) para importarlo en phpMyAdmin de XAMPP.
   No es obligatorio: el servidor crea todo solo al arrancar. Uso: npm run sql */
const fs=require("fs"),path=require("path"),{SCHEMA,seedRows}=require("../db"),CFG=require("../config");
const esc=v=>typeof v==="number"?String(v):"'"+String(v).replace(/\\/g,"\\\\").replace(/'/g,"''")+"'";
const rows=r=>r.map(x=>"("+x.map(esc).join(",")+")").join(",\n");
const {prods,inv}=seedRows(),db=CFG.db.database;
let out=`-- Armario · base de datos para XAMPP (MySQL / MariaDB)\n-- Generado con "npm run sql". Importar en phpMyAdmin → Importar.\n-- ${prods.length} productos · ${inv.length} combinaciones producto/color/talla · ${CFG.stockInicial} unidades cada una\n\nSET NAMES utf8mb4;\nCREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE \`${db}\`;\n\n`;
out+=SCHEMA.join(";\n\n")+";\n\n";
out+=`INSERT IGNORE INTO productos(id,genero,categoria,orden,nombre,precio) VALUES\n${rows(prods)};\n\n`;
for(let i=0;i<inv.length;i+=200)out+=`INSERT IGNORE INTO inventario(producto_id,color,talla,posicion,stock) VALUES\n${rows(inv.slice(i,i+200))};\n\n`;
fs.mkdirSync(path.join(__dirname,"..","database"),{recursive:true});
fs.writeFileSync(path.join(__dirname,"..","database","armario.sql"),out);
console.log("database/armario.sql listo:",prods.length,"productos,",inv.length,"filas de inventario");
