/* AJUSTES DE NAVEGACIÓN — Biblioteca de Estudio
 * Corrige la integración de: buscador bíblico, vista paralela y buscador de recursos.
 * No modifica los JSON ni la arquitectura Supabase → Biblioteca.
 */
(function () {
  const $ = id => document.getElementById(id);
  const normalizarTexto = s => String(s || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

  function instalarEstilo() {
    if ($('estilos-ajustes-biblioteca')) return;
    const s = document.createElement('style');
    s.id = 'estilos-ajustes-biblioteca';
    s.textContent = `
      .buscador-libros-biblico { display:block !important; }
      .buscador-libros-biblico[hidden] { display:none !important; }
      .buscador-ajuste-mensaje { min-height:1.1em; margin:.35rem 0 0; color:#7a4d38; font:.72rem Arial,sans-serif; }
      .buscador-recursos { display:grid; grid-template-columns:1fr; gap:.45rem; margin:.7rem 0 1rem; }
      .buscador-recursos input { width:100%; border:1px solid #d7ddd7; border-radius:8px; padding:.65rem .7rem; background:#fff; color:#1d2a25; }
      .resultado-recurso-oculto { display:none !important; }
      body.modo-paralela-ajuste .aplicacion { display:block; min-height:calc(100vh - 116px); }
      body.modo-paralela-ajuste .indice { display:none; }
      body.modo-paralela-ajuste .lector { max-width:none; width:100%; margin:0; padding:1rem 1.25rem 2rem; }
      body.modo-paralela-ajuste .herramientas { max-width:1500px; margin:0 auto .8rem; }
      body.modo-paralela-ajuste #contenido, body.modo-paralela-ajuste .navegacion, body.modo-paralela-ajuste #estado { display:none !important; }
      .barra-paralela-ajuste { display:none; max-width:1500px; margin:0 auto 1rem; background:#fff; border:1px solid #d7ddd7; border-radius:10px; padding:.65rem .8rem; font: .82rem Arial,sans-serif; color:#51635a; }
      body.modo-paralela-ajuste .barra-paralela-ajuste { display:flex; align-items:center; justify-content:space-between; gap:.75rem; flex-wrap:wrap; }
      .paneles-paralelos-ajuste { display:none; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; max-width:1500px; margin:0 auto; }
      body.modo-paralela-ajuste .paneles-paralelos-ajuste { display:grid; }
      .panel-paralelo-ajuste { min-width:0; background:#fff; border:1px solid #d7ddd7; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px #0000000d; }
      .cabecera-panel-ajuste { display:flex; align-items:center; justify-content:space-between; gap:.5rem; padding:.7rem .9rem; background:#f0f4f1; border-bottom:1px solid #d7ddd7; font: .9rem Arial,sans-serif; position:sticky; top:0; z-index:2; }
      .cabecera-panel-ajuste strong { color:#315c4b; }
      .cabecera-panel-ajuste button { background:transparent; color:#315c4b; padding:.15rem .35rem; font-size:1.1rem; }
      .contenido-panel-ajuste { padding:1.25rem clamp(1rem,2.5vw,2.2rem); height:calc(100vh - 250px); min-height:500px; overflow:auto; font-family:Georgia,"Times New Roman",serif; font-size:var(--tamano); line-height:1.72; }
      .contenido-panel-ajuste h2 { color:#244d3e; font-size:1.65em; line-height:1.2; margin:.2em 0 .8em; }
      .contenido-panel-ajuste h3 { color:#315c4b; font-size:1.15em; }
      .contenido-panel-ajuste p { margin:.9em 0; white-space:pre-wrap; }
      .contenido-panel-ajuste .lista { padding-left:1.4em; }
      .contenido-panel-ajuste .tabla-libro { width:100%; border-collapse:collapse; font-size:.9em; }
      .contenido-panel-ajuste .tabla-libro td { border:1px solid #d7ddd7; padding:.45rem; }
      .paralela-vacia-ajuste { padding:1.5rem; color:#718078; text-align:center; font-family:Arial,sans-serif; }
      @media(max-width:850px){ .paneles-paralelos-ajuste{grid-template-columns:1fr}.contenido-panel-ajuste{height:auto;min-height:0;max-height:none} }
    `;
    document.head.appendChild(s);
  }

  function buscarDatosBiblia() {
    const botones = [...document.querySelectorAll('#lista-indice button.indice-item')];
    return botones.map(b => {
      const m = String(b.textContent || '').trim().match(/^(.+?)\s+(\d+)$/);
      return m ? { libro: m[1].trim(), capitulo: Number(m[2]), boton: b } : null;
    }).filter(Boolean);
  }

  function asegurarBuscadorBiblico() {
    const caja = $('buscador-libros-biblico');
    const datos = buscarDatosBiblia();
    if (!caja) return;
    if (datos.length < 3) { caja.hidden = true; return; }
    caja.hidden = false;
    const campo = $('campo-libro-biblico');
    const boton = $('buscar-cita-biblica');
    if (!campo || !boton || campo.dataset.ajusteInstalado) return;
    campo.dataset.ajusteInstalado = '1';
    const mensaje = $('estado-libro-biblico');
    const filtrar = () => {
      const q = normalizarTexto(campo.value);
      document.querySelectorAll('#lista-indice .indice-libro').forEach(det => {
        const nombre = normalizarTexto(det.dataset.libro);
        const visible = !q || nombre.includes(q);
        det.hidden = !visible;
        if (visible && q) det.open = true;
      });
    };
    const ejecutar = () => {
      const valor = String(campo.value || '').trim();
      if (mensaje) mensaje.textContent = '';
      if (!valor) return;
      const m = valor.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
      if (!m) {
        const libro = [...document.querySelectorAll('#lista-indice .indice-libro')].find(d => normalizarTexto(d.dataset.libro) === normalizarTexto(valor));
        if (libro) { libro.hidden = false; libro.open = true; libro.scrollIntoView({behavior:'smooth',block:'nearest'}); if (mensaje) mensaje.textContent = 'Selecciona un capítulo.'; return; }
        if (mensaje) mensaje.textContent = 'Escribe una cita como Juan 3:16.';
        return;
      }
      const libro = m[1].trim();
      const capitulo = Number(m[2]);
      const versiculo = m[3] ? Number(m[3]) : null;
      const detalle = [...document.querySelectorAll('#lista-indice .indice-libro')].find(d => normalizarTexto(d.dataset.libro) === normalizarTexto(libro));
      if (!detalle) { if (mensaje) mensaje.textContent = `No encontré ${libro}.`; return; }
      const cap = [...detalle.querySelectorAll('.indice-item')].find(b => Number(b.textContent) === capitulo);
      if (!cap) { detalle.hidden = false; detalle.open = true; if (mensaje) mensaje.textContent = `No encontré ${libro} ${capitulo}.`; return; }
      detalle.hidden = false; detalle.open = true; cap.click();
      setTimeout(() => {
        if (versiculo === null) { if (mensaje) mensaje.textContent = `Mostrando ${libro} ${capitulo}.`; return; }
        const patron = new RegExp(`^\\s*${versiculo}(?:[\\s.,;:]|$)`);
        const objetivo = [...document.querySelectorAll('#contenido p')].find(p => patron.test(p.textContent || ''));
        if (objetivo) {
          objetivo.classList.add('versiculo-destacado');
          objetivo.scrollIntoView({behavior:'smooth',block:'center'});
          setTimeout(() => objetivo.classList.remove('versiculo-destacado'), 5000);
          if (mensaje) mensaje.textContent = `Mostrando ${libro} ${capitulo}:${versiculo}.`;
        } else if (mensaje) mensaje.textContent = `Llegué al capítulo, pero no pude localizar el versículo ${versiculo}.`;
      }, 350);
    };
    campo.addEventListener('input', filtrar);
    campo.addEventListener('keydown', e => { if (e.key === 'Enter') ejecutar(); });
    boton.addEventListener('click', ejecutar);
  }

  function crearBuscadorRecursos(contenedor, recursos) {
    const wrap = document.createElement('div');
    wrap.className = 'buscador-recursos';
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Buscar recurso por nombre...';
    input.autocomplete = 'off';
    wrap.append(input);
    contenedor.parentElement.insertBefore(wrap, contenedor);
    const aplicar = () => {
      const q = normalizarTexto(input.value);
      contenedor.querySelectorAll('.recurso-opcion').forEach((b, i) => {
        const meta = recursos[i];
        const texto = normalizarTexto(`${meta?.titulo || ''} ${meta?.tipo || ''} ${meta?.path || ''}`);
        b.classList.toggle('resultado-recurso-oculto', Boolean(q && !texto.includes(q)));
      });
    };
    input.addEventListener('input', aplicar);
  }

  function abrirModalRecursosConBusqueda() {
    const modal = $('modal-recursos');
    const lista = $('lista-recursos');
    if (!modal || !lista || typeof listarRecursos !== 'function') return;
    modal.hidden = false;
    lista.replaceChildren();
    const carga = document.createElement('p');
    carga.textContent = 'Cargando recursos disponibles…';
    lista.append(carga);
    listarRecursos().then(recursos => {
      lista.replaceChildren();
      if (!recursos.length) { lista.textContent = 'No se encontraron archivos JSON en el bucket.'; return; }
      crearBuscadorRecursos(lista, recursos);
      recursos.forEach(r => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'recurso-opcion';
        b.innerHTML = `<strong>${escapeHtml(r.titulo)}</strong><small>${escapeHtml(r.tipo)} · ${escapeHtml(r.path)}</small>`;
        b.addEventListener('click', () => abrirRecurso(r));
        lista.append(b);
      });
      lista.parentElement.querySelector('.buscador-recursos input')?.focus();
    }).catch(error => {
      console.error(error);
      lista.textContent = 'No se pudieron listar los recursos. Revisa los permisos de Storage.';
    });
  }

  function conectarBotonRecursos() {
    const viejo = $('agregar-recurso');
    if (!viejo || viejo.dataset.ajusteRecursos) return;
    const nuevo = viejo.cloneNode(true);
    nuevo.dataset.ajusteRecursos = '1';
    viejo.replaceWith(nuevo);
    nuevo.addEventListener('click', () => {
      if (document.body.classList.contains('modo-paralela-ajuste')) abrirModalRecursosParalela();
      else abrirModalRecursosConBusqueda();
    });
  }

  let paralelo = { ids: [] };

  function obtenerActual() { return estado?.recursos?.get(estado.activa) || null; }
  function tituloNodo(r) { return r?.nodos?.[r.actual]?.titulo || 'Sin referencia'; }
  function buscarNodo(r, titulo) { const q = normalizarTexto(titulo); return (r?.nodos || []).findIndex(n => normalizarTexto(n.titulo) === q); }

  function asegurarAreaParalela() {
    const lector = document.querySelector('.lector');
    if (!lector || $('barra-paralela-ajuste')) return;
    const herramientas = lector.querySelector('.herramientas');
    const barra = document.createElement('div');
    barra.id = 'barra-paralela-ajuste'; barra.className = 'barra-paralela-ajuste';
    barra.innerHTML = '<span id="referencia-paralela-ajuste">Recursos en paralelo</span><span>Selecciona + Recurso para comparar otra Biblia o recurso.</span>';
    herramientas.insertAdjacentElement('afterend', barra);
    const paneles = document.createElement('div');
    paneles.id = 'paneles-paralelos-ajuste'; paneles.className = 'paneles-paralelos-ajuste';
    barra.insertAdjacentElement('afterend', paneles);
  }

  function renderizarParalelo() {
    const destino = $('paneles-paralelos-ajuste');
    if (!destino) return;
    destino.replaceChildren();
    const principal = obtenerActual();
    if (!principal) { destino.innerHTML = '<div class="panel-paralelo-ajuste"><div class="paralela-vacia-ajuste">Abre un recurso para iniciar la vista paralela.</div></div>'; return; }
    if (!paralelo.ids.length) paralelo.ids = [principal.id];
    const ref = $('referencia-paralela-ajuste');
    if (ref) ref.textContent = `Referencia: ${tituloNodo(principal)}`;
    paralelo.ids.forEach(id => {
      const r = estado.recursos.get(id);
      if (!r) return;
      const panel = document.createElement('section'); panel.className = 'panel-paralelo-ajuste';
      const cab = document.createElement('div'); cab.className = 'cabecera-panel-ajuste';
      const nombre = document.createElement('strong'); nombre.textContent = r.titulo;
      const cerrar = document.createElement('button'); cerrar.type='button'; cerrar.textContent='×'; cerrar.title='Quitar recurso'; cerrar.disabled=paralelo.ids.length===1;
      cerrar.onclick=()=>{ paralelo.ids=paralelo.ids.filter(x=>x!==id); if(!paralelo.ids.length) paralelo.ids=[principal.id]; renderizarParalelo(); };
      cab.append(nombre,cerrar);
      const area = document.createElement('article'); area.className='contenido-panel-ajuste';
      const nodo = r.nodos[r.actual];
      if (nodo) {
        const h2=document.createElement('h2'); h2.textContent=nodo.titulo || r.titulo; area.append(h2);
        if (typeof renderizarBloques === 'function') renderizarBloques(nodo.contenido, area, (nodo.titulo||'').length+2);
      }
      panel.append(cab,area); destino.append(panel);
    });
  }

  function entrarParalela() {
    const principal=obtenerActual();
    paralelo.ids=principal ? [principal.id] : [];
    document.body.classList.add('modo-paralela-ajuste');
    $('vista-normal')?.classList.remove('activo'); $('vista-paralela')?.classList.add('activo');
    $('barra-paralela')?.setAttribute('hidden','hidden');
    if ($('barra-paralela')) $('barra-paralela').hidden=true;
    renderizarParalelo();
  }

  function salirParalela() {
    document.body.classList.remove('modo-paralela-ajuste');
    $('vista-normal')?.classList.add('activo'); $('vista-paralela')?.classList.remove('activo');
    if ($('barra-paralela')) $('barra-paralela').hidden=true;
    const paneles=$('paneles-paralelos-ajuste'); if(paneles) paneles.replaceChildren();
  }

  function conectarVistas() {
    const normal=$('vista-normal'), paralela=$('vista-paralela');
    if (!normal || !paralela || normal.dataset.ajusteVista) return;
    const n=normal.cloneNode(true), p=paralela.cloneNode(true);
    n.dataset.ajusteVista='1'; p.dataset.ajusteVista='1';
    normal.replaceWith(n); paralela.replaceWith(p);
    n.addEventListener('click', salirParalela); p.addEventListener('click', entrarParalela);
  }

  function abrirModalRecursosParalela() {
    const modal=$('modal-recursos'); const lista=$('lista-recursos');
    if(!modal||!lista||typeof listarRecursos!=='function') return;
    modal.hidden=false; lista.replaceChildren();
    const ayuda=modal.querySelector('.modal-ayuda'); if(ayuda) ayuda.textContent='Selecciona el recurso que quieres añadir a la comparación.';
    const carga=document.createElement('p'); carga.textContent='Cargando recursos disponibles…'; lista.append(carga);
    listarRecursos().then(recursos=>{
      lista.replaceChildren(); const disponibles=recursos.filter(r=>!paralelo.ids.includes(r.id));
      if(!disponibles.length){lista.textContent='No hay otros recursos disponibles para agregar.';return;}
      crearBuscadorRecursos(lista,disponibles);
      disponibles.forEach(r=>{const b=document.createElement('button');b.type='button';b.className='recurso-opcion';b.innerHTML=`<strong>${escapeHtml(r.titulo)}</strong><small>${escapeHtml(r.tipo)} · ${escapeHtml(r.path)}</small>`;b.onclick=async()=>{try{const cargado=await descargarRecurso(r);const principal=obtenerActual();if(principal){const idx=buscarNodo(cargado,tituloNodo(principal));if(idx>=0)cargado.actual=idx;}paralelo.ids.push(cargado.id);modal.hidden=true;renderizarParalelo();}catch(e){console.error(e);}};lista.append(b);});
      lista.parentElement.querySelector('.buscador-recursos input')?.focus();
    }).catch(e=>{console.error(e);lista.textContent='No se pudieron listar los recursos.';});
  }

  function observarCambios() {
    const lista=$('lista-indice');
    if(lista&&!lista.dataset.ajusteObservado){
      lista.dataset.ajusteObservado='1';
      new MutationObserver(()=>setTimeout(()=>{asegurarBuscadorBiblico();if(document.body.classList.contains('modo-paralela-ajuste'))renderizarParalelo();},30)).observe(lista,{childList:true,subtree:true});
    }
    const titulo=$('titulo-libro');
    if(titulo&&!titulo.dataset.ajusteTitulo){
      titulo.dataset.ajusteTitulo='1';
      new MutationObserver(()=>setTimeout(()=>{asegurarBuscadorBiblico();if(document.body.classList.contains('modo-paralela-ajuste'))renderizarParalelo();},30)).observe(titulo,{childList:true,characterData:true,subtree:true});
    }
  }

  function iniciar() {
    instalarEstilo(); asegurarAreaParalela(); asegurarBuscadorBiblico(); conectarBotonRecursos(); conectarVistas(); observarCambios();
    if ($('barra-paralela')) $('barra-paralela').hidden=true;
    if ($('paneles-paralelos-ajuste')) $('paneles-paralelos-ajuste').style.display='none';
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar,{once:true}); else iniciar();
})();
