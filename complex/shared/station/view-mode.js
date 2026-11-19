// Resolve from this shared script so both subdirectory hosting and local previews work.
(() => {
  const script = document.currentScript;
  const station = new URL('./', script.src);
  const shared = new URL('../', station);
  const routes = {
    plaza: '../../', hall: '../../../mall/', shelf: '../../../mall/',
    bakery: '../../bakery/', counter: '../../bakery/', sabzi: '../../sabzi/',
    grocery: '../../grocery/', cinema: '../../cinema/'
  };
  const query = new URLSearchParams(location.search);
  const screen = script.dataset.screen;
  const valid = key => Object.hasOwn(routes, key);
  function classic(scene) {
    const url = new URL(routes[scene], station);
    url.searchParams.set('view', 'hall');
    if (scene === 'counter' || scene === 'shelf') url.searchParams.set('photo', scene);
    return url;
  }
  const modes = document.querySelector('.km-modes');
  const basketButton = document.createElement('button');
  basketButton.type = 'button';
  basketButton.className = 'km-basket-button';
  basketButton.textContent = 'My basket';
  basketButton.setAttribute('aria-haspopup', 'dialog');
  modes.append(basketButton);
  const mayaButton = document.createElement('button');
  mayaButton.type = 'button';
  mayaButton.className = 'km-maya-button';
  mayaButton.textContent = 'Ask Maya';
  mayaButton.setAttribute('aria-haspopup','dialog');
  modes.append(mayaButton);
  let mayaPanel;
  mayaButton.onclick = () => {
    if (mayaPanel?.open) return;
    if (document.pointerLockElement) document.exitPointerLock();
    const panel = document.createElement('dialog');
    mayaPanel = panel;
    panel.id = 'km-maya';
    panel.setAttribute('aria-label','Maya · Plaza shopping guide');
    const frame = document.createElement('iframe');
    frame.title = 'Ask Maya';
    frame.allow = 'microphone; autoplay';
    const url = new URL('maya.html',station);
    const place = screen === 'station' ? document.querySelector('#world')?.dataset.scene
      : screen === 'easy' ? query.get('venue') || 'urc' : screen;
    url.searchParams.set('place',place || 'plaza');
    if (document.documentElement.lang === 'hi') url.searchParams.set('lang','hi');
    frame.src = url;
    panel.append(frame);
    document.body.append(panel);
    const receive = event => {
      if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
      if (event.data?.maya === 'close') panel.close();
      if (event.data?.maya === 'visit' && valid(event.data.scene)) {
        const scene = event.data.scene;
        let next = new URL('#'+scene,station);
        if (screen === 'easy' || screen === 'catalogue') {
          next = new URL('easy.html',shared);
          next.searchParams.set('venue',({shelf:'urc',counter:'bakery'})[scene] || scene);
        } else if (valid(screen)) {
          next = classic(scene);
          const originView = query.get('from');
          if (originView === 'easy' || originView === 'catalogue') next.searchParams.set('from',originView);
        }
        panel.close();
        location.assign(next);
      }
    };
    window.addEventListener('message',receive);
    const dismiss = () => { if (panel.open) panel.close(); };
    window.addEventListener('pagehide',dismiss);
    window.addEventListener('hashchange',dismiss);
    panel.onclick = e => { if (e.target === panel) dismiss(); };
    panel.onclose = () => {
      window.removeEventListener('message',receive);
      window.removeEventListener('pagehide',dismiss);
      window.removeEventListener('hashchange',dismiss);
      panel.remove();
      mayaButton.focus({preventScroll:true});
    };
    panel.showModal();
    frame.focus();
  };

  let drawer, frame, opener;
  function openTripBasket() {
    if (drawer?.open) return;
    opener = document.activeElement;
    if (!drawer) {
      drawer = document.createElement('dialog');
      drawer.id = 'km-trip-dialog';
      drawer.setAttribute('aria-labelledby', 'km-trip-title');
      const head = document.createElement('div');
      head.className = 'km-trip-head';
      const title = document.createElement('h2');
      title.id = 'km-trip-title';
      title.textContent = 'My basket';
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'Close';
      close.setAttribute('aria-label','Close my basket');
      close.onclick = () => drawer.close();
      head.append(title,close);
      frame = document.createElement('iframe');
      frame.title = 'Shopping basket by counter';
      drawer.append(head,frame);
      document.body.append(drawer);
      drawer.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); drawer.close(); }
      });
      drawer.addEventListener('keyup', e => e.stopPropagation());
      drawer.addEventListener('click', e => {
        if (e.target === drawer) drawer.close();
      });
      drawer.addEventListener('close', () => {
        frame.src = 'about:blank';
        if (opener?.isConnected) opener.focus({preventScroll:true});
      });
      window.addEventListener('message', e => {
        if (drawer.open && e.origin === location.origin && e.source === frame.contentWindow && e.data === 'km-close-basket') drawer.close();
      });
    }
    if (document.pointerLockElement) document.exitPointerLock();
    const basketUrl = new URL('trip-basket.html', station);
    const scene = screen === 'station' ? document.querySelector('#world')?.dataset.scene
      : screen === 'easy' ? query.get('venue') || 'urc' : screen;
    const counter = ({hall:'urc', shelf:'urc', catalogue:'urc', counter:'bakery'})[scene] || scene;
    if (['urc','bakery','sabzi','grocery'].includes(counter)) basketUrl.searchParams.set('counter', counter);
    frame.src = basketUrl;
    drawer.showModal();
    drawer.querySelector('button').focus({preventScroll:true});
  }
  basketButton.addEventListener('click', e => {e.stopPropagation();openTripBasket();});
  window.addEventListener('km-open-basket', openTripBasket);
  if (screen === 'station') {
    window.setStationView = scene => { const url = classic(scene); if (scene === 'cinema') url.searchParams.set('photo', scene); document.querySelector('#explore-3d').href = url; };
    return;
  }
  const link = document.querySelector('.km-modes-strip a');
  if (screen === 'easy' || screen === 'catalogue') {
    const venue = query.get('venue');
    const scene = screen === 'easy' && valid(venue) ? venue : 'hall';
    const url = classic(scene);
    if (screen === 'easy') {
      url.searchParams.set('from', 'easy');
      const syncReturnPage = () => {
        url.hash = location.hash;
        link.href = url.href;
      };
      syncReturnPage();
      window.navigation?.addEventListener('currententrychange',syncReturnPage);
      window.addEventListener('hashchange',syncReturnPage);
      link.addEventListener('click',syncReturnPage);
      link.addEventListener('contextmenu',syncReturnPage);
    } else url.searchParams.set('from', 'catalogue');
    link.href = url;
    return;
  }
  if (!valid(screen)) return;
  const requested = query.get('photo');
  const scene = valid(requested) && routes[requested] === routes[screen] ? requested : screen;
  let back = new URL('#' + scene, station);
  let label = '2D photo view';
  if (query.get('from') === 'easy') {
    back = new URL('easy.html', shared);
    back.searchParams.set('venue', screen === 'hall' ? 'urc' : screen);
    back.hash = location.hash;
    label = '2D shopping';
  } else if (query.get('from') === 'catalogue' && screen === 'hall') {
    back = new URL('../../../?view=list', station);
    label = '2D catalogue';
  }
  document.body.classList.add('km-classic-view');
  link.href = back;
  link.textContent = label;
})();
