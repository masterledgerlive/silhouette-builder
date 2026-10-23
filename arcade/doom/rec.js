/* REC / REPLAY / ROUTE MAP for the DOOM cabinet — the proven-system piece.
   A run = the engine's input stream [[ms,'d'|'u',KEYNAME],...] recorded
   from a cold boot. REC NEW RUN cold-boots and records. REPLAY cold-boots
   a fresh engine and re-feeds the recorded stream at its recorded times —
   a true ghost run. The ROUTE MAP is integrated from the recording alone
   (the engine does not export player position), and says so on its face.
   DOOM score on this board = run tics, measured from the recording. */
(function () {
  'use strict';
  var LS_RUNS = 'kk-runs-doom';
  var $ = function (id) { return document.getElementById(id); };
  var recording = false, replaying = false, replayTimers = [], currentRun = null, aiRun = null, scores = null;

  function loadRuns() { try { return JSON.parse(localStorage.getItem(LS_RUNS) || '[]'); } catch (e) { return []; } }
  function saveRuns(r) { try { localStorage.setItem(LS_RUNS, JSON.stringify(r.slice(0, 6))); } catch (e) {} }
  function runStats(log) {
    var dur = log.length ? log[log.length - 1][0] : 0;
    return { ms: dur, tics: Math.round(dur / 1000 * 35), inputs: log.length };
  }
  function fmtTics(t) { return t.toLocaleString('en-US') + ' tics'; }
  function setRecStatus(s) { var el = $('recStatus'); if (el) el.textContent = s; }

  /* ---------- route map: integrate the recorded inputs ---------- */
  function buildRoute(log) {
    var x = 0, y = 0, th = -Math.PI / 2, held = {}, pts = [[0, 0]], marks = [];
    var step = 50, end = log.length ? log[log.length - 1][0] : 0, idx = 0;
    for (var t = 0; t <= end; t += step) {
      while (idx < log.length && log[idx][0] <= t) {
        var ev = log[idx++];
        held[ev[2]] = (ev[1] === 'd');
        if (ev[1] === 'd' && ev[2] === 'KEY_FIRE') marks.push({ x: x, y: y, k: 'f' });
        if (ev[1] === 'd' && ev[2] === 'KEY_USE') marks.push({ x: x, y: y, k: 'u' });
      }
      if (held.KEY_LEFTARROW) th -= 0.135 * (step / 50);
      if (held.KEY_RIGHTARROW) th += 0.135 * (step / 50);
      var sp = held.KEY_SHIFT ? 22 : 14, fx = 0, fy = 0;
      if (held.KEY_UPARROW) { fx += Math.cos(th) * sp; fy += Math.sin(th) * sp; }
      if (held.KEY_DOWNARROW) { fx -= Math.cos(th) * sp * 0.6; fy -= Math.sin(th) * sp * 0.6; }
      if (held.KEY_STRAFE_L) { fx += Math.cos(th - Math.PI / 2) * 10; fy += Math.sin(th - Math.PI / 2) * 10; }
      if (held.KEY_STRAFE_R) { fx += Math.cos(th + Math.PI / 2) * 10; fy += Math.sin(th + Math.PI / 2) * 10; }
      x += fx * step / 1000; y += fy * step / 1000;
      pts.push([x, y]);
    }
    return { pts: pts, marks: marks };
  }

  function drawRoute(canvas, route) {
    var ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#05050c'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1b1b3a'; ctx.lineWidth = 1;
    for (var gx = 0; gx <= W; gx += 24) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 0; gy <= H; gy += 24) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
    if (!route.pts.length) return;
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    route.pts.forEach(function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    var pad = 26, sc = Math.min((W - pad * 2) / Math.max(1, maxX - minX), (H - pad * 2) / Math.max(1, maxY - minY));
    function X(x) { return pad + (x - minX) * sc; }
    function Y(y) { return pad + (y - minY) * sc; }
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 6;
    ctx.beginPath();
    route.pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(X(p[0]), Y(p[1])); else ctx.lineTo(X(p[0]), Y(p[1])); });
    ctx.stroke(); ctx.shadowBlur = 0;
    route.marks.forEach(function (m) {
      if (m.k === 'f') { ctx.fillStyle = '#ff9a3b'; ctx.beginPath(); ctx.arc(X(m.x), Y(m.y), 3, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = '#7CFF6B'; ctx.fillRect(X(m.x) - 3, Y(m.y) - 3, 6, 6); }
    });
    var s = route.pts[0], e = route.pts[route.pts.length - 1];
    ctx.fillStyle = '#7CFF6B'; ctx.beginPath(); ctx.arc(X(s[0]), Y(s[1]), 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff5470'; ctx.beginPath(); ctx.arc(X(e[0]), Y(e[1]), 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8e8f5'; ctx.font = '10px Courier New';
    ctx.fillText('S', X(s[0]) + 7, Y(s[1]) + 3); ctx.fillText('E', X(e[0]) + 7, Y(e[1]) + 3);
  }

  /* ---------- replay ---------- */
  function stopReplay() {
    replayTimers.forEach(clearTimeout); replayTimers = []; replaying = false;
  }
  async function replay(run, label) {
    if (!window.KKDoom) return;
    stopReplay();
    recording = false; $('recBtn').disabled = false;
    replaying = true;
    setRecStatus('▶ REPLAYING ' + label + ' — cold boot, re-feeding ' + run.log.length + ' recorded inputs…');
    await window.KKDoom.reboot(window.KKGameBytes);
    run.log.forEach(function (ev) {
      replayTimers.push(setTimeout(function () { window.KKDoom.sendKey(ev[2], ev[1] === 'd'); }, ev[0]));
    });
    var total = run.log.length ? run.log[run.log.length - 1][0] : 0;
    replayTimers.push(setTimeout(function () {
      replaying = false;
      setRecStatus('✓ Replay finished — that ghost was the recorded input stream, re-fed from a cold boot.');
    }, total + 600));
    drawRoute($('mapCanvas'), buildRoute(run.log));
  }

  /* ---------- recording ---------- */
  async function startRec() {
    if (!window.KKDoom) return;
    stopReplay();
    currentRun = null;
    $('saveScoreBtn').disabled = true;
    setRecStatus('● REC ARMED — cold-booting… the run records from boot. Play!');
    recording = true;
    $('recBtn').disabled = true; $('stopRecBtn').disabled = false;
    await window.KKDoom.reboot(window.KKGameBytes);
    setRecStatus('● REC — recording every input from this cold boot. Press STOP & MAP when the run ends.');
  }
  function stopRec() {
    if (!recording) return;
    recording = false;
    $('recBtn').disabled = false; $('stopRecBtn').disabled = true;
    var log = window.KKDoom.getLog();
    if (log.length < 6) { setRecStatus('Run too short to keep — almost no inputs were recorded.'); return; }
    var st = runStats(log);
    currentRun = { id: 'run-' + Date.now(), log: log, stats: st, when: new Date().toISOString() };
    var runs = loadRuns(); runs.unshift(currentRun); saveRuns(runs); renderRunList();
    drawRoute($('mapCanvas'), buildRoute(log));
    $('saveScoreBtn').disabled = false;
    setRecStatus('⏹ Run kept: ' + fmtTics(st.tics) + ' · ' + st.inputs + ' inputs · ' + (st.ms / 1000).toFixed(1) + 's. ' +
      'Route map drawn below. Add your initials and SAVE SCORE to put it on the board with its replay attached.');
  }

  function renderRunList() {
    var box = $('runList'); if (!box) return;
    var runs = loadRuns();
    if (!runs.length) { box.innerHTML = '<span style="color:#8a8aa8;font-size:.8rem">No recorded runs on this device yet — press REC NEW RUN.</span>'; return; }
    box.innerHTML = runs.map(function (r) {
      return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0;font-size:.82rem">' +
        '<span>🎞 ' + new Date(r.when).toLocaleString() + ' — <b>' + fmtTics(r.stats.tics) + '</b> · ' + r.stats.inputs + ' inputs</span>' +
        '<button class="kk-btn" data-replay="' + r.id + '">▶ REPLAY</button>' +
        '<button class="kk-btn" data-map="' + r.id + '">🗺 MAP</button></div>';
    }).join('');
    box.querySelectorAll('[data-replay]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = loadRuns().filter(function (x) { return x.id === b.getAttribute('data-replay'); })[0];
        if (r) replay(r, 'your recorded run');
      });
    });
    box.querySelectorAll('[data-map]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = loadRuns().filter(function (x) { return x.id === b.getAttribute('data-map'); })[0];
        if (r) drawRoute($('mapCanvas'), buildRoute(r.log));
      });
    });
  }

  /* ---------- init ---------- */
  function init() {
    if (!window.KKDoom) { setTimeout(init, 120); return; }
    $('recBtn').addEventListener('click', startRec);
    $('stopRecBtn').addEventListener('click', stopRec);
    $('saveScoreBtn').addEventListener('click', function () {
      if (!currentRun || !scores) return;
      var ini = ($('iniInput').value || 'AAA').trim().toUpperCase().slice(0, 3) || 'AAA';
      scores.addHuman({ n: ini, s: currentRun.stats.tics, d: new Date().toISOString().slice(0, 10),
                        runId: currentRun.id, tag: 'recorded run' });
      setRecStatus('🏆 Saved — ' + ini + ' is on the HUMANS board at ' + fmtTics(currentRun.stats.tics) + ', replay attached.');
    });
    renderRunList();

    /* touch overlay -> real engine keys */
    if (window.KKTouch && $('touchMount')) {
      var map = { up: 'KEY_UPARROW', down: 'KEY_DOWNARROW', left: 'KEY_LEFTARROW', right: 'KEY_RIGHTARROW',
                  fire: 'KEY_FIRE', use: 'KEY_USE', run: 'KEY_SHIFT', start: 'KEY_ENTER', coin: 'KEY_ENTER', menu: 'KEY_ESCAPE' };
      KKTouch.mount($('touchMount'), {
        rows: [[{ id: 'fire', label: 'FIRE', cls: 'fire' }, { id: 'use', label: 'USE', cls: 'use' }],
               [{ id: 'run', label: 'RUN', cls: 'run small' }, { id: 'start', label: 'START', cls: 'sys small' },
                { id: 'coin', label: 'COIN', cls: 'sys small' }, { id: 'menu', label: 'MENU', cls: 'sys small' }]],
        onControl: function (id, down) { var k = map[id]; if (k) window.KKDoom.sendKey(k, down); }
      });
    }
    if (window.KKTouch && $('fsBtn') && $('cabinet')) KKTouch.fullscreen($('fsBtn'), $('cabinet'));

    /* AI run + scores board (seeded ONLY from the AI's real recording) */
    fetch('ai-run.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { aiRun = j; }).catch(function () {})
      .then(function () {
        if (!window.KKScores || !$('scoresMount')) return;
        scores = KKScores.mount($('scoresMount'), {
          game: 'doom', title: 'DOOM', scoreLabel: 'RUN TICS', manual: false,
          note: 'score = run tics measured from the recording · every board entry carries its replay',
          aiSeed: aiRun ? [{ n: aiRun.who, s: aiRun.stats.tics, runId: 'kkbot', tag: 'scripted bot run · recording shipped with the page' }] : [],
          onReplay: function (runId) {
            if (runId === 'kkbot') { if (aiRun) replay(aiRun, 'the AI run (KKBOT)'); return; }
            var r = loadRuns().filter(function (x) { return x.id === runId; })[0];
            if (r) replay(r, 'the board run');
          }
        });
      });
    var aiBtn = $('aiReplayBtn');
    if (aiBtn) aiBtn.addEventListener('click', function () { if (aiRun) replay(aiRun, 'the AI run (KKBOT)'); });
    var aiMapBtn = $('aiMapBtn');
    if (aiMapBtn) aiMapBtn.addEventListener('click', function () { if (aiRun) drawRoute($('mapCanvas'), buildRoute(aiRun.log)); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
