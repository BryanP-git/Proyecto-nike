import {useState,useEffect,useRef} from "react";
import {motion,useMotionValue,useTransform,useVelocity,useAnimationControls,useAnimationFrame,animate,useReducedMotion} from "framer-motion";
import {Pic,Art,TYPE,usePhoto,useTone} from "./art.jsx";
import {money} from "./util.js";

export const KEYS=["camisas","hoodies","pantalones","zapatos"];
export const mod=n=>((n%4)+4)%4;
const spring={type:"spring",stiffness:120,damping:15};
const gtr={...spring,layout:{duration:.45,ease:[.2,.8,.2,1]}};
const TURN={duration:1.1,ease:[.65,0,.25,1]};
const LITE={checked:false,on:false}; /* se mide una sola vez por visita */
/* calidad forzada: ?calidad=alta o ?calidad=baja en la dirección (queda guardada en el navegador); ?calidad=auto vuelve a medir */
try{const q=new URLSearchParams(location.search).get("calidad");if(q)q==="auto"?localStorage.removeItem("calidad"):localStorage.setItem("calidad",q);
 const v=localStorage.getItem("calidad");if(v==="alta"||v==="baja"){LITE.checked=true;LITE.on=v==="baja"}}catch{}

/* Medidas: la pared ocupa ~74% del alto para que se vean techo y piso, como un cuarto real */
function useRoomSize(){
 const f=()=>{const w=innerWidth,m=w<700,vh=Math.max(360,innerHeight-64);
  /* en celular la pared mide 1.2× el ancho: más grande, Chrome deja de pintar piso y techo al girar */
  const W=Math.round(m?w*1.2:Math.min(vh*1.48,w*.94));
  return{w,W,m,h:m?Math.min(vh,Math.round(W*1.1)):vh}};
 const [v,setV]=useState(f);
 useEffect(()=>{const r=()=>setV(f());addEventListener("resize",r);return()=>removeEventListener("resize",r)},[]);
 return v;
}

/* Barra industrial: tubo de hierro con bridas atornilladas a la pared y sombra proyectada */
const Pipe=()=><div className="pipe" aria-hidden="true"><s/><i className="fl l"/><i className="fl c"/><i className="fl r"/><b/></div>;

/*
 Cuarto 3D (estudio de grafiti): caja de 4 paredes + techo + piso.
 - La cámara está un poco detrás del centro, por eso se ven techo, piso y las esquinas.
 - Mantener clic (o el dedo) y arrastrar a izquierda/derecha gira el cuarto; al soltar se acomoda en la pared más cercana.
 - Las prendas se balancean con la inercia del giro (en TODAS las paredes) y al llegar a una pared.
 - Clic en una prenda: la cámara se acerca a ella y luego se abre la ficha.
*/
export function Room({turn,idx,data,g,skip,fromRef,onPick,onSettle}){
 const {w,h,W,m}=useRoomSize(),R=W/2,D=Math.round(R*1.3),T=Math.round((h-R)*.55),vy=T+R/2;
 const reduce=useReducedMotion();
 const [from]=useState(()=>{const f=fromRef.current;fromRef.current=null;return f});
 const enter=from?.type==="enter";
 const rot=useMotionValue(turn*90);
 const cx=useMotionValue(from?.x||0),cy=useMotionValue(from?.y||0),cz=useMotionValue(enter?-W*.42:from?.z||0),yaw=useMotionValue(enter?-24:0);
 const [arr,setArr]=useState(null),[fx,setFx]=useState(false);
 const dir=useRef(1),anim=useRef(null),own=useRef(null),drag=useRef(null),wasDrag=useRef(false),busy=useRef(false),box=useRef(null);
 /* cada pared lleva su giro completo (no lo hereda): así el navegador detecta el cursor en cualquier pared, no solo en camisas */
 const wr=[useTransform(rot,r=>r),useTransform(rot,r=>r-90),useTransform(rot,r=>r-180),useTransform(rot,r=>r-270)];
 const swing=useVelocity(rot); /* velocidad de giro (°/s): mueve el péndulo de cada prenda */
 /* la pared que se va conserva el volumen mientras termina de girar */
/* calidad automática: si el equipo no alcanza ~40 cuadros/s, se apagan el volumen y los efectos más pesados */
 const [lite,setLite]=useState(()=>LITE.on);
 useEffect(()=>{if(LITE.checked)return;let raf,n=0,t0=0,pv=0;const go=setTimeout(()=>{const f=t=>{if(!t0||t-pv>300){t0=t;n=0} /* pestaña oculta o pausa: vuelve a medir */
   pv=t;n++;if(t-t0<1500)raf=requestAnimationFrame(f);else{LITE.checked=true;LITE.on=n/((t-t0)/1000)<40;setLite(LITE.on)}};raf=requestAnimationFrame(f)},2600);return()=>{clearTimeout(go);cancelAnimationFrame(raf)}},[]);
 const [trail,setTrail]=useState(-1),last=useRef(idx);
 useEffect(()=>{if(last.current===idx)return;setTrail(last.current);last.current=idx;const t=setTimeout(()=>setTrail(-1),1500);return()=>clearTimeout(t)},[idx]);
 const arrive=t=>setArr({idx:mod(t),dir:dir.current,n:performance.now()});
 /* giro por flechas, botones o pestañas */
 useEffect(()=>{
  if(own.current===turn){own.current=null;return}
  if(Math.abs(rot.get()-turn*90)<.01)return;
  anim.current?.stop();dir.current=Math.sign(turn*90-rot.get())||1;
  if(reduce){rot.set(turn*90);return}
  anim.current=animate(rot,turn*90,{...TURN,onComplete:()=>arrive(turn)});
 },[turn]);
 /* cámara: entrar al cuarto desde la portada, o alejarse de la prenda al volver de la ficha */
 useEffect(()=>{
  if(!from)return;
  if(reduce){[cx,cy,cz,yaw].forEach(v=>v.set(0));return}
  const t=setTimeout(()=>{const o={duration:enter?1.7:.95,ease:[.2,.8,.2,1]};[cx,cy,cz,yaw].forEach(v=>animate(v,0,o));if(!enter)setTimeout(()=>arrive(turn),420)},enter?40:470);
  return()=>clearTimeout(t);
 },[]);
 /* arrastrar para girar, con inercia */
 useEffect(()=>{
  const mv=e=>{const d=drag.current;if(!d)return;
   if(!d.on){if(Math.abs(e.clientX-d.x)<7)return;Object.assign(d,{on:true,x:e.clientX,lx:e.clientX,r:rot.get(),t:performance.now(),v:0});anim.current?.stop();document.body.classList.add("grabbing");return}
   const k=90/(Math.min(w,W)*.8),now=performance.now(),dt=Math.max(8,now-d.t);
   rot.set(d.r-(e.clientX-d.x)*k);
   d.v=.65*d.v+.35*(-(e.clientX-d.lx)*k/dt*1000);d.lx=e.clientX;d.t=now;
  };
  const up=()=>{const d=drag.current;if(!d)return;drag.current=null;if(!d.on)return;
   wasDrag.current=true;setTimeout(()=>wasDrag.current=false,0);document.body.classList.remove("grabbing");
   const v=performance.now()-d.t>90?0:Math.max(-500,Math.min(500,d.v)),base=Math.round(d.r/90);
   const t=Math.max(base-2,Math.min(base+2,Math.round((rot.get()+v*.2)/90)));
   dir.current=Math.sign(t*90-rot.get())||Math.sign(v)||dir.current;
   if(reduce){rot.set(t*90)}else anim.current=animate(rot,t*90,{type:"spring",stiffness:75,damping:17,velocity:v,onComplete:()=>arrive(t)});
   if(t!==turn){own.current=t;onSettle(t)}else if(reduce)arrive(t);
  };
  addEventListener("pointermove",mv);addEventListener("pointerup",up);addEventListener("pointercancel",up);
  return()=>{removeEventListener("pointermove",mv);removeEventListener("pointerup",up);removeEventListener("pointercancel",up);document.body.classList.remove("grabbing")};
 },[w,W,turn,onSettle,reduce]);
 const down=e=>{if(busy.current||(e.pointerType==="mouse"&&e.button!==0))return;drag.current={x:e.clientX,on:false}};
 const clickCap=e=>{if(wasDrag.current){e.stopPropagation();e.preventDefault()}};
 /* clic en prenda: la cámara se acerca (dolly) y luego abre la ficha */
 const pick=(i,el)=>{
  if(busy.current)return;
  if(reduce||!el||!box.current){onPick(i,null);return}
  busy.current=true;anim.current?.stop();rot.set(turn*90);
  const r=el.getBoundingClientRect(),b=box.current.getBoundingClientRect();
  const dx=r.left+r.width/2-(b.left+b.width/2),dy=r.top+r.height*.45-(b.top+vy),s=m?1.8:2.2;
  const f={type:"focus",x:-dx,y:-dy,z:D*(1-1/s)},o={duration:.62,ease:[.7,0,.2,1]};
  setFx(true);
  Promise.all([animate(cx,f.x,o),animate(cy,f.y,o),animate(cz,f.z,o)]).then(()=>onPick(i,f));
 };
 return <div ref={box} className={"room"+(m?" m":"")+(lite?" lite":"")} style={{height:h,perspective:D,perspectiveOrigin:`50% ${vy}px`,"--vy":vy+"px"}} onPointerDown={down} onClickCapture={clickCap}>
  <motion.div className="cam" style={{x:cx,y:cy,z:cz,rotateY:yaw,originX:.5,originY:`${vy}px`,originZ:D}}>
   <div className="rig">
    {KEYS.map((k,i)=>{const list=data[g][k],sk=skip||i!==idx,kick=arr&&arr.idx===i?arr:null,deep=!lite&&(i===idx||i===trail); /* volumen solo en la pared de enfrente (y la que se va mientras gira): ahorra GPU */
     return <motion.div key={g+k} className={"wall "+k} style={{width:W,height:R,marginLeft:-R,top:T,backgroundImage:`url(/img/pared-${k}.jpg)`,rotateY:wr[i],originX:.5,originY:.5,originZ:R,pointerEvents:i===idx?"auto":"none"}}>
      <i className="wfx" aria-hidden="true"/>
      {k==="zapatos"?<Pyramid list={list} skip={sk} kick={kick} onPick={pick}/>:<><Pipe/><Rail list={list} type={TYPE[k]} skip={sk} swing={swing} kick={kick} onPick={pick} deep={deep}/></>}</motion.div>})}
    <motion.div className="spin" style={{rotateY:rot,originX:.5,originY:.5,originZ:R}}><div className="floor" style={{width:W,height:W,marginLeft:-R,top:T+R}}>{KEYS.map((k,i)=><i key={k} className="refl" style={{"--img":`url(/img/pared-${k}.jpg)`,transform:`rotate(${i*90}deg)`}}/>)}</div>
    <div className="ceil" style={{width:W,height:W,marginLeft:-R,top:T-W}}><i className="neon n1"/><i className="neon n2"/><i className="lamp a"/><i className="lamp b"/></div></motion.div>
   </div>
  </motion.div>
  <div className="dust" aria-hidden="true"><i/></div>
  <motion.div className="zoomfx" aria-hidden="true" initial={false} animate={{opacity:fx?1:0,scale:fx?1:1.5}} transition={{duration:.55,ease:"easeOut"}}/>
 </div>;
}

/* Gancho de la percha: siempre de frente (no gira con la prenda), cromado con borde oscuro para que se vea sobre el grafiti.
   Coordenadas en el mismo sistema de la foto (800 × 1000); el tubo queda en y≈28 con radio ≈34. */
const HOOK="M400 150V6C400-50 480-58 482-10C483 12 468 24 451 19";
function Chrome({d,w=16}){return <><path d={d} stroke="#07070a" strokeWidth={w+9} opacity=".85"/><path d={d} stroke="#c3c9d2" strokeWidth={w}/><path d={d} stroke="#5d646e" strokeWidth={w*.45} transform="translate(2.5 3)"/><path className="glint" d={d} stroke="#fff" strokeWidth={w*.28} transform="translate(-3 -3)"/></>}
export const Hook=()=><svg className="hook" viewBox="0 0 800 1000" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d={HOOK} stroke="#000" strokeWidth="22" opacity=".4" transform="translate(7 16)"/><Chrome d={HOOK} w={15}/><circle cx="400" cy="6" r="5" fill="#fff" opacity=".9"/></svg>;
/* Percha (gira con la prenda): brazos para camisas/hoodies, barra con pinzas para pantalones */
export function Hanger({type}){
 const pants=type==="pantalon";
 return <svg className="hanger" viewBox="0 0 800 1000" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
  {pants?<><Chrome d="M400 120V176" w={14}/><rect x="326" y="168" width="148" height="30" rx="8" fill="#c3c9d2" stroke="#07070a" strokeWidth="7"/><rect x="332" y="172" width="136" height="7" rx="3" fill="#fff" opacity=".75"/>
   <rect x="332" y="186" width="26" height="36" rx="4" fill="#2a2d33" stroke="#07070a" strokeWidth="4"/><rect x="442" y="186" width="26" height="36" rx="4" fill="#2a2d33" stroke="#07070a" strokeWidth="4"/></>
  :<><Chrome d="M400 120V108M168 240C222 200 330 150 400 106C470 150 578 200 632 240" w={17}/><circle cx="400" cy="108" r="13" fill="#c3c9d2" stroke="#07070a" strokeWidth="5"/></>}
 </svg>;
}
/* Volumen: la foto se repite en capas a distinta profundidad (como un libro de hojas) y forma el grosor de la prenda.
   De frente no se nota; de lado se ve el costado redondeado y con sombra, como ropa real. */
const DEPTH={camisa:1.05,hoodie:1.8,pantalon:1.2};
const LAYERS=Array.from({length:8},(_,k)=>.42-k*.12).map(z=>({z:+z.toFixed(3),s:(1+.025*(1-4*z*z)).toFixed(3),b:(.5+.38*(z+.5)).toFixed(3)}));

function Slot({p,i,type,skip,swing,kick,onPick,deep,w=9.5}){
 const [hv,setHv]=useState(false);
 const {src,fail}=usePhoto(p,p.c[0]),[ok,setOk]=useState(false),tone=useTone(ok&&deep?src:null);
 useEffect(()=>setOk(false),[src]);
 /* péndulo: cada prenda tiene su propio resorte (no se mueven todas iguales); el giro del cuarto la empuja */
 const rotate=useMotionValue(0),ph=useRef({a:0,v:0}),K=46+(i%3)*14,Cd=2.6+(i%2)*.7;
 useAnimationFrame((_,dt)=>{const s=ph.current,h=Math.min(dt,34)/1000,goal=Math.max(-11,Math.min(11,-swing.get()*.045));
  if(!goal&&Math.abs(s.a)<.02&&Math.abs(s.v)<.05){if(s.a){s.a=0;s.v=0;rotate.set(0)}return}
  s.v+=(-K*(s.a-goal)-Cd*s.v)*h;s.a=Math.max(-28,Math.min(28,s.a+s.v*h));rotate.set(s.a)});
 useEffect(()=>{if(!kick)return;const t=setTimeout(()=>{ph.current.v+=kick.dir*(34+(i%3)*10)},i*65);return()=>clearTimeout(t)},[kick]);
 const vol=deep&&ok&&src&&tone,mask=vol?{WebkitMaskImage:`url(${src})`,maskImage:`url(${src})`}:null;
 return <motion.button className="slot" aria-label={`${p.n}, ${money(p.p)}`} onClick={e=>onPick(i,e.currentTarget.querySelector(".gar"))}
  onHoverStart={()=>setHv(true)} onHoverEnd={()=>setHv(false)} onFocus={()=>setHv(true)} onBlur={()=>setHv(false)}
  animate={{width:hv?"17cqw":w+"cqw"}} transition={{type:"spring",stiffness:170,damping:20}}>
  <motion.div className="hang" initial={skip?false:{x:420,opacity:0}} animate={{x:0,opacity:1}} transition={{delay:.5+i*.09,type:"spring",damping:16,stiffness:70}}>
   <motion.div className="swing" style={{rotate}}>
    {src&&<Hook/>}
    <motion.div className="sway" animate={{rotate:hv?0:[0,1.4,0,-1.4,0]}} transition={hv?{duration:.3}:{duration:5+i*.4,repeat:Infinity,ease:"easeInOut"}}>
     <motion.div layoutId={`g-${p.id}`} className={"gar"+(vol?" vol":"")} style={{transformPerspective:900,"--d":DEPTH[type]+"cqw"}} animate={{rotateY:hv?0:80,scale:hv?1.12:1}} transition={gtr}>
      {vol&&<>{/* espalda (más oscura) y capas intermedias del grosor */}
       <img className="pic ly back" src={src} alt="" aria-hidden="true" draggable={false}/>
       {LAYERS.map(l=><i key={l.z} className="ly" style={{...mask,background:`rgb(${tone.map(c=>Math.round(c*l.b)).join(" ")})`,transform:`translateZ(calc(var(--d) * ${l.z})) scale(${l.s})`}}/>)}</>}
      {src&&<Hanger type={type}/>}
      {src?<img className="pic front" src={src} alt={p.n} draggable={false} onError={fail} onLoad={()=>setOk(true)}/>:<Art type={type} color={p.c[0]}/>}
     </motion.div>
    </motion.div>
   </motion.div>
  </motion.div>
  <motion.span className="tag" animate={{opacity:hv?1:0,y:hv?0:10}}><b>{p.n}</b>{money(p.p)}</motion.span>
 </motion.button>;
}
/* hasta 10 prendas por barra: el ancho de cada percha se ajusta a la cantidad */
const Rail=({list,type,skip,swing,kick,onPick,deep})=>{const w=Math.min(9.5,69/list.length);return <div className="rail">{list.map((p,i)=><Slot key={p.id} p={p} i={i} w={w} type={type} skip={skip} swing={swing} kick={kick} onPick={onPick} deep={deep}/>)}</div>};

function Block({p,d,skip,kick,onPick}){
 const [hv,setHv]=useState(false),hop=useAnimationControls();
 /* al llegar a la pared de zapatos, cada zapato da un saltico */
 useEffect(()=>{if(kick)hop.start({y:["0%","-16%","0%","-4%","0%"],rotate:[0,-7*kick.dir,3*kick.dir,0],transition:{duration:.75,delay:d*.6,ease:"easeOut"}})},[kick]);
 return <motion.button className="blk" aria-label={`${p.n}, ${money(p.p)}`} onClick={e=>onPick(e.currentTarget.querySelector(".shoe"))} onHoverStart={()=>setHv(true)} onHoverEnd={()=>setHv(false)} onFocus={()=>setHv(true)} onBlur={()=>setHv(false)}
  initial={skip?false:{y:-300,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.5+d,type:"spring",damping:14,stiffness:90}}>
  <motion.div layoutId={`g-${p.id}`} className="shoe" animate={hv?{x:"7%",y:"-16%",scale:1.2,rotate:-6}:{x:0,y:0,scale:1,rotate:0}} transition={gtr}><motion.div className="hop" animate={hop}><Pic p={p} type="zapato" color={p.c[0]}/></motion.div></motion.div>
  <motion.span className="tag" animate={{opacity:hv?1:0}}><b>{p.n}</b>{money(p.p)}</motion.span>
 </motion.button>;
}
function Pyramid({list,skip,kick,onPick}){
 const rows=[list.slice(0,1),list.slice(1,3),list.slice(3,6),list.slice(6,10)]; /* pirámide 1-2-3-4 = 10 zapatos */
 return <div className="pyr">{rows.map((r,ri)=><div className="prow" key={ri}>{r.map((p,ci)=><Block key={p.id} p={p} d={(3-ri)*.22+ci*.08} skip={skip} kick={kick} onPick={el=>onPick(list.indexOf(p),el)}/>)}</div>)}</div>;
}
