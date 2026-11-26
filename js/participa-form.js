/* Formulario Participa: selección múltiple, 25 imágenes y guardado en servidor. */
(function () {
  'use strict';
  const formulario = document.getElementById('participation');
  if (!formulario || document.body.dataset.page !== 'participa') return;

  const detalles = document.getElementById('solicitudes-sga-desplegable');
  const resumen = document.getElementById('solicitudes-sga-resumen');
  const error = document.getElementById('solicitudes-sga-error');
  const estado = document.getElementById('formstatus');
  const descripcion = document.getElementById('solicitudes-sga-descripcion');
  const contador = document.getElementById('solicitudes-sga-contador');
  const limpiar = document.getElementById('solicitudes-sga-limpiar');
  const imagenes = document.getElementById('solicitudes-sga-imagenes');
  const estadoImagenes = document.getElementById('sga-imagenes-estado');
  const previa = document.getElementById('sga-imagenes-previa');
  const cantidadCampo = formulario.querySelector('[name="imagenes_seleccionadas"]');
  const opciones = Array.from(formulario.querySelectorAll('input[name="tipo_solicitud[]"]'));
  let urls = [];
  const maxImagenes = 25;
  const maxBytes = 4 * 1024 * 1024;
  const maxTotal = 100 * 1024 * 1024;

  function temasSeleccionados() { return opciones.filter(opcion => opcion.checked); }
  function actualizarResumen() {
    const seleccionados = temasSeleccionados();
    resumen.textContent = seleccionados.length === 0 ? 'Selecciona una o varias opciones' :
      seleccionados.length === 1 ? seleccionados[0].value :
      seleccionados.length + ' tipos de solicitud seleccionados';
    if (seleccionados.length > 0) error.hidden = true;
  }
  function actualizarContador() { contador.textContent = descripcion.value.length + ' / 3500 caracteres'; }
  function limpiarPrevia() {
    urls.forEach(url => URL.revokeObjectURL(url));
    urls = [];
    previa.replaceChildren();
  }
  function actualizarImagenes() {
    limpiarPrevia();
    const archivos = Array.from(imagenes.files || []);
    const total = archivos.reduce((n, archivo) => n + archivo.size, 0);
    const tipos = ['image/jpeg', 'image/png', 'image/webp'];
    let mensaje = archivos.length + ' de 25 imágenes seleccionadas.';
    let invalido = false;
    if (archivos.length > maxImagenes) {
      mensaje = 'Máximo 25 imágenes por solicitud.';
      invalido = true;
    } else if (archivos.some(a => !tipos.includes(a.type))) {
      mensaje = 'Solo se admiten fotografías JPG, PNG o WebP.';
      invalido = true;
    } else if (archivos.some(a => a.size > maxBytes || a.size === 0)) {
      mensaje = 'Cada fotografía debe pesar hasta 4 MB y no estar vacía.';
      invalido = true;
    } else if (total > maxTotal) {
      mensaje = 'Las fotografías superan el límite conjunto de 100 MB.';
      invalido = true;
    }
    estadoImagenes.textContent = mensaje;
    estadoImagenes.dataset.state = invalido ? 'error' : '';
    cantidadCampo.value = String(archivos.length);
    if (invalido) return false;
    archivos.forEach((archivo, i) => {
      const url = URL.createObjectURL(archivo);
      urls.push(url);
      const tarjeta = document.createElement('div');
      tarjeta.className = 'sga-miniatura';
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Vista previa ' + (i + 1);
      const titulo = document.createElement('span');
      titulo.textContent = archivo.name;
      tarjeta.append(img, titulo);
      previa.appendChild(tarjeta);
    });
    return true;
  }
  opciones.forEach(opcion => opcion.addEventListener('change', actualizarResumen));
  limpiar.addEventListener('click', () => {
    opciones.forEach(opcion => { opcion.checked = false; });
    actualizarResumen();
    detalles.open = true;
    detalles.querySelector('summary').focus();
  });
  descripcion.addEventListener('input', actualizarContador);
  imagenes.addEventListener('change', actualizarImagenes);
  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    const seleccionados = temasSeleccionados();
    if (!seleccionados.length) {
      error.hidden = false;
      detalles.open = true;
      detalles.querySelector('summary').focus();
      window.SGAForms.estado(estado, 'Selecciona al menos un tipo de solicitud.', 'error');
      return;
    }
    error.hidden = true;
    if (!actualizarImagenes()) {
      imagenes.focus();
      window.SGAForms.estado(estado, 'Corrige la selección de imágenes.', 'error');
      return;
    }
    await window.SGAForms.enviar(formulario, estado, () => {
      limpiarPrevia();
      actualizarResumen();
      actualizarContador();
      actualizarImagenes();
      detalles.open = false;
    });
  });
  actualizarResumen();
  actualizarContador();
}());
