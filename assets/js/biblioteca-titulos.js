/*
 * Soporte T1/T2/T3 para la Biblioteca de Estudio.
 * No reemplaza el motor existente: amplía la construcción de nodos,
 * el índice y la presentación de los encabezados.
 */
(function(){
  const originalConstruirNodos = window.construirNodos;
  const originalRenderizarIndice = window.renderizarIndice;
  const originalAbrirNodo = window.abrirNodo;
  if(typeof originalConstruirNodos !== 'function' || typeof originalRenderizarIndice !== 'function' || typeof originalAbrirNodo !== 'function'){
    console.warn('Soporte T1/T2/T3: funciones base no disponibles.');
    return;
  }

  const nivelesPorTitulo = new Map();
  const nodosPorTitulo = new Map();

  const limpio = v => String(v ?? '').replace(/\s+/g,' ').trim();
  const tipoHeading = v => {
    const s=String(v||'').toLowerCase().trim();
    if(/^(heading_1|titulo_1|t1|h1|titulo)$/.test(s)) return 1;
    if(/^(heading_2|titulo_2|t2|h2)$/.test(s)) return 2;
    if(/^(heading_3|titulo_3|t3|h3)$/.test(s)) return 3;
    return 0;
  };

  function guardar(titulo,nodos){
    const key=limpio(titulo).toLocaleLowerCase('es');
    nivelesPorTitulo.set(key,nodos.map(n=>n.nivel||1));
    nodosPorTitulo.set(key,nodos);
  }

  function construirDesdeContenido(libro){
    const nodos=[];
    const bloques=Array.isArray(libro.contenido)?libro.contenido:[];
    let actual=null;
    let tieneTitulos=false;

    bloques.forEach(block=>{
      const nivel=tipoHeading(block?.tipo);
      if(nivel){
        tieneTitulos=true;
        if(actual) nodos.push(actual);
        actual={
          titulo:limpio(block.texto)||'Sección',
          contenido:[],
          subsecciones:[],
          tipo:nivel===1?'principal':(nivel===2?'subseccion':'subsubseccion'),
          nivel
        };
        return;
      }
      if(!actual){
        actual={titulo:'Contenido',contenido:[],subsecciones:[],tipo:'principal',nivel:1};
      }
      actual.contenido.push(block);
    });
    if(actual) nodos.push(actual);
    if(!tieneTitulos) return null;
    return nodos;
  }

  function construirDesdeSecciones(libro){
    const nodos=[];
    const agregarSeccion=(sec,nivel=1)=>{
      const titulo=limpio(`${sec.numero_romano ? sec.numero_romano+'. ' : ''}${sec.titulo||''}`)||'Sección';
      nodos.push({titulo,contenido:sec.contenido||[],subsecciones:[],tipo:nivel===1?'principal':(nivel===2?'subseccion':'subsubseccion'),nivel});
      (sec.subsecciones||[]).forEach(sub=>agregarSeccion(sub,nivel+1));
    };
    (libro.secciones_preliminares||[]).forEach(sec=>agregarSeccion(sec,1));
    (libro.secciones||[]).forEach(sec=>agregarSeccion(sec,1));
    return nodos;
  }

  window.construirNodos=function(libro){
    let nodos=null;
    if(Array.isArray(libro?.contenido) && libro.contenido.length){
      nodos=construirDesdeContenido(libro);
    }
    if(!nodos?.length){
      nodos=construirDesdeSecciones(libro);
    }
    if(!nodos?.length){
      nodos=originalConstruirNodos(libro);
      nodos=(nodos||[]).map(n=>({...n,nivel:n.nivel||((n.tipo==='subseccion')?2:1)}));
    }
    guardar(libro?.titulo||'',nodos);
    return nodos;
  };

  function claveTituloActivo(){
    const h=document.querySelector('#titulo-libro');
    return limpio(h?.textContent).toLocaleLowerCase('es');
  }

  function decorarIndice(){
    const lista=document.getElementById('lista-indice');
    if(!lista) return;
    const niveles=nivelesPorTitulo.get(claveTituloActivo());
    const botones=[...lista.querySelectorAll('button.indice-item')];
    botones.forEach((b,i)=>{
      const nivel=Math.max(1,Math.min(3,Number(niveles?.[i]||1)));
      b.classList.remove('indice-t1','indice-t2','indice-t3');
      b.classList.add(`indice-t${nivel}`);
      b.dataset.nivel=String(nivel);
      b.style.setProperty('--nivel-indice',String(nivel));
    });
  }

  window.renderizarIndice=function(){
    originalRenderizarIndice();
    decorarIndice();
  };

  window.abrirNodo=function(indice){
    originalAbrirNodo(indice);
    const lista=document.getElementById('lista-indice');
    const activo=lista?.querySelector('button.indice-item.activo');
    const nivel=Math.max(1,Math.min(3,Number(activo?.dataset?.nivel||1)));
    const viejo=document.querySelector('#contenido > h2');
    if(!viejo) return;
    const nuevo=document.createElement(nivel===1?'h2':(nivel===2?'h3':'h4'));
    nuevo.className=viejo.className;
    nuevo.innerHTML=viejo.innerHTML;
    viejo.replaceWith(nuevo);
  };

  const estilo=document.createElement('style');
  estilo.id='estilo-indice-t1-t2-t3';
  estilo.textContent=`
    #lista-indice .indice-item{transition:padding-left .15s ease,font-size .15s ease,opacity .15s ease;}
    #lista-indice .indice-t1{padding-left:8px;font-weight:700;font-size:1rem;}
    #lista-indice .indice-t2{padding-left:24px;font-weight:600;font-size:.95rem;}
    #lista-indice .indice-t3{padding-left:42px;font-weight:500;font-size:.9rem;}
    #lista-indice .indice-t3::before{content:'↳ ';opacity:.55;}
    #contenido > h3{margin-top:1.5rem;}
    #contenido > h4{margin-top:1.25rem;}
  `;
  document.head.append(estilo);

  // Si otro módulo vuelve a pintar el índice mediante un MutationObserver,
  // aplicamos nuevamente la jerarquía sin tocar su funcionamiento.
  const lista=document.getElementById('lista-indice');
  if(lista){
    new MutationObserver(()=>decorarIndice()).observe(lista,{childList:true,subtree:true});
  }
})();
