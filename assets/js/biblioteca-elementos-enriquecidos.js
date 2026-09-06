/* RENDERIZADOR DE ELEMENTOS ENRIQUECIDOS
 * Muestra las imágenes y tablas que vienen asociadas al JSON de cada libro.
 * Busca primero la ruta indicada por el JSON y, si no coincide exactamente,
 * prueba ubicaciones habituales y finalmente busca el archivo por nombre
 * dentro de la carpeta del recurso en Supabase Storage.
 */
(function(){
  'use strict';
  if(typeof renderizarBloques!=='function')return;

  const cacheImagenes=new Map();
  const promesasImagenes=new Map();

  const normalizarRuta=r=>String(r||'').replace(/^\/+/, '').replace(/\\/g,'/');
  const baseRecurso=()=>{
    const r=estado.recursos.get(estado.activa);
    return r?.path?String(r.path).split('/').slice(0,-1):[];
  };
  const esDirecta=r=>/^(data:|https?:\/\/)/i.test(String(r||''));

  function agregar(candidatos,v){
    if(v==null||v==='')return;
    if(typeof v==='string'){
      const x=v.trim();
      if(x)candidatos.push(esDirecta(x)?x:normalizarRuta(x));
      return;
    }
    if(typeof v==='object'){
      ['archivo','path','url','src','ruta','archivo_imagen','imagen','image','data_url','dataUrl','base64','imagen_base64','image_base64','file','filename','file_name','nombre_archivo','nombre'].forEach(k=>{
        if(v[k])agregar(candidatos,v[k]);
      });
    }
  }

  function candidatosImagen(block){
    const c=[];
    ['archivo','path','url','src','ruta','archivo_imagen','imagen','image','data_url','dataUrl','base64','imagen_base64','image_base64','file','filename','file_name','nombre_archivo'].forEach(k=>{if(block?.[k])agregar(c,block[k]);});
    if(block?.imagenes) (Array.isArray(block.imagenes)?block.imagenes:[block.imagenes]).forEach(v=>agregar(c,v));
    if(block?.recurso)agregar(c,block.recurso);
    if(block?.id)agregar(c,block.id);

    const base=baseRecurso(),originales=[...c];
    originales.forEach(r=>{
      if(esDirecta(r))return;
      const limpio=normalizarRuta(r);
      const nombre=limpio.split('/').pop();
      if(base.length){
        c.push([...base,limpio].join('/'));
        if(nombre){
          c.push([...base,'imagenes',nombre].join('/'));
          c.push([...base,'images',nombre].join('/'));
          c.push([...base,'assets',nombre].join('/'));
        }
      }
      if(nombre){
        c.push(`imagenes/${nombre}`);
        c.push(`images/${nombre}`);
      }
    });
    return [...new Set(c.filter(Boolean))];
  }

  async function listarRecursivo(directorio,profundidad=0,limite=500){
    if(profundidad>3)return [];
    try{
      const {data,error}=await clienteSupabase.storage.from(SUPABASE_BUCKET).list(directorio,{limit:limite,sortBy:{column:'name',order:'asc'}});
      if(error)return [];
      const salida=[];
      for(const item of (data||[])){
        if(!item?.name)continue;
        const ruta=directorio?`${directorio}/${item.name}`:item.name;
        if(/\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(item.name))salida.push(ruta);
        else if(profundidad<3){
          const hijos=await listarRecursivo(ruta,profundidad+1,limite);
          salida.push(...hijos);
        }
      }
      return salida;
    }catch(_){return []}
  }

  async function encontrarPorNombre(candidatos){
    const nombres=[...new Set(candidatos.map(x=>normalizarRuta(x).split('/').pop().toLowerCase()).filter(x=>/\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(x)))];
    if(!nombres.length)return null;
    const base=baseRecurso().join('/');
    const rutas=await listarRecursivo(base);
    const encontrada=rutas.find(r=>nombres.includes(r.split('/').pop().toLowerCase()));
    return encontrada||null;
  }

  async function cargarImagen(block){
    const candidatos=candidatosImagen(block),clave=candidatos.join('|');
    if(!clave)throw new Error('El bloque de imagen no contiene una referencia de archivo.');
    if(cacheImagenes.has(clave))return cacheImagenes.get(clave);
    if(promesasImagenes.has(clave))return promesasImagenes.get(clave);

    const promesa=(async()=>{
      for(const ruta of candidatos){
        try{
          if(esDirecta(ruta)){
            const resultado={url:ruta,ruta};cacheImagenes.set(clave,resultado);return resultado;
          }
          const {data,error}=await clienteSupabase.storage.from(SUPABASE_BUCKET).download(ruta);
          if(error||!data)continue;
          const url=URL.createObjectURL(data),resultado={url,ruta,blob:data};
          cacheImagenes.set(clave,resultado);return resultado;
        }catch(_){ }
      }

      const encontrada=await encontrarPorNombre(candidatos);
      if(encontrada){
        const {data,error}=await clienteSupabase.storage.from(SUPABASE_BUCKET).download(encontrada);
        if(!error&&data){
          const url=URL.createObjectURL(data),resultado={url,ruta:encontrada,blob:data};
          cacheImagenes.set(clave,resultado);return resultado;
        }
      }
      throw new Error(`No se encontró la imagen asociada: ${candidatos[0]||'sin referencia'}`);
    })();

    promesasImagenes.set(clave,promesa);
    try{return await promesa;}finally{promesasImagenes.delete(clave);}
  }

  function cerrarVisor(){
    const modal=document.getElementById('visor-imagen-libro');
    if(modal)modal.hidden=true;
    document.body.classList.remove('visor-imagen-abierto');
  }

  function abrirVisor(src,alt){
    let modal=document.getElementById('visor-imagen-libro');
    if(!modal){
      modal=document.createElement('div');
      modal.id='visor-imagen-libro';modal.className='visor-imagen-libro';modal.hidden=true;
      modal.innerHTML='<div class="visor-imagen-fondo"></div><div class="visor-imagen-caja" role="dialog" aria-modal="true" aria-label="Imagen ampliada"><button type="button" class="visor-imagen-cerrar" aria-label="Cerrar imagen">×</button><img class="visor-imagen-ampliada" alt=""></div>';
      modal.querySelector('.visor-imagen-cerrar').addEventListener('click',cerrarVisor);
      modal.querySelector('.visor-imagen-fondo').addEventListener('click',cerrarVisor);
      document.body.append(modal);
    }
    const img=modal.querySelector('.visor-imagen-ampliada');img.src=src;img.alt=String(alt||'Imagen del libro');modal.hidden=false;document.body.classList.add('visor-imagen-abierto');
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape')cerrarVisor();});

  function renderizarImagen(block,destino){
    const figure=document.createElement('figure');figure.className='imagen-libro';
    if(block.id)figure.dataset.imagenId=String(block.id);
    if(block.pagina_fuente!=null)figure.dataset.paginaFuente=String(block.pagina_fuente);

    const img=document.createElement('img');
    img.alt=String(block.alt||block.descripcion||block.titulo||block.caption||'Imagen del libro');
    img.loading='lazy';img.decoding='async';img.tabIndex=0;img.title='Haga clic para ampliar';img.setAttribute('role','button');img.setAttribute('aria-label',`${img.alt}. Haga clic para ampliar.`);

    const meta=Array.isArray(block.imagenes)?block.imagenes[0]:block.imagenes||block;
    if(Number(meta?.ancho)>0)img.dataset.anchoOriginal=String(meta.ancho);
    if(Number(meta?.alto)>0)img.dataset.altoOriginal=String(meta.alto);

    const carga=document.createElement('div');carga.className='imagen-libro-cargando';carga.textContent='Cargando imagen…';figure.append(carga,img);destino.append(figure);
    const ampliar=()=>{if(img.src)abrirVisor(img.src,img.alt);};
    img.addEventListener('click',ampliar);img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ampliar();}});

    cargarImagen(block).then(({url,ruta})=>{img.src=url;img.dataset.ruta=ruta;carga.remove();}).catch(error=>{
      console.warn('Imagen del JSON:',error);carga.textContent='No se pudo cargar esta imagen del libro.';carga.className='imagen-libro-error';img.remove();
    });
  }

  function renderizarTabla(block,destino){
    const figure=document.createElement('figure');figure.className='tabla-libro-contenedor';
    if(block.id)figure.dataset.tablaId=String(block.id);
    const table=document.createElement('table');table.className='tabla-libro';
    const filas=Array.isArray(block.contenido)?block.contenido:[],columnas=Number(block.columnas);
    filas.forEach((row,ri)=>{const tr=document.createElement('tr');const celdas=Array.isArray(row?.celdas)?row.celdas:[];celdas.forEach((cell,ci)=>{const td=document.createElement('td');td.textContent=String(cell?.texto??'');td.dataset.fila=String(cell?.fila??ri);td.dataset.columna=String(cell?.columna??ci);tr.append(td);});while(columnas>0&&tr.cells.length<columnas){const td=document.createElement('td');td.dataset.fila=String(ri);td.dataset.columna=String(tr.cells.length);tr.append(td);}table.append(tr);});
    figure.append(table);destino.append(figure);
  }

  function esImagen(block){
    const tipo=String(block?.tipo||block?.type||block?.kind||'').toLowerCase();
    return /^(imagen|image|figura|figure|foto|fotografia|picture|drawing|illustration|ilustracion)$/.test(tipo)||Boolean(block?.archivo_imagen||block?.imagen_base64||block?.image_base64||block?.data_url||block?.url_imagen);
  }

  function renderizarBloquesEnriquecidos(contenido,destino,inicioVoz){
    let lista=null,offset=inicioVoz;
    (contenido||[]).forEach(block=>{
      if(!block)return;
      const tipo=String(block.tipo||block.type||'').toLowerCase(),texto=block.texto||block.text||'';
      if(tipo==='tabla'||tipo==='table'){lista=null;renderizarTabla(block,destino);return;}
      if(esImagen(block)){lista=null;renderizarImagen(block,destino);return;}
      if(tipo==='elemento_lista'||tipo==='list_item'){if(!lista){lista=document.createElement('ul');lista.className='lista';destino.append(lista);}const li=document.createElement('li');li.append(crearFragmentos({...block,texto},offset));lista.append(li);offset+=String(texto).length+2;return;}
      lista=null;
      if(tipo==='parrafo_vacio'||tipo==='empty_paragraph'){offset+=String(texto).length+2;return;}
      const p=document.createElement('p');if(tipo==='dialogo'||tipo==='dialogue')p.classList.add('dialogo');p.append(crearFragmentos({...block,texto},offset));destino.append(p);offset+=String(texto).length+2;
    });
  }

  renderizarBloques=renderizarBloquesEnriquecidos;
  window.renderizarBloques=renderizarBloquesEnriquecidos;

  const estilo=document.createElement('style');estilo.id='estilo-elementos-enriquecidos';estilo.textContent=`
    .imagen-libro{width:100%;margin:1.5rem 0;text-align:center;break-inside:avoid}
    .imagen-libro img{display:block;width:auto;max-width:100%;height:auto;max-height:75vh;margin:0 auto;object-fit:contain;border-radius:4px;cursor:zoom-in;outline:none}
    .imagen-libro img:focus-visible{outline:3px solid #315c4b;outline-offset:4px}
    .imagen-libro-cargando{min-height:3rem;display:grid;place-items:center;color:#718078;font:.82rem Arial,sans-serif;background:#f4f7f4;border:1px dashed #d7ddd7;border-radius:8px;padding:1rem}
    .imagen-libro-error{margin:0;padding:.8rem;color:#7a4d38;background:#fff8f3;border:1px solid #ead8ca;border-radius:8px;font:.82rem Arial,sans-serif}
    .tabla-libro-contenedor{width:100%;margin:1.4rem 0;overflow-x:auto;break-inside:avoid}
    .tabla-libro-contenedor .tabla-libro{min-width:100%;margin:0}.tabla-libro-contenedor .tabla-libro td{white-space:pre-wrap}
    .visor-imagen-libro{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:1.5rem}.visor-imagen-libro[hidden]{display:none}
    .visor-imagen-fondo{position:absolute;inset:0;background:rgba(0,0,0,.82);cursor:zoom-out}
    .visor-imagen-caja{position:relative;z-index:1;width:min(96vw,1400px);height:min(94vh,1000px);display:grid;place-items:center;pointer-events:none}
    .visor-imagen-ampliada{pointer-events:auto;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;box-shadow:0 12px 45px rgba(0,0,0,.45);background:white}
    .visor-imagen-cerrar{position:absolute;z-index:2;top:.25rem;right:.25rem;width:2.5rem;height:2.5rem;border:0;border-radius:50%;background:rgba(255,255,255,.94);color:#1d332a;font-size:1.8rem;line-height:1;cursor:pointer;pointer-events:auto}
    @media(max-width:760px){.imagen-libro img{max-height:none}.visor-imagen-libro{padding:.5rem}.visor-imagen-caja{width:100vw;height:100vh}}
  `;document.head.append(style);
})();
