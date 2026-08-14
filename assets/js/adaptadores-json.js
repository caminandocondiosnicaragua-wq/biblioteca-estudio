/*
 * Adaptador de JSON para Mi Biblioteca de Estudio.
 * Mantiene intactos los JSON originales y traduce formatos externos
 * a la estructura interna que entiende biblioteca.js.
 */
(function(){
  const supabaseOriginal=window.supabase;
  if(!supabaseOriginal||typeof supabaseOriginal.createClient!=='function') return;

  const esArray=v=>Array.isArray(v);
  const objeto=v=>v&&typeof v==='object'&&!esArray(v);
  const primero=(obj,claves,def='')=>{
    if(!objeto(obj)) return def;
    for(const clave of claves){
      if(obj[clave]!==undefined&&obj[clave]!==null&&obj[clave]!=='') return obj[clave];
    }
    return def;
  };
  const texto=v=>{
    if(v==null) return '';
    if(typeof v==='string'||typeof v==='number'||typeof v==='boolean') return String(v);
    if(esArray(v)) return v.map(texto).filter(Boolean).join('\n');
    if(objeto(v)) return texto(primero(v,['text','texto','line','value','content','contenido','definition','definicion','significado','meaning'],''));
    return String(v);
  };
  const limpio=v=>String(v??'').trim();
  const tituloDe=v=>limpio(primero(v,['titulo','title','name','nombre','local_title','local_name','abbreviation','abreviatura']));

  function aLista(v){
    if(esArray(v)) return v;
    if(objeto(v)) return Object.entries(v).map(([clave,valor])=>objeto(valor)?{...valor,_clave:clave}:valor);
    return [];
  }

  function esFormatoNativo(v){
    return !!(v&&(
      esArray(v.secciones)||
      esArray(v.secciones_preliminares)||
      (esArray(v.contenido)&&v.contenido.some(x=>objeto(x)&&('tipo' in x||'texto' in x)))
    ));
  }

  function esBiblia(v){
    const libros=aLista(v&&primero(v,['books','libros']));
    return libros.length>0&&libros.some(b=>aLista(b&&primero(b,['chapters','capitulos','chapters_list'])).length>0);
  }

  function esDiccionario(v){
    if(!v||esFormatoNativo(v)||esBiblia(v)) return false;
    const entradas=primero(v,['entradas','entries','lemmas','terminos','terms']);
    return esArray(entradas)&&entradas.length>0;
  }

  function obtenerNumero(item,fallback){
    let n=primero(item,['number','numero','verse','versiculo','verse_number','verseNumber','chapter_number','chapterNumber'],null);
    if(n==null&&esArray(item&&item.verse_numbers)&&item.verse_numbers.length)n=item.verse_numbers[0];
    if(n==null&&item&&item.id){
      const partes=String(item.id).split(/[.:_-]/);
      const ultimo=partes.at(-1);
      if(/^\d+$/.test(ultimo)) n=ultimo;
    }
    return n==null?fallback:n;
  }

  function contenidoDeVersiculo(item){
    return limpio(texto(primero(item,['text','texto','content','contenido','lines','lineas','value'],'')));
  }

  function bloquesBiblia(items,nombreLibro,numeroCapitulo){
    const bloques=[];
    aLista(items).forEach((item,i)=>{
      if(item==null) return;
      const tipo=limpio(primero(item,['type','tipo','kind','class'],'')).toLowerCase();
      const encabezado=/heading|title|titulo|encabezado|section|seccion|label|etiqueta/.test(tipo);
      if(encabezado){
        const h=limpio(texto(primero(item,['text','texto','title','titulo','name','nombre','content','contenido','lines','lineas'],'')));
        if(h) bloques.push({tipo:'parrafo',texto:h,formato_fragmentos:[{texto:h,negrita:true}]});
        return;
      }
      const cuerpo=contenidoDeVersiculo(item);
      if(!cuerpo) return;
      const n=obtenerNumero(item,i+1);
      const ref=`${nombreLibro} ${numeroCapitulo}:${n}`;
      const prefijo=`${ref} `;
      bloques.push({tipo:'parrafo',texto:prefijo+cuerpo,referencia:ref,versiculo:Number(n)||n,formato_fragmentos:[{texto:prefijo,negrita:true},{texto:cuerpo}]});
    });
    return bloques;
  }

  function adaptarBiblia(v){
    const secciones=[];
    const libros=aLista(primero(v,['books','libros']));
    libros.forEach((book,bi)=>{
      if(!objeto(book)) return;
      const nombre=limpio(tituloDe(book)||primero(book,['id','book_id'],`Libro ${bi+1}`));
      const capitulos=aLista(primero(book,['chapters','capitulos','chapters_list']));
      capitulos.forEach((ch,ci)=>{
        if(ch==null) return;
        const numero=obtenerNumero(ch,ci+1);
        const items=primero(ch,['items','verses','versiculos','content','contenido'],[]);
        const bloques=bloquesBiblia(items,nombre,numero);
        if(!bloques.length) return;
        const tituloCap=limpio(tituloDe(ch)||primero(ch,['current'],{})?.human)||`${nombre} ${numero}`;
        secciones.push({titulo:tituloCap,contenido:bloques,subsecciones:[],tipo:'biblia-capitulo',biblia:true,libroId:book.id||book.book_usfm||nombre,libroNombre:nombre,capitulo:Number(numero)||numero,referencia:`${nombre} ${numero}`});
      });
    });
    return {titulo:limpio(tituloDe(v)||primero(v,['local_abbreviation','abbreviation'],'Biblia'))||'Biblia',secciones};
  }

  /* ---------------- DICCIONARIO / LÉXICO ---------------- */

  function textoDiccionario(v){
    if(v==null) return '';
    if(typeof v==='string'||typeof v==='number'||typeof v==='boolean') return String(v);
    if(esArray(v)) return v.map(textoDiccionario).filter(Boolean).join('; ');
    if(objeto(v)) return Object.entries(v)
      .filter(([_,valor])=>valor!==null&&valor!==undefined&&valor!=='')
      .map(([clave,valor])=>`${clave}: ${textoDiccionario(valor)}`)
      .join('; ');
    return String(v);
  }

  function agregarBloque(bloques,textoValor,negrita=false){
    const t=limpio(textoValor);
    if(t) bloques.push({tipo:'parrafo',texto:t,formato_fragmentos:negrita?[{texto:t,negrita:true}]:[{texto:t}]});
  }

  function bloquesEntrada(entrada,indice){
    const bloques=[];
    const palabra=limpio(primero(entrada,['entrada','lemma','lema','term','termino','término','word','palabra','greek','griego','entry','name','nombre'],''))||`Entrada ${indice+1}`;
    agregarBloque(bloques,palabra,true);

    agregarBloque(bloques,`Forma léxica: ${textoDiccionario(primero(entrada,['forma_lexica','forma','form','forms','formas'],''))}`);
    agregarBloque(bloques,`Tipo: ${textoDiccionario(primero(entrada,['tipo','type'],''))}`);
    agregarBloque(bloques,`Gramática: ${textoDiccionario(primero(entrada,['gramatica','gramática','grammar','part_of_speech','pos'],''))}`);
    agregarBloque(bloques,`Morfología: ${textoDiccionario(primero(entrada,['morfologia','morfología','morphology'],''))}`);
    agregarBloque(bloques,`Significados: ${textoDiccionario(primero(entrada,['significados','significado','meanings','meaning','definition','definitions'],''))}`);
    agregarBloque(bloques,`Expresiones: ${textoDiccionario(primero(entrada,['expresiones','expressions'],''))}`);
    agregarBloque(bloques,`Régimen: ${textoDiccionario(primero(entrada,['regimen','régimen','regimenes','regímenes'],''))}`);
    agregarBloque(bloques,`Referencias: ${textoDiccionario(primero(entrada,['referencias','references','bible_references'],''))}`);
    agregarBloque(bloques,`Lema principal: ${textoDiccionario(primero(entrada,['lema_principal','main_lemma'],''))}`);
    agregarBloque(bloques,`Remisiones: ${textoDiccionario(primero(entrada,['remisiones','cross_references','remissions'],''))}`);
    agregarBloque(bloques,`Origen: ${textoDiccionario(primero(entrada,['origen','origin','etimologia','etimología','etymology'],''))}`);
    agregarBloque(bloques,`Variante textual: ${textoDiccionario(primero(entrada,['variante_textual','textual_variant'],''))}`);
    agregarBloque(bloques,`Nota: ${textoDiccionario(primero(entrada,['nota','note'],''))}`);
    agregarBloque(bloques,`Texto original: ${textoDiccionario(primero(entrada,['texto_original','original_text'],''))}`);

    return bloques;
  }

  function adaptarDiccionario(v){
    const entradas=aLista(primero(v,['entradas','entries','lemmas','terminos','terms']));
    const grupos=new Map();

    entradas.forEach((entrada,i)=>{
      if(!objeto(entrada)) return;
      const palabra=limpio(primero(entrada,['entrada','lemma','lema','term','termino','término','word','palabra','greek','griego','entry','name','nombre'],''))||`Entrada ${i+1}`;
      const letra=limpio(primero(entrada,['letra','letter'],''))||palabra.charAt(0).toLocaleUpperCase('es')||'#';
      if(!grupos.has(letra)) grupos.set(letra,[]);
      grupos.get(letra).push({entrada,palabra,i});
    });

    const secciones=[];
    [...grupos.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es')).forEach(([letra,lista])=>{
      lista.sort((a,b)=>a.palabra.localeCompare(b.palabra,'es'));
      const contenido=[];
      lista.forEach(item=>{
        bloquesEntrada(item.entrada,item.i).forEach(b=>contenido.push(b));
      });
      if(contenido.length) secciones.push({titulo:letra,contenido,subsecciones:[],tipo:'diccionario-letra',diccionario:true});
    });

    return {titulo:limpio(tituloDe(v)||'Diccionario')||'Diccionario',secciones};
  }

  function adaptar(v){
    // Los JSON nativos de la Biblioteca quedan completamente intactos.
    if(esFormatoNativo(v)) return v;
    if(esBiblia(v)) return adaptarBiblia(v);
    if(esDiccionario(v)) return adaptarDiccionario(v);
    return v;
  }

  window.supabase=Object.create(supabaseOriginal);
  window.supabase.createClient=function(...args){
    const cliente=supabaseOriginal.createClient(...args);
    const storageOriginal=cliente.storage;
    const storage=Object.create(storageOriginal);
    storage.from=function(...args){
      const original=storageOriginal.from(...args);
      const bucket=Object.create(original);
      bucket.download=async function(...dargs){
        const r=await original.download(...dargs);
        if(r?.error||!r?.data) return r;
        try{
          const name=String(dargs[0]||'').toLowerCase();
          if(name.endsWith('.json')||String(r.data.type||'').includes('json')){
            const raw=JSON.parse(await r.data.text());
            const out=adaptar(raw);
            if(out!==raw)return {...r,data:new Blob([JSON.stringify(out)],{type:'application/json'})};
          }
        }catch(e){console.warn('Adaptador JSON:',e);}
        return r;
      };
      return bucket;
    };
    return new Proxy(cliente,{get(t,p){return p==='storage'?storage:Reflect.get(t,p);}});
  };
})();
