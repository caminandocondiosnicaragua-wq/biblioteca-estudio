/*
 * Adaptador de JSON para Mi Biblioteca de Estudio.
 *
 * OBJETIVO:
 * - Mantener intactos los JSON originales almacenados en Supabase.
 * - Traducir distintos formatos al formato interno que entiende biblioteca.js.
 * - No intervenir en JSON que ya tienen el formato nativo de la Biblioteca.
 *
 * FORMATOS SOPORTADOS:
 * 1) Biblia: books -> chapters -> items/verses/content.
 * 2) Variantes bíblicas con text, lines, texto, contenido, etc.
 * 3) Diccionario/Léxico: entradas / entries.
 * 4) JSON nativo de la Biblioteca: se deja intacto.
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
    if(typeof v==='string'||typeof v==='number') return String(v);
    if(esArray(v)) return v.map(texto).filter(Boolean).join('\n');
    if(objeto(v)) return texto(primero(v,['text','texto','line','value','content','contenido','definition','definicion','significado','meaning']));
    return String(v);
  };
  const limpio=v=>String(v??'').trim();
  const tituloDe=v=>limpio(primero(v,['titulo','title','name','nombre','local_title','local_name','abbreviation','abreviatura']));

  function aLista(v){
    if(esArray(v)) return v;
    if(objeto(v)) return Object.entries(v).map(([clave,valor])=>{
      if(objeto(valor)&&valor.number==null&&valor.numero==null&&valor.id==null) return {...valor,_clave:clave};
      return valor;
    });
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
    const valor=primero(item,['text','texto','content','contenido','lines','lineas','value'], '');
    return limpio(texto(valor));
  }

  function bloquesBiblia(items,nombreLibro,numeroCapitulo){
    const bloques=[];
    aLista(items).forEach((item,i)=>{
      if(item==null) return;
      const tipo=limpio(primero(item,['type','tipo','kind','class'],'')).toLowerCase();
      const encabezado=/heading|title|titulo|encabezado|section|seccion/.test(tipo);
      if(encabezado){
        const h=limpio(texto(primero(item,['text','texto','title','titulo','name','nombre','content','contenido'],'')));
        if(h) bloques.push({tipo:'parrafo',texto:h,formato_fragmentos:[{texto:h,negrita:true}]});
        return;
      }

      const cuerpo=contenidoDeVersiculo(item);
      if(!cuerpo) return;
      const n=obtenerNumero(item,i+1);
      const ref=`${nombreLibro} ${numeroCapitulo}:${n}`;
      const prefijo=`${ref} `;
      bloques.push({
        tipo:'parrafo',
        texto:prefijo+cuerpo,
        referencia:ref,
        versiculo:Number(n)||n,
        formato_fragmentos:[{texto:prefijo,negrita:true},{texto:cuerpo}]
      });
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
        const tituloCap=limpio(tituloDe(ch))||`${nombre} ${numero}`;
        secciones.push({
          titulo:tituloCap,
          contenido:bloques,
          subsecciones:[],
          tipo:'biblia-capitulo',
          biblia:true,
          libroId:book.id||nombre,
          libroNombre:nombre,
          capitulo:Number(numero)||numero,
          referencia:`${nombre} ${numero}`
        });
      });
    });
    return {
      titulo:limpio(tituloDe(v)||primero(v,['local_abbreviation','abbreviation'],'Biblia'))||'Biblia',
      secciones
    };
  }

  function valorEntrada(entrada,claves){
    return primero(entrada,claves,'');
  }

  function formatearCampo(etiqueta,valor){
    const t=limpio(texto(valor));
    return t?`${etiqueta}: ${t}`:'';
  }

  function bloquesEntrada(entrada,indice){
    const bloques=[];
    const palabra=limpio(valorEntrada(entrada,['lemma','lema','term','termino','término','word','palabra','greek','griego','entry','entrada','name','nombre']))||`Entrada ${indice+1}`;
    bloques.push({
      tipo:'parrafo',
      texto:palabra,
      formato_fragmentos:[{texto:palabra,negrita:true}]
    });

    const camposPrincipales=[
      ['Strong',valorEntrada(entrada,['strong','strong_number','numero_strong','strongs'])],
      ['Transliteración',valorEntrada(entrada,['transliteration','transliteracion','transliteración'])],
      ['Pronunciación',valorEntrada(entrada,['pronunciation','pronunciacion','pronunciación'])],
      ['Categoría gramatical',valorEntrada(entrada,['part_of_speech','pos','categoria_gramatical','categoria','grammatical_category'])],
      ['Forma',valorEntrada(entrada,['form','forma','forms','formas'])],
      ['Significado',valorEntrada(entrada,['meaning','meanings','significado','significados','definition','definitions','definicion','definiciones'])],
      ['Etimología',valorEntrada(entrada,['etymology','etimologia','etimología'])],
      ['Uso',valorEntrada(entrada,['usage','uso','usos'])],
      ['Referencias',valorEntrada(entrada,['references','referencias','bible_references','referencias_biblicas','referencias_bíblicas'])]
    ];
    camposPrincipales.forEach(([etiqueta,valor])=>{
      const t=formatearCampo(etiqueta,valor);
      if(t) bloques.push({tipo:'parrafo',texto:t});
    });

    // Conserva campos adicionales del JSON que no hayan sido reconocidos arriba.
    const conocidas=new Set([
      'lemma','lema','term','termino','término','word','palabra','greek','griego','entry','entrada','name','nombre',
      'strong','strong_number','numero_strong','strongs','transliteration','transliteracion','transliteración',
      'pronunciation','pronunciacion','pronunciación','part_of_speech','pos','categoria_gramatical','categoria','grammatical_category',
      'form','forma','forms','formas','meaning','meanings','significado','significados','definition','definitions','definicion','definiciones',
      'etymology','etimologia','etimología','usage','uso','usos','references','referencias','bible_references','referencias_biblicas','referencias_bíblicas'
    ]);
    if(objeto(entrada)){
      Object.entries(entrada).forEach(([clave,valor])=>{
        if(conocidas.has(clave)||valor==null||valor==='') return;
        const t=texto(valor);
        if(t) bloques.push({tipo:'parrafo',texto:`${clave}: ${t}`});
      });
    }
    return bloques;
  }

  function adaptarDiccionario(v){
    const entradas=aLista(primero(v,['entradas','entries','lemmas','terminos','terms']));
    const grupos=new Map();
    entradas.forEach((entrada,i)=>{
      if(!objeto(entrada)) return;
      const palabra=limpio(valorEntrada(entrada,['lemma','lema','term','termino','término','word','palabra','greek','griego','entry','entrada','name','nombre']))||`Entrada ${i+1}`;
      const inicial=limpio(palabra).charAt(0).toLocaleUpperCase('es')||'#';
      if(!grupos.has(inicial)) grupos.set(inicial,[]);
      grupos.get(inicial).push({entrada,palabra,i});
    });

    const secciones=[];
    [...grupos.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es')).forEach(([inicial,lista])=>{
      const contenido=[];
      lista.sort((a,b)=>a.palabra.localeCompare(b.palabra,'es')).forEach(item=>{
        bloquesEntrada(item.entrada,item.i).forEach(b=>contenido.push(b));
      });
      if(contenido.length) secciones.push({
        titulo:inicial,
        contenido,
        subsecciones:[],
        tipo:'diccionario-letra',
        diccionario:true
      });
    });

    return {
      titulo:limpio(tituloDe(v)||'Diccionario')||'Diccionario',
      secciones
    };
  }

  function adaptar(v){
    // MUY IMPORTANTE: los JSON que ya funcionan no se transforman.
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
            if(out!==raw){
              return {...r,data:new Blob([JSON.stringify(out)],{type:'application/json'})};
            }
          }
        }catch(e){
          console.warn('Adaptador JSON:',e);
        }
        return r;
      };
      return bucket;
    };

    return new Proxy(cliente,{get(t,p){
      return p==='storage'?storage:Reflect.get(t,p);
    }});
  };
})();
