/* Blob Arcade Engine v0.1 — tiny canvas runtime for game definitions.
   Logical canvas 400x500. No dependencies. See BUILDER-SCHEMA.md. */
(function (global) {
  'use strict';
  var W = 400, H = 500;

  var api = {
    W: W, H: H,
    clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
    overlap: function (a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    },
    rect: function (x, y, w, h) { return { x: x, y: y, w: w, h: h }; },
    rand: function (a, b) { return a + Math.random() * (b - a); }
  };

  function compileFn(src) {
    // full function source string -> function. Throws on syntax error.
    var f = eval('(' + src + ')');
    if (typeof f !== 'function') throw new Error('not a function');
    return f;
  }

  function Engine(canvas, def) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    this.input = { left: false, right: false, up: false, down: false, fire: false,
                   swipe: null, tx: 0, ty: 0, touchActive: false };
    this.running = false;
    this._raf = 0; this._last = 0;
    this._keys = {};
    this.load(def);
    this._bindInput();
  }

  Engine.prototype.load = function (def) {
    // def: { params, code:{init,tick,draw} } — code may be functions or source strings
    this.P = def.params || {};
    function asFn(x) { return typeof x === 'function' ? x : compileFn(x); }
    this._init = asFn(def.code.init);
    this._tick = asFn(def.code.tick);
    this._draw = asFn(def.code.draw);
    this.reset();
  };

  Engine.prototype.reset = function () {
    this.S = this._init(this.P, api);
    this._drawFrame();
  };

  Engine.prototype._drawFrame = function () {
    var c = this.ctx;
    c.save();
    c.fillStyle = '#0a0a18'; c.fillRect(0, 0, W, H);
    c.restore();
    this._draw(this.S, this.P, c, api);
  };

  Engine.prototype.step = function (dt) {
    // advance exactly one frame — used by rAF loop and by tests
    dt = Math.min(dt, 0.05);
    this._tick(this.S, this.P, this.input, dt, api);
    this.input.swipe = null;
    if (this.input._firePulse) { this.input.fire = false; this.input._firePulse = false; }
    this._drawFrame();
  };

  Engine.prototype._loop = function (t) {
    if (!this.running) return;
    var dt = (t - this._last) / 1000 || 0.016;
    this._last = t;
    this.step(dt);
    var self = this;
    this._raf = requestAnimationFrame(function (x) { self._loop(x); });
  };

  Engine.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    var self = this;
    this._last = performance.now();
    this._raf = requestAnimationFrame(function (x) { self._loop(x); });
  };

  Engine.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  };

  // ---- input: keyboard + touch ----
  var KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left',
                 ArrowRight: 'right', d: 'right', D: 'right',
                 ArrowUp: 'up', w: 'up', W: 'up',
                 ArrowDown: 'down', s: 'down', S: 'down',
                 ' ': 'fire' };

  Engine.prototype._bindInput = function () {
    var self = this, inp = this.input;
    if (typeof window === 'undefined') return; // node tests
    window.addEventListener('keydown', function (e) {
      var k = KEYMAP[e.key];
      if (k) {
        e.preventDefault();
        if (k === 'fire') { inp.fire = true; }
        else { inp[k] = true; self._keys[e.key] = true; }
      }
    });
    window.addEventListener('keyup', function (e) {
      var k = KEYMAP[e.key];
      if (k) {
        if (k === 'fire') { if (!inp._firePulse) inp.fire = false; }
        else { inp[k] = false; delete self._keys[e.key]; }
      }
    });
    var cv = this.cv, anchor = null, t0 = 0;
    function toLogical(t) {
      var r = cv.getBoundingClientRect();
      return { x: (t.clientX - r.left) / r.width * W, y: (t.clientY - r.top) / r.height * H };
    }
    cv.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var p = toLogical(e.changedTouches[0]);
      anchor = p; t0 = Date.now();
      inp.touchActive = true; inp.tx = p.x; inp.ty = p.y;
    }, { passive: false });
    cv.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var p = toLogical(e.changedTouches[0]);
      inp.tx = p.x; inp.ty = p.y;
      if (anchor) {
        var dx = p.x - anchor.x, dy = p.y - anchor.y;
        if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
          inp.swipe = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
          anchor = p; // re-anchor so continuous swipes keep firing
        }
      }
    }, { passive: false });
    cv.addEventListener('touchend', function (e) {
      e.preventDefault();
      var quick = Date.now() - t0 < 220;
      inp.touchActive = false; anchor = null;
      inp.left = inp.right = inp.up = inp.down = false;
      if (quick) { inp.fire = true; inp._firePulse = true; }
    });
    // mouse: hold left/right halves to steer, click = fire
    cv.addEventListener('mousedown', function (e) {
      var r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * W;
      inp.touchActive = true; inp.tx = x;
    });
    window.addEventListener('mouseup', function () { inp.touchActive = false; });
    cv.addEventListener('click', function () { inp.fire = true; inp._firePulse = true; });
  };

  global.BlobEngine = Engine;
  global.BlobApi = api;
  global.BlobCompile = compileFn;
})(typeof window !== 'undefined' ? window : global);
