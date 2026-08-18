/* NAVEGACIÓN BÍBLICA
 * Mantiene la búsqueda del índice en modo NORMAL.
 * En PARALELO añade una sola navegación de capítulo.
 * No reemplaza el lector ni la vista paralela existentes.
 */
(function(){
  const $=id=>document.getElementById(id);
  const norm=s=>String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();

  function estilos(){
    if($('estilos-navegacion-biblica'))return;
    const s=document.createElement('style');s.id='estilos-navegacion-biblica';
    s.textContent=`
      /* En NORMAL no mostramos una segunda caja de búsqueda en el contenido. */
      .navegacion-biblica-normal{display:none!important}
      .navegacion-biblica-paralela{display:none;max-width:1600px;margin:0 auto .8rem;padding:.55rem .7rem;background:#fff;border:1px solid #d7ddd7;border-radius:10px;align-items:center;gap:.45rem;flex-wrap:nowrap;font:.82rem Arial,sans-serif;box-shadow:0 2px 8px #0000000d}
      body.modo-paralela .navegacion-biblica-paralela{display:flex!important}
      .navegacion-biblica-paralela .etiqueta{font-weight:700;color:#315c4b;white-space:nowrap}
      .navegacion-biblica-paralela input{flex:1 1 auto;min-width:180px;box-sizing:border-box;border:1px solid #cfd8d2;border-radius:7px;padding:.5rem .65rem;background:#fff;color:#1d2a25}
      .navegacion-biblica-paralela button{padding:.5rem .7rem;white-space:nowrap}
      .estado-navegacion-biblica{margin-left:.15rem;color:#718078;font-size:.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .versiculo-destacado{background:#f4d35e!important;border-radius:4px;box-shadow:0 0 0 2px #f4d35e}
      @media(max-width:900px){
        .navegacion-biblica-paralela{flex-wrap:wrap}
        .navegacion-biblica-paralela input{flex:1 1 240px}
        .estado-navegacion-biblica{flex-basis:100%;white-space:normal}
      }
    `;
    document.head.appendChild(s);
  }

  function esBiblia(r){return String(r?.tipo||'').toLowerCase().includes('biblia') || String(r?.titulo||'').toLowerCase().match(/biblia|rvr|nvi|ntv|dhh|strong/);}

  function parsearCita(valor){
    const t=String(valor||'').trim();
    const m=t.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if(!m)return {libro:t,capitulo:null,versiculo:null};
    return {libro:m[1].trim(),capitulo:Number(m[2]),versiculo:m[3]?Number(m[3]):null};
  }

  function tituloCapitulo(n){return String(n?.titulo||'').replace(/^\s*[IVXLCDM]+\.\s*/,'').trim();}

  function libroCoincide(nombre,busqueda){
    const a=norm(nombre),b=norm(busqueda);if(!b)return false;
    if(a===b||a.startsWith(b))return true;
    const at=a.split(/\s+/),bt=b.split(/\s+/);
    return bt.every((w,i)=>at[i]&&at[i].startsWith(w));
  }

  function encontrarNodo(r,cita){
    if(!r?.nodos)return -1;
    const exact=norm(`${cita.libro} ${cita.capitulo}`);
    let i=r.nodos.findIndex(n=>norm(tituloCapitulo(n))===exact || norm(n.titulo)===exact);
    if(i>=0)return i;
    const qlib=norm(cita.libro);
    return r.nodos.findIndex(n=>{
      const t=norm(tituloCapitulo(n)),m=t.match(/^(.*)\s+(\d+)$/);
      return m&&Number(m[2])===cita.capitulo&&libroCoincide(m[1],qlib);
    });
  }

  function resaltarVersiculo(area,numero){
    if(!area||numero==null)return;
    const patron=new RegExp(`^\\s*${Number(numero)}(?:[\\s.,;:]|$)`);
    const p=[...area.querySelectorAll('p')].find(x=>patron.test(x.textContent||''));
    if(p){p.classList.add('versiculo-destacado');p.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>p.classList.remove('versiculo-destacado'),4500);}
  }

  function renderPanel(r,panel,versiculo){
    if(!r||!panel)return;
    const area=panel.querySelector('.contenido-panel');if(!area)return;
    area.replaceChildren();const nodo=r.nodos?.[r.actual];
    if(!nodo){area.innerHTML='<div class="panel-vacio">No hay contenido disponible.</div>';return;}
    const h2=document.createElement('h2');h2.textContent=nodo.titulo||r.titulo;area.append(h2);
    if(typeof renderizarBloques==='function')renderizarBloques(nodo.contenido,area,(nodo.titulo||'').length+2);
    if(versiculo)setTimeout(()=>resaltarVersiculo(area,versiculo),80);
  }

  function buscarParalela(valor){
    const cita=parsearCita(valor),estadoMsg=$('estado-cita-paralela');let encontrados=0;
    if(!cita.capitulo){if(estadoMsg)estadoMsg.textContent='Escribe una cita, por ejemplo: Juan 3:16.';return;}
    document.querySelectorAll('#paneles-paralelos .panel-paralelo').forEach(panel=>{
      const nombre=norm(panel.querySelector('.cabecera-panel strong')?.textContent||'');
      const r=[...estado.recursos.values()].find(x=>norm(x.titulo)===nombre);
      if(!r||!esBiblia(r))return;
      const idx=encontrarNodo(r,cita);if(idx<0)return;
      r.actual=idx;encontrados++;renderPanel(r,panel,cita.versiculo);
    });
    if(estadoMsg)estadoMsg.textContent=encontrados?`Mostrando ${valor} en ${encontrados} recurso${encontrados===1?'':'s'} bíblico${encontrados===1?'':'s'}.`:`No encontré ${valor} en los recursos bíblicos abiertos.`;
  }

  function moverParalela(delta){
    const panels=[...document.querySelectorAll('#paneles-paralelos .panel-paralelo')];let movidos=0;
    panels.forEach(panel=>{
      const nombre=norm(panel.querySelector('.cabecera-panel strong')?.textContent||'');
      const r=[...estado.recursos.values()].find(x=>norm(x.titulo)===nombre);
      if(!r||!esBiblia(r))return;
      r.actual=Math.max(0,Math.min((r.nodos?.length||1)-1,r.actual+delta));renderPanel(r,panel);movidos++;
    });
    if(movidos){const p=estado.recursos.get(estado.activa);if(p&&esBiblia(p)&&$('campo-cita-paralela'))$('campo-cita-paralela').value=tituloCapitulo(p.nodos[p.actual]);}
  }

  function crearBarraParalela(){
    const lector=document.querySelector('.lector');if(!lector||$('navegacion-biblica-paralela'))return;
    const herramientas=lector.querySelector('.herramientas');if(!herramientas)return;
    const barra=document.createElement('div');barra.id='navegacion-biblica-paralela';barra.className='navegacion-biblica-paralela';
    barra.innerHTML='<span class="etiqueta">Capítulo</span><input id="campo-cita-paralela" type="search" placeholder="Ej.: Juan 3:16 · 2 Sam 1" autocomplete="off"><button id="anterior-cita-paralela" type="button">← Anterior</button><button id="buscar-cita-paralela" type="button">Ir</button><button id="siguiente-cita-paralela" type="button">Siguiente →</button><div id="estado-cita-paralela" class="estado-navegacion-biblica"></div>';
    herramientas.insertAdjacentElement('afterend',barra);
    $('buscar-cita-paralela').onclick=()=>buscarParalela($('campo-cita-paralela').value);
    $('campo-cita-paralela').addEventListener('keydown',e=>{if(e.key==='Enter')buscarParalela(e.target.value);});
    $('anterior-cita-paralela').onclick=()=>moverParalela(-1);
    $('siguiente-cita-paralela').onclick=()=>moverParalela(1);
  }

  function instalarNormal(){
    /* El buscador funcional del modo NORMAL ya pertenece al índice. */
    return;
  }

  function observar(){
    estilos();instalarNormal();crearBarraParalela();
    const paneles=$('paneles-paralelos');
    if(paneles&&!paneles.dataset.navBiblicaObserver){paneles.dataset.navBiblicaObserver='1';new MutationObserver(()=>{}).observe(paneles,{childList:true,subtree:true});}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observar,{once:true});else observar();
})();
