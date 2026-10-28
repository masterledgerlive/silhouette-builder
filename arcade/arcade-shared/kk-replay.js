/* KKReplay — browser twin of the Arcades of Time deterministic replay engine.
   MUST stay bit-exact with ~/workspace/arcades-of-time/replay-engine/replay-engine.js:
   same PRNG, same world build, same per-tick SHA-256 state chain.
   House rule (2026-10-16): HTTP pages have no crypto.subtle — SHA-256 here is
   a pure-JS FIPS 180-4 implementation, verified against Node crypto in tests. */
var KKReplay = (function () {
  'use strict';

  // ---------- pure-JS SHA-256 (FIPS 180-4), ASCII/UTF-8 input ----------
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var maxWord = Math.pow(2, 32), result = '';
    var words = [], asciiBitLength = ascii.length * 8;
    var hash = sha256.h = sha256.h || [], k = sha256.k = sha256.k || [];
    var primeCounter = k.length, isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (var i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (Math.pow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (var j = 0; j < ascii.length; j++) {
      var code = ascii.charCodeAt(j);
      if (code >> 8) throw new Error('kk-replay sha256: non-ASCII input');
      words[j >> 2] |= code << ((3 - j) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = asciiBitLength;
    for (var block = 0; block < words.length; block += 16) {
      var w = words.slice(block, block + 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (var t = 0; t < 64; t++) {
        var w15 = w[t - 15], w2 = w[t - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[t]
          + (w[t] = (t < 16) ? w[t] : (
              w[t - 16]
              + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3))
              + w[t - 7]
              + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))
            ) | 0);
        var temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (var u = 0; u < 8; u++) hash[u] = (hash[u] + oldHash[u]) | 0;
    }
    for (var v = 0; v < 8; v++) {
      for (var b = 3; b + 1; b--) {
        var byte = (hash[v] >> (b * 8)) & 255;
        result += ((byte < 16) ? '0' : '') + byte.toString(16);
      }
    }
    return result;
  }

  // ---------- deterministic PRNG (mulberry32) — identical to Node engine ----------
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- FINN-8 "Pellet Run" — identical rules to Node engine ----------
  var W = 16, H = 12;
  var ACTIONS = ['U', 'D', 'L', 'R', 'A', 'B'];

  function buildWorld(seed) {
    var rnd = mulberry32(seed);
    var pellets = {};
    var count = 0;
    while (count < 12) {
      var x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
      if (!(x === 0 && y === 0) && !pellets[x + ',' + y]) { pellets[x + ',' + y] = true; count++; }
    }
    var dirs = ['U', 'D', 'L', 'R'];
    for (var i = dirs.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = dirs[i]; dirs[i] = dirs[j]; dirs[j] = tmp;
    }
    var remap = { U: dirs[0], D: dirs[1], L: dirs[2], R: dirs[3], A: 'A', B: 'B' };
    return { pellets: pellets, remap: remap, ghostStart: { x: W - 1, y: H - 1 } };
  }

  function simulate(seed, tape) {
    var world = buildWorld(seed);
    var pellets = {}; for (var pk in world.pellets) pellets[pk] = true;
    var remap = world.remap, ghostStart = world.ghostStart;
    var px = 0, py = 0, gx = ghostStart.x, gy = ghostStart.y;
    var hp = 3, score = 0, chain = sha256('genesis:' + seed);
    var DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
    for (var t = 0; t < tape.length; t++) {
      var press = tape[t];
      if (ACTIONS.indexOf(press) < 0) throw new Error('illegal press in tape: ' + press);
      var logical = remap[press];
      if (DIRS[logical]) {
        px = Math.min(W - 1, Math.max(0, px + DIRS[logical][0]));
        py = Math.min(H - 1, Math.max(0, py + DIRS[logical][1]));
      }
      if (t % 2 === 1) {
        if (gx !== px) gx += Math.sign(px - gx);
        else if (gy !== py) gy += Math.sign(py - gy);
      }
      var key = px + ',' + py;
      if (pellets[key]) { delete pellets[key]; score += 10; }
      if (gx === px && gy === py) {
        hp -= 1; gx = ghostStart.x; gy = ghostStart.y;
        if (hp <= 0) { chain = sha256(chain + '|' + t + ':dead'); return { score: score, hp: hp, ticks: t + 1, chain: chain, alive: false }; }
      }
      chain = sha256(chain + '|' + t + ':' + px + ',' + py + ',' + gx + ',' + gy + ',' + score + ',' + hp);
    }
    return { score: score, hp: hp, ticks: tape.length, chain: chain, alive: hp > 0 };
  }

  function verifyRun(run) {
    var r = simulate(run.seed, run.tape);
    var scoreOK = r.score === run.claimedScore;
    var chainOK = r.chain === run.claimedChain;
    return { valid: scoreOK && chainOK, derivedScore: r.score, derivedHp: r.hp, derivedChain: r.chain, scoreOK: scoreOK, chainOK: chainOK };
  }

  /** Parse a tape pasted by a player: "U D L R A" / "UDLRA" / "U,D,L" all work. */
  function parseTape(text) {
    var letters = String(text || '').toUpperCase().replace(/[^UDLRAB]/g, '').split('');
    return letters;
  }

  return { sha256: sha256, simulate: simulate, verifyRun: verifyRun, buildWorld: buildWorld, parseTape: parseTape };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = KKReplay;
if (typeof window !== 'undefined') window.KKReplay = KKReplay;
