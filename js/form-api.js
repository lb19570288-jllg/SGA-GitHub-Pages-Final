/* Formularios SGA: PHP local, cPanel o GitHub Pages conectado por HTTPS. */
(function () {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  function errorTexto(error) {
    return error && error.message ? error.message : 'No se pudo establecer comunicación con el servidor.';
  }
  function estado(elemento, texto, tipo) {
    if (!elemento) return;
    elemento.textContent = texto;
    elemento.dataset.state = tipo || '';
  }
  async function apiBase() {
    if (!['http:', 'https:'].includes(location.protocol)) {
      throw new Error('Abre el micrositio desde un servidor web.');
    }
    let config;
    try {
      const response = await fetch(new URL('js/api-config.json', base), { cache: 'no-store' });
      if (!response.ok) throw new Error();
      config = await response.json();
    } catch (_) { throw new Error('No se pudo leer la configuración pública del buzón.'); }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    if (local && !config.static_pages) return new URL('api/', base);
    if (config.api_base) {
      const url = new URL(config.api_base);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/api/')) {
        throw new Error('La dirección del buzón debe ser HTTPS y terminar en /api/.');
      }
      return url;
    }
    if (config.static_pages || location.hostname.endsWith('.github.io')) {
      throw new Error('El buzón aún no está conectado al servidor institucional. Tu mensaje no ha sido enviado.');
    }
    return new URL('api/', base);
  }
  async function obtenerToken(api) {
    api = api || await apiBase();
    let respuesta;
    try {
      respuesta = await fetch(new URL('form-token.php', api), { credentials: 'omit', cache: 'no-store', redirect: 'error' });
    } catch (_) {
      throw new Error('No hay conexión con el buzón institucional. Revisa HTTPS y la autorización del dominio.');
    }
    let datos;
    try { datos = await respuesta.json(); }
    catch (_) { throw new Error('El servidor no está ejecutando PHP correctamente.'); }
    if (!respuesta.ok || !datos.ok) throw new Error(datos.error || 'No se pudo iniciar el formulario.');
    if (!datos.habilitado || !datos.csrf) throw new Error('El buzón institucional todavía no está habilitado. Tu mensaje no ha sido enviado.');
    return datos;
  }
  async function enviar(formulario, contenedorEstado, luegoDeEnviar) {
    const boton = formulario.querySelector('[type="submit"]');
    if (boton.disabled || !formulario.reportValidity()) return;
    boton.disabled = true;
    // Captura los datos antes de cualquier espera; no se almacenan en el navegador.
    const formData = new FormData(formulario);
    estado(contenedorEstado, 'Enviando solicitud de forma segura…', 'sending');
    try {
      const api = await apiBase();
      const token = await obtenerToken(api);
      const files = formData.getAll('imagenes[]').filter(f => f instanceof File && f.size > 0);
      if (files.length > Math.min(token.max_imagenes, token.max_archivos_servidor)) {
        throw new Error('El servidor admite menos imágenes que las seleccionadas. Reduce la cantidad o consulta al administrador.');
      }
      if (files.some(f => f.size > token.max_bytes_imagen)) throw new Error('Una imagen supera el límite del servidor.');
      formData.set('csrf', token.csrf);
      let respuesta;
      try {
        respuesta = await fetch(new URL('submit.php', api), {
          method: 'POST', credentials: 'omit', body: formData, redirect: 'error'
        });
      } catch (_) {
        throw new Error('No se pudo confirmar el envío. Consulta al responsable antes de repetirlo para evitar duplicados.');
      }
      let datos;
      try { datos = await respuesta.json(); }
      catch (_) { throw new Error('El servidor no confirmó el registro. Revisa los límites de PHP y consulta antes de repetir el envío.'); }
      if (!respuesta.ok || !datos.ok || !datos.folio) throw new Error(datos.error || 'No se pudo registrar la solicitud.');
      formulario.reset();
      if (typeof luegoDeEnviar === 'function') luegoDeEnviar();
      estado(contenedorEstado, 'Solicitud registrada correctamente. Tu folio es ' + datos.folio + '. Consérvalo para referencia.', 'success');
    } catch (err) {
      estado(contenedorEstado, errorTexto(err), 'error');
    } finally {
      boton.disabled = false;
    }
  }
  window.SGAForms = { enviar: enviar, estado: estado, obtenerToken: obtenerToken };
}());
