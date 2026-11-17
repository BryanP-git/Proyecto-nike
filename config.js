/*
 Configuración. Todo se puede cambiar con variables de entorno (o editando los valores por defecto).
 Por defecto apunta al MySQL/MariaDB de XAMPP: usuario root, sin contraseña, puerto 3306.
*/
const env=(k,d)=>process.env[k]??d;
module.exports={
 port:+env("PORT",3000),
 adminToken:env("ADMIN_TOKEN","admin123"),
 db:{host:env("DB_HOST","127.0.0.1"),port:+env("DB_PORT",3306),user:env("DB_USER","root"),password:env("DB_PASS",""),database:env("DB_NAME","armario")},
 stockInicial:+env("STOCK_INICIAL",1000),          /* unidades por producto + color + talla al crear el catálogo */
 envio:{costo:+env("ENVIO_COSTO",14900),gratisDesde:+env("ENVIO_GRATIS_DESDE",250000),dias:env("ENVIO_DIAS","3 a 8 días hábiles")},
 /* datos del vendedor: aparecen en la factura y en las políticas (cámbialos por los reales) */
 tienda:{nombre:"NIKE Armario",razon:"Armario Urbano S.A.S. (demo)",nit:"900.000.000-0",direccion:"Calle 100 # 15-20, Bogotá D.C.",telefono:"+57 601 000 0000",whatsapp:"+57 300 000 0000",email:"servicio@armario.test",horario:"Lunes a sábado, 8:00 a. m. a 6:00 p. m."}
};
