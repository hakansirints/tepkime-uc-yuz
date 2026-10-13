/* Viewport-aware task pages. Answers and chemical inventories belong to the stage managers. */
window.LandscapeTasks = (() => {
  const media = matchMedia('(orientation: landscape) and (max-height: 500px) and (max-width: 1024px), (orientation: landscape) and (max-width: 1366px) and (any-pointer: coarse)');
  const listeners = new Set();
  const touchMedia = matchMedia('(any-pointer: coarse)');
  const active = () => media.matches;
  let previousFocus = null, blocked = false;
  function mobilePortrait() {
    const mobile = touchMedia.matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
    if (!mobile) return false;
    // The physical screen remains portrait when a virtual keyboard reduces viewport height.
    if (screen.orientation?.type) return screen.orientation.type.startsWith('portrait');
    if (typeof window.orientation === 'number') return Math.abs(window.orientation % 180) === 0;
    return matchMedia('(orientation: portrait)').matches;
  }
  function orientationGate() {
    const gate = document.getElementById('orientationGate'); if (!gate) return;
    const next = mobilePortrait();
    gate.hidden = !next;
    for (const id of ['labAppFrame', 'labCanvasContainer']) document.getElementById(id).inert = next;
    if (next && !gate.open) gate.showModal();
    if (!next && gate.open) gate.close();
    document.body.classList.toggle('portrait-blocked', next);
    if (next && !blocked) { previousFocus = document.activeElement; document.getElementById('orientationTitle').focus({ preventScroll: true }); }
    if (!next && blocked && previousFocus?.isConnected && !previousFocus.matches('textarea,input,select')) previousFocus.focus({ preventScroll: true });
    blocked = next;
  }
  function writingSpace() {
    document.body.classList.toggle('keyboard-space', active() && (window.visualViewport?.height || innerHeight) < 280 && document.activeElement?.matches('textarea'));
  }
  function resize() {
    const v = window.visualViewport;
    document.documentElement.style.setProperty('--visible-height', (v?.height || innerHeight) + 'px');
    document.documentElement.style.setProperty('--visible-top', (v?.offsetTop || 0) + 'px');
    document.body.classList.toggle('landscape-tasks', active());
    writingSpace();
    orientationGate();
    listeners.forEach(fn => fn());
  }
  media.addEventListener('change', resize);
  touchMedia.addEventListener('change', resize);
  screen.orientation?.addEventListener?.('change', resize);
  window.addEventListener('orientationchange', resize);
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('scroll', () => document.documentElement.style.setProperty('--visible-top', window.visualViewport.offsetTop + 'px'));
  document.addEventListener('focusin', writingSpace); document.addEventListener('focusout', () => requestAnimationFrame(writingSpace));
  document.getElementById('orientationGate')?.addEventListener('cancel', event => event.preventDefault());
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
  return { active, subscribe, paginate, mobilePortrait };
})();
