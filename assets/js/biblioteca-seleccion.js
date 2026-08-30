/* PANEL DE SELECCIÓN — capa independiente.
 * No modifica el lector, el audio, el marcador amarillo ni las vistas Normal/Paralela.
 * Muestra únicamente información útil de la selección; los conectores Strong/diccionarios
 * quedan preparados para incorporarse después sin llenar la interfaz de resultados.
 */
(function(){
  const $=id=>document.getElementById(id);
  let panel=null;
  let ultimaSeleccion='';

  function normalizar(s){return String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
  function escapar(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function esBiblia(r){return !!r&&(String(r.tipo||'').toLowerCase().includes('biblia')||/biblia|rvr|rvc|nvi|ntv|dhh|strong/.test(String(r.titulo||'').toLowerCase()));}

  function parseCita(texto){
    const limpio=String(texto||'').replace(/[()\[\]]/g,' ').replace(/\s+/g,' ').trim();
    const m=limpio.match(/^(?:\d\s*)?[A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+)*\s+(\d+)(?::(\d+)(?:[-–](\d+))?)?/);
    if(!m)return null;
    const hasta=m[3]?Number(m[3]):null;
    const vers=m[2]?Number(m[2]):null;
    const pref=limpio.slice(0,m[1]?m[0].length:0);
    const cita=limpio.match(/^(.+?)\s+(\d+)(?::(\d+)(?:[-–](\d+))?)?/);
    if(!cita)return null;
    return {libro:cita[1].trim(),capitulo:Number(cita[2]),versiculo:cita[3]?Number(cita[3]):null,hasta:cita[4]?Number(cita[4]):null,etiqueta:cita[0].trim()};
  }

  function recursoActivo(){return typeof estado!=='undefined'&&estado?.recursos?.get(estado.activa)||null;}

  function crear(){
    if(panel)return panel;
    const style=document.createElement('style');style.id='estilo-panel-seleccion';style.textContent=`
      #panel-seleccion-biblica{position:fixed;left:50%;bottom:0;transform:translate(-50%,calc(100% + 20px));width:min(760px,calc(100vw - 32px));max-height:30vh;overflow:auto;background:#fffdf8;border:1px solid #c9a227;border-bottom:0;border-radius:14px 14px 0 0;box-shadow:0 -8px 28px #0002;z-index:300;padding:.8rem 1rem 1rem;transition:transform .2s ease;font-family:Georgia,serif;color:#17261f}
      #panel-seleccion-biblica.abierto{transform:translate(-50%,0)}
      #panel-seleccion-biblica .seleccion-cabecera{display:flex;align-items:center;justify-content:space-between;gap:.7rem;border-bottom:1px solid #ddd6c7;padding-bottom:.45rem;margin-bottom:.55rem}
      #panel-seleccion-biblica .seleccion-tipo{font:700 .72rem Arial,sans-serif;text-transform:uppercase;letter-spacing:.04em;color:#315c4b}
      #panel-seleccion-biblica .seleccion-cerrar{border:0;background:transparent;color:#52645c;font-size:1.25rem;cursor:pointer;padding:.15rem .35rem}
      #panel-seleccion-biblica .seleccion-texto{font-size:1.12rem;line-height:1.4;max-height:4.8em;overflow:auto;margin:.25rem 0 .65rem}
      #panel-seleccion-biblica .seleccion-meta{display:flex;flex-wrap:wrap;gap:.35rem .8rem;font:400 .76rem Arial,sans-serif;color:#64736c}
      #panel-seleccion-biblica .seleccion-acciones{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.7rem}
      #panel-seleccion-biblica .seleccion-acciones button{border:1px solid #315c4b;border-radius:7px;background:#315c4b;color:white;padding:.42rem .65rem;cursor:pointer;font:700 .76rem Arial,sans-serif}
      #panel-seleccion-biblica .seleccion-acciones button.secundaria{background:#eef2ee;color:#315c4b}
      @media(max-width:700px){#panel-seleccion-biblica{width:calc(100vw - 12px);max-height:38vh;padding:.7rem .8rem}.lector{padding-bottom:5rem}}
    `;document.head.append(style);
    panel=document.createElement('section');panel.id='panel-seleccion-biblica';panel.setAttribute('aria-live','polite');panel.setAttribute('aria-label','Información de la selección');panel.innerHTML='<div class="seleccion-cabecera"><span class="seleccion-tipo">Selección</span><button class="seleccion-cerrar" type="button" aria-label="Cerrar">×</button></div><div class="seleccion-texto"></div><div class="seleccion-meta"></div><div class="seleccion-acciones"></div>';
    document.body.append(panel);
    panel.querySelector('.seleccion-cerrar').addEventListener('click',cerrar);
    return panel;
  }

  function cerrar(){if(panel)panel.classList.remove('abierto');ultimaSeleccion='';}

  function encontrarBiblia(cita){
    if(typeof estado==='undefined'||!cita)return null;
    for(const r of estado.recursos.values()){
      if(!esBiblia(r))continue;
      const i=(r.nodos||[]).findIndex(n=>normalizar(n.titulo).startsWith(normalizar(`${cita.libro} ${cita.capitulo}`))||normalizar(n.titulo).includes(normalizar(`${cita.libro} ${cita.capitulo}`)));
      if(i>=0)return {r,i};
    }
    return null;
  }

  function mostrar(texto){
    const p=crear(),r=recursoActivo(),cita=parseCita(texto);ultimaSeleccion=texto;
    p.querySelector('.seleccion-texto').textContent=texto;
    p.querySelector('.seleccion-meta').innerHTML=`<span>${escapar(r?.titulo||'Recurso actual')}</span><span>${cita?'Cita bíblica detectada':'Palabra o fragmento seleccionado'}</span>`;
    const acciones=p.querySelector('.seleccion-acciones');acciones.replaceChildren();

    if(cita){
      const encontrado=encontrarBiblia(cita);
      const boton=document.createElement('button');boton.type='button';boton.textContent=encontrado?'Abrir en Biblia':'Buscar en Biblia';boton.onclick=()=>{
        if(encontrado&&typeof cambiarRecurso==='function'){cambiarRecurso(encontrado.r.id);setTimeout(()=>{if(typeof abrirNodo==='function')abrirNodo(encontrado.i);},0);}
        else if($('abrir-buscador'))$('abrir-buscador').click();
        cerrar();
      };acciones.append(boton);
    }

    const futuro=document.createElement('button');futuro.type='button';futuro.className='secundaria';futuro.textContent='Más información';futuro.title='Aquí se integrarán Strong y diccionarios posteriormente';futuro.onclick=()=>{p.querySelector('.seleccion-meta').insertAdjacentHTML('beforeend','<span>Fuentes léxicas: se añadirán después</span>');futuro.disabled=true;};acciones.append(futuro);
    p.classList.add('abierto');
  }

  function seleccionValida(sel){
    if(!sel||sel.isCollapsed)return '';
    const nodo=sel.anchorNode;if(!nodo)return '';
    const area=(nodo.nodeType===1?nodo:nodo.parentElement)?.closest?.('#contenido, .contenido-panel');
    if(!area)return '';
    return sel.toString().replace(/\s+/g,' ').trim().slice(0,500);
  }

  function escucharSeleccion(){
    document.addEventListener('mouseup',()=>setTimeout(()=>{const s=window.getSelection(),texto=seleccionValida(s);if(texto&&texto!==ultimaSeleccion)mostrar(texto);},20),false);
    document.addEventListener('keyup',e=>{if(!['Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;setTimeout(()=>{const s=window.getSelection(),texto=seleccionValida(s);if(texto&&texto!==ultimaSeleccion)mostrar(texto);},20);},false);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',escucharSeleccion,{once:true});else escucharSeleccion();
})();
