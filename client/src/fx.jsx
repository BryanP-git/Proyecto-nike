import {useState} from "react";
import {motion,AnimatePresence} from "framer-motion";
/*
 Transición de pantalla estilo grafiti (Spider-Verse / Arcane):
 tres trazos de spray (rosa, cian, amarillo) con trama de puntos, y uno negro con el nombre de la sección.
 Cuando el trazo negro tapa la pantalla se cambia el contenido (onMid) y luego los trazos salen.
 Los bordes de pincel son una máscara SVG generada una sola vez (barata para la GPU).
*/
const C=["#ff2e93","#19e0f0","#ffd400","#0a0710"];
function brush(seed){
 let s=seed;const r=()=>(s=(s*16807)%2147483647)/2147483647;
 const L=[],Rt=[];
 for(let y=0;y<=100;y+=2.5){L.push([4+r()*7,y]);Rt.push([89+r()*7,y])}
 for(let k=0;k<3;k++){const i=3+Math.floor(r()*(Rt.length-6));Rt[i]=[Rt[i][0]+3+r()*4,Rt[i][1]]}
 const d="M"+L.map(p=>p.join(" ")).join("L")+"L"+Rt.reverse().map(p=>p.join(" ")).join("L")+"Z";
 return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${d}'/></svg>`)}")`;
}
const MASK=C.map((_,i)=>brush(7+i*977));
function Run({label,onMid,onEnd}){
 const [out,setOut]=useState(false);
 return <div className="wipe" aria-hidden="true">
  {C.map((c,i)=><motion.i key={i} className={"ws s"+i} style={{background:c,skewX:-13,WebkitMaskImage:MASK[i],maskImage:MASK[i]}} initial={{x:"-140%"}} animate={{x:out?"140%":"0%"}}
   transition={out?{duration:.5,delay:(3-i)*.06,ease:[.6,0,.3,1]}:{duration:.44,delay:i*.07,ease:[.7,0,.3,1]}}
   onAnimationComplete={()=>{if(!out&&i===3){onMid();setTimeout(()=>setOut(true),420)}else if(out&&i===0)onEnd()}}/>)}
  <motion.b className="wl" initial={{opacity:0,scale:1.7,rotate:-4}} animate={out?{opacity:0,scale:.92,rotate:-4}:{opacity:1,scale:1,rotate:-4}} transition={out?{duration:.15}:{delay:.42,type:"spring",stiffness:380,damping:18}}>{label}</motion.b>
 </div>;
}
export const Wipe=({w,onMid,onEnd})=><AnimatePresence>{w&&<Run key={w.k} label={w.label} onMid={onMid} onEnd={onEnd}/>}</AnimatePresence>;
