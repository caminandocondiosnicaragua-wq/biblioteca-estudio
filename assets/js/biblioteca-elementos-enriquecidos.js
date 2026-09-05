/* Renderizador de elementos enriquecidos para la Biblioteca.
 * Amplía el lector existente para interpretar bloques "imagen" y "tabla"
 * sin alterar navegación, índice, búsqueda, audio ni pestañas.
 */
(function () {
  'use strict';

  if (typeof renderizarBloques !== 'function') return;

  const cacheImagenes = new Map();
  const promesasImagenes = new Map();

  function normalizarRuta(ruta) {
    return String(ruta || '').replace(/^\/+/, '');
  }

  function rutaBaseRecurso() {
    const recurso = estado.recursos.get(estado.activa);
    return recurso?.path ? String(recurso.path).split('/').slice(0, -1) : [];
  }

  function agregarCandidato(candidatos, valor) {
    if (!valor) return;
    if (typeof valor === 'string') {
      const v = valor.trim();
      if (v) candidatos.push(v.startsWith('data:') || /^https?:\/\//i.test(v) ? v : normalizarRuta(v));
      return;
    }
    if (typeof valor === 'object') {
      ['archivo','path','url','src','ruta','archivo_imagen','imagen','image','data_url','dataUrl','base64','imagen_base64','image_base64'].forEach(k => {
        if (valor[k]) agregarCandidato(candidatos, valor[k]);
      });
    }
  }

  function candidatosImagen(block) {
    const candidatos = [];

    ['archivo','path','url','src','ruta','archivo_imagen','imagen','image','data_url','dataUrl','base64','imagen_base64','image_base64'].forEach(k => {
      if (block?.[k]) agregarCandidato(candidatos, block[k]);
    });

    (block?.imagenes || []).forEach(v => agregarCandidato(candidatos, v));
    if (block?.recurso) agregarCandidato(candidatos, block.recurso);

    const base = rutaBaseRecurso();
    const originales = [...candidatos];

    originales.forEach(ruta => {
      if (/^(data:|https?:\/\/)/i.test(ruta)) return;
      if (ruta.startsWith('imagenes/')) {
        if (base.length) candidatos.push([...base, ruta].join('/'));
      } else if (base.length && !ruta.includes('/')) {
        candidatos.push([...base, ruta].join('/'));
      }
    });

    return [...new Set(candidatos.filter(Boolean))];
  }

  function esFuenteDirecta(ruta) {
    return /^(data:|https?:\/\/)/i.test(String(ruta || ''));
  }

  async function cargarImagen(block) {
    const candidatos = candidatosImagen(block);
    const clave = candidatos.join('|');
    if (!clave) throw new Error('El bloque de imagen no contiene archivo, ruta o fuente.');
    if (cacheImagenes.has(clave)) return cacheImagenes.get(clave);
    if (promesasImagenes.has(clave)) return promesasImagenes.get(clave);

    const promesa = (async () => {
      for (const ruta of candidatos) {
        try {
          if (esFuenteDirecta(ruta)) {
            const resultado = { url: ruta, ruta };
            cacheImagenes.set(clave, resultado);
            return resultado;
          }

          const { data, error } = await clienteSupabase.storage
            .from(SUPABASE_BUCKET)
            .download(ruta);
          if (error || !data) continue;

          const url = URL.createObjectURL(data);
          const resultado = { url, ruta, blob: data };
          cacheImagenes.set(clave, resultado);
          return resultado;
        } catch (_) {}
      }
      throw new Error(`No se encontró la imagen: ${candidatos[0]}`);
    })();

    promesasImagenes.set(clave, promesa);
    try {
      return await promesa;
    } finally {
      promesasImagenes.delete(clave);
    }
  }

  function cerrarVisorImagen() {
    const modal = document.getElementById('visor-imagen-libro');
    if (modal) modal.hidden = true;
    document.body.classList.remove('visor-imagen-abierto');
  }

  function abrirVisorImagen(src, alt) {
    let modal = document.getElementById('visor-imagen-libro');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'visor-imagen-libro';
      modal.className = 'visor-imagen-libro';
      modal.hidden = true;
      modal.innerHTML = `
        <div class="visor-imagen-fondo" data-cerrar-visor="1"></div>
        <div class="visor-imagen-caja" role="dialog" aria-modal="true" aria-label="Imagen ampliada">
          <button type="button" class="visor-imagen-cerrar" aria-label="Cerrar imagen">×</button>
          <img class="visor-imagen-ampliada" alt="">
        </div>`;

      modal.querySelector('.visor-imagen-cerrar').addEventListener('click', cerrarVisorImagen);
      modal.querySelector('[data-cerrar-visor]').addEventListener('click', cerrarVisorImagen);
      document.body.append(modal);
    }

    const img = modal.querySelector('.visor-imagen-ampliada');
    img.src = src;
    img.alt = String(alt || 'Imagen del libro');
    modal.hidden = false;
    document.body.classList.add('visor-imagen-abierto');
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarVisorImagen();
  });

  function renderizarImagen(block, destino) {
    const figure = document.createElement('figure');
    figure.className = 'imagen-libro';
    if (block.id) figure.dataset.imagenId = block.id;
    if (block.pagina_fuente != null) figure.dataset.paginaFuente = String(block.pagina_fuente);

    const img = document.createElement('img');
    img.alt = String(block.alt || block.descripcion || block.titulo || 'Imagen del libro');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.tabIndex = 0;
    img.title = 'Haga clic para ampliar';
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `${img.alt}. Haga clic para ampliar.`);

    const metadato = block.imagenes?.[0] || block;
    if (Number(metadato.ancho) > 0) img.dataset.anchoOriginal = String(metadato.ancho);
    if (Number(metadato.alto) > 0) img.dataset.altoOriginal = String(metadato.alto);

    const cargando = document.createElement('div');
    cargando.className = 'imagen-libro-cargando';
    cargando.textContent = 'Cargando imagen…';
    figure.append(cargando, img);
    destino.append(figure);

    const ampliar = () => {
      if (img.src) abrirVisorImagen(img.src, img.alt);
    };
    img.addEventListener('click', ampliar);
    img.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ampliar();
      }
    });

    cargarImagen(block).then(({ url }) => {
      img.src = url;
      cargando.remove();
    }).catch(error => {
      console.warn('Imagen del JSON:', error);
      cargando.textContent = 'No se pudo cargar esta imagen del libro.';
      cargando.className = 'imagen-libro-error';
      img.remove();
    });
  }

  function renderizarTabla(block, destino) {
    const figure = document.createElement('figure');
    figure.className = 'tabla-libro-contenedor';
    if (block.id) figure.dataset.tablaId = block.id;
    if (block.pagina_fuente != null) figure.dataset.paginaFuente = String(block.pagina_fuente);

    const table = document.createElement('table');
    table.className = 'tabla-libro';

    const filas = Array.isArray(block.contenido) ? block.contenido : [];
    const columnas = Number(block.columnas);

    filas.forEach((row, indiceFila) => {
      const tr = document.createElement('tr');
      const celdas = Array.isArray(row?.celdas) ? row.celdas : [];

      celdas.forEach((cell, indiceColumna) => {
        const td = document.createElement('td');
        td.textContent = String(cell?.texto ?? '');
        td.dataset.fila = String(cell?.fila ?? indiceFila);
        td.dataset.columna = String(cell?.columna ?? indiceColumna);
        tr.append(td);
      });

      while (columnas > 0 && tr.cells.length < columnas) {
        const td = document.createElement('td');
        td.dataset.fila = String(indiceFila);
        td.dataset.columna = String(tr.cells.length);
        tr.append(td);
      }

      table.append(tr);
    });

    figure.append(table);
    destino.append(figure);
  }

  function renderizarBloquesEnriquecidos(contenido, destino, inicioVoz) {
    let lista = null;
    let offset = inicioVoz;

    (contenido || []).forEach(block => {
      if (!block) return;

      const tipo = String(block.tipo || '').toLowerCase();
      const texto = block.texto || '';

      if (tipo === 'tabla') {
        lista = null;
        renderizarTabla(block, destino);
        return;
      }

      if (tipo === 'imagen') {
        lista = null;
        renderizarImagen(block, destino);
        return;
      }

      if (tipo === 'elemento_lista') {
        if (!lista) {
          lista = document.createElement('ul');
          lista.className = 'lista';
          destino.append(lista);
        }
        const li = document.createElement('li');
        li.append(crearFragmentos(block, offset));
        lista.append(li);
        offset += texto.length + 2;
        return;
      }

      lista = null;

      if (tipo === 'parrafo_vacio') {
        offset += texto.length + 2;
        return;
      }

      const p = document.createElement('p');
      if (tipo === 'dialogo') p.classList.add('dialogo');
      p.append(crearFragmentos(block, offset));
      destino.append(p);
      offset += texto.length + 2;
    });
  }

  renderizarBloques = renderizarBloquesEnriquecidos;
  window.renderizarBloques = renderizarBloquesEnriquecidos;

  const estilo = document.createElement('style');
  estilo.id = 'estilo-elementos-enriquecidos';
  estilo.textContent = `
    .imagen-libro {
      width: 100%;
      margin: 1.5rem 0;
      text-align: center;
      break-inside: avoid;
    }
    .imagen-libro img {
      display: block;
      width: auto;
      max-width: 100%;
      height: auto;
      max-height: 75vh;
      margin: 0 auto;
      object-fit: contain;
      border-radius: 4px;
      cursor: zoom-in;
      outline: none;
    }
    .imagen-libro img:focus-visible {
      outline: 3px solid #315c4b;
      outline-offset: 4px;
    }
    .imagen-libro-cargando {
      min-height: 3rem;
      display: grid;
      place-items: center;
      color: #718078;
      font: .82rem Arial, sans-serif;
      background: #f4f7f4;
      border: 1px dashed #d7ddd7;
      border-radius: 8px;
      padding: 1rem;
    }
    .imagen-libro-error {
      margin: 0;
      padding: .8rem;
      color: #7a4d38;
      background: #fff8f3;
      border: 1px solid #ead8ca;
      border-radius: 8px;
      font: .82rem Arial, sans-serif;
    }
    .tabla-libro-contenedor {
      width: 100%;
      margin: 1.4rem 0;
      overflow-x: auto;
      break-inside: avoid;
    }
    .tabla-libro-contenedor .tabla-libro {
      min-width: 100%;
      margin: 0;
    }
    .tabla-libro-contenedor .tabla-libro td {
      white-space: pre-wrap;
    }
    .visor-imagen-libro {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: grid;
      place-items: center;
      padding: 1.5rem;
    }
    .visor-imagen-libro[hidden] { display: none; }
    .visor-imagen-fondo {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,.82);
      cursor: zoom-out;
    }
    .visor-imagen-caja {
      position: relative;
      z-index: 1;
      width: min(96vw, 1400px);
      height: min(94vh, 1000px);
      display: grid;
      place-items: center;
      pointer-events: none;
    }
    .visor-imagen-ampliada {
      pointer-events: auto;
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      box-shadow: 0 12px 45px rgba(0,0,0,.45);
      background: white;
    }
    .visor-imagen-cerrar {
      position: absolute;
      z-index: 2;
      top: .25rem;
      right: .25rem;
      width: 2.5rem;
      height: 2.5rem;
      border: 0;
      border-radius: 50%;
      background: rgba(255,255,255,.94);
      color: #1d332a;
      font-size: 1.8rem;
      line-height: 1;
      cursor: pointer;
      pointer-events: auto;
    }
    @media (max-width: 760px) {
      .imagen-libro img { max-height: none; }
      .tabla-libro-contenedor {
        margin-left: -.25rem;
        width: calc(100% + .5rem);
      }
      .visor-imagen-libro { padding: .5rem; }
      .visor-imagen-caja { width: 100vw; height: 100vh; }
    }
  `;
  document.head.append(style);
})();
