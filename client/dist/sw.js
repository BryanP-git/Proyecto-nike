/*
 Service worker de Armario (PWA).
 - Página y archivos de la app: se guardan al instalar y se sirven desde la caché (la app abre sin conexión).
 - Fotos (/img/): se muestran desde la caché y se actualizan por detrás.
 - Catálogo (/api/catalog): primero la red; sin conexión se usa la última copia.
 - El resto de /api (pedidos, cuenta, pagos) siempre va a la red: nunca se guarda en caché.
 Cambia VERSION cuando publiques una versión nueva para que los celulares descarguen todo otra vez.
*/
const VERSION="armario-v7";
const SHELL=["/","/manifest.webmanifest","/icons/icon-192.png","/icons/icon-512.png","/favicon.svg"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
/* la copia se saca antes de devolver la respuesta (después el cuerpo ya estaría leído) */
const put=(req,res)=>{if(res&&(res.ok||res.type==="opaque")){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy)).catch(()=>{})}return res};
const cacheFirst=async req=>(await caches.match(req))||put(req,await fetch(req));
const fresh=async req=>{const hit=await caches.match(req),net=fetch(req).then(r=>put(req,r)).catch(()=>hit);return hit||net};
const netFirst=async(req,fallback)=>{try{return put(req,await fetch(req))}catch{return (await caches.match(req))||(fallback&&await caches.match(fallback))||Response.error()}};
self.addEventListener("fetch",e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=="GET")return;
 if(u.origin===location.origin){
  if(u.pathname.startsWith("/api/"))return u.pathname==="/api/catalog"||u.pathname==="/api/rules"?e.respondWith(netFirst(r)):undefined;
  if(r.mode==="navigate")return u.pathname==="/admin"?undefined:e.respondWith(netFirst(r,"/"));
  if(u.pathname.startsWith("/assets/"))return e.respondWith(cacheFirst(r));
  if(u.pathname.startsWith("/img/")||u.pathname.startsWith("/icons/"))return e.respondWith(fresh(r));
  return;
 }
 if(u.hostname.endsWith("fonts.googleapis.com")||u.hostname.endsWith("fonts.gstatic.com"))e.respondWith(fresh(r));
});
