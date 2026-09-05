/* SELECTOR DE VOZ — voz y resaltado sincronizados por la posición real del texto hablado. */
(function(){
  const $=id=>document.getElementById(id);
  const STORAGE_KEY='biblioteca-voz-preferida';
  let voces=[];
  let speakOriginal=null;

  function normalizar(s){return String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function cargarPreferencia(){try{return localStorage.getItem(STORAGE_KEY)||'';}catch(_){return '';}}
  function guardarPreferencia(v){try{localStorage.setItem(STORAGE_KEY,v);}catch(_){} }
  function etiquetaVoz(v){return `${v.name} — ${v.lang||'idioma desconocido'}`;}

  function instalarEstiloMarcador(){
    if($('estilo-voz-sincronizada'))return;
    const s=document.createElement('style');s.id='estilo-voz-sincronizada';
    s.textContent='.palabra-voz-activa{background:#f4d35e!important;color:#183b32!important;border-radius:4px;padding:0 2px;box-shadow:0 0 0 1px #e0b83f;transition:background .05s ease;}';
    document.head.append(s);
  }

  function ordenarVoces(lista){
    const preferida=normalizar(cargarPreferencia());
    return [...lista].sort((a,b)=>{
      const puntaje=v=>{const n=normalizar(v.name),l=normalizar(v.lang);let p=0;if(preferida&&n===preferida)p+=1000;if(n.includes('google')&&l==='es-us')p+=300;if(l==='es-us')p+=180;if(l==='es-419')p+=160;if(l.startsWith('es'))p+=100;return p;};
      return puntaje(b)-puntaje(a)||a.name.localeCompare(b.name,'es');
    });
  }

  function poblarSelector(){
    const select=$('selector-voz');if(!select||!('speechSynthesis'in window))return;
    const actuales=speechSynthesis.getVoices()||[];if(!actuales.length)return;
    voces=ordenarVoces(actuales);
    const preferida=cargarPreferencia(),anterior=select.dataset.nombre||preferida;
    select.replaceChildren();
    voces.forEach((voz,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=etiquetaVoz(voz);o.title=etiquetaVoz(voz);select.append(o);});
    let indice=voces.findIndex(v=>v.name===anterior);
    if(indice<0)indice=voces.findIndex(v=>normalizar(v.name).includes('google')&&normalizar(v.lang)==='es-us');
    if(indice<0)indice=voces.findIndex(v=>normalizar(v.lang)==='es-us');
    if(indice<0)indice=voces.findIndex(v=>normalizar(v.lang).startsWith('es'));
    if(indice<0)indice=0;
    select.value=String(indice);select.dataset.nombre=voces[indice]?.name||'';guardarPreferencia(select.dataset.nombre);
  }

  function vozSeleccionada(){const select=$('selector-voz');return select&&voces.length?voces[Number(select.value)]||null:null;}

  function instalarSelector(){
    const select=$('selector-voz');if(!select)return;
    if(!select.dataset.selectorInstalado){
      select.dataset.selectorInstalado='1';
      select.addEventListener('change',()=>{const v=vozSeleccionada();if(v){select.dataset.nombre=v.name;guardarPreferencia(v.name);}});
    }
    if('speechSynthesis'in window){poblarSelector();speechSynthesis.addEventListener('voiceschanged',poblarSelector);setTimeout(poblarSelector,300);setTimeout(poblarSelector,1200);}
    else{select.disabled=true;select.innerHTML='<option>Voz no disponible</option>';}
  }

  /*
   * Recalcula las posiciones de las palabras usando EXACTAMENTE el texto que
   * recibe SpeechSynthesis. Esto evita depender de offsets construidos durante
   * el renderizado, que pueden desviarse cuando existen listas, tablas,
   * fragmentos con formato o bloques no hablados.
   */
  function reconstruirMapa(texto){
    if(!window.estado||!Array.isArray(estado.mapaVoz))return;
    const elementos=[...document.querySelectorAll('.palabra-voz')];
    const mapa=[];let desde=0;
    elementos.forEach(el=>{
      const palabra=String(el.textContent||'');if(!palabra)return;
      const indice=texto.indexOf(palabra,desde);
      if(indice<0)return;
      mapa.push({inicio:indice,fin:indice+palabra.length,elemento:el});
      desde=indice+palabra.length;
    });
    estado.mapaVoz=mapa;
    estado.palabraActiva=null;
  }

  function limpiar(){
    if(window.estado?.palabraActiva){estado.palabraActiva.classList.remove('palabra-voz-activa');estado.palabraActiva=null;}
  }

  function resaltar(posicion){
    if(!Number.isFinite(posicion)||!window.estado?.mapaVoz?.length)return;
    let encontrado=estado.mapaVoz.find(x=>posicion>=x.inicio&&posicion<x.fin);
    if(!encontrado)encontrado=estado.mapaVoz.find(x=>x.inicio>posicion);
    if(!encontrado)return;
    if(encontrado.elemento===estado.palabraActiva)return;
    limpiar();estado.palabraActiva=encontrado.elemento;encontrado.elemento.classList.add('palabra-voz-activa');
    const rect=encontrado.elemento.getBoundingClientRect();
    if(rect.top<90||rect.bottom>window.innerHeight-70)encontrado.elemento.scrollIntoView({behavior:'auto',block:'center'});
  }

  function instalarIntegracion(){
    if(!('speechSynthesis'in window)||speakOriginal)return;
    speakOriginal=speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak=function(utterance){
      try{
        instalarEstiloMarcador();
        const texto=String(utterance?.text||'');
        reconstruirMapa(texto);
        const voz=vozSeleccionada();
        if(voz){utterance.voice=voz;utterance.lang=voz.lang||utterance.lang||'es-ES';}
        const boundaryOriginal=utterance.onboundary;
        utterance.onboundary=function(e){
          if(typeof e.charIndex==='number')resaltar(e.charIndex);
          if(typeof boundaryOriginal==='function')boundaryOriginal.call(this,e);
        };
        const endOriginal=utterance.onend,errorOriginal=utterance.onerror;
        utterance.onend=function(e){limpiar();if(typeof endOriginal==='function')endOriginal.call(this,e);};
        utterance.onerror=function(e){limpiar();if(typeof errorOriginal==='function')errorOriginal.call(this,e);};
      }catch(e){console.warn('No se pudo sincronizar el resaltado de voz:',e);}
      return speakOriginal(utterance);
    };
  }

  function iniciar(){instalarEstiloMarcador();instalarSelector();instalarIntegracion();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
