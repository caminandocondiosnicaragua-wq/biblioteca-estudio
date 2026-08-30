/* SELECTOR DE VOZ — capa aislada. Conserva intacto el motor de lectura y su marcador. */
(function(){
  const $=id=>document.getElementById(id);
  const STORAGE_KEY='biblioteca-voz-preferida';
  let voces=[];
  let speakOriginal=null;
  let relojMarcador=null;
  let huboBoundary=false;

  function normalizar(s){return String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function cargarPreferencia(){try{return localStorage.getItem(STORAGE_KEY)||'';}catch(_){return '';}}
  function guardarPreferencia(valor){try{localStorage.setItem(STORAGE_KEY,valor);}catch(_){} }
  function etiquetaVoz(v){return `${v.name} — ${v.lang||'idioma desconocido'}`;}

  function ordenarVoces(lista){
    const preferida=normalizar(cargarPreferencia());
    return [...lista].sort((a,b)=>{
      const puntaje=v=>{
        const n=normalizar(v.name),l=normalizar(v.lang);let p=0;
        if(preferida&&n===preferida)p+=1000;
        if(n.includes('google')&&l==='es-us')p+=300;
        if(l==='es-us')p+=180;
        if(l==='es-419')p+=160;
        if(l.startsWith('es'))p+=100;
        return p;
      };
      return puntaje(b)-puntaje(a)||a.name.localeCompare(b.name,'es');
    });
  }

  function poblarSelector(){
    const select=$('selector-voz');
    if(!select||!('speechSynthesis'in window))return;
    const actuales=speechSynthesis.getVoices()||[];
    if(!actuales.length)return;
    voces=ordenarVoces(actuales);
    const preferida=cargarPreferencia();
    const anterior=select.dataset.nombre||preferida;
    select.replaceChildren();
    voces.forEach((voz,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=etiquetaVoz(voz);o.title=etiquetaVoz(voz);select.append(o);});
    let indice=voces.findIndex(v=>v.name===anterior);
    if(indice<0)indice=voces.findIndex(v=>normalizar(v.name).includes('google')&&normalizar(v.lang)==='es-us');
    if(indice<0)indice=voces.findIndex(v=>normalizar(v.lang)==='es-us');
    if(indice<0)indice=voces.findIndex(v=>normalizar(v.lang).startsWith('es'));
    if(indice<0)indice=0;
    select.value=String(indice);
    select.dataset.nombre=voces[indice]?.name||'';
    guardarPreferencia(select.dataset.nombre);
  }

  function vozSeleccionada(){const select=$('selector-voz');return select&&voces.length?voces[Number(select.value)]||null:null;}

  function instalarSelector(){
    const select=$('selector-voz');if(!select)return;
    if(!select.dataset.selectorInstalado){
      select.dataset.selectorInstalado='1';
      select.addEventListener('change',()=>{const v=vozSeleccionada();if(v){select.dataset.nombre=v.name;guardarPreferencia(v.name);}});
    }
    if('speechSynthesis'in window){
      poblarSelector();
      speechSynthesis.addEventListener('voiceschanged',poblarSelector);
      setTimeout(poblarSelector,300);setTimeout(poblarSelector,1200);
    }else{select.disabled=true;select.innerHTML='<option>Voz no disponible</option>';}
  }

  function detenerRelojMarcador(){
    if(relojMarcador){clearInterval(relojMarcador);relojMarcador=null;}
  }

  /* Algunas voces/navegadores no emiten onboundary. En ese caso hacemos un
     seguimiento de respaldo para que el usuario siga teniendo una señal
     visual. Si llegan eventos reales, el seguimiento real toma el control. */
  function iniciarMarcadorRespaldo(utterance,texto){
    detenerRelojMarcador();
    huboBoundary=false;
    const inicio=performance.now()+700;
    const caracteresPorSegundo=14;
    relojMarcador=setInterval(()=>{
      if(huboBoundary||!utterance||speechSynthesis.paused){return;}
      const transcurrido=Math.max(0,performance.now()-inicio);
      const posicion=Math.min(texto.length-1,Math.floor(transcurrido/1000*caracteresPorSegundo*(utterance.rate||1)));
      if(typeof resaltarPorPosicion==='function')resaltarPorPosicion(posicion);
    },120);
  }

  /* No reemplazamos Escuchar. Interceptamos únicamente speechSynthesis.speak()
     para asignar la voz elegida a la misma utterance que crea biblioteca.js.
     Así se conserva onboundary, el mapa de palabras y el marcador amarillo. */
  function instalarIntegracion(){
    if(!('speechSynthesis'in window)||speakOriginal)return;
    speakOriginal=speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak=function(utterance){
      try{
        const voz=vozSeleccionada();
        if(voz){utterance.voice=voz;utterance.lang=voz.lang||utterance.lang||'es-ES';}
        const texto=String(utterance?.text||'');
        const boundaryOriginal=utterance.onboundary;
        utterance.onboundary=function(e){
          huboBoundary=true;
          detenerRelojMarcador();
          if(typeof boundaryOriginal==='function')boundaryOriginal.call(this,e);
        };
        const endOriginal=utterance.onend;
        const errorOriginal=utterance.onerror;
        utterance.onend=function(e){detenerRelojMarcador();if(typeof endOriginal==='function')endOriginal.call(this,e);};
        utterance.onerror=function(e){detenerRelojMarcador();if(typeof errorOriginal==='function')errorOriginal.call(this,e);};
        iniciarMarcadorRespaldo(utterance,texto);
      }catch(e){console.warn('No se pudo aplicar la voz seleccionada:',e);}
      return speakOriginal(utterance);
    };
  }

  function iniciar(){instalarSelector();instalarIntegracion();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
