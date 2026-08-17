/* AJUSTES DE BIBLIOTECA
 * Este archivo se ocupa solamente del buscador bíblico y del buscador de recursos en modo NORMAL.
 * La vista PARALELA tiene un único controlador en vista-paralela.js.
 */
(function(){
  const $=id=>document.getElementById(id);
  const normalizar=s=>String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();

  function estilo(){
    if($('estilos-ajustes-biblioteca'))return;
    const s=document.createElement('style');s.id='estilos-ajustes-biblioteca';
    s.textContent=`
      .buscador-libros-biblico{display:block!important}.buscador-libros-biblico[hidden]{display:none!important}
      .buscador-recursos-ajuste{display:grid;grid-template-columns:1fr;gap:.45rem;margin:.7rem 0 1rem}
      .buscador-recursos-ajuste input{width:100%;box-sizing:border-box;border:1px solid #d7ddd7;border-radius:8px;padding:.65rem .7rem;background:#fff;color:#1d2a25}
      .resultado-recurso-oculto{display:none!important}
    `;document.head.appendChild(s);
  }

  function crearBuscadorRecursos(lista,recursos){
    const wrap=document.createElement('div');wrap.className='buscador-recursos-ajuste';
    const input=document.createElement('input');input.type='search';input.placeholder='Buscar recurso por nombre...';input.autocomplete='off';wrap.append(input);lista.parentElement.insertBefore(wrap,lista);
    input.addEventListener('input',()=>{const q=normalizar(input.value);lista.querySelectorAll('.recurso-opcion').forEach((b,i)=>{const r=recursos[i];const texto=normalizar(`${r?.titulo||''} ${r?.tipo||''} ${r?.path||''}`);b.classList.toggle('resultado-recurso-oculto',Boolean(q&&!texto.includes(q)));});});
    return input;
  }

  function abrirRecursosNormal(){
    const modal=$('modal-recursos'),lista=$('lista-recursos');
    if(!modal||!lista||typeof listarRecursos!=='function')return;
    modal.hidden=false;lista.replaceChildren();
    const ayuda=modal.querySelector('.modal-ayuda');if(ayuda)ayuda.textContent='Elige un libro, Biblia, diccionario o léxico. Se abrirá como una nueva pestaña de estudio.';
    const carga=document.createElement('p');carga.textContent='Cargando recursos disponibles…';lista.append(carga);
    listarRecursos().then(recursos=>{
      lista.replaceChildren();
      if(!recursos.length){lista.textContent='No se encontraron archivos JSON disponibles.';return;}
      const input=crearBuscadorRecursos(lista,recursos);
      recursos.forEach(r=>{const b=document.createElement('button');b.type='button';b.className='recurso-opcion';b.innerHTML=`<strong>${escapeHtml(r.titulo)}</strong><small>${escapeHtml(r.tipo)} · ${escapeHtml(r.path)}</small>`;b.onclick=()=>abrirRecurso(r);lista.append(b);});
      input.focus();
    }).catch(e=>{console.error(e);lista.textContent='No se pudieron listar los recursos. Revisa los permisos de Storage.';});
  }

  function conectarRecursoNormal(){
    const boton=$('agregar-recurso');if(!boton||boton.dataset.ajusteNormal)return;
    boton.dataset.ajusteNormal='1';
    boton.addEventListener('click',e=>{
      if(document.body.classList.contains('modo-paralela'))return;
      e.preventDefault();e.stopImmediatePropagation();abrirRecursosNormal();
    },true);
  }

  function asegurarBuscadorBiblico(){
    const caja=$('buscador-libros-biblico'),campo=$('campo-libro-biblico'),boton=$('buscar-cita-biblica');
    if(!caja||!campo||!boton)return;
    const botones=[...document.querySelectorAll('#lista-indice button.indice-item')];
    const hayBiblia=botones.some(b=>/^.+\s+\d+$/.test(String(b.textContent||'').trim()));
    if(!hayBiblia){caja.hidden=true;return;}
    caja.hidden=false;
    if(campo.dataset.ajusteBiblico)return;campo.dataset.ajusteBiblico='1';
    const filtrar=()=>{const q=normalizar(campo.value);document.querySelectorAll('#lista-indice .indice-libro').forEach(d=>{const ok=!q||normalizar(d.dataset.libro).includes(q);d.hidden=!ok;if(ok&&q)d.open=true;});};
    const ejecutar=()=>{
      const v=String(campo.value||'').trim();if(!v)return;
      const m=v.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
      if(!m){const d=[...document.querySelectorAll('#lista-indice .indice-libro')].find(x=>normalizar(x.dataset.libro)===normalizar(v));if(d){d.hidden=false;d.open=true;d.scrollIntoView({behavior:'smooth',block:'nearest'});}return;}
      const d=[...document.querySelectorAll('#lista-indice .indice-libro')].find(x=>normalizar(x.dataset.libro)===normalizar(m[1]));if(!d)return;
      const cap=[...d.querySelectorAll('.indice-item')].find(b=>Number(b.textContent)===Number(m[2]));if(!cap)return;
      d.hidden=false;d.open=true;cap.click();
      if(m[3])setTimeout(()=>{const patron=new RegExp(`^\\s*${Number(m[3])}(?:[\\s.,;:]|$)`);const p=[...document.querySelectorAll('#contenido p')].find(x=>patron.test(x.textContent||''));if(p){p.classList.add('versiculo-destacado');p.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>p.classList.remove('versiculo-destacado'),5000);}},300);
    };
    campo.addEventListener('input',filtrar);campo.addEventListener('keydown',e=>{if(e.key==='Enter')ejecutar();});boton.addEventListener('click',ejecutar);
  }

  function iniciar(){estilo();conectarRecursoNormal();asegurarBuscadorBiblico();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
