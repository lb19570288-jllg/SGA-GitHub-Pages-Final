const root = new URL('../', import.meta.url);
const duration = 8000;
const refresh = 60 * 1000;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function mexicoDay(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Mexico_City', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(date);
    const part = name => parts.find(p => p.type === name).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}
const validColor = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#4CAF50';
const validLink = value => {
    try { return ['http:', 'https:'].includes(new URL(value).protocol); }
    catch { return false; }
};
function contrast(hex) {
    const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
    const [r, g, b] = channels.map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return 0.2126*r + 0.7152*g + 0.0722*b > 0.179 ? '#111827' : '#ffffff';
}
async function load(file) {
    const response = await fetch(new URL('data/' + file, root), {cache: 'no-store', signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
}
// Mismas ventanas móviles que el actualizador Python, en fecha civil de CDMX.
const periods = [1, 7, 15, 30, 60, 90, 120, 183, 365];
function civilNumber(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN;
    const time = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === value ? time : NaN;
}
function publicationDay(value, now) {
    if (typeof value !== 'string') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.isFinite(civilNumber(value)) ? value : null;
    // El servidor normaliza las fechas con hora a ISO con zona horaria.
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date <= now ? mexicoDay(date) : null;
}
function ageDays(value, now) {
    const day = publicationDay(value, now);
    return day ? (civilNumber(mexicoDay(now)) - civilNumber(day))/86400000 : NaN;
}
function periodRank(value, now) {
    const age = ageDays(value, now);
    return Number.isFinite(age) && age >= 0 ? periods.findIndex(limit => age < limit) : -1;
}
function formatPublished(value, now = new Date()) {
    const day = publicationDay(value, now);
    if (!day) return '';
    return new Intl.DateTimeFormat('es-MX', {timeZone:'UTC', day:'numeric', month:'short', year:'numeric'}).format(new Date(day+'T00:00:00Z'));
}
// Mantiene una tarjeta por medio, con enlace al portal si no hay noticia válida.
function buildEntries(sources, news, now = new Date()) {
    const byCode = new Map();
    for (const item of (news.items || [])) {
        if (!item || item.translation_status === 'original' || typeof item.title !== 'string' || !item.title.trim() || !validLink(item.url)) continue;
        const rank = periodRank(item.date, now);
        if (rank < 0) continue;
        const previous = byCode.get(item.code);
        if (!previous || rank < periodRank(previous.date, now) || (rank === periodRank(previous.date, now) && (Number(item.score || 2) > Number(previous.score || 2) || (Number(item.score || 2) === Number(previous.score || 2) && ageDays(item.date, now) < ageDays(previous.date, now))))) {
            byCode.set(item.code, item);
        }
    }

    return sources.filter(source => source && source.code && source.medium && validLink(source.url)).map(source => {
        const article = byCode.get(source.code);
        const flag = source.image || (/^[A-Z]{2}$/.test(source.code) ? `flags_news/${source.code}.webp` : null);
        if (!article) {
            return {...source, image: flag, title: 'ENTRAR AL SITIO', type: 'national', fallback: true};
        }
        return {...source,
            title: article.title, url: article.url, date: article.date,
            color: article.type === 'un' ? '#009EDB' : article.type === 'nature' ? '#4CAF50' : source.color,
            image: article.type === 'nature' ? null : article.type === 'un' ? (/^un_news\/[\w-]+\.webp$/.test(article.image || '') ? article.image : 'un_news/UN.webp') : flag,
            type: article.type, translation_status: article.translation_status, fallback: false};
    }).slice(0, 500);
}
// Reloj continuo por navegador. La posición no depende de temporizadores en segundo plano.
const clockKey = 'sga-news-clock-v1';
const modulo = (n, total) => ((n % total) + total) % total;
function clockIndex(anchor, now, total) {
    return total ? modulo(anchor.index + Math.floor((now - anchor.at) / duration), total) : 0;
}
function readClock() {
    try {
        const value = JSON.parse(localStorage.getItem(clockKey));
        if (value && Number.isSafeInteger(value.at) && value.at > 0 && Number.isSafeInteger(value.index)) return value;
    } catch { /* Navegación privada o almacenamiento bloqueado. */ }
    return null;
}
function saveClock(anchor) {
    try { localStorage.setItem(clockKey, JSON.stringify(anchor)); } catch { /* El reloj en memoria sigue funcionando. */ }
}
class SgaNewsBanner extends HTMLElement {
    connectedCallback() {
        if (this.shadowRoot) return;
        this.items = []; this.index = 0; this.paused = false; this.busy = false;
        this.anchor = readClock();
        if (!this.anchor) {
            // Epoch estable si el navegador no permite almacenamiento.
            this.anchor = {at: 1704067200000, index: 0};
            saveClock(this.anchor);
        }
        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${new URL('css/banner.css?v=7', root)}">
            <section class="shell" aria-label="Información ambiental internacional">
                <div class="stage">
                    <a class="article" hidden target="_blank" rel="noopener noreferrer">
                        <img class="photo" alt="" hidden>
                        <div class="panel">
                            <span class="kicker">EN INFORMACIÓN INTERNACIONAL</span>
                            <span class="headline"></span>
                            <span class="source"></span>
                        </div>
                    </a>
                    <div class="empty" role="status">Cargando información internacional…</div>
                </div>
                <div class="footerline">
                    <div class="navigation" role="group" aria-label="Cambiar noticia">
                        <button class="previous chevron" type="button" aria-label="Noticia anterior" title="Noticia anterior"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>
                        <button class="next chevron" type="button" aria-label="Noticia siguiente" title="Noticia siguiente"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>
                    </div>
                    <div class="status-controls">
                        <button class="pause" type="button" aria-pressed="false">Pausar</button>
                        <span class="counter"></span>
                    </div>
                </div>
            </section>`;
        this.ui = Object.fromEntries(['article','photo','panel','headline','source','empty','counter','pause','previous','next','navigation'].map(k => [k,this.shadowRoot.querySelector('.'+k)]));
        this.ui.previous.addEventListener('click', () => this.manual(-1));
        this.ui.next.addEventListener('click', () => this.manual(1));
        this.ui.pause.addEventListener('click', () => {
            this.paused = !this.paused;
            this.ui.pause.textContent = this.paused ? 'Reanudar' : 'Pausar';
            this.ui.pause.setAttribute('aria-pressed', String(this.paused));
            if (!this.paused) this.sync(false);
        });
        this.ui.photo.addEventListener('error', () => { this.ui.photo.hidden = true; });
        this.onReturn = () => {
            if (!document.hidden) { this.sync(false); this.refreshData(); }
        };
        this.onStorage = event => {
            if (event.key !== clockKey) return;
            this.anchor = readClock() || this.anchor;
            this.sync(false);
        };
        document.addEventListener('visibilitychange', this.onReturn);
        window.addEventListener('pageshow', this.onReturn);
        window.addEventListener('storage', this.onStorage);
        this.refreshData();
        this.timer = setInterval(() => this.sync(true), 250);
        this.refreshTimer = setInterval(() => { if (!document.hidden) this.refreshData(); }, refresh);
    }
    disconnectedCallback() {
        clearInterval(this.timer); clearInterval(this.refreshTimer);
        document.removeEventListener('visibilitychange', this.onReturn);
        window.removeEventListener('pageshow', this.onReturn);
        window.removeEventListener('storage', this.onStorage);
    }
    async refreshData() {
        if (this.loading) return;
        this.loading = true;
        try {
            const [sources, news] = await Promise.allSettled([load('sources.json'), load('destacadas.json')]);
            if (sources.status === 'fulfilled' && Array.isArray(sources.value) && sources.value.length) this.lastSources = sources.value;
            if (news.status === 'fulfilled' && Array.isArray(news.value.items)) this.lastNews = news.value;
            if (this.items.length && sources.status === 'rejected' && news.status === 'rejected') return;
            const nextItems = buildEntries(this.lastSources || [], this.lastNews || {items: []});
            if (!nextItems.length) { if (!this.items.length) this.render(); return; }
            // No reemplazar la tarjeta visible mientras se lee: aplicar al próximo giro.
            if (this.items.length) {
                this.nextEdition = nextItems;
                return;
            }
            this.items = nextItems;
            if (!this.paused) this.index = clockIndex(this.anchor, Date.now(), this.items.length);
            else this.index = Math.min(this.index, Math.max(0, this.items.length - 1));
            this.render();
        } finally { this.loading = false; }
    }
    linkInUse() {
        return this.shadowRoot.activeElement === this.ui.article || this.ui.article.matches(':hover');
    }
    render() {
        const item = this.items[this.index];
        this.ui.article.hidden = !item; this.ui.empty.hidden = !!item;
        this.ui.counter.textContent = item ? `${this.index+1} / ${this.items.length}` : '';
        const single = this.items.length < 2;
        this.ui.pause.hidden = single; this.ui.navigation.hidden = single;
        this.ui.previous.disabled = single; this.ui.next.disabled = single;
        if (!item) { this.ui.empty.textContent = 'No se pudo cargar el catálogo de medios ambientales.'; return; }
        this.ui.article.href = item.url;
        this.ui.article.title = item.fallback ? `Entrar al sitio de ${item.medium}` : item.title;
        this.ui.headline.textContent = item.title;
        this.ui.source.textContent = `${item.medium} · ${item.country}${item.fallback ? "" : " · " + formatPublished(item.date) + (item.translation_status === "original" ? " · Idioma original" : "")}`;
        const color = validColor(item.color);
        this.ui.panel.style.backgroundColor = color;
        this.ui.panel.style.color = contrast(color);
        const local = /^(flags_news|un_news)\/[\w-]+\.webp$/.test(item.image || '');
        const imageUrl = local ? new URL(item.image,root).href : '';
        if (local && this.ui.photo.getAttribute('src') !== imageUrl) {
            this.ui.photo.hidden = false; this.ui.photo.src = imageUrl; this.ui.photo.alt = '';
        } else if (!local) { this.ui.photo.hidden = true; this.ui.photo.removeAttribute('src'); }
    }
    sync(animate) {
        if (this.paused || this.busy || !this.items.length || document.hidden || (animate && this.linkInUse())) return;
        const target = clockIndex(this.anchor, Date.now(), this.items.length);
        if (target !== this.index) this.show(target, animate);
    }
    manual(step) {
        if (!this.items.length) return;
        // Cada clic desplaza una tarjeta y abre un nuevo intervalo de 8 segundos.
        const base = this.pendingIndex ?? this.index;
        const target = modulo(base + step, this.items.length);
        this.anchor = {at: Date.now(), index: target};
        saveClock(this.anchor);
        this.show(target, true);
    }
    async show(target, animate) {
        if (this.busy) { this.pendingIndex = target; return; }
        if (target === this.index) return;
        this.busy = true; this.pendingIndex = target;
        const flip = animate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (flip) { this.ui.article.classList.add('flipping'); await wait(220); }
        if (this.nextEdition && this.nextEdition.length) {
            this.items = this.nextEdition; this.nextEdition = null;
        }
        this.index = modulo(this.pendingIndex, this.items.length);
        this.pendingIndex = null;
        this.render(); this.ui.article.classList.remove('flipping'); this.busy = false;
    }
}
if (!customElements.get('sga-news-banner')) customElements.define('sga-news-banner',SgaNewsBanner);
