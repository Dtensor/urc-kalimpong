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

  let drawer, frame, opener;
  function openTripBasket() {
    if (drawer?.open) return;
    opener = document.activeElement;
    if (!drawer) {
      drawer = document.createElement('dialog');
      drawer.id = 'km-trip-dialog';
      drawer.setAttribute('aria-label', 'My basket');
      frame = document.createElement('iframe');
      frame.title = 'Shopping basket by counter';
      drawer.append(frame);
      document.body.append(drawer);
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
    frame.src = new URL('trip-basket.html', station);
    drawer.showModal();
    frame.focus();
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
      url.hash = location.hash;
      window.addEventListener('hashchange', () => {url.hash = location.hash; link.href = url;});
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
