(() => {
  const core = EasyListsCore;
  const counters = document.querySelector('#counters');
  const notice = document.querySelector('#notice');
  const picker = document.querySelector('#counter-picker');
  const choice = document.querySelector('#counter-choice');
  const toggle = document.querySelector('#toggle-slip');
  const shop = document.querySelector('#shop-list');
  const progress = document.querySelector('#pick-progress');
  const tripKey = 'complex.pickup.v1.counter';
  const markPrefix = 'complex.pickup.v1.item.';
  const markKey = (venue, id) => markPrefix + venue + '.' + id;
  let shopping = false;
  let nextCounter = null;
  let showingSlip = false;
  let selected = new URLSearchParams(location.search).get('counter');
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
    try {
      const items = JSON.parse(localStorage.getItem('complex.easy.listDetails.v1') || '{}')[venue]?.items;
      return Array.isArray(items) ? items.filter(i => i && core.safeId(i.id)) : [];
    }
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
  function saveProgress(update) {
    try { update(); notice.textContent = ''; }
    catch { notice.textContent = 'This browser could not save your checklist.'; }
    updatePresentation(false);
  }
  function switchCounter(venue) {
    saveProgress(() => localStorage.setItem(tripKey,venue));
    document.querySelector('main').scrollTop = 0;
    counters.focus({preventScroll:true});
  }
  function checklistLine(venue,row,quantity) {
    const label = element('label',null,'pick-row');
    const input = element('input');
    input.type = 'checkbox';
    const key = markKey(venue,row.id);
    input.checked = localStorage.getItem(key) === String(row.quantity);
    input.setAttribute('aria-label',row.name + ', ' + quantity);
    input.onchange = () => saveProgress(() => {
      if (input.checked) localStorage.setItem(key,String(row.quantity));
      else localStorage.removeItem(key);
    });
    const words = element('span');
    words.append(element('strong',row.name),element('span',quantity,'pick-quantity'));
    label.append(input,words);
    return label;
  }
  function pickQuantity(row,known) {
    if (!known) return 'Quantity ' + row.quantity + ' · unit unconfirmed';
    if (row.unit === 'each') return 'Quantity ' + row.quantity;
    if (/^\d+g$/.test(row.unit)) return row.quantity + ' × ' + row.unit.replace('g',' g');
    const plurals = {bunch:'bunches', box:'boxes', pouch:'pouches', pack:'packs', piece:'pieces',
      plate:'plates', bottle:'bottles', jar:'jars', sack:'sacks', tin:'tins'};
    return qtyLabel(row.quantity,row.quantity > 1 ? plurals[row.unit] || row.unit : row.unit);
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
    const quantity = known ? qtyLabel(row.quantity,row.unit) : String(row.quantity);
    if (shopping) {
      article.append(checklistLine(venue,row,pickQuantity(row,known)));
      return article;
    }
    if (showingSlip) {
      const displayQuantity = !known ? 'Quantity ' + row.quantity + ' · unit unconfirmed'
        : row.unit === 'each' ? 'Quantity ' + row.quantity : quantity;
      article.append(heading,element('p',displayQuantity,'slip-quantity'));
      return article;
    }
    const actions = element('div',null,'item-controls');
    const step = row.unit === 'kg' ? 0.25 : 1;
    const stepper = element('div',null,'stepper');
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
    const carts = new Map();
    for (const venue of core.shops) {
      try {
        const cart = core.cart(rawCart(venue),venue);
        if (Object.keys(cart).length) carts.set(venue,cart);
      } catch { carts.set(venue,null); }
    }
    const available = [...carts.keys()].filter(venue=>carts.get(venue));
    const marks = new Set();
    const remaining = new Map();
    let savedCounter = null;
    try {
      savedCounter = localStorage.getItem(tripKey);
      for (const key of Object.keys(localStorage).filter(k => k.startsWith(markPrefix))) {
        const suffix = key.slice(markPrefix.length);
        const dot = suffix.indexOf('.');
        const venue = suffix.slice(0,dot);
        if (carts.get(venue) === null) continue;
        const quantity = carts.get(venue)?.[suffix.slice(dot+1)];
        if (quantity && String(quantity) === localStorage.getItem(key)) marks.add(key);
        else localStorage.removeItem(key);
      }
      if (!carts.size) { localStorage.removeItem(tripKey); savedCounter = null; }
    } catch { notice.textContent = 'This browser could not read your checklist.'; }
    for (const venue of available) {
      remaining.set(venue,Object.keys(carts.get(venue)).filter(id=>!marks.has(markKey(venue,id))).length);
    }
    shopping = core.shops.includes(savedCounter) && !!available.length;
    if (shopping) {
      selected = available.includes(savedCounter) ? savedCounter : available.find(v=>remaining.get(v)) || available[0];
      if (selected !== savedCounter) {
        try { localStorage.setItem(tripKey,selected); } catch { /* Keep the current view usable. */ }
      }
      showingSlip = false;
    }
    if (showingSlip && !available.includes(selected)) selected = available[0];
    if (!available.length) showingSlip = false;
    if (choice.options.length !== available.length || available.some((v,i)=>choice.options[i]?.value !== v)) {
      choice.replaceChildren(...available.map(v=>new Option(names[v],v)));
    }
    choice.value = selected || '';
    picker.hidden = !(showingSlip || shopping) || available.length < 2;
    document.body.classList.toggle('shopping-list',shopping);
    document.body.classList.toggle('showing-slip',showingSlip);
    document.querySelector('#trip-actions').hidden = !available.length;
    document.querySelector('#save-trip').hidden = showingSlip || shopping;
    toggle.textContent = showingSlip || shopping ? 'Edit basket' : 'Show at counter';
    shop.hidden = showingSlip;
    progress.hidden = !shopping;
    shop.disabled = false;
    if (shopping) {
      const count = Object.keys(carts.get(selected)).length;
      const left = remaining.get(selected);
      const after = available.indexOf(selected) + 1;
      nextCounter = [...available.slice(after),...available.slice(0,after-1)].find(v=>remaining.get(v)) || null;
      const complete = !left && !nextCounter && available.length === carts.size;
      const message = complete ? 'Shopping complete · All items collected' : (count-left) + ' of ' + count + ' collected at this counter';
      if (progress.textContent !== message) progress.textContent = message;
      shop.textContent = nextCounter ? 'Next counter' : 'Finish trip';
      shop.disabled = !complete && !nextCounter;
    } else {
      shop.textContent = savedCounter?.startsWith('paused.') ? 'Resume shopping' : 'Shop this list';
    }
    for (const [venue, cart] of carts) {
      if ((showingSlip || shopping) && venue !== selected && cart) continue;
      const section = element('section');
      section.dataset.counter = venue;
      const heading = element('div',null,'counter-title');
      heading.append(element('h2',names[venue]));
      section.append(heading);
      if (!cart) {
        section.append(element('p','This counter’s saved list could not be read.'));
        fragment.append(section); partial = true; continue;
      }
      const items = catalogues.get(venue) || cached(venue);
      const ids = new Set(items.map(i=>i.id));
      const rows = core.rows(items, cart, venue);
      const sum = core.total(rows);
      paise += sum.paise; partial ||= !!sum.unknown;
      if (!showingSlip && !shopping) heading.append(element('span',sum.unknown ? 'Price pending' : money(sum.paise)));
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
    document.querySelector('#total-label').textContent = partial ? 'Known subtotal' : showingSlip || shopping ? 'Counter estimate' : 'Estimated total';
    document.querySelector('#total').textContent = partial && !paise ? '—' : money(paise);
    if (focus) {
      const section = counters.querySelector('[data-counter="'+focus[0]+'"]');
      const article = [...(section?.querySelectorAll('article') || [])].find(a=>a.dataset.item===focus[1]);
      const btn = [...(article?.querySelectorAll('button:enabled,input:enabled') || [])].find(b=>b.getAttribute('aria-label')===focus[2]);
      (btn || article?.querySelector('button:enabled') || section?.querySelector('button:enabled') || counters).focus({preventScroll:true});
    }
  }
  function updatePresentation(scroll = true) {
    render();
    if (scroll) document.querySelector('main').scrollTop = 0;
  }
  toggle.onclick = () => {
    if (shopping) saveProgress(() => localStorage.setItem(tripKey,'paused.'+selected));
    else { showingSlip = !showingSlip; updatePresentation(); }
  };
  shop.onclick = () => {
    if (shopping && !nextCounter) {
      saveProgress(() => {
        for (const key of Object.keys(localStorage).filter(k=>k.startsWith(markPrefix))) localStorage.removeItem(key);
        localStorage.removeItem(tripKey);
      });
      notice.textContent ||= 'Trip finished. Your basket is saved.';
      return;
    }
    const saved = localStorage.getItem(tripKey) || '';
    const options = [...choice.options].map(option=>option.value);
    const last = saved.startsWith('paused.') ? saved.slice(7) : selected;
    switchCounter(shopping ? nextCounter : options.includes(last) ? last : options[0]);
  };
  choice.onchange = () => {
    if (shopping) switchCounter(choice.value);
    else { selected = choice.value; updatePresentation(); }
  };
  function close() { parent.postMessage('km-close-basket',location.origin); }
  document.addEventListener('keydown', e=>{if(e.key==='Escape'){e.preventDefault();close();}});
  window.addEventListener('storage',render);
  window.addEventListener('pageshow',render);
  render();
})();
