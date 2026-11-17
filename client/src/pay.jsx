import {useState} from "react";
import {motion,AnimatePresence} from "framer-motion";
import {money} from "./util.js";
/*
 Forma de pago: tarjeta (crédito/débito) o contra entrega.
 MODO DEMOSTRACIÓN: no hay pasarela. El número completo y el CVV se validan aquí y NUNCA se envían al servidor;
 solo viajan la franquicia y los últimos 4 dígitos. Para cobrar de verdad conecta una pasarela (Wompi, PayU, Mercado Pago…).
*/
const B={visa:{n:"Visa",len:[13,16,19],cvv:3},mastercard:{n:"Mastercard",len:[16],cvv:3},amex:{n:"American Express",len:[15],cvv:4},diners:{n:"Diners Club",len:[14,16],cvv:3}};
export const digits=s=>String(s||"").replace(/\D/g,"");
export const brandOf=n=>/^3[47]/.test(n)?"amex":/^3(0[0-5]|[689])/.test(n)?"diners":/^4/.test(n)?"visa":/^(5[1-5]|2(22[1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/.test(n)?"mastercard":"";
const luhn=n=>{let s=0;for(let i=0;i<n.length;i++){let d=+n[n.length-1-i];if(i%2){d*=2;if(d>9)d-=9}s+=d}return s%10===0};
const fmtNum=(n,b)=>b==="amex"?[n.slice(0,4),n.slice(4,10),n.slice(10,15)].filter(Boolean).join(" "):n.replace(/(\d{4})(?=\d)/g,"$1 ");
const fmtExp=v=>{const d=digits(v).slice(0,4);return d.length>2?d.slice(0,2)+"/"+d.slice(2):d};
export const CUOTAS=[1,2,3,6,12,24,36];
export function checkCard(c){
 const n=digits(c.num),b=brandOf(n),e={};
 if(!n)e.num="Escribe el número de la tarjeta";else if(!b)e.num="Aceptamos Visa, Mastercard, American Express y Diners";else if(!B[b].len.includes(n.length))e.num=`Una ${B[b].n} tiene ${B[b].len.join(" o ")} dígitos`;else if(!luhn(n))e.num="El número no es válido, revísalo";
 if(!/^[\p{L} .'-]{3,40}$/u.test((c.name||"").trim()))e.name="Escribe el nombre como aparece en la tarjeta";
 const m=/^(\d{2})\/(\d{2})$/.exec(c.exp||"");
 if(!m||+m[1]<1||+m[1]>12)e.exp="Usa el formato MM/AA";else{const now=new Date(),y=2000+ +m[2],end=new Date(y,+m[1],1);if(end<=now)e.exp="La tarjeta está vencida";else if(y>now.getFullYear()+20)e.exp="Año no válido"}
 if(digits(c.cvv).length!==(B[b]?.cvv||3))e.cvv=`${B[b]?.cvv||3} dígitos`;
 return e;
}
/* lo único que se envía al servidor */
export const payPayload=p=>p.method==="contraentrega"?{method:"contraentrega"}:{method:"tarjeta",brand:brandOf(digits(p.num)),last4:digits(p.num).slice(-4),kind:p.kind,cuotas:p.kind==="credito"?+p.cuotas||1:1};

const CardIco=()=><svg viewBox="0 0 32 24" aria-hidden="true"><rect x="1" y="2" width="30" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M1 8h30" stroke="currentColor" strokeWidth="3"/><path d="M6 16h8" stroke="currentColor" strokeWidth="2"/></svg>;
const CashIco=()=><svg viewBox="0 0 32 24" aria-hidden="true"><path d="M2 5h17v12H2zM19 9h6l4 4v4h-10z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="8" cy="19" r="2.6" fill="currentColor"/><circle cx="24" cy="19" r="2.6" fill="currentColor"/></svg>;

export function PayForm({pay,setPay,errs,total,busy}){
 const [flip,setFlip]=useState(false),set=(k,v)=>setPay({...pay,[k]:v});
 const n=digits(pay.num),b=brandOf(n),shown=fmtNum(n,b);
 const fld=(k,label,props,cls="")=><div className={"fld "+cls}><label htmlFor={"pay-"+k}>{label}</label><input id={"pay-"+k} className={errs[k]?"bad":""} value={pay[k]||""} {...props}/>{errs[k]&&<small className="ferr">{errs[k]}</small>}</div>;
 return <div className="paym">
  <h3>Forma de pago</h3>
  <div className="pmopts" role="radiogroup" aria-label="Forma de pago">{[["tarjeta","Tarjeta","Crédito o débito",CardIco],["contraentrega","Contra entrega","Pagas al recibir",CashIco]].map(([k,t,s,I])=>
   <button key={k} type="button" role="radio" aria-checked={pay.method===k} className={pay.method===k?"on":""} onClick={()=>set("method",k)}><I/><b>{t}</b><small>{s}</small>{pay.method===k&&<motion.u initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",stiffness:500,damping:18}}/>}</button>)}</div>
  <AnimatePresence mode="wait" initial={false}>{pay.method==="tarjeta"?
   <motion.div key="t" className="cardf" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.22}}>
    <div className={"ccard"+(busy?" busy":"")} style={{perspective:900}}><motion.div className="cin" animate={{rotateY:flip?180:0}} transition={{type:"spring",stiffness:160,damping:18}}>
     <div className="cf front"><span className="chip"/><b className="cb">{B[b]?.n||""}</b><span className="cn">{shown||"•••• •••• •••• ••••"}</span><span className="ch"><small>Titular</small>{(pay.name||"TU NOMBRE").toUpperCase()}</span><span className="ce"><small>Vence</small>{pay.exp||"MM/AA"}</span></div>
     <div className="cf back"><i className="stripe"/><span className="cv">{(pay.cvv||"").replace(/./g,"•")||"CVV"}</span></div>
    </motion.div></div>
    <div className="cgrid">
     {fld("num","Número de la tarjeta",{inputMode:"numeric",autoComplete:"cc-number",placeholder:"1234 5678 9012 3456",value:shown,onChange:e=>set("num",digits(e.target.value).slice(0,19))},"wide")}
     {fld("name","Nombre en la tarjeta",{autoComplete:"cc-name",placeholder:"Como aparece impreso",onChange:e=>set("name",e.target.value.slice(0,40))},"wide")}
     {fld("exp","Vence",{inputMode:"numeric",autoComplete:"cc-exp",placeholder:"MM/AA",onChange:e=>set("exp",fmtExp(e.target.value))})}
     {fld("cvv","CVV",{inputMode:"numeric",autoComplete:"cc-csc",placeholder:b==="amex"?"4 dígitos":"3 dígitos",type:"password",onFocus:()=>setFlip(true),onBlur:()=>setFlip(false),onChange:e=>set("cvv",digits(e.target.value).slice(0,4))})}
    </div>
    <div className="ktype">{[["credito","Crédito"],["debito","Débito"]].map(([k,l])=><button key={k} type="button" className={pay.kind===k?"on":""} onClick={()=>set("kind",k)}>{l}</button>)}
     {pay.kind==="credito"&&<label className="cuotas">Cuotas <select value={pay.cuotas} onChange={e=>set("cuotas",+e.target.value)}>{CUOTAS.map(c=><option key={c} value={c}>{c}</option>)}</select></label>}</div>
    <p className="demo">Modo demostración: no se hace ningún cobro. El número completo y el CVV no salen de tu navegador; solo se guardan la franquicia y los últimos 4 dígitos.</p>
   </motion.div>
   :<motion.div key="c" className="codnote" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.22}}>
    <CashIco/><p>Pagas en <b>efectivo o con datáfono</b> cuando recibas tu pedido en la dirección indicada. Ten listo <b>{money(total)}</b>.</p>
   </motion.div>}
  </AnimatePresence>
 </div>;
}
