
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

/* Noticias SGA 2026: norma fotográfica para banner y listado, traducción y atribuciones. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const slide = $('#news-slide');
  const list = $('#news');
  const status = $('#news-status');
  const dots = $('#news-dots');
  const position = $('#news-position');
  const languageSelect = $('#news-language');
  const orderSelect = $('#news-order');
  const prevButton = $('#news-prev');
  const nextButton = $('#news-next');
  const resultCache = new Map();
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  // La misma norma fotográfica rige para las 40 destacadas y las 460 fichas.
  // El tamaño se comprueba sobre los píxeles realmente cargados, no solo metadatos.
  const validPhotoSize = (img) => {
    const largest = Math.max(img.naturalWidth, img.naturalHeight);
    const smallest = Math.min(img.naturalWidth, img.naturalHeight);
    return largest >= 1500 && largest <= 5000 && smallest >= 700;
  };
  const photoQueue = [];
  let pendingPhotoLoads = 0;
  const MAX_CONCURRENT_PHOTOS = 2;
  let archivePhotoObserver = null;
  function enqueueArchivePhoto(card) {
    if (!card.isConnected || card.dataset.photoQueued === '1' || !card.__sgaPhotoLoad) return;
    card.dataset.photoQueued = '1';
    photoQueue.push({card, run:card.__sgaPhotoLoad});
    pumpPhotoQueue();
  }
  function loadNearbyArchivePhotos() {
    const bottom = window.innerHeight + 240;
    document.querySelectorAll('#news .news-item').forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.bottom >= -240 && rect.top <= bottom) enqueueArchivePhoto(card);
    });
  }
  window.addEventListener('scroll', loadNearbyArchivePhotos, {passive:true});
  window.addEventListener('resize', loadNearbyArchivePhotos);
  const pumpPhotoQueue = () => {
    while (pendingPhotoLoads < MAX_CONCURRENT_PHOTOS && photoQueue.length) {
      const task = photoQueue.shift();
      if (!task.card.isConnected) continue;
      pendingPhotoLoads += 1;
      task.run().catch(() => {}).finally(() => {
        pendingPhotoLoads -= 1;
        pumpPhotoQueue();
      });
    }
  };
  function archivePhotoLoader(card, item, container) {
    const fallback = (message) => {
      if (!card.isConnected) return;
      container.replaceChildren(node('span', 'news-card-photo-message', message));
      container.classList.add('no-external-photo');
    };
    const start = async () => {
      if (!card.isConnected) return;
      let data;
      try { data = await loadVisual(item.id, 'photo'); }
      catch (_) { data = {photos: []}; }
      if (!card.isConnected) return;
      const images = Array.isArray(data.photos)
        ? data.photos.filter(p => p && p.type === 'externa' && /^https:\/\//i.test(p.url || '')).slice(0, 3)
        : [];
      // Para el listado se aplica el MISMO último recurso que al banner, pero
      // solo después de haber descartado las fotografías principales.
      let stockChecked = false;
      let position = 0;
      while (card.isConnected) {
        if (position >= images.length) {
          if (stockChecked) break;
          stockChecked = true;
          try {
            const response = await loadVisual(item.id, 'stock');
            const extra = Array.isArray(response.photos)
              ? response.photos.filter(p => p && p.type === 'externa' && /^https:\/\//i.test(p.url || '')).slice(0, 2) : [];
            images.push(...extra);
          } catch (_) { /* Mantener respaldo neutro. */ }
          if (position >= images.length) break;
        }
        const photo = images[position++];
        if (!card.isConnected) return;
        const img = node('img', 'news-card-photo-image');
        img.alt = photo.alt || 'Fotografía contextual de la noticia';
        // La imagen se precarga antes de añadirla al DOM para comprobar
        // sus dimensiones: loading=lazy en una imagen desconectada puede
        // impedir que el navegador comience la descarga.
        img.loading = 'eager';
        img.decoding = 'async';
        // Un host bloqueado o una imagen que nunca responde no debe atascar
        // el resto del listado: máximo 8 s antes de probar otra candidata.
        const worked = await new Promise(resolve => {
          let finished = false;
          const finish = (valid) => {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            img.onload = img.onerror = null;
            if (!valid) img.removeAttribute('src');
            resolve(valid);
          };
          const timeout = setTimeout(() => finish(false), 11500);
          img.onload = () => finish(validPhotoSize(img));
          img.onerror = () => finish(false);
          img.src = photo.url;
        });
        if (!worked || !card.isConnected) continue;
        const attribution = node('small', 'news-card-photo-credit');
        attribution.textContent = photo.is_context
          ? 'Fotografía contextual o histórica · ' + (photo.provider || 'Fuente externa')
          : 'Fotografía del artículo · ' + (photo.provider || 'Medio periodístico');
        const origin = /^https:\/\//i.test(photo.source_url || '')
          ? document.createElement('a') : null;
        if (origin) {
          origin.href = photo.source_url;
          origin.textContent = ' · fuente y derechos ↗';
          origin.target = '_blank';
          origin.rel = 'noopener noreferrer';
          attribution.append(origin);
        }
        container.replaceChildren(img, attribution);
        container.classList.remove('no-external-photo');
        container.classList.add('has-external-photo');
        return;
      }
      fallback('Sin fotografía verificada');
    };
    card.__sgaPhotoLoad = start;
    if (archivePhotoObserver) archivePhotoObserver.observe(card);
    // Respaldo ligero para dispositivos o navegadores que no disparan el observer.
    // También funciona cuando la tarjeta ya estaba visible al inicializarse.
    requestAnimationFrame(loadNearbyArchivePhotos);
  }
  if ('IntersectionObserver' in window) {
    archivePhotoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        archivePhotoObserver.unobserve(entry.target);
        enqueueArchivePhoto(entry.target);
      });
      pumpPhotoQueue();
    }, {rootMargin: '240px 0px'});
  }
  let lastFeedSlot = -1;
  let nextRetryAt = 0;
  let feedBusy = false;
  let all = [];
  let filtered = []; // Exclusivamente las noticias destacadas (máximo 40).
  let filteredArchive = []; // Hasta 460 noticias adicionales, sin duplicados.
  let featuredIds = new Set();
  let visibleArchive = 24;
  const listSummary = $('#news-list-status');
  const loadMoreButton = $('#news-load-more');
  // Texto y aspecto definidos aquí para no depender de versiones anteriores de pages.js.
  if (loadMoreButton) loadMoreButton.textContent = 'Mostrar 24 noticias más';
  const totalSummary = $('#news-total-summary');
  let index = 0;
  let timer = null;
  let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function link(item, className, text) {
    const a = node('a', className, text);
    a.href = item.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.lang = item.lang;
    return a;
  }

  function languageName(code) {
    try {
      return new Intl.DisplayNames(['es'], {type:'language'}).of(code) || code;
    } catch (_) { return code; }
  }

  function renderLanguageOptions() {
    const selected = languageSelect.value;
    const codes = [...new Set(all.map(item => item.lang).filter(Boolean))].sort((a,b) =>
      languageName(a).localeCompare(languageName(b),'es'));
    languageSelect.replaceChildren();
    const every = node('option','',`Todos los disponibles (${codes.length})`);
    every.value = 'Todas';
    languageSelect.append(every);
    for (const code of codes) {
      const opt = node('option','',`${languageName(code)} (${code})`);
      opt.value = code;
      languageSelect.append(opt);
    }
    languageSelect.value = codes.includes(selected) ? selected : 'Todas';
  }

  function date(value) {
    const d = new Date(value);
    if (Number.isNaN(d.valueOf())) return value;
    return new Intl.DateTimeFormat('es-MX', {dateStyle: 'medium'}).format(d);
  }

  function loadVisual(id, part) {
    const key = id + ':' + part;
    const cached = resultCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.promise;
    if (cached) resultCache.delete(key);
    const request = window.SGAPagesRead('../api/news-visual.php?id=' + encodeURIComponent(id) +
      '&part=' + encodeURIComponent(part), {headers: {Accept: 'application/json'}, cache: 'no-store'})
      .then(response => {
        if (!response.ok) throw Error('HTTP ' + response.status);
        return response.json();
      })
      .then(data => {
        if (!data.ok) throw Error('No disponible');
        const hasExternal = Array.isArray(data.photos) &&
          data.photos.some(p => p && p.type === 'externa' && p.url);
        // Una búsqueda sin fotografía se puede volver a probar rápidamente.
        const keepFor = (part === 'photo' || part === 'stock') && !hasExternal
          ? 90 * 1000 : SIX_HOURS;
        resultCache.set(key, {promise: Promise.resolve(data), expires: Date.now() + keepFor});
        return data;
      }).catch(error => {
        resultCache.delete(key);
        throw error;
      });
    resultCache.set(key, {promise: request, expires: Date.now() + 120000});
    return request;
  }

  function currentId() {
    return filtered.length && filtered[index] ? filtered[index].id : null;
  }

  // Muestra cinco puntos como máximo, centrados en el índice actual.
  // Cada punto es accesible y permite saltar a una noticia concreta.
  function renderDots() {
    dots.replaceChildren();
    const total = filtered.length;
    const count = Math.min(5, total);
    const start = Math.max(0, Math.min(index - Math.floor(count / 2), total - count));
    position.textContent = total ? `Noticia ${index + 1} de ${total}` : 'Sin noticias disponibles';
    prevButton.disabled = nextButton.disabled = total < 2;
    $('#news-pause').disabled = total < 2;
    for (let pos = start; pos < start + count; pos++) {
      const dot = node('button', 'news-dot');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Ir a la noticia ${pos + 1} de ${total}`);
      dot.title = `Noticia ${pos + 1} de ${total}`;
      if (pos === index) {
        dot.classList.add('is-active');
        dot.setAttribute('aria-current', 'true');
      }
      dot.addEventListener('click', () => {
        if (pos === index) return;
        index = pos;
        show();
        autoplay();
      });
      dots.append(dot);
    }
  }

  function show() {
    renderDots();
    slide.replaceChildren();
    if (!filtered.length) {
      slide.append(node('p', 'news-empty', 'No hay noticias para esta búsqueda.'));
      return;
    }
    const item = filtered[index];
    const article = node('article', 'news-feature');
    // No mostrar un globo ilustrado en noticias reales. Si no hay foto, fondo neutro.
    article.style.backgroundImage = 'none';
    article.style.backgroundColor = '#112943';
    const media = node('div', 'news-feature-media');
    article.append(media);
    const info = node('div', 'news-feature-info');
    const tag = node('span', 'news-tag', item.category + ' · ' + item.lang.toUpperCase());
    const headline = link(item, 'news-headline', item.title);
    const meta = node('p', 'news-meta', item.source + ' · ' + date(item.date));
    const relevance = item.interest_theme ? node('p', 'news-interest-note',
      'Tema de interés para México: ' + item.interest_theme) : null;
    info.append(tag, headline, meta);
    if (relevance) info.append(relevance);
    info.append(link(item, 'news-open', 'Leer noticia original ↗'));
    article.append(info);
    const credit = node('p', 'news-photo-caption');
    credit.hidden = false;
    credit.textContent = 'Buscando fotografía real relacionada con la noticia…';
    slide.append(article, credit);

    const stillCurrent = () => currentId() === item.id && article.parentNode === slide;
    const applyTranslation = data => {
      if (!stillCurrent()) return;
      if (data && data.translated && data.title_es) {
        headline.textContent = data.title_es;
        headline.lang = 'es';
        tag.textContent = item.category + ' · ES (original: ' + item.lang.toUpperCase() + ')';
      }
    };
    const applyPhoto = data => {
      if (!stillCurrent()) return;
      const photos = data && Array.isArray(data.photos) ? data.photos : [];
      const external = photos.filter(p => p && p.type === 'externa' && /^https:\/\//i.test(p.url || ''));
      const local = photos.filter(p => p && (p.type === 'pais' || p.type === 'organizacion'));
      let displayedExternal = null;
      const badgeNames = [];
      const renderCredits = () => {
        if (!stillCurrent()) return;
        credit.replaceChildren();
        if (!displayedExternal && !badgeNames.length) {
          credit.hidden = false;
          credit.textContent = 'No se encontró una fotografía verificable de este tema y lugar. Se mantiene un fondo neutro.';
          return;
        }
        credit.hidden = false;
        if (displayedExternal) {
          credit.append(document.createTextNode('Fotografía de contexto o archivo; no necesariamente muestra este acontecimiento. ' +
            (displayedExternal.provider || 'Fuente externa') +
            (displayedExternal.license ? ' · ' + displayedExternal.license : '') +
            (displayedExternal.author ? ' · Autor: ' + displayedExternal.author : '') + ' · '));
          if (/^https:\/\//i.test(displayedExternal.author_url || '')) {
            const authorLink = node('a', '', 'Perfil del fotógrafo ↗');
            authorLink.href = displayedExternal.author_url;
            authorLink.target = '_blank';
            authorLink.rel = 'noopener noreferrer';
            credit.append(authorLink, document.createTextNode(' · '));
          }
          if (/^https:\/\//i.test(displayedExternal.source_url || '')) {
            const a = node('a', '', 'Consultar fuente y derechos ↗');
            a.href = displayedExternal.source_url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            credit.append(a);
          }
        }
        if (badgeNames.length) {
          if (displayedExternal) credit.append(document.createTextNode(' · '));
          credit.append(document.createTextNode('Catálogo local: ' + badgeNames.join(' · ')));
        }
      };
      // Conserva las banderas y sedes como distintivos; NO sustituyen la foto principal.
      local.slice(0, 3).forEach((photo, number) => {
        const img = node('img', 'news-feature-photo is-local');
        img.style.setProperty('--badge-offset', (20 + number * 148) + 'px');
        img.alt = photo.alt || photo.name;
        img.loading = 'eager';
        img.decoding = 'async';
        img.onload = () => {
          if (!stillCurrent()) return;
          article.classList.add('has-context');
          badgeNames.push((photo.type === 'pais' ? 'Bandera: ' : 'Sede: ') + photo.name);
          renderCredits();
        };
        img.onerror = () => img.remove();
        media.append(img);
        img.src = photo.url;
      });
      // Pexels y Unsplash: únicamente si FALLAN las fotos principales.
      // Si tampoco se valida una de ellas, queda el fondo azul neutro.
      let stockRequested = false;
      const tryStockAsLastResort = () => {
        if (!stillCurrent() || stockRequested || displayedExternal) return;
        stockRequested = true;
        loadVisual(item.id, 'stock').then(response => {
          if (!stillCurrent() || displayedExternal) return;
          const photos = Array.isArray(response.photos) ? response.photos : [];
          const stock = photos.filter(p => p && p.type === 'externa' && /^https:\/\//i.test(p.url || ''));
          external.push(...stock);
          if (stock.length) tryExternal(external.length - stock.length);
          else renderCredits();
        }).catch(() => { if (stillCurrent()) renderCredits(); });
      };
      // Solo una fotografía externa válida por noticia. Si falla, probar la siguiente.
      const tryExternal = (number) => {
        if (!stillCurrent()) return;
        if (number >= external.length) { tryStockAsLastResort(); renderCredits(); return; }
        const photo = external[number];
        const img = node('img', 'news-feature-photo is-external');
        img.alt = photo.alt || 'Fotografía ambiental contextual';
        img.decoding = 'async';
        let settled = false;
        const settle = (accepted) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          img.onload = img.onerror = null;
          if (!stillCurrent()) return;
          if (!accepted) {tryExternal(number + 1); return;}
          media.prepend(img);
          displayedExternal = photo;
          article.classList.add('has-photo', 'has-external');
          renderCredits();
        };
        // Una URL que no responde nunca no debe congelar la búsqueda del banner.
        const timeout = setTimeout(() => settle(false), 11500);
        img.onload = () => settle(validPhotoSize(img));
        img.onerror = () => settle(false);
        img.src = photo.url;
      };
      tryExternal(0);
    };
    // Las imágenes no bloquean la traducción; el título cambia en cuanto esté listo.
    loadVisual(item.id, 'photo').then(applyPhoto).catch(() => {
      // Incluso si falla el servicio principal, el último recurso se solicita
      // una sola vez. Sin claves o coincidencias verificables queda fondo neutro.
      if (stillCurrent()) applyPhoto({photos:[]});
    });
    // No bloquear la búsqueda de imagen por el traductor remoto.
    loadVisual(item.id, 'translation').then(applyTranslation).catch(() => {});
  }

  function renderArchive() {
    if (archivePhotoObserver) archivePhotoObserver.disconnect();
    list.replaceChildren();
    const visible = filteredArchive.slice(0, visibleArchive);
    // Mantener siempre el título en el idioma original de su periódico.
    visible.forEach(item => {
      const card = node('article', 'news-item');
      const imageBox = node('div', 'news-card-photo no-external-photo');
      imageBox.setAttribute('aria-label', 'Fotografía ambiental contextual, cuando esté disponible');
      imageBox.append(node('span', 'news-card-photo-message', 'Buscando fotografía real…'));
      card.append(imageBox);
      card.append(
        node('span', 'news-tag', item.category + ' · ' + languageName(item.lang)),
        link(item, 'news-item-title', item.title),
        node('p', 'news-meta', item.source + ' · ' + date(item.date)),
        node('p', 'news-item-interest', item.interest_theme ? 'Interés para México: ' + item.interest_theme : 'Actualidad ambiental'),
        link(item, 'news-item-link', 'Ir a la noticia ↗')
      );
      list.append(card);
      archivePhotoLoader(card, item, imageBox);
    });
    if (!filteredArchive.length) {
      list.append(node('p', 'news-empty', 'No hay más noticias que coincidan con los filtros.'));
    }
    listSummary.textContent = `Mostrando ${visible.length} de ${filteredArchive.length} noticias adicionales`;
    loadMoreButton.hidden = visible.length >= filteredArchive.length;
    requestAnimationFrame(loadNearbyArchivePhotos);
  }

  function filter(keepId = null, keepPage = false) {
    const category = $('#category').value;
    const language = languageSelect.value;
    const order = orderSelect.value;
    const query = $('#search').value.trim().toLocaleLowerCase();
    const matches = item =>
      (category === 'Todas' || item.category === category) &&
      (language === 'Todas' || item.lang === language) &&
      (!query || (item.title + ' ' + item.source + ' ' + item.lang + ' ' +
        (item.interest_theme || '')).toLocaleLowerCase().includes(query));
    const sortNews = (a,b) => order === 'date'
      ? new Date(b.date) - new Date(a.date)
      : (Number(b.interest_score || 0) - Number(a.interest_score || 0)) ||
        (new Date(b.date) - new Date(a.date));
    filtered = all.filter(item => featuredIds.has(item.id) && matches(item)).sort(sortNews);
    filteredArchive = all.filter(item => !featuredIds.has(item.id) && matches(item)).sort(sortNews);
    index = Math.max(0, filtered.findIndex(item => item.id === keepId));
    if (!keepPage) visibleArchive = 24;
    totalSummary.textContent = `${all.length} noticias disponibles (máximo 500): ` +
      `${all.filter(item => featuredIds.has(item.id)).length} destacadas en el banner y ` +
      `${all.filter(item => !featuredIds.has(item.id)).length} adicionales. ` +
      `Con los filtros actuales: ${filtered.length} destacadas y ${filteredArchive.length} adicionales.`;
    show();
    renderArchive();
  }

  loadMoreButton.addEventListener('click', () => {
    visibleArchive += 24;
    renderArchive();
  });

  function advance(step) {
    if (!filtered.length) return;
    index = (index + step + filtered.length) % filtered.length;
    show();
  }
  function autoplay() {
    clearInterval(timer);
    if (!paused && !document.hidden && filtered.length > 1) {
      timer = setInterval(() => advance(1), 20000);
    }
  }
  prevButton.addEventListener('click', () => {advance(-1); autoplay();});
  nextButton.addEventListener('click', () => {advance(1); autoplay();});
  $('#news-pause').addEventListener('click', () => {
    paused = !paused;
    $('#news-pause').textContent = paused ? 'Reanudar' : 'Pausar';
    $('#news-pause').setAttribute('aria-pressed', String(paused));
    autoplay();
  });
  $('#category').addEventListener('change', () => {filter(); autoplay();});
  languageSelect.addEventListener('change', () => {filter(); autoplay();});
  orderSelect.addEventListener('change', () => {filter(); autoplay();});
  $('#search').addEventListener('input', () => {filter(); autoplay();});
  // Se comprueba el corte del servidor cada minuto, no seis horas después
  // de abrir la página. Esto también actualiza una pestaña que estuvo inactiva.
  const currentSlot = () => Math.floor(Date.now() / SIX_HOURS);
  function checkFeedRotation() {
    if (!document.hidden && currentSlot() !== lastFeedSlot && Date.now() >= nextRetryAt)
      refreshFeed();
  }
  document.addEventListener('visibilitychange', () => {
    autoplay();
    checkFeedRotation();
  });

  function refreshFeed() {
    if (feedBusy) return;
    feedBusy = true;
    window.SGAPagesRead('../api/news.php', {headers: {Accept: 'application/json'}, cache: 'no-store'})
      .then(response => {
        if (!response.ok) throw Error('HTTP ' + response.status);
        return response.json();
      })
      .then(data => {
        const incoming = (data.items || []).filter(item => item.id && item.title && item.url && item.date && item.source);
        if (!incoming.length) throw Error('Sin artículos disponibles');
        const previousId = currentId();
        const wasChanged = all.length !== incoming.length ||
          all.some((item, i) => item.id !== incoming[i].id);
        all = incoming.slice(0, 500);
        // Compatibilidad con cachés antiguas durante la primera actualización.
        const validIds = new Set(all.map(item => item.id));
        const featured = Array.isArray(data.featured_ids) ? data.featured_ids :
          all.slice(0, 40).map(item => item.id);
        featuredIds = new Set(featured.filter(id => validIds.has(id)).slice(0, 40));
        renderLanguageOptions();
        if (data.stale) {
          // Reintentar sin sobrecargar el servidor cuando los proveedores fallen.
          nextRetryAt = Date.now() + 5 * 60 * 1000;
        } else {
          lastFeedSlot = Number.isInteger(data.slot) ? data.slot : currentSlot();
          nextRetryAt = 0;
        }
        if (wasChanged) resultCache.clear();
        const changed = Number.isInteger(data.changed_count) ? data.changed_count : null;
        const reused = Number.isInteger(data.reused_count) ? data.reused_count : null;
        status.textContent = data.stale
          ? 'No se pudo renovar el lote: permanecen noticias anteriores verificadas. Se reintentará en unos minutos.'
          : `Lote completo revisado cada 6 horas (00:00, 06:00, 12:00 y 18:00, Ciudad de México). ` +
            (changed !== null && reused !== null
              ? `${changed} diferentes del lote anterior; ${reused} conservadas porque no hubo suficientes alternativas. `
              : '') +
            `${new Set(all.map(item => item.lang)).size} idiomas presentes. ` +
            'Traducción al español cuando el servicio está disponible; el artículo original se conserva.';
        filter(wasChanged ? null : previousId);
        autoplay();
      })
      .catch(() => {
        nextRetryAt = Date.now() + 5 * 60 * 1000;
        // Si hay titulares anteriores válidos, conservamos el carrusel.
        if (all.length) {
          status.textContent = 'No se pudieron actualizar las noticias; se mantienen las últimas disponibles.';
          return;
        }
        status.textContent = 'No se pudo recuperar el RSS. Se necesita un servidor PHP con conexión a Internet.';
        slide.replaceChildren(node('p', 'news-empty', 'Servicio de noticias temporalmente no disponible.'));
        filtered = [];
        renderDots();
        list.replaceChildren();
        listSummary.textContent = 'No hay noticias disponibles.';
        totalSummary.textContent = '';
        loadMoreButton.hidden = true;
        [
          ['PNUMA', 'https://www.unep.org/news-and-stories'],
          ['ONU Cambio Climático', 'https://unfccc.int/news'],
          ['SEMARNAT', 'https://www.gob.mx/semarnat']
        ].forEach(([name, url]) => {
          const a = node('a', 'news-item-link', name + ' ↗');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          list.append(a);
        });
      }).finally(() => {feedBusy = false;});
  }
  refreshFeed();
  // Revisión frecuente de corte; el servidor realiza la actualización real
  // SOLO una vez por cada bloque de seis horas gracias a su caché.
  setInterval(checkFeedRotation, 60 * 1000);
})();
