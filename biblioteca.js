const estado = {
  libro: null,
  nodos: [],
  actual: 0,
  tamanio: Number(localStorage.getItem('biblioteca-tamanio') || 19),
  voz: null,
  pausado: false,
  mapaVoz: [],
  palabraActiva: null
};
const $ = (id) => document.getElementById(id);

function textoPlano(valor) {
  if (!valor) return '';
  if (typeof valor === 'string') return valor;
  return (valor.contenido || []).map(b => b.texto || '').join('\n');
}

function construirNodos(libro) {
  const salida = [];
  (libro.secciones_preliminares || []).forEach(sec => {
    salida.push({ titulo: sec.titulo, contenido: sec.contenido || [], subsecciones: sec.subsecciones || [], tipo: 'preliminar' });
  });
  (libro.secciones || []).forEach(sec => {
    salida.push({ titulo: `${sec.numero_romano}. ${sec.titulo.trim()}`, contenido: sec.contenido || [], subsecciones: sec.subsecciones || [], tipo: 'principal' });
    (sec.subsecciones || []).forEach(sub => salida.push({ titulo: sub.titulo, contenido: sub.contenido || [], subsecciones: [], tipo: 'subseccion', padre: sec.numero_romano }));
  });
  return salida;
}

/* Resaltado sincronizado con SpeechSynthesis.
   Cada palabra conserva su posición dentro del texto que se está leyendo. */
function crearPalabrasMarcadas(texto, inicio) {
  const fragment = document.createDocumentFragment();
  const partes = String(texto || '').split(/(\s+)/);
  let offset = inicio;

  partes.forEach(parte => {
    if (!parte) return;

    if (/^\s+$/.test(parte)) {
      fragment.append(document.createTextNode(parte));
    } else {
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
  const partes = block.formato_fragmentos?.length ? block.formato_fragmentos : [{ texto: block.texto }];
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

function renderizarBloques(contenido, destino, inicioVoz) {
  let lista = null;
  let offset = inicioVoz;

  contenido.forEach(block => {
    const texto = block.texto || '';

    if (block.tipo === 'elemento_lista') {
      if (!lista) { lista=document.createElement('ul'); lista.className='lista'; destino.append(lista); }
      const li=document.createElement('li');
      li.append(crearFragmentos(block, offset));
      if (block.contiene_relleno) li.classList.add('relleno');
      lista.append(li);
      offset += texto.length + 2;
      return;
    }

    lista = null;
    if (block.tipo === 'parrafo_vacio') {
      offset += texto.length + 2;
      return;
    }

    const p=document.createElement('p');
    if (block.tipo === 'dialogo') p.classList.add('dialogo');
    if (block.contiene_relleno) p.classList.add('relleno');
    p.append(crearFragmentos(block, offset));
    destino.append(p);
    offset += texto.length + 2;
  });
}

function limpiarResaltado() {
  if (estado.palabraActiva) {
    estado.palabraActiva.classList.remove('palabra-voz-activa');
    estado.palabraActiva = null;
  }
}

function resaltarPorPosicion(posicion) {
  if (!Number.isFinite(posicion)) return;

  let encontrado = estado.mapaVoz.find(item => posicion >= item.inicio && posicion < item.fin);

  // Algunos navegadores notifican el límite de una palabra.
  if (!encontrado) {
    encontrado = estado.mapaVoz.find(item => item.inicio > posicion);
  }

  if (!encontrado || encontrado.elemento === estado.palabraActiva) return;

  limpiarResaltado();
  estado.palabraActiva = encontrado.elemento;
  encontrado.elemento.classList.add('palabra-voz-activa');

  const rect = encontrado.elemento.getBoundingClientRect();
  const fueraDeVista = rect.top < 90 || rect.bottom > window.innerHeight - 70;
  if (fueraDeVista) {
    encontrado.elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function instalarEstiloResaltado() {
  if (document.getElementById('estilo-voz-sincronizada')) return;

  const estilo = document.createElement('style');
  estilo.id = 'estilo-voz-sincronizada';
  estilo.textContent = `
    .palabra-voz-activa {
      background: #f4d35e;
      color: #183b32;
      border-radius: 4px;
      padding: 0 2px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      transition: background-color .08s ease;
    }
  `;
  document.head.appendChild(estilo);
}

function renderizarIndice() {
  const lista=$('lista-indice'); lista.replaceChildren();
  estado.nodos.forEach((nodo, i) => {
    const boton=document.createElement('button'); boton.className=`indice-item ${nodo.tipo === 'subseccion' ? 'sub' : ''} ${i===estado.actual ? 'activo' : ''}`;
    boton.textContent=nodo.titulo; boton.onclick=()=>abrirNodo(i); lista.append(boton);
  });
}

function abrirNodo(indice) {
  detenerAudio();
  estado.actual=Math.max(0, Math.min(indice, estado.nodos.length - 1));
  estado.mapaVoz = [];

  const nodo=estado.nodos[estado.actual], area=$('contenido');
  area.replaceChildren();

  const h2=document.createElement('h2');
  h2.append(crearPalabrasMarcadas(nodo.titulo, 0));
  area.append(h2);

  // textoActual() une título + bloques con ". ", por eso el primer bloque comienza aquí.
  const inicioContenido = nodo.titulo.length + 2;
  renderizarBloques(nodo.contenido, area, inicioContenido);

  if (nodo.subsecciones.length) {
    const h3=document.createElement('h3'); h3.textContent='Temas incluidos'; area.append(h3);
    const ul=document.createElement('ul'); ul.className='lista';
    nodo.subsecciones.forEach(s => { const li=document.createElement('li'); li.textContent=s.titulo; ul.append(li); });
    area.append(ul);
  }

  $('estado').textContent=`Sección ${estado.actual + 1} de ${estado.nodos.length} · Se guarda automáticamente en este dispositivo.`;
  $('anterior').disabled=estado.actual===0;
  $('siguiente').disabled=estado.actual===estado.nodos.length-1;
  localStorage.setItem('biblioteca-ultima-seccion', String(estado.actual));
  renderizarIndice();
  window.scrollTo({top:0, behavior:'smooth'});
  $('panel-indice').classList.remove('abierto');
}

function aplicarTamanio() {
  document.documentElement.style.setProperty('--tamano', `${estado.tamanio}px`);
  localStorage.setItem('biblioteca-tamanio', estado.tamanio);
}

function textoActual() {
  const n=estado.nodos[estado.actual];
  return [n.titulo, ...n.contenido.map(b=>b.texto || '')].join('. ');
}

function detenerAudio() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  estado.voz=null;
  estado.pausado=false;
  limpiarResaltado();
  $('pausar').disabled=true;
  $('detener').disabled=true;
  $('pausar').textContent='⏸ Pausar';
}

function escuchar() {
  detenerAudio();

  if (!('speechSynthesis' in window)) {
    $('estado').textContent='Este navegador no ofrece lectura en voz alta.';
    return;
  }

  estado.voz=new SpeechSynthesisUtterance(textoActual());
  estado.voz.lang='es-ES';
  estado.voz.rate=.92;

  // Chrome/Edge suelen proporcionar charIndex en onboundary.
  // Si el navegador no lo soporta, el audio seguirá funcionando sin resaltado.
  estado.voz.onboundary = (event) => {
    if (typeof event.charIndex === 'number') {
      resaltarPorPosicion(event.charIndex);
    }
  };

  estado.voz.onend=detenerAudio;
  estado.voz.onerror=detenerAudio;

  speechSynthesis.speak(estado.voz);
  $('pausar').disabled=false;
  $('detener').disabled=false;
}

function pausar() {
  if (estado.pausado) {
    speechSynthesis.resume();
    estado.pausado=false;
    $('pausar').textContent='⏸ Pausar';
  } else {
    speechSynthesis.pause();
    estado.pausado=true;
    $('pausar').textContent='▶ Continuar';
  }
}

async function cargarLibro(origen) {
  try {
    estado.libro = typeof origen === 'string'
      ? await (await fetch(origen)).json()
      : (typeof origen.text === 'function' ? JSON.parse(await origen.text()) : origen);

    estado.nodos=construirNodos(estado.libro);
    $('titulo-libro').textContent=estado.libro.titulo || 'Mi Biblioteca';
    instalarEstiloResaltado();
    aplicarTamanio();

    const ultimo=Number(localStorage.getItem('biblioteca-ultima-seccion') || 0);
    abrirNodo(Math.min(ultimo, estado.nodos.length-1));
  }
  catch (error) {
    $('estado').textContent='No fue posible abrir el libro. Intenta seleccionar el archivo JSON.';
    console.error(error);
  }
}

$('disminuir').onclick=()=>{ estado.tamanio=Math.max(14, estado.tamanio-1); aplicarTamanio(); };
$('aumentar').onclick=()=>{ estado.tamanio=Math.min(30, estado.tamanio+1); aplicarTamanio(); };
$('escuchar').onclick=escuchar; $('pausar').onclick=pausar; $('detener').onclick=detenerAudio;
$('anterior').onclick=()=>abrirNodo(estado.actual-1); $('siguiente').onclick=()=>abrirNodo(estado.actual+1);
$('abrir-indice').onclick=()=>$('panel-indice').classList.add('abierto');
$('cerrar-indice').onclick=()=>$('panel-indice').classList.remove('abierto');
$('archivo-json').onchange=(event)=>{ const file=event.target.files[0]; if (file) cargarLibro(file); };

let eventoInstalacion;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  eventoInstalacion=e;
  $('instalar').hidden=false;
});
$('instalar').onclick=async()=>{ await eventoInstalacion?.prompt(); $('instalar').hidden=true; };

if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');
cargarLibro('consejeria_pastoral_biblioteca.json');
