/* ==============================================================
   NOVEDADES - Adaptación automática de altura del iframe en index.
   Las imágenes y controles se manejan dentro de novedades/novedades.php.
   Solo se aceptan mensajes de ese iframe y del mismo origen.
   ============================================================== */
(() => {
  'use strict';

  const marco = document.querySelector('.home-novedades__marco');
  if (!marco) return;

  window.addEventListener('message', (evento) => {
    if (evento.origin !== window.location.origin) return;
    if (evento.source !== marco.contentWindow) return;
    if (!evento.data || evento.data.type !== 'sga-cartelera-altura') return;

    const altura = Number(evento.data.height);
    if (Number.isFinite(altura) && altura >= 150 && altura <= 1800) {
      marco.style.height = Math.ceil(altura) + 'px';
    }
  });
})();
