/* BIBLIOTECA — AJUSTES DE INTERFAZ
 * Una sola capa para buscadores, vista paralela y selector de recursos.
 * No modifica JSON ni la arquitectura Supabase → Biblioteca.
 */
(function () {
  const $ = id => document.getElementById(id);
  const normalizar = s => String(s || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  let paraleloIds = [];

  function estilo() {
    if ($('ajustes-biblioteca-estilo')) return;
    const s = document.createElement('style');
    s.id = 'ajustes-biblioteca-estilo';
    s.textContent = `
      #selector-vista-principal{display:flex !important;visibility:visible !important;}
      .buscador-libros-biblico{display:block !important;}
      .buscador-libros-biblico[hidden]{display:none !important;}
      .buscador-recursos{display:grid;grid-template-columns:1fr;gap:.45rem;margin:.7rem 0 1rem;}
      .buscador-recursos input{width:100%;box-sizing:border-box;border:1px solid #d7ddd7;border-radius:8px;padding:.65rem .7rem;background:#fff;color:#1d2a25;}
      .resultado-recurso-oculto{display:none !important;}
      .paralela-ajuste{display:none;max-width:1500px;margin:0 auto;padding:.2rem 0 2rem;}
      body.modo-paralela-ajuste .indice{display:none !important;}
      body.modo-paralela-ajuste .lector{max-width:none;width:100%;margin:0;padding:1rem 1.25rem 2rem;}
      body.modo-paralela-ajuste #contenido,body.modo-paralela-ajuste #estado,body.modo-paralela-ajuste .navegacion{display:none !important;}
      body.modo-paralela-ajuste .paralela-ajuste{display:block !important;}
      .paralela-cabecera-ajuste{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin:.3rem 0 .8rem;padding:.7rem .85rem;background:#fff;border:1px solid #d7ddd7;border-radius:10px;color:#51635a;font:.85rem Arial,sans-serif;}
      .paralela-paneles-ajuste{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;}
      .paralela-panel-ajuste{min-width:0;background:#fff;border:1px solid #d7ddd7;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px #0000000d;}
      .paralela-panel-cabecera{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.7rem .9rem;background:#f0f4f1;border-bottom:1px solid #d7ddd7;font:.9rem Arial,sans-serif;position:sticky;top:0;z-index:2;}
      .paralela-panel-cabecera strong{color:#315c4b;}
      .paralela-quitar{background:transparent;color:#315c4b;padding:.15rem .35rem;font-size:1.1rem;}
      .paralela-contenido{padding:1.25rem clamp(1rem,2.5vw,2.2rem);height:calc(100vh - 270px);min-height:500px;overflow:auto;font-family:Georgia,"Times New Roman",serif;font-size:var(--tamano);line-height:1.72;}
      .paralela-contenido h2{color:#244d3e;font-size:1.65em;line-height:1.2;margin:.2em 0 .8em;}
      .paralela-contenido p{margin:.9em 0;white-space:pre-wrap;}
      .paralela-vacia{padding:2rem;text-align:center;color:#718078;font:1rem Arial,sans-serif;}
      @media(max-width:850px){.paralela-paneles-ajuste{grid-template-columns:1fr}.paralela-contenido{height:auto;min-height:0;max-height:none}}
    `;
    document.head.appendChild(s);
  }

  function asegurarParalela() {
    const lector = document.querySelector('.lector');
    if (!lector || $('paralela-ajuste')) return;
    const herramientas = lector.querySelector('.herramientas');
    if (!herramientas) return;
    const zona = document.createElement('section');
    zona.id = 'paralela-ajuste';
    zona.className = 'paralela-ajuste';
    zona.innerHTML = '<div class="paralela-cabecera-ajuste"><span id="paralela-referencia">Vista paralela</span><span>Usa ＋ Recurso para comparar otra Biblia o recurso.</span></div><div id="paralela-paneles-ajuste" class="paralela-paneles-ajuste"></div>';
    herramientas.insertAdjacentElement('afterend', zona);
  }

  function actual() { return typeof estado !== 'undefined' ? estado.recursos.get(estado.activa) : null; }
  function tituloActual(r) { return r?.nodos?.[r.actual]?.titulo || 'Sin referencia'; }

  function renderParalela() {
    const zona = $('paralela-ajuste'), paneles = $('paralela-paneles-ajuste');
    if (!zona || !paneles) return;
    const principal = actual();
    paneles.replaceChildren();
    if (!principal) { paneles.innerHTML = '<div class="paralela-panel-ajuste"><div class="paralela-vacia">Abre un recurso para iniciar la vista paralela.</div></div>'; return; }
    if (!paraleloIds.length) paraleloIds = [principal.id];
    const ref = $('paralela-referencia');
    if (ref) ref.textContent = `Referencia: ${tituloActual(principal)}`;
    paraleloIds.forEach(id => {
      const r = estado.recursos.get(id);
      if (!r) return;
      const panel = document.createElement('section'); panel.className = 'paralela-panel-ajuste';
      const cab = document.createElement('div'); cab.className = 'paralela-panel-cabecera';
      const nombre = document.createElement('strong'); nombre.textContent = r.titulo;
      const quitar = document.createElement('button'); quitar.type='button'; quitar.className='paralela-quitar'; quitar.textContent='×'; quitar.title='Quitar recurso'; quitar.disabled=paraleloIds.length===1;
      quitar.onclick=()=>{ paraleloIds=paraleloIds.filter(x=>x!==id); if(!paraleloIds.length) paraleloIds=[principal.id]; renderParalela(); };
      cab.append(nombre,quitar);
      const area=document.createElement('article'); area.className='paralela-contenido';
      const nodo=r.nodos[r.actual];
      if(nodo){const h2=document.createElement('h2');h2.textContent=nodo.titulo||r.titulo;area.append(h2);if(typeof renderizarBloques==='function')renderizarBloques(nodo.contenido,area,(nodo.titulo||'').length+2);}
      panel.append(cab,area);paneles.append(panel);
    });
  }

  function entrarParalela(){
    const principal=actual();
    paraleloIds=principal?[principal.id]:[];
    document.body.classList.add('modo-paralela-ajuste');
    $('vista-normal')?.classList.remove('activo'); $('vista-paralela')?.classList.add('activo');
    if($('barra-paralela')){$('barra-paralela').hidden=true;$('barra-paralela').style.display='none';}
    asegurarParalela(); renderParalela();
  }

  function salirParalela(){
    document.body.classList.remove('modo-paralela-ajuste');
    $('vista-normal')?.classList.add('activo'); $('vista-paralela')?.classList.remove('activo');
    if($('paralela-paneles-ajuste'))$('paralela-paneles-ajuste').replaceChildren();
  }

  function conectarVistas(){
    const normal=$('vista-normal'), paralela=$('vista-paralela');
    if(!normal||!paralela||normal.dataset.vistaDefinitiva)return;
    const n=normal.cloneNode(true),p=paralela.cloneNode(true);
    n.dataset.vistaDefinitiva='1';p.dataset.vistaDefinitiva='1';
    normal.replaceWith(n);paralela.replaceWith(p);
    n.addEventListener('click',salirParalela);p.addEventListener('click',entrarParalela);
  }

  function crearBuscadorRecursos(contenedor,recursos){
    const wrap=document.createElement('div');wrap.className='buscador-recursos';
    const input=document.createElement('input');input.type='search';input.placeholder='Buscar recurso por nombre...';input.autocomplete='off';wrap.append(input);contenedor.parentElement.insertBefore(wrap,contenedor);
    const aplicar=()=>{const q=normalizar(input.value);contenedor.querySelectorAll('.recurso-opcion').forEach((b,i)=>{const r=recursos[i];const texto=normalizar(`${r?.titulo||''} ${r?.tipo||''} ${r?.path||''}`);b.classList.toggle('resultado-recurso-oculto',Boolean(q&&!texto.includes(q)));});};
    input.addEventListener('input',aplicar);return input;
  }

  function abrirRecursos(){
    const modal=$('modal-recursos'),lista=$('lista-recursos');if(!modal||!lista||typeof listarRecursos!=='function')return;
    modal.hidden=false;lista.replaceChildren();
    const ayuda=modal.querySelector('.modal-ayuda');if(ayuda)ayuda.textContent='Elige un libro, Biblia, diccionario o léxico.';
    const carga=document.createElement('p');carga.textContent='Cargando recursos disponibles…';lista.append(carga);
    listarRecursos().then(recursos=>{lista.replaceChildren();if(!recursos.length){lista.textContent='No se encontraron archivos JSON disponibles.';return;}const input=crearBuscadorRecursos(lista,recursos);recursos.forEach(r=>{const b=document.createElement('button');b.type='button';b.className='recurso-opcion';b.innerHTML=`<strong>${escapeHtml(r.titulo)}</strong><small>${escapeHtml(r.tipo)} · ${escapeHtml(r.path)}</small>`;b.onclick=()=>abrirRecurso(r);lista.append(b);});input.focus();}).catch(e=>{console.error(e);lista.textContent='No se pudieron listar los recursos. Revisa los permisos de Storage.';});
  }

  function abrirRecursosParalelo(){
    const modal=$('modal-recursos'),lista=$('lista-recursos');if(!modal||!lista||typeof listarRecursos!=='function')return;
    modal.hidden=false;lista.replaceChildren();
    const ayuda=modal.querySelector('.modal-ayuda');if(ayuda)ayuda.textContent='Selecciona el recurso que quieres añadir a la comparación.';
    const carga=document.createElement('p');carga.textContent='Cargando recursos disponibles…';lista.append(carga);
    listarRecursos().then(recursos=>{const disponibles=recursos.filter(r=>!paraleloIds.includes(r.id));lista.replaceChildren();if(!disponibles.length){lista.textContent='No hay otros recursos disponibles para agregar.';return;}const input=crearBuscadorRecursos(lista,disponibles);disponibles.forEach(r=>{const b=document.createElement('button');b.type='button';b.className='recurso-opcion';b.innerHTML=`<strong>${escapeHtml(r.titulo)}</strong><small>${escapeHtml(r.tipo)} · ${escapeHtml(r.path)}</small>`;b.onclick=async()=>{try{const cargado=await descargarRecurso(r);const principal=actual();if(principal){const ref=tituloActual(principal);const idx=(cargado.nodos||[]).findIndex(n=>normalizar(n.titulo)===normalizar(ref));if(idx>=0)cargado.actual=idx;}paraleloIds.push(cargado.id);modal.hidden=true;renderParalela();}catch(e){console.error(e);}};lista.append(b);});input.focus();}).catch(e=>{console.error(e);lista.textContent='No se pudieron listar los recursos.';});
  }

  function conectarRecurso(){
    const boton=$('agregar-recurso');if(!boton||boton.dataset.recursoDefinitivo)return;
    const nuevo=boton.cloneNode(true);nuevo.dataset.recursoDefinitivo='1';boton.replaceWith(nuevo);
    nuevo.addEventListener('click',()=>document.body.classList.contains('modo-paralela-ajuste')?abrirRecursosParalelo():abrirRecursos());
  }

  function buscadorBiblico(){
    const caja=$('buscador-libros-biblico'),campo=$('campo-libro-biblico'),boton=$('buscar-cita-biblica');
    if(!caja||!campo||!boton)return;
    const hayBiblia=[...document.querySelectorAll('#lista-indice button.indice-item')].some(b=>/^.+\s+\d+$/.test(String(b.textContent||'').trim()));
    if(!hayBiblia){caja.hidden=true;return;}caja.hidden=false;if(campo.dataset.buscadorDefinitivo)return;campo.dataset.buscadorDefinitivo='1';
    const filtrar=()=>{const q=normalizar(campo.value);document.querySelectorAll('#lista-indice .indice-libro').forEach(d=>{const ok=!q||normalizar(d.dataset.libro).includes(q);d.hidden=!ok;if(ok&&q)d.open=true;});};
    const ejecutar=()=>{const v=String(campo.value||'').trim();if(!v)return;const m=v.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);if(!m){const d=[...document.querySelectorAll('#lista-indice .indice-libro')].find(x=>normalizar(x.dataset.libro)===normalizar(v));if(d){d.hidden=false;d.open=true;d.scrollIntoView({behavior:'smooth',block:'nearest'});return;}return;}const d=[...document.querySelectorAll('#lista-indice .indice-libro')].find(x=>normalizar(x.dataset.libro)===normalizar(m[1]));if(!d)return;const cap=[...d.querySelectorAll('.indice-item')].find(b=>Number(b.textContent)===Number(m[2]));if(!cap)return;d.hidden=false;d.open=true;cap.click();if(m[3])setTimeout(()=>{const patron=new RegExp(`^\\s*${Number(m[3])}(?:[\\s.,;:]|$)`);const p=[...document.querySelectorAll('#contenido p')].find(x=>patron.test(x.textContent||''));if(p){p.classList.add('versiculo-destacado');p.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>p.classList.remove('versiculo-destacado'),5000);}},300);};
    campo.addEventListener('input',filtrar);campo.addEventListener('keydown',e=>{if(e.key==='Enter')ejecutar();});boton.addEventListener('click',ejecutar);
  }

  function iniciar(){estilo();asegurarParalela();conectarVistas();conectarRecurso();buscadorBiblico();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
