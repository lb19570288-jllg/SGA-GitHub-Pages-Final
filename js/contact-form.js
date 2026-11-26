/* Contacto: envío a la misma base de datos, sin servicios externos. */
(function () {
  'use strict';
  const formulario = document.getElementById('participation');
  if (!formulario || document.body.dataset.page !== 'contacto') return;
  const estado = document.getElementById('formstatus');
  formulario.addEventListener('submit', function (evento) {
    evento.preventDefault();
    window.SGAForms.enviar(formulario, estado);
  });
}());
