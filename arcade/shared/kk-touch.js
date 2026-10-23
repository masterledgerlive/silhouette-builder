/* KKTouch — the one shared touch-control component for the arcade.
   Engine-pluggable: mount it with an onControl(id, down) hook and it speaks
   in control ids ('up','down','left','right', plus whatever buttons you
   declare). DOOM wires those ids to real engine keys. Future blobbed cores
   wire the same ids to their own input maps.
   Cross-origin embed pages (Internet Archive frames) must NOT use this as an
   input device — a page cannot send key events into a cross-origin frame.
   Those pages use KKTouch.phoneMode() instead: full-bleed frame, and the
   player's own in-frame touch controls do the work. */
(function () {
  'use strict';

  function mount(el, opts) {
    opts = opts || {};
    var onControl = opts.onControl || function () {};
    var held = {}; // control id -> bool

    function set(id, down) {
      if (held[id] === down) return;
      held[id] = down;
      onControl(id, down);
    }

    var wrap = document.createElement('div');
    wrap.className = 'kk-touch on';

    /* ---- joystick ---- */
    var zone = document.createElement('div');
    zone.className = 'kk-stick-zone';
    var nub = document.createElement('div');
    nub.className = 'kk-stick-nub';
    zone.appendChild(nub);
    wrap.appendChild(zone);

    var activePointer = null, dirs = [];
    function applyDirs(next) {
      dirs.forEach(function (d) { if (next.indexOf(d) < 0) set(d, false); });
      next.forEach(function (d) { if (dirs.indexOf(d) < 0) set(d, true); });
      dirs = next;
    }
    function stickMove(e) {
      var r = zone.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = e.clientX - cx, dy = e.clientY - cy;
      var max = Math.max(10, r.width / 2 - 6);
      var len = Math.sqrt(dx * dx + dy * dy);
      var cl = Math.min(len, max);
      var nx = len ? dx / len * cl : 0, ny = len ? dy / len * cl : 0;
      nub.style.transform = 'translate(' + nx + 'px,' + ny + 'px)';
      if (len < 13) { applyDirs([]); return; }
      var ang = Math.atan2(dy, dx); // direction from the RAW vector, -PI..PI, 0 = right
      var oct = Math.round(ang / (Math.PI / 4)) % 8; if (oct < 0) oct += 8;
      var table = [
        ['right'], ['right', 'down'], ['down'], ['left', 'down'],
        ['left'], ['left', 'up'], ['up'], ['right', 'up']
      ];
      applyDirs(table[oct]);
    }
    function stickEnd() {
      activePointer = null;
      nub.style.transform = 'translate(0,0)';
      applyDirs([]);
    }
    zone.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      activePointer = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      stickMove(e);
    });
    zone.addEventListener('pointermove', function (e) { if (e.pointerId === activePointer) stickMove(e); });
    zone.addEventListener('pointerup', function (e) { if (e.pointerId === activePointer) stickEnd(); });
    zone.addEventListener('pointercancel', stickEnd);
    zone.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* ---- buttons ---- */
    var btnsBox = document.createElement('div');
    btnsBox.className = 'kk-btns';
    var rows = opts.rows || [[{ id: 'fire', label: 'FIRE', cls: 'fire' }, { id: 'use', label: 'USE', cls: 'use' }],
                              [{ id: 'run', label: 'RUN', cls: 'run small' }, { id: 'start', label: 'START', cls: 'sys small' }, { id: 'coin', label: 'COIN', cls: 'sys small' }]];
    rows.forEach(function (row) {
      var rowEl = document.createElement('div');
      rowEl.className = 'kk-btnrow';
      row.forEach(function (b) {
        var btn = document.createElement('button');
        btn.className = 'kk-tbtn ' + (b.cls || '');
        btn.textContent = b.label;
        btn.setAttribute('aria-label', b.label);
        var pid = null;
        btn.addEventListener('pointerdown', function (e) {
          e.preventDefault(); pid = e.pointerId;
          btn.setPointerCapture(e.pointerId);
          btn.classList.add('held'); set(b.id, true);
        });
        function release(e) {
          if (pid !== null && e.pointerId !== pid) return;
          pid = null; btn.classList.remove('held'); set(b.id, false);
        }
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointercancel', release);
        btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        rowEl.appendChild(btn);
      });
      btnsBox.appendChild(rowEl);
    });
    wrap.appendChild(btnsBox);
    el.appendChild(wrap);

    return {
      releaseAll: function () { Object.keys(held).forEach(function (k) { set(k, false); }); stickEnd(); }
    };
  }

  /* Fullscreen helper — one button, any cabinet element. */
  function fullscreen(btn, cabEl) {
    btn.addEventListener('click', function () {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      var req = cabEl.requestFullscreen || cabEl.webkitRequestFullscreen;
      if (req) req.call(cabEl);
    });
    document.addEventListener('fullscreenchange', function () {
      btn.textContent = document.fullscreenElement ? '⛶ EXIT FULLSCREEN' : '⛶ FULLSCREEN';
    });
  }

  /* Phone mode for cross-origin embeds: full-bleed frame so the player's own
     in-frame touch controls are reachable. Honest by design: we say on the
     page that the taps happen inside the frame. */
  function phoneMode(btn, cabEl, exitLabel) {
    btn.addEventListener('click', function () {
      var on = cabEl.classList.toggle('kk-phone');
      btn.textContent = on ? (exitLabel || '✕ EXIT PHONE MODE') : '📱 PHONE MODE';
      if (on) cabEl.scrollIntoView();
    });
  }

  window.KKTouch = { mount: mount, fullscreen: fullscreen, phoneMode: phoneMode };
})();
