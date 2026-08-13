/*
 * Adaptador de formatos JSON para Mi Biblioteca de Estudio.
 *
 * NO reemplaza los formatos existentes. Detecta formatos adicionales
 * y los convierte a la estructura interna que ya utiliza biblioteca.js.
 *
 * Compatible especialmente con Biblias que usan:
 *   books -> chapters -> items -> verse_numbers / lines
 * y con el formato normalizado:
 *   books -> chapters -> items -> number / text
 */
(function () {
  const originalConstruirNodos = window.construirNodos;
  const originalRenderizarIndice = window.renderizarIndice;

  function esBibliaJSON(libro) {
    return !!(
      libro &&
      Array.isArray(libro.books) &&
      libro.books.length &&
      libro.books.some(b => Array.isArray(b.chapters))
    );
  }

  function textoLineas(valor) {
    if (valor == null) return '';
    if (typeof valor === 'string') return valor;
    if (Array.isArray(valor)) {
      return valor.map(item => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return '';
        return item.text ?? item.texto ?? item.line ?? item.value ?? '';
      }).filter(Boolean).join('\n');
    }
    if (typeof valor === 'object') {
      return valor.text ?? valor.texto ?? valor.line ?? valor.value ?? '';
    }
    return String(valor);
  }

  function numeroVersiculo(item, indice) {
    if (Array.isArray(item?.verse_numbers) && item.verse_numbers.length) {
      const n = item.verse_numbers[0];
      if (typeof n === 'object') return n.number ?? n.text ?? indice + 1;
      return n;
    }
    if (item?.number != null) return item.number;

    const id = String(item?.id || '');
    const partes = id.split('.');
    if (partes.length >= 3 && /^\d+$/.test(partes.at(-1))) return partes.at(-1);
    return indice + 1;
  }

  function nombreLibro(book) {
    return String(
      book?.name ||
      book?.title ||
      book?.nombre ||
      book?.local_title ||
      book?.id ||
      'Libro'
    ).trim();
  }

  function crearContenidoCapitulo(book, chapter) {
    const nombre = nombreLibro(book);
    const numeroCapitulo = chapter?.number ?? chapter?.chapter ?? '';
    const referenciaCapitulo = `${nombre} ${numeroCapitulo}`.trim();
    const items = chapter?.items || chapter?.content || chapter?.contenido || chapter?.verses || [];
    const contenido = [];

    items.forEach((item, indice) => {
      if (!item) return;

      const tipo = String(item.type || item.tipo || '').toLowerCase();

      if (tipo.includes('heading') || tipo === 'titulo' || tipo === 'encabezado') {
        const titulo = textoLineas(item.text ?? item.texto ?? item.title ?? item.name);
        if (titulo) contenido.push({ tipo: 'parrafo', texto: titulo, formato_fragmentos: [{ texto: titulo, negrita: true }] });
        return;
      }

      const texto = textoLineas(
        item.text ??
        item.texto ??
        item.lines ??
        item.lineas ??
        item.content ??
        item.contenido
      );

      if (!texto.trim()) return;

      const numero = numeroVersiculo(item, indice);
      const referencia = `${referenciaCapitulo}:${numero}`;
      contenido.push({
        tipo: 'parrafo',
        texto: `[${referencia}] ${texto}`,
        referencia,
        versiculo: Number(numero) || numero,
        formato_fragmentos: [
          { texto: `[${referencia}] `, negrita: true },
          { texto }
        ]
      });
    });

    return contenido;
  }

  function adaptarBiblia(libro) {
    const nodos = [];

    (libro.books || []).forEach(book => {
      const nombre = nombreLibro(book);
      (book.chapters || []).forEach(chapter => {
        const numero = chapter?.number ?? chapter?.chapter ?? '';
        const titulo = chapter?.name || `${nombre} ${numero}`.trim();
        const contenido = crearContenidoCapitulo(book, chapter);
        if (!contenido.length) return;

        nodos.push({
          titulo,
          contenido,
          subsecciones: [],
          tipo: 'biblia-capitulo',
          biblia: true,
          libroId: book.id || nombre,
          libroNombre: nombre,
          capitulo: Number(numero) || numero,
          referencia: `${nombre} ${numero}`.trim()
        });
      });
    });

    return {
      ...libro,
      titulo: libro.titulo || libro.local_title || libro.local_abbreviation || 'Biblia',
      formatoAdaptado: 'biblia',
      nodosAdaptados: nodos
    };
  }

  function adaptarJSON(libro) {
    if (!libro || typeof libro !== 'object') return libro;
    if (esBibliaJSON(libro)) return adaptarBiblia(libro);
    return libro;
  }

  window.adaptarJSONBiblioteca = adaptarJSON;

  // biblioteca.js ya tiene su lector funcionando. Aquí solo ampliamos
  // construirNodos para que los formatos nuevos pasen por el mismo lector.
  window.construirNodos = function (libro) {
    const adaptado = adaptarJSON(libro);
    if (adaptado?.nodosAdaptados?.length) return adaptado.nodosAdaptados;
    return originalConstruirNodos(adaptado);
  };

  // Para Biblias, mostramos un índice agrupado por libro sin alterar
  // el índice actual de los libros y documentos existentes.
  window.renderizarIndice = function () {
    const recurso = window.estado?.recursos?.get(window.estado?.activa);
    const lista = document.getElementById('lista-indice');

    if (!recurso?.nodos?.some(n => n.biblia) || !lista) {
      return originalRenderizarIndice();
    }

    lista.replaceChildren();
    let libroActual = null;
    let contenedor = null;

    recurso.nodos.forEach((nodo, i) => {
      if (nodo.libroId !== libroActual) {
        libroActual = nodo.libroId;
        const grupo = document.createElement('div');
        grupo.className = 'indice-biblia-grupo';

        const encabezado = document.createElement('button');
        encabezado.type = 'button';
        encabezado.className = 'indice-biblia-libro';
        encabezado.textContent = nodo.libroNombre;
        encabezado.onclick = () => {
          grupo.classList.toggle('cerrado');
        };
        grupo.append(encabezado);

        contenedor = document.createElement('div');
        contenedor.className = 'indice-biblia-capitulos';
        grupo.append(contenedor);
        lista.append(grupo);
      }

      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = `indice-item ${i === recurso.actual ? 'activo' : ''}`;
      boton.textContent = `Capítulo ${nodo.capitulo}`;
      boton.onclick = () => window.abrirNodo(i);
      contenedor.append(boton);
    });
  };

  // Cuando el script se carga después de biblioteca.js, las funciones
  // globales ya existentes se conservan; solo se amplían para los JSON nuevos.
  if (document.readyState !== 'loading') {
    const estilo = document.createElement('style');
    estilo.textContent = `
      .indice-biblia-grupo { margin-bottom: 6px; }
      .indice-biblia-libro { width:100%; text-align:left; border:0; background:transparent; padding:8px 10px; font-weight:700; cursor:pointer; }
      .indice-biblia-capitulos { padding-left:8px; }
      .indice-biblia-grupo.cerrado .indice-biblia-capitulos { display:none; }
    `;
    document.head.append(estilo);
  }
})();
