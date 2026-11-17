import {useId,useState,useEffect} from "react";
export const COL={negro:"#1d1d1f",blanco:"#f1efe9",azul:"#2f4b7c",verde:"#3f6b50",rojo:"#a63a32",gris:"#8b8d91",beige:"#c8b48f",mostaza:"#c9962f",vino:"#6d2233",rosa:"#d99aa6",cielo:"#8fb3d1",arena:"#d8c7a3","café":"#6b4a35","morado":"#5b3a9a","naranja":"#e8782f","lila":"#a9a6e0","fucsia":"#e0398c","durazno":"#f6b48c","azul rey":"#2f55d4","grafito":"#4a4b50"};
export const TYPE={camisas:"camisa",hoodies:"hoodie",pantalones:"pantalon",zapatos:"zapato"};
const BODY={camisa:"M34 20L14 30L2 58L16 64L24 52V124H76V52L84 64L98 58L86 30L66 20L50 32Z",hoodie:"M30 24L12 34L0 88L16 92L24 64V126H76V64L84 92L100 88L88 34L70 24Q50 42 30 24Z",pantalon:"M26 4L74 4L82 126H56L50 46L44 126H18Z"};
const U="M8 50Q8 30 22 27L42 24Q52 10 66 22L88 32Q114 36 116 52V54H8Z";
/* Dibujo de respaldo: se usa solo cuando NO hay foto en /imagenes */
export function Art({type,color}){
 const id="sh"+useId().replace(/:/g,""),f=COL[color]||color;
 const st={stroke:"rgba(0,0,0,.35)",strokeWidth:1.2,strokeLinejoin:"round"},ln={fill:"none",stroke:"rgba(0,0,0,.3)",strokeWidth:1.2},g=`url(#${id})`;
 const defs=<defs><linearGradient id={id} x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity=".2"/><stop offset=".5" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".28"/></linearGradient></defs>;
 if(type==="zapato")return <svg viewBox="0 0 120 70">{defs}<path d={U} fill={f} {...st}/><path d={U} fill={g}/><path d="M48 21L56 29M56 16L64 26M64 19L72 29" stroke="#fff" strokeOpacity=".75" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M6 52H118V60Q118 65 112 65H12Q6 65 6 59Z" fill="#efece4" {...st}/></svg>;
 const x={camisa:<><path d="M34 20L50 40L66 20L58 17L50 27L42 17Z" fill="rgba(255,255,255,.35)" {...st}/><path d="M50 40V124" {...ln}/>{[56,76,96,114].map(y=><circle key={y} cx="52.5" cy={y} r="1.7" fill="rgba(0,0,0,.45)"/>)}</>,
 hoodie:<><path d="M34 24Q50 0 66 24Q50 40 34 24Z" fill="rgba(0,0,0,.2)" {...st}/><path d="M45 36V56M55 36V56" stroke="#eee" strokeWidth="2" strokeLinecap="round"/><path d="M32 92H68L72 114H28Z" {...ln}/></>,
 pantalon:<><path d="M26 14H74M50 14V46" {...ln}/><path d="M28 16Q36 32 41 26M72 16Q64 32 59 26" {...ln}/></>}[type];
 return <svg viewBox="0 0 100 142">{defs}<path d="M50 13V9Q50 6 53 5Q57 3 54 0M50 13L18 32M50 13L82 32" fill="none" stroke="#cfd8df" strokeWidth="2.6" strokeLinecap="round"/><g transform="translate(0,14)"><path d={BODY[type]} fill={f} {...st}/><path d={BODY[type]} fill={g}/>{x}</g></svg>;
}
/* Busca tu foto: /img/<id>-<color>.png, luego /img/<id>.png, y si no existe usa el dibujo */
export function usePhoto(p,color){
 const src=[`/img/${p.id}-${color}.png`,`/img/${p.id}.png`],[k,setK]=useState(0);
 useEffect(()=>setK(0),[p.id,color]);
 return {src:k<2?src[k]:null,fail:()=>setK(x=>x+1)};
}
export function Pic({p,type,color,className="",onLoad}){
 const {src,fail}=usePhoto(p,color);
 return src?<img className={"pic "+className} src={src} alt={p.n} draggable={false} onError={fail} onLoad={onLoad}/>:<Art type={type} color={color}/>;
}
/* color promedio de la foto (para pintar el grosor de la prenda): se calcula una vez por imagen */
const TONES=new Map();
export function useTone(src){
 const [t,setT]=useState(()=>src&&TONES.get(src)||null);
 useEffect(()=>{
  if(!src){setT(null);return}
  if(TONES.has(src)){setT(TONES.get(src));return}
  let live=true;const im=new Image();
  im.onload=()=>{try{const c=document.createElement("canvas");c.width=40;c.height=50;const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(im,0,0,40,50);
   const d=x.getImageData(0,10,40,40).data;let r=0,g=0,b=0,n=0;
   for(let i=0;i<d.length;i+=4)if(d[i+3]>200){r+=d[i];g+=d[i+1];b+=d[i+2];n++}
   const v=n?[r/n,g/n,b/n].map(Math.round):[60,60,60];TONES.set(src,v);live&&setT(v)}catch{}};
  im.src=src;return()=>{live=false};
 },[src]);
 return t;
}
