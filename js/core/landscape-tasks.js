/* Viewport-aware task pages. Answers and chemical inventories belong to the stage managers. */
window.LandscapeTasks = (() => {
  const media = matchMedia('(orientation: landscape) and (max-height: 500px) and (max-width: 1024px)');
  const listeners = new Set();
  const active = () => media.matches;
  function writingSpace() {
    document.body.classList.toggle('keyboard-space', active() && (window.visualViewport?.height || innerHeight) < 280 && document.activeElement?.matches('textarea'));
  }
  function resize() {
    const v = window.visualViewport;
    document.documentElement.style.setProperty('--visible-height', (v?.height || innerHeight) + 'px');
    document.documentElement.style.setProperty('--visible-top', (v?.offsetTop || 0) + 'px');
    document.body.classList.toggle('landscape-tasks', active());
    writingSpace();
    listeners.forEach(fn => fn());
  }
  media.addEventListener('change', resize);
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('scroll', () => document.documentElement.style.setProperty('--visible-top', window.visualViewport.offsetTop + 'px'));
  document.addEventListener('focusin', writingSpace); document.addEventListener('focusout', () => requestAnimationFrame(writingSpace));
  resize();
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  // Page controls give every choice a visible, reachable location without a scrollable task.
  function paginate(host, size = 6) {
    const items = [...host.children].filter(el => !el.classList.contains('task-pages'));
    host.querySelector('.task-pages')?.remove();
    items.forEach(el => el.hidden = false);
    if (!active() || items.length <= size) return;
    const pages = Math.ceil(items.length / size);
    let page = Math.min(Number(host.dataset.page || 0), pages - 1);
    const bar = document.createElement('div'); bar.className = 'task-pages';
    const prev = document.createElement('button'), label = document.createElement('span'), next = document.createElement('button');
    prev.type = next.type = 'button'; prev.textContent = '←'; next.textContent = '→';
    prev.setAttribute('aria-label', 'Önceki kartlar'); next.setAttribute('aria-label', 'Sonraki kartlar');
    function draw() {
      host.dataset.page = page;
      items.forEach((el, i) => el.hidden = Math.floor(i / size) !== page);
      label.textContent = `${page + 1} / ${pages}`; prev.disabled = page === 0; next.disabled = page === pages - 1;
    }
    prev.onclick = () => { page--; draw(); }; next.onclick = () => { page++; draw(); };
    bar.append(prev, label, next); host.append(bar); draw();
  }
  return { active, subscribe, paginate };
})();
