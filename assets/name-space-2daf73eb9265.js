(() => {
  'use strict';

  const stage = document.querySelector('.name-space');
  if (!stage) return;
  const canvas = stage.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  const heading = stage.querySelector('h1');
  const toggle = stage.querySelector('.motion-toggle');
  const fieldState = stage.querySelector('[data-field-state]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
  const chineseFont = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  const palette = ['#e4edf5', '#c0d4e5', '#9bb5cf'];
  let width = 0, height = 0, particles = [], stars = [];
  let titleBounds = { left: 0, right: 0, top: 0, bottom: 0 };
  let manualPaused = false, paused = reducedMotion.matches, inView = true, frameId = 0;
  let lastFrame = 0, sceneTime = 0, interaction = 0, pulseUntil = 0;
  const pointer = { x: 0, y: 0, active: false };

  function canAnimate() {
    return !paused && inView && !document.hidden;
  }

  function updateStatus() {
    fieldState.textContent = paused ? 'STILL' : pointer.active ? 'FLOW' : 'CALM';
    toggle.textContent = paused ? 'Resume motion' : 'Pause motion';
    toggle.setAttribute('aria-pressed', String(paused));
    stage.classList.toggle('is-still', !canAnimate());
  }

  function buildField() {
    const nextWidth = stage.clientWidth, nextHeight = stage.clientHeight;
    if (!nextWidth || !nextHeight) return;
    width = nextWidth;
    height = nextHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    const ink = mask.getContext('2d', { willReadFrequently: true });
    if (!ink) return;
    const latin = [...heading.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join('').trim();
    const chinese = heading.querySelector('[lang]').textContent;
    let size = Math.min(52, width * .105);
    const gap = Math.max(12, size * .4);
    ink.font = `550 ${size}px ${font}`;
    let latinWidth = ink.measureText(latin).width;
    ink.font = `500 ${size * .76}px ${chineseFont}`;
    let chineseWidth = ink.measureText(chinese).width;
    const fit = Math.min(1, (width - 42) / (latinWidth + gap + chineseWidth));
    size *= fit;
    latinWidth *= fit;
    chineseWidth *= fit;
    const start = (width - latinWidth - gap - chineseWidth) / 2;
    const baseline = height * .51 + size * .32;
    ink.fillStyle = '#fff';
    ink.font = `550 ${size}px ${font}`;
    ink.fillText(latin, start, baseline);
    ink.font = `500 ${size * .76}px ${chineseFont}`;
    ink.fillText(chinese, start + latinWidth + gap, baseline - size * .025);

    const pixels = ink.getImageData(0, 0, width, height).data;
    const spacing = width < 500 ? 1.65 : 1.9;
    particles = [];
    for (let y = Math.floor(baseline - size * 1.2); y < baseline + size * .25; y += spacing) {
      for (let x = Math.floor(start); x < start + latinWidth + gap + chineseWidth + 2; x += spacing) {
        const alpha = pixels[(Math.floor(y) * width + Math.floor(x)) * 4 + 3];
        if (alpha > 110) {
          const seed = Math.random();
          particles.push({ homeX: x, homeY: y, x, y, vx: 0, vy: 0,
            radius: width < 500 ? .62 + seed * .17 : .66 + seed * .22,
            phase: seed * Math.PI * 2, color: seed < .65 ? 0 : seed < .92 ? 1 : 2 });
        }
      }
    }
    titleBounds = { left: start - 35, right: start + latinWidth + gap + chineseWidth + 35,
      top: baseline - size - 24, bottom: baseline + 24 };
    stars = Array.from({ length: width < 500 ? 30 : 58 }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      radius: .3 + Math.random() * .65, alpha: .08 + Math.random() * .25,
      phase: Math.random() * Math.PI * 2, depth: .3 + Math.random() * .7
    }));
    pointer.active = false;
    interaction = 0;
    draw(0);
    if (particles.length) {
      stage.classList.add('particle-ready');
      stage.dataset.particleCount = String(particles.length);
      toggle.hidden = false;
    }
    updateStatus();
    schedule();
  }

  function draw(dt) {
    context.clearRect(0, 0, width, height);
    const t = sceneTime;
    // Separate, barely moving depths keep the space quiet behind the letters.
    for (const star of stars) {
      const x = star.x + Math.sin(t * .07 + star.phase) * 7 * star.depth;
      const y = star.y + Math.cos(t * .09 + star.phase) * 5 * star.depth;
      context.globalAlpha = star.alpha * (.85 + Math.sin(t * .22 + star.phase) * .15);
      context.fillStyle = '#b6cee4';
      context.beginPath();
      context.arc(x, y, star.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = .07;
    context.strokeStyle = '#8ca8c2';
    context.lineWidth = .6;
    context.beginPath();
    context.ellipse(width * .73, height * 1.2, width * .4, height * .85, -.18 + Math.sin(t * .018) * .025, Math.PI, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;

    const step = Math.min(dt * 60, 2);
    interaction += ((pointer.active ? 1 : 0) - interaction) * Math.min(.07 * step, 1);
    const radius = width < 500 ? 52 : 72;
    for (const particle of particles) {
      if (step) {
        const dx = particle.x - pointer.x, dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        let forceX = 0, forceY = 0;
        if (interaction > .002 && distance < radius) {
          const directionX = distance > .1 ? dx / distance : Math.cos(particle.phase);
          const directionY = distance > .1 ? dy / distance : Math.sin(particle.phase);
          const force = Math.pow(1 - distance / radius, 2) * 1.15 * interaction;
          forceX = (directionX - directionY * .15) * force;
          forceY = (directionY + directionX * .15) * force;
        }
        const homeX = particle.homeX + Math.sin(t * .45 + particle.phase) * .23;
        const homeY = particle.homeY + Math.cos(t * .4 + particle.phase) * .23;
        particle.vx = (particle.vx + ((homeX - particle.x) * .014 + forceX) * step) * Math.pow(.86, step);
        particle.vy = (particle.vy + ((homeY - particle.y) * .014 + forceY) * step) * Math.pow(.86, step);
        particle.x += particle.vx * step;
        particle.y += particle.vy * step;
      }
    }
    // Batched paths keep even the Chinese strokes inexpensive on mobile.
    palette.forEach((color, index) => {
      context.fillStyle = color;
      context.beginPath();
      for (const particle of particles) {
        if (particle.color !== index) continue;
        context.moveTo(particle.x + particle.radius, particle.y);
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      }
      context.fill();
    });
  }

  function frame(now) {
    frameId = 0;
    if (!canAnimate()) return;
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .033) : 0;
    lastFrame = now;
    sceneTime += dt;
    if (pulseUntil && now > pulseUntil) leave();
    draw(dt);
    schedule();
  }

  function schedule() {
    if (canAnimate() && !frameId) frameId = requestAnimationFrame(frame);
  }

  function syncMotion() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrame = 0;
    updateStatus();
    schedule();
  }

  function move(event) {
    if (event.target.closest('button') || paused) return;
    const box = stage.getBoundingClientRect();
    pointer.x = event.clientX - box.left;
    pointer.y = event.clientY - box.top;
    pointer.active = pointer.x > titleBounds.left && pointer.x < titleBounds.right && pointer.y > titleBounds.top && pointer.y < titleBounds.bottom;
    pulseUntil = 0;
    updateStatus();
  }

  function leave() {
    pointer.active = false;
    pulseUntil = 0;
    updateStatus();
  }

  stage.addEventListener('pointermove', move, { passive: true });
  stage.addEventListener('pointerdown', move, { passive: true });
  stage.addEventListener('pointerleave', leave);
  stage.addEventListener('pointercancel', leave);
  stage.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') leave(); });
  stage.addEventListener('blur', leave);
  stage.addEventListener('keydown', event => {
    if (event.target !== stage || paused || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    pointer.x = width / 2;
    pointer.y = height / 2;
    pointer.active = true;
    pulseUntil = performance.now() + 1100;
    updateStatus();
  });
  toggle.addEventListener('click', () => {
    paused = !paused;
    manualPaused = paused;
    leave();
    syncMotion();
  });
  reducedMotion.addEventListener('change', () => {
    paused = manualPaused || reducedMotion.matches;
    leave();
    syncMotion();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) leave();
    syncMotion();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (!inView) leave();
      syncMotion();
    }, { threshold: .01 }).observe(stage);
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      if (stage.clientWidth !== width || stage.clientHeight !== height) buildField();
    }).observe(stage);
  } else {
    window.addEventListener('resize', buildField, { passive: true });
  }
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(buildField).catch(() => {
    // A normal semantic heading remains visible if canvas or font setup fails.
    stage.classList.remove('particle-ready');
    toggle.hidden = true;
    paused = true;
    syncMotion();
  });
})();
