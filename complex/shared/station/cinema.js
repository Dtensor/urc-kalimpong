const filmBoard = document.querySelector('#film-board');
let programmeRequest;

function readProgramme() {
  document.querySelector('#programme-title').focus({preventScroll:true});
  document.querySelector('#programme').scrollIntoView();
}

function filmListing(film) {
  const entry = document.createElement('details');
  entry.name = 'cinema-film';
  const title = node('summary');
  title.append(node('strong', film.title), node('span', [film.language, film.genre].filter(Boolean).join(' · ')));
  const times = node('p', 'Sample showtimes · ' + (film.shows?.join('  ·  ') || 'To be announced'));
  const actions = node('div', null, 'film-actions');
  const door = node('a', 'See this film in 3D');
  const url = new URL(document.querySelector('#explore-3d').href);
  url.searchParams.set('film', film.id);
  door.href = url;
  if (/^[\w-]{11}$/.test(film.youtube || '')) {
    const watch = button('Play trailer', () => {
      if (entry.querySelector('iframe')) return;
      filmBoard.querySelectorAll('iframe').forEach(frame => frame.remove());
      const player = document.createElement('iframe');
      player.src = 'https://www.youtube-nocookie.com/embed/' + film.youtube + '?autoplay=1';
      player.title = film.title + ' trailer';
      player.allow = 'autoplay; encrypted-media; picture-in-picture';
      player.allowFullscreen = true;
      player.referrerPolicy = 'strict-origin-when-cross-origin';
      entry.append(player);
      player.focus();
    }, 'primary');
    const external = node('a', 'Open on YouTube ↗');
    external.href = 'https://www.youtube.com/watch?v=' + film.youtube;
    external.target = '_blank';
    external.rel = 'noopener';
    actions.append(watch, external);
    entry.addEventListener('toggle', () => { if (!entry.open) entry.querySelector('iframe')?.remove(); });
  } else {
    actions.append(node('span', 'Trailer unavailable'));
  }
  actions.append(door);
  entry.append(title, times, actions);
  return entry;
}

async function showProgramme() {
  try {
    programmeRequest ||= readJSON('../../cinema/data.json');
    const data = await programmeRequest;
    if (world.dataset.scene !== 'cinema') return;
    filmBoard.replaceChildren(...data.films.map(filmListing));
  } catch {
    programmeRequest = null;
    filmBoard.replaceChildren(node('p', 'The film programme could not be loaded.'), button('Try again', showProgramme));
  }
}
