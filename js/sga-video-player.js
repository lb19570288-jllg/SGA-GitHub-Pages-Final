/* Reproductor SGA, sin reloj ni controles nativos visibles.
   Al terminar regresa automáticamente a la portada con botón Play. */
(() => {
  'use strict';
  const shell = document.querySelector('[data-sga-player]');
  if (!shell) return;
  const video = shell.querySelector('video');
  const main = shell.querySelector('[data-video-main]');
  const toggle = shell.querySelector('[data-video-toggle]');
  const progress = shell.querySelector('[data-video-progress]');
  const fullscreen = shell.querySelector('[data-video-fullscreen]');
  const status = shell.querySelector('[data-video-status]');
  const controls = shell.querySelector('.sga-video-player__controls');
  if (!video || !main || !toggle || !progress) return;

  // Versión Full HD (1080p/30 fps) para una reproducción estable en equipos modestos.
  // El MP4 4K original sigue en la etiqueta video como fuente de respaldo.
  const originalSource = video.querySelector('source[type="video/mp4"]');
  if (originalSource && !video.querySelector('[data-sga-optimized]')) {
    const optimizedSource = document.createElement('source');
    optimizedSource.src = '../video/que-es-sga-1080p.mp4';
    optimizedSource.type = 'video/mp4';
    optimizedSource.dataset.sgaOptimized = 'true';
    video.insertBefore(optimizedSource, originalSource);
    video.load();
  }

  // Los controles se construyen aquí para no sobrescribir js/pages.js ni sus cambios recientes.
  // No hay ningún reloj de duración visible.
  let volumeButton = null;
  let volumeSlider = null;
  let lastAudibleVolume = video.volume > 0 ? video.volume : 1;
  if (controls && !controls.querySelector('[data-video-volume]')) {
    const volumeGroup = document.createElement('div');
    volumeGroup.className = 'sga-video-player__volume-group';
    volumeGroup.setAttribute('role', 'group');
    volumeGroup.setAttribute('aria-label', 'Control de volumen');

    volumeButton = document.createElement('button');
    volumeButton.type = 'button';
    volumeButton.className = 'sga-video-player__volume-toggle';
    volumeButton.dataset.videoMute = 'true';
    volumeButton.innerHTML = '<svg class="sga-video-player__speaker-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6"/><path d="M18 6a9 9 0 0 1 0 12"/></svg>'+
      '<svg class="sga-video-player__speaker-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/></svg>';

    volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.className = 'sga-video-player__volume-slider';
    volumeSlider.dataset.videoVolume = 'true';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.step = '1';
    volumeSlider.setAttribute('aria-label', 'Subir o bajar volumen');

    volumeGroup.append(volumeButton, volumeSlider);
    if (fullscreen && fullscreen.parentNode === controls) {
      controls.insertBefore(volumeGroup, fullscreen);
    } else {
      controls.append(volumeGroup);
    }

    const renderVolume = () => {
      const level = video.muted ? 0 : Math.round(video.volume * 100);
      volumeSlider.value = String(level);
      volumeSlider.style.setProperty('--sga-volume-percent', level + '%');
      volumeSlider.setAttribute('aria-valuetext', level + '% de volumen');
      volumeButton.classList.toggle('is-muted', level === 0);
      volumeButton.setAttribute('aria-label', level === 0 ? 'Activar sonido' : 'Silenciar video');
      volumeButton.title = level === 0 ? 'Activar sonido' : 'Silenciar';
    };
    volumeSlider.addEventListener('input', () => {
      const level = Math.max(0, Math.min(100, Number(volumeSlider.value))) / 100;
      video.volume = level;
      video.muted = level === 0;
      if (level > 0) lastAudibleVolume = level;
      renderVolume();
    });
    volumeButton.addEventListener('click', () => {
      if (video.muted || video.volume === 0) {
        video.volume = Math.max(0.05, lastAudibleVolume);
        video.muted = false;
      } else {
        lastAudibleVolume = video.volume;
        video.muted = true;
      }
      renderVolume();
    });
    video.addEventListener('volumechange', renderVolume);
    renderVolume();
  }

  // Marcador de tiempo y duración en la barra, sin modificar pages.js.
  let clock = null;
  if (controls) {
    clock = controls.querySelector('[data-video-time]');
    if (!clock) {
      clock = document.createElement('output');
      clock.className = 'sga-video-player__time';
      clock.dataset.videoTime = 'true';
      clock.setAttribute('aria-label', 'Tiempo reproducido y duración total');
      clock.setAttribute('aria-live', 'off');
      const elapsed = document.createElement('span');
      elapsed.dataset.videoElapsed = 'true';
      const separator = document.createElement('span');
      separator.className = 'sga-video-player__time-divider';
      separator.textContent = ' / ';
      const total = document.createElement('span');
      total.className = 'sga-video-player__time-total';
      total.dataset.videoTotal = 'true';
      clock.append(elapsed, separator, total);
      controls.insertBefore(clock, controls.querySelector('.sga-video-player__volume-group') || fullscreen);
    }
  }
  const timeElapsed = clock ? clock.querySelector('[data-video-elapsed]') : null;
  const timeTotal = clock ? clock.querySelector('[data-video-total]') : null;
  const formatTime = seconds => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const whole = Math.floor(seconds);
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const secs = String(whole % 60).padStart(2, '0');
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
  };

  // El panel desaparece cuando el ratón abandona el video y reaparece al entrar.
  // En móvil un toque revela los controles; no se ocultan mientras se interactúa.
  let touchHideTimer = null;
  let seeking = false;
  let state = 'idle';
  const showControls = () => {
    shell.classList.remove('is-controls-hidden');
    if (touchHideTimer !== null) { clearTimeout(touchHideTimer); touchHideTimer = null; }
  };
  const hideControls = () => {
    if (seeking) return;
    shell.classList.add('is-controls-hidden');
  };
  const scheduleTouchHide = () => {
    if (touchHideTimer !== null) clearTimeout(touchHideTimer);
    touchHideTimer = null;
    if (state === 'playing') {
      touchHideTimer = setTimeout(() => {
        touchHideTimer = null;
        if (!seeking) hideControls();
      }, 4500);
    }
  };
  // Mantener visibles los controles cuando se navega con Tab.
  shell.addEventListener('focusin', showControls);
  shell.addEventListener('keydown', showControls);
  shell.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') showControls();
  });
  shell.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'touch') {
      // Un clic con ratón no debe dejar la barra abierta tras salir del reproductor.
      if (document.activeElement && controls && controls.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      hideControls();
    }
  });
  shell.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') {
      showControls();
      scheduleTouchHide();
    }
  });
  controls?.addEventListener('pointerdown', showControls);
  // Estado inicial: el gran botón Play permanece siempre visible en la portada.
  if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    shell.classList.add('is-controls-hidden');
  }

  const setState = next => {
    state = next;
    shell.classList.remove('is-idle', 'is-playing', 'is-paused');
    shell.classList.add('is-' + next);
    const playing = next === 'playing';
    main.hidden = playing;
    main.setAttribute('aria-label', next === 'idle' ? 'Reproducir video' : 'Continuar video');
    toggle.setAttribute('aria-label', playing ? 'Pausar video' : 'Reproducir video');
    // En pausa se respeta el estado del cursor; en móvil se deja tiempo para intervenir.
    if (playing && window.matchMedia && window.matchMedia('(hover: none)').matches) {
      scheduleTouchHide();
    }
    if (!playing && touchHideTimer !== null) {
      clearTimeout(touchHideTimer);
      touchHideTimer = null;
      showControls();
    }
  };
  const renderProgress = (percent, position) => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const pct = Math.max(0, Math.min(100, percent));
    progress.value = String(pct);
    progress.style.setProperty('--sga-video-progress', pct.toFixed(2) + '%');
    progress.setAttribute('aria-valuetext', `${formatTime(position)} de ${formatTime(duration)}`);
    if (timeElapsed) timeElapsed.textContent = formatTime(position);
    if (timeTotal) timeTotal.textContent = formatTime(duration);
    if (clock) clock.setAttribute('aria-label', `${formatTime(position)} de ${formatTime(duration)}`);
  };
  const setProgress = () => {
    if (seeking) return; // Evita saltos del deslizador por eventos timeupdate durante el arrastre.
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const percent = duration > 0 ? (video.currentTime / duration) * 100 : 0;
    renderProgress(percent, Math.max(0, video.currentTime || 0));
  };
  const seekToSlider = () => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!duration) return;
    const pct = Math.max(0, Math.min(100, Number(progress.value) || 0));
    const desired = (pct / 100) * duration;
    renderProgress(pct, desired);
    try { video.currentTime = desired; } catch (_) { /* Medio aún no disponible. */ }
  };
  const play = () => {
    if (video.ended) video.currentTime = 0;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        setState(video.currentTime ? 'paused' : 'idle');
        status.textContent = 'No se pudo iniciar el video. Comprueba el archivo e inténtalo de nuevo.';
      });
    }
  };
  const togglePlayback = () => {
    if (video.paused || video.ended) play();
    else video.pause();
  };
  main.addEventListener('click', togglePlayback);
  toggle.addEventListener('click', togglePlayback);
  video.addEventListener('play', () => { setState('playing'); status.textContent = 'Reproduciendo video'; });
  video.addEventListener('pause', () => {
    if (!video.ended && state !== 'idle') {
      setState(video.currentTime > 0 ? 'paused' : 'idle');
      status.textContent = 'Video en pausa';
    }
  });
  video.addEventListener('timeupdate', setProgress);
  video.addEventListener('loadedmetadata', setProgress);
  video.addEventListener('durationchange', setProgress);
  video.addEventListener('seeked', setProgress);
  video.addEventListener('ended', () => {
    video.pause();
    try { video.currentTime = 0; } catch (_) { /* Si no se puede, el póster se verá de todos modos. */ }
    setProgress();
    setState('idle');
    status.textContent = 'El video terminó. Pulsa Reproducir para verlo de nuevo.';
  });
  progress.addEventListener('pointerdown', () => { seeking = true; showControls(); });
  progress.addEventListener('input', seekToSlider);
  progress.addEventListener('change', () => { seekToSlider(); seeking = false; setProgress(); });
  progress.addEventListener('pointerup', () => {
    seeking = false; setProgress();
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches && !shell.matches(':hover')) hideControls();
  });
  progress.addEventListener('pointercancel', () => { seeking = false; setProgress(); });
  progress.addEventListener('blur', () => { seeking = false; setProgress(); });
  if (fullscreen) {
    if (!shell.requestFullscreen) fullscreen.hidden = true;
    fullscreen.addEventListener('click', () => {
      if (document.fullscreenElement === shell && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (shell.requestFullscreen) {
        const promise = shell.requestFullscreen();
        if (promise && typeof promise.catch === 'function') promise.catch(() => {});
      }
    });
  }
  shell.addEventListener('keydown', event => {
    if (event.target.closest('button, input')) return;
    if (event.key === ' ' || event.key.toLowerCase() === 'k') {
      event.preventDefault();
      togglePlayback();
    }
  });
  setState('idle');
  setProgress();
})();
