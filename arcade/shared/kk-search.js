/* KKSearch — "play another machine": one search box, every cabinet.
   Type, pick, land on that machine's page. Shared by the catalog, the
   floor and every game-page footer. */
(function () {
  'use strict';
  var BASE = 'https://arcade.highscores.live/arcade/';
  var MACHINES = [
    { id: 'doom', name: 'DOOM', sub: '1993 · id Software · our build', url: BASE + 'doom/', keys: 'doom fps shooter id' },
    { id: 'arcade_defender', name: 'DEFENDER', sub: '1981 · Williams', url: BASE + 'games/arcade_defender/', keys: 'defender williams shooter humanoids' },
    { id: 'arcade_digdug', name: 'DIG DUG', sub: '1982 · Namco', url: BASE + 'games/arcade_digdug/', keys: 'dig dug namco pooka fygar pump' },
    { id: 'arcade_joust', name: 'JOUST', sub: '1982 · Williams', url: BASE + 'games/arcade_joust/', keys: 'joust ostrich flap williams' },
    { id: 'arcade_tron', name: 'TRON', sub: '1982 · Bally Midway', url: BASE + 'games/arcade_tron/', keys: 'tron grid light cycle midway' },
    { id: 'arcade_qbert', name: 'Q*BERT', sub: '1982 · Gottlieb', url: BASE + 'games/arcade_qbert/', keys: 'qbert q bert pyramid hop gottlieb' },
    { id: 'arcade_centiped', name: 'CENTIPEDE', sub: '1981 · Atari', url: BASE + 'games/arcade_centiped/', keys: 'centipede atari trackball mushroom' },
    { id: 'arcade_missile', name: 'MISSILE COMMAND', sub: '1980 · Atari', url: BASE + 'games/arcade_missile/', keys: 'missile command atari cities' },
    { id: 'arcade_galaga88', name: "GALAGA '88", sub: '1987 · Namco', url: BASE + 'games/arcade_galaga88/', keys: 'galaga 88 namco shooter bees' },
    { id: 'arcade_20pacgal', name: 'MS. PAC-MAN / GALAGA', sub: '20th Anniversary · Namco', url: BASE + 'games/arcade_20pacgal/', keys: 'ms pac man pacman galaga maze namco' },
    { id: 'arcade_invaders', name: 'SPACE INVADERS', sub: '1978 · Taito', url: BASE + 'games/arcade_invaders/', keys: 'space invaders taito aliens 1978' }
  ];

  function matches(m, q) {
    q = q.trim().toUpperCase();
    if (!q) return true;
    return (m.name + ' ' + m.sub + ' ' + m.keys).toUpperCase().indexOf(q) >= 0;
  }

  function mount(el, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'kk-search';
    wrap.innerHTML = '<input type="text" placeholder="🕹 search a machine — jump straight to it…" autocomplete="off" aria-label="search a machine">' +
      '<div class="kk-sres" role="listbox"></div>';
    el.appendChild(wrap);
    var input = wrap.querySelector('input');
    var res = wrap.querySelector('.kk-sres');
    var hot = 0, list = [];

    function render() {
      list = MACHINES.filter(function (m) { return m.id !== opts.current && matches(m, input.value); });
      hot = Math.min(hot, Math.max(0, list.length - 1));
      if (!input.value.trim() || !list.length) { res.className = 'kk-sres'; res.innerHTML = ''; return; }
      res.className = 'kk-sres open';
      res.innerHTML = list.slice(0, 6).map(function (m, i) {
        return '<a href="' + m.url + '" class="' + (i === hot ? 'hot' : '') + '">' + m.name +
          '<span class="kk-ssub">' + m.sub + '</span></a>';
      }).join('');
    }
    input.addEventListener('input', function () { hot = 0; render(); });
    input.addEventListener('focus', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var m = list[hot] || list[0];
        if (m) { e.preventDefault(); window.location.href = m.url; }
      } else if (e.key === 'ArrowDown') { e.preventDefault(); hot = Math.min(hot + 1, list.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hot = Math.max(hot - 1, 0); render(); }
      else if (e.key === 'Escape') { res.className = 'kk-sres'; }
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) res.className = 'kk-sres'; });
    return { machines: MACHINES };
  }

  window.KKSearch = { mount: mount, MACHINES: MACHINES };
})();
