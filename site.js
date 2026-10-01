(() => {
  'use strict';
  const links = [...document.querySelectorAll('nav a[href^="#"]')];
  const sections = [...document.querySelectorAll('main > section[id]')];
  const header = document.querySelector('.site-header');
  let scheduled = false;
  function updateSection() {
    scheduled = false;
    const threshold = header.getBoundingClientRect().height + 48;
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= threshold) current = section;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) current = sections.at(-1);
    links.forEach(link => {
      if (link.hash === `#${current.id}`) {
        if (link.getAttribute('aria-current') !== 'location') link.setAttribute('aria-current', 'location');
      } else link.removeAttribute('aria-current');
    });
  }
  function queueSection() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateSection); }
  }
  window.addEventListener('scroll', queueSection, { passive: true });
  window.addEventListener('resize', queueSection, { passive: true });
  window.addEventListener('load', queueSection, { once: true });
  updateSection();

  const dialog = document.querySelector('.figure-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const enlargedImage = dialog.querySelector('.figure-dialog-image');
  const caption = dialog.querySelector('#figure-caption');
  const closeButton = dialog.querySelector('.figure-close');
  const originalLink = dialog.querySelector('.figure-original');
  let trigger = null;
  document.querySelectorAll('.figure-link').forEach(link => {
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      const source = link.querySelector('img');
      trigger = link;
      enlargedImage.src = link.href;
      originalLink.href = link.href;
      enlargedImage.alt = source.alt;
      enlargedImage.width = source.width;
      enlargedImage.height = source.height;
      caption.textContent = link.dataset.caption;
      dialog.showModal();
      document.body.classList.add('figure-open');
      closeButton.focus({ preventScroll: true });
    });
  });
  closeButton.addEventListener('click', () => dialog.close());
  // Native Escape, focus containment, and inert background come from <dialog>.
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('figure-open');
    if (trigger) trigger.focus({ preventScroll: true });
  });
})();
