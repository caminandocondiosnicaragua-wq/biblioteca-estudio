/* VISTA PARALELA — hasta 4 recursos + panel de información */
(function () {
  const $ = id => document.getElementById(id);
  let modo = 'normal';
  let paneles = [];
  const MAX_RECURSOS = 4;

  const norm = s => String(s || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function estilos() {
    if ($('estilos-vista-paralela')) return;
    const s = document.createElement('style');
    s.id = 'estilos-vista-paralela';
    s.textContent = `
      .selector-vista-principal{display:flex!important;align-items:center;gap:.3rem;padding:.2rem;background:#eef2ee;border:1px solid #d7ddd7;border-radius:9px;font-family:Arial,sans-serif}
      .selector-vista-principal .etiqueta{font-size:.72rem;font-weight:700;color:#315c4b;padding:0 .35rem}
      .boton-vista-principal{background:transparent;color:#315c4b;border-radius:7px;padding:.48rem .65rem;font-size:.82rem}
      .boton-vista-principal.activo{background:#315c4b;color:#fff}
      body.modo-paralela .aplicacion{display:block!important;min-height:calc(100vh - 116px)}
      body.modo-paralela .indice{display:none!important}
      body.modo-paralela .lector{max-width:none!important;width:100%!important;margin:0!important;padding:1rem 1.25rem 2rem!important}
      body.modo-paralela #contenido,body.modo-paralela .navegacion,body.modo-paralela #estado{display:none!important}
      body.modo-paralela .herramientas{max-width:1600px;margin:0 auto .8rem}
      .barra-paralela{max-width:1600px;margin:0 auto .8rem;background:#fff;border:1px solid #d7ddd7;border-radius:10px;padding:.65rem .8rem;font: .82rem Arial,sans-serif;color:#51635a}
      .barra-paralela strong{color:#315c4b}
      .paneles-paralelos{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:.8rem;width:100%;max-width:1600px;margin:0 auto}
      .panel-paralelo{min-width:0;width:100%;background:#fff;border:1px solid #d7ddd7;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px #0000000d}
      .cabecera-panel{display:flex;align-items:center;justify-content:space-between;gap:.35rem;padding:.65rem .7rem;background:#f0f4f1;border-bottom:1px solid #d7ddd7;font-family:Arial,sans-serif;position:sticky;top:0;z-index:2}
      .cabecera-panel strong{color:#315c4b;font-size:.82rem;line-height:1.2}
      .cerrar-panel{background:transparent;color:#315c4b;padding:.1rem .25rem;font-size:1rem}
      .contenido-panel{padding:1rem;min-height:420px;max-height:calc(100vh - 340px);overflow:auto;font-family:Georgia,"Times New Roman",serif;font-size:var(--tamano);line-height:1.68}
      .contenido-panel h2{color:#244d3e;font-size:1.35em;line-height:1.2;margin:.1em 0 .7em}
      .contenido-panel p{margin:.75em 0;white-space:pre-wrap}
      .panel-vacio{padding:1.5rem;color:#718078;text-align:center;font-family:Arial,sans-serif}
      .modal-busca-paralela .buscador-paralela{margin:.7rem 0}
      .modal-busca-paralela .buscador-paralela input{width:100%;box-sizing:border-box;border:1px solid #d7ddd7;border-radius:8px;padding:.65rem;background:#fff;color:#1d2a25}
      .panel-informacion-paralela{max-width:1600px;margin:1rem auto 0;background:#fff;border:1px solid #cfd8d2;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px #0000000d}
      .cabecera-informacion{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.7rem .9rem;background:#edf3ef;border-bottom:1px solid #d7ddd7;font-family:Arial,sans-serif}
      .cabecera-informacion strong{color:#315c4b}
      .contenido-informacion{padding:1rem 1.1rem;max-height:260px;overflow:auto;font-family:Georgia,"Times New Roman",serif;line-height:1.55}
      .info-palabra{font-size:1.35rem;font-weight:700;color:#244d3e;margin:0 0 .35rem}
      .info-origen{font:.78rem Arial,sans-serif;color:#718078;margin-bottom:.7rem}
      .info-resultado{padding:.65rem 0;border-top:1px solid #edf0ed}
      .info-resultado strong{color:#315c4b}
      .info-vacio{color:#718078;font: .9rem Arial,sans-serif}
      @media(max-width:1150px){.paneles-paralelos{grid-template-columns:repeat(2,minmax(0,1fr))}.contenido-panel{max-height:calc(100vh - 330px)}}
      @media(max-width:700px){.paneles-paralelos{grid-template-columns:1fr}.contenido-panel{max-height:none;min-height:260px}.selector-vista-principal .etiqueta{display:none}}
    `;
    document.head.appendChild(s);
  }

  function conectarBotonesVista() {
    const normal = $('vista-normal');
    const paralela = $('vista-paralela');
    if (normal && !normal.dataset.vistaConectada) {
      normal.dataset.vistaConectada = '1';
      normal.type = 'button';
      normal.addEventListener('click', () => cambiarModo('normal'));
    }
    if (paralela && !paralela.dataset.vistaConectada) {
      paralela.dataset.vistaConectada = '1';
      paralela.type = 'button';
      paralela.addEventListener('click', () => cambiarModo('paralela'));
    }
  }

  function crearSelectorPrincipal() {
    const acciones = document.querySelector('.acciones-superiores');
    if (!acciones) return;
    if (!$('selector-vista-principal')) {
      const caja = document.createElement('div'); caja.id='selector-vista-principal'; caja.className='selector-vista-principal';
      caja.innerHTML='<span class="etiqueta">Vista</span><button id="vista-normal" class="boton-vista-principal activo" type="button">Normal</button><button id="vista-paralela" class="boton-vista-principal" type="button">Paralela</button>';
      acciones.insertBefore(caja, acciones.firstChild);
    }
    conectarBotonesVista();
  }

  function crearAreaParalela(){
    const lector=document.querySelector('.lector'); if(!lector||$('barra-paralela'))return;
    const herramientas=lector.querySelector('.herramientas'); if(!herramientas)return;
    const barra=document.createElement('div'); barra.id='barra-paralela'; barra.className='barra-paralela';
    barra.innerHTML='<strong id="referencia-paralela">Vista paralela</strong> · Puedes comparar hasta 4 recursos.';
    herramientas.insertAdjacentElement('afterend',barra);
    const panelesEl=document.createElement('div'); panelesEl.id='paneles-paralelos'; panelesEl.className='paneles-paralelos'; barra.insertAdjacentElement('afterend',panelesEl);
    const info=document.createElement('section'); info.id='panel-informacion-paralela'; info.className='panel-informacion-paralela'; info.hidden=true;
    info.innerHTML='<div class="cabecera-informacion"><strong>Información de la selección</strong><button id="cerrar-info-paralela" class="secundario" type="button">×</button></div><div id="contenido-informacion-paralela" class="contenido-informacion"><div class="info-vacio">Selecciona una palabra dentro de un recurso para consultar información relacionada.</div></div>';
    panelesEl.insertAdjacentElement('afterend',info);
    $('cerrar-info-paralela').onclick=()=>{info.hidden=true;};
  }

  function cambiarModo(nuevo){
    modo=nuevo; document.body.classList.toggle('modo-paralela',nuevo==='paralela');
    $('vista-normal')?.classList.toggle('activo',nuevo==='normal'); $('vista-paralela')?.classList.toggle('activo',nuevo==='paralela');
    const normal=$('contenido'),nav=document.querySelector('.navegacion'),estadoNormal=$('estado'),barra=$('barra-paralela'),panelesEl=$('paneles-paralelos'),info=$('panel-informacion-paralela');
    if(nuevo==='normal'){normal.hidden=false;if(nav)nav.hidden=false;if(estadoNormal)estadoNormal.hidden=false;if(barra)barra.hidden=true;if(panelesEl){panelesEl.hidden=true;panelesEl.replaceChildren();}if(info)info.hidden=true;paneles=[];return;}
    normal.hidden=true;if(nav)nav.hidden=true;if(estadoNormal)estadoNormal.hidden=true;if(barra)barra.hidden=false;if(panelesEl)panelesEl.hidden=false;
    const actual=estado.recursos.get(estado.activa);paneles=actual?[actual.id]:[];renderizarPaneles();
  }

  function tituloReferencia(r){return r?.nodos?.[r.actual]?.titulo||'Sin referencia';}
  function buscarNodoPorTitulo(r,titulo){const q=norm(titulo);return(r?.nodos||[]).findIndex(n=>norm(n.titulo)===q);}

  function renderizarPaneles(){
    const destino=$('paneles-paralelos'); if(!destino)return; destino.replaceChildren();
    const principal=paneles.length?estado.recursos.get(paneles[0]):null; const ref=$('referencia-paralela');
    if(ref)ref.textContent=principal?`Referencia: ${tituloReferencia(principal)} · ${paneles.length}/${MAX_RECURSOS} recursos`:`Vista paralela · 0/${MAX_RECURSOS} recursos`;
    paneles.slice(0,MAX_RECURSOS).forEach(id=>{
      const r=estado.recursos.get(id);if(!r)return;const panel=document.createElement('section');panel.className='panel-paralelo';
      const cab=document.createElement('div');cab.className='cabecera-panel';const nombre=document.createElement('strong');nombre.textContent=r.titulo;
      const cerrar=document.createElement('button');cerrar.type='button';cerrar.className='cerrar-panel';cerrar.textContent='×';cerrar.title='Quitar recurso';cerrar.disabled=paneles.length===1;cerrar.onclick=()=>quitarPanel(id);cab.append(nombre,cerrar);
      const area=document.createElement('article');area.className='contenido-panel';const nodo=r.nodos[r.actual];
      if(nodo){const h2=document.createElement('h2');h2.textContent=nodo.titulo||r.titulo;area.append(h2);if(typeof renderizarBloques==='function')renderizarBloques(nodo.contenido,area,(nodo.titulo||'').length+2);}
      else area.innerHTML='<div class="panel-vacio">No hay contenido disponible.</div>';
      panel.append(cab,area);destino.append(panel);instalarSeleccionPalabras(area,r);
    });
    const info=$('panel-informacion-paralela');if(info&&paneles.length)info.hidden=false;
  }

  function instalarSeleccionPalabras(area,recurso){
    area.onmouseup=()=>{
      const seleccion=window.getSelection(); if(!seleccion||seleccion.isCollapsed)return;
      const texto=seleccion.toString().trim().replace(/^[«“"'¿¡(\[]+|[»”"'?!.,;:)]*$/g,'');
      if(!texto||texto.length>80||texto.includes(' '))return;
      mostrarInformacionPalabra(texto,recurso);
    };
  }

  function textoNodo(n){return[n?.titulo,...(n?.contenido||[]).map(b=>b.texto||'')].join(' ');}

  function extraerCoincidencias(r,palabra){
    const q=norm(palabra),salida=[];if(!r?.nodos)return salida;
    r.nodos.forEach((n,i)=>{const texto=textoNodo(n);if(!norm(texto).includes(q))return;const pos=norm(texto).indexOf(q);salida.push({titulo:n.titulo||`Sección ${i+1}`,resumen:texto.slice(Math.max(0,pos-120),pos+Math.max(180,q.length))+(texto.length>pos+Math.max(180,q.length)?'…':''),indice:i});});
    return salida.slice(0,4);
  }

  function mostrarInformacionPalabra(palabra,origen){
    const panel=$('panel-informacion-paralela'),contenido=$('contenido-informacion-paralela');if(!panel||!contenido)return;
    panel.hidden=false;contenido.replaceChildren();const titulo=document.createElement('p');titulo.className='info-palabra';titulo.textContent=palabra;contenido.append(titulo);
    const origenEl=document.createElement('div');origenEl.className='info-origen';origenEl.textContent=`Seleccionada en: ${origen?.titulo||'recurso'}`;contenido.append(origenEl);
    let encontrados=[];paneles.forEach(id=>{const r=estado.recursos.get(id);if(r)extraerCoincidencias(r,palabra).forEach(x=>encontrados.push({...x,recurso:r}));});
    encontrados=encontrados.filter((x,i,a)=>i===a.findIndex(y=>y.recurso.id===x.recurso.id&&x.indice===y.indice));
    if(!encontrados.length){const vacio=document.createElement('div');vacio.className='info-vacio';vacio.textContent='No encontré información de esta palabra en los recursos abiertos. Abre también un diccionario, léxico o Biblia con Strong para ampliar la consulta.';contenido.append(vacio);return;}
    encontrados.forEach(x=>{const d=document.createElement('div');d.className='info-resultado';d.innerHTML=`<strong>${esc(x.recurso.titulo)}</strong><br><small>${esc(x.titulo)}</small><p>${esc(x.resumen)}</p>`;d.onclick=()=>{x.recurso.actual=x.indice;renderizarPaneles();};contenido.append(d);});
  }

  function quitarPanel(id){if(paneles.length<=1)return;paneles=paneles.filter(x=>x!==id);renderizarPaneles();}

  async function agregarRecursoDesdeMenu(){
    if(paneles.length>=MAX_RECURSOS){alert('La vista paralela permite hasta 4 recursos.');return;}
    const disponibles=(await listarRecursos()).filter(m=>!paneles.includes(m.id));
    const modal=document.createElement('div');modal.className='modal modal-busca-paralela';modal.id='modal-agregar-panel';
    modal.innerHTML='<div class="modal-caja"><div class="modal-cabecera"><div><p class="marca">VISTA PARALELA</p><h2>Agregar recurso</h2></div><button class="secundario" id="cerrar-agregar-panel" type="button">×</button></div><p class="modal-ayuda">Selecciona un recurso. Puedes tener hasta 4 paneles.</p><div class="buscador-paralela"><input id="buscar-recurso-paralela" type="search" placeholder="Buscar recurso por nombre..." autocomplete="off"></div><div id="opciones-paneles" class="lista-recursos"></div></div>';
    document.body.append(modal);const lista=modal.querySelector('#opciones-paneles');const input=modal.querySelector('#buscar-recurso-paralela');
    const pintar=q=>{lista.replaceChildren();const filtrados=disponibles.filter(r=>!q||norm(`${r.titulo} ${r.tipo} ${r.path}`).includes(norm(q)));if(!filtrados.length){lista.textContent='No se encontraron recursos.';return;}filtrados.forEach(meta=>{const b=document.createElement('button');b.type='button';b.className='recurso-opcion';b.innerHTML=`<strong>${esc(meta.titulo)}</strong><small>${esc(meta.tipo)} · ${esc(meta.path)}</small>`;b.onclick=async()=>{try{const r=await descargarRecurso(meta);const principal=estado.recursos.get(paneles[0]);if(principal&&r&&principal.nodos[principal.actual]){const idx=buscarNodoPorTitulo(r,principal.nodos[principal.actual].titulo);if(idx>=0)r.actual=idx;}paneles.push(r.id);modal.remove();renderizarPaneles();}catch(e){console.error(e);lista.insertAdjacentHTML('afterbegin','<p>No se pudo cargar este recurso.</p>');}};lista.append(b);});};
    input.addEventListener('input',()=>pintar(input.value));pintar('');input.focus();modal.querySelector('#cerrar-agregar-panel').onclick=()=>modal.remove();modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  }

  function engancharMenuPrincipal(){
    const boton=$('agregar-recurso');if(!boton||boton.dataset.vistaParalela)return;boton.dataset.vistaParalela='1';
    boton.addEventListener('click',e=>{if(modo!=='paralela')return;e.preventDefault();e.stopImmediatePropagation();agregarRecursoDesdeMenu();},true);
  }

  function sincronizarConReferencia(){
    if(modo!=='paralela'||!paneles.length)return;const principal=estado.recursos.get(paneles[0]);if(!principal)return;const nodo=principal.nodos[principal.actual];if(!nodo)return;
    paneles.slice(1).forEach(id=>{const r=estado.recursos.get(id);if(!r)return;const idx=buscarNodoPorTitulo(r,nodo.titulo);if(idx>=0)r.actual=idx;});renderizarPaneles();
  }

  function observarCambios(){const originalAbrir=window.abrirNodo;if(typeof originalAbrir==='function'&&!window.__abrirNodoParalelo){window.abrirNodo=function(indice){originalAbrir(indice);if(modo==='paralela')sincronizarConReferencia();};window.__abrirNodoParalelo=true;}}

  function cargarNavegacionBiblica(){
    if(document.querySelector('script[data-navegacion-biblica]'))return;
    const s=document.createElement('script');s.src='assets/js/biblia-navegacion.js?v=20260817-1';s.dataset.navegacionBiblica='1';document.body.appendChild(s);
  }

  function iniciar(){estilos();crearSelectorPrincipal();crearAreaParalela();engancharMenuPrincipal();const barra=$('barra-paralela');if(barra)barra.hidden=true;observarCambios();cargarNavegacionBiblica();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
