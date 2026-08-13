const estado = {
  recursos: new Map(),
  abiertas: [],
  activa: null,
  tamanio: Number(localStorage.getItem('biblioteca-tamanio') || 19),
  voz: null,
  pausado: false,
  mapaVoz: [],
  palabraActiva: null
};
const $ = id => document.getElementById(id);

const SUPABASE_URL = 'https://rcetnaoewkoqhctynveo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NYlwHJJY_U7jS_2k4d7Q9g_NrSNzUTZ';
const SUPABASE_BUCKET = 'Libros Privados';
const clienteSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function textoPlano(valor) {
  if (!valor) return '';
  if (typeof valor === 'string') return valor;
  return (valor.contenido || []).map(b => b.texto || '').join('\n');
}

function construirNodos(libro) {
  const salida = [];
  (libro.secciones_preliminares || []).forEach(sec => salida.push({ titulo: sec.titulo, contenido: sec.contenido || [], subsecciones: sec.subsecciones || [], tipo: 'preliminar' }));
  (libro.secciones || []).forEach(sec => {
    salida.push({ titulo: `${sec.numero_romano ? sec.numero_romano + '. ' : ''}${(sec.titulo || '').trim()}`, contenido: sec.contenido || [], subsecciones: sec.subsecciones || [], tipo: 'principal' });
    (sec.subsecciones || []).forEach(sub => salida.push({ titulo: sub.titulo, contenido: sub.contenido || [], subsecciones: [], tipo: 'subseccion', padre: sec.numero_romano }));
  });
  // Formato plano generado por el conversor Word/PDF.
  if (!salida.length && Array.isArray(libro.contenido)) {
    const grupos = [];
    let actual = { titulo: 'Contenido', contenido: [], subsecciones: [], tipo: 'principal' };
    libro.contenido.forEach(block => {
      if (/^heading_1$|^titulo$/i.test(block.tipo || '')) {
        if (actual.contenido.length) grupos.push(actual);
        actual = { titulo: block.texto || 'Sección', contenido: [], subsecciones: [], tipo: 'principal' };
      } else actual.contenido.push(block);
    });
    if (actual.contenido.length || !grupos.length) grupos.push(actual);
    return grupos;
  }
  return salida;
}

function crearPalabrasMarcadas(texto, inicio) {
  const fragment = document.createDocumentFragment();
  const partes = String(texto || '').split(/(\s+)/);
  let offset = inicio;
  partes.forEach(parte => {
    if (!parte) return;
    if (/^\s+$/.test(parte)) fragment.append(document.createTextNode(parte));
    else {
      const span = document.createElement('span');
      span.className = 'palabra-voz';
      span.dataset.vozInicio = String(offset);
      span.dataset.vozFin = String(offset + parte.length);
      span.textContent = parte;
      estado.mapaVoz.push({ inicio: offset, fin: offset + parte.length, elemento: span });
      fragment.append(span);
    }
    offset += parte.length;
  });
  return fragment;
}

function crearFragmentos(block, inicio) {
  const fragment = document.createDocumentFragment();
  const partes = block.formato_fragmentos?.length ? block.formato_fragmentos : [{ texto: block.texto || '' }];
  let offset = inicio;
  partes.forEach(parte => {
    let item = crearPalabrasMarcadas(parte.texto || '', offset);
    offset += (parte.texto || '').length;
    if (parte.subrayado) { const e=document.createElement('u'); e.append(item); item=e; }
    if (parte.cursiva) { const e=document.createElement('em'); e.append(item); item=e; }
    if (parte.negrita) { const e=document.createElement('strong'); e.append(item); item=e; }
    fragment.append(item);
  });
  return fragment;
}

function renderizarTabla(block, destino) {
  const table = document.createElement('table');
  table.className = 'tabla-libro';
  (block.contenido || []).forEach(row => {
    const tr = document.createElement('tr');
    (row.celdas || []).forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell.texto || '';
      tr.append(td);
    });
    table.append(tr);
  });
  destino.append(table);
}

function renderizarBloques(contenido, destino, inicioVoz) {
  let lista = null, offset = inicioVoz;
  (contenido || []).forEach(block => {
    const texto = block.texto || '';
    if (block.tipo === 'tabla') { lista = null; renderizarTabla(block, destino); return; }
    if (block.tipo === 'imagen') { lista = null; return; }
    if (block.tipo === 'elemento_lista') {
      if (!lista) { lista=document.createElement('ul'); lista.className='lista'; destino.append(lista); }
      const li=document.createElement('li'); li.append(crearFragmentos(block, offset));
      lista.append(li); offset += texto.length + 2; return;
    }
    lista = null;
    if (block.tipo === 'parrafo_vacio') { offset += texto.length + 2; return; }
    const p=document.createElement('p');
    if (block.tipo === 'dialogo') p.classList.add('dialogo');
    p.append(crearFragmentos(block, offset)); destino.append(p);
    offset += texto.length + 2;
  });
}

function limpiarResaltado() {
  if (estado.palabraActiva) { estado.palabraActiva.classList.remove('palabra-voz-activa'); estado.palabraActiva = null; }
}
function resaltarPorPosicion(posicion) {
  if (!Number.isFinite(posicion)) return;
  let encontrado = estado.mapaVoz.find(x => posicion >= x.inicio && posicion < x.fin);
  if (!encontrado) encontrado = estado.mapaVoz.find(x => x.inicio > posicion);
  if (!encontrado || encontrado.elemento === estado.palabraActiva) return;
  limpiarResaltado(); estado.palabraActiva=encontrado.elemento; encontrado.elemento.classList.add('palabra-voz-activa');
  const rect=encontrado.elemento.getBoundingClientRect();
  if (rect.top < 90 || rect.bottom > window.innerHeight-70) encontrado.elemento.scrollIntoView({behavior:'smooth',block:'center'});
}
function instalarEstiloResaltado() {
  if ($('estilo-voz-sincronizada')) return;
  const estilo=document.createElement('style'); estilo.id='estilo-voz-sincronizada'; estilo.textContent='.palabra-voz-activa{background:#f4d35e;color:#183b32;border-radius:4px;padding:0 2px;}'; document.head.append(estilo);
}

function renderizarIndice() {
  const lista=$('lista-indice'); lista.replaceChildren();
  const recurso=estado.recursos.get(estado.activa); if (!recurso) return;
  recurso.nodos.forEach((nodo,i)=>{ const b=document.createElement('button'); b.className=`indice-item ${nodo.tipo==='subseccion'?'sub':''} ${i===recurso.actual?'activo':''}`; b.textContent=nodo.titulo; b.onclick=()=>abrirNodo(i); lista.append(b); });
}

function abrirNodo(indice) {
  const recurso=estado.recursos.get(estado.activa); if (!recurso) return;
  detenerAudio(); recurso.actual=Math.max(0,Math.min(indice,recurso.nodos.length-1)); estado.mapaVoz=[];
  const nodo=recurso.nodos[recurso.actual], area=$('contenido'); area.replaceChildren();
  const h2=document.createElement('h2'); h2.append(crearPalabrasMarcadas(nodo.titulo,0)); area.append(h2);
  renderizarBloques(nodo.contenido,area,nodo.titulo.length+2);
  if (nodo.subsecciones.length) { const h3=document.createElement('h3'); h3.textContent='Temas incluidos'; area.append(h3); const ul=document.createElement('ul'); ul.className='lista'; nodo.subsecciones.forEach(s=>{const li=document.createElement('li');li.textContent=s.titulo;ul.append(li);}); area.append(ul); }
  $('titulo-libro').textContent=recurso.titulo;
  $('estado').textContent=`${recurso.tipo} · Sección ${recurso.actual+1} de ${recurso.nodos.length}`;
  $('anterior').disabled=recurso.actual===0; $('siguiente').disabled=recurso.actual===recurso.nodos.length-1;
  localStorage.setItem(`biblioteca-ultima-${recurso.id}`,String(recurso.actual));
  renderizarIndice(); renderizarPestanas(); window.scrollTo({top:0,behavior:'smooth'}); $('panel-indice').classList.remove('abierto');
}

function renderizarPestanas() {
  const cont=$('pestanas'); cont.replaceChildren();
  estado.abiertas.forEach(id=>{ const r=estado.recursos.get(id); if(!r)return; const b=document.createElement('button'); b.className=`pestana ${id===estado.activa?'activa':''}`; b.innerHTML=`<span>${escapeHtml(r.titulo)}</span><b data-cerrar="${id}" title="Cerrar">×</b>`; b.onclick=e=>{ if(e.target.dataset.cerrar) cerrarRecurso(e.target.dataset.cerrar); else cambiarRecurso(id); }; cont.append(b); });
}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cambiarRecurso(id){estado.activa=id;const r=estado.recursos.get(id);if(!r)return; const ultimo=Number(localStorage.getItem(`biblioteca-ultima-${id}`)||0); r.actual=Math.min(ultimo,r.nodos.length-1); abrirNodo(r.actual);}
function cerrarRecurso(id){ if(estado.activa===id) detenerAudio(); estado.abiertas=estado.abiertas.filter(x=>x!==id); estado.recursos.delete(id); if(estado.activa===id) estado.activa=estado.abiertas.at(-1)||null; renderizarPestanas(); if(estado.activa)cambiarRecurso(estado.activa); else { $('titulo-libro').textContent='Mi Biblioteca'; $('contenido').replaceChildren(); renderizarIndice(); } }

function aplicarTamanio(){document.documentElement.style.setProperty('--tamano',`${estado.tamanio}px`);localStorage.setItem('biblioteca-tamanio',estado.tamanio);}
function textoActual(){const r=estado.recursos.get(estado.activa);if(!r)return '';const n=r.nodos[r.actual];return[n.titulo,...(n.contenido||[]).map(b=>b.texto||'')].join('. ');}
function detenerAudio(){if('speechSynthesis'in window)speechSynthesis.cancel();estado.voz=null;estado.pausado=false;limpiarResaltado();$('pausar').disabled=true;$('detener').disabled=true;$('pausar').textContent='⏸ Pausar';}
function escuchar(){detenerAudio();if(!('speechSynthesis'in window)){ $('estado').textContent='Este navegador no ofrece lectura en voz alta.';return;}estado.voz=new SpeechSynthesisUtterance(textoActual());estado.voz.lang='es-ES';estado.voz.rate=.92;estado.voz.onboundary=e=>{if(typeof e.charIndex==='number')resaltarPorPosicion(e.charIndex)};estado.voz.onend=detenerAudio;estado.voz.onerror=detenerAudio;speechSynthesis.speak(estado.voz);$('pausar').disabled=false;$('detener').disabled=false;}
function pausar(){if(estado.pausado){speechSynthesis.resume();estado.pausado=false;$('pausar').textContent='⏸ Pausar';}else{speechSynthesis.pause();estado.pausado=true;$('pausar').textContent='▶ Continuar';}}

function tipoRecurso(nombre, carpeta=''){
  const s=(nombre+' '+carpeta).toLowerCase();
  if(s.includes('lexico')||s.includes('léxico'))return'Léxico'; if(s.includes('diccionario'))return'Diccionario'; if(s.includes('biblia')||s.includes('rvr')||s.includes('strong'))return'Biblia'; return'Libro';
}
async function listarRecursos(){
  const {data,error}=await clienteSupabase.storage.from(SUPABASE_BUCKET).list('',{limit:1000,sortBy:{column:'name',order:'asc'}});
  if(error)throw error; const lista=[];
  for(const item of (data||[])){
    if(item.name.toLowerCase().endsWith('.json')) lista.push({id:item.name,path:item.name,titulo:item.name.replace(/\.json$/i,'').replace(/[-_]+/g,' '),tipo:tipoRecurso(item.name)});
    else { const r=await clienteSupabase.storage.from(SUPABASE_BUCKET).list(item.name,{limit:1000}); if(!r.error)(r.data||[]).filter(x=>x.name.toLowerCase().endsWith('.json')).forEach(x=>lista.push({id:`${item.name}/${x.name}`,path:`${item.name}/${x.name}`,titulo:x.name.replace(/\.json$/i,'').replace(/[-_]+/g,' '),tipo:tipoRecurso(x.name,item.name)})); }
  }
  return lista;
}
async function descargarRecurso(meta){
  if(estado.recursos.has(meta.id))return estado.recursos.get(meta.id);
  const {data,error}=await clienteSupabase.storage.from(SUPABASE_BUCKET).download(meta.path);if(error)throw error;
  const libro=JSON.parse(await data.text()); const r={...meta, titulo:libro.titulo||meta.titulo,nodos:construirNodos(libro),libro,actual:0};
  if(!r.nodos.length)throw new Error(`El JSON ${meta.path} no contiene secciones legibles.`); estado.recursos.set(meta.id,r); return r;
}
async function abrirRecurso(meta){
  try{const r=await descargarRecurso(meta);if(!estado.abiertas.includes(meta.id))estado.abiertas.push(meta.id);estado.activa=meta.id;renderizarPestanas();abrirNodo(Number(localStorage.getItem(`biblioteca-ultima-${meta.id}`)||0));$('modal-recursos').hidden=true;}
  catch(e){console.error(e);$('estado').textContent=`No se pudo abrir ${meta.titulo}.`;}
}
async function mostrarRecursos(){
  $('modal-recursos').hidden=false;$('lista-recursos').replaceChildren();$('estado').textContent=''; const p=document.createElement('p');p.textContent='Cargando recursos disponibles…';$('lista-recursos').append(p);
  try{const recursos=await listarRecursos();$('lista-recursos').replaceChildren();if(!recursos.length){$('lista-recursos').textContent='No se encontraron archivos JSON en el bucket.';return;}recursos.forEach(r=>{const b=document.createElement('button');b.className='recurso-opcion';b.innerHTML=`<strong>${escapeHtml(r.titulo)}</strong><small>${escapeHtml(r.tipo)} · ${escapeHtml(r.path)}</small>`;b.onclick=()=>abrirRecurso(r);$('lista-recursos').append(b);});}
  catch(e){console.error(e);$('lista-recursos').textContent='No se pudieron listar los recursos. Revisa los permisos de Storage.';}
}

function normalizar(s){return String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function coincide(texto,consulta){return normalizar(texto).includes(normalizar(consulta));}
function resumir(texto,q){const s=String(texto||'');const n=normalizar(s).indexOf(normalizar(q));if(n<0)return s.slice(0,260);return `${s.slice(Math.max(0,n-110),n)}${s.slice(n, n+Math.max(q.length,160))}${s.length>n+Math.max(q.length,160)?'…':''}`;}
async function buscar(){
  const q=$('campo-busqueda').value.trim(); if(!q){$('estado-busqueda').textContent='Escribe una palabra, frase, término griego o Strong.';return;}
  const modo=$('modo-busqueda').value; const resultados=$('resultados-busqueda');resultados.replaceChildren();$('estado-busqueda').textContent='Buscando…';
  let recursos=[];
  try{if(modo==='abiertos')recursos=estado.abiertas.map(id=>estado.recursos.get(id)).filter(Boolean);else{const metas=await listarRecursos();for(const m of metas){try{recursos.push(await descargarRecurso(m));}catch(e){console.warn('No se pudo indexar',m.path,e);}}}
    let total=0; recursos.forEach(r=>{r.nodos.forEach((n,i)=>{const partes=[n.titulo,...(n.contenido||[]).map(b=>b.texto||'')];const texto=partes.join('\n');if(coincide(texto,q)){const card=document.createElement('button');card.className='resultado';card.innerHTML=`<strong>${escapeHtml(r.titulo)}</strong><small>${escapeHtml(r.tipo)} · Sección ${i+1}: ${escapeHtml(n.titulo)}</small><span>${escapeHtml(resumir(texto,q))}</span>`;card.onclick=()=>{estado.activa=r.id;if(!estado.abiertas.includes(r.id))estado.abiertas.push(r.id);renderizarPestanas();abrirNodo(i);$('modal-busqueda').hidden=true;};resultados.append(card);total++;}})});$('estado-busqueda').textContent=`${total} resultado${total===1?'':'s'}.`;
  }catch(e){console.error(e);$('estado-busqueda').textContent='No se pudo completar la búsqueda.';}
}

$('disminuir').onclick=()=>{estado.tamanio=Math.max(14,estado.tamanio-1);aplicarTamanio()};$('aumentar').onclick=()=>{estado.tamanio=Math.min(30,estado.tamanio+1);aplicarTamanio()};$('escuchar').onclick=escuchar;$('pausar').onclick=pausar;$('detener').onclick=detenerAudio;$('anterior').onclick=()=>{const r=estado.recursos.get(estado.activa);if(r)abrirNodo(r.actual-1)};$('siguiente').onclick=()=>{const r=estado.recursos.get(estado.activa);if(r)abrirNodo(r.actual+1)};$('abrir-indice').onclick=()=>$('panel-indice').classList.add('abierto');$('cerrar-indice').onclick=()=>$('panel-indice').classList.remove('abierto');
$('agregar-recurso').onclick=mostrarRecursos;$('cerrar-recursos').onclick=()=>{$('modal-recursos').hidden=true};$('abrir-buscador').onclick=()=>{$('modal-busqueda').hidden=false;$('campo-busqueda').focus()};$('cerrar-busqueda').onclick=()=>{$('modal-busqueda').hidden=true};$('ejecutar-busqueda').onclick=buscar;$('campo-busqueda').addEventListener('keydown',e=>{if(e.key==='Enter')buscar()});

let eventoInstalacion;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();eventoInstalacion=e;$('instalar').hidden=false});$('instalar').onclick=async()=>{await eventoInstalacion?.prompt();$('instalar').hidden=true};

async function iniciar(){
  $('estado').textContent='Comprobando sesión…';
  try{const {data,error}=await clienteSupabase.auth.getSession();if(error)throw error;if(!data.session){window.location.href='login.html';return;}instalarEstiloResaltado();aplicarTamanio();
    const metas=await listarRecursos(); const consejeria=metas.find(x=>x.path==='consejeria-biblica.json')||metas.find(x=>x.titulo.toLowerCase().includes('consejeria'));
    if(consejeria)await abrirRecurso(consejeria); else $('estado').textContent='Sesión iniciada. Usa ＋ Recurso para abrir un libro.';
  }catch(e){console.error(e);$('estado').textContent='No fue posible cargar la biblioteca desde Supabase.';}
}
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js');
iniciar();
