/* KKSlap — browser twin of first-slap.js (Stone 1: FIRST SLAP).
   Bit-exact with the Node engine: same dealRun, same scoring, SHA-256 via
   KKReplay's pure-JS implementation (no crypto.subtle on HTTP — house rule). */
var KKSlap = (function () {
  'use strict';
  var sha256 = KKReplay.sha256;
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var HANDS = 10, WINDOW_MS = 1000, DIRS = ['U', 'D', 'L', 'R'];
  function dealRun(seed) {
    var rnd = mulberry32(seed);
    var dirs = DIRS.slice();
    for (var i = dirs.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = dirs[i]; dirs[i] = dirs[j]; dirs[j] = tmp;
    }
    var remap = { U: dirs[0], D: dirs[1], L: dirs[2], R: dirs[3] };
    var hands = [], clock = 0;
    for (var h = 0; h < HANDS; h++) {
      var wait = 800 + Math.floor(rnd() * 3200);
      var target = DIRS[Math.floor(rnd() * 4)];
      clock += wait;
      hands.push({ hand: h, stimulusTick: clock, target: target });
      clock += WINDOW_MS + 400;
    }
    return { remap: remap, hands: hands };
  }
  function simulate(seed, tape) {
    var dealt = dealRun(seed), remap = dealt.remap, hands = dealt.hands;
    var score = 0, chain = sha256('slap-genesis:' + seed), results = [];
    for (var h = 0; h < HANDS; h++) {
      var slap = tape[h] || null;
      var stimulusTick = hands[h].stimulusTick, target = hands[h].target;
      var outcome, reaction = null, pts = 0;
      if (!slap) outcome = 'no-slap';
      else if (slap.tick < stimulusTick) outcome = 'foul-early';
      else {
        reaction = slap.tick - stimulusTick;
        if (remap[slap.press] !== target) outcome = 'wrong-button';
        else if (reaction > WINDOW_MS) outcome = 'too-slow';
        else { outcome = 'SLAP'; pts = WINDOW_MS - reaction; }
      }
      score += pts;
      results.push({ hand: h, outcome: outcome, reaction: reaction, pts: pts });
      chain = sha256(chain + '|' + h + ':' + (slap ? slap.tick + slap.press : 'none') + ':' + outcome + ':' + pts);
    }
    return { score: score, results: results, chain: chain };
  }
  function runKey(wallet, seed, nonce) { return sha256(wallet + '|' + seed + '|' + nonce); }
  function verifyRun(run) {
    if (run.key !== runKey(run.wallet, run.seed, run.nonce)) return { valid: false, why: 'run key mismatch' };
    var r = simulate(run.seed, run.tape);
    var ok = r.score === run.claimedScore && r.chain === run.claimedChain;
    return { valid: ok, derivedScore: r.score, derivedChain: r.chain, results: r.results };
  }
  function aiPredictor(seed) {
    var tape = [], clock = 0;
    for (var h = 0; h < HANDS; h++) { clock += 1200; tape.push({ tick: clock, press: 'U' }); clock += WINDOW_MS + 400; }
    return tape;
  }
  function aiReactor(seed) {
    var dealt = dealRun(seed), remap = dealt.remap, hands = dealt.hands;
    var rnd = mulberry32(seed ^ 0x9e3779b9);
    var inv = {}; for (var k in remap) inv[remap[k]] = k;
    return hands.map(function (hd) {
      var reaction = 220 + Math.floor(rnd() * 230);
      var fooled = rnd() < 0.12;
      var logical = fooled ? DIRS[Math.floor(rnd() * 4)] : hd.target;
      return { tick: hd.stimulusTick + reaction, press: inv[logical] };
    });
  }
  return { dealRun: dealRun, simulate: simulate, verifyRun: verifyRun, runKey: runKey, aiPredictor: aiPredictor, aiReactor: aiReactor, HANDS: HANDS, WINDOW_MS: WINDOW_MS };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = KKSlap;
if (typeof window !== 'undefined') window.KKSlap = KKSlap;
