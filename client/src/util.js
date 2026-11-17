export const money=n=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);
const BR={visa:"Visa",mastercard:"Mastercard",amex:"American Express",diners:"Diners Club"};
/* Texto de la forma de pago para factura, carrito y cuenta */
export const payText=pm=>!pm?"":pm.method==="contraentrega"?"Contra entrega (pago al recibir)":`Tarjeta ${pm.kind==="debito"?"débito":"crédito"} ${BR[pm.brand]||""} •••• ${pm.last4}${pm.kind!=="debito"?` · ${pm.cuotas} ${pm.cuotas>1?"cuotas":"cuota"}`:""}`;
/* envío: gratis desde cierto valor (los montos vienen del servidor, config.js) */
export const shipOf=(sub,cfg)=>!cfg||!sub?0:sub>=cfg.gratisDesde?0:cfg.costo;
export const ESTADOS={nuevo:"Recibido",pagado:"Pagado",enviado:"Enviado",entregado:"Entregado",cancelado:"Cancelado"};
export const fdate=s=>s?new Date(String(s).replace(" ","T")).toLocaleString("es-CO",{dateStyle:"medium",timeStyle:"short"}):"";
