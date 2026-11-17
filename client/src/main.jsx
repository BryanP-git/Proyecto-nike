import {createRoot} from "react-dom/client";import App from "./App.jsx";import "./styles.css";
createRoot(document.getElementById("root")).render(<App/>);
/* PWA: el service worker solo funciona en https o en localhost */
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1"))
 addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
