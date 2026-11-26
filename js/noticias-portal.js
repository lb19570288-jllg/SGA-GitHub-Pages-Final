
/* Copia estática: consultas públicas al cPanel, con respaldo local para noticias y biblioteca. */
window.SGAPagesRead = window.SGAPagesRead || (async function (relative, options = {}) {
  const requested = new URL(relative, location.href);
  const endpoint = requested.pathname.split('/').pop();
  const base = new URL('../', location.href);
  const fallback = {'news.php':'news.json', 'library.php':'library.json'}[endpoint];
  const permitted = ['news.php','library.php','research.php','news-visual.php'];
  if (!permitted.includes(endpoint)) throw new Error('Consulta no admitida.');
  try {
    const r = await fetch(new URL('js/api-config.json', base), {cache:'no-store', signal:options.signal});
    const cfg = await r.json();
    if (cfg.api_base) {
      const api = new URL(cfg.api_base);
      if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash || !api.pathname.endsWith('/api/')) throw new Error('API no válida.');
      const dest = new URL(endpoint, api);
      dest.search = requested.search;
      const response = await fetch(dest, {...options, credentials:'omit', redirect:'error'});
      if (response.ok) return response;
    }
  } catch (error) { if (options.signal && options.signal.aborted) throw error; }
  if (fallback) return fetch(new URL('data/pages-snapshot/' + fallback, base), {...options, credentials:'same-origin'});
  return new Response(JSON.stringify({ok:false,error:'La consulta en línea requiere el servidor institucional conectado.'}), {status:503,headers:{'Content-Type':'application/json'}});
});

/* Noticias SGA · Portal periodístico independiente de pages.js y news.js.
   Usa las APIs públicas del proyecto, sin generar titulares ni fotografías falsos. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  if (!$('np-lead')) return;
  const SIX_HOURS = 21600000;
  const state = {
    all: [], featuredIds: new Set(), leads: [], archive: [],
    category: 'Todas', language: 'Todas', order: 'mexico', term: '',
    current: 0, visible: 24, paused: false, lastSlot: null,
    nextRefreshMs: 0, pendingFeed: false,
  };
  const photoCache = new Map(), translationCache = new Map();
  const articleIndex = new Map();
  const imageQueue = [], imageScheduled = new WeakSet();
  const inFlightImages = new WeakMap();
  const resolvedPhotos = new Map(); // URL + procedencia validadas para reusar al cambiar destacados
  let activeImages = 0, queueOrder = 0;
  // Dos fotografías simultáneas, exclusivamente en portada.
  const MAX_IMAGES = 2;
  const IMAGE_TIMEOUT_FEATURED = 4800;
  const MAX_PRIMARY_ATTEMPTS = 3;
  const MAX_CONTEXT_ATTEMPTS = 3;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) state.paused = true;

  const https = (url) => typeof url === 'string' && /^https:\/\//i.test(url) ? url : null;
  const newsDate = (date) => {
    const value = new Date(date);
    return Number.isNaN(value.valueOf()) ? 'Fecha no disponible'
      : value.toLocaleDateString('es-MX', {day:'numeric', month:'short', year:'numeric'});
  };
  const newsTime = (date) => {
    const value = new Date(date);
    return Number.isNaN(value.valueOf()) ? 'Sin fecha'
      : value.toLocaleString('es-MX',{timeZone:'America/Mexico_City',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  };
  const el = (tag, cls, txt) => {
    const out = document.createElement(tag);
    if (cls) out.className = cls;
    if (txt !== undefined) out.textContent = String(txt);
    return out;
  };
  function storyLink(story, title) {
    const a=el('a','np-story-link',title);
    if (https(story.url)) {a.href=story.url; a.target='_blank'; a.rel='noopener noreferrer';}
    else {a.href='#contenido-principal';}
    return a;
  }
  function titleOf(s) { return translationCache.get(s.id) || s.title || 'Título no disponible'; }
  function meta(story) {
    return el('p','np-story-meta',`${story.source || 'Medio original'} · ${newsDate(story.date)} · ${(story.lang||'und').toUpperCase()}`);
  }
  function createMedia(story, variant) {
    if (!state.featuredIds.has(story.id) || !['lead','side'].includes(variant)) return document.createDocumentFragment();
    const media = el('div', 'np-media np-media-'+variant);
    media.dataset.storyId = story.id;
    media.dataset.imagePriority = variant === 'lead' ? '0' : '1';
    media.append(el('span','np-media-placeholder','Buscando fotografía real…'));
    observeMedia(media);
    return media;
  }
  function observeMedia(media) {
    window.requestAnimationFrame(() => scheduleImage(media));
  }
  function scheduleImage(media) {
    if (!media.isConnected || !state.featuredIds.has(media.dataset.storyId) || !media.closest(".np-front") || imageScheduled.has(media)) return;
    imageScheduled.add(media);
    imageQueue.push({media, priority:Number(media.dataset.imagePriority), order:queueOrder++});
    // Un elemento del archivo nunca debe adelantarse a una noticia principal.
    imageQueue.sort((a,b) => a.priority-b.priority || a.order-b.order);
    pumpImages();
  }
  function cancelMediaIn(root) {
    if (!root) return;
    root.querySelectorAll('.np-media').forEach(media => {
      const controller = inFlightImages.get(media);
      if (controller) controller.abort();
    });
  }
  function pumpImages() {
    while (activeImages < MAX_IMAGES && imageQueue.length) {
      const {media} = imageQueue.shift();
      if (!media.isConnected) continue;
      activeImages++;
      const controller = new AbortController();
      inFlightImages.set(media,controller);
      paintMedia(media,controller.signal).catch(() => {}).finally(() => {
        inFlightImages.delete(media);
        activeImages--;
        pumpImages();
      });
    }
  }
  async function json(url, timeoutMs = 20000) {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await window.SGAPagesRead(url, {headers:{Accept:'application/json'},cache:'no-store',signal:ac.signal});
      if (!res.ok) throw Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {clearTimeout(timer);}
  }
  function visual(id, part, extra='') {
    const key=id+':'+part+':'+extra;
    const saved=photoCache.get(key);
    if (saved && saved.validUntil>Date.now()) return saved.promise;
    const url=`../api/news-visual.php?id=${encodeURIComponent(id)}&part=${encodeURIComponent(part)}${extra==='search_only'?'&search_only=1':''}`;
    const promise=json(url, part==='translation'?11000:part==='stock'?20000:20000).then(data=>{
      if(!data || data.ok!==true) throw Error('Sin fotografía');
      const hasPicture=Array.isArray(data.photos) && data.photos.some(p=>p && p.type==='externa' && https(p.url));
      photoCache.set(key,{promise:Promise.resolve(data),validUntil:Date.now()+(hasPicture ? SIX_HOURS : 120000)});
      return data;
    }).catch(error=>{photoCache.delete(key);throw error;});
    photoCache.set(key,{promise,validUntil:Date.now()+20000});
    return promise;
  }
  function imageOK(img) {
    const high=Math.max(img.naturalWidth,img.naturalHeight),low=Math.min(img.naturalWidth,img.naturalHeight);
    return high>=1500 && high<=5000 && low>=700;
  }
  function loadPicture(photo, signal, timeoutMs = IMAGE_TIMEOUT_FEATURED) {
    return new Promise(resolve=>{
      if(signal.aborted) {resolve(null);return;}
      const img=new Image();img.decoding='async';img.alt=photo.alt || 'Fotografía de contexto, fuente identificada';
      img.fetchPriority='high';
      let complete=false;
      const onAbort=()=>finish(false);
      const finish=(ok)=>{
        if(complete)return;
        complete=true;
        clearTimeout(timer);
        img.onload=null;img.onerror=null;
        signal.removeEventListener('abort',onAbort);
        if(!ok) img.removeAttribute('src');
        resolve(ok?img:null);
      };
      const timer=window.setTimeout(()=>finish(false),timeoutMs);
      img.onload=()=>finish(imageOK(img));
      img.onerror=()=>finish(false);
      signal.addEventListener('abort',onAbort,{once:true});
      img.src=photo.url;
    });
  }
  function abortable(promise,signal) {
    if(signal.aborted) return Promise.resolve(null);
    return new Promise((resolve,reject)=>{
      const abort=()=>{cleanup();resolve(null);};
      const cleanup=()=>signal.removeEventListener('abort',abort);
      signal.addEventListener('abort',abort,{once:true});
      promise.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
    });
  }
  const usedPhotos = new Map(), pendingPhotos = new Map();
  const photoKey = (photo) => (photo.source_url || photo.url).split('?')[0];
  function uniquePhoto(photo,storyId) {
    const key=photoKey(photo);
    return (!usedPhotos.has(key) || usedPhotos.get(key)===storyId) &&
      (!pendingPhotos.has(key) || pendingPhotos.get(key)===storyId);
  }
  function tryReserve(photo,storyId) {
    if(!uniquePhoto(photo,storyId))return false;
    pendingPhotos.set(photoKey(photo),storyId);
    return true;
  }
  function finishReservation(photo,storyId,valid) {
    const key=photoKey(photo);
    if(pendingPhotos.get(key)===storyId)pendingPhotos.delete(key);
    if(valid)usedPhotos.set(key,storyId);
  }
  function applyPhoto(media,photo,img,local) {
    if(!media.isConnected)return;
    img.className='np-photo';img.loading='eager';
    media.replaceChildren(img);
    const chips=Array.isArray(local)?local.filter(p=>p.type==='pais'||p.type==='organizacion').slice(0,2):[];
    if(chips.length){
      const holder=el('div','np-media-badges');
      chips.forEach(p=>{
        if(typeof p.url!=='string'||!/^\.\.\/img\/gallery_news\//.test(p.url))return;
        const badge=el('img');badge.src=p.url;badge.alt=p.alt||p.name||'Distintivo local';badge.loading='lazy';holder.append(badge);
      });
      if(holder.childNodes.length)media.append(holder);
    }
    const credit=el('span','np-media-credit',photo.is_context?'Fotografía de contexto, no del hecho · ':'Foto asociada al artículo · ');
    const label=[photo.author,photo.provider,photo.license].filter(Boolean).join(' · ');
    const source=https(photo.source_url);
    if(source){
      const a=el('a',null,label || 'Consultar origen y derechos');a.href=source;a.target='_blank';a.rel='noopener noreferrer';credit.append(a);
    } else credit.append(document.createTextNode(label || 'Consultar derechos de uso'));
    const author=https(photo.author_url);
    if(photo.provider==='Unsplash' && author) {
      credit.append(document.createTextNode(' · '));
      const profile=el('a',null,'Fotógrafo');profile.href=author;profile.target='_blank';profile.rel='noopener noreferrer';credit.append(profile);
    }
    media.append(credit);
    usedPhotos.set((photo.source_url || photo.url).split('?')[0],media.dataset.storyId);
    resolvedPhotos.set(media.dataset.storyId,{photo,local});
  }
  async function paintMedia(media,signal) {
    const id=media.dataset.storyId;
    if(!media.isConnected || !id || signal.aborted)return;
    const timeoutMs=IMAGE_TIMEOUT_FEATURED;
    let primary=[];let locals=[];
    const original=articleIndex.get(id);
    const recent=resolvedPhotos.get(id);
    if(recent && tryReserve(recent.photo,id)) {
      const img=await loadPicture(recent.photo,signal,timeoutMs);
      finishReservation(recent.photo,id,!!img);
      if(signal.aborted || !media.isConnected)return;
      if(img){applyPhoto(media,recent.photo,img,recent.local);return;}
      resolvedPhotos.delete(id);
    }
    // Primero la fotografía publicada por el medio. Nunca descargarla dos veces.
    const provided=original && original.editorial_photo;
    let directAttempted=false;
    if(provided && https(provided.url)) {
      directAttempted=true;
      const direct={url:provided.url,source_url:original.url,provider:original.source,
        author:'',license:'Consultar derechos del medio',alt:'Fotografía asociada al artículo original',is_context:false};
      if(tryReserve(direct,id)){
        const picture=await loadPicture(direct,signal,timeoutMs);
        finishReservation(direct,id,!!picture);
        if(signal.aborted || !media.isConnected)return;
        if(picture){applyPhoto(media,direct,picture,[]);return;}
      }
    }
    // La petición PHP puede ser lenta: si el lector cambió de destacado, no bloquea la cola.
    try{
      const data=await abortable(visual(id,'photo',directAttempted?'search_only':''),signal);
      if(!data || signal.aborted || !media.isConnected)return;
      primary=(data.photos||[]).filter(p=>p && p.type==='externa'&&https(p.url));
      locals=(data.photos||[]).filter(p=>p && p.type!=='externa');
    } catch(_) { /* El titular permanece visible. */ }
    for (const photo of primary.slice(0,MAX_PRIMARY_ATTEMPTS)) {
      if(signal.aborted || !media.isConnected)return;
      if(!tryReserve(photo,id))continue;
      const img=await loadPicture(photo,signal,timeoutMs);
      finishReservation(photo,id,!!img);
      if(signal.aborted || !media.isConnected)return;
      if(img){applyPhoto(media,photo,img,locals);return;}
    }
    // Solo después: Commons temático, Pexels y Unsplash (contexto acreditado).
    try {
      const fallback=await abortable(visual(id,'stock'),signal);
      if(!fallback || signal.aborted || !media.isConnected)return;
      for(const photo of (fallback.photos||[]).filter(p=>p.type==='externa'&&https(p.url)).slice(0,MAX_CONTEXT_ATTEMPTS)) {
        if(signal.aborted || !media.isConnected)return;
        if(!tryReserve(photo,id))continue;
        const img=await loadPicture(photo,signal,timeoutMs);
        finishReservation(photo,id,!!img);
        if(signal.aborted || !media.isConnected)return;
        if(img){applyPhoto(media,photo,img,locals);return;}
      }
    } catch(_) {}
    if(!signal.aborted && media.isConnected) {
      const fallback=el('span','np-media-placeholder np-media-no-photo');
      const article=articleIndex.get(id);
      if(article && https(article.url)) {
        const a=el('a',null,'Consultar la noticia y sus fotografías en el medio original ↗');
        a.href=article.url;a.target='_blank';a.rel='noopener noreferrer';
        fallback.append(a);
      } else fallback.textContent='Fotografía externa temporalmente no disponible';
      media.replaceChildren(fallback);
    }
  }

  const translateQueue=[],translationPending=new Set();
  let activeTranslation=false;
  function requestTranslation(story, target) {
    if(!story || ['es','es-419','und'].includes(story.lang) || translationCache.has(story.id) || translationPending.has(story.id))return;
    translationPending.add(story.id);translationQueue.push(story);
    if(target)target.dataset.translatePending='1';
    // En localhost el servidor de PHP puede ser de un solo proceso;
    // las fotos se atienden primero, la traducción llega sin bloquear la portada.
    window.setTimeout(pumpTranslation,3000);
  }
  async function pumpTranslation() {
    if(activeTranslation || !translateQueue.length)return;
    if(activeImages>0){window.setTimeout(pumpTranslation,1700);return;}
    activeTranslation=true;
    const story=translateQueue.shift();
    try {
      const result=await visual(story.id,'translation');
      if(result.title_es && typeof result.title_es==='string' && result.title_es.length<850) {
        translationCache.set(story.id,result.title_es);
        document.querySelectorAll('[data-title-story]').forEach(a=>{
          if(a.dataset.titleStory===story.id)a.textContent=titleOf(story);
        });
      }
    } catch(_){} finally {
      translationPending.delete(story.id); activeTranslation=false;
      if(translateQueue.length)window.setTimeout(pumpTranslation,2500);
    }
  }
  const titleObserver=('IntersectionObserver' in window)
    ? new IntersectionObserver((entries)=>{
      for(const entry of entries)if(entry.isIntersecting){
        titleObserver.unobserve(entry.target);
        const story=articleIndex.get(entry.target.dataset.titleStory);
        requestTranslation(story,entry.target);
      }
    },{rootMargin:'180px 0px'}):null;
  function storyTitle(story,headingTag) {
    const h=el(headingTag,'np-story-title');
    const a=storyLink(story,titleOf(story));
    a.dataset.titleStory=story.id;
    h.append(a);
    if(titleObserver)titleObserver.observe(a);
    else window.requestAnimationFrame(()=>requestTranslation(story,a));
    return h;
  }
  function createLead(story) {
    const article=el('article','np-lead-primary');
    article.append(createMedia(story,'lead'));
    const body=el('div','np-story-content');
    body.append(el('span','np-story-category',story.category||'Medio ambiente'),storyTitle(story,'h3'),meta(story));
    const original=storyLink(story,'Leer noticia en el medio original ↗');original.className='np-story-original';body.append(original);
    article.append(body);return article;
  }
  function createSide(story) {
    const article=el('article','np-side-story');
    article.append(createMedia(story,'side'));
    const body=el('div','np-story-content');
    body.append(el('span','np-story-category',story.category||'Medio ambiente'),storyTitle(story,'h3'),meta(story));
    article.append(body);return article;
  }
  function createCard(story) {
    const article=el('article','np-card');
    article.append(el('span','np-story-category',story.category||'Medio ambiente'),storyTitle(story,'h3'),meta(story));
    return article;
  }
  function renderDots() {
    const dots=$('np-dots');dots.replaceChildren();
    const count=state.leads.length;
    if(!count)return;
    const slots=Math.min(5,count);
    const first=Math.max(0,Math.min(state.current-Math.floor(slots/2),count-slots));
    for(let n=first;n<first+slots;n++) {
      const b=el('button');b.type='button';b.setAttribute('aria-label','Abrir destacado '+(n+1));
      b.setAttribute('aria-current',String(n===state.current));
      b.addEventListener('click',()=>moveLead(n));dots.append(b);
    }
  }
  function renderLead() {
    const lead=$('np-lead'),side=$('np-side-stories');
    cancelMediaIn(lead);cancelMediaIn(side);
    lead.replaceChildren();side.replaceChildren();
    if(!state.leads.length) {
      lead.append(el('p','np-status','No hay titulares destacados en esta categoría.'));
      $('np-prev').disabled=$('np-next').disabled=true;
      $('np-featured-count').textContent='Sin titulares destacados';
      renderDots();return;
    }
    const chosen=state.leads[state.current];
    lead.append(createLead(chosen));
    const others=state.leads.filter(s=>s.id!==chosen.id).slice(state.current,state.current+3);
    if(others.length<3) others.push(...state.leads.filter(s=>s.id!==chosen.id && !others.some(x=>x.id===s.id)).slice(0,3-others.length));
    others.forEach(s=>side.append(createSide(s)));
    $('np-prev').disabled=$('np-next').disabled=state.leads.length<2;
    $('np-featured-count').textContent=`${state.leads.length} titulares destacados`;
    renderDots();
  }
  function moveLead(index) {
    if(!state.leads.length)return;
    state.current=(index+state.leads.length)%state.leads.length;
    renderLead();
  }
  function archiveResults() {
    const term=state.term.toLocaleLowerCase('es-MX');
    let items=state.archive.filter(s=>{
      const matchesLang=state.language==='Todas'||state.language===s.lang;
      const text=[s.title,translationCache.get(s.id),s.source,s.category].join(' ').toLocaleLowerCase('es-MX');
      return matchesLang&&(!term||text.includes(term));
    });
    if(state.order==='date')items=items.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    else items=items.slice().sort((a,b)=>(Number(b.interest_score)||0)-(Number(a.interest_score)||0)||String(b.date).localeCompare(String(a.date)));
    return items;
  }
  let archiveRenderedIds=[];
  function renderArchive() {
    const filtered=archiveResults();
    const shown=filtered.slice(0,state.visible);
    const cards=$('np-cards');
    const unchangedPrefix=archiveRenderedIds.length<=shown.length && archiveRenderedIds.every((id,i)=>id===shown[i].id);
    if(!unchangedPrefix || (!archiveRenderedIds.length && cards.firstElementChild)){
      cancelMediaIn(cards);cards.replaceChildren();archiveRenderedIds=[];
    }
    shown.slice(archiveRenderedIds.length).forEach(story=>cards.append(createCard(story)));
    archiveRenderedIds=shown.map(story=>story.id);
    $('np-archive-total').textContent=`${state.archive.length} noticias en el archivo`;
    $('np-archive-status').textContent=filtered.length?
      `Mostrando ${Math.min(state.visible,filtered.length)} de ${filtered.length} artículos del listado${state.language==='Todas'?'': ' · '+state.language.toUpperCase()}.`:
      'No se encontraron artículos con estos filtros. Prueba otra palabra o idioma.';
    const more=$('np-load-more');more.hidden=filtered.length<=state.visible;
    if(!filtered.length)cards.append(el('p','np-status','No hay noticias con esos filtros.'));
  }
  function renderPriorities() {
    const box=$('np-priority');box.replaceChildren();
    [...state.all].sort((a,b)=>(Number(b.interest_score)||0)-(Number(a.interest_score)||0))
      .slice(0,5).forEach(s=>{
        const li=el('li');li.append(storyLink(s,s.title||'Artículo de interés'));
        li.append(el('small',null,`${s.category||'Ambiente'} · ${s.source||'Medio original'}`));box.append(li);
      });
  }
  function updateLanguageOptions() {
    const select=$('np-language'),previous=state.language;
    const langs=[...new Set(state.archive.map(s=>s.lang).filter(Boolean))].sort();
    select.replaceChildren(new Option('Todos los idiomas disponibles','Todas'));
    langs.forEach(lang=>select.append(new Option(lang.toUpperCase(),lang)));
    if(langs.includes(previous))select.value=previous;
    else {state.language='Todas';select.value='Todas';}
  }
  function renderTicker() {
    const strip=$('np-headline-strip');strip.replaceChildren();
    const latest=[...state.all].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,6);
    latest.forEach(s=>{
      const a=storyLink(s,s.title);a.title=`${s.source} · ${newsTime(s.date)}`;strip.append(a);
    });
  }
  function reconcileView() {
    const inCategory=state.category==='Todas'?state.all:state.all.filter(s=>s.category===state.category);
    let leaders=inCategory.filter(s=>state.featuredIds.has(s.id)).slice(0,40);
    state.leads=leaders;
    const leaderIDs=new Set(leaders.map(s=>s.id));
    state.archive=inCategory.filter(s=>!leaderIDs.has(s.id));
    state.current=Math.min(state.current,Math.max(0,state.leads.length-1));
    updateLanguageOptions();renderLead();renderArchive();renderPriorities();renderTicker();
  }
  function setStatus(message,show) {
    $('np-global-status').textContent=message;
    $('np-global-status').hidden=show===false;
  }
  async function fetchFeed(force=false) {
    if(state.pendingFeed)return;
    state.pendingFeed=true;
    if(!force || !state.all.length) setStatus('Consultando titulares reales publicados por medios periodísticos...',true);
    try {
      const data=await json('../api/news.php'+(force?'?refresh=1':''),force?28000:22000);
      if(!Array.isArray(data.items))throw Error('La API no devolvió una lista de noticias.');
      if(!data.items.length) {
        if(data.scheduled_only) state.nextRefreshMs=Date.now()+60000;
        throw Error(data.scheduled_only?'La edición programada aún no está disponible.':'Sin noticias recibidas. Comprueba PHP, conexión a RSS y api/news.php.');
      }
      state.all=data.items.filter(s=>s&&typeof s.id==='string'&&typeof s.title==='string'&&https(s.url)).slice(0,500);
      articleIndex.clear();state.all.forEach(s=>articleIndex.set(s.id,s));
      state.featuredIds=new Set((data.featured_ids||state.all.slice(0,40).map(s=>s.id)));
      state.lastSlot=data.slot??null;
      state.nextRefreshMs=data.static_snapshot?Date.now()+SIX_HOURS:(Date.parse(data.next_refresh||'')||Date.now()+SIX_HOURS);
      $('np-updated').textContent=newsTime(data.updated||Date.now());
      $('np-next-update').textContent=data.static_snapshot?'Edición guardada · requiere conexión o nueva publicación para actualizar':`Próxima revisión: ${newsTime(state.nextRefreshMs)}`;
      setStatus(`Edición ${data.static_snapshot?'guardada · ':data.stale?'en caché · ':''}${state.all.length} noticias recuperadas de medios del catálogo · ${new Set(state.all.map(s=>s.lang)).size} idiomas presentes.`,true);
      $('np-global-status').classList.toggle('is-stale',!!data.stale);
      reconcileView();
      if(data.static_snapshot) return;
      if(data.stale && data.scheduled_only) state.nextRefreshMs=Date.now()+60000;
      else if(data.stale && !force) scheduleDeferredRefresh();
    } catch (error) {
      const readable=error.name==='AbortError'?'La consulta tardó demasiado.':error.message;
      setStatus(`No se pudieron recuperar las noticias: ${readable} Revisa la conexión y los registros de PHP.`,true);
      if(!state.all.length){
        $('np-lead').replaceChildren(el('p','np-status','No se publican titulares ficticios. Recarga cuando la conexión al servidor esté disponible.'));
        $('np-side-stories').replaceChildren();
        $('np-cards').replaceChildren();
        $('np-archive-status').textContent='La consulta no devolvió artículos reales.';
      }
    } finally {state.pendingFeed=false;}
  }
  let refreshQueued=false;
  function scheduleDeferredRefresh() {
    if(refreshQueued)return;
    refreshQueued=true;
    let tries=0;
    const tryRefresh=()=>{
      if(document.hidden || state.pendingFeed || activeImages>0) {
        if(++tries<16) {window.setTimeout(tryRefresh,3000);return;}
      }
      refreshQueued=false;
      fetchFeed(true);
    };
    // Publicar primero la edición anterior y sus fotografías; renovar después.
    window.setTimeout(tryRefresh,18000);
  }
  $('np-dateline').textContent=new Date().toLocaleDateString('es-MX',{timeZone:'America/Mexico_City',weekday:'long',day:'numeric',month:'long',year:'numeric'});
  $('np-sections').querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{
    state.category=button.dataset.topic;
    state.current=0;state.visible=24;
    $('np-sections').querySelectorAll('[data-topic]').forEach(b=>{
      b.classList.toggle('is-active',b===button);
      b.setAttribute('aria-pressed',String(b===button));
    });
    reconcileView();
  }));
  $('np-prev').addEventListener('click',()=>moveLead(state.current-1));
  $('np-next').addEventListener('click',()=>moveLead(state.current+1));
  $('np-pause').addEventListener('click',()=>{
    state.paused=!state.paused;
    $('np-pause').textContent=state.paused?'Reanudar rotación':'Pausar rotación';
    $('np-pause').setAttribute('aria-pressed',String(state.paused));
  });
  $('np-search').addEventListener('input',event=>{state.term=event.target.value.trim();state.visible=24;renderArchive();});
  $('np-language').addEventListener('change',event=>{state.language=event.target.value;state.visible=24;renderArchive();});
  $('np-order').addEventListener('change',event=>{state.order=event.target.value;state.visible=24;renderArchive();});
  $('np-load-more').addEventListener('click',()=>{state.visible+=24;renderArchive();});
  document.addEventListener('keydown',event=>{
    if(!(event.target instanceof HTMLElement) || event.target.closest('input,select,textarea,button'))return;
    if(event.key==='ArrowRight')moveLead(state.current+1);
    if(event.key==='ArrowLeft')moveLead(state.current-1);
  });
  window.setInterval(()=>{
    if(!state.paused && state.leads.length>1 && !document.hidden)moveLead(state.current+1);
  },9500);
  window.setInterval(()=>{
    if(state.nextRefreshMs && Date.now()>=state.nextRefreshMs && !state.pendingFeed)fetchFeed(true);
  },60000);
  if(reducedMotion) {$('np-pause').textContent='Reanudar rotación';$('np-pause').setAttribute('aria-pressed','true');}
  fetchFeed();
})();
