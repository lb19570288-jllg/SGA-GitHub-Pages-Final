
/* Copia estática: consultas públicas al cPanel, con respaldo local para noticias y biblioteca. */
window.SGAPagesRead = window.SGAPagesRead || (async function (relative, options = {}) {
  const requested = new URL(relative, location.href);
  const endpoint = requested.pathname.split('/').pop();
  const base = new URL('../', location.href);
  const fallback = {'news.php':'news.json', 'library.php':'library.json'}[endpoint];
  // Esta copia de GitHub Pages tiene su propia edición quincenal.
  if (endpoint === 'library.php') return fetch(new URL('data/pages-snapshot/library.json', base), {...options, cache:'no-cache', credentials:'same-origin'});
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

(() => {
  const content = document.querySelector('#page-content');
  if (!content) return;
  const section = document.createElement('section');
  section.className = 'research-section detail-block';
  section.innerHTML = `<section class="library-catalogues" aria-labelledby="library-catalogues-title">
    <div class="research-heading"><span class="eyebrow">LIBROS · MEDIO AMBIENTE Y SOSTENIBILIDAD</span>
      <h2 id="library-catalogues-title">Estantería de libros ambientales</h2>
      <p>Explora portadas, títulos, autores y temas sin salir de esta Biblioteca. La selección de libros, ensayos e investigaciones se revisa cada 15 días. Los registros sin portada conservan su ficha bibliográfica. Las fichas de OpenLibro corresponden a libros publicados en su catálogo; las otras estanterías contienen selecciones bibliográficas contrastadas en Open Library, sin afirmar su disponibilidad en Anna's Archive o Z-Library.</p>
    </div>
    <div class="library-books-toolbar">
      <div class="library-books-filters" role="group" aria-label="Filtrar por colección">
        <button type="button" data-book-source="all" aria-pressed="true">Todas</button>
        <button type="button" data-book-source="openlibrary" aria-pressed="false">Open Library</button>
        <button type="button" data-book-source="openlibro" aria-pressed="false">OpenLibro</button>
        <button type="button" data-book-source="anna" aria-pressed="false">Anna's Archive</button>
        <button type="button" data-book-source="zlibrary" aria-pressed="false">Z-Library</button>
      </div>
      <label>Buscar libro <input id="library-book-search" type="search" maxlength="90" placeholder="Título, autor, tema…" autocomplete="off"></label>
      <label>Temática <select id="library-book-topic"><option value="all">Todas</option><option value="agua">Agua</option><option value="energia">Energía</option><option value="biodiversidad">Biodiversidad</option><option value="residuos">Residuos y reciclaje</option><option value="clima">Cambio climático</option><option value="urbano">Entorno urbano</option><option value="sociedad">Sociedad</option><option value="politica">Política ambiental</option></select></label>
    </div>
    <p class="library-books-count" id="library-books-count" role="status">Cargando estantería ambiental…</p>
    <p class="library-books-count" id="library-books-refresh" role="status"></p>
    <div class="library-book-grid" id="library-book-grid"></div>
  </section>
  <div class="research-heading"><span class="eyebrow">ENSAYOS Y ESTUDIOS DESTACADOS</span><h2>Selección rotativa de ensayos ambientales</h2><p id="featured-essays-status" class="notice" role="status">Preparando recomendaciones de acceso abierto…</p></div><div class="research-results" id="featured-essays-grid"></div>
  <div class="research-heading"><span class="eyebrow">INVESTIGACIÓN ABIERTA · UNIVERSIDADES DEL MUNDO</span><h2>Explorador internacional de investigaciones ambientales</h2><p>Encuentra publicaciones académicas de acceso abierto sobre medio ambiente, reciclaje, biodiversidad, energía y agua. Se muestran títulos en el idioma original cuando el catálogo los proporciona. Cada resultado abre su registro o texto completo disponible.</p></div>
  <div class="research-toolbar"><label>Área de investigación<select id="research-topic"><option value="environmental sustainability">Medio ambiente</option><option value="waste recycling">Reciclaje y residuos</option><option value="water conservation">Agua</option><option value="renewable energy">Energía renovable</option><option value="biodiversity conservation">Biodiversidad</option><option value="climate change">Cambio climático</option></select></label><label>Buscar en publicaciones<input type="search" id="research-search" placeholder="Ej. microplastics, agua, リサイクル" maxlength="100"></label><button id="research-submit" type="button" class="btn btn-primary">Buscar investigaciones ↗</button></div><p id="research-status" class="notice" role="status">Cargando la selección quincenal de investigaciones…</p><div class="research-results" id="research-results"></div><div class="research-pagination"><button type="button" id="research-prev" disabled>← Anterior</button><span id="research-page">Página 1</span><button type="button" id="research-next" disabled>Siguiente →</button></div>`;
  content.appendChild(section);
  const $ = id => document.getElementById(id);
  const bookGrid = $('library-book-grid');
  const bookCount = $('library-books-count');
  const bookRefresh = $('library-books-refresh');
  const featuredEssaysGrid = $('featured-essays-grid');
  const featuredEssaysStatus = $('featured-essays-status');
  const bookSearch = $('library-book-search');
  const bookTopic = $('library-book-topic');
  const sourceButtons = [...section.querySelectorAll('[data-book-source]')];
  let books = [];
  let savedResearch = [];
  let researchReady = false;
  let libraryData = null;
  let bookSource = 'all';
  const bookLabels = {openlibrary: 'Open Library', openlibro: 'OpenLibro', anna: "Anna's Archive", zlibrary: 'Z-Library'};
  const bookTopics = {agua:'Agua',energia:'Energía',biodiversidad:'Biodiversidad',residuos:'Reciclaje',clima:'Clima',urbano:'Entorno urbano',sociedad:'Sociedad',politica:'Política ambiental'};
  function safeLink(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
    catch { return ''; }
  }
  function bookCover(book) {
    const base = 'https://covers.openlibrary.org/b/';
    const explicit = safeLink(book.cover_url);
    if (explicit) {
      const parsed = new URL(explicit);
      if (['openlibro.com','www.openlibro.com'].includes(parsed.hostname) && /^\/wp-content\/uploads\/.*\.(jpg|jpeg|png|webp)$/i.test(parsed.pathname)) return explicit;
    }
    if (Number.isSafeInteger(book.cover_id) && book.cover_id > 0) return `${base}id/${book.cover_id}-M.jpg?default=false`;
    const edition = /^https:\/\/openlibrary\.org\/books\/(OL\d+M)(?:[/?#]|$)/.exec(book.url || '');
    if (edition) return `${base}olid/${edition[1]}-M.jpg?default=false`;
    if (/^(?:\d{13}|\d{9}[\dX])$/i.test(book.isbn || '')) return `${base}isbn/${book.isbn}-M.jpg?default=false`;
    return '';
  }
  function renderBooks() {
    const term = bookSearch.value.trim().toLocaleLowerCase('es');
    const topic = bookTopic.value;
    const shown = books.filter(b => (bookSource === 'all' || b.source === bookSource) &&
      (topic === 'all' || b.topic.includes(topic)) &&
      (!term || [b.title || '',b.author || '',b.desc || '',(b.topic||[]).map(t=>bookTopics[t]||t).join(' ')].join(' ').toLocaleLowerCase('es').includes(term)));
    bookCount.textContent = `${shown.length} ${shown.length === 1 ? 'libro' : 'libros'} en la selección ambiental`;
    bookGrid.replaceChildren();
    if (!shown.length) {
      const empty = document.createElement('p');
      empty.className = 'notice';
      empty.textContent = 'No hay libros con estos filtros. Prueba otro tema o colección.';
      bookGrid.append(empty);
      return;
    }
    shown.forEach(book => {
      const article = document.createElement('article');
      article.className = 'library-book-card';
      const body = document.createElement('div');
      body.className = 'library-book-body';
      const source = document.createElement('span');
      source.className = 'library-book-source';
      source.textContent = bookLabels[book.source] || 'Bibliografía ambiental';
      const title = document.createElement('h3');
      title.textContent = (book.title && String(book.title).trim()) ? book.title : 'Ficha bibliográfica sin título disponible';
      const meta = document.createElement('p');
      meta.className = 'library-book-author';
      meta.textContent = `${book.author || 'Consultar autoría en la ficha'}${book.year ? ' · ' + book.year : ''}`;
      const desc = document.createElement('p');
      desc.className = 'library-book-desc';
      desc.textContent = book.desc || 'Descripción no disponible en este registro.';
      const tags = document.createElement('div');
      tags.className = 'library-book-tags';
      (book.topic||[]).slice(0,3).forEach(t => {
        const chip = document.createElement('span');
        chip.textContent = bookTopics[t] || t;
        tags.append(chip);
      });
      const provenance = document.createElement('p');
      provenance.className = 'library-book-provenance';
      provenance.textContent = book.source === 'openlibro'
        ? 'Registro individual de OpenLibro.'
        : book.source === 'openlibrary' ? 'Registro bibliográfico de Open Library.'
        : `Lectura recomendada · ficha en Open Library. Presencia en ${bookLabels[book.source]} no verificada.`;
      const link = document.createElement('a');
      link.className = 'library-book-link';
      link.href = safeLink(book.url);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = book.source === 'openlibro' ? 'Ver ficha en OpenLibro ↗' : 'Ver ficha bibliográfica ↗';
      body.append(source,title,meta,desc,tags,provenance,link);
      article.append(body);
      // No se reserva espacio para portadas inexistentes ni se inventa una cubierta.
      article.classList.add('no-cover');
      const coverUrl = bookCover(book);
      if (coverUrl) {
        const cover = document.createElement('div');
        cover.className = `library-book-cover cover-${book.source}`;
        const image = new Image();
        image.alt = `Portada de ${book.title || 'la obra'}`;
        image.decoding = 'async';
        image.onload = () => {
          if (image.naturalWidth < 10 || image.naturalHeight < 10) return;
          cover.classList.add('has-image');
          cover.append(image);
          article.classList.remove('no-cover');
          article.prepend(cover);
        };
        image.onerror = () => { cover.remove(); article.classList.add('no-cover'); };
        image.src = coverUrl;
      }
      bookGrid.append(article);
    });
  }
  function renderFeaturedEssays(items) {
    featuredEssaysGrid.replaceChildren();
    if (!Array.isArray(items) || !items.length) {
      featuredEssaysStatus.textContent = 'No hay ensayos disponibles en la edición guardada.';
      return;
    }
    featuredEssaysStatus.textContent = `${items.length} ensayos o estudios destacados en esta rotación de 15 días.`;
    const frag = document.createDocumentFragment();
    items.forEach(item => {
      const article = document.createElement('article');
      article.className = 'research-card';
      const topic = item.topic ? `<span>${esc(item.topic)}</span>` : '';
      article.innerHTML = `<div class="research-meta"><span>ENSAYO DESTACADO</span>${topic}<span>${esc(item.year || 'Sin año')}</span></div><h3>${esc(item.title || 'Ficha académica sin título disponible')}</h3><p><strong>Autoría:</strong> ${esc(item.authors || 'No indicada')}</p><p><strong>Instituciones:</strong> ${esc(item.institutions || 'No identificadas')}</p><p><strong>Publicación:</strong> ${esc(item.source || 'Repositorio académico')}</p><div class="research-links"><a href="${esc(safeLink(item.url))}" target="_blank" rel="noopener noreferrer">Consultar ensayo ↗</a>${safeLink(item.pdf) ? `<a href="${esc(safeLink(item.pdf))}" target="_blank" rel="noopener noreferrer">Abrir PDF ↗</a>` : ''}</div>`;
      frag.append(article);
    });
    featuredEssaysGrid.append(frag);
  }
  sourceButtons.forEach(button => button.addEventListener('click', () => {
    bookSource = button.dataset.bookSource;
    sourceButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    renderBooks();
  }));
  bookSearch.addEventListener('input', renderBooks);
  bookTopic.addEventListener('change', renderBooks);
  fetch('../data/pages-snapshot/library.json', {cache:'no-cache',headers:{Accept:'application/json'}})
    .then(r => {if(!r.ok) throw new Error('HTTP ' + r.status);return r.json();})
    .then(data => {
      books = Array.isArray(data.books) ? data.books.filter(b =>
        ['openlibro','openlibrary','anna','zlibrary'].includes(b.source) &&
        Array.isArray(b.topic) && safeLink(b.url)) : [];
      libraryData = data;
      savedResearch = (Array.isArray(data.research) ? data.research : []).filter(item => safeLink(item.url));
      researchReady = true;
      renderBooks();
      const next = data.next_refresh ? new Date(data.next_refresh) : null;
      if (bookRefresh) {
        const nextText = next && !Number.isNaN(next.valueOf()) ? next.toLocaleDateString('es-MX', {year:'numeric', month:'long', day:'numeric'}) : '';
        bookRefresh.textContent = `Selección guardada · revisión cada ${data.refresh_days || 15} días${nextText ? ' · próxima revisión prevista: ' + nextText : ''}.${data.scheduled_library && Object.values(data.collection_slots || {}).length === 3 && Object.values(data.collection_slots).every(v=>v===data.slot) ? '' : ' Si una fuente falla se conserva su edición anterior.'}`;
      }
      renderFeaturedEssays((Array.isArray(data.essays) ? data.essays : []).filter(item=>safeLink(item.url)));
      if (data.essays_from_previous_cycle) featuredEssaysStatus.textContent += ' · Se conserva la edición anterior.';
      showSavedResearch(false);
    })
    .catch(() => {
      bookCount.textContent = 'No fue posible cargar las fichas de libros. Verifica el servicio de Biblioteca.';
      if (bookRefresh) bookRefresh.textContent = 'La Biblioteca está configurada para renovar sus libros y ensayos cada 15 días.';
      renderFeaturedEssays([]);
      researchReady = true;
      showSavedResearch(false);
    });
  let page = 1,
    total = 0,
    loading = false;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  } [c]));
  function renderResearch(items) {
    $('research-results').innerHTML = items.filter(item=>safeLink(item.url)).map(item => `<article class="research-card"><div class="research-meta"><span>ACCESO ABIERTO</span><span>${esc(item.year||'Sin año')}</span><span>${esc(item.language||'Idioma no especificado')}</span></div><h3>${esc(item.title || 'Ficha académica sin título disponible')}</h3><p><strong>Autoría:</strong> ${esc(item.authors||'No indicada')}</p><p><strong>Instituciones:</strong> ${esc(item.institutions||'No identificadas')}</p><p><strong>Publicación:</strong> ${esc(item.source||'Repositorio académico')}</p><div class="research-links"><a href="${esc(safeLink(item.url))}" target="_blank" rel="noopener noreferrer">Consultar investigación ↗</a>${safeLink(item.pdf)?`<a href="${esc(safeLink(item.pdf))}" target="_blank" rel="noopener noreferrer">Abrir PDF ↗</a>`:''}</div></article>`).join('') || '<p class="notice">No se encontraron resultados. Prueba otra búsqueda o consulta OpenAlex.</p>';
  }
  function pagination() {
    $('research-prev').disabled = page <= 1;
    $('research-next').disabled = page * 8 >= total;
    $('research-page').textContent = `Página ${page}`;
  }
  function showSavedResearch(filter = true) {
    const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const term = normalize($('research-search').value.trim());
    const topic = $('research-topic').value;
    const topics = {'waste recycling': /residu|recycl|waste|recicl/, 'water conservation': /agua|water|hydro/, 'renewable energy': /energ|solar|wind/, 'biodiversity conservation': /biodivers|ecolog|ecosystem/, 'climate change': /clima|climate|warming/};
    const records = savedResearch.filter(item => {
      const text = normalize([item.title,item.authors,item.institutions,item.topic,item.source].join(' '));
      return !filter || ((!term || text.includes(term)) && (!topics[topic] || topics[topic].test(text)));
    });
    total = records.length;
    page = Math.min(page, Math.max(1, Math.ceil(total/8)));
    renderResearch(records.slice((page-1)*8,page*8));
    $('research-status').textContent = `${total} investigaciones de la edición guardada${libraryData?.research_from_previous_cycle ? ' (edición anterior conservada)' : ''}. Para búsquedas en todo OpenAlex utiliza el catálogo original o conecta cPanel.`;
    pagination();
  }
  async function load() {
    if (loading || !researchReady) return;
    loading = true;
    $('research-submit').disabled = true;
    const query = $('research-search').value.trim() || $('research-topic').value;
    try {
      const response = await window.SGAPagesRead(`../api/research.php?q=${encodeURIComponent(query)}&page=${page}`, {headers:{Accept:'application/json'}});
      if (!response.ok) throw Error('Servicio no disponible');
      const data = await response.json();
      if (data.error || !Array.isArray(data.items)) throw Error('Servicio no disponible');
      total = Number(data.total) || 0;
      renderResearch(data.items);
      $('research-status').textContent = `${total.toLocaleString('es-MX')} resultados de catálogo (estimados por OpenAlex). Página ${page}.`;
    } catch {
      showSavedResearch(true);
    } finally {
      loading = false;
      $('research-submit').disabled = false;
      pagination();
    }
  }
  $('research-submit').addEventListener('click', () => {
    page = 1;
    load()
  });
  $('research-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      page = 1;
      load()
    }
  });
  $('research-topic').addEventListener('change', () => {
    page = 1;
    load()
  });
  $('research-prev').addEventListener('click', () => {
    page--;
    load()
  });
  $('research-next').addEventListener('click', () => {
    page++;
    load()
  });
  // La primera vista usa la selección quincenal, no una consulta PHP.
})();
