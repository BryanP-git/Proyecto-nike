import {useState,useMemo,useEffect,useRef} from "react";
import {motion} from "framer-motion";
import {money} from "./util.js";

/* ---------- Políticas de la tienda ----------
 Textos de ejemplo basados en el Estatuto del Consumidor (Ley 1480 de 2011, modificada por la Ley 2439 de 2024)
 y la Ley 1581 de 2012 (protección de datos). Antes de publicar la tienda, revísalos con un abogado y cambia los datos de la empresa en config.js. */
export const INFO={
 terminos:{t:"Términos y condiciones",b:s=><>
  <p>Al comprar en {s.nombre} aceptas estas condiciones. Vende {s.razon}, NIT {s.nit}, {s.direccion}.</p>
  <h4>Precios y disponibilidad</h4><p>Los precios están en pesos colombianos e incluyen IVA. La disponibilidad se muestra por talla y se confirma al pagar: si otra persona compra la última unidad antes que tú, te avisamos y no se hace el cobro.</p>
  <h4>Pedidos</h4><p>Cada compra genera un pedido (A-XXXXXX) y una factura (NK-000000). Puedes ver el estado en Cuenta → Pedidos y cancelarlo mientras no haya sido enviado.</p>
  <h4>Pagos</h4><p>Tarjeta crédito o débito, o pago contra entrega. Esta tienda está en modo demostración: no se hace ningún cobro real.</p>
  <h4>Envíos</h4><p>Entregamos en {s.envio.dias} en ciudades principales. Envío gratis desde {money(s.envio.gratisDesde)}; si no, cuesta {money(s.envio.costo)}. Si no se pacta otro plazo, la entrega no supera 30 días calendario; si nos demoramos o no hay producto, puedes terminar la compra y te devolvemos el dinero en máximo 15 días calendario.</p>
  <h4>Atención</h4><p>Para peticiones, quejas o reclamos usa “Ayuda y PQRS”: cada solicitud recibe un número de radicado con fecha y hora. También puedes acudir a la Superintendencia de Industria y Comercio (sic.gov.co).</p></>},
 privacidad:{t:"Política de tratamiento de datos",b:s=><>
  <p>{s.razon} (NIT {s.nit}) es responsable de tus datos personales, según la Ley 1581 de 2012.</p>
  <h4>Qué datos usamos y para qué</h4><p>Nombre, correo, celular, dirección y ciudad: para crear tu cuenta, entregar y facturar tus pedidos y responder tus solicitudes. De la tarjeta solo guardamos la franquicia y los últimos 4 dígitos; nunca el número completo ni el CVV.</p>
  <h4>Tus derechos</h4><p>Puedes conocer, actualizar y rectificar tus datos (Cuenta → Perfil), pedir prueba de tu autorización, revocarla o pedir que borremos tus datos cuando no haya un deber legal de conservarlos, y presentar quejas ante la Superintendencia de Industria y Comercio.</p>
  <h4>Seguridad</h4><p>Las contraseñas se guardan cifradas (scrypt con sal) y las sesiones vencen a los 30 días.</p>
  <h4>Contacto</h4><p>{s.email} · {s.telefono}</p></>},
 cambios:{t:"Cambios, devoluciones y garantía",b:s=><>
  <h4>Derecho de retracto</h4><p>Por ser una compra a distancia, puedes arrepentirte dentro de los 5 días hábiles siguientes a la entrega. Devuelve la prenda sin uso, con etiquetas y en su empaque; los costos de transporte de la devolución corren por tu cuenta. Te reembolsamos todo el dinero en máximo 15 días calendario, por el medio de pago que prefieras.</p>
  <h4>Reversión del pago</h4><p>Si pagaste con tarjeta y hubo fraude, una compra no solicitada, el producto no llegó o no corresponde a lo pedido, puedes pedir la reversión dentro de los 5 días hábiles siguientes a que lo sepas.</p>
  <h4>Garantía</h4><p>Si una prenda tiene defectos de fabricación, la reparamos, cambiamos o te devolvemos el dinero. Plazo de garantía: 1 año desde la entrega.</p>
  <h4>Cambios de talla</h4><p>Dentro de 30 días, si la prenda está sin uso y hay unidades en la talla que necesitas.</p>
  <p>Para cualquiera de estos casos abre una solicitud en “Ayuda y PQRS” con el código de tu pedido.</p></>},
 envios:{t:"Envíos y entregas",b:s=><>
  <p>Tiempo de entrega: {s.envio.dias} en ciudades principales (puede variar en zonas rurales). Si no se pacta otro plazo, nunca más de 30 días calendario.</p>
  <p>Costo: {money(s.envio.costo)} por pedido. Gratis desde {money(s.envio.gratisDesde)}.</p>
  <p>Contra entrega: pagas en efectivo o datáfono al recibir. Revisa tu pedido antes de firmar.</p></>},
};
export const LINKS=[["terminos","Términos"],["privacidad","Datos personales"],["cambios","Cambios y devoluciones"],["envios","Envíos"],["ayuda","Ayuda y PQRS"]];

const TIPOS=[["peticion","Petición"],["queja","Queja"],["reclamo","Reclamo"],["sugerencia","Sugerencia"],["retracto","Retracto (devolución)"],["garantia","Garantía"]];
export const tipoTxt=t=>(TIPOS.find(x=>x[0]===t)||[t,t])[1];
/* Formulario de PQRS: guarda la solicitud en MySQL y entrega número de radicado */
export function Pqrs({user,token,pre={}}){
 const [f,setF]=useState({tipo:pre.tipo||"peticion",pedido:pre.pedido||"",nombre:"",email:"",mensaje:""}),[err,setErr]=useState({}),[ok,setOk]=useState(null),[busy,setBusy]=useState(false);
 const set=(k,v)=>setF({...f,[k]:v});
 const go=async()=>{setBusy(true);setErr({});
  try{const r=await fetch("/api/pqrs",{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:JSON.stringify(f)}),d=await r.json();
   if(!r.ok)setErr({[d.field||"_"]:d.error});else setOk(d)}catch{setErr({_:"No se pudo conectar con el servidor"})}setBusy(false)};
 if(ok)return <motion.div className="pqok" initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}}><small>Radicado</small><b>{ok.radicado}</b><p>Recibimos tu {tipoTxt(ok.tipo).toLowerCase()} el {new Date(ok.fecha.replace(" ","T")).toLocaleString("es-CO")}. Te responderemos al correo en máximo 15 días hábiles.{user?" También puedes verla en Cuenta → Solicitudes.":""}</p></motion.div>;
 const E=k=>err[k]&&<small className="ferr">{err[k]}</small>;
 return <div className="pqform">
  <div className="fld"><label>Tipo</label><select value={f.tipo} onChange={e=>set("tipo",e.target.value)}>{TIPOS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>{E("tipo")}</div>
  {!user&&<><div className="fld"><label>Nombre</label><input value={f.nombre} onChange={e=>set("nombre",e.target.value)} className={err.nombre?"bad":""}/>{E("nombre")}</div>
   <div className="fld"><label>Correo</label><input type="email" value={f.email} onChange={e=>set("email",e.target.value)} className={err.email?"bad":""}/>{E("email")}</div></>}
  <div className="fld"><label>Código del pedido {["retracto","garantia","reclamo"].includes(f.tipo)?"":"(opcional)"}</label><input placeholder="A-1B2C3D" value={f.pedido} onChange={e=>set("pedido",e.target.value.toUpperCase())} className={err.pedido?"bad":""}/>{E("pedido")}</div>
  <div className="fld"><label>Mensaje</label><textarea rows="4" value={f.mensaje} onChange={e=>set("mensaje",e.target.value)} className={err.mensaje?"bad":""}/>{E("mensaje")}</div>
  <p className="err" role="alert">{err._}</p>
  <button className="btn" disabled={busy} onClick={go}>{busy?"Enviando…":"Enviar solicitud"}</button>
 </div>;
}

/* Panel lateral con la política elegida o el formulario de ayuda */
export function InfoBody({k,store,user,token,pre,onLink}){
 if(k==="ayuda")return <><h2>Ayuda y PQRS</h2>
  <p className="lead2">Escríbenos por {store.email} o WhatsApp {store.whatsapp} ({store.horario}). Para cambios, devoluciones, garantías o reclamos, deja tu solicitud aquí y recibirás un número de radicado.</p>
  <Pqrs user={user} token={token} pre={pre}/>
  <p className="small">Lee también <button className="link" onClick={()=>onLink("cambios")}>cambios y devoluciones</button>.</p></>;
 const it=INFO[k];if(!it)return null;
 return <><h2>{it.t}</h2><div className="policy">{it.b({...store,envio:store.envio})}</div><p className="small">Documento de ejemplo para el proyecto: revísalo con un abogado antes de publicar la tienda.</p></>;
}

/* ---------- Buscador: busca en las dos colecciones por nombre, categoría o color ---------- */
const norm=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const CAT={camisas:"Camisas",hoodies:"Hoodies",pantalones:"Pantalones",zapatos:"Zapatos"};
export function Search({data,onOpen,onClose}){
 const [t,setT]=useState(""),inp=useRef(null);
 useEffect(()=>{inp.current?.focus();const k=e=>e.key==="Escape"&&onClose();addEventListener("keydown",k);return()=>removeEventListener("keydown",k)},[]);
 const all=useMemo(()=>{const o=[];for(const g of ["hombre","mujer"])for(const c in data?.[g]||{})data[g][c].forEach((p,i)=>o.push({p,g,c,i,s:norm([p.n,CAT[c],g,...p.c].join(" "))}));return o},[data]);
 const words=norm(t).split(/\s+/).filter(Boolean),res=words.length?all.filter(x=>words.every(w=>x.s.includes(w.replace(/s$/,"")))).slice(0,24):[];
 const left=p=>Object.values(p.inv).reduce((a,o)=>a+Object.values(o).reduce((x,y)=>x+y,0),0);
 return <motion.div className="ov srch" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
  <motion.div className="sbox" initial={{y:-30,opacity:0}} animate={{y:0,opacity:1}} transition={{type:"spring",damping:22,stiffness:260}} onClick={e=>e.stopPropagation()}>
   <div className="sin"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2"/><path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
    <input ref={inp} value={t} onChange={e=>setT(e.target.value)} placeholder="Busca: hoodie blanco, jogger, tenis mujer…" aria-label="Buscar productos"/><button className="x" onClick={onClose} aria-label="Cerrar">×</button></div>
   {words.length>0&&<p className="small">{res.length?`${res.length} resultado${res.length>1?"s":""}`:"No encontramos nada con esa búsqueda."}</p>}
   <div className="sres">{res.map((x,k)=><motion.button key={x.p.id} className="sitem" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:Math.min(k,10)*.03}} onClick={()=>onOpen(x.g,x.c,x.i)}>
    <span className="sth"><img src={`/img/${x.p.id}.png`} alt="" loading="lazy" onError={e=>e.currentTarget.style.visibility="hidden"}/></span>
    <span><b>{x.p.n}</b><small>{CAT[x.c]} · {x.g}{left(x.p)<1?" · agotado":""}</small></span><em>{money(x.p.p)}</em></motion.button>)}</div>
  </motion.div></motion.div>;
}
