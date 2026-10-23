/* KKScores — the per-game highscore board shared by every cabinet.
   Columns: 🧑 HUMANS and 🤖 AI, side by side. An empty column shows its
   "awaiting" state instead of fake rows. Scores live in localStorage on
   this device. Honesty rules built in:
   - Archive-embed games pass selfReported:true — every human row is tagged
     "self-reported" because the page cannot see inside the cross-origin
     emulator frame.
   - AI rows are only ever seeded from real recorded runs (a replayable
     recording), never invented numbers. */
(function () {
  'use strict';

  function key(game) { return 'kk-scores-' + game; }
  function load(game) {
    try {
      var d = JSON.parse(localStorage.getItem(key(game)) || 'null');
      if (d && Array.isArray(d.humans) && Array.isArray(d.ai)) return d;
    } catch (e) {}
    return { humans: [], ai: [] };
  }
  function save(game, d) {
    try { localStorage.setItem(key(game), JSON.stringify(d)); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mount(el, opts) {
    var game = opts.game;
    var scoreLabel = opts.scoreLabel || 'SCORE';
    var data = load(game);
    if (opts.aiSeed && !localStorage.getItem(key(game) + '-seeded')) {
      opts.aiSeed.forEach(function (s) { data.ai.push(s); });
      save(game, data);
      try { localStorage.setItem(key(game) + '-seeded', '1'); } catch (e) {}
    }

    function rowHtml(e, canReplay) {
      var tag = e.tag ? ' <span class="kk-tag">' + esc(e.tag) + '</span>' : '';
      var rep = (canReplay && e.runId) ? ' <button data-run="' + esc(e.runId) + '">▶ REPLAY</button>' : '';
      return '<div class="kk-srow"><span><b>' + esc(e.n) + '</b>' + tag + rep + '</span><span>' + esc(e.s) + '</span></div>';
    }
    function render() {
      var humans = data.humans.slice().sort(function (a, b) { return b.s - a.s; }).slice(0, 8);
      var ai = data.ai.slice().sort(function (a, b) { return b.s - a.s; }).slice(0, 8);
      var hHtml = humans.length
        ? humans.map(function (e) { return rowHtml(e, !!opts.onReplay); }).join('')
        : '<div class="kk-await">⏳ AWAITING HUMANS — no human scores yet.<br>Be the first name on this board.</div>';
      var aHtml = ai.length
        ? ai.map(function (e) { return rowHtml(e, !!opts.onReplay); }).join('')
        : '<div class="kk-await">⏳ AWAITING THE AI — no recorded AI runs yet.<br>When the AI plays this machine and records the run, its score lands here.</div>';
      el.innerHTML =
        '<div class="kk-scores"><h2>🏆 HIGH SCORES — ' + esc(opts.title || game) + '</h2>' +
        '<div class="kk-snote">' + esc(scoreLabel) + ' · saved on this device' +
        (opts.selfReported ? ' · human scores on this machine are <b>self-reported</b> — the page can\'t see inside the emulator frame, so the board trusts your word' : '') +
        (opts.note ? ' · ' + esc(opts.note) : '') + '</div>' +
        '<div class="kk-scols">' +
        '<div class="kk-scol humans"><h3>🧑 HUMANS</h3>' + hHtml + '</div>' +
        '<div class="kk-scol ai"><h3>🤖 AI</h3>' + aHtml + '</div>' +
        '</div>' +
        (opts.manual === false ? '' :
          '<form class="kk-sform"><input class="ini" maxlength="3" placeholder="AAA" aria-label="initials">' +
          '<input class="num" type="number" min="0" placeholder="' + esc(scoreLabel) + '" aria-label="score">' +
          '<button class="kk-btn gold" type="submit">＋ ADD MY SCORE</button></form>') +
        '</div>';
      var form = el.querySelector('.kk-sform');
      if (form) form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var ini = form.querySelector('.ini').value.trim().toUpperCase() || 'AAA';
        var val = parseInt(form.querySelector('.num').value, 10);
        if (isNaN(val)) return;
        addHuman({ n: ini.slice(0, 3), s: val, d: new Date().toISOString().slice(0, 10),
                   tag: opts.selfReported ? 'self-reported' : undefined });
        form.reset();
      });
      el.querySelectorAll('[data-run]').forEach(function (b) {
        b.addEventListener('click', function () { if (opts.onReplay) opts.onReplay(b.getAttribute('data-run')); });
      });
    }
    function addHuman(e) { data.humans.push(e); save(game, data); render(); }
    function addAI(e) { data.ai.push(e); save(game, data); render(); }
    render();
    return { addHuman: addHuman, addAI: addAI, render: render, data: data };
  }

  window.KKScores = { mount: mount, load: load };
})();
