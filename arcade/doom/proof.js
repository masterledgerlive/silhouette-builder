/* Arcade proof engine (read-only).
   Shows players HOW the cabinet proves itself on-chain:
   1) the game bytes in this page hash to the values in the sealed manifest,
   2) the seal transaction on Base Sepolia carries that blob id + Merkle root,
   3) every sealed run gets a saved "location" card with its own tx and fields.
   Everything here is FREE READ: public RPC + explorer, no wallet, no gas, no keys. */
(function () {
  'use strict';
  var SEAL = {
    blob: 'df8a82beb4ad1fe6e412fbd2a5f5c4b0785bb49b785782023aa43a1906062a18',
    root: 'ba89d5f302e3f8b53e2514cd142b3777754afe637d94fbec87291e27f61b46cf',
    tx: '0x646610e26c7557ad53ab6a1560ba27a79a0c17cd0be694979aaaccab8808ec78',
    chain: 'sepolia'
  };
  var FILES = [
    { name: 'doom.wasm', sha: '8edfe49a7583fd975199969302d8e9adcf8e714d0af72bf3e672f991fd810faa', what: 'the engine (Doom compiled to WebAssembly)' },
    { name: 'doom1.wad', sha: '1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771', what: 'the levels, art and sound (shareware WAD)' }
  ];
  var CHAINS = {
    sepolia: { label: 'Base Sepolia (testnet)', rpc: 'https://sepolia.base.org', scan: 'https://sepolia.basescan.org/tx/' },
    mainnet: { label: 'Base mainnet', rpc: 'https://mainnet.base.org', scan: 'https://basescan.org/tx/' }
  };
  var STORE = 'arcade_doom_runs_v1';
  var $ = function (id) { return document.getElementById(id); };
  var dec = new TextDecoder();

  function hex(buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  async function sha256(buf) { return hex(await crypto.subtle.digest('SHA-256', buf)); }
  async function rpc(chain, method, params) {
    var r = await fetch(CHAINS[chain].rpc, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: method, params: params })
    });
    var j = await r.json();
    if (j.error) throw new Error(j.error.message || 'rpc error');
    return j.result;
  }
  function inputText(input) {
    var h = (input || '0x').slice(2), out = new Uint8Array(h.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
    return dec.decode(out);
  }
  function line(box, ok, label, detail) {
    var d = document.createElement('div');
    d.className = 'vline ' + (ok === true ? 'ok' : ok === false ? 'bad' : 'wait');
    var mark = document.createElement('b');
    mark.textContent = ok === true ? '✓ ' : ok === false ? '✗ ' : '… ';
    d.appendChild(mark);
    d.appendChild(document.createTextNode(label));
    if (detail) { var s = document.createElement('div'); s.className = 'vdetail'; s.textContent = detail; d.appendChild(s); }
    box.appendChild(d);
    return d;
  }

  /* ---- 1+2: verify the cabinet itself ---- */
  async function verifyCabinet() {
    var box = $('verifyOut'), btn = $('verifyBtnProof');
    box.innerHTML = ''; btn.disabled = true;
    try {
      for (var i = 0; i < FILES.length; i++) {
        var f = FILES[i];
        var r = await fetch(f.name, { cache: 'no-store' });
        var buf = await r.arrayBuffer();
        var got = await sha256(buf);
        line(box, got === f.sha, f.name + ' — ' + f.what + ' (' + buf.byteLength.toLocaleString() + ' bytes)',
          'hashed in your browser: ' + got + (got === f.sha ? '  = matches the sealed manifest' : '  ≠ expected ' + f.sha));
      }
      var tx = await rpc(SEAL.chain, 'eth_getTransactionByHash', [SEAL.tx]);
      var rc = await rpc(SEAL.chain, 'eth_getTransactionReceipt', [SEAL.tx]);
      if (!tx || !rc) { line(box, false, 'seal tx not found on ' + CHAINS[SEAL.chain].label); return; }
      var text = inputText(tx.input);
      var block = parseInt(rc.blockNumber, 16);
      line(box, rc.status === '0x1', 'seal tx confirmed on ' + CHAINS[SEAL.chain].label + ' in block ' + block,
        'read live from ' + CHAINS[SEAL.chain].rpc + ' — status ' + rc.status);
      line(box, text.indexOf(SEAL.blob) !== -1, 'the tx data names the sealed blob', 'on-chain text: ' + text);
      line(box, text.indexOf(SEAL.root) !== -1, 'the tx data names the manifest Merkle root', SEAL.root);
    } catch (err) {
      line(box, false, 'check stopped: ' + (err.message || err));
    } finally { btn.disabled = false; }
  }

  /* ---- 3: saved run locations ---- */
  function loadRuns() { try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch (e) { return []; } }
  function saveRuns(r) { localStorage.setItem(STORE, JSON.stringify(r)); }

  function field(dl, k, v) {
    var dt = document.createElement('dt'); dt.textContent = k;
    var dd = document.createElement('dd'); dd.textContent = (v === undefined || v === null || v === '') ? 'not returned' : String(v);
    dl.appendChild(dt); dl.appendChild(dd);
  }

  async function checkRun(run, out) {
    out.innerHTML = '';
    try {
      var tx = await rpc(run.chain, 'eth_getTransactionByHash', [run.tx]);
      if (!tx) { line(out, false, 'tx not found yet on ' + CHAINS[run.chain].label + ' (may still be pending)'); return; }
      var rc = await rpc(run.chain, 'eth_getTransactionReceipt', [run.tx]);
      var text = inputText(tx.input);
      line(out, rc && rc.status === '0x1', 'confirmed' + (rc ? ' in block ' + parseInt(rc.blockNumber, 16) : ''));
      line(out, text.indexOf(run.payload) !== -1, 'on-chain data matches this run’s payload', text);
    } catch (err) { line(out, false, 'check failed: ' + (err.message || err)); }
  }

  function render() {
    var box = $('locations'); if (!box) return;
    box.innerHTML = '';
    var runs = loadRuns();
    $('runCount').textContent = runs.length ? runs.length + ' sealed run' + (runs.length > 1 ? 's' : '') + ' saved in this browser' : 'no sealed runs yet';
    runs.slice().reverse().forEach(function (run) {
      var card = document.createElement('div'); card.className = 'runcard';
      var a = document.createElement('a');
      a.href = CHAINS[run.chain].scan + run.tx; a.target = '_blank'; a.rel = 'noopener'; a.className = 'locbtn';
      a.textContent = 'RUN ' + run.tag + ' → ' + run.tx.slice(0, 10) + '…' + run.tx.slice(-6);
      card.appendChild(a);
      var dl = document.createElement('dl');
      field(dl, 'chain', CHAINS[run.chain].label);
      field(dl, 'seal tx', run.tx);
      field(dl, 'inject id', run.injectId);
      field(dl, 'hitch id', run.hitchId);
      field(dl, 'run hash (sha-256 of your inputs)', run.runHash);
      field(dl, 'on-chain payload', run.payload);
      field(dl, 'tics / frames / key events', run.tics + ' / ' + run.frames + ' / ' + run.inputs);
      field(dl, 'sealed at', run.sealedAt);
      card.appendChild(dl);
      var b = document.createElement('button'); b.className = 'wbtn'; b.textContent = 'CHECK ON-CHAIN';
      var out = document.createElement('div'); out.className = 'vbox';
      b.addEventListener('click', function () { checkRun(run, out); });
      card.appendChild(b); card.appendChild(out);
      box.appendChild(card);
    });
  }

  function addRun(rec) { var r = loadRuns(); r.push(rec); saveRuns(r); render(); }
  function chainFrom(resp) {
    var c = resp && (resp.chainId || resp.chain || resp.network);
    return (c === 8453 || c === '8453' || c === '0x2105' || /mainnet/i.test(String(c || ''))) ? 'mainnet' : 'sepolia';
  }

  window.ArcadeProof = { addRun: addRun, render: render, chainFrom: chainFrom };

  $('verifyBtnProof').addEventListener('click', verifyCabinet);
  $('clearRuns').addEventListener('click', function (e) {
    e.preventDefault();
    if (confirm('Forget the saved run cards in this browser? (On-chain txs are not affected.)')) { saveRuns([]); render(); }
  });
  render();
})();
