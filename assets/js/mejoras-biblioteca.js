/* MEJORAS DE INTERFAZ — Biblioteca de Estudio
 * Buscador de recursos, buscador bíblico fijo y selección de palabras.
 */
(function () {
  const $ = id => document.getElementById(id);
  const normalizar = s => String(s || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

  function instalarEstilos() {
    if ($('estilos-mejoras-biblioteca')) return;
    const style = document.createElement('style');
    style.id = 'estilos-mejoras-biblioteca';
    style.textContent = `
      #panel-indice .buscador-libros-biblico.buscador-forzado { display:block !important; position:sticky; top:0; z-index:8; }
      #panel-indice .buscador-libros-biblico.buscador-forzado[hidden] { display:block !important; }
      #panel-indice .buscador-libros-controles { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:.4rem; }
      .mejora-buscador-recursos { margin:.8rem 0; }
      .mejora-buscador-recursos input { width:100%; border:1px solid #d7ddd7; border-radius:8px; padding:.7rem .75rem; background:#fff; color:#1d2a25; outline:none; }
      .mejora-buscador-recursos input:focus,#campo-libro-biblico:focus { border-color:#315c4b; box-shadow:0 0 0 2px #315c4b22; }
      .mejora-recurso-oculto { display:none !important; }
      .barra-paralela-ajuste { display:none !important; }
      .popup-palabra-biblioteca { position:fixed; z-index:100; background:#315c4b; color:#fff; border-radius:9px; padding:.35rem; box-shadow:0 8px 25px #0004; font-family:Arial,sans-serif; }
      .popup-palabra-biblioteca button { background:transparent; color:#fff; padding:.5rem .7rem; border-radius:6px; }
      .popup-palabra-biblioteca button:hover { background:#ffffff22; }
      @media(max-width:760px){ #panel-indice .buscador-libros-controles { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(style);
  }

  function esBibliaActiva() {
    try {
      const recurso = typeof estado !== 'undefined' && estado.recursos ? estado.recursos.get(estado.activa) : null;
      if (recurso?.tipo === 'Biblia') return true;
      const titulo = normalizar($('titulo-libro')?.textContent);
      return /biblia|rvr|ntv|nvi|dhh|rv\s?1909|strong/.test(titulo);
    } catch (_) { return false; }
  }

  function asegurarBuscadorBiblico() {
    const caja = $('buscador-libros-biblico');
    if (!caja || !esBibliaActiva()) { if (caja) caja.hidden = true; return; }
    caja.hidden = false;
    caja.classList.add('buscador-forzado');
    const campo = $('campo-libro-biblico');
    const boton = $('buscar-cita-biblica');
    if (!campo || !boton || campo.dataset.mejorasInstalado) return;
    campo.dataset.mejorasInstalado = '1';
    const filtrar = () => {
      const q = normalizar(campo.value);
      document.querySelectorAll('#lista-indice .indice-libro').forEach(det => {
        const nombre = normalizar(det.dataset.libro || det.querySelector('summary')?.textContent);
        det.hidden = Boolean(q && !nombre.includes(q));
        if (q && nombre.includes(q)) det.open = true;
      });
    };
    const ejecutar = () => {
      const valor = String(campo.value || '').trim();
      const mensaje = $('estado-libro-biblico');
      if (mensaje) mensaje.textContent = '';
      if (!valor) return;
      const m = valor.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
      if (!m) {
        const detalle = [...document.querySelectorAll('#lista-indice .indice-libro')].find(d => normalizar(d.dataset.libro || d.querySelector('summary')?.textContent) === normalizar(valor));
        if (detalle) { detalle.hidden=false; detalle.open=true; detalle.scrollIntoView({behavior:'smooth',block:'nearest'}); if(mensaje)mensaje.textContent='Selecciona un capítulo.'; }
        else if(mensaje)mensaje.textContent=`No encontré "${valor}".`;
        return;
      }
      const libro = normalizar(m[1]);
      const capitulo = Number(m[2]);
      const versiculo = m[3] ? Number(m[3]) : null;
      const detalle = [...document.querySelectorAll('#lista-indice .indice-libro')].find(d => normalizar(d.dataset.libro || d.querySelector('summary')?.textContent) === libro);
      if (!detalle) { if(mensaje)mensaje.textContent=`No encontré ${m[1].trim()}.`; return; }
      detalle.hidden=false; detalle.open=true;
      const cap=[...detalle.querySelectorAll('.indice-item')].find(b=>Number(b.textContent.trim())===capitulo);
      if(!cap){if(mensaje)mensaje.textContent=`No encontré ${m[1].trim()} ${capitulo}.`;return;}
      cap.click();
      setTimeout(()=>{
        if(versiculo===null){if(mensaje)mensaje.textContent=`Mostrando ${m[1].trim()} ${capitulo}.`;return;}
        const patron=new RegExp(`^\\s*${versiculo}(?:[\\s.,;:]|$)`);
        const objetivo=[...document.querySelectorAll('#contenido p')].find(p=>patron.test(p.textContent||''));
        if(objetivo){objetivo.classList.add('versiculo-destacado');objetivo.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>objetivo.classList.remove('versiculo-destacado'),5000);if(mensaje)mensaje.textContent=`Mostrando ${m[1].trim()} ${capitulo}:${versiculo}.`;}
        else if(mensaje)mensaje.textContent=`Llegué al capítulo, pero no localicé el versículo ${versiculo}.`;
      },300);
    };
    campo.addEventListener('input',filtrar);
    campo.addEventListener('keydown',e=>{if(e.key==='Enter')ejecutar();});
    boton.addEventListener('click',ejecutar);
  }

  function asegurarBuscadorRecursos() {
    const modal=$('modal-recursos'),lista=$('lista-recursos');
    if(!modal||!lista)return;
    let wrap=modal.querySelector('.mejora-buscador-recursos');
    if(!wrap){
      wrap=document.createElement('div');wrap.className='mejora-buscador-recursos';
      const input=document.createElement('input');input.type='search';input.id='campo-busqueda-recursos';input.placeholder='Buscar recurso por nombre...';input.autocomplete='off';wrap.append(input);
      modal.querySelector('.modal-ayuda')?.insertAdjacentElement('afterend',wrap);
      input.addEventListener('input',()=>filtrarRecursos(input.value));
    }
  }
  function filtrarRecursos(valor){const q=normalizar(valor),lista=$('lista-recursos');if(!lista)return;lista.querySelectorAll('.recurso-opcion').forEach(b=>b.classList.toggle('mejora-recurso-oculto',Boolean(q&&!normalizar(b.textContent).includes(q))));}

  function instalarSeleccionPalabra(){
    if(document.body.dataset.seleccionBiblioteca)return;
    document.body.dataset.seleccionBiblioteca='1';
    document.addEventListener('mouseup',()=>{
      const seleccion=window.getSelection();const texto=String(seleccion?.toString()||'').trim();
      if(!texto||texto.length>80||!seleccion?.rangeCount)return;
      if(!seleccion.anchorNode?.parentElement?.closest?.('#contenido'))return;
      document.querySelector('.popup-palabra-biblioteca')?.remove();
      const rect=seleccion.getRangeAt(0).getBoundingClientRect();
      const popup=document.createElement('div');popup.className='popup-palabra-biblioteca';
      const button=document.createElement('button');button.type='button';button.textContent=`🔎 Buscar "${texto.slice(0,30)}${texto.length>30?'…':''}"`;
      button.onclick=()=>{const modal=$('modal-busqueda'),campo=$('campo-busqueda'),modo=$('modo-busqueda');if(!modal||!campo)return;modal.hidden=false;campo.value=texto;if(modo)modo.value='toda';popup.remove();campo.focus();$('ejecutar-busqueda')?.click();};
      popup.append(button);document.body.append(popup);popup.style.left=`${Math.min(Math.max(8,rect.left),window.innerWidth-popup.offsetWidth-8)}px`;popup.style.top=`${Math.max(8,rect.top-popup.offsetHeight-8)}px`;
      setTimeout(()=>{const cerrar=e=>{if(!popup.contains(e.target)){popup.remove();document.removeEventListener('mousedown',cerrar);}};document.addEventListener('mousedown',cerrar);},0);
    });
  }

  function instalarObservadores(){
    const lista=$('lista-indice');if(lista&&!lista.dataset.mejorasObservado){lista.dataset.mejorasObservado='1';new MutationObserver(()=>setTimeout(asegurarBuscadorBiblico,40)).observe(lista,{childList:true,subtree:true});}
    const titulo=$('titulo-libro');if(titulo&&!titulo.dataset.mejorasObservado){titulo.dataset.mejorasObservado='1';new MutationObserver(()=>setTimeout(asegurarBuscadorBiblico,40)).observe(titulo,{childList:true,characterData:true,subtree:true});}
    const modal=$('modal-recursos');if(modal&&!modal.dataset.mejorasObservado){modal.dataset.mejorasObservado='1';new MutationObserver(()=>setTimeout(asegurarBuscadorRecursos,20)).observe(modal,{childList:true,subtree:true});}
  }

  function iniciar(){instalarEstilos();asegurarBuscadorRecursos();asegurarBuscadorBiblico();instalarSeleccionPalabra();instalarObservadores();setTimeout(()=>{asegurarBuscadorBiblico();asegurarBuscadorRecursos();},250);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
