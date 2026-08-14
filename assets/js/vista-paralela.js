/*
 * VISTA NORMAL / PARALELA
 * Fase 1 del sistema de estudio.
 * No modifica los JSON: trabaja sobre los recursos ya cargados.
 */
(function () {
  const $ = id => document.getElementById(id);
  let modo = 'normal';
  let paneles = [];

  function inyectarEstilos() {
    if ($('estilos-vista-paralela')) return;
    const s = document.createElement('style');
    s.id = 'estilos-vista-paralela';
    s.textContent = `
      .selector-vista{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;margin:0 0 1rem;font-family:Arial,sans-serif}
      .selector-vista .etiqueta{font-size:.82rem;font-weight:700;color:#315c4b}
      .boton-vista{background:#e7eee9;color:#244d3e;border:1px solid #d7ddd7;border-radius:8px;padding:.5rem .75rem}
      .boton-vista.activo{background:#315c4b;color:#fff}
      .barra-paralela{display:none;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;background:#fff;border:1px solid #d7ddd7;border-radius:10px;padding:.65rem .75rem;margin-bottom:1rem;font-family:Arial,sans-serif}
      .barra-paralela.visible{display:flex}
      .barra-paralela .referencia{font-size:.82rem;color:#51635a}
      .agregar-panel{background:#315c4b;color:#fff}
      .paneles-paralelos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}
      .panel-paralelo{min-width:0;background:#fff;border:1px solid #d7ddd7;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px #0000000d}
      .cabecera-panel{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.65rem .8rem;background:#f0f4f1;border-bottom:1px solid #d7ddd7;font-family:Arial,sans-serif}
      .cabecera-panel strong{color:#315c4b;font-size:.86rem}
      .cerrar-panel{background:transparent;color:#315c4b;padding:.15rem .35rem;font-size:1.1rem}
      .contenido-panel{padding:1rem;max-height:calc(100vh - 270px);overflow:auto;font-family:Georgia,"Times New Roman",serif;font-size:var(--tamano);line-height:1.72}
      .contenido-panel h2{color:#244d3e;font-size:1.45em;line-height:1.2;margin:.2em 0 .7em}
      .contenido-panel h3{color:#315c4b;font-size:1.15em}
      .contenido-panel p{margin:.9em 0;white-space:pre-wrap}
      .contenido-panel .lista{padding-left:1.4em}
      .contenido-panel .tabla-libro{width:100%;border-collapse:collapse;font-size:.9em}
      .contenido-panel .tabla-libro td{border:1px solid #d7ddd7;padding:.45rem}
      .panel-vacio{padding:1.5rem;color:#718078;text-align:center;font-family:Arial,sans-serif}
      @media(max-width:900px){.paneles-paralelos{grid-template-columns:1fr}.contenido-panel{max-height:none}}
      @media(min-width:1400px){.paneles-paralelos{grid-template-columns:repeat(3,minmax(0,1fr))}}
    `;
    document.head.appendChild(s);
  }

  function crearInterfaz() {
    const lector = document.querySelector('.lector');
    if (!lector || $('selector-vista')) return;
    const herramientas = lector.querySelector('.herramientas');
    const selector = document.createElement('div');
    selector.id = 'selector-vista';
    selector.className = 'selector-vista';
    selector.innerHTML = '<span class="etiqueta">Vista:</span><button id="vista-normal" class="boton-vista activo" type="button">Normal</button><button id="vista-paralela" class="boton-vista" type="button">Paralela</button>';
    herramientas.insertAdjacentElement('afterend', selector);

    const barra = document.createElement('div');
    barra.id = 'barra-paralela';
    barra.className = 'barra-paralela';
    barra.innerHTML = '<span class="referencia" id="referencia-paralela">Recursos en paralelo</span><button id="agregar-panel-paralelo" class="agregar-panel" type="button">＋ Agregar recurso</button>';
    selector.insertAdjacentElement('afterend', barra);

    const panelesEl = document.createElement('div');
    panelesEl.id = 'paneles-paralelos';
    panelesEl.className = 'paneles-paralelos';
    panelesEl.hidden = true;
    barra.insertAdjacentElement('afterend', panelesEl);

    $('vista-normal').onclick = () => cambiarModo('normal');
    $('vista-paralela').onclick = () => cambiarModo('paralela');
    $('agregar-panel-paralelo').onclick = mostrarSelectorRecursos;
  }

  function cambiarModo(nuevo) {
    modo = nuevo;
    const normal = $('contenido');
    const navegacion = document.querySelector('.navegacion');
    const herramientas = document.querySelector('.herramientas');
    const barra = $('barra-paralela');
    const panelesEl = $('paneles-paralelos');
    const estadoNormal = $('estado');
    $('vista-normal')?.classList.toggle('activo', nuevo === 'normal');
    $('vista-paralela')?.classList.toggle('activo', nuevo === 'paralela');
    if (nuevo === 'normal') {
      normal.hidden = false;
      if (navegacion) navegacion.hidden = false;
      if (estadoNormal) estadoNormal.hidden = false;
      if (barra) barra.classList.remove('visible');
      if (panelesEl) { panelesEl.hidden = true; panelesEl.replaceChildren(); }
      paneles = [];
      return;
    }
    normal.hidden = true;
    if (navegacion) navegacion.hidden = true;
    if (estadoNormal) estadoNormal.hidden = true;
    if (barra) barra.classList.add('visible');
    if (panelesEl) panelesEl.hidden = false;
    inicializarPaneles();
  }

  function inicializarPaneles() {
    const r = estado.recursos.get(estado.activa);
    if (!r) return;
    if (!paneles.length) paneles = [r.id];
    renderizarPaneles();
  }

  function tituloReferencia(r) {
    return r?.nodos?.[r.actual]?.titulo || 'Sin referencia';
  }

  function buscarNodoPorTitulo(r, titulo) {
    const objetivo = normalizar(titulo);
    return (r.nodos || []).findIndex(n => normalizar(n.titulo) === objetivo);
  }

  function renderizarPaneles() {
    const destino = $('paneles-paralelos');
    if (!destino) return;
    destino.replaceChildren();
    const referencia = $('referencia-paralela');
    const principal = estado.recursos.get(paneles[0]);
    if (referencia) referencia.textContent = principal ? `Referencia: ${tituloReferencia(principal)}` : 'Recursos en paralelo';

    paneles.forEach((id, posicion) => {
      const r = estado.recursos.get(id);
      if (!r) return;
      const panel = document.createElement('section');
      panel.className = 'panel-paralelo';
      const cab = document.createElement('div');
      cab.className = 'cabecera-panel';
      const nombre = document.createElement('strong');
      nombre.textContent = r.titulo;
      const cerrar = document.createElement('button');
      cerrar.type = 'button'; cerrar.className = 'cerrar-panel'; cerrar.textContent = '×'; cerrar.title = 'Quitar recurso';
      cerrar.onclick = () => quitarPanel(id);
      cab.append(nombre, cerrar);
      const area = document.createElement('article');
      area.className = 'contenido-panel';
      const nodo = r.nodos[r.actual];
      if (nodo) {
        const h2 = document.createElement('h2');
        h2.textContent = nodo.titulo || r.titulo;
        area.append(h2);
        renderizarBloques(nodo.contenido, area, (nodo.titulo || '').length + 2);
        if (nodo.subsecciones?.length) {
          const h3 = document.createElement('h3'); h3.textContent = 'Temas incluidos'; area.append(h3);
          const ul = document.createElement('ul'); ul.className = 'lista';
          nodo.subsecciones.forEach(s => { const li=document.createElement('li'); li.textContent=s.titulo||''; ul.append(li); });
          area.append(ul);
        }
      } else area.innerHTML = '<div class="panel-vacio">No hay contenido disponible.</div>';
      panel.append(cab, area); destino.append(panel);
    });
  }

  function quitarPanel(id) {
    if (paneles.length <= 1) return;
    paneles = paneles.filter(x => x !== id);
    renderizarPaneles();
  }

  async function mostrarSelectorRecursos() {
    const disponibles = await listarRecursos();
    const disponiblesFiltrados = disponibles.filter(m => !paneles.includes(m.id));
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'modal-agregar-panel';
    modal.innerHTML = '<div class="modal-caja"><div class="modal-cabecera"><div><p class="marca">VISTA PARALELA</p><h2>Agregar recurso</h2></div><button class="secundario" id="cerrar-agregar-panel" type="button">×</button></div><p class="modal-ayuda">Selecciona el recurso que quieres estudiar junto al actual.</p><div id="opciones-paneles" class="lista-recursos"></div></div>';
    document.body.append(modal);
    const lista = modal.querySelector('#opciones-paneles');
    if (!disponiblesFiltrados.length) lista.textContent = 'No hay otros recursos disponibles para agregar.';
    disponiblesFiltrados.forEach(meta => {
      const b=document.createElement('button'); b.className='recurso-opcion';
      b.innerHTML=`<strong>${escapeHtml(meta.titulo)}</strong><small>${escapeHtml(meta.tipo)} · ${escapeHtml(meta.path)}</small>`;
      b.onclick=async()=>{
        try {
          const r=await descargarRecurso(meta);
          const principal=estado.recursos.get(paneles[0]);
          if (principal && r && principal.nodos[principal.actual]) {
            const idx=buscarNodoPorTitulo(r, principal.nodos[principal.actual].titulo);
            if(idx>=0) r.actual=idx;
          }
          paneles.push(r.id);
          modal.remove(); renderizarPaneles();
        } catch(e) { console.error(e); lista.insertAdjacentHTML('afterbegin','<p>No se pudo cargar este recurso.</p>'); }
      };
      lista.append(b);
    });
    modal.querySelector('#cerrar-agregar-panel').onclick=()=>modal.remove();
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  }

  function sincronizarConReferencia() {
    if (modo !== 'paralela' || !paneles.length) return;
    const principal = estado.recursos.get(paneles[0]);
    if (!principal) return;
    const nodo = principal.nodos[principal.actual];
    if (!nodo) return;
    paneles.slice(1).forEach(id => {
      const r=estado.recursos.get(id); if(!r)return;
      const idx=buscarNodoPorTitulo(r,nodo.titulo);
      if(idx>=0)r.actual=idx;
    });
    renderizarPaneles();
  }

  function observarCambios() {
    const originalAbrir = window.abrirNodo;
    if (typeof originalAbrir === 'function' && !window.__abrirNodoParalelo) {
      window.abrirNodo = function(indice) {
        originalAbrir(indice);
        if (modo === 'paralela') {
          const principal=estado.recursos.get(estado.activa);
          if (principal && !paneles.includes(principal.id)) paneles.unshift(principal.id);
          sincronizarConReferencia();
        }
      };
      window.__abrirNodoParalelo=true;
    }
  }

  function iniciar() {
    inyectarEstilos();
    crearInterfaz();
    observarCambios();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, {once:true});
  else iniciar();
})();
