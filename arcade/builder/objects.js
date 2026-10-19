/* Blob Arcade Object Runtime v0.2 — games as objects, not monoliths.
   Each object: {id, name, kind, keep, params, initSrc, tickSrc, drawSrc, emits, listens}
   Per-object try/catch: an errored object is skipped, the rest keep running.
   Objects share a `world` (cues, time, cross-object refs) and an `emit` cue bus.
   Reuses BlobApi (clamp/overlap/rand) from engine.js. No dependencies. */
(function (global) {
  'use strict';

  var W = 400, H = 500;
  var uid = 0;

  function newId() { uid += 1; return 'obj' + uid + '_' + Date.now().toString(36); }

  function compile(src) {
    var f = eval('(' + src + ')');
    if (typeof f !== 'function') throw new Error('not a function');
    return f;
  }

  function ObjectRuntime(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    this.objects = [];           // in run/draw order
    this.world = { time: 0, cues: [], cueFeed: [], W: W, H: H };
    this.input = { left: false, right: false, up: false, down: false, fire: false,
                   swipe: null, tx: 0, ty: 0, touchActive: false };
    this.running = false;
    this._raf = 0; this._last = 0;
    this._keys = {};
    this.onFrame = null;   // hook: called after each step (for UI)
    this.onError = null;   // hook: called on object error
    this._bindInput();
  }

  ObjectRuntime.prototype.addObject = function (spec) {
    // spec: {name, kind, params, initSrc, tickSrc, drawSrc, emits, listens, keep}
    var obj = {
      id: spec.id || newId(),
      name: spec.name || 'object',
      kind: spec.kind || 'sprite',
      keep: spec.keep !== false,
      params: spec.params || {},
      initSrc: spec.initSrc || 'function(P, api, world) { return {}; }',
      tickSrc: spec.tickSrc || 'function(S, P, input, dt, api, world, emit) {}',
      drawSrc: spec.drawSrc || 'function(S, P, ctx, api) {}',
      emits: spec.emits || [],
      listens: spec.listens || [],
      state: null,
      error: null, errorCount: 0,
      hash: null, blobId: null, bytes: 0
    };
    this.objects.push(obj);
    this._initObject(obj);
    return obj;
  };

  ObjectRuntime.prototype._initObject = function (obj) {
    obj.error = null;
    try {
      obj.initFn = compile(obj.initSrc);
      obj.tickFn = compile(obj.tickSrc);
      obj.drawFn = compile(obj.drawSrc);
      obj.state = obj.initFn(obj.params, BlobApi, this.world);
    } catch (e) {
      obj.error = 'init: ' + e.message;
      obj.errorCount++;
      if (this.onError) this.onError(obj);
    }
  };

  ObjectRuntime.prototype.removeObject = function (id) {
    this.objects = this.objects.filter(function (o) { return o.id !== id; });
  };

  ObjectRuntime.prototype.getObject = function (id) {
    for (var i = 0; i < this.objects.length; i++)
      if (this.objects[i].id === id) return this.objects[i];
    return null;
  };

  ObjectRuntime.prototype.retryObject = function (id) {
    var obj = this.getObject(id);
    if (obj) { obj.errorCount = 0; this._initObject(obj); }
  };

  ObjectRuntime.prototype._emitFor = function (obj) {
    var self = this;
    return function (cue, data) {
      var entry = { from: obj.name, fromId: obj.id, cue: cue,
                    data: data || {}, t: self.world.time };
      self.world.cues.push(entry);
      self.world.cueFeed.push(entry);
      if (self.world.cueFeed.length > 8) self.world.cueFeed.shift();
    };
  };

  ObjectRuntime.prototype.step = function (dt) {
    dt = Math.min(dt, 0.05);
    var world = this.world;
    world.time += dt;
    world.cues = [];
    var i, obj;
    // tick — per-object isolation
    for (i = 0; i < this.objects.length; i++) {
      obj = this.objects[i];
      if (!obj.keep || obj.error) continue;
      try {
        obj.tickFn(obj.state, obj.params, this.input, dt, BlobApi, world, this._emitFor(obj));
      } catch (e) {
        obj.error = 'tick: ' + e.message;
        obj.errorCount++;
        if (this.onError) this.onError(obj);
      }
    }
    // draw — background
    var c = this.ctx;
    c.fillStyle = '#0a0a18'; c.fillRect(0, 0, W, H);
    for (i = 0; i < this.objects.length; i++) {
      obj = this.objects[i];
      if (!obj.keep || obj.error) continue;
      try {
        obj.drawFn(obj.state, obj.params, c, BlobApi);
      } catch (e) {
        obj.error = 'draw: ' + e.message;
        obj.errorCount++;
        if (this.onError) this.onError(obj);
      }
    }
    this.input.swipe = null;
    if (this.input._firePulse) { this.input.fire = false; this.input._firePulse = false; }
    if (this.onFrame) this.onFrame();
  };

  ObjectRuntime.prototype._loop = function (t) {
    if (!this.running) return;
    var dt = (t - this._last) / 1000 || 0.016;
    this._last = t;
    this.step(dt);
    var self = this;
    this._raf = requestAnimationFrame(function (x) { self._loop(x); });
  };

  ObjectRuntime.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this._last = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    var self = this;
    this._raf = requestAnimationFrame(function (x) { self._loop(x); });
  };

  ObjectRuntime.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  };

  ObjectRuntime.prototype.resetAll = function () {
    var self = this;
    this.objects.forEach(function (o) { self._initObject(o); });
    this.world.time = 0; this.world.cues = []; this.world.cueFeed = [];
  };

  // ---- input: keyboard + touch (same contract as engine.js) ----
  var KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left',
                 ArrowRight: 'right', d: 'right', D: 'right',
                 ArrowUp: 'up', w: 'up', W: 'up',
                 ArrowDown: 'down', s: 'down', D: 'down',
                 ' ': 'fire' };
  KEYMAP.s = 'down'; KEYMAP.S = 'down';

  ObjectRuntime.prototype._bindInput = function () {
    var self = this, inp = this.input;
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', function (e) {
      var k = KEYMAP[e.key];
      if (k) {
        e.preventDefault();
        if (k === 'fire') inp.fire = true;
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
          anchor = p;
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
    cv.addEventListener('mousedown', function (e) {
      var r = cv.getBoundingClientRect();
      inp.tx = (e.clientX - r.left) / r.width * W;
      inp.touchActive = true;
    });
    window.addEventListener('mouseup', function () { inp.touchActive = false; });
    cv.addEventListener('click', function () { inp.fire = true; inp._firePulse = true; });
  };

  global.BlobObjects = ObjectRuntime;
  global.BlobObjectNewId = newId;
})(typeof window !== 'undefined' ? window : global);
