/* Doom cabinet harness — doom.wasm (jacobenget/doom.wasm) + shareware doom1.wad.
   The same proven harness as the Arcades of Time cabinet (byte-identical game
   bytes: doom.wasm sha256 8edfe49a…, doom1.wad sha256 1d7d43be…), adapted for
   its home inside the Koda Kai Network Arcade:
   - game bytes load from this page's assets/ folder;
   - free play — no wallet, no coins, no sealing, nothing leaves the page;
   - keys steer the game ONLY while the cabinet is engaged (click the
     screen), so the game never hijacks the rest of the page;
   - a small stats readout (window.doomCabinet) lets the Arcade time a
     run and count its moves from the harness's own input log, so the
   Hall of Scores can verify a run instead of taking anyone's word. */
(function () {
  'use strict';
  var canvas = document.getElementById('screen');
  var statusEl = document.getElementById('status');
  var cabEl = document.getElementById('doomCab');
  if (!canvas || !statusEl) return;
  var ctx = canvas.getContext('2d');

  var memory = null, inst = null, W = 320, H = 200, t0 = 0;
  var virtualNow = -1; /* -1: wall-clock regime (engine start-up); >=0: stepped game clock */
  var keys = {}, inputLog = [], frameCount = 0, tics = 0, booted = false;
  var engaged = false;
  var dec = new TextDecoder();

  function setStatus(s) { statusEl.textContent = s; }
  function u8() { return new Uint8Array(memory.buffer); }
  function dv() { return new DataView(memory.buffer); }

  /* The cabinet takes the keys only while it is engaged — click the
     screen to play, click anywhere else to hand the keys back. */
  canvas.addEventListener('click', function () {
    engaged = true;
    try { canvas.focus(); } catch (e) {}
    if (booted) setStatus('DOOM is live — the cabinet has your keys. Click outside it to hand them back.');
  });
  document.addEventListener('click', function (e) {
    if (engaged && cabEl && !cabEl.contains(e.target)) engaged = false;
  });

  var KEYMAP = {
    ArrowUp: 'KEY_UPARROW', ArrowDown: 'KEY_DOWNARROW',
    ArrowLeft: 'KEY_LEFTARROW', ArrowRight: 'KEY_RIGHTARROW',
    Enter: 'KEY_ENTER', Escape: 'KEY_ESCAPE', ' ': 'KEY_USE',
    Control: 'KEY_FIRE', Shift: 'KEY_SHIFT', Alt: 'KEY_ALT',
    Tab: 'KEY_TAB', ',': 'KEY_STRAFE_L', '.': 'KEY_STRAFE_R',
    Backspace: 'KEY_BACKSPACE'
  };
  var KEYNAMES = ['KEY_LEFTARROW','KEY_RIGHTARROW','KEY_UPARROW','KEY_DOWNARROW',
    'KEY_STRAFE_L','KEY_STRAFE_R','KEY_FIRE','KEY_USE','KEY_SHIFT',
    'KEY_TAB','KEY_ESCAPE','KEY_ENTER','KEY_BACKSPACE','KEY_ALT'];

  function onKey(e, down) {
    var name = KEYMAP[e.key];
    if (!name || !booted || !engaged) return;
    e.preventDefault();
    var code = keys[name];
    if (code === undefined) return;
    if (down) inst.exports.reportKeyDown(code); else inst.exports.reportKeyUp(code);
    inputLog.push([Date.now() - t0, down ? 'd' : 'u', name]);
  }
  window.addEventListener('keydown', function (e) { if (!e.repeat) onKey(e, true); });
  window.addEventListener('keyup', function (e) { onKey(e, false); });

  function drawFrame(p_buf) {
    var src = u8().subarray(p_buf, p_buf + W * H * 4);
    var img = ctx.createImageData(W, H), d = img.data;
    for (var i = 0, o = 0; i < W * H; i++, o += 4) {
      d[o] = src[o + 2]; d[o + 1] = src[o + 1]; d[o + 2] = src[o]; d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    frameCount++;
  }

  async function boot() {
    setStatus('Loading the game bytes…');
    var wr = await fetch('assets/doom.wasm'), ar = await fetch('assets/doom1.wad');
    if (!wr.ok || !ar.ok) throw new Error('game bytes failed to load (' + wr.status + '/' + ar.status + ')');
    var wasmBuf = await wr.arrayBuffer();
    var wad = new Uint8Array(await ar.arrayBuffer());
    setStatus('Bytes loaded — booting DOOM…');
    t0 = Date.now();
    var imports = {
      loading: {
        onGameInit: function (w, h) {
          W = w; H = h; canvas.width = w; canvas.height = h;
        },
        wadSizes: function (p_num, p_total) {
          dv().setInt32(p_num, 1, true); dv().setInt32(p_total, wad.length, true);
        },
        readWads: function (p_dest, p_lens) {
          u8().set(wad, p_dest); dv().setInt32(p_lens, wad.length, true);
        }
      },
      runtimeControl: {
        // While the engine starts, the clock is wall time. Once the game
        // loop runs, the clock STEPS one tic per loop turn (see tickLoop):
        // the engine can never fall behind real time and spiral trying
        // to catch up — on a slow CPU the game slows down a little
        // instead of eating the whole page. Always monotonic.
        timeInMilliseconds: function () {
          if (virtualNow >= 0) return 1000n + BigInt(virtualNow);
          return 1000n + BigInt(Date.now() - t0);
        }
      },
      ui: { drawFrame: function (p_buf) { drawFrame(p_buf); } },
      gameSaving: {
        sizeOfSaveGame: function () { return 0; },
        readSaveGame: function () { return 0; },
        writeSaveGame: function () { return 0; }
      },
      console: {
        onInfoMessage: function (p, n) { console.log('[doom]', dec.decode(u8().subarray(p, p + n))); },
        onErrorMessage: function (p, n) { console.error('[doom]', dec.decode(u8().subarray(p, p + n))); }
      }
    };
    setStatus('Bytes loaded — compiling the engine…');
    var res = await WebAssembly.instantiate(wasmBuf, imports);
    inst = res.instance; memory = inst.exports.memory;
    KEYNAMES.forEach(function (n) { keys[n] = inst.exports[n].value; });
    window.doomCompiled = true;
    setStatus('Engine compiled — press Boot once more to start the game.');
    await window.doomPhase2;
    t0 = Date.now(); /* the engine's wall clock starts at engine start, not at download time */
    setStatus('Initializing the game…');
    await new Promise(function (r) { setTimeout(r, 350); });
    inst.exports.initGame();
    booted = true;
    setStatus('DOOM is live — click the screen, then press ENTER (4× through the menus to reach E1M1)');
    /* Polite game loop on a stepped clock: each turn advances the
       engine's clock by exactly one tic (29ms) and runs one tick, then
       yields real idle time back to the page. The cabinet shares this
       page (and this CPU) with the whole station, so it never gets to
       starve the room around it. */
    virtualNow = Date.now() - t0;
    (function tickLoop() {
      virtualNow += 29;
      var start = performance.now();
      try { inst.exports.tickGame(); tics++; }
      catch (err) { console.error('[doom] tick trap:', err); }
      var took = performance.now() - start;
      var wait = (1000 / 35) - took;
      if (took > 80) wait = 120; else if (wait < 6) wait = 6;
      setTimeout(tickLoop, wait);
    })();
  }

  var started = false;
  var phase2Resolve = null;
  window.doomPhase2 = new Promise(function (r) { phase2Resolve = r; });
  window.doomStartEngine = function () { if (phase2Resolve) phase2Resolve(); };
  window.startDoom = function () {
    if (started) return;
    started = true;
    boot().catch(function (err) { setStatus('Boot failed: ' + err.message); });
  };
  /* The Arcade's verified scoreboards read the harness's own counters:
     a timed run's moves are the inputs the game itself logged. */
  window.doomCabinet = {
    isBooted: function () { return booted; },
    stats: function () {
      var downs = 0;
      for (var i = 0; i < inputLog.length; i++) { if (inputLog[i][1] === 'd') downs++; }
      return { tics: tics, frames: frameCount, inputs: downs, startedAt: t0 };
    }
  };
})();
