(() => {
  const core = EasyListsCore;
  const counters = document.querySelector('#counters');
  const notice = document.querySelector('#notice');
  const names = {urc:'URC Kalimpong', bakery:'Station Bakehouse', sabzi:'Sabzi Mandi', grocery:'Station Grocery'};
  const catalogues = new Map();
  const pending = new Set();
  const failed = new Set();
  const format = new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', minimumFractionDigits:0, maximumFractionDigits:2});
  const money = paise => format.format(paise / 100);
  const qtyLabel = (q, unit) => unit === 'kg' && q < 1 ? Math.round(q * 1000) + ' g' : q + ' ' + unit;
  const element = (tag, text, cls) => {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  };
  function rawCart(venue) {
    const raw = JSON.parse(localStorage.getItem(core.key(venue)) || '{}');
    if (!raw || Array.isArray(raw) || typeof raw !== 'object') throw Error('Invalid list');
    return raw;
  }
  async function load(venue) {
    if (pending.has(venue) || catalogues.has(venue) || failed.has(venue)) return;
    pending.add(venue);
    try {
      const url = venue === 'urc' ? '../../../menu.json' : '../../' + venue + '/data.json';
      const response = await fetch(url);
      if (!response.ok) throw Error('Catalogue unavailable');
      const data = await response.json();
      catalogues.set(venue, (venue === 'urc' ? data : EasyCore.normalizeShop(data)).items);
    } catch { failed.add(venue); }
    finally { pending.delete(venue); render(); }
  }
  function cached(venue) {
    try { return JSON.parse(localStorage.getItem('complex.easy.listDetails.v1') || '{}')[venue]?.items || []; }
    catch { return []; }
  }
  function control(text, label, action, disabled, cls) {
    const btn = element('button', text, cls);
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.disabled = disabled;
    btn.onclick = action;
    return btn;
  }
  async function change(venue, row, delta) {
    const key = core.key(venue);
    function save() {
      const raw = rawCart(venue);
      const q = core.cart(raw, venue)[row.id];
      if (!q) return;
      if (delta === null) delete raw[row.id];
      else {
        const next = Math.round((q + delta) * 1000) / 1000;
        if (next <= 0 || next > 99) return;
        raw[row.id] = next;
      }
      localStorage.setItem(key, JSON.stringify(raw));
    }
    try {
      if (navigator.locks) await navigator.locks.request(key, save); else save();
      notice.textContent = '';
    } catch { notice.textContent = 'This browser could not save the change.'; }
    render();
  }
  function line(venue, row, known) {
    const article = element('article');
    article.dataset.item = row.id;
    const heading = element('div', null, 'item-head');
    const amount = core.total([row]);
    heading.append(element('strong',row.name), element('span',amount.unknown ? 'Price at counter' : money(amount.paise)));
    const actions = element('div',null,'item-controls');
    const step = row.unit === 'kg' ? 0.25 : 1;
    const stepper = element('div',null,'stepper');
    const quantity = known ? qtyLabel(row.quantity,row.unit) : String(row.quantity);
    stepper.append(
      control('−','Decrease '+row.name,()=>change(venue,row,-step),!known || row.quantity <= step),
      element('output',quantity),
      control('+','Increase '+row.name,()=>change(venue,row,step),!known || !catalogues.has(venue) || row.status==='out' || row.quantity + step > 99)
    );
    actions.append(stepper,control('Remove','Remove '+row.name,()=>change(venue,row,null),false,'remove'));
    article.append(heading,actions);
    return article;
  }
  function render() {
    const active = document.activeElement;
    const focus = active?.closest('article') ? [active.closest('section').dataset.counter, active.closest('article').dataset.item,active.getAttribute('aria-label')] : null;
    const fragment = document.createDocumentFragment();
    let paise = 0, partial = false;
    for (const venue of core.shops) {
      const section = element('section');
      section.dataset.counter = venue;
      const heading = element('div',null,'counter-title');
      heading.append(element('h2',names[venue]));
      section.append(heading);
      let cart;
      try { cart = core.cart(rawCart(venue),venue); }
      catch {
        section.append(element('p','This counter’s saved list could not be read.'));
        fragment.append(section); partial = true; continue;
      }
      if (!Object.keys(cart).length) continue;
      const items = catalogues.get(venue) || cached(venue);
      const ids = new Set(items.map(i=>i.id));
      const rows = core.rows(items, cart, venue);
      const sum = core.total(rows);
      paise += sum.paise; partial ||= !!sum.unknown;
      heading.append(element('span',sum.unknown ? 'Price pending' : money(sum.paise)));
      for (const row of rows) section.append(line(venue,row,ids.has(row.id)));
      if (!catalogues.has(venue)) {
        if (failed.has(venue)) {
          section.append(element('p','Catalogue unavailable. Showing saved details.','price-note'),
            control('Retry','Retry '+names[venue],()=>{failed.delete(venue);load(venue);},false));
        } else { section.append(element('p','Checking prices…','price-note')); load(venue); }
      }
      fragment.append(section);
    }
    if (!fragment.childElementCount) fragment.append(element('p','Your basket is empty. Choose something at a shop to start your trip.'));
    counters.replaceChildren(fragment);
    document.querySelector('#total-label').textContent = partial ? 'Known subtotal' : 'Estimated total';
    document.querySelector('#total').textContent = partial && !paise ? '—' : money(paise);
    if (focus) {
      const section = counters.querySelector('[data-counter="'+focus[0]+'"]');
      const article = [...(section?.querySelectorAll('article') || [])].find(a=>a.dataset.item===focus[1]);
      const btn = [...(article?.querySelectorAll('button:enabled') || [])].find(b=>b.getAttribute('aria-label')===focus[2]);
      (btn || article?.querySelector('button:enabled') || section?.querySelector('button:enabled') || counters).focus({preventScroll:true});
    }
  }
  function close() { parent.postMessage('km-close-basket',location.origin); }
  document.addEventListener('keydown', e=>{if(e.key==='Escape'){e.preventDefault();close();}});
  window.addEventListener('storage',render);
  window.addEventListener('pageshow',render);
  render();
})();
