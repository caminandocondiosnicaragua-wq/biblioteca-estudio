(function(){
  'use strict';
  function esDiccionario(r,meta){
    const s=String((r&&r.tipo)||'')+' '+String((r&&r.libro&&r.libro.tipo_recurso)||'')+' '+String((meta&&meta.tipo)||'')+' '+String((meta&&meta.path)||'');
    return /diccionario/i.test(s) || /diccionario/i.test(JSON.stringify(r&&r.libro||{}).slice(0,500));
  }
  function esTitulo(block){
    if(!block||block.tipo!=='parrafo')return false;
    return (block.formato_fragmentos||[]).some(f=>f.negrita) && String(block.texto||'').trim();
  }
  function preparar(r,meta){
    if(!r||r._diccionarioIndice||!esDiccionario(r,meta))return r;
    const salida=[];
    (r.nodos||[]).forEach(letra=>{
      const entradas=[];let actual=null;
      (letra.contenido||[]).forEach(b=>{
        if(esTitulo(b)){if(actual)entradas.push(actual);actual={titulo:String(b.texto).trim(),contenido:[b]};}
        else if(actual)actual.contenido.push(b);
      });
      if(actual)entradas.push(actual);
      if(!entradas.length){salida.push(letra);return;}
      salida.push({...letra,contenido:entradas.map(e=>({tipo:'parrafo',texto:e.titulo,formato_fragmentos:[{texto:e.titulo,negrita:true}]})),subsecciones:entradas.map(e=>({...e,subsecciones:[],tipo:'diccionario-entrada'})),tipo:'diccionario-letra'});
      entradas.forEach(e=>salida.push({...e,subsecciones:[],tipo:'diccionario-entrada',padre:letra.titulo}));
    });
    r.nodos=salida;r._diccionarioIndice=true;return r;
  }
  function instalar(){
    if(typeof window.descargarRecurso!=='function'){setTimeout(instalar,50);return;}
    if(window.__diccionarioIndiceInstalado)return;window.__diccionarioIndiceInstalado=true;
    const original=window.descargarRecurso;
    window.descargarRecurso=async function(meta){const r=await original(meta);return preparar(r,meta);};
  }
  instalar();
})();
