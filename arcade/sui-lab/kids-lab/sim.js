/* Koda Kai Kids Quantum Lab — tiny statevector simulator + the 4 puzzles.
   Pure JS, no dependencies. Works in the browser (window.QSim) and in node
   (module.exports) so the exact code the kids run is the code we test.
   Convention: qubit 0 is the least significant bit of the state index. */
(function (global) {
  "use strict";

  // ---------- statevector core ----------
  function newState(n) {
    var size = 1 << n;
    var re = new Float64Array(size), im = new Float64Array(size);
    re[0] = 1;
    return { n: n, re: re, im: im };
  }
  // All gates in our set (H, X, RY) are real matrices, stored flat
  // [m00, m01, m10, m11]; imaginary parts stay zero throughout.
  function applyReal(st, q, m) {
    var M = [ [ [m[0],0],[m[1],0] ], [ [m[2],0],[m[3],0] ] ];
    var step = 1 << q, size = 1 << st.n;
    for (var i = 0; i < size; i++) {
      if (i & step) continue;
      var j = i | step;
      var a0 = st.re[i], a1 = st.re[j];
      st.re[i] = M[0][0][0] * a0 + M[0][1][0] * a1;
      st.re[j] = M[1][0][0] * a0 + M[1][1][0] * a1;
      // imaginary parts are all zero for our gate set (H, X, RY) — keep them zero
      st.im[i] = 0; st.im[j] = 0;
    }
  }
  var SQ = Math.SQRT1_2;
  function H(st, q) { applyReal(st, q, [SQ, SQ, SQ, -SQ]); }
  function X(st, q) { applyReal(st, q, [0, 1, 1, 0]); }
  function RY(st, q, theta) {
    var c = Math.cos(theta / 2), s = Math.sin(theta / 2);
    applyReal(st, q, [c, -s, s, c]);
  }
  function CNOT(st, control, target) {
    var size = 1 << st.n;
    for (var i = 0; i < size; i++) {
      if ((i & (1 << control)) && !(i & (1 << target))) {
        var j = i | (1 << target);
        var tr = st.re[i]; st.re[i] = st.re[j]; st.re[j] = tr;
        var ti = st.im[i]; st.im[i] = st.im[j]; st.im[j] = ti;
      }
    }
  }
  function probs(st) {
    var out = new Float64Array(1 << st.n);
    for (var i = 0; i < out.length; i++) out[i] = st.re[i] * st.re[i] + st.im[i] * st.im[i];
    return out;
  }
  function sample(st, rng) {
    var p = probs(st), r = rng(), acc = 0;
    for (var i = 0; i < p.length; i++) { acc += p[i]; if (r <= acc) return i; }
    return p.length - 1;
  }

  // ---------- Puzzle 1: Quantum Coin Flip ----------
  function coinFlip(shots, rng) {
    rng = rng || Math.random;
    var heads = 0;
    for (var s = 0; s < shots; s++) {
      var st = newState(1); H(st, 0);
      if (sample(st, rng) === 0) heads++;
    }
    return { heads: heads, tails: shots - heads, shots: shots };
  }

  // ---------- Puzzle 2: Build-a-Bell ----------
  function bellPair(shots, rng) {
    rng = rng || Math.random;
    var counts = { "00": 0, "01": 0, "10": 0, "11": 0 };
    for (var s = 0; s < shots; s++) {
      var st = newState(2); H(st, 0); CNOT(st, 0, 1);
      var v = sample(st, rng);
      counts[(v & 2 ? "1" : "0") + (v & 1 ? "1" : "0")]++; // q1 q0
    }
    return { counts: counts, shots: shots };
  }

  // ---------- Puzzle 3: Guess-My-Number (Grover, 4 doors) ----------
  function groverAmps(marked) {
    // exact statevector run, returns probabilities after 1 Grover round
    var st = newState(2); H(st, 0); H(st, 1);
    // oracle: flip the sign of the marked amplitude
    st.re[marked] = -st.re[marked];
    // diffusion: reflect amplitudes about their mean
    var mean = 0, i; for (i = 0; i < 4; i++) mean += st.re[i]; mean /= 4;
    for (i = 0; i < 4; i++) st.re[i] = 2 * mean - st.re[i];
    return probs(st);
  }
  function grover(marked, shots, rng) {
    rng = rng || Math.random;
    var p = groverAmps(marked), counts = [0, 0, 0, 0];
    for (var s = 0; s < shots; s++) {
      var r = rng(), acc = 0;
      for (var i = 0; i < 4; i++) { acc += p[i]; if (r <= acc) { counts[i]++; break; } }
    }
    return { marked: marked, counts: counts, shots: shots, probs: Array.from(p) };
  }

  // ---------- Puzzle 4: The CHSH Game ----------
  // Win rule: a XOR b must equal x AND y. Classical best = 75%.
  // Quantum team shares a Bell pair and measures at angles:
  var ANG = { A: [0, Math.PI / 2], B: [Math.PI / 4, -Math.PI / 4] };
  function chshRoundQuantum(x, y, rng) {
    var st = newState(2); H(st, 0); CNOT(st, 0, 1);
    RY(st, 0, ANG.A[x]); RY(st, 1, ANG.B[y]);
    var v = sample(st, rng);
    return { a: v & 1, b: (v >> 1) & 1 };
  }
  function chshRoundClassical(x, y) {
    // best classical plan: both always answer 0 (wins unless x=y=1)
    return { a: 0, b: 0 };
  }
  function chsh(rounds, quantum, rng) {
    rng = rng || Math.random;
    var wins = 0;
    for (var r = 0; r < rounds; r++) {
      var x = rng() < 0.5 ? 0 : 1, y = rng() < 0.5 ? 0 : 1;
      var res = quantum ? chshRoundQuantum(x, y, rng) : chshRoundClassical(x, y);
      if ((res.a ^ res.b) === (x & y)) wins++;
    }
    return { wins: wins, rounds: rounds, rate: wins / rounds };
  }

  // ---------- Receipt hash (pure-JS SHA-256; crypto.subtle is not
  // available on plain-HTTP pages, so the lab carries its own) ----------
  function utf8Bytes(str) {
    // encode a JS string as a byte-string of its UTF-8 bytes (receipt text
    // contains em-dashes and emoji-adjacent punctuation; the hasher below
    // works on bytes, and throws on anything above U+00FF if unencoded)
    var out = "";
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out += String.fromCharCode(c);
      else if (c < 0x800) out += String.fromCharCode(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        var cp = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(++i) - 0xdc00);
        out += String.fromCharCode(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      } else out += String.fromCharCode(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return out;
  }
  function sha256(input) {
    var ascii = utf8Bytes(input);
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mathPow = Math.pow, maxWord = mathPow(2, 32), i, j, result = "";
    var words = [], asciiBitLength = ascii.length * 8;
    var hash = sha256.h = sha256.h || [], k = sha256.k = sha256.k || [];
    var primeCounter = k.length, isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += "\x80";
    while (ascii.length % 64 - 56) ascii += "\x00";
    for (i = 0; i < ascii.length; i++) {
      var code = ascii.charCodeAt(i);
      if (code >> 8) throw new Error("sha256: non-ASCII input");
      words[i >> 2] |= code << (((3 - i) % 4) * 8);
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25))
          + ((e & hash[5]) ^ (~e & hash[6]))
          + k[i]
          + (w[i] = i < 16 ? w[i] : (
              w[i - 16]
              + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))
            ) | 0);
        var temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
        hash.length = 8; // trim to 8 words for next round (keeps [a..h] window)
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? "0" : "") + b.toString(16);
      }
    }
    return result;
  }

  var api = {
    newState: newState, H: H, X: X, RY: RY, CNOT: CNOT, probs: probs, sample: sample,
    coinFlip: coinFlip, bellPair: bellPair, grover: grover, groverAmps: groverAmps,
    chsh: chsh, sha256: sha256
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.QSim = api;
})(typeof window !== "undefined" ? window : globalThis);
