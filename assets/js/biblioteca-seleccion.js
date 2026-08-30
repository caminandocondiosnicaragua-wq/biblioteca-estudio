/* PANEL DE SELECCIÓN — capa independiente.
 * Reconoce citas bíblicas exactas y muestra solamente el texto solicitado.
 * No modifica el lector, el audio, el marcador amarillo ni las vistas.
 */
(function(){
  const $=id=>document.getElementById(id);
  let panel=null,ultimaSeleccion='';
  const norm=s=>String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function crear(){
    if(panel)return panel;
    const style=document.createElement('style');style.id='estilo-panel-seleccion';style.textContent=`
      #panel-seleccion-biblica{position:fixed;left:50%;bottom:0;transform:translate(-50%,calc(100% + 20px));width:min(760px,calc(100vw - 32px));max-height:32vh;overflow:auto;background:#fffdf8;border:1px solid #c9a227;border-bottom:0;border-radius:14px 14px 0 0;box-shadow:0 -8px 28px #0002;z-index:300;font-family:Georgia,serif;color:#17261f;transition:transform .2s ease;padding:.8rem 1rem 1rem}
      #panel-seleccion-biblica.abierto{transform:translate(-50%,0)}
      #panel-seleccion-biblica .seleccion-cabecera{display:flex;align-items:center;justify-content:space-between;gap:.7rem;border-bottom:1px solid #ddd6c7;padding-bottom:.45rem;margin-bottom:.55rem}
      #panel-seleccion-biblica .seleccion-tipo{font:700 .72rem Arial,sans-serif;text-transform:uppercase;letter-spacing:.04em;color:#315c4b}
      #panel-seleccion-biblica .seleccion-cerrar{border:0;background:transparent;color:#52645c;font-size:1.25rem;cursor:pointer;padding:.15rem .35rem}
      #panel-seleccion-biblica .seleccion-texto{font-size:1.08rem;line-height:1.48;margin:.25rem 0 .55rem}
      #panel-seleccion-biblica .seleccion-meta{font:400 .76rem Arial,sans-serif;color:#64736c}
      #panel-seleccion-biblica .versiculo-fuente{font-size:.72rem;color:#68756f;font-family:Arial,sans-serif;margin-top:.45rem}
      #panel-seleccion-biblica .seleccion-aviso{font:400 .78rem Arial,sans-serif;color:#68756f;margin:.5rem 0 0}
      #panel-seleccion-biblica .numero-versiculo{font-weight:700;color:#315c4b;margin-right:.35rem}
      @media(max-width:700px){#panel-seleccion-biblica{width:calc(100vw - 12px);max-height:38vh;padding:.7rem .8rem}}
    `;document.head.append(style);
    panel=document.createElement('section');panel.id='panel-seleccion-biblica';panel.setAttribute('aria-live','polite');panel.setAttribute('aria-label','Información de la selección');
    panel.innerHTML='<div class="seleccion-cabecera"><span class="seleccion-tipo">Selección</span><button class="seleccion-cerrar" type="button" aria-label="Cerrar">×</button></div><div class="seleccion-texto"></div><div class="seleccion-meta"></div>';
    document.body.append(panel);panel.querySelector('.seleccion-cerrar').onclick=cerrar;return panel;
  }
  function cerrar(){if(panel)panel.classList.remove('abierto');ultimaSeleccion='';}

  function parseCita(texto){
    let t=String(texto||'').replace(/[\u00a0]/g,' ').replace(/[\u2013\u2014]/g,'-').replace(/\s+/g,' ').trim();
    let version='';const vm=t.match(/\s*\(([^()]*)\)\s*$/);if(vm){version=vm[1].trim();t=t.slice(0,vm.index).trim();}
    const m=t.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);if(!m)return null;
    return {libro:m[1].trim(),cap:Number(m[2]),vers:Number(m[3]),fin:m[4]?Number(m[4]):Number(m[3]),version};
  }

  function esBiblia(r){return !!r&&(String(r.tipo||'').toLowerCase().includes('biblia')||/biblia|rvr|rvc|nvi|ntv|dhh|lbla|btx/.test(String(r.titulo||'').toLowerCase()));}
  function libroCoincide(nombre,busqueda){
    const a=norm(nombre),b=norm(busqueda);if(a===b)return true;
    const alias={genesis:['gen'],exodo:['ex','exod'],levitico:['lev'],numeros:['num'],deuteronomio:['deut'],josue:['jos'],jueces:['jue'],salmos:['sal','salmo'],proverbios:['prov'],isaias:['isa'],jeremias:['jer'],ezequiel:['ezeq'],daniel:['dan'],mateo:['mat','mt'],marcos:['mar','mc'],lucas:['luc','lc'],juan:['jn'],hechos:['hch'],romanos:['rom'],1corintios:['1 cor','1cor'],2corintios:['2 cor','2cor'],galatas:['gal'],efesios:['ef'],filipenses:['fil'],colosenses:['col'],1tesalonicenses:['1 tes','1tes'],2tesalonicenses:['2 tes','2tes'],1timoteo:['1 tim','1tim'],2timoteo:['2 tim','2tim'],tito:['tit'],filemon:['flm'],hebreos:['heb'],santiago:['stg'],1pedro:['1 ped','1ped'],2pedro:['2 ped','2ped'],1juan:['1 jn','1jn'],2juan:['2 jn','2jn'],3juan:['3 jn','3jn'],judas:['jud'],apocalipsis:['apoc','ap']};
    const clave=Object.keys(alias).find(k=>a===k||a.replace(/\s/g,'')===k);return !!clave&&alias[clave].some(x=>b===x||b.startsWith(x+' ')||b.startsWith(x));
  }
  function buscarNodo(r,c){return (r?.nodos||[]).findIndex(n=>{const m=String(n.titulo||'').trim().match(/^(.*?)[\s·-]+(\d+)$/);return m&&Number(m[2])===c.cap&&libroCoincide(m[1],c.libro);});}

  function extraer(nodo,c){
    const salida=[];
    (nodo?.contenido||[]).forEach(b=>{
      const txt=String(b.texto||'').replace(/\s+/g,' ').trim();if(!txt)return;
      const partes=[];const re=/(?:^|\s)(\d{1,3})[.)]?\s+/g;let m;
      while((m=re.exec(txt)))partes.push({num:Number(m[1]),inicio:m.index+m[0].length});
      if(partes.length){partes.forEach((p,i)=>{if(p.num<c.vers||p.num>c.fin)return;let fin=i+1<partes.length?partes[i+1].inicio-String(partes[i+1].num).length-2:txt.length;salida.push({num:p.num,texto:txt.slice(p.inicio,fin).trim()});});}
      else if(c.vers===1)salida.push({num:1,texto:txt});
    });
    return salida;
  }

  async function resolver(c){
    let metas=[];try{metas=await listarRecursos();}catch(e){return null;}
    const candidatos=metas.filter(esBiblia);const v=norm(c.version);
    const orden=[...candidatos].sort((a,b)=>{const av=v&&norm(a.titulo).includes(v)?1:0,bv=v&&norm(b.titulo).includes(v)?1:0;return bv-av;});
    for(const meta of orden){try{const r=await descargarRecurso(meta),i=buscarNodo(r,c);if(i>=0){const vers=extraer(r.nodos[i],c);if(vers.length)return {r,nodo:r.nodos[i],vers};}}catch(e){console.warn(e);}}
    return null;
  }

  function mostrarCargando(seleccion,c){const p=crear();p.querySelector('.seleccion-tipo').textContent='Cita bíblica';p.querySelector('.seleccion-texto').textContent=seleccion;p.querySelector('.seleccion-meta').innerHTML='Buscando únicamente el texto de esta cita…';p.classList.add('abierto');}
  async function atenderCita(seleccion,c){
    mostrarCargando(seleccion,c);const h=await resolver(c);const p=crear();
    if(!h){p.querySelector('.seleccion-tipo').textContent='Cita bíblica';p.querySelector('.seleccion-meta').innerHTML='No encontré una Biblia compatible con esta referencia.';return;}
    p.querySelector('.seleccion-tipo').textContent=`Cita bíblica · ${esc(h.r.titulo)}`;
    p.querySelector('.seleccion-texto').innerHTML=h.vers.map(v=>`<div><span class="numero-versiculo">${v.num}</span>${esc(v.texto)}</div>`).join('');
    p.querySelector('.seleccion-meta').innerHTML=`${esc(c.libro)} ${c.cap}:${c.vers}${c.fin!==c.vers?'–'+c.fin:''}${c.version?' · '+esc(c.version):''}<div class="versiculo-fuente">Se muestra únicamente el pasaje solicitado.</div>`;
    p.classList.add('abierto');
  }
  function atenderPalabra(texto){const p=crear();p.querySelector('.seleccion-tipo').textContent='Palabra seleccionada';p.querySelector('.seleccion-texto').textContent=texto;p.querySelector('.seleccion-meta').textContent='Cuando haya un diccionario o léxico conectado, aquí aparecerá únicamente su definición y la información relevante.';p.classList.add('abierto');}

  function seleccionValida(sel){if(!sel||sel.isCollapsed)return '';const n=sel.anchorNode;if(!n)return '';const area=(n.nodeType===1?n:n.parentElement)?.closest?.('#contenido,.contenido-panel');if(!area)return '';return sel.toString().replace(/\s+/g,' ').trim().slice(0,500);}
  function escuchar(){
    document.addEventListener('mouseup',()=>setTimeout(()=>{const s=window.getSelection(),t=seleccionValida(s);if(t&&t!==ultimaSeleccion){ultimaSeleccion=t;const c=parseCita(t);if(c)atenderCita(t,c);else atenderPalabra(t);}},30));
    document.addEventListener('keyup',e=>{if(!['Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;setTimeout(()=>{const s=window.getSelection(),t=seleccionValida(s);if(t&&t!==ultimaSeleccion){ultimaSeleccion=t;const c=parseCita(t);if(c)atenderCita(t,c);else atenderPalabra(t);}},30);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',escuchar,{once:true});else escuchar();
})();
