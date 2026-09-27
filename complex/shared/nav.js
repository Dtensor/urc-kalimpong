/* Station Complex switcher, shared by every page in the complex.
   ComplexNav.mount('bakery')                 → appends a "Station Complex" button to #brand (or body)
   ComplexNav.mount('plaza', {anchor: el})    → appends it inside el
   ComplexNav.places / ComplexNav.href(id)    → the same links, for scene doors and boards
   Paths are relative so the files work locally (complex/ as web root) and on Pages (/complex/). */
(function () {
  const PLACES = [
    { id: 'urc', name: 'URC Canteen', sub: 'CSD · 1,700+ items', color: '#1f5f4a', glyph: '★' },
    { id: 'bakery', name: 'Bakery', sub: 'Breads, cakes & sweets', color: '#c46a7a', glyph: '◐' },
    { id: 'sabzi', name: 'Sabzi Mandi', sub: 'Fresh vegetables & fruit', color: '#4f8a3a', glyph: '❦' },
    { id: 'grocery', name: 'Grocery', sub: 'Staples, spices & more', color: '#34467a', glyph: '▦' },
    { id: 'cinema', name: 'Cinema', sub: 'Now showing · trailers', color: '#7a1f2b', glyph: '◉' },
  ];
  let here = 'plaza';
  const up = () => (here === 'plaza' ? '' : '../');
  function href(id, opts) {
    if (id === 'plaza') return up() || './';
    if (id === 'urc') return up() + '../' + (opts && opts.walk ? 'mall/' : '');
    return up() + id + '/';
  }

  const css = `
.cx-btn{display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:4px 10px 4px 8px;border-radius:999px;
  border:1px solid var(--line,#dedad2);background:var(--panel-2,#f3f0ea);color:var(--ink,#1d1e21);
  font:600 11.5px/1.2 var(--sans,'Instrument Sans',system-ui,sans-serif);letter-spacing:.02em;cursor:pointer}
.cx-btn:hover{border-color:var(--accent,#1f5f4a)}
.cx-btn svg{width:12px;height:12px;flex:none}
.cx-pop{position:fixed;z-index:60;min-width:270px;max-width:calc(100vw - 32px);padding:8px;border-radius:16px;
  background:var(--glass,rgba(252,251,248,.94));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  border:1px solid var(--line,#dedad2);box-shadow:var(--shadow,0 18px 50px rgba(28,29,32,.18));
  font-family:var(--sans,'Instrument Sans',system-ui,sans-serif);color:var(--ink,#1d1e21)}
.cx-pop h6{margin:4px 8px 6px;font:600 10.5px/1 var(--sans,system-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--muted,#62666d)}
.cx-pop a{display:flex;align-items:center;gap:10px;padding:8px;border-radius:11px;color:inherit;text-decoration:none}
.cx-pop a:hover,.cx-pop a:focus-visible{background:var(--panel-2,#f3f0ea);outline:none}
.cx-pop a[aria-current]{background:var(--panel-2,#f3f0ea)}
.cx-dot{width:30px;height:30px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;display:grid;place-items:center;color:#fff;font-size:14px;flex:none;
  box-shadow:inset 0 -3px 0 rgba(0,0,0,.18)}
.cx-t{display:flex;flex-direction:column;line-height:1.2;min-width:0}
.cx-t b{font:600 15px/1.15 var(--display,'Fraunces',Georgia,serif)}
.cx-t small{color:var(--muted,#62666d);font-size:12px}
.cx-go{margin-left:auto;font-size:11px;font-weight:600;color:var(--accent,#1f5f4a);white-space:nowrap}
.cx-sep{height:1px;background:var(--line,#dedad2);margin:6px 8px}
.cx-urc{display:flex;gap:6px;padding:0 8px 6px 48px}
.cx-urc a{padding:4px 10px;border-radius:999px;border:1px solid var(--line,#dedad2);font-size:12px;font-weight:600}`;

  function mount(id, opts) {
    here = id;
    opts = opts || {};
    if (!document.getElementById('cx-style')) {
      const s = document.createElement('style'); s.id = 'cx-style'; s.textContent = css; document.head.appendChild(s);
    }
    const anchor = opts.anchor || document.getElementById('brand') || document.body;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'cx-btn'; btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 11V5.5L6 1l5 4.5V11H7.5V7.5h-3V11z" fill="currentColor"/></svg>Station Complex<span aria-hidden="true">▾</span>';
    anchor.appendChild(btn);

    const pop = document.createElement('nav');
    pop.className = 'cx-pop'; pop.hidden = true; pop.setAttribute('aria-label', 'Places in Station Complex');
    const row = p => `<a href="${href(p.id, { walk: p.id === 'urc' })}" ${p.id === here ? 'aria-current="page"' : ''}>
      <span class="cx-dot" style="background:${p.color}">${p.glyph}</span>
      <span class="cx-t"><b>${p.name}</b><small>${p.sub}</small></span>
      <span class="cx-go">${p.id === here ? 'You are here' : 'Go →'}</span></a>`;
    pop.innerHTML = `<h6>Station Complex · Kalimpong</h6>${row(PLACES[0])}
      <div class="cx-urc"><a href="${href('urc', { walk: true })}">Walk in (3D)</a><a href="${href('urc')}">Shop list</a></div>
      <div class="cx-sep"></div>${PLACES.slice(1).map(row).join('')}
      <div class="cx-sep"></div><a href="${href('plaza')}" ${here === 'plaza' ? 'aria-current="page"' : ''}>
      <span class="cx-dot" style="background:#8a7a5c">⌂</span><span class="cx-t"><b>The plaza</b><small>The courtyard, all shops around you</small></span>
      <span class="cx-go">${here === 'plaza' ? 'You are here' : 'Go →'}</span></a>`;
    document.body.appendChild(pop);

    const place = () => {
      const r = btn.getBoundingClientRect(), w = Math.min(300, innerWidth - 32);
      pop.style.width = w + 'px';
      pop.style.left = Math.max(16, Math.min(r.left, innerWidth - w - 16)) + 'px';
      pop.style.top = (r.bottom + 8) + 'px';
      pop.style.maxHeight = (innerHeight - r.bottom - 24) + 'px'; pop.style.overflow = 'auto';
    };
    const close = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (pop.hidden) { place(); pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); pop.querySelector('a').focus(); }
      else close();
    });
    // keep scene controls (WASD, drag) from firing while the menu is in use
    pop.addEventListener('pointerdown', e => e.stopPropagation());
    pop.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { close(); btn.focus(); } });
    document.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) close(); });
    addEventListener('resize', () => { if (!pop.hidden) place(); });
    return { button: btn, menu: pop, close };
  }

  window.ComplexNav = { mount, href, places: PLACES };
})();
