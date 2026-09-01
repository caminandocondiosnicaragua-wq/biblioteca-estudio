const CACHE = 'biblioteca-estudio-v19';
const APP = ['./','./index.html','./login.html','./forgot-password.html','./update-password.html','./supabase-config.js','./assets/css/biblioteca.css','./assets/js/auth.js','./assets/js/adaptadores-json.js','./assets/js/biblioteca.js','./assets/js/biblioteca-elementos-enriquecidos.js','./assets/js/biblioteca-visor-paginas.js','./assets/js/vista-paralela.js?v=20260817-3','./assets/js/biblia-navegacion.js?v=20260817-1','./assets/js/biblioteca-mejoras.js?v=20260819-1','./assets/js/biblioteca-ajustes.js?v=20260819-1','./assets/js/biblioteca-voz.js?v=20260829-3','./manifest.webmanifest','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).catch(e=>console.warn('No se pudo precargar todo el caché:',e)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
async function respuestaConVisor(response){
  if(!response || !response.ok) return response;
  try{
    const html=await response.clone().text();
    if(html.includes('biblioteca-visor-paginas.js')) return response;
    const inyeccion='<script src="assets/js/biblioteca-visor-paginas.js"></script>';
    const actualizado=html.replace(/<\/body>/i,`${inyeccion}</body>`);
    const headers=new Headers(response.headers);
    headers.set('content-type','text/html; charset=utf-8');
    headers.delete('content-length');
    return new Response(actualizado,{status:response.status,statusText:response.statusText,headers});
  }catch(e){return response;}
}
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.origin.includes('supabase.co'))return;
  const esIndex=url.pathname.endsWith('/index.html')||url.pathname.endsWith('/biblioteca-estudio/');
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    const response=cached||await fetch(event.request);
    return esIndex?await respuestaConVisor(response):response;
  })());
});
