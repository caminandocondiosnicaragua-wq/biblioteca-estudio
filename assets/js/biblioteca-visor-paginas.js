/* Visor aislado para ampliar imágenes/páginas sin modificar el tamaño del texto
 * ni la estructura de la Biblioteca. Se activa únicamente al hacer clic sobre
 * una imagen dentro del lector.
 */
(function () {
  'use strict';

  let modal = null;
  let imagen = null;
  let escala = 1;
  let offsetX = 0;
  let offsetY = 0;
  let arrastrando = false;
  let inicioX = 0;
  let inicioY = 0;
  let inicioOffsetX = 0;
  let inicioOffsetY = 0;
  let punteroActivo = null;
  let ultimaDistancia = null;

  function crearModal() {
    if (modal) return;

    modal = document.createElement('div');
    modal.id = 'visor-pagina-ampliada';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Vista ampliada de la página');

    modal.innerHTML = `
      <div class="visor-pagina-fondo" data-visor-cerrar></div>
      <div class="visor-pagina-barra" role="toolbar" aria-label="Controles de ampliación">
        <button type="button" data-visor-zoom-out aria-label="Alejar">−</button>
        <span data-visor-nivel>100%</span>
        <button type="button" data-visor-zoom-in aria-label="Ampliar">＋</button>
        <button type="button" data-visor-ajustar aria-label="Ajustar a la ventana">Ajustar</button>
        <button type="button" data-visor-original aria-label="Tamaño original">100%</button>
        <button type="button" data-visor-cerrar aria-label="Cerrar visor">×</button>
      </div>
      <div class="visor-pagina-area">
        <img class="visor-pagina-imagen" alt="">
      </div>
    `;

    document.body.append(modal);
    imagen = modal.querySelector('.visor-pagina-imagen');

    modal.querySelector('[data-visor-zoom-out]').addEventListener('click', () => cambiarEscala(escala / 1.25));
    modal.querySelector('[data-visor-zoom-in]').addEventListener('click', () => cambiarEscala(escala * 1.25));
    modal.querySelector('[data-visor-ajustar]').addEventListener('click', ajustarVentana);
    modal.querySelector('[data-visor-original]').addEventListener('click', () => cambiarEscala(1));
    modal.querySelectorAll('[data-visor-cerrar]').forEach(e => e.addEventListener('click', cerrar));

    modal.addEventListener('wheel', e => {
      if (!modal.hidden) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        cambiarEscala(escala * factor);
      }
    }, { passive: false });

    imagen.addEventListener('pointerdown', iniciarArrastre);
    window.addEventListener('pointermove', moverArrastre);
    window.addEventListener('pointerup', terminarArrastre);

    imagen.addEventListener('pointerdown', registrarPuntero, { passive: false });
    imagen.addEventListener('pointermove', moverPinza, { passive: false });
    imagen.addEventListener('pointerup', liberarPuntero, { passive: false });
    imagen.addEventListener('pointercancel', liberarPuntero, { passive: false });
  }

  function limitarEscala(v) {
    return Math.min(6, Math.max(0.35, v));
  }

  function cambiarEscala(v) {
    escala = limitarEscala(v);
    aplicarTransformacion();
    actualizarNivel();
  }

  function actualizarNivel() {
    if (!modal) return;
    const nivel = modal.querySelector('[data-visor-nivel]');
    nivel.textContent = `${Math.round(escala * 100)}%`;
  }

  function aplicarTransformacion() {
    if (!imagen) return;
    imagen.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${escala})`;
  }

  function restablecerPosicion() {
    offsetX = 0;
    offsetY = 0;
    aplicarTransformacion();
  }

  function abrir(origen) {
    crearModal();
    imagen.src = origen.currentSrc || origen.src;
    imagen.alt = origen.alt || 'Página del libro';
    escala = 1;
    offsetX = 0;
    offsetY = 0;
    modal.hidden = false;
    document.body.classList.add('visor-pagina-abierto');
    actualizarNivel();
    imagen.onload = () => {
      ajustarVentana();
    };
    if (imagen.complete) ajustarVentana();
    requestAnimationFrame(() => modal.classList.add('visible'));
  }

  function cerrar() {
    if (!modal) return;
    modal.classList.remove('visible');
    setTimeout(() => {
      modal.hidden = true;
      document.body.classList.remove('visor-pagina-abierto');
    }, 120);
  }

  function ajustarVentana() {
    if (!imagen || !imagen.naturalWidth || !imagen.naturalHeight) return;
    const area = modal.querySelector('.visor-pagina-area');
    const margen = 42;
    const ancho = Math.max(1, area.clientWidth - margen * 2);
    const alto = Math.max(1, area.clientHeight - margen * 2);
    const factor = Math.min(ancho / imagen.naturalWidth, alto / imagen.naturalHeight);
    escala = limitarEscala(factor);
    restablecerPosicion();
    actualizarNivel();
  }

  function iniciarArrastre(e) {
    if (e.pointerType === 'touch') return;
    if (e.button !== 0) return;
    arrastrando = true;
    imagen.setPointerCapture?.(e.pointerId);
    inicioX = e.clientX;
    inicioY = e.clientY;
    inicioOffsetX = offsetX;
    inicioOffsetY = offsetY;
    imagen.classList.add('arrastrando');
  }

  function moverArrastre(e) {
    if (!arrastrando) return;
    offsetX = inicioOffsetX + e.clientX - inicioX;
    offsetY = inicioOffsetY + e.clientY - inicioY;
    aplicarTransformacion();
  }

  function terminarArrastre() {
    if (!arrastrando) return;
    arrastrando = false;
    imagen.classList.remove('arrastrando');
  }

  function distancia(a, b) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  const punteros = new Map();
  function registrarPuntero(e) {
    if (e.pointerType !== 'touch') return;
    punteros.set(e.pointerId, e);
    if (punteros.size === 2) {
      const valores = [...punteros.values()];
      ultimaDistancia = distancia(valores[0], valores[1]);
      arrastrando = false;
    }
  }

  function moverPinza(e) {
    if (e.pointerType !== 'touch' || !punteros.has(e.pointerId)) return;
    punteros.set(e.pointerId, e);
    if (punteros.size !== 2) return;
    e.preventDefault();
    const valores = [...punteros.values()];
    const actual = distancia(valores[0], valores[1]);
    if (!ultimaDistancia) {
      ultimaDistancia = actual;
      return;
    }
    cambiarEscala(escala * (actual / ultimaDistancia));
    ultimaDistancia = actual;
  }

  function liberarPuntero(e) {
    if (e.pointerType !== 'touch') return;
    punteros.delete(e.pointerId);
    if (punteros.size < 2) ultimaDistancia = null;
  }

  document.addEventListener('click', e => {
    const img = e.target.closest('#contenido img');
    if (!img) return;
    if (img.closest('#visor-pagina-ampliada')) return;
    if (!img.src && !img.currentSrc) return;
    e.preventDefault();
    abrir(img);
  });

  document.addEventListener('keydown', e => {
    if (!modal || modal.hidden) return;
    if (e.key === 'Escape') {
      cerrar();
      return;
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      cambiarEscala(escala * 1.2);
    } else if (e.key === '-') {
      e.preventDefault();
      cambiarEscala(escala / 1.2);
    } else if (e.key === '0') {
      e.preventDefault();
      ajustarVentana();
    }
  });

  const estilo = document.createElement('style');
  estilo.id = 'estilo-visor-pagina-ampliada';
  estilo.textContent = `
    #contenido img { cursor: zoom-in; }
    #visor-pagina-ampliada {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: grid;
      grid-template-rows: 1fr;
      opacity: 0;
      transition: opacity .12s ease;
    }
    #visor-pagina-ampliada.visible { opacity: 1; }
    #visor-pagina-ampliada[hidden] { display: none; }
    .visor-pagina-fondo {
      position: absolute;
      inset: 0;
      background: rgba(16, 24, 20, .82);
    }
    .visor-pagina-area {
      position: relative;
      z-index: 1;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      display: grid;
      place-items: center;
      touch-action: none;
    }
    .visor-pagina-imagen {
      max-width: none;
      max-height: none;
      width: auto;
      height: auto;
      user-select: none;
      -webkit-user-drag: none;
      cursor: grab;
      transform-origin: center center;
      will-change: transform;
      box-shadow: 0 10px 40px rgba(0,0,0,.35);
    }
    .visor-pagina-imagen.arrastrando { cursor: grabbing; }
    .visor-pagina-barra {
      position: absolute;
      z-index: 2;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px;
      border-radius: 10px;
      background: rgba(255,255,255,.96);
      box-shadow: 0 5px 20px rgba(0,0,0,.22);
      font: 13px Arial, sans-serif;
    }
    .visor-pagina-barra button {
      border: 0;
      border-radius: 7px;
      min-width: 34px;
      min-height: 32px;
      padding: 0 9px;
      background: #315c4b;
      color: white;
      cursor: pointer;
    }
    .visor-pagina-barra button:hover { filter: brightness(.94); }
    .visor-pagina-barra span {
      min-width: 48px;
      text-align: center;
      font-weight: 700;
      color: #315c4b;
    }
    body.visor-pagina-abierto { overflow: hidden; }
    @media (max-width: 600px) {
      .visor-pagina-barra { top: 10px; gap: 4px; padding: 5px; }
      .visor-pagina-barra button { min-width: 31px; min-height: 30px; padding: 0 7px; }
      .visor-pagina-barra button:nth-of-type(4) { display: none; }
    }
  `;
  document.head.append(estilo);
})();
