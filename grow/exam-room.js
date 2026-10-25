/* exam_room.js — 🎓👥 Yaae's Live Exam Room: audience mode + receipts.
   David's commission 2026-10-25. Served as grow/exam-room.js.
   - Audience takes the same paper she sat, scored client-side against
     sha256 hashes of the key (the key is NOT in the quiz payload).
   - The key reveal + "YOU vs YAAE" come from her public replay record,
     fetched only after the taker submits (and, for a live sitting,
     only once her SCORED stage exists).
   - Every result becomes a portable, content-hashed RESULT RECEIPT
     (same schema as src/exam_audience.py) with copy/download + a
     verifier. No account, no server.
   Canonical form + answer normalization MUST match exam_audience.py
   byte-for-byte. sha256 is pure JS (works on any page, any scheme). */
(function (global) {
"use strict";

/* ------------------------------------------------ utf8 + sha256 (FIPS 180-4, pure JS) */
function utf8Bytes(str) {
  var bytes = [], i, c;
  for (i = 0; i < str.length; i++) {
    c = str.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      var c2 = str.charCodeAt(i + 1);
      if (c2 >= 0xdc00 && c2 <= 0xdfff) {
        var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00); i++;
        bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f),
                   0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      } else bytes.push(0xef, 0xbf, 0xbd);
    } else if (c >= 0xdc00 && c <= 0xdfff) bytes.push(0xef, 0xbf, 0xbd);
    else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return bytes;
}
var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
function sha256Hex(str) {
  var bytes = utf8Bytes(str), l = bytes.length;
  var bitLenHi = Math.floor(l / 0x20000000), bitLenLo = (l * 8) >>> 0;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  var i, j;
  for (i = 7; i >= 0; i--) bytes.push(0); // placeholder, filled below
  for (i = 0; i < 4; i++) bytes[bytes.length - 8 + i] = (bitLenHi >>> ((3 - i) * 8)) & 0xff;
  for (i = 0; i < 4; i++) bytes[bytes.length - 4 + i] = (bitLenLo >>> ((3 - i) * 8)) & 0xff;
  var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  var w = new Array(64);
  for (var block = 0; block < bytes.length; block += 64) {
    for (i = 0; i < 16; i++) {
      j = block + i * 4;
      w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) | 0;
    }
    for (i = 16; i < 64; i++) {
      var s0 = (rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) | 0;
      var s1 = (rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) | 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (i = 0; i < 64; i++) {
      var S1 = (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) | 0;
      var ch = ((e & f) ^ (~e & g)) | 0;
      var t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      var S0 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) | 0;
      var maj = ((a & b) ^ (a & c) ^ (b & c)) | 0;
      var t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(function (x) {
    var s = (x >>> 0).toString(16); return ("00000000" + s).slice(-8);
  }).join("");
}

/* ------------------------------------------------ canonical form (matches exam_audience.py) */
function round2(v) { return Math.round(v * 100) / 100; }
function canonNum(v) {
  if (typeof v !== "number") return v;
  var r = round2(v);
  return Number.isInteger(r) ? Math.trunc(r) : r;
}
function canonStr(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") { var n = canonNum(v); return Number.isInteger(n) ? String(n) : String(n); }
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonStr).join(",") + "]";
  var keys = Object.keys(v).sort();
  return "{" + keys.map(function (k) { return JSON.stringify(k) + ":" + canonStr(v[k]); }).join(",") + "}";
}
function contentHash(bodyWithoutHash) { return sha256Hex(canonStr(bodyWithoutHash)); }
function normAnswer(s) {
  if (s === null || s === undefined) return "";
  return String(s).trim().toLowerCase().replace(/\s+/g, " ").replace(/[.\s]+$/, "");
}
function answerHash(normalized) { return sha256Hex("yaae-quiz-v1\n" + normalized); }

/* ------------------------------------------------ ET timestamps (matches lx.now_iso) */
function fmtET(epochSecs) {
  try {
    var d = new Date(epochSecs * 1000);
    var parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
      minute: "2-digit", second: "2-digit", hour12: true }).formatToParts(d);
    var p = {};
    parts.forEach(function (x) { p[x.type] = x.value; });
    return p.year + "-" + p.month + "-" + p.day + " " + p.hour + ":" + p.minute +
           ":" + p.second + " " + p.dayPeriod + " ET";
  } catch (e) { return new Date(epochSecs * 1000).toISOString(); }
}

var CARRIES_NOTE = "This receipt IS the credential: whoever holds the JSON holds the " +
  "result. Any human or agentic AI can present it anywhere, and anyone can verify it " +
  "with no account — recompute content_hash over the body (every field except " +
  "content_hash, canonical form) and check exam.paper_hash against the sitting's " +
  "published quiz payload. It certifies the score on that paper only; it is not " +
  "money, not a token, and not transferable value.";
var GRADER_AUDIENCE = { name: "exam-room.js audience grader", version: "1",
  standard: "client-side sha256 of normalized answers vs the sealed key hashes — " +
            "the same key the house scorer used" };

function buildAudienceReceipt(payload, paperKey, result, takerName, takerType, epochSecs) {
  var ep = epochSecs || Math.floor(Date.now() / 1000);
  var yr = payload.yaae_receipt || {};
  var body = {
    receipt_id: "aud-" + payload.sitting_id + "-" + paperKey.replace(":", "-") + "-" + ep,
    version: 1,
    exam: { sitting_id: payload.sitting_id, exam: payload.exam || "",
            title: payload.title || "", paper_key: paperKey,
            paper_hash: payload.paper_hash },
    taker: { type: takerType || "human", name: takerName || "Anonymous audience" },
    result: result,
    issued_at: fmtET(ep), issued_epoch: ep,
    grader: GRADER_AUDIENCE,
    prev_hash: yr.content_hash || null,
    token_link: { token: "FIN", status: "not-linked", linked_at: null, ref: null },
    carries_note: CARRIES_NOTE
  };
  body.content_hash = contentHash(body);
  return body;
}

function verifyReceipt(receipt, knownPaperHash) {
  /* knownPaperHash: the published payload's paper_hash for the receipt's
     sitting, or null when no payload is published for it, or undefined
     to skip the paper check. Mirrors exam_audience.receipt_verify. */
  var fails = [];
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    return { ok: false, fails: ["receipt is not a JSON object"] };
  }
  if (!receipt.content_hash) fails.push("content_hash missing");
  else {
    var body = {};
    Object.keys(receipt).forEach(function (k) { if (k !== "content_hash") body[k] = receipt[k]; });
    if (contentHash(body) !== receipt.content_hash)
      fails.push("content_hash mismatch — the receipt body was edited after it was issued");
  }
  var exam = receipt.exam || {};
  if (!exam.sitting_id || !exam.paper_hash)
    fails.push("exam.sitting_id / exam.paper_hash missing");
  else if (knownPaperHash !== undefined) {
    if (knownPaperHash === null)
      fails.push("unknown sitting " + exam.sitting_id + " — no published quiz payload to check the paper against");
    else if (knownPaperHash !== exam.paper_hash)
      fails.push("paper_hash mismatch — the paper in this receipt is not the paper of the named sitting");
  }
  if (receipt.version !== 1) fails.push("unsupported receipt version " + receipt.version);
  return { ok: fails.length === 0, fails: fails };
}

/* ------------------------------------------------ page engine */
function esc(x) {
  var d = document.createElement("div");
  d.textContent = (x === null || x === undefined) ? "" : String(x);
  return d.innerHTML;
}
function store(k, v) { try { if (v === undefined) { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
function attemptKey(sid, pk) { return "yaae-attempt-" + sid + "-" + pk; }

function updateYouSpans(sid) {
  var best = null;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf("yaae-attempt-" + sid + "-") === 0) {
        var a = JSON.parse(localStorage.getItem(k));
        if (a && typeof a.pct === "number" && (best === null || a.pct > best)) best = a.pct;
      }
    }
  } catch (e) {}
  var spans = document.querySelectorAll('[data-you-for="' + sid + '"]');
  for (var j = 0; j < spans.length; j++)
    spans[j].textContent = (best === null) ? "" : " · You: " + best + "%";
  return best;
}

function lastScoredByPaper(rec) {
  var out = {};
  (rec.events || []).forEach(function (ev) {
    if (ev.stage === "SCORED") out[(ev.paper_no || 1) + ":" + (ev.kind || "FULL PAPER")] = ev;
  });
  return out;
}
function catAgg(items, valOf) {
  var agg = {};
  (items || []).forEach(function (it) {
    var cat = it.category || "Uncategorised";
    agg[cat] = agg[cat] || { asked: 0, correct: 0 };
    agg[cat].asked++;
    if (valOf(it)) agg[cat].correct++;
  });
  Object.keys(agg).forEach(function (c) {
    agg[c].pct = agg[c].asked ? round2(100 * agg[c].correct / agg[c].asked) : 0;
  });
  return agg;
}

function scoreAnswers(paper, answers) {
  /* answers: {qid: rawValue}. MC values are letters; open are text. */
  var items = [], correct = 0;
  paper.questions.forEach(function (q) {
    var raw = answers[q.id];
    var got = (raw === undefined || raw === null) ? "" : String(raw);
    var ok = got !== "" && answerHash(normAnswer(got)) === q.answer_hash;
    if (ok) correct++;
    items.push({ id: q.id, category: q.category || null, ok: ok, got: got });
  });
  var total = paper.questions.length;
  return { items: items, correct: correct, total: total,
           score: correct + "/" + total,
           pct: total ? round2(100 * correct / total) : 0,
           per_category: catAgg(items, function (it) { return it.ok; }) };
}

function renderReveal(container, paper, result, replayRec) {
  var scored = replayRec ? lastScoredByPaper(replayRec) : {};
  var sev = scored[paper.paper_key];
  var html = "";
  if (!sev) {
    html += '<div class="revbox">🔒 Your answers are scored against the sealed key. ' +
            'The key reveal — and Yaae\'s numbers — unlock here the moment her scorer posts.</div>';
  } else {
    var keyById = {};
    (sev.items || []).forEach(function (it) { keyById[it.id] = it; });
    html += '<div class="scorehead">The key, revealed — your paper</div>';
    result.items.forEach(function (it) {
      var k = keyById[it.id] || {};
      var cor = k.correct_letter ? k.correct_letter + " — " + k.correct : (k.correct || "");
      var why = k.why ? '<div class="qwhy">' + esc(k.why) + "</div>" : "";
      html += '<div class="srow ' + (it.ok ? "ok" : "bad") + '"><span class="smark">' +
              (it.ok ? "✓" : "✗") + '</span><div class="smain"><b>' + esc(it.id) + "</b>" +
              (it.category ? " · " + esc(it.category) : "") + "<br>your answer: " +
              esc(it.got === "" ? "(no answer)" : it.got) + "<br>correct: " + esc(cor) + why +
              "</div></div>";
    });
    /* YOU vs YAAE */
    var herCats = catAgg(sev.items, function (it) { return it.ok; });
    var cats = {};
    Object.keys(result.per_category).forEach(function (c) { cats[c] = true; });
    Object.keys(herCats).forEach(function (c) { cats[c] = true; });
    var rows = Object.keys(cats).sort().map(function (c) {
      var you = result.per_category[c], her = herCats[c];
      var yp = you ? you.pct : null, hp = her ? her.pct : null;
      var delta = (yp !== null && hp !== null) ? (round2(yp - hp)) : null;
      var dtxt = delta === null ? "" : (delta === 0 ? " · level" :
                 (delta > 0 ? " · you +" + delta : " · you " + delta));
      return "<tr><td>" + esc(c) + "</td><td>" + (yp === null ? "—" : yp + "%") +
             "</td><td>" + (hp === null ? "—" : hp + "%") + "</td><td>" + dtxt + "</td></tr>";
    }).join("");
    var verdictLine = result.pct > sev.pct ? "You beat Yaae on this paper. She would want a rematch."
      : result.pct === sev.pct ? "Dead level with Yaae on this paper."
      : "Yaae takes this one — " + sev.pct + "% to your " + result.pct + "%. The replay shows her working.";
    html += '<div class="finbox">⚖️ <b>YOU vs YAAE</b> — you <b>' + result.pct + "%</b> · Yaae <b>" +
            sev.pct + "%</b> (" + esc(sev.score || "") + ")<br>" + esc(verdictLine) +
            '<table class="vstable"><tr><th>Category</th><th>You</th><th>Yaae</th><th></th></tr>' +
            rows + "</table></div>";
  }
  container.innerHTML = html;
  return !!sev;
}

function receiptBlock(container, receipt) {
  var txt = JSON.stringify(receipt, null, 1);
  container.innerHTML =
    '<div class="scorehead">🧾 Your result receipt — carry it anywhere</div>' +
    '<p class="sub">This JSON is the whole credential: any person or agentic AI can hold it, ' +
    'present it, and anyone can verify it below with no account. It carries a reserved ' +
    'token_link slot for the token David makes later — today it certifies the score, nothing more.</p>' +
    '<div class="receiptbtns"><button type="button" class="qbtn" data-act="copy">📋 Copy receipt</button>' +
    '<a class="qbtn" data-act="dl" download="' + esc(receipt.receipt_id) + '.json">⬇ Download</a></div>' +
    '<pre class="receiptjson">' + esc(txt) + "</pre>";
  var copyBtn = container.querySelector('[data-act="copy"]');
  if (copyBtn) copyBtn.addEventListener("click", function () {
    var done = function () { copyBtn.textContent = "✓ Copied"; };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(txt).then(done, done);
    else {
      var ta = document.createElement("textarea");
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); done();
    }
  });
  var dl = container.querySelector('[data-act="dl"]');
  if (dl) dl.href = "data:application/json;charset=utf-8," + encodeURIComponent(txt);
}

function takerControlsHTML() {
  var name = store("yaae-name") || "", type = store("yaae-type") || "human";
  return '<div class="takerrow"><label>Your name (goes on your receipt): ' +
    '<input type="text" class="taker-name" maxlength="60" value="' + esc(name) +
    '" placeholder="Anonymous audience"></label> ' +
    '<label>You are: <select class="taker-type">' +
    '<option value="human"' + (type === "human" ? " selected" : "") + '>a human</option>' +
    '<option value="agent"' + (type === "agent" ? " selected" : "") + '>an agentic AI</option>' +
    "</select></label></div>";
}

function mountQuiz(box) {
  var sid = box.getAttribute("data-quiz");
  if (!sid || box.getAttribute("data-mounted")) return;
  box.setAttribute("data-mounted", "1");
  box.innerHTML = '<p class="sub">Loading the sealed paper…</p>';
  fetch("quizzes/" + encodeURIComponent(sid) + ".json?t=" + Date.now())
    .then(function (r) { if (!r.ok) throw new Error("no payload"); return r.json(); })
    .then(function (payload) { renderQuiz(box, payload, null); })
    .catch(function () {
      box.innerHTML = '<p class="sub">The sealed quiz for this sitting is not published yet — ' +
                      'it appears here as soon as the sitting finishes.</p>';
    });
}

function renderQuiz(box, payload, liveRec) {
  box.innerHTML = takerControlsHTML() +
    '<p class="sub">📝 <b>Take the same paper</b> — before you look at her results above. ' +
    'Your answers are scored against sha256 hashes of the key; the key itself is revealed ' +
    'only after you submit. Your best attempt is kept on this device.</p>' +
    payload.papers.map(function (paper, pi) {
      var qs = paper.questions.map(function (q, qi) {
        var input;
        if (q.type === "mc") {
          input = (q.options || []).map(function (o) {
            return '<label class="qopt qopt-in"><input type="radio" name="q-' + pi + "-" + qi +
                   '" value="' + esc(o.letter) + '"> ' + esc(o.letter) + ") " + esc(o.text) + "</label>";
          }).join("");
        } else {
          input = '<div class="qopt"><input type="text" class="open-in" data-q="' + pi + "-" + qi +
                  '" placeholder="type your answer" style="width:92%;max-width:420px"></div>';
        }
        return '<div class="qbox"><div class="qq"><b>' + esc(q.id) + ".</b>" +
               (q.category ? ' <span class="qcat">' + esc(q.category) + "</span>" : "") + " " +
               esc(q.question) + "</div>" + input + "</div>";
      }).join("");
      return '<div class="paperbox" data-paper="' + esc(paper.paper_key) + '">' +
             "<h4>📄 " + esc(paper.kind) + ' — <span class="paperscore" data-role="paperscore"></span></h4>' +
             qs + '<button type="button" class="qbtn" data-act="submit">Submit &amp; score me</button>' +
             '<div data-role="reveal"></div><div data-role="receipt"></div></div>';
    }).join("");
  payload.papers.forEach(function (paper, pi) {
    var pbox = box.querySelector('[data-paper="' + paper.paper_key.replace(/"/g, "") + '"]') ||
               box.querySelectorAll(".paperbox")[pi];
    var att = store(attemptKey(payload.sitting_id, paper.paper_key));
    if (att && att.answers) {
      paper.questions.forEach(function (q, qi) {
        var v = att.answers[q.id];
        if (v === undefined || v === "") return;
        if (q.type === "mc") {
          var radio = pbox.querySelector('input[name="q-' + pi + "-" + qi + '"][value="' + v + '"]');
          if (radio) radio.checked = true;
        } else {
          var inp = pbox.querySelector('[data-q="' + pi + "-" + qi + '"]');
          if (inp) inp.value = v;
        }
      });
      var res = scoreAnswers(paper, att.answers);
      finishAttempt(box, payload, paper, pbox, res, att.answers, true);
    }
    pbox.querySelector('[data-act="submit"]').addEventListener("click", function () {
      var answers = {};
      paper.questions.forEach(function (q, qi) {
        if (q.type === "mc") {
          var sel = pbox.querySelector('input[name="q-' + pi + "-" + qi + '"]:checked');
          answers[q.id] = sel ? sel.value : "";
        } else {
          var inp = pbox.querySelector('[data-q="' + pi + "-" + qi + '"]');
          answers[q.id] = inp ? inp.value : "";
        }
      });
      var res = scoreAnswers(paper, answers);
      store(attemptKey(payload.sitting_id, paper.paper_key),
            { answers: answers, pct: res.pct, score: res.score, ts: Math.floor(Date.now() / 1000) });
      finishAttempt(box, payload, paper, pbox, res, answers, false);
    });
  });
  updateYouSpans(payload.sitting_id);
}

function finishAttempt(box, payload, paper, pbox, res, answers, restored) {
  var head = pbox.querySelector('[data-role="paperscore"]');
  if (head) head.textContent = "you scored " + res.score + " · " + res.pct + "%";
  var revealBox = pbox.querySelector('[data-role="reveal"]');
  var receiptBox = pbox.querySelector('[data-role="receipt"]');
  var nameEl = box.querySelector(".taker-name"), typeEl = box.querySelector(".taker-type");
  var name = nameEl ? nameEl.value.trim() : "", type = typeEl ? typeEl.value : "human";
  if (nameEl) { store("yaae-name", name); if (typeEl) store("yaae-type", type); }
  var issueReceipt = function () {
    var receipt = buildAudienceReceipt(payload, paper.paper_key,
      { score: res.score, pct: res.pct, per_category: res.per_category }, name, type);
    receiptBlock(receiptBox, receipt);
  };
  fetch("replays/" + encodeURIComponent(payload.sitting_id) + ".json?t=" + Date.now())
    .then(function (r) { if (!r.ok) throw new Error("no replay"); return r.json(); })
    .then(function (rec) { renderReveal(revealBox, paper, res, rec); issueReceipt(); })
    .catch(function () { renderReveal(revealBox, paper, res, null); issueReceipt(); });
  updateYouSpans(payload.sitting_id);
}

/* -------- live sitting quiz: rendered from the polled live record.
   The paper is public the moment it is given; scoring + reveal stay
   sealed until her SCORED stage for that paper exists. */
var liveQuizState = { sid: null, paperKey: null, submitted: null };
function onLive(rec) {
  var mount = document.getElementById("quiz-live");
  if (!mount || !rec) return;
  var papers = (rec.events || []).filter(function (e) { return e.stage === "PAPER_GIVEN"; });
  if (!papers.length) return;
  var ev = papers[papers.length - 1];
  var pk = (ev.paper_no || 1) + ":" + (ev.kind || "FULL PAPER");
  if (liveQuizState.sid !== rec.sitting_id || liveQuizState.paperKey !== pk) {
    liveQuizState = { sid: rec.sitting_id, paperKey: pk, submitted: null };
    var payload = { sitting_id: rec.sitting_id, exam: rec.exam || "", title: rec.title || "",
                    paper_hash: null, yaae_receipt: null,
                    papers: [{ paper_key: pk, paper_no: ev.paper_no || 1,
                               kind: ev.kind || "FULL PAPER",
                               questions: (ev.questions || []).map(function (q) {
                                 return { id: q.id, category: q.category || null,
                                          question: q.question, options: q.options || [],
                                          type: (q.options && q.options.length) ? "mc" : "open",
                                          answer_hash: null };
                               }) }] };
    mount.innerHTML = "";
    var head = document.createElement("div");
    head.innerHTML = '<h4>👥 Audience — she is sitting this paper right now</h4>' +
      '<p class="sub">Take it before her score posts. Your answers stay on this device; ' +
      'scoring unlocks the moment her answers lock and the scorer posts.</p>';
    mount.appendChild(head);
    var inner = document.createElement("div");
    mount.appendChild(inner);
    renderLiveQuizForm(inner, payload, rec);
  }
  /* has her scorer posted for this paper yet? */
  var scored = lastScoredByPaper(rec);
  if (liveQuizState.submitted && scored[pk]) {
    var slot = mount.querySelector('[data-role="live-result"]');
    if (slot && !slot.getAttribute("data-done")) {
      slot.setAttribute("data-done", "1");
      scoreLiveSubmission(mount, rec, pk);
    }
  }
}
function renderLiveQuizForm(box, payload, rec) {
  var paper = payload.papers[0];
  var qs = paper.questions.map(function (q, qi) {
    var input;
    if (q.type === "mc") {
      input = (q.options || []).map(function (o) {
        return '<label class="qopt qopt-in"><input type="radio" name="lq-' + qi + '" value="' +
               esc(o.letter) + '"> ' + esc(o.letter) + ") " + esc(o.text) + "</label>";
      }).join("");
    } else {
      input = '<div class="qopt"><input type="text" class="open-in" data-lq="' + qi +
              '" placeholder="type your answer" style="width:92%;max-width:420px"></div>';
    }
    return '<div class="qbox"><div class="qq"><b>' + esc(q.id) + ".</b> " + esc(q.question) +
           "</div>" + input + "</div>";
  }).join("");
  box.innerHTML = takerControlsHTML() +
    '<div class="paperbox">' + qs +
    '<button type="button" class="qbtn" data-act="live-submit">Lock in my answers</button>' +
    '<div data-role="live-result"><p class="sub">Not submitted yet.</p></div></div>';
  box.querySelector('[data-act="live-submit"]').addEventListener("click", function () {
    var answers = {};
    paper.questions.forEach(function (q, qi) {
      if (q.type === "mc") {
        var sel = box.querySelector('input[name="lq-' + qi + '"]:checked');
        answers[q.id] = sel ? sel.value : "";
      } else {
        var inp = box.querySelector('[data-lq="' + qi + '"]');
        answers[q.id] = inp ? inp.value : "";
      }
    });
    liveQuizState.submitted = { answers: answers, paper: paper };
    store(attemptKey(payload.sitting_id, paper.paper_key), null);
    try { localStorage.removeItem(attemptKey(payload.sitting_id, paper.paper_key)); } catch (e) {}
    store("yaae-live-pending-" + payload.sitting_id,
          { answers: answers, paper_key: paper.paper_key });
    var slot = box.querySelector('[data-role="live-result"]');
    slot.innerHTML = '<div class="revbox">🔒 Your answers are locked in on this device. ' +
                     'Scoring unlocks the moment her score posts — keep this page open.</div>';
    slot.removeAttribute("data-done");
  });
}
function scoreLiveSubmission(mount, rec, pk) {
  var pending = store("yaae-live-pending-" + rec.sitting_id);
  if (!pending || !liveQuizState.submitted) return;
  var scored = lastScoredByPaper(rec);
  var sev = scored[pk];
  if (!sev) return;
  var keyById = {};
  (sev.items || []).forEach(function (it) { keyById[it.id] = it; });
  var paper = liveQuizState.submitted.paper;
  var items = [], correct = 0;
  paper.questions.forEach(function (q) {
    var raw = pending.answers[q.id] || "";
    var k = keyById[q.id] || {};
    var want = q.type === "mc" ? (k.correct_letter || "") : (k.correct || "");
    var ok = raw !== "" && normAnswer(raw) === normAnswer(want);
    if (ok) correct++;
    items.push({ id: q.id, category: q.category || null, ok: ok, got: raw });
  });
  var total = paper.questions.length;
  var res = { items: items, correct: correct, total: total, score: correct + "/" + total,
              pct: total ? round2(100 * correct / total) : 0,
              per_category: catAgg(items, function (it) { return it.ok; }) };
  var slot = mount.querySelector('[data-role="live-result"]');
  renderReveal(slot, paper, res, rec);
  /* the portable receipt issues once the finished payload (with the
     paper hash) is published — try now, and note it if not yet. */
  fetch("quizzes/" + encodeURIComponent(rec.sitting_id) + ".json?t=" + Date.now())
    .then(function (r) { if (!r.ok) throw new Error("not yet"); return r.json(); })
    .then(function (payload) {
      var holder = document.createElement("div");
      slot.appendChild(holder);
      var nameEl = mount.querySelector(".taker-name"), typeEl = mount.querySelector(".taker-type");
      var receipt = buildAudienceReceipt(payload, pk,
        { score: res.score, pct: res.pct, per_category: res.per_category },
        nameEl ? nameEl.value.trim() : "", typeEl ? typeEl.value : "human");
      receiptBlock(holder, receipt);
      store(attemptKey(rec.sitting_id, pk),
            { answers: pending.answers, pct: res.pct, score: res.score,
              ts: Math.floor(Date.now() / 1000) });
      updateYouSpans(rec.sitting_id);
    })
    .catch(function () {
      var note = document.createElement("p");
      note.className = "sub";
      note.textContent = "🧾 Your receipt issues here as soon as the sitting finishes " +
                         "and its sealed payload is published.";
      slot.appendChild(note);
    });
}

/* ------------------------------------------------ her receipt card */
function mountHerReceipt(el) {
  var url = el.getAttribute("data-her-receipt");
  if (!url) return;
  el.innerHTML = '<div class="scorehead">🧾 Yaae\'s result receipt for this test</div>' +
    '<p class="sub">Her portable credential for this sitting — the JSON is the whole proof; ' +
    'verify it in the box below.</p><div data-role="her-receipt-body">' +
    '<a class="qbtn" href="' + esc(url) + '">⬇ Download her receipt</a></div>';
  fetch(url + "?t=" + Date.now()).then(function (r) { if (!r.ok) throw new Error("x"); return r.json(); })
    .then(function (receipt) {
      var holder = el.querySelector('[data-role="her-receipt-body"]');
      var extra = document.createElement("span");
      holder.appendChild(extra);
      receiptBlock(extra, receipt);
      var pre = extra.querySelector(".receiptjson");
      if (pre) pre.style.display = "none";
      var head = extra.querySelector(".scorehead");
      if (head) head.textContent = "Receipt " + receipt.receipt_id + " · hash " +
        String(receipt.content_hash || "").slice(0, 16) + "…";
    }).catch(function () {});
}

/* ------------------------------------------------ verifier */
function mountVerifier() {
  var btn = document.getElementById("receipt-verify-btn");
  if (!btn) return;
  btn.addEventListener("click", function () {
    var out = document.getElementById("receipt-verify-out");
    var ta = document.getElementById("receipt-verify-json");
    var receipt;
    try { receipt = JSON.parse(ta.value); }
    catch (e) { out.innerHTML = '<div class="voidbox">That is not valid JSON — paste a whole receipt.</div>'; return; }
    var sid = (receipt.exam || {}).sitting_id;
    var finish = function (known) {
      var v = verifyReceipt(receipt, known);
      if (v.ok) {
        out.innerHTML = '<div class="finbox">✅ <b>VERIFIED RESULT</b> — ' + esc(receipt.taker && receipt.taker.name || "") +
          " · " + esc((receipt.exam || {}).title || sid || "") + " · " +
          esc((receipt.result || {}).score || "") + " · " + esc((receipt.result || {}).pct) +
          '%<br><span style="font-size:12.5px">content hash recomputed ✓ · paper matches the published sitting ✓ · ' +
          'receipt ' + esc(receipt.receipt_id || "") + "</span></div>";
      } else {
        out.innerHTML = '<div class="voidbox">✗ <b>NOT VERIFIED</b><br>' +
          v.fails.map(function (f) { return "· " + esc(f); }).join("<br>") + "</div>";
      }
    };
    if (!sid) { finish(undefined); return; }
    fetch("quizzes/" + encodeURIComponent(sid) + ".json?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error("unknown"); return r.json(); })
      .then(function (p) { finish(p.paper_hash); })
      .catch(function () { finish(null); });
  });
}

/* ------------------------------------------------ boot */
function boot() {
  var boxes = document.querySelectorAll(".quizbox[data-quiz]");
  for (var i = 0; i < boxes.length; i++) mountQuiz(boxes[i]);
  var hers = document.querySelectorAll(".her-receipt[data-her-receipt]");
  for (var h = 0; h < hers.length; h++) mountHerReceipt(hers[h]);
  mountVerifier();
  var spans = document.querySelectorAll("[data-you-for]");
  var seen = {};
  for (var j = 0; j < spans.length; j++) {
    var sid = spans[j].getAttribute("data-you-for");
    if (!seen[sid]) { seen[sid] = 1; updateYouSpans(sid); }
  }
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}

var ExamRoom = { sha256Hex: sha256Hex, canonStr: canonStr, contentHash: contentHash,
                 normAnswer: normAnswer, answerHash: answerHash, round2: round2,
                 buildAudienceReceipt: buildAudienceReceipt, verifyReceipt: verifyReceipt,
                 scoreAnswers: scoreAnswers, fmtET: fmtET, onLive: onLive };
global.ExamRoom = ExamRoom;
if (typeof module !== "undefined" && module.exports) module.exports = ExamRoom;
})(typeof window !== "undefined" ? window : globalThis);
