/* Formulario de participación SGA: HTML claro y sin minificar. */
const formularioParticipacion = `
  <section class="solicitudes-sga" aria-labelledby="solicitudes-sga-titulo">
    <header class="solicitudes-sga__encabezado">
      <span class="solicitudes-sga__etiqueta">COMUNIDAD TECNOLÓGICA · PARTICIPA</span>
      <h2 id="solicitudes-sga-titulo">Envía una propuesta o reporte</h2>
      <p>
        Comparte una incidencia, solicitud, propuesta o iniciativa para mejorar
        el entorno de tu plantel. Puedes elegir más de un tipo de solicitud.
      </p>
    </header>

    <form class="form solicitudes-sga__form" id="participation" method="post" action="#" onsubmit="return false" enctype="multipart/form-data">
      <input type="hidden" name="origen" value="participa">
      <input type="hidden" name="csrf" value="">
      <input type="hidden" name="imagenes_seleccionadas" value="0">
      <div class="sga-antispam" aria-hidden="true"><label>Deja este campo vacío<input name="sitio_web" tabindex="-1" autocomplete="off"></label></div>
      <div class="solicitudes-sga__campo">
        <label class="solicitudes-sga__etiqueta-campo" id="solicitudes-sga-tipo-etiqueta">
          Tipo de solicitud <span class="solicitudes-sga__requerido" aria-hidden="true">*</span>
        </label>

        <details class="solicitudes-sga__desplegable" id="solicitudes-sga-desplegable">
          <summary aria-labelledby="solicitudes-sga-tipo-etiqueta solicitudes-sga-resumen">
            <span id="solicitudes-sga-resumen">Selecciona una o varias opciones</span>
            <span class="solicitudes-sga__flecha" aria-hidden="true"></span>
          </summary>
          <div class="solicitudes-sga__panel">
            <p class="solicitudes-sga__ayuda-panel">Marca todas las opciones que correspondan a tu mensaje.</p>
            <fieldset class="solicitudes-sga__opciones">
              <legend class="visually-hidden">Tipos de solicitud</legend>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Propuesta ambiental y mejora del SGA"><span>Propuesta ambiental y mejora del SGA</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Agua: fugas, suministro y ahorro"><span>Agua: fugas, suministro y ahorro</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Energía eléctrica y alumbrado"><span>Energía eléctrica y alumbrado</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Residuos sólidos, separación y reciclaje"><span>Residuos sólidos, separación y reciclaje</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Residuos peligrosos y sustancias químicas"><span>Residuos peligrosos y sustancias químicas</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Mantenimiento e infraestructura"><span>Mantenimiento e infraestructura</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Áreas verdes, reforestación y biodiversidad"><span>Áreas verdes, reforestación y biodiversidad</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Seguridad, higiene y protección civil"><span>Seguridad, higiene y protección civil</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Movilidad y transporte sustentable"><span>Movilidad y transporte sustentable</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Educación ambiental y capacitación"><span>Educación ambiental y capacitación</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Campañas, eventos y voluntariado"><span>Campañas, eventos y voluntariado</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Investigación, innovación y proyectos"><span>Investigación, innovación y proyectos</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Vinculación y colaboración institucional"><span>Vinculación y colaboración institucional</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Accesibilidad, inclusión y bienestar"><span>Accesibilidad, inclusión y bienestar</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Información, consulta o seguimiento"><span>Información, consulta o seguimiento</span></label>
              <label class="solicitudes-sga__opcion"><input type="checkbox" name="tipo_solicitud[]" value="Otro asunto"><span>Otro asunto</span></label>
            </fieldset>
            <button class="solicitudes-sga__limpiar" id="solicitudes-sga-limpiar" type="button">Limpiar selección</button>
          </div>
        </details>
        <p class="solicitudes-sga__ayuda">Selecciona uno o varios temas relacionados con las necesidades de tu plantel.</p>
        <p class="solicitudes-sga__error" id="solicitudes-sga-error" role="alert" hidden>
          Selecciona por lo menos un tipo de solicitud.
        </p>
      </div>

      <div class="solicitudes-sga__datos">
        <div class="solicitudes-sga__campo">
          <label class="solicitudes-sga__etiqueta-campo" for="solicitudes-sga-nombre">Nombre <span aria-hidden="true">*</span></label>
          <input id="solicitudes-sga-nombre" name="nombre" type="text" autocomplete="name" required minlength="2" maxlength="120" placeholder="Tu nombre">
        </div>
        <div class="solicitudes-sga__campo">
          <label class="solicitudes-sga__etiqueta-campo" for="solicitudes-sga-correo">Correo electrónico <span aria-hidden="true">*</span></label>
          <input id="solicitudes-sga-correo" name="correo" type="email" autocomplete="email" required maxlength="254" placeholder="correo@ejemplo.com">
        </div>
      </div>

      <div class="solicitudes-sga__campo">
        <label class="solicitudes-sga__etiqueta-campo" for="solicitudes-sga-descripcion">Descripción <span aria-hidden="true">*</span></label>
        <textarea id="solicitudes-sga-descripcion" name="descripcion" required minlength="10" maxlength="3500" rows="6" placeholder="Describe la situación, el área del plantel o tu propuesta…"></textarea>
        <span class="solicitudes-sga__contador" id="solicitudes-sga-contador">0 / 3500 caracteres</span>
      </div>

      <div class="solicitudes-sga__campo sga-imagenes-campo">
        <label class="solicitudes-sga__etiqueta-campo" for="solicitudes-sga-imagenes">Imágenes de apoyo <span class="sga-opcional">(opcional)</span></label>
        <input id="solicitudes-sga-imagenes" name="imagenes[]" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple aria-describedby="sga-imagenes-ayuda sga-imagenes-estado">
        <p class="solicitudes-sga__ayuda" id="sga-imagenes-ayuda">Adjunta hasta <strong>25 fotografías</strong> JPG, PNG o WebP; máximo 4 MB por imagen (100 MB en total). Las imágenes son privadas, no se publican en las carteleras.</p>
        <p class="sga-imagenes-estado" id="sga-imagenes-estado" role="status" aria-live="polite">0 de 25 imágenes seleccionadas.</p>
        <div class="sga-imagenes-previa" id="sga-imagenes-previa" aria-label="Vista previa de imágenes adjuntas"></div>
      </div>

      <div class="solicitudes-sga__pie">
        <label class="sga-aviso-casilla"><input type="checkbox" name="acepto_privacidad" value="1" required><span>He leído el <a href="aviso-privacidad.html" target="_blank" rel="noopener">aviso de privacidad</a> y autorizo el tratamiento descrito para esta solicitud.</span></label>
        <button class="solicitudes-sga__validar" type="submit">Enviar solicitud</button>
        <p id="formstatus" class="solicitudes-sga__estado" role="status" aria-live="polite"></p>
        <p class="solicitudes-sga__privacidad">
          El envío se registra en una base de datos únicamente cuando el servidor
          y el aviso de privacidad institucional estén configurados y habilitados.
          No se envía automáticamente por correo electrónico.
        </p>
      </div>
    </form>
  </section>
`;
const pages = {
  conoce: ['Conoce el SGA', 'Un sistema para promover la mejora continua del desempeño ambiental.', `<section class="policy-feature" aria-labelledby="policy-feature-title"><h2 id="policy-feature-title" class="visually-hidden">Política del Sistema de Gestión Ambiental</h2><iframe class="policy-feature-frame" src="../interactive/sga_certificates.html" title="Política del Sistema de Gestión Ambiental: animación interactiva y consulta de documentos" loading="lazy"></iframe></section><section class="sga-video-section" aria-labelledby="sga-video-title"><h2 id="sga-video-title">¿Qué es el Sistema de Gestión Ambiental?</h2><div class="sga-video-player is-idle" data-sga-player role="group" aria-label="Reproductor del video ¿Qué es el Sistema de Gestión Ambiental?"><video class="sga-video-player__video" playsinline preload="metadata" poster="../img/pages/sga-video-portada.jpg" aria-label="Video: Qué es el Sistema de Gestión Ambiental" disablepictureinpicture controlslist="nodownload noremoteplayback"><source src="../video/que-es-sga.mp4" type="video/mp4">Tu navegador no puede reproducir este video. <a href="../video/que-es-sga.mp4">Abrir el video MP4</a>.</video><div class="sga-video-player__poster" aria-hidden="true"></div><button type="button" class="sga-video-player__center-play" data-video-main aria-label="Reproducir video"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M7 3.5a1.5 1.5 0 0 1 2.3-1.27l12.2 8a2.1 2.1 0 0 1 0 3.54l-12.2 8A1.5 1.5 0 0 1 7 20.5v-17Z"/></svg></button><div class="sga-video-player__controls" role="group" aria-label="Controles de reproducción"><button class="sga-video-player__toggle" type="button" data-video-toggle aria-label="Reproducir video"><svg class="sga-video-player__icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 3.5a1.5 1.5 0 0 1 2.3-1.27l12.2 8a2.1 2.1 0 0 1 0 3.54l-12.2 8A1.5 1.5 0 0 1 7 20.5v-17Z"/></svg><svg class="sga-video-player__icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="3" width="5" height="18" rx="1"/></svg></button><input data-video-progress class="sga-video-player__progress" type="range" min="0" max="100" step="0.1" value="0" aria-label="Avance del video" aria-valuetext="Inicio del video"><button class="sga-video-player__fullscreen" type="button" data-video-fullscreen aria-label="Ver en pantalla completa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg></button></div><span class="visually-hidden" data-video-status aria-live="polite"></span></div></section>`],
  ejes: ['Nuestros cuatro ejes ambientales', 'Acciones cotidianas para construir una cultura ambiental.', `<div class="sga-wheel-container"><iframe class="sga-wheel-frame" src="../interactive/sga_circle_interactive.html" title="Sistema de Gestión Ambiental: círculo interactivo de los cuatro ejes" loading="eager"></iframe></div>`],
  noticias: ['Centro de noticias ambientales', 'Noticias internacionales: titulares traducidos al español en el carrusel y originales en las fichas.', `<section class="news-intro"><h2>El planeta, en múltiples idiomas</h2><p class="news-curation-intro">Historias ambientales que rara vez llegan a México, elegidas por su interés en el agua, la naturaleza y la vida cotidiana.</p><span id="news-status" class="visually-hidden" role="status" aria-live="polite">Conectando con fuentes RSS…</span></section><div class="news-controls"><label for="category">Tema <select id="category" class="filter"><option value="Todas">Todas</option><option>Cambio climático</option><option>Biodiversidad</option><option>Agua</option><option>Energía</option><option>Reciclaje</option><option>Educación ambiental</option><option>Sociedad y ambiente</option><option>Política ambiental</option></select></label><label for="news-language">Idioma <select id="news-language" class="filter"><option value="Todas">Todos los disponibles</option></select></label><label for="news-order">Orden <select id="news-order" class="filter"><option value="mexico">Interés para México</option><option value="date">Más recientes</option></select></label><label for="search">Buscar noticias <input class="filter" id="search" type="search" placeholder="Buscar en cualquier idioma"></label></div><section class="news-slider" aria-label="Noticias ambientales destacadas"><div class="news-slider-stage"><div class="news-slide" id="news-slide"><div class="news-skeleton">Esperando noticias verificadas…</div></div><button type="button" id="news-prev" class="news-slide-nav news-slide-nav--prev" aria-label="Noticia anterior" disabled><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6" /></svg></button><button type="button" id="news-next" class="news-slide-nav news-slide-nav--next" aria-label="Noticia siguiente" disabled><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6" /></svg></button></div><div class="news-slider-controls"><div id="news-dots" class="news-dots" role="group" aria-label="Seleccionar noticia"></div><span id="news-position" class="visually-hidden" aria-live="polite"></span><button type="button" id="news-pause" aria-pressed="false">Pausar</button></div></section><p id="news-total-summary" class="news-total-summary" role="status" aria-live="polite">Cargando catálogo ambiental…</p><h2>Más noticias ambientales</h2><p id="news-list-status" class="news-list-status" aria-live="polite"></p><div class="news-list" id="news"></div><div class="news-pagination"><button type="button" id="news-load-more" class="news-load-more" hidden>Cargar 24 noticias más</button></div>`],
  educacion: ['Educación ambiental interactiva', 'Pon a prueba tus conocimientos y aprende con cada respuesta.', `<div class="card" id="quiz"><h2>Cuestionario ambiental</h2><p id="question"></p><div id="choices"></div><p id="score" aria-live="polite"></p></div><h2>Clasifica los residuos</h2><div class="card"><p>¿Dónde corresponde depositar una cáscara de plátano?</p><button class="filter" onclick="classify('Orgánico')">Orgánico</button> <button class="filter" onclick="classify('Reciclable')">Reciclable</button> <button class="filter" onclick="classify('Peligroso')">Peligroso</button><p id="classification" aria-live="polite"></p></div>`],
  participa: [
    'Participa en el cambio',
    'Actividades, campañas y noticias ambientales de la comunidad tecnológica.',
    `
      <section class="participa-cartelera" aria-labelledby="cartelera-titulo">
        <header class="participa-cartelera__encabezado">
          <span class="participa-cartelera__etiqueta">SGA · TECNM · ITAO</span>
          <h2 id="cartelera-titulo">Cartelera ambiental</h2>
          <p>
            Actividades, convocatorias e iniciativas ambientales publicadas
            mediante imágenes, sin necesidad de filtros ni registros.
          </p>
        </header>

        <iframe
          class="participa-cartelera__marco"
          src="../cartelera/cartelera.html"
          title="Cartelera de noticias y actividades ambientales del SGA"
          loading="eager"
          scrolling="no"
        ></iframe>
      </section>
    `
    + formularioParticipacion
  ],
  indicadores: ['Indicadores ambientales', 'Visualización demostrativa para el futuro panel de seguimiento.', `<p class="notice"><strong>DATOS FICTICIOS DE DEMOSTRACIÓN.</strong> No representan resultados institucionales.</p><label>Periodo <select class="filter" id="period"><option>Ejemplo mensual</option><option>Ejemplo trimestral</option><option>Ejemplo anual</option></select></label><div class="cards" id="metrics"></div>`],
  biblioteca: ['Biblioteca documental', 'Investigaciones ambientales gratuitas y de acceso abierto de universidades de todo el mundo.', `<p>Explora estudios científicos sobre medio ambiente, reciclaje, agua, biodiversidad y energías renovables, publicados en distintos idiomas.</p>`],
  contacto: ['Contacto', 'Buzón de comunicación ambiental.', `<h2>Comité ambiental</h2><p>La información de integrantes y medios de contacto institucionales se incorporará una vez verificada.</p><p><a href="https://www.tecnm.mx/" target="_blank" rel="noopener noreferrer">Visitar el portal del TecNM ↗</a></p><h2>Formulario de contacto</h2><form class="form sga-contacto-form" id="participation" method="post" action="#" onsubmit="return false"><input type="hidden" name="origen" value="contacto"><input type="hidden" name="csrf" value=""><div class="sga-antispam" aria-hidden="true"><label>Deja este campo vacío<input name="sitio_web" tabindex="-1" autocomplete="off"></label></div><label for="contacto-nombre">Nombre<input id="contacto-nombre" name="nombre" required minlength="2" maxlength="120" autocomplete="name"></label><label for="contacto-correo">Correo electrónico<input id="contacto-correo" name="correo" required type="email" maxlength="254" autocomplete="email"></label><label for="contacto-mensaje">Mensaje<textarea id="contacto-mensaje" name="mensaje" required minlength="10" maxlength="3500" rows="5"></textarea></label><label class="sga-aviso-casilla"><input type="checkbox" name="acepto_privacidad" value="1" required><span>He leído el <a href="aviso-privacidad.html" target="_blank" rel="noopener">aviso de privacidad</a> y autorizo el tratamiento descrito para mi mensaje.</span></label><button type="submit">Enviar mensaje</button><p id="formstatus" class="sga-formstatus" role="status" aria-live="polite"></p><p class="sga-aviso-informativo">Los mensajes se guardan en el servidor cuando la recepción esté habilitada. No se envían automáticamente a un correo.</p></form>`]
};
const key = document.body.dataset.page;
const p = pages[key];
if (p) {
  document.querySelector('#page-title').textContent = p[0];
  document.querySelector('#page-subtitle').textContent = p[1];
  document.querySelector('#page-content').innerHTML = p[2];
}
const questions = [
  ['¿Qué acción reduce el desperdicio de agua?', ['Dejar correr el grifo', 'Cerrar la llave mientras te enjabonas', 'Ignorar las fugas'], 1],
  ['¿Cómo ahorrar energía en un aula?', ['Apagar luces innecesarias', 'Mantener todo encendido', 'Cubrir las ventanas'], 0],
  ['¿Qué requiere manejo especializado?', ['Papel limpio', 'Cáscara de fruta', 'Reactivo químico peligroso'], 2]
];
let qi = 0,
  points = 0;

function renderQuiz() {
  const q = questions[qi];
  if (!q) {
    document.querySelector('#quiz').innerHTML = `<h2>Actividad completada</h2><p>Obtuviste ${points} de ${questions.length} respuestas correctas.</p><p>Pequeñas acciones responsables mejoran nuestro entorno.</p><button class="filter" onclick="qi=0;points=0;renderQuiz()">Repetir</button>`;
    return
  }
  document.querySelector('#question').textContent = `Pregunta ${qi+1} de ${questions.length}: ${q[0]}`;
  document.querySelector('#choices').innerHTML = q[1].map((a, i) => `<button class="filter" style="margin:5px" onclick="answer(${i})">${a}</button>`).join('');
  document.querySelector('#score').textContent = `Aciertos: ${points}`
};

function answer(i) {
  if (i === questions[qi][2]) points++;
  qi++;
  renderQuiz()
}

function classify(x) {
  document.querySelector('#classification').textContent = x === 'Orgánico' ? '¡Correcto! Las cáscaras son residuos orgánicos.' : 'Intenta de nuevo: identifica si el residuo es biodegradable.'
}

function metrics() {
  const factor = {
    'Ejemplo mensual': 1,
    'Ejemplo trimestral': 3,
    'Ejemplo anual': 12
  } [document.querySelector('#period').value];
  document.querySelector('#metrics').innerHTML = [
    ['Agua (m³)', 120 * factor, 240 * factor],
    ['Energía (kWh)', 950 * factor, 1500 * factor],
    ['Residuos reciclados (kg)', 75 * factor, 120 * factor],
    ['Participaciones', 48 * factor, 80 * factor]
  ].map(([name, value, max]) => `<article class="card"><h3>${name}</h3><h2>${value.toLocaleString('es-MX')}</h2><div class="chartbar"><span style="width:${Math.round(value/max*100)}%"></span></div><small>Valor simulado</small></article>`).join('')
}


// Ampliaciones educativas y documentales, basadas en el manual y el cartel aportados.
const extra = {
  ejes: `<section class="detail-block"><h2>Guía visual de las acciones ambientales</h2><p>Los cuatro ejes siguientes retoman las recomendaciones del cartel aportado y los objetivos ambientales del manual. Selecciona una tarjeta para conocer medidas concretas.</p><div class="axis-grid"><article class="axis-card" id="agua"><div class="axis-visual">💧</div><h3>01 · Agua</h3><p>Reporta inmediatamente fugas de llaves o tuberías; verifica que las llaves queden cerradas; evita dejar correr el agua al lavarte las manos; reutiliza lluvia únicamente cuando su captación y uso sean apropiados y seguros.</p><a href="participa.html">Reportar una fuga ↗</a></article><article class="axis-card" id="energia"><div class="axis-visual">☀️</div><h3>02 · Energía</h3><p>Apaga luminarias cuando no se necesitan; aprovecha la luz natural sin afectar la comodidad visual; prioriza lámparas eficientes; desconecta equipos cuando sea seguro y procedente.</p><a href="participa.html">Reportar desperdicio ↗</a></article><article class="axis-card" id="urbanos"><div class="axis-visual">♻️</div><h3>03 · Residuos urbanos</h3><p>Identifica orgánicos, reciclables, no reciclables y residuos voluminosos. Deposítalos en contenedores señalizados, de acuerdo con la separación y recolección disponibles en el plantel.</p><a href="biblioteca.html">Consultar guía documental ↗</a></article><article class="axis-card" id="peligrosos"><div class="axis-visual">⚠️</div><h3>04 · Residuos peligrosos</h3><p>Separa reactivos, residuos de prácticas y materiales contaminados conforme a procedimientos de laboratorio. No mezcles sustancias ni manipules residuos desconocidos. Bombillas y vidrio requieren clasificación específica según su naturaleza.</p><a href="biblioteca.html">Consultar el manual ↗</a></article></div></section>`,
  noticias: `<section class="detail-block"><h2>Fuentes para la futura integración</h2><p>Esta sección está preparada para presentar noticias por fecha, país, fuente y categoría. Para evitar desinformación, no se publican titulares ficticios como si fueran actuales.</p><div class="cards"><article class="card"><h3>PNUMA</h3><p>Información y programas ambientales internacionales.</p><a href="https://www.unep.org/es" target="_blank" rel="noopener noreferrer">Consultar fuente ↗</a></article><article class="card"><h3>SEMARNAT</h3><p>Información pública sobre políticas y gestión ambiental en México.</p><a href="https://www.gob.mx/semarnat" target="_blank" rel="noopener noreferrer">Consultar fuente ↗</a></article><article class="card"><h3>ONU Cambio Climático</h3><p>Actualizaciones y materiales sobre acción climática global.</p><a href="https://unfccc.int/" target="_blank" rel="noopener noreferrer">Consultar fuente ↗</a></article></div><p class="notice">La búsqueda y los filtros se activarán sobre noticias reales cuando se conecte una API o un catálogo editorial verificado.</p></section>`,
  educacion: `<section class="detail-block"><h2>Aprender para actuar</h2><div class="cards"><article class="card"><h3>💧 Reto del agua</h3><p>Detecta fugas, cierra las llaves y comunica las incidencias.</p></article><article class="card"><h3>💡 Reto energético</h3><p>Identifica equipos encendidos sin necesidad y prioriza la iluminación natural.</p></article><article class="card"><h3>♻️ Reto de separación</h3><p>Reconoce los residuos orgánicos, reciclables y los que requieren manejo especial.</p></article></div><p class="notice">El cuestionario y el juego funcionan en tu navegador. No se guardan calificaciones ni datos personales.</p></section>`,
  indicadores: `<section class="detail-block"><h2>Cómo interpretar los indicadores</h2><p>El seguimiento del SGA debe sustentarse en registros verificables, unidades consistentes y periodos comparables. El manual prevé programas ambientales con metas, responsables, calendario y mecanismos de control y seguimiento.</p><div class="cards"><article class="card"><h3>Consumo de agua</h3><p>Metros cúbicos por periodo y comparación con la línea base.</p></article><article class="card"><h3>Energía eléctrica</h3><p>kWh por periodo, con análisis de variaciones.</p></article><article class="card"><h3>Residuos recuperados</h3><p>Kilogramos documentados por categoría y destino.</p></article><article class="card"><h3>Participación</h3><p>Personas o asistencias registradas en actividades.</p></article></div><p class="notice">Todos los valores numéricos mostrados arriba son simulaciones, no mediciones del ITAO.</p></section>`,
  biblioteca: ``,
};
if (p && extra[key] && key !== 'noticias' && key !== 'ejes') document.querySelector('#page-content').insertAdjacentHTML('beforeend', extra[key]);



if (key === 'biblioteca') {
  const sc = document.createElement('script');
  sc.src = '../js/research.js';
  document.body.appendChild(sc)
}
if (key === 'noticias') {
  const script = document.createElement('script');
  script.src = '../js/news.js';
  script.defer = true;
  document.body.appendChild(script)
}

/* Altura automática de la política ambiental embebida. */
window.addEventListener('message', function(event) {
  if (event.origin !== window.location.origin) return;
  if (!event.data || event.data.type !== 'sga-policy-height') return;
  const frame = document.querySelector('.policy-feature-frame');
  if (!frame || event.source !== frame.contentWindow) return;
  const h = Number(event.data.height);
  if (Number.isFinite(h) && h > 100 && h < 10000) frame.style.height = Math.ceil(h) + 'px';
});


/* Altura flexible de la cartelera. Mensajes aceptados solo del iframe propio. */
window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin) {
        return;
    }

    if (!event.data || event.data.type !== 'sga-cartelera-altura') {
        return;
    }

    const iframe = document.querySelector('.participa-cartelera__marco');

    if (!iframe || event.source !== iframe.contentWindow) {
        return;
    }

    const altura = Number(event.data.height);

    if (Number.isFinite(altura) && altura >= 150 && altura <= 1800) {
        iframe.style.height = Math.ceil(altura) + 'px';
    }
});
