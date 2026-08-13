/* Adaptador adicional de JSON. Los archivos originales de Supabase no se modifican. */
(function(){
  const supabaseOriginal=window.supabase;
  if(!supabaseOriginal||typeof supabaseOriginal.createClient!=='function') return;
  const texto=v=>v==null?'':typeof v==='string'?v:Array.isArray(v)?v.map(texto).filter(Boolean).join('\n'):typeof v==='object'?texto(v.text??v.texto??v.line??v.value??v.content??v.contenido):String(v);
  const esBiblia=v=>!!(v&&Array.isArray(v.books)&&v.books.some(b=>Array.isArray(b.chapters)));
  function adaptar(v){
    if(!esBiblia(v)) return v;
    const secciones=[];
    (v.books||[]).forEach(book=>{
      const nombre=String(book.name||book.title||book.nombre||book.id||'Libro').trim();
      (book.chapters||[]).forEach(ch=>{
        const numero=ch.number??ch.chapter??''; const bloques=[];
        (ch.items||ch.verses||ch.content||ch.contenido||[]).forEach((item,i)=>{
          if(!item)return;
          const tipo=String(item.type||item.tipo||'').toLowerCase();
          if(tipo.includes('heading')||tipo==='titulo'||tipo==='encabezado'){
            const h=texto(item.text??item.texto??item.title??item.name); if(h) bloques.push({tipo:'parrafo',texto:h,formato_fragmentos:[{texto:h,negrita:true}]}); return;
          }
          const cuerpo=texto(item.text??item.texto??item.lines??item.lineas??item.content??item.contenido); if(!cuerpo.trim())return;
          let n=item.number??(Array.isArray(item.verse_numbers)&&item.verse_numbers.length?item.verse_numbers[0]:null);
          if(n==null){const p=String(item.id||'').split('.'); n=/^\d+$/.test(p.at(-1)||'')?p.at(-1):i+1;}
          const ref=`${nombre} ${numero}:${n}`;
          bloques.push({tipo:'parrafo',texto:`${ref} ${cuerpo}`,referencia:ref,versiculo:Number(n)||n,formato_fragmentos:[{texto:`${ref} `,negrita:true},{texto:cuerpo}]});
        });
        if(bloques.length) secciones.push({titulo:ch.name||`${nombre} ${numero}`,contenido:bloques,subsecciones:[],tipo:'biblia-capitulo',biblia:true,libroId:book.id||nombre,libroNombre:nombre,capitulo:Number(numero)||numero,referencia:`${nombre} ${numero}`});
      });
    });
    return {titulo:v.titulo||v.local_title||v.local_abbreviation||'Biblia',secciones};
  }
  window.supabase=Object.create(supabaseOriginal);
  window.supabase.createClient=function(...args){
    const cliente=supabaseOriginal.createClient(...args), storageOriginal=cliente.storage, storage=Object.create(storageOriginal);
    storage.from=function(...args){
      const original=storageOriginal.from(...args), bucket=Object.create(original);
      bucket.download=async function(...dargs){
        const r=await original.download(...dargs); if(r?.error||!r?.data)return r;
        try{
          const name=String(dargs[0]||'').toLowerCase();
          if(name.endsWith('.json')||String(r.data.type||'').includes('json')){
            const raw=JSON.parse(await r.data.text()), out=adaptar(raw);
            if(out!==raw)return {...r,data:new Blob([JSON.stringify(out)],{type:'application/json'})};
          }
        }catch(e){console.warn('Adaptador JSON:',e);}
        return r;
      }; return bucket;
    };
    return new Proxy(cliente,{get(t,p){return p==='storage'?storage:Reflect.get(t,p);}});
  };
})();
