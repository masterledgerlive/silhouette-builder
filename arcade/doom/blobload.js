/* Blob-first boot for the DOOM cabinet.
   Tries the Walrus testnet blob copy sealed under the blob-arcade family
   key (a test key, embedded in-page by design — the same pattern as the
   builder proof pages): fetch blobs.json -> fetch each blob from the
   aggregator -> tweetnacl secretbox open -> sha256 verify against the
   manifest -> hand the verified bytes to the engine.
   ANY failure falls back to the repo mirror of the same verified bytes,
   and the pill always says which source actually booted. */
(function () {
  'use strict';
  var AGG = 'https://aggregator.walrus-testnet.walrus.space';
  function b64dec(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  var KEY = b64dec('wOEovuzCQypZyqZFMzItiLaH+dIaidA/pskHQtlwK7c=');

  async function sha256hex(buf) {
    if (!(window.crypto && crypto.subtle)) return null; // secretbox MAC still gates integrity
    var d = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(d)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function fetchBlob(meta) {
    var r = await fetch(AGG + '/v1/blobs/' + meta.blob);
    if (!r.ok) throw new Error('blob HTTP ' + r.status);
    var cipher = new Uint8Array(await r.arrayBuffer());
    var nonce = cipher.slice(0, 24), ct = cipher.slice(24);
    var plain = nacl.secretbox.open(ct, nonce, KEY);
    if (!plain) throw new Error('decrypt failed (sealed bytes did not open)');
    var h = await sha256hex(plain);
    if (h && h !== meta.sha256) throw new Error('sha256 mismatch vs manifest');
    return plain;
  }

  window.KKGameBytes = null; // reboots (REC / replay) reuse whatever boot used
  window.KKBoot = {
    start: async function () {
      var pill = document.getElementById('srcPill');
      function setPill(txt, cls) {
        if (pill) { pill.textContent = txt; pill.className = 'srcpill ' + (cls || ''); }
      }
      try {
        setPill('source: BLOB — fetching sealed bytes from Walrus testnet…', 'trying');
        var mr = await fetch('blobs.json', { cache: 'no-store' });
        if (!mr.ok) throw new Error('blob manifest missing');
        var meta = await mr.json();
        var wasm = await fetchBlob(meta.wasm);
        setPill('source: BLOB — doom.wasm ✓ verified, fetching doom1.wad…', 'trying');
        var wad = await fetchBlob(meta.wad);
        window.KKGameBytes = { wasm: wasm, wad: wad };
        setPill('source: BLOB ✓ verified — booted from Walrus testnet blobs (family-key arcade copy)', 'blob');
        window.startDoom(window.KKGameBytes);
      } catch (e) {
        window.KKGameBytes = null;
        setPill('source: repo fallback — blob path unavailable (' + e.message + '); booting the repo mirror of the same verified bytes', 'repo');
        window.startDoom(null);
      }
    }
  };
})();
