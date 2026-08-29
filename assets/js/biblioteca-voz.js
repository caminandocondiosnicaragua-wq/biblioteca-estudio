/* VOZ + BUSCADOR DE RECURSOS — capa aislada; no modifica las vistas Normal/Paralela. */
(function(){
  const $=id=>document.getElementById(id);
  const STORAGE_KEY='biblioteca-voz-preferida';
  let voces=[];

  function normalizar(s){return String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function cargarPreferencia(){try{return localStorage.getItem(STORAGE_KEY)||'';}catch(_){return '';}}
  function guardarPreferencia(valor){try{localStorage.setItem(STORAGE_KEY,valor);}catch(_){} }

  function ordenarVoces(lista){
    const preferida=normalizar(cargarPreferencia());
    return [...lista].sort((a,b)=>{
      const puntaje=v=>{
        const n=normalizar(v.name),l=normalizar(v.lang);
        let p=0;
        if(preferida && n===preferida)p+=1000;
        if(n.includes('google')&&l==='es-us')p+=300;
        if(l==='es-us')p+=180;
        if(l==='es-419')p+=160;
        if(l.startsWith('es'))p+=100;
        return p;
      };
      return puntaje(b)-puntaje(a)||a.name.localeCompare(b.name,'es');
    });
  }

  function etiquetaVoz(v){
    const idioma=v.lang||'idioma desconocido';
    return `${v.name} — ${idioma}`;
  }

  function poblarSelector(){
    const select=$('selector-voz');
    if(!select || !('speechSynthesis' in window))return;
    const actuales=speechSynthesis.getVoices()||[];
    if(!actuales.length)return;
    voces=ordenarVoces(actuales);
    const preferida=cargarPreferencia();
    const anterior=select.value||preferida;
    select.replaceChildren();
    voces.forEach((voz,i)=>{
      const option=document.createElement('option');
      option.value=String(i);
      option.textContent=etiquetaVoz(voz);
      option.title=etiquetaVoz(voz);
      option.dataset.nombre=voz.name;
      option.dataset.lang=voz.lang||'';
      select.append(option);
    });
    let indice=voces.findIndex(v=>v.name===anterior);
    if(indice<0)indice=voces.findIndex(v=>normalizar(v.name).includes('google')&&normalizar(v.lang)==='es-us');
    if(indice<0)indice=voces.findIndex(v=>normalizar(v.lang)==='es-us');
    if(indice<0)indice=voces.findIndex(v=>normalizar(v.lang).startsWith('es'));
    if(indice<0)indice=0;
    select.value=String(indice);
    guardarPreferencia(voces[indice]?.name||'');
  }

  function vozSeleccionada(){
    const select=$('selector-voz');
    if(!select || !voces.length)return null;
    return voces[Number(select.value)]||null;
  }

  function instalarVoz(){
    const select=$('selector-voz');
    if(!select)return;
    select.addEventListener('change',()=>{const v=vozSeleccionada();if(v)guardarPreferencia(v.name);});
    if('speechSynthesis' in window){
      poblarSelector();
      speechSynthesis.addEventListener('voiceschanged',poblarSelector);
      setTimeout(poblarSelector,300);
      setTimeout(poblarSelector,1200);
    }else{
      select.disabled=true;
      select.innerHTML='<option>Voz no disponible</option>';
    }
  }

  function instalarAudio(){
    const boton=$('escuchar');
    if(!boton || boton.dataset.vozPersonalizada)return;
    boton.dataset.vozPersonalizada='1';
    boton.onclick=()=>{
      if(typeof detenerAudio==='function')detenerAudio();
      if(!('speechSynthesis' in window)){ $('estado').textContent='Este navegador no ofrece lectura en voz alta.';return; }
      const texto=typeof textoActual==='function'?textoActual():'';
      const voz=vozSeleccionada();
      estado.voz=new SpeechSynthesisUtterance(texto);
      if(voz){estado.voz.voice=voz;estado.voz.lang=voz.lang||'es-ES';}else estado.voz.lang='es-ES';
      estado.voz.rate=.92;
      estado.voz.onboundary=e=>{if(typeof e.charIndex==='number'&&typeof resaltarPorPosicion==='function')resaltarPorPosicion(e.charIndex);};
      estado.voz.onend=()=>{if(typeof detenerAudio==='function')detenerAudio();};
      estado.voz.onerror=()=>{if(typeof detenerAudio==='function')detenerAudio();};
      speechSynthesis.speak(estado.voz);
      $('pausar').disabled=false;$('detener').disabled=false;
    };
  }

  function limpiarBuscadoresDuplicados(){
    const modal=$('modal-recursos');
    if(!modal)return;
    const filtros=[...modal.querySelectorAll('input[type="search"]')];
    const unico=filtros.find(x=>x.id==='buscar-recurso-modal')||filtros[0];
    filtros.forEach(input=>{if(input!==unico)input.closest('.filtro-recursos-modal, .buscador-paralela, div')?.remove();});
    if(unico && unico.id!=='buscar-recurso-modal')unico.id='buscar-recurso-modal';
  }

  function instalarBuscadorRecursos(){
    const modal=$('modal-recursos'),lista=$('lista-recursos'),input=$('buscar-recurso-modal');
    if(!modal||!lista||!input)return;
    const aplicar=()=>{
      const q=normalizar(input.value);
      lista.querySelectorAll('.recurso-opcion').forEach(b=>{
        const texto=normalizar(b.textContent);
        b.hidden=Boolean(q&&!texto.includes(q));
      });
    };
    input.addEventListener('input',aplicar);
    modal.addEventListener('click',()=>setTimeout(limpiarBuscadoresDuplicados,0));
    modal.addEventListener('input',e=>{if(e.target===input)aplicar();});
  }

  function observarModal(){
    const modal=$('modal-recursos');
    if(!modal)return;
    new MutationObserver(()=>{
      limpiarBuscadoresDuplicados();
      instalarBuscadorRecursos();
    }).observe(modal,{childList:true,subtree:true});
  }

  function iniciar(){
    instalarVoz();instalarAudio();instalarBuscadorRecursos();observarModal();
    const agregar=$('agregar-recurso');
    agregar?.addEventListener('click',()=>setTimeout(()=>{limpiarBuscadoresDuplicados();instalarBuscadorRecursos();$('buscar-recurso-modal')?.focus();},80),true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
