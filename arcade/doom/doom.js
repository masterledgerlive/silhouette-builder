/* Doom cabinet harness — doom.wasm (jacobenget/doom.wasm) + shareware doom1.wad.
   Implements the 10 host imports proven by the Python wasmtime driver:
   loading.onGameInit/wadSizes/readWads, runtimeControl.timeInMilliseconds,
   ui.drawFrame, gameSaving.*, console.*. WASM exports drive the game:
   initGame, tickGame, reportKeyDown/Up + KEY_* globals. */
(function () {
  'use strict';
  var canvas = document.getElementById('screen');
  var ctx = canvas.getContext('2d');
  var statusEl = document.getElementById('status');
  var sealBtn = document.getElementById('sealBtn');
  var sealOut = document.getElementById('sealOut');

  var memory = null, inst = null, W = 320, H = 200, t0 = 0;
  var keys = {}, inputLog = [], frameCount = 0, tics = 0, booted = false;
  var enc = new TextEncoder(), dec = new TextDecoder();

  function setStatus(s) { statusEl.textContent = s; }
  function u8() { return new Uint8Array(memory.buffer); }
  function dv() { return new DataView(memory.buffer); }

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
    if (!name || !booted) return;
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
    setStatus('Loading sealed bytes…');
    var wr = await fetch('doom.wasm'), ar = await fetch('doom1.wad');
    if (!wr.ok || !ar.ok) throw new Error('game bytes failed to load (' + wr.status + '/' + ar.status + ')');
    var wasmBuf = await wr.arrayBuffer();
    var wad = new Uint8Array(await ar.arrayBuffer());
    setStatus('Sealed bytes loaded — booting DOOM…');
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
        // MUST advance monotonically — a frozen clock deadlocks the game loop.
        timeInMilliseconds: function () { return 1000n + BigInt(Date.now() - t0); }
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
    var res = await WebAssembly.instantiate(wasmBuf, imports);
    inst = res.instance; memory = inst.exports.memory;
    KEYNAMES.forEach(function (n) { keys[n] = inst.exports[n].value; });
    inst.exports.initGame();
    booted = true;
    setStatus('DOOM is live — press ENTER (4× through the menus to reach E1M1)');
    setInterval(function () {
      try { inst.exports.tickGame(); tics++; }
      catch (err) { console.error('[doom] tick trap:', err); }
    }, 1000 / 35);
  }

  async function sha256hex(s) {
    var d = await crypto.subtle.digest('SHA-256', enc.encode(s));
    return Array.from(new Uint8Array(d)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function sealRun() {
    if (!booted) { sealOut.textContent = 'Boot the game first.'; return; }
    sealBtn.disabled = true;
    sealOut.textContent = 'Sealing this run on-chain via the Guardian pathway…';
    var runHash = '';
    try {
      runHash = await sha256hex(JSON.stringify({ t0: t0, tics: tics, frames: frameCount, log: inputLog }));
      var ts = new Date().toISOString().slice(0, 10);
      var payload = '§DOOMPLAY§v1§RUN§' + runHash.slice(0, 32) + '§TICS§' + tics + '§TS§' + ts;
      var hex = Array.from(enc.encode(payload)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      var body = {
        bytes: '0x' + hex,
        provider: '0x50e1C4608c48b0c52E1EA5FBabc1c9126eA17915',
        creditPayer: '0x50e1C4608c48b0c52E1EA5FBabc1c9126eA17915',
        entryPoint: 'base_dedicated'
      };
      var r = await fetch('https://storagetoken-production.up.railway.app/api/inject', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      var j = await r.json();
      if (!r.ok) throw new Error((j && j.error) || ('HTTP ' + r.status));
      var txHash = j.txHash || j.tx_hash || j.hash;
      if (!txHash) throw new Error('relay answered without a tx hash');
      window.ArcadeProof.addRun({
        tag: runHash.slice(0, 6).toUpperCase(),
        tx: txHash,
        chain: window.ArcadeProof.chainFrom(j),
        injectId: j.injectId || j.inject_id || j.id || null,
        hitchId: j.hitchId || j.hitch_id || j.hitch || null,
        runHash: runHash,
        payload: payload,
        tics: tics, frames: frameCount, inputs: inputLog.length,
        sealedAt: new Date().toISOString()
      });
      sealOut.textContent = 'Sealed. This run now lives on-chain — its location card is saved below (survives tab close).';
      inputLog = [];
    } catch (err) {
      sealOut.textContent = 'Seal failed: ' + err.message +
        (runHash ? ' (run hash ' + runHash.slice(0, 16) + '… kept locally)' : '');
    }
    sealBtn.disabled = false;
  }
  sealBtn.addEventListener('click', sealRun);

  var started = false;
  window.startDoom = function () {
    if (started) return;
    started = true;
    boot().catch(function (err) { setStatus('Boot failed: ' + err.message); });
  };
})();
