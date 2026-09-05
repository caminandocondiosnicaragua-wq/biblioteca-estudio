/* Imágenes ampliables de Mi Biblioteca de Estudio.
 *
 * Regla: una imagen del contenido debe poder seleccionarse y abrirse en
 * un visor grande sin abandonar la lectura ni alterar navegación/audio.
 */
(function(){
  'use strict';

  function instalar(){
    if(document.getElementById('visor-imagen-biblioteca')) return;

    const overlay=document.createElement('div');
    overlay.id='visor-imagen-biblioteca';
    overlay.className='visor-imagen-biblioteca';
    overlay.hidden=true;
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Vista ampliada de imagen');

    overlay.innerHTML=`
      <div class="visor-imagen-fondo" data-cerrar-imagen="1"></div>
      <div class="visor-imagen-panel">
        <div class="visor-imagen-barra">
          <div id="visor-imagen-titulo" class="visor-imagen-titulo">Imagen del libro</div>
          <div class="visor-imagen-acciones">
            <button type="button" id="visor-imagen-menor" class="secundario" title="Reducir">−</button>
            <button type="button" id="visor-imagen-restablecer" class="secundario" title="Tamaño normal">100%</button>
            <button type="button" id="visor-imagen-mayor" class="secundario" title="Ampliar">＋</button>
            <button type="button" id="visor-imagen-cerrar" class="secundario" title="Cerrar" aria-label="Cerrar">×</button>
          </div>
        </div>
        <div class="visor-imagen-area">
          <img id="visor-imagen-img" alt="Imagen ampliada del libro">
        </div>
      </div>`;
    document.body.append(overlay);

    let escala=1;
    const imagen=overlay.querySelector('#visor-imagen-img');
    const titulo=overlay.querySelector('#visor-imagen-titulo');

    function aplicar(){
      escala=Math.max(.5,Math.min(4,escala));
      imagen.style.transform=`scale(${escala})`;
      imagen.style.transformOrigin='center center';
      imagen.style.cursor=escala>1?'zoom-out':'zoom-in';
    }

    function cerrar(){
      overlay.hidden=true;
      imagen.removeAttribute('src');
      document.body.classList.remove('imagen-visor-abierto');
    }

    function abrir(img){
      if(!img || !img.src) return;
      escala=1;
      imagen.src=img.currentSrc || img.src;
      imagen.alt=img.alt || 'Imagen ampliada del libro';
      titulo.textContent=img.alt || 'Imagen del libro';
      overlay.hidden=false;
      document.body.classList.add('imagen-visor-abierto');
      aplicar();
    }

    document.addEventListener('click',function(e){
      const img=e.target.closest('.imagen-libro img');
      if(img){
        e.preventDefault();
        abrir(img);
        return;
      }
      if(e.target.closest('[data-cerrar-imagen="1"]') || e.target.id==='visor-imagen-cerrar') cerrar();
    });

    overlay.querySelector('#visor-imagen-menor').addEventListener('click',()=>{escala-=.25;aplicar();});
    overlay.querySelector('#visor-imagen-mayor').addEventListener('click',()=>{escala+=.25;aplicar();});
    overlay.querySelector('#visor-imagen-restablecer').addEventListener('click',()=>{escala=1;aplicar();});
    imagen.addEventListener('click',e=>{
      e.stopPropagation();
      escala = escala > 1 ? 1 : 1.5;
      aplicar();
    });

    document.addEventListener('keydown',function(e){
      if(overlay.hidden) return;
      if(e.key==='Escape') cerrar();
      if(e.key==='+') { escala+=.25; aplicar(); }
      if(e.key==='-' || e.key==='_') { escala-=.25; aplicar(); }
      if(e.key==='0') { escala=1; aplicar(); }
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',instalar,{once:true});
  else instalar();
})();
