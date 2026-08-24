/* MEJORAS DE NAVEGACION — ajustes visuales sin reemplazar funciones existentes */
(function(){
  const $=id=>document.getElementById(id);
  const norm=s=>String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();

  function esBiblia(r){return !!r&&(String(r.tipo||'').toLowerCase().includes('biblia')||/biblia|rvr|rvc|nvi|ntv|dhh|strong/.test(String(r.titulo||'').toLowerCase()));}
  function parse(valor){const t=String(valor||'').replace(/[¿¡]/g,'').trim();const m=t.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);return m?{libro:m[1].trim(),cap:Number(m[2]),vers:m[3]?Number(m[3]):null}:null;}
  function libroCoincide(nombre,busqueda){const a=norm(nombre),b=norm(busqueda);if(!b)return false;if(a===b||a.startsWith(b))return true;const at=a.split(/\s+/),bt=b.split(/\s+/);return bt.every((w,i)=>at[i]&&at[i].startsWith(w));}
  function buscarNodo(r,c){if(!r?.nodos)return -1;const qlib=norm(c.libro),q=norm(`${c.libro} ${c.cap}`);let i=r.nodos.findIndex(n=>norm(n.titulo)===q);if(i>=0)return i;i=r.nodos.findIndex(n=>norm(n.titulo).startsWith(q));if(i>=0)return i;return r.nodos.findIndex(n=>{const t=norm(n.titulo);const m=t.match(/^(.*)\s+(\d+)$/);return m&&Number(m[2])===c.cap&&libroCoincide(m[1],qlib);});}
  function resaltar(area,numero){if(!area||numero==null)return;const re=new RegExp('^\\s*'+Number(numero)+'(?:[\\s.,;:]|$)');const p=[...area.querySelectorAll('p')].find(x=>re.test(x.textContent||''));if(p){p.classList.add('versiculo-destacado');p.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>p.classList.remove('versiculo-destacado'),4000);}}

  function fijarInterfaz(){
    if($('mejoras-estilo'))return;
    const s=document.createElement('style');s.id='mejoras-estilo';
    s.textContent=`
      body:not(.modo-paralela) .aplicacion{height:calc(100vh - 116px);min-height:0}
      body:not(.modo-paralela) .indice{height:100%;min-height:0;position:sticky;top:0;overflow-y:auto;overflow-x:hidden;align-self:stretch}
      body:not(.modo-paralela) .lector{height:100%;overflow-y:auto;overflow-x:hidden}
      body:not(.modo-paralela) #navegacion-paralela-fija{display:none!important}
      body:not(.modo-paralela) #navegacion-biblica-paralela{display:none!important}
      .lector .herramientas{position:sticky!important;top:0;z-index:100;background:#f8f5ef!important;padding:.6rem .4rem!important;border-bottom:1px solid #d7ddd7;box-shadow:0 2px 8px #00000014}
      body.modo-paralela .aplicacion{height:calc(100vh - 116px);min-height:0;display:block!important}
      body.modo-paralela .lector{height:100%;max-width:none!important;width:100%!important;margin:0!important;padding:0 1.25rem 2rem!important;overflow-y:auto;overflow-x:hidden}
      body.modo-paralela .lector .herramientas{position:sticky!important;top:0;z-index:120;max-width:1600px;margin:0 auto;padding:.7rem .45rem!important;background:#f8f5ef!important}
      body.modo-paralela #navegacion-paralela-fija{position:sticky;top:69px;z-index:119;display:grid;grid-template-columns:auto minmax(220px,1fr) auto auto auto;align-items:center;gap:.4rem;max-width:1600px;margin:0 auto .8rem;padding:.55rem .45rem;background:#f8f5ef;border-bottom:1px solid #d7ddd7;box-shadow:0 2px 8px #0000000d;font:.82rem Arial,sans-serif}
      #navegacion-paralela-fija .etiqueta{font-weight:700;color:#315c4b}
      #navegacion-paralela-fija input{width:100%;min-width:0;padding:.48rem .6rem;border:1px solid #cfd8d2;border-radius:7px;background:#fff;color:#1d2a25}
      #navegacion-paralela-fija button{white-space:nowrap;padding:.48rem .68rem}
      #estado-paralela-fija{grid-column:1/-1;margin:0;color:#718078;font-size:.72rem;min-height:1em}
      #navegacion-biblica-paralela{display:none!important}
      .versiculo-destacado{background:#f4d35e!important;border-radius:4px;box-shadow:0 0 0 2px #f4d35e}
      @media(max-width:850px){body.modo-paralela #navegacion-paralela-fija{grid-template-columns:auto 1fr auto auto;}body.modo-paralela #navegacion-paralela-fija input{grid-column:2/-1}}
      @media(max-width:700px){body:not(.modo-paralela) .aplicacion{height:calc(100vh - 116px)}body:not(.modo-paralela) .indice{height:calc(100vh - 116px)}body:not(.modo-paralela) .lector{height:100%}body.modo-paralela .lector{padding:0 .7rem 1.5rem!important}body.modo-paralela .lector .herramientas{top:0}body.modo-paralela #navegacion-paralela-fija{top:92px;grid-template-columns:1fr 1fr;}body.modo-paralela #navegacion-paralela-fija .etiqueta{grid-column:1/-1}body.modo-paralela #navegacion-paralela-fija input{grid-column:1/-1}body.modo-paralela #navegacion-paralela-fija button{width:100%}}
    `;
    document.head.appendChild(s);
  }

  function normalFlexible(valor){
    const c=parse(valor),msg=$('estado-libro-biblico');
    if(!c){if(msg)msg.textContent='Escribe libro y capítulo. Ej.: Juan 3:16 o 2 Sam 1.';return true;}
    const r=estado.recursos.get(estado.activa);
    if(!esBiblia(r)){if(msg)msg.textContent='Abre una Biblia para usar esta búsqueda.';return true;}
    const i=buscarNodo(r,c);
    if(i<0){if(msg)msg.textContent=`No encontré ${valor}. Puedes escribir una parte del nombre, por ejemplo: 2 Sam 1.`;return true;}
    abrirNodo(i);setTimeout(()=>resaltar($('contenido'),c.vers),120);
    if(msg)msg.textContent=`Mostrando ${r.nodos[i].titulo}.`;
    return true;
  }
  function interceptarNormal(){
    const input=$('campo-libro-biblico'),boton=$('buscar-cita-biblica');
    if(!input||input.dataset.mejorado)return;
    input.dataset.mejorado='1';input.placeholder='Ej.: Juan 3:16 · 2 Sam 1 · Gén 1';
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();normalFlexible(input.value);}},true);
    boton?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();normalFlexible(input.value);},true);
  }
  function quitarBarraCita(){const x=$('navegacion-biblica-paralela');if(x)x.remove();}
  function paneles(){return [...document.querySelectorAll('#paneles-paralelos .panel-paralelo')];}
  function recursoPanel(panel){const nombre=norm(panel?.querySelector('.cabecera-panel strong')?.textContent||'');return [...estado.recursos.values()].find(r=>norm(r.titulo)===nombre);}
  function pintarPanel(panel,r){const area=panel?.querySelector('.contenido-panel');if(!area||!r)return;area.replaceChildren();const n=r.nodos?.[r.actual];if(!n){area.innerHTML='<div class="panel-vacio">No hay contenido disponible.</div>';return;}const h=document.createElement('h2');h.textContent=n.titulo||r.titulo;area.append(h);if(typeof renderizarBloques==='function')renderizarBloques(n.contenido,area,(n.titulo||'').length+2);}
  function actualizarReferencia(){const ps=paneles(),r=recursoPanel(ps[0]),ref=$('referencia-paralela');if(ref)ref.textContent=r?`Referencia: ${r.nodos?.[r.actual]?.titulo||''} · ${ps.length}/4 recursos`:'';}
  function buscarParalela(valor){const c=parse(valor),msg=$('estado-paralela-fija');if(!c){if(msg)msg.textContent='Ejemplo: Juan 3:16 o 2 Sam 1.';return;}const ps=paneles();let n=0;ps.forEach(p=>{const r=recursoPanel(p);if(!esBiblia(r))return;const i=buscarNodo(r,c);if(i<0)return;r.actual=i;pintarPanel(p,r);n++;setTimeout(()=>resaltar(p.querySelector('.contenido-panel'),c.vers),80);});if(msg)msg.textContent=n?`Mostrando ${valor} en ${n} recurso${n===1?'':'s'} bíblico${n===1?'':'s'}.`:`No encontré ${valor} en las Biblias abiertas.`;actualizarReferencia();}
  function mover(delta){const ps=paneles();ps.forEach(p=>{const r=recursoPanel(p);if(!r||!esBiblia(r))return;r.actual=Math.max(0,Math.min(r.nodos.length-1,r.actual+delta));pintarPanel(p,r);});const r=recursoPanel(ps[0]);if(r&&$('campo-paralela-fija'))$('campo-paralela-fija').value=r.nodos?.[r.actual]?.titulo||'';actualizarReferencia();}
  function crearBarraParalela(){
    const herramientas=document.querySelector('.lector .herramientas');if(!herramientas||$('navegacion-paralela-fija'))return;
    const b=document.createElement('div');b.id='navegacion-paralela-fija';b.hidden=true;
    b.innerHTML='<span class="etiqueta">Capítulo</span><input id="campo-paralela-fija" type="search" placeholder="Ej.: Juan 3:16 · 2 Sam 1" autocomplete="off"><button id="anterior-paralela-fija" type="button">← Anterior</button><button id="ir-paralela-fija" type="button">Ir</button><button id="siguiente-paralela-fija" type="button">Siguiente →</button><div id="estado-paralela-fija"></div>';
    herramientas.insertAdjacentElement('afterend',b);$('ir-paralela-fija').onclick=()=>buscarParalela($('campo-paralela-fija').value);$('campo-paralela-fija').addEventListener('keydown',e=>{if(e.key==='Enter')buscarParalela(e.target.value);});$('anterior-paralela-fija').onclick=()=>mover(-1);$('siguiente-paralela-fija').onclick=()=>mover(1);
  }
  function actualizarModo(){const b=$('navegacion-paralela-fija');if(!b)return;const paralelo=document.body.classList.contains('modo-paralela');b.hidden=!paralelo;if(paralelo){const r=recursoPanel(paneles()[0]);if(r)$('campo-paralela-fija').value=r.nodos?.[r.actual]?.titulo||'';}quitarBarraCita();}
  function instalar(){
    fijarInterfaz();interceptarNormal();crearBarraParalela();actualizarModo();
    const pn=$('paneles-paralelos');if(pn&&!pn.dataset.mejorasObs){pn.dataset.mejorasObs='1';new MutationObserver(()=>{quitarBarraCita();if(document.body.classList.contains('modo-paralela'))actualizarReferencia();}).observe(pn,{childList:true,subtree:true});}
    const vm=$('vista-paralela');vm?.addEventListener('click',()=>setTimeout(actualizarModo,30),true);const vn=$('vista-normal');vn?.addEventListener('click',()=>setTimeout(actualizarModo,30),true);
    // Carga el módulo T1/T2/T3 después del motor principal, sin alterar las funciones existentes.
    if(!document.querySelector('script[data-titulos-t123]')){const s=document.createElement('script');s.src='assets/js/biblioteca-titulos.js?v=20260824-1';s.dataset.titulosT123='1';document.body.appendChild(s);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});else instalar();
})();
