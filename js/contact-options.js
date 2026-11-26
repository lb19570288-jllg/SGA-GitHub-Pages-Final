(() => {
  const form = document.querySelector('#participation');
  if (!form) return;
  const fields = form.querySelectorAll('input,textarea');
  fields[0].name = 'nombre';
  fields[1].name = 'correo';
  fields[2].name = 'mensaje';
  const modal = document.createElement('dialog');
  modal.className = 'compose-dialog';
  modal.setAttribute('aria-labelledby', 'compose-title');
  modal.innerHTML = `<div class="compose-head"><div><small>SELECCIONAR APLICACIÓN</small><h2 id="compose-title">¿Cómo deseas enviar tu mensaje?</h2></div><button class="compose-close" type="button" aria-label="Cerrar ventana">✕</button></div><p>Elige un servicio para redactar tu mensaje. Se abrirá una aplicación o pestaña externa. El micrositio no almacena ni envía tu información.</p><div class="compose-options"><button type="button" data-service="gmail">✉️ <span><strong>Gmail</strong><small>Redactar en Gmail</small></span>↗</button><button type="button" data-service="outlook">📨 <span><strong>Outlook</strong><small>Redactar en Outlook web</small></span>↗</button><button type="button" data-service="yahoo">✉️ <span><strong>Yahoo Mail</strong><small>Redactar en Yahoo</small></span>↗</button><button type="button" data-service="mailto">💻 <span><strong>Correo predeterminado</strong><small>Aplicación configurada en Windows</small></span>↗</button><button type="button" data-service="whatsapp">💬 <span><strong>WhatsApp</strong><small>Compartir texto; elegir destinatario</small></span>↗</button></div><p class="notice">WhatsApp abre el texto preparado sin destinatario institucional; debes seleccionar el contacto. Los demás servicios pueden solicitar iniciar sesión.</p>`;
  document.body.appendChild(modal);
  modal.querySelector('.compose-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
  let draft = '';
  const destination = 'difusion@itao.edu.mx';
  form.addEventListener(
    'submit',
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!form.reportValidity()) return;
      const [nombre, correo, mensaje] = [...fields].map((x) => x.value.trim());
      if (!nombre || !correo || !mensaje) return;
      draft = `Mensaje para el Sistema de Gestión Ambiental\n\nNombre: ${nombre}\nCorreo: ${correo}\n\n${mensaje}`;
      const status = document.querySelector('#formstatus');
      if (status)
        status.textContent = 'Mensaje validado. Selecciona el medio de envío en la ventana.';
      modal.showModal();
    },
    true,
  );
  modal.querySelectorAll('[data-service]').forEach((b) =>
    b.addEventListener('click', () => {
      const service = b.dataset.service,
        subject = 'Contacto · Sistema de Gestión Ambiental',
        enc = encodeURIComponent;
      let url = '';
      if (service === 'gmail')
        url = `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(destination)}&su=${enc(subject)}&body=${enc(draft)}`;
      if (service === 'outlook')
        url = `https://outlook.office.com/mail/deeplink/compose?to=${enc(destination)}&subject=${enc(subject)}&body=${enc(draft)}`;
      if (service === 'yahoo')
        url = `https://compose.mail.yahoo.com/?to=${enc(destination)}&subject=${enc(subject)}&body=${enc(draft)}`;
      if (service === 'mailto')
        url = `mailto:${destination}?subject=${enc(subject)}&body=${enc(draft)}`;
      if (service === 'whatsapp') url = `https://wa.me/?text=${enc(draft)}`;
      if (service === 'mailto') window.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
      modal.close();
    }),
  );
})();
