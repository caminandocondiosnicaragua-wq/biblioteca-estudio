/* NAVEGACIÓN BÍBLICA
 * Mantiene disponible la búsqueda de capítulo/cita en modo NORMAL
 * y añade una sola barra de navegación para la VISTA PARALELA.
 * No reemplaza el lector ni la vista paralela existentes.
 */
(function(){
  const $=id=>document.getElementById(id);
  const norm=s=>String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();

  function estilos(){
    if($('estilos-navegacion-biblica'))return;
    const s=document.createElement('style');s.id='estilos-navegacion-biblica';
    s.textContent=`
      .navegacion-biblica-normal{margin:.7rem 0;padding:.65rem;background:#f5f8f5;border:1px solid #d7ddd7;border-radius:9px}
      .navegacion-biblica-normal label{display:block;font:700 .78rem Arial,sans-serif;color:#315c4b;margin-bottom:.35rem}
      .navegacion-biblica-controles{display:flex;gap:.4rem}
      .navegacion-biblica-controles input{min-width:0;flex:1;box-sizing:border-box;border:1px solid #cfd8d2;border-radius:7px;padding:.55rem .65rem;background:#fff}
      .navegacion-biblica-controles button{white-space:nowrap}
      .navegacion-biblica-paralela{max-width:1600px;margin:0 auto .8rem;padding:.65rem .8rem;background:#fff;border:1px solid #d7ddd7;border-radius:10px;display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;font: .82rem Arial,sans-serif}
      .navegacion-biblica-paralela .etiqueta{font-weight:700;color:#315c4b}
      .navegacion-biblica-paralela input{flex:1 1 280px;min-width:180px;box-sizing:border-box;border:1px solid #cfd8d2;border-radius:7px;padding:.55rem .65rem;background:#fff}
      .navegacion-biblica-paralela button{padding:.5rem .7rem}
      .estado-navegacion-biblica{flex-basis:100%;margin:.15rem 0 0;color:#718078;font-size:.75rem}
      .versiculo-destacado{background:#f4d35e!important;border-radius:4px;box-shadow:0 0 0 2px #f4d35e}
      @media(max-width:700px){.navegacion-biblica-paralela{align-items:stretch}.navegacion-biblica-paralela button{flex:1}.navegacion-biblica-controles{flex-wrap:wrap}.navegacion-biblica-controles button{flex:1}}
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

  function encontrarNodo(r,cita){
    if(!r?.nodos)return -1;
    const exact=norm(`${cita.libro} ${cita.capitulo}`);
    let i=r.nodos.findIndex(n=>norm(tituloCapitulo(n))===exact || norm(n.titulo)===exact);
    if(i>=0)return i;
    const inicio=norm(cita.libro);
    return r.nodos.findIndex(n=>norm(tituloCapitulo(n)).startsWith(`${inicio} ${cita.capitulo}`));
  }

  function resaltarVersiculo(area,numero){
    if(!area||!numero)return;
    const patron=new RegExp(`^\\s*${Number(numero)}(?:[\\s.,;:]|$)`);
    const p=[...area.querySelectorAll('p')].find(x=>patron.test(x.textContent||''));
    if(p){p.classList.add('versiculo-destacado');p.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>p.classList.remove('versiculo-destacado'),4500);}
  }

  function renderPanel(r,panel,versiculo){
    if(!r||!panel)return;
    const area=panel.querySelector('.contenido-panel');
    if(!area)return;
    area.replaceChildren();
    const nodo=r.nodos?.[r.actual];
    if(!nodo){area.innerHTML='<div class="panel-vacio">No hay contenido disponible.</div>';return;}
    const h2=document.createElement('h2');h2.textContent=nodo.titulo||r.titulo;area.append(h2);
    if(typeof renderizarBloques==='function')renderizarBloques(nodo.contenido,area,(nodo.titulo||'').length+2);
    if(nodo.subsecciones?.length){const h3=document.createElement('h3');h3.textContent='Temas incluidos';area.append(h3);const ul=document.createElement('ul');ul.className='lista';nodo.subsecciones.forEach(x=>{const li=document.createElement('li');li.textContent=x.titulo||'';ul.append(li);});area.append(ul);}
    if(versiculo)setTimeout(()=>resaltarVersiculo(area,versiculo),80);
  }

  function refrescarParalela(){
    document.querySelectorAll('#paneles-paralelos .panel-paralelo').forEach(panel=>{
      const nombre=norm(panel.querySelector('.cabecera-panel strong')?.textContent||'');
      const r=[...estado.recursos.values()].find(x=>norm(x.titulo)===nombre);
      if(r)renderPanel(r,panel);
    });
  }

  function actualizarDatalist(){
    const input=$('campo-cita-paralela');if(!input)return;
    let lista=$('sugerencias-citas-paralelas');
    if(!lista){lista=document.createElement('datalist');lista.id='sugerencias-citas-paralelas';document.body.append(lista);input.setAttribute('list',lista.id);}
    const vistos=new Set();lista.replaceChildren();
    document.querySelectorAll('#paneles-paralelos .panel-paralelo').forEach(panel=>{
      const nombre=norm(panel.querySelector('.cabecera-panel strong')?.textContent||'');
      const r=[...estado.recursos.values()].find(x=>norm(x.titulo)===nombre);
      if(!esBiblia(r))return;
      (r.nodos||[]).forEach(n=>{const t=tituloCapitulo(n);if(!t||vistos.has(norm(t)))return;vistos.add(norm(t));const o=document.createElement('option');o.value=t;lista.append(o);});
    });
  }

  function buscarParalela(valor){
    const cita=parsearCita(valor),estadoMsg=$('estado-cita-paralela');let encontrados=0;
    if(!cita.capitulo){if(estadoMsg)estadoMsg.textContent='Escribe una cita, por ejemplo: Juan 3:16.';return;}
    document.querySelectorAll('#paneles-paralelos .panel-paralelo').forEach(panel=>{
      const nombre=norm(panel.querySelector('.cabecera-panel strong')?.textContent||'');
      const r=[...estado.recursos.values()].find(x=>norm(x.titulo)===nombre);if(!r||!esBiblia(r))return;
      const idx=encontrarNodo(r,cita);if(idx<0)return;r.actual=idx;encontrados++;renderPanel(r,panel,cita.versiculo);
    });
    if(estadoMsg)estadoMsg.textContent=encontrados?`Mostrando ${valor} en ${encontrados} recurso${encontrados===1?'':'s'} bíblico${encontrados===1?'':'s'}.`:`No encontré ${valor} en los recursos bíblicos abiertos.`;
  }

  function moverParalela(delta){
    const panels=[...document.querySelectorAll('#paneles-paralelos .panel-paralelo')];let movidos=0;
    panels.forEach(panel=>{
      const nombre=norm(panel.querySelector('.cabecera-panel strong')?.textContent||'');const r=[...estado.recursos.values()].find(x=>norm(x.titulo)===nombre);if(!r||!esBiblia(r))return;
      r.actual=Math.max(0,Math.min((r.nodos?.length||1)-1,r.actual+delta));renderPanel(r,panel);movidos++;
    });
    if(movidos){actualizarDatalist();const p=estado.recursos.get(estado.activa);if(p&&esBiblia(p)){$('campo-cita-paralela').value=tituloCapitulo(p.nodos[p.actual]);}}
  }

  function crearBarraParalela(){
    const lector=document.querySelector('.lector');if(!lector||$('navegacion-biblica-paralela'))return;
    const herramientas=lector.querySelector('.herramientas');if(!herramientas)return;
    const barra=document.createElement('div');barra.id='navegacion-biblica-paralela';barra.className='navegacion-biblica-paralela';
    barra.innerHTML='<span class="etiqueta">Cita bíblica</span><input id="campo-cita-paralela" type="search" placeholder="Ej.: Juan 3:16" autocomplete="off"><button id="anterior-cita-paralela" type="button">← Anterior</button><button id="buscar-cita-paralela" type="button">Ir</button><button id="siguiente-cita-paralela" type="button">Siguiente →</button><div id="estado-cita-paralela" class="estado-navegacion-biblica"></div>';
    herramientas.insertAdjacentElement('afterend',barra);
    $('buscar-cita-paralela').onclick=()=>buscarParalela($('campo-cita-paralela').value);
    $('campo-cita-paralela').addEventListener('keydown',e=>{if(e.key==='Enter')buscarParalela(e.target.value);});
    $('anterior-cita-paralela').onclick=()=>moverParalela(-1);$('siguiente-cita-paralela').onclick=()=>moverParalela(1);
  }

  function instalarNormal(){
    const indice=$('panel-indice'),lista=$('lista-indice');if(!indice||!lista)return;
    if(!document.querySelector('.navegacion-biblica-normal')){
      const caja=document.createElement('div');caja.className='navegacion-biblica-normal';caja.innerHTML='<label for="campo-cita-normal">Buscar capítulo o cita bíblica</label><div class="navegacion-biblica-controles"><input id="campo-cita-normal" type="search" placeholder="Ej.: Juan 3:16" autocomplete="off"><button id="ir-cita-normal" type="button">Ir</button></div><p id="estado-cita-normal" class="estado-navegacion-biblica"></p>';
      indice.insertBefore(caja,lista);
      $('ir-cita-normal').onclick=()=>buscarNormal($('campo-cita-normal').value);
      $('campo-cita-normal').addEventListener('keydown',e=>{if(e.key==='Enter')buscarNormal(e.target.value);});
    }
  }

  function buscarNormal(valor){
    const cita=parsearCita(valor),estadoMsg=$('estado-cita-normal');
    if(!cita.capitulo){if(estadoMsg)estadoMsg.textContent='Escribe un libro y capítulo, por ejemplo: Juan 3:16.';return;}
    const libro=estado.recursos.get(estado.activa);if(!libro||!esBiblia(libro)){if(estadoMsg)estadoMsg.textContent='Abre una Biblia para usar esta búsqueda.';return;}
    const idx=encontrarNodo(libro,cita);if(idx<0){if(estadoMsg)estadoMsg.textContent=`No encontré ${valor} en esta Biblia.`;return;}
    abrirNodo(idx);
    setTimeout(()=>resaltarVersiculo($('contenido'),cita.versiculo),120);
    if(estadoMsg)estadoMsg.textContent=`Mostrando ${valor}.`;
  }

  function observar(){
    estilos();instalarNormal();crearBarraParalela();actualizarDatalist();
    const lista=$('lista-indice');
    if(lista&&!lista.dataset.navBiblicaObserver){lista.dataset.navBiblicaObserver='1';new MutationObserver(()=>{instalarNormal();}).observe(lista,{childList:true,subtree:true});}
    const paneles=$('paneles-paralelos');
    if(paneles&&!paneles.dataset.navBiblicaObserver){paneles.dataset.navBiblicaObserver='1';new MutationObserver(()=>{actualizarDatalist();}).observe(paneles,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observar,{once:true});else observar();
})();
