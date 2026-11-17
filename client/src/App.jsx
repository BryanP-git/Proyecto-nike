import {useState,useEffect,useRef,useCallback} from "react";
import {motion,AnimatePresence,LayoutGroup,useScroll,useTransform,useSpring,useMotionValue,useReducedMotion} from "framer-motion";
import {Pic,TYPE,COL} from "./art.jsx";
import {Room,KEYS,mod,Hook,Hanger} from "./room.jsx";
import {Wipe} from "./fx.jsx";
import {PayForm,checkCard,payPayload} from "./pay.jsx";
import {money,payText,shipOf,ESTADOS,fdate} from "./util.js";
import {InfoBody,Search,LINKS,tipoTxt} from "./info.jsx";
const CATS={camisas:"Camisas",hoodies:"Hoodies",pantalones:"Pantalones",zapatos:"Zapatos"};
const BRAND_TEXT="Nueva colección urbana. Nació en la calle, entre paredes pintadas, luces de neón y ritmo de ciudad. Cada pieza lleva el color del grafiti y la actitud de quien no pasa desapercibido. Entra al cuarto, elige tu pared y deja tu marca.";
const BRAND="NIKE"; /* cambia aquí el nombre; pon tu logo oficial en imagenes/logo.png y se usará solo */
function Brand(){const [ok,setOk]=useState(true);return ok?<img className="logo" src="/img/logo.png" alt={BRAND} onError={()=>setOk(false)}/>:<span>{BRAND}</span>}

const st={hidden:{opacity:0,y:18},show:{opacity:1,y:0}};
/* dentro de la APK (WebView) window.print no hace nada: se pide a Android por el esquema armario:// */
export const IN_APK=typeof navigator!=="undefined"&&/ArmarioApp/.test(navigator.userAgent);
const printDoc=()=>IN_APK?location.href="armario://print":window.print();
/* foto grande de la ficha con su percha cromada (las fotos ya no traen el gancho dibujado) */
function DetailPic({p,type,color}){
 const [hp,setHp]=useState(false);
 return <div className="dpic">{hp&&type!=="zapato"&&<><Hook/><Hanger type={type}/></>}<Pic p={p} type={type} color={color} onLoad={()=>setHp(true)}/></div>;
}
function Detail({p,g,c,type,onBack,onAdd,onBuy}){
 const [col,setCol]=useState(p.c[0]),[size,setSize]=useState(null),[q,setQ]=useState(1),[err,setErr]=useState("");
 /* inventario por talla del color elegido (viene de MySQL) */
 const inv=p.inv?.[col]||{},left=size?inv[size]||0:0,all=Object.values(inv).reduce((a,b)=>a+b,0),max=Math.max(1,Math.min(99,size?left:99)),reduce=useReducedMotion();
 useEffect(()=>{if(size&&!inv[size])setSize(null)},[col]);
 useEffect(()=>{if(size)setQ(x=>Math.max(1,Math.min(x,left)))},[size,left]);
 /* acercamiento: lupa al pasar el cursor + "punch-in" (zoom con rebote) al elegir talla */
 const hz=useSpring(1,{stiffness:170,damping:22}),pz=useSpring(1,{stiffness:300,damping:14}),zs=useTransform([hz,pz],([a,b])=>a*b),ox=useMotionValue("50%"),oy=useMotionValue("35%"),[punch,setPunch]=useState(0);
 const look=e=>{if(e.pointerType!=="mouse"||reduce)return;const r=e.currentTarget.getBoundingClientRect();ox.set((e.clientX-r.left)/r.width*100+"%");oy.set((e.clientY-r.top)/r.height*100+"%");hz.set(1.75)};
 const pickSize=z=>{setSize(z);setErr("");if(reduce)return;setPunch(n=>n+1);pz.set(1.3);setTimeout(()=>pz.set(1.06),240)};
 const item=()=>{if(all<1){setErr("Agotado en este color por ahora.");return null}if(!size){setErr("Elige una talla primero.");return null}if(q>left){setErr(`Solo quedan ${left} en talla ${size}.`);return null}setErr("");return{key:[p.id,col,size].join("|"),id:p.id,n:p.n,price:p.p,col,size,type,q,max:Math.min(99,left)}};
 return <motion.section className="detail" style={{"--wall":`url(/img/pared-${c}.jpg)`}} initial="hidden" animate="show" variants={{show:{transition:{staggerChildren:.07,delayChildren:.4}}}}>
  <div className="dbgw" aria-hidden="true"><motion.div className="dbg" initial={reduce?false:{scale:1.6,filter:"blur(6px)"}} animate={{scale:1,filter:"blur(0px)"}} transition={{duration:.9,ease:[.2,.8,.2,1]}}/></div>
  <div className="stage" style={{"--wall":`url(/img/pared-${c}.jpg)`}}><div className="beam"/>
   {punch>0&&<motion.i key={punch} className="burst" initial={{scale:.35,opacity:1}} animate={{scale:1.5,opacity:0}} transition={{duration:.75,ease:"easeOut"}}/>}
   <motion.div layoutId={`g-${p.id}`} className="big" transition={{layout:{duration:.5,ease:[.2,.8,.2,1]}}}>
    <div className="lens" onPointerMove={look} onPointerLeave={()=>hz.set(1)}><motion.div className="zw" style={{scale:zs,originX:ox,originY:oy}}><AnimatePresence mode="wait">
     <motion.div key={col} initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1,y:[0,-8,0]}} exit={{opacity:0}} transition={{duration:.3,y:{duration:5,repeat:Infinity,ease:"easeInOut"}}}><DetailPic p={p} type={type} color={col}/></motion.div></AnimatePresence></motion.div></div>
    <AnimatePresence>{size&&<motion.span key={size} className="sizetag" initial={{scale:2.6,rotate:-30,opacity:0}} animate={{scale:1,rotate:-8,opacity:1}} exit={{scale:.6,opacity:0}} transition={{type:"spring",stiffness:420,damping:15}}><small>Talla</small>{size}</motion.span>}</AnimatePresence>
   </motion.div>
   <p className="lenshint">Pasa el cursor por la prenda para acercarte</p></div>
  <div className="info">
   <motion.button variants={st} className="link" onClick={onBack}>← Volver al {c==="zapatos"?"zapatero":"ropero"}</motion.button>
   <motion.h2 variants={st}>{p.n}</motion.h2><motion.p variants={st} className="price">{money(p.p)}</motion.p>
   <motion.div variants={st}><h3>Color · {col}</h3><div className="sw">{p.c.map(k=><button key={k} className={k===col?"on":""} style={{background:COL[k]}} aria-label={k} onClick={()=>setCol(k)}/>)}</div></motion.div>
   <motion.div variants={st}><h3>Talla</h3><div className="sz">{(p.sz||Object.keys(inv)).map(z=>{const n=inv[z]||0;return <button key={z} className={(z===size?"on ":"")+(n?"":"out")} disabled={!n} title={n?`${n} disponibles`:"Agotada"} onClick={()=>pickSize(z)}>{z}{n>0&&n<=10&&<i className="few"/>}</button>})}</div>
    <p className={"avail"+(size&&left<=10?" low":"")}>{all<1?"Agotado en este color":!size?"Elige tu talla · las tachadas están agotadas":left<=10?`¡Últimas ${left} unidades en talla ${size}!`:`${left} disponibles en talla ${size}`}</p></motion.div>
   <motion.div variants={st}><h3>Cantidad</h3><div className="qty"><button disabled={q<=1} onClick={()=>setQ(q-1)} aria-label="Menos">−</button><input className="qin" type="number" min="1" max={max} value={q} onChange={e=>setQ(Math.max(1,Math.min(max,Math.floor(+e.target.value)||1)))}/><button disabled={q>=max} onClick={()=>setQ(q+1)} aria-label="Más">+</button></div></motion.div>
   <p className="err" role="alert">{err}</p>
   <motion.div variants={st} className="acts"><button className="btn ghost" onClick={()=>{const i=item();i&&onAdd(i)}}>Agregar al carrito</button><button className="btn" onClick={()=>{const i=item();i&&onBuy(i)}}>Comprar ahora</button></motion.div>
  </div></motion.section>;
}
function Panel({cart,setCart,order,onClose,onPaid,user,token,rl,onInfo}){
 const [step,setStep]=useState(order?"form":"cart"),[f,setF]=useState(user?{name:user.username,email:user.email,phone:user.phone||"",address:user.address||"",city:user.city||""}:{}),[err,setErr]=useState(""),[busy,setBusy]=useState(false),[done,setDone]=useState(null);
 const [pm,setPm]=useState({method:"tarjeta",kind:"credito",cuotas:1}),[ce,setCe]=useState({}),[terms,setTerms]=useState(false);
 const items=order||cart,sub=items.reduce((a,b)=>a+b.price*b.q,0),ship=shipOf(sub,rl?.shipping),total=sub+ship,need=rl?.shipping&&sub&&ship?rl.shipping.gratisDesde-sub:0;
 const upd=(k,d)=>setCart(cart.map(x=>x.key===k?{...x,q:Math.max(1,Math.min(x.max||99,x.q+d))}:x));
 const pay=async()=>{
  if(!f.name||!/^\S+@\S+\.\S+$/.test(f.email||"")||!f.address||!f.city)return setErr("Completa nombre, correo válido, dirección y ciudad.");
  if(pm.method==="tarjeta"){const e=checkCard(pm);setCe(e);if(Object.keys(e).length)return setErr("Revisa los datos de la tarjeta.")}else setCe({});
  if(!terms)return setErr("Acepta los términos y la política de datos para continuar.");
  setBusy(true);setErr("");
  try{const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:JSON.stringify({terms,customer:f,payment:payPayload(pm),items:items.map(({id,col,size,q})=>({id,col,size,q}))})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudo procesar");
   if(!order)setCart([]);setPm({method:pm.method});setDone(d);onPaid();}catch(e){setErr(e.message)}setBusy(false);
 };
 return <motion.div className="ov" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
  <motion.aside className="drawer" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",damping:26,stiffness:220}} onClick={e=>e.stopPropagation()}>
   <button className="x" onClick={onClose} aria-label="Cerrar">×</button>
   {done?<><motion.p className="okmsg" initial={{scale:.8,opacity:0}} animate={{scale:1,opacity:1}}>{done.payment?.method==="contraentrega"?`¡Pedido confirmado! Pagarás ${money(done.total)} al recibir.`:"¡Pago aprobado! Gracias por tu compra."}</motion.p><Invoice o={done} s={rl?.store}/><div className="acts"><button className="btn" onClick={printDoc}>Imprimir / guardar PDF</button><button className="btn ghost" onClick={onClose}>Seguir comprando</button></div></>
   :<><h2>{step==="cart"?"Tu carrito":"Finalizar compra"}</h2>
    {!items.length&&<p>Aún no hay prendas. Abre el ropero y elige algo.</p>}
    {items.map(x=><div className="li" key={x.key}><div><b>{x.n}</b><br/><small>{x.col} · talla {x.size}</small></div>
     {step==="cart"&&!order?<div className="qty s"><button onClick={()=>upd(x.key,-1)}>−</button><output>{x.q}</output><button disabled={x.q>=(x.max||99)} onClick={()=>upd(x.key,1)}>+</button><button onClick={()=>setCart(cart.filter(y=>y.key!==x.key))} aria-label="Quitar">×</button></div>:<span>{x.q} ud.</span>}<span>{money(x.price*x.q)}</span></div>)}
    {items.length>0&&<div className="sumx"><span>Subtotal</span><span>{money(sub)}</span><span>Envío</span><span>{ship?money(ship):"Gratis"}</span></div>}
    {need>0&&<p className="freeship"><i style={{width:Math.min(100,sub/rl.shipping.gratisDesde*100)+"%"}}/>Te faltan <b>{money(need)}</b> para el envío gratis</p>}
    <div className="tot"><span>Total</span><span>{money(total)}</span></div>
    {items.length>0&&rl?.shipping&&<p className="small">Entrega en {rl.shipping.dias}. Precios con IVA incluido.</p>}
    {step==="form"&&<div className="ck">{[["name","Nombre completo"],["email","Correo"],["phone","Teléfono"],["address","Dirección"],["city","Ciudad"]].map(([k,l])=><input key={k} placeholder={l} value={f[k]||""} onChange={e=>setF({...f,[k]:e.target.value})}/>)}</div>}
    {step==="form"&&items.length>0&&<PayForm pay={pm} setPay={p=>{setPm(p);if(Object.keys(ce).length)setCe({})}} errs={ce} total={total} busy={busy}/>}
    {step==="form"&&items.length>0&&<label className="accept"><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/><span>Acepto los <button type="button" className="link" onClick={()=>onInfo("terminos")}>términos y condiciones</button>, la <button type="button" className="link" onClick={()=>onInfo("privacidad")}>política de datos</button> y conozco mi <button type="button" className="link" onClick={()=>onInfo("cambios")}>derecho de retracto</button>.</span></label>}
    <p className="err" role="alert">{err}</p>
    {items.length>0&&(step==="cart"?<button className="btn" onClick={()=>setStep("form")}>Continuar</button>:<button className="btn" disabled={busy} onClick={pay}>{busy?(pm.method==="tarjeta"?"Procesando pago…":"Procesando…"):pm.method==="tarjeta"?`Pagar ${money(total)}`:"Confirmar pedido"}</button>)}</>}
  </motion.aside></motion.div>;
}
function Invoice({o,s}){
 return <div className="invoice"><div className="ih"><div><b className="ibrand">{BRAND}</b>{s&&<small className="iseller">{s.razon}<br/>NIT {s.nit}<br/>{s.direccion}<br/>{s.email}</small>}</div><div>Factura de venta<br/><b>{o.invoice}</b><br/>{fdate(o.date)}<br/><small>Pedido {o.id}</small></div></div>
  <p><b>Cliente:</b> {o.customer.name}<br/>{o.customer.email}{o.customer.phone&&` · ${o.customer.phone}`}<br/>{o.customer.address}, {o.customer.city}</p>
  {o.payment&&<p><b>Forma de pago:</b> {payText(o.payment)}</p>}
  <table><thead><tr><th>Detalle</th><th>Cant.</th><th>Valor</th></tr></thead><tbody>{o.items.map((l,i)=><tr key={i}><td>{l.n}<br/><small>{l.col} · talla {l.size}</small></td><td>{l.q}</td><td>{money(l.price*l.q)}</td></tr>)}</tbody></table>
  <div className="sums">{o.subtotal!=null&&<><span>Subtotal prendas</span><span>{money(o.subtotal)}</span><span>Envío</span><span>{o.shipping?money(o.shipping):"Gratis"}</span></>}<span>Base gravable</span><span>{money(o.base)}</span><span>IVA 19% (incluido)</span><span>{money(o.iva)}</span><b>Total</b><b>{money(o.total)}</b></div>
  <small>Documento de demostración: no es una factura electrónica válida ante la DIAN.</small></div>;
}
const chk=(R,k,v)=>{const r=R[k];v=String(v??"");if(r.min&&v.length<r.min)return`Mínimo ${r.min} caracteres`;if(v.length>r.max)return`Máximo ${r.max} caracteres`;return r.re&&!new RegExp(r.re,"u").test(v)?r.msg:""};
const chkPh=(cs,cc,n)=>{const p=cs.find(x=>x.c===cc),d=String(n??"").replace(/[\s-]/g,"");if(!p)return"Elige un país";if(!d)return"Ingresa tu número";if(!/^\d+$/.test(d))return"Solo números";if(d.length<p.min||d.length>p.max)return p.min===p.max?`Debe tener ${p.min} dígitos`:`Debe tener entre ${p.min} y ${p.max} dígitos`;return p.re&&!new RegExp(p.re).test(d)?`No parece un celular de ${p.n}`:""};
const PASS=(R,v)=>[[`${R.password.min} caracteres como mínimo`,v.length>=R.password.min],...R.password.checks.map(c=>[c.t,new RegExp(c.re).test(v)])];
function PhoneField({cs,cc,pn,onCc,onPn,onBlur,err}){
 const p=cs.find(x=>x.c===cc);
 return <div className="fld"><label>Celular</label><div className="phone"><select value={cc} onChange={e=>onCc(e.target.value)} aria-label="País">{cs.map(x=><option key={x.c} value={x.c}>{x.f} {x.n} (+{x.d})</option>)}</select>
  <input inputMode="numeric" autoComplete="tel-national" placeholder={p?`${p.min===p.max?p.min:p.min+"–"+p.max} dígitos`:""} value={pn||""} onBlur={onBlur} onChange={e=>onPn(e.target.value.replace(/[^\d\s-]/g,""))} className={err?"bad":""}/></div>{err&&<small className="ferr">{err}</small>}</div>;
}
/* Página propia de ingreso / registro, con validadores en vivo (las mismas reglas las revisa el servidor) */
function AuthPage({mode,setMode,rules:R,cs,onDone,onBack,setToken,setUser,onInfo}){
 useEffect(()=>{scrollTo(0,0)},[]);
 const [v,setV]=useState({pc:"CO"}),[t,setT]=useState({}),[show,setShow]=useState(false),[srv,setSrv]=useState(""),[busy,setBusy]=useState(false);
 const set=(k,x)=>setV(o=>({...o,[k]:x})),touch=k=>setT(o=>({...o,[k]:true})),pw=v.password||"",chks=PASS(R,pw),score=chks.filter(x=>x[1]).length/chks.length;
 const errs=mode==="login"?{name:v.name?"":"Escribe tu nombre",password:pw?"":"Escribe tu contraseña"}:{name:chk(R,"name",(v.name||"").trim()),phone:chkPh(cs,v.pc,v.pn),email:chk(R,"email",(v.email||"").trim()),password:chks.every(x=>x[1])?"":"La contraseña no cumple los requisitos",password2:v.password2&&v.password2===pw?"":"Las contraseñas no coinciden",address:chk(R,"address",(v.address||"").trim()),city:chk(R,"city",(v.city||"").trim()),accept:v.accept?"":"Debes aceptar para crear la cuenta"};
 const submit=async()=>{
  setT(Object.fromEntries(Object.keys(errs).map(k=>[k,true])));setSrv("");if(Object.values(errs).some(Boolean))return;setBusy(true);
  try{const body=mode==="login"?{user:v.name,password:pw}:{name:v.name,pc:v.pc,pn:v.pn,email:v.email,password:pw,password2:v.password2,address:v.address,city:v.city,accept:!!v.accept};
   const r=await fetch(mode==="login"?"/api/login":"/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),d=await r.json();
   if(!r.ok){setSrv(d.error||"Error");setBusy(false);return}
   setToken(d.token);setUser(d.user);onDone();}catch{setSrv("No se pudo conectar con el servidor");setBusy(false)}
 };
 const F=(k,label,type="text",auto)=><div className="fld"><label>{label}</label><input type={type==="password"&&show?"text":type} autoComplete={auto} value={v[k]||""} onChange={e=>set(k,e.target.value)} onBlur={()=>touch(k)} onKeyDown={e=>e.key==="Enter"&&submit()} className={t[k]&&errs[k]?"bad":""}/>{t[k]&&errs[k]&&<small className="ferr">{errs[k]}</small>}</div>;
 return <motion.section className="auth" style={{backgroundImage:`linear-gradient(#0008,#000c),url(/img/pared-${mode==="login"?"zapatos":"camisas"}.jpg)`}} initial={{opacity:0}} animate={{opacity:1}}>
  <button className="link back" onClick={onBack}>← Volver a la tienda</button>
  <motion.div className={"acard "+mode} initial={{y:70,opacity:0}} animate={{y:0,opacity:1}} transition={{type:"spring",damping:20,stiffness:90}}>
   <h2>{mode==="login"?"Entra a tu cuarto":"Crea tu cuenta"}</h2>
   <div className="mtabs">{[["login","Ingresar"],["register","Registrarme"]].map(([k,l])=><button key={k} className={mode===k?"on":""} onClick={()=>{setMode(k);setT({});setSrv("")}}>{l}{mode===k&&<motion.u layoutId="mu"/>}</button>)}</div>
   <AnimatePresence mode="wait"><motion.div key={mode} className={"form "+mode} initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-24}} transition={{duration:.25}}>
    {F("name",mode==="login"?"Nombre":"Nombre completo","text","username")}
    {mode==="register"&&<><PhoneField cs={cs} cc={v.pc} pn={v.pn} onCc={x=>set("pc",x)} onPn={x=>set("pn",x)} onBlur={()=>touch("phone")} err={t.phone&&errs.phone}/>{F("email","Correo","email","email")}</>}
    {F("password","Contraseña","password",mode==="login"?"current-password":"new-password")}
    {mode==="register"&&<><div className="meter"><i style={{width:score*100+"%",background:score<.5?"#ff5d6c":score<1?"#ffd400":"#3fe08a"}}/></div><ul className="rules">{chks.map(([l,k])=><li key={l} className={k?"ok":""}>{k?"✓":"○"} {l}</li>)}</ul>
     {F("password2","Repetir contraseña","password","new-password")}{F("address","Dirección","text","street-address")}{F("city","Ciudad","text","address-level2")}
     <label className="accept wide"><input type="checkbox" checked={!!v.accept} onChange={e=>{set("accept",e.target.checked);touch("accept")}}/><span>Acepto los <button type="button" className="link" onClick={()=>onInfo("terminos")}>términos y condiciones</button> y autorizo el <button type="button" className="link" onClick={()=>onInfo("privacidad")}>tratamiento de mis datos personales</button> (Ley 1581 de 2012).{t.accept&&errs.accept&&<small className="ferr">{errs.accept}</small>}</span></label></>}
    <label className="show"><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)}/> Mostrar contraseña</label>
   </motion.div></AnimatePresence>
   <p className="err" role="alert">{srv}</p>
   <button className="btn wide" disabled={busy} onClick={submit}>{busy?"Un momento…":mode==="login"?"Ingresar":"Crear cuenta"}</button>
  </motion.div></motion.section>;
}
/* línea de tiempo del pedido: recibido → pagado → enviado → entregado (o cancelado) */
function Track({o}){
 const flow=o.status==="cancelado"?null:o.payment?.method==="tarjeta"?["pagado","enviado","entregado"]:["nuevo","enviado","entregado"],at=flow?flow.indexOf(o.status):-1;
 return <div className="track">{flow?<ol className="steps">{flow.map((k,i)=><li key={k} className={i<=at?"done":""}><i/>{ESTADOS[k]}</li>)}</ol>:<p className="est cancel">Pedido cancelado · las unidades volvieron al inventario</p>}
  {o.history?.length>0&&<ul className="hist">{o.history.map((h,i)=><li key={i}><b>{ESTADOS[h.estado]||h.estado}</b> · {fdate(h.fecha)}{h.nota&&<small> — {h.nota}</small>}</li>)}</ul>}</div>;
}
function Account({user,token,setUser,onClose,rl,onHelp}){
 const [tab,setTab]=useState("perfil"),[pr,setPr]=useState({pc:user.pc||"CO",pn:user.pn||"",address:user.address||"",city:user.city||""}),[msg,setMsg]=useState(""),[orders,setOrders]=useState(null),[inv,setInv]=useState(null),[pq,setPq]=useState(null);
 const [pw,setPw]=useState({}),[busy,setBusy]=useState(false);
 const api=(url,body,method="POST")=>fetch(url,{method:body===undefined?"GET":method,headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:body===undefined?undefined:JSON.stringify(body)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Error");return d});
 const run=async fn=>{try{setMsg("");setBusy(true);await fn()}catch(e){setMsg(e.message)}setBusy(false)};
 useEffect(()=>{if(tab==="pedidos"){setOrders(null);run(async()=>setOrders(await api("/api/me/orders")))}if(tab==="solicitudes"){setPq(null);run(async()=>setPq(await api("/api/me/pqrs")))}},[tab]);
 const save=()=>run(async()=>{if(rl){const e=chkPh(rl.countries,pr.pc,pr.pn)||chk(rl.rules,"address",pr.address.trim())||chk(rl.rules,"city",pr.city.trim());if(e)throw new Error(e)}setUser(await api("/api/me",pr,"PATCH"));setMsg("Datos guardados ✓")});
 const out=()=>run(async()=>{await api("/api/logout",{});onClose();localStorage.removeItem("tk");location.reload()});
 const pickImg=e=>{const file=e.target.files[0];if(!file)return;const img=new Image();img.onload=()=>run(async()=>{const c=document.createElement("canvas"),s=Math.min(img.width,img.height);c.width=c.height=256;c.getContext("2d").drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,256,256);setUser(await api("/api/me/avatar",{image:c.toDataURL("image/jpeg",.85)}))});img.src=URL.createObjectURL(file)};
 const cancel=o=>run(async()=>{if(!confirmCancel(o))return;const n=await api(`/api/me/orders/${o.id}/cancel`,{});setInv(n);setOrders(os=>os&&os.map(x=>x.id===n.id?n:x));setMsg("Pedido cancelado ✓")});
 const chpw=()=>run(async()=>{await api("/api/me/password",pw);setPw({});setMsg("Contraseña actualizada ✓ (se cerraron tus otras sesiones)")});
 const pchk=rl?PASS(rl.rules,pw.password||""):[];
 return <motion.div className="ov" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
  <motion.aside className="drawer" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",damping:26,stiffness:220}} onClick={e=>e.stopPropagation()}>
   <button className="x" onClick={onClose} aria-label="Cerrar">×</button>
   <div className="who">{user.avatar?<img className="bigav" src={user.avatar} alt=""/>:<span className="bigav">{user.username[0]}</span>}<div><h2>{user.username}</h2><small>{user.email}</small></div></div>
   <div className="atabs">{[["perfil","Perfil"],["pedidos","Pedidos"],["seguridad","Seguridad"],["solicitudes","Solicitudes"]].map(([k,v])=><button key={k} className={tab===k?"on":""} onClick={()=>{setTab(k);setInv(null);setMsg("")}}>{v}</button>)}</div>
   {tab==="perfil"&&<><label className="btn ghost filebtn">Cambiar foto<input type="file" accept="image/*" hidden onChange={pickImg}/></label>
    <div className="ck" style={{marginTop:14}}>{rl&&<PhoneField cs={rl.countries} cc={pr.pc} pn={pr.pn} onCc={x=>setPr({...pr,pc:x})} onPn={x=>setPr({...pr,pn:x})}/>}
     <input placeholder="Dirección" value={pr.address} onChange={e=>setPr({...pr,address:e.target.value})}/><input placeholder="Ciudad" value={pr.city} onChange={e=>setPr({...pr,city:e.target.value})}/></div>
    <p className="err" role="alert">{msg}</p><div className="acts"><button className="btn" disabled={busy} onClick={save}>Guardar cambios</button><button className="btn ghost" onClick={out}>Cerrar sesión</button></div></>}
   {tab==="pedidos"&&(inv?<><button className="link" onClick={()=>{setInv(null);setMsg("")}}>← Mis pedidos</button>
     <Track o={inv}/>
     <div className="acts">{inv.canCancel&&<button className="btn ghost" disabled={busy} onClick={()=>cancel(inv)}>Cancelar pedido</button>}
      {["enviado","entregado"].includes(inv.status)&&<button className="btn ghost" onClick={()=>onHelp({tipo:"retracto",pedido:inv.id})}>Devolver / cambiar</button>}
      <button className="btn ghost" onClick={()=>onHelp({tipo:"reclamo",pedido:inv.id})}>Tengo un problema</button></div>
     <p className="err" role="alert">{msg}</p>
     <Invoice o={inv} s={rl?.store}/><div className="acts"><button className="btn" onClick={printDoc}>Imprimir / guardar PDF</button></div></>
    :orders===null?<p>Cargando…</p>:!orders.length?<p>Aún no tienes compras.</p>:orders.map(o=><button key={o.id} className="li inv" onClick={()=>setInv(o)}><div><b>{o.id}</b> <span className={"est "+o.status}>{ESTADOS[o.status]}</span><br/><small>{fdate(o.date)} · {(n=>`${n} prenda${n>1?"s":""}`)(o.items.reduce((a,l)=>a+l.q,0))} · factura {o.invoice}</small></div><span>{money(o.total)}</span></button>))}
   {tab==="seguridad"&&<div className="ck">
    <h3 className="sub">Cambiar contraseña</h3>
    {[["current","Contraseña actual","current-password"],["password","Nueva contraseña","new-password"],["password2","Repetir nueva contraseña","new-password"]].map(([k,l,ac])=><input key={k} type="password" autoComplete={ac} placeholder={l} value={pw[k]||""} onChange={e=>setPw({...pw,[k]:e.target.value})}/>)}
    {pw.password&&<ul className="rules">{pchk.map(([l,k])=><li key={l} className={k?"ok":""}>{k?"✓":"○"} {l}</li>)}</ul>}
    <p className="err" role="alert">{msg}</p><div className="acts"><button className="btn" disabled={busy||!pw.current||!pchk.every(x=>x[1])||pw.password!==pw.password2} onClick={chpw}>Actualizar contraseña</button></div>
    <p className="small">Al cambiarla se cierran las sesiones abiertas en otros equipos.</p></div>}
   {tab==="solicitudes"&&<>{pq===null?<p>Cargando…</p>:!pq.length?<p>No tienes solicitudes abiertas.</p>:pq.map(x=><div key={x.radicado} className="li pq"><div><b>{x.radicado}</b> <span className={"est "+x.estado}>{x.estado.replace("_"," ")}</span><br/><small>{tipoTxt(x.tipo)}{x.pedido?` · pedido ${x.pedido}`:""} · {fdate(x.fecha)}</small><p>{x.mensaje}</p>{x.respuesta&&<p className="resp"><b>Respuesta:</b> {x.respuesta}</p>}</div></div>)}
    <div className="acts"><button className="btn" onClick={()=>onHelp({})}>Nueva solicitud</button></div><p className="err">{msg}</p></>}
  </motion.aside></motion.div>;
}
const confirmCancel=o=>window.confirm(`¿Cancelar el pedido ${o.id}? Las prendas vuelven al inventario${o.payment?.method==="tarjeta"?" y se reversa el pago (demostración)":""}.`);
/* celular: pasarela con las prendas de la pared actual (más fácil de tocar que en el cuarto 3D) */
function Strip({list,cat,onPick}){
 const left=p=>Object.values(p.inv?.[p.c[0]]||{}).reduce((a,b)=>a+b,0);
 return <div className="strip" aria-label={"Prendas: "+CATS[cat]}>{list.map((p,i)=><motion.button key={p.id} className="scard" onClick={()=>onPick(i)} initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{delay:.3+i*.05}} whileTap={{scale:.95}}>
  <span className={"sp "+cat}><Pic p={p} type={TYPE[cat]} color={p.c[0]}/></span><b>{p.n}</b><em>{money(p.p)}</em>{left(p)<1&&<small>Agotado</small>}</motion.button>)}</div>;
}
/* instalar la app (PWA): Android/Chrome dan el aviso; en iPhone se explica cómo */
function useInstall(){
 const [ev,setEv]=useState(null),[ios]=useState(()=>/iphone|ipad|ipod/i.test(navigator.userAgent)&&!navigator.standalone);
 const standalone=typeof matchMedia!=="undefined"&&matchMedia("(display-mode: standalone)").matches;
 useEffect(()=>{const h=e=>{e.preventDefault();setEv(e)};addEventListener("beforeinstallprompt",h);const d=()=>setEv(null);addEventListener("appinstalled",d);return()=>{removeEventListener("beforeinstallprompt",h);removeEventListener("appinstalled",d)}},[]);
 if(standalone||IN_APK)return null;
 if(ev)return{kind:"prompt",go:async()=>{ev.prompt();await ev.userChoice.catch(()=>{});setEv(null)}};
 if(ios)return{kind:"ios"};
 return null;
}
function Landing({onPick}){
 const {scrollY}=useScroll(),o=useTransform(scrollY,[0,380],[1,0]),y=useTransform(scrollY,[0,380],[0,-50]),inst=useInstall();
 useEffect(()=>{ /* mantener clic y arrastrar hacia arriba para bajar, con inercia */
  let down=false,y0=0,sy=0,v=0,last=0,moved=0,raf;
  const dn=e=>{if(e.button!==0||e.target.closest("input,select,textarea"))return;cancelAnimationFrame(raf);down=true;moved=0;y0=last=e.clientY;sy=window.scrollY;v=0;document.body.classList.add("grabbing")};
  const mv=e=>{if(!down)return;v=last-e.clientY;last=e.clientY;moved=Math.max(moved,Math.abs(e.clientY-y0));scrollTo(0,sy-(e.clientY-y0))};
  const up=()=>{if(!down)return;down=false;document.body.classList.remove("grabbing");const step=()=>{if(Math.abs(v)<.5)return;scrollBy(0,v);v*=.94;raf=requestAnimationFrame(step)};step()};
  const cl=e=>{if(moved>6){e.stopPropagation();e.preventDefault();moved=0}};
  addEventListener("mousedown",dn);addEventListener("mousemove",mv);addEventListener("mouseup",up);addEventListener("click",cl,true);
  return()=>{removeEventListener("mousedown",dn);removeEventListener("mousemove",mv);removeEventListener("mouseup",up);removeEventListener("click",cl,true);cancelAnimationFrame(raf);document.body.classList.remove("grabbing")};
 },[]);
 return <>
  <section className="intro"><motion.div className="introin" style={{opacity:o,y}}>
   <motion.p className="eyebrow" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.2}}>Colección street · grafiti</motion.p>
   <motion.h1 initial={{opacity:0,y:60,letterSpacing:".3em"}} animate={{opacity:1,y:0,letterSpacing:".01em"}} transition={{duration:1.1,ease:[.2,.8,.2,1]}}>{BRAND}</motion.h1>
   <motion.p className="lead" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.6,duration:.8}}>{BRAND_TEXT}</motion.p>
   {inst&&<motion.div className="install" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:1.3}}>{inst.kind==="prompt"?<button className="btn ghost" onClick={inst.go}>Instalar la app</button>:<small>En iPhone: toca Compartir y luego “Agregar a inicio” para tenerla como app.</small>}</motion.div>}
   <motion.button className="cue" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.1}} onClick={()=>document.getElementById("elige").scrollIntoView({behavior:"smooth"})}>Arrastra hacia arriba o desliza<motion.i animate={{y:[0,10,0]}} transition={{repeat:Infinity,duration:1.6}}>↓</motion.i></motion.button>
  </motion.div></section>
  <section className="choose" id="elige">
   <motion.h2 initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:.7}}>¿Para quién buscas?</motion.h2>
   <div className="cards">{["hombre","mujer"].map((k,i)=><motion.button key={k} className={"card "+k} initial={{opacity:0,y:90}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.25}} transition={{duration:.9,delay:i*.15,ease:[.2,.8,.2,1]}} whileHover={{y:-8}} onClick={()=>onPick(k)}>
    <span className="cimg"/><span className="clabel"><b>{k}</b><small>Entrar al cuarto →</small></span></motion.button>)}</div>
  </section></>;
}
export default function App(){
 const [data,setData]=useState(null),[g,setG]=useState(null),[c,setC]=useState("camisas"),[sel,setSel]=useState(null),[panel,setPanel]=useState(null),[toast,setToast]=useState("");
 const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.getItem("cart")||"[]")}catch{return[]}});
 const seen=useRef(new Set()),[turn,setTurn]=useState(0);
 const go=d=>{setTurn(turn+d);setC(KEYS[mod(KEYS.indexOf(c)+d)])};
 const to=k=>{let d=mod(KEYS.indexOf(k)-KEYS.indexOf(c));if(d===3)d=-1;setTurn(turn+d);setC(k)};
 /* al soltar el arrastre, el cuarto queda en la pared t */
 const onSettle=useCallback(t=>{setTurn(t);setC(KEYS[mod(t)])},[]);
 /* cámara: cómo debe arrancar el cuarto la próxima vez que aparezca (entrar desde la portada o volver de una prenda) */
 const camFrom=useRef(null);
 /* transición de grafiti: fn se ejecuta cuando la pantalla está tapada */
 const reduce=useReducedMotion(),[wp,setWp]=useState(null),mid=useRef(null);
 const wipe=(label,fn)=>{if(reduce||wp){fn();return}mid.current=fn;setWp({label,k:Date.now()})};
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem("theme")||"light"}catch{return"light"}});
 useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem("theme",theme)}catch{}},[theme]);
 const [auth,setAuth]=useState(null),[rl,setRl]=useState(null);
 useEffect(()=>{fetch("/api/rules").then(r=>r.json()).then(setRl).catch(()=>{})},[]);
 const [token,setTok]=useState(()=>localStorage.getItem("tk")),[user,setUser]=useState(null);
 const setToken=t=>{setTok(t);try{t?localStorage.setItem("tk",t):localStorage.removeItem("tk")}catch{}};
 useEffect(()=>{if(!token){setUser(null);return}fetch("/api/me",{headers:{Authorization:"Bearer "+token}}).then(r=>r.ok?r.json():Promise.reject()).then(setUser).catch(()=>setToken(null))},[token]);
 useEffect(()=>{const h=e=>{if(!g||sel!==null||panel||find||doc||e.target.closest?.("input,textarea,select"))return;if(e.key==="ArrowRight")go(1);if(e.key==="ArrowLeft")go(-1)};addEventListener("keydown",h);return()=>removeEventListener("keydown",h)});
 useEffect(()=>{const q=new URLSearchParams(location.search).get("g");if(q==="hombre"||q==="mujer"){setG(q);setC("camisas");setTurn(0);camFrom.current={type:"enter"}}},[]);
 const load=()=>fetch("/api/catalog").then(r=>{if(!r.ok)throw 0;return r.json()}).then(setData).catch(()=>setData(false));
 const [find,setFind]=useState(false);
 /* abrir un producto desde el buscador: elige género, pared y prenda */
 const openProduct=(gg,cat,i)=>{setFind(false);setAuth(null);setG(gg);setC(cat);setTurn(KEYS.indexOf(cat));camFrom.current=null;seen.current.add(gg+cat);setSel(i);scrollTo(0,0)};
 const [doc,setDoc]=useState(null),info=(k,pre)=>setDoc({k,pre}); /* políticas y PQRS: capa encima de todo (no borra el carrito a medio llenar) */
 useEffect(()=>{load()},[]);
 useEffect(()=>{try{localStorage.setItem("cart",JSON.stringify(cart))}catch{}},[cart]);
 const say=m=>{setToast(m);setTimeout(()=>setToast(""),2400)};
 const add=it=>{const ex=cart.find(x=>x.key===it.key);
  setCart(ex?cart.map(x=>x===ex?{...x,q:x.q+it.q}:x):[...cart,it]);say("Agregado al carrito")};
 if(data===false)return <p className="msg">No se pudo cargar el catálogo. Revisa que MySQL esté encendido en XAMPP y que el servidor esté corriendo con <code>npm start</code>.</p>;
 const list=g&&data?data[g][c]:[],p=sel!==null?list[sel]:null,key=g+c,skip=seen.current.has(key);
 const pick=(i,f)=>{seen.current.add(key);camFrom.current=f;setSel(i)};
 const n=cart.reduce((a,b)=>a+b.q,0);
 return <LayoutGroup><header><button className="brand" onClick={()=>{const f=()=>{setG(null);setSel(null);setAuth(null)};g||auth?wipe("Inicio",f):f()}}><Brand/></button>
  <div className="hr"><button className="themebtn sbtn" onClick={()=>setFind(true)} aria-label="Buscar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2"/><path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg></button><button className="themebtn" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label={theme==="dark"?"Tema claro":"Tema oscuro"}>{theme==="dark"?"☀":"☾"}</button><button className={user?"avatar":"avatar guest"} onClick={()=>user?setPanel({acc:true}):wipe("Tu cuenta",()=>setAuth("login"))} aria-label="Mi cuenta">{user?(user.avatar?<img src={user.avatar} alt=""/>:<span>{user.username[0]}</span>):<><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span className="lbl">Ingresar</span></>}</button><button className="cartbtn" onClick={()=>setPanel({order:null})} aria-label="Carrito"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="2"/></svg><span className="lbl">Carrito</span> <motion.b key={n} initial={{scale:1.6}} animate={{scale:1}}>{n}</motion.b></button></div></header>
  <main className="flat">{auth?(rl?<AuthPage mode={auth} setMode={setAuth} rules={rl.rules} cs={rl.countries} setToken={setToken} setUser={setUser} onInfo={k=>info(k)} onDone={()=>wipe("Bienvenido",()=>setAuth(null))} onBack={()=>wipe("Tienda",()=>setAuth(null))}/>:<p className="msg">Cargando…</p>):<>
  {!g&&<Landing onPick={k=>wipe(k,()=>{setG(k);setC("camisas");setTurn(0);camFrom.current={type:"enter"}})}/>}
  {g&&!p&&<div className="roomwrap"><nav className="float">{["hombre","mujer"].map(k=><button key={k} className={"pill "+(g===k?"on":"")} onClick={()=>g!==k&&wipe(k,()=>setG(k))}>{k}</button>)}<i/>
   {Object.entries(CATS).map(([k,v])=><button key={k} className="tab" onClick={()=>to(k)}>{v}{c===k&&<motion.u layoutId="ul"/>}</button>)}</nav>
  {data&&<><button className="turn l" onClick={()=>go(-1)} aria-label="Pared anterior">‹</button><button className="turn r" onClick={()=>go(1)} aria-label="Pared siguiente">›</button>
   <Room key={g} turn={turn} idx={KEYS.indexOf(c)} data={data} g={g} skip={skip} fromRef={camFrom} onPick={pick} onSettle={onSettle}/>
   <p className="hint"><span className="hd">Mantén clic y arrastra para girar · cursor sobre la prenda: de frente · clic: acercarte</span><span className="hm">Desliza para girar · toca una prenda</span></p>
</>}</div>}
  {g&&!p&&data&&<Strip list={list} cat={c} onPick={i=>{pick(i,null);scrollTo(0,0)}}/>}
  {p&&<Detail key={p.id} p={p} g={g} c={c} type={TYPE[c]} onBack={()=>setSel(null)} onAdd={add} onBuy={it=>setPanel({order:[it]})}/>}
  </>}</main>
  <footer className="foot"><div className="fin"><div><b className="fbrand">{BRAND}</b><small>{rl?.store?`${rl.store.razon} · NIT ${rl.store.nit}`:""}</small><small>{rl?.store?.direccion}</small></div>
   <nav aria-label="Información">{LINKS.map(([k,l])=><button key={k} onClick={()=>info(k)}>{l}</button>)}{IN_APK&&<button onClick={()=>location.href="armario://setup"}>Cambiar servidor</button>}</nav>
   <div><small>{rl?.store?.email}</small><small>WhatsApp {rl?.store?.whatsapp}</small><small>{rl?.store?.horario}</small><a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer">Superintendencia de Industria y Comercio</a></div></div></footer>
  <AnimatePresence>{doc&&<motion.div key={"i"+doc.k} className="ov top" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setDoc(null)}><motion.aside className="drawer" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",damping:26,stiffness:220}} onClick={e=>e.stopPropagation()}><button className="x" onClick={()=>setDoc(null)} aria-label="Cerrar">×</button>{rl?<InfoBody k={doc.k} store={{...rl.store,envio:rl.shipping}} user={user} token={token} pre={doc.pre} onLink={k=>info(k)}/>:<p>Cargando…</p>}</motion.aside></motion.div>}</AnimatePresence>
  <AnimatePresence>{find&&data&&<Search key="s" data={data} onOpen={openProduct} onClose={()=>setFind(false)}/>}</AnimatePresence>
  <AnimatePresence>{panel&&(panel.acc?<Account key="a" user={user} token={token} setUser={setUser} onClose={()=>setPanel(null)} rl={rl} onHelp={pre=>info("ayuda",pre)}/>
   :<Panel key="p" cart={cart} setCart={setCart} order={panel.order} user={user} token={token} rl={rl} onInfo={k=>info(k)} onClose={()=>setPanel(null)} onPaid={load}/>)}</AnimatePresence>
  <Wipe w={wp} onMid={()=>{const f=mid.current;mid.current=null;f&&f();scrollTo(0,0)}} onEnd={()=>setWp(null)}/>
  <AnimatePresence>{toast&&<motion.div key="t" className="toast" initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} exit={{opacity:0}}>{toast}</motion.div>}</AnimatePresence>
 </LayoutGroup>;
}
