/* Carrusel automático en la portada: conserva todas las fotografías locales. */
const galleryPhotos = [
  'img/banner/entrada_itao.jpg',
  'img/banner/andador.jpg',
  'img/banner/andador_1.jpg',
  'img/banner/captacion-agua.jpg',
  'img/banner/banderas.jpg',
  'img/banner/cancha_itao.jpg',
  'img/banner/cdiv.jpg',
  'img/banner/cenmaker.jpg',
  'img/banner/cic.jpg',
  'img/banner/citic.jpg',
  'img/banner/comedor.jpg',
  'img/banner/departamentos.jpg',
  'img/banner/departamentos_1.jpg',
  'img/banner/departamentos_2.jpg',
  'img/banner/fachada.jpg',
  'img/banner/itao_estac.jpg',
  'img/banner/itao_estac_1.jpg',
  'img/banner/itao_estac_2.jpg',
  'img/banner/mural_itao.jpg',
  'img/banner/mural_itao_1.jpg',
  'img/banner/piso1.jpg',
  'img/banner/piso2.jpg',
  'img/banner/piso3.jpg',
  'img/banner/piso4.jpg',
  'img/banner/placas.jpg',
  'img/banner/placas_1.jpg',
  'img/banner/sac_almacen.jpg',
  'img/banner/sac_se.jpg',
  'img/banner/itao_salida.jpg',
  'img/banner/itao_salida_1.jpg',
  'img/banner/itao_salida_2.jpg',
];
(() => {
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  if (slides.length !== 2 || !galleryPhotos.length) return;
  let current = 0,
    visible = 0;
  slides[0].style.backgroundImage = `url("${galleryPhotos[0]}")`;
  if (galleryPhotos.length < 2) return;
  const advance = () => {
    const next = (current + 1) % galleryPhotos.length;
    const hidden = 1 - visible;
    const preload = new Image();
    preload.onload = () => {
      slides[hidden].style.backgroundImage = `url("${galleryPhotos[next]}")`;
      slides[hidden].classList.add('is-active');
      slides[visible].classList.remove('is-active');
      visible = hidden;
      current = next;
    };
    preload.src = galleryPhotos[next];
  };
  let timer = setInterval(advance, 5500);
  document.addEventListener('visibilitychange', () => {
    clearInterval(timer);
    if (!document.hidden) timer = setInterval(advance, 5500);
  });
})();
