const base = location.pathname.includes('/pages/') ? '../' : '';
const menu = [
  ['Inicio', base + 'index.html'],
  ['Conoce el SGA', base + 'pages/conoce.html'],
  ['Ejes ambientales', base + 'pages/ejes.html'],
  ['Noticias', base + 'pages/noticias.html'],
  ['Participa', base + 'pages/participa.html'],
  ['Biblioteca', base + 'pages/biblioteca.html'],
  ['Contacto', base + 'pages/contacto.html'],
];
const header = document.querySelector('#site-header');
if (header) {
  header.innerHTML = `<header class="top"><div class="brand"><a href="${base}index.html" aria-label="Ir al inicio"><img src="${base}img/logos/itao-azul.png" alt="Logotipo del Instituto Tecnológico de Álvaro Obregón"></a><div class="brand-text">TECNOLÓGICO NACIONAL DE MÉXICO<br>Instituto Tecnológico de Álvaro Obregón</div></div></header><nav class="nav" aria-label="Navegación principal"><div class="nav-inner"><button class="menu" aria-expanded="false" aria-controls="navlinks" type="button">☰ Menú</button><div class="links" id="navlinks">${menu.map(([t, u]) => `<a href="${u}" ${location.pathname.replace(/\/$/, '/index.html').endsWith('/' + u.replace(/^\.\.\//, '')) ? 'class="active" aria-current="page"' : ''}>${t}</a>`).join('')}</div></div></nav>`;
  const btn = header.querySelector('.menu');
  btn.addEventListener('click', () => {
    const open = header.querySelector('.links').classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
}
const footer = document.querySelector('#site-footer');
if (footer) {
  const year = new Date().getFullYear();
  footer.innerHTML = `<footer class="footer-institucional" aria-label="Pie de página institucional">
    <div class="footer-contenido">
      <div class="footer-columna">
        <section class="footer-bloque"><h2>Dirección</h2><address>Calle del Rosal 89, Col. Tepeaca, Ciudad de México, Alcaldía Álvaro Obregón, C.P. 01550</address></section>
        <section class="footer-bloque"><h2>Contacto</h2><p>Email: <a href="mailto:difusion@itao.edu.mx">difusion@itao.edu.mx</a></p><p>Teléfono: <a href="tel:+525512856518">55 12856518</a> / <a href="tel:+525556021984">56021984</a></p></section>
      </div>
      <div class="footer-columna">
        <section class="footer-bloque"><h2>Enlaces</h2><nav class="footer-enlaces" aria-label="Enlaces del pie de página"><a href="https://www.plataformadetransparencia.org.mx/" target="_blank" rel="noopener noreferrer">Portal Nacional de Transparencia ↗</a><a href="https://www.tecnm.mx/" target="_blank" rel="noopener noreferrer">Tecnológico Nacional de México ↗</a><a href="${base}pages/contacto.html">Buzón de sugerencias →</a></nav></section>
        <section class="footer-bloque"><h2 class="titulo-contador">Número de visitas: <span class="contador-visitas" aria-label="Contador de demostración, no representa visitas reales">0000000</span></h2><small>Contador ilustrativo · Sin medición real</small></section>
      </div>
      <div class="footer-columna footer-mapa"><h2>Ubicación</h2><iframe title="Mapa de referencia del Instituto Tecnológico de Álvaro Obregón" src="https://www.google.com/maps?q=Calle%20del%20Rosal%2089%2C%20Tepeaca%2C%20Alvaro%20Obregon%2C%20Ciudad%20de%20Mexico&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe><a class="footer-mapa-link" href="https://www.google.com/maps/search/?api=1&query=Calle+del+Rosal+89+Tepeaca+Alvaro+Obregon+CDMX" target="_blank" rel="noopener noreferrer">Abrir ubicación en Google Maps ↗</a></div>
    </div>
    <div class="footer-campaigns"><img src="${base}img/logos/espacio-100.png" alt="Campaña Espacio 100% libre de plástico de un solo uso" loading="lazy"><img src="${base}img/logos/libre-unicel.png" alt="Campaña Libre de Unicel" loading="lazy"></div><div class="footer-inferior"><p>© ${year} Tecnológico Nacional de México. Todos los derechos reservados.</p><p><a class="footer-privacy-link" href="${base}pages/aviso-privacidad.html">Aviso de Privacidad</a></p></div>
  </footer>`;
}
