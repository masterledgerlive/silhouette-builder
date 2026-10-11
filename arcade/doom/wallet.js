/* Arcade wallet: connect → verify (sign-in) → pay → fins → play.
   TEST MODE: treasury is David's own wallet — he pays himself to test.
   Fins: 1 fin = $0.05. Bonus tiers reward deposits the arcade wants to hold. */
(function () {
  'use strict';
  var TREASURY = '0x50e1C4608c48b0c52E1EA5FBabc1c9126eA17915'; // TEST: David pays himself
  var BASE_HEX = '0x2105'; // 8453
  var FIN_PER_USD = 20;

  // Prices are TEST rates (oracle comes later). $HOME contract unverified — disabled until confirmed.
  var TOKENS = {
    ETH:  { label: 'ETH',  kind: 'native', decimals: 18, usd: 4000, tier: 'CORE', mult: 1.0 },
    USDC: { label: 'USDC', kind: 'erc20', contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, usd: 1, tier: 'CORE', mult: 1.0 },
    HOME: { label: '$HOME', kind: 'erc20', contract: null, decimals: 18, usd: null, tier: 'MOON', mult: 1.5, disabled: 'contract verifying' }
  };
  // MOON tier = tokens the arcade wants to accumulate (David's moonshot list lives here).
  var MOON_LIST_NOTE = 'MOON tier earns 1.5× fins — the arcade is accumulating these.';

  var $ = function (id) { return document.getElementById(id); };
  var account = null, verified = false;
  window.ArcadeWallet = { paidSession: false };

  function fins() { return parseInt(localStorage.getItem('arcade_fins') || '0', 10); }
  function setFins(n) { localStorage.setItem('arcade_fins', String(n)); renderFins(); }
  function renderFins() {
    $('finsBal').textContent = fins();
    var can = verified && account && fins() >= 1;
    $('playBtn').disabled = !can;
    $('playHint').textContent = !account ? 'connect your wallet first' :
      !verified ? 'sign the verify message first' :
      fins() < 1 ? 'pay any amount to earn fins' : 'ready — insert fin to play';
  }
  function note(t, ok) {
    var el = $('wNote'); el.textContent = t; el.style.color = ok === false ? '#f66' : '#c9c9e8';
  }

  // Wallet discovery: EIP-6963 announced wallets first (Phantom preferred), then legacy injections.
  var announced = [];
  window.addEventListener('eip6963:announceProvider', function (ev) {
    if (ev && ev.detail && ev.detail.provider) announced.push(ev.detail);
  });
  try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch (e) {}
  var chosen = null;
  function eth() {
    if (chosen) return chosen;
    var ph = announced.filter(function (d) { return /phantom/i.test((d.info && (d.info.rdns + d.info.name)) || ''); })[0];
    if (ph) return (chosen = ph.provider);
    if (window.phantom && window.phantom.ethereum) return (chosen = window.phantom.ethereum);
    if (announced[0]) return (chosen = announced[0].provider);
    if (window.ethereum) return (chosen = window.ethereum);
    return null;
  }
  function walletName() {
    var p = eth(); if (!p) return 'none';
    var d = announced.filter(function (x) { return x.provider === p; })[0];
    if (d && d.info) return d.info.name;
    if (p.isPhantom) return 'Phantom'; if (p.isRabby) return 'Rabby';
    if (p.isCoinbaseWallet) return 'Coinbase Wallet'; if (p.isMetaMask) return 'MetaMask';
    return 'browser wallet';
  }
  // No injected wallet (typical on phones): offer to reopen this page inside a wallet's browser.
  function showDeepLinks() {
    var box = $('wDeep'); if (!box) return;
    var url = location.href, bare = url.replace(/^https?:\/\//, '');
    var links = [
      ['OPEN IN PHANTOM', 'https://phantom.app/ul/browse/' + encodeURIComponent(url) + '?ref=' + encodeURIComponent(location.origin)],
      ['OPEN IN METAMASK', 'https://metamask.app.link/dapp/' + bare],
      ['OPEN IN COINBASE WALLET', 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(url)]
    ];
    box.innerHTML = '';
    links.forEach(function (l) {
      var a = document.createElement('a'); a.className = 'wbtn'; a.textContent = l[0]; a.href = l[1];
      a.style.textDecoration = 'none'; box.appendChild(a);
    });
    box.style.display = 'flex';
  }

  async function connect() {
    var e = eth();
    if (!e) {
      note('No wallet in this browser. Install Phantom / MetaMask / Rabby, or open this page in a wallet app:', false);
      showDeepLinks(); return;
    }
    try {
      var accs = await e.request({ method: 'eth_requestAccounts' });
      account = accs[0];
      $('wAddr').textContent = account.slice(0, 10) + '…' + account.slice(-6);
      var cid = await e.request({ method: 'eth_chainId' });
      if (cid !== BASE_HEX) {
        try {
          await e.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BASE_HEX }] });
        } catch (sw) {
          if (sw && sw.code === 4001) throw new Error('switch to Base was rejected');
          await e.request({ method: 'wallet_addEthereumChain', params: [{
            chainId: BASE_HEX, chainName: 'Base',
            rpcUrls: ['https://mainnet.base.org'], blockExplorerUrls: ['https://basescan.org'],
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 } }] });
        }
      }
      note('Connected with ' + walletName() + ' on Base. Now verify with a signature.');
      if (e.on && !e._arcadeHooked) {
        e._arcadeHooked = true;
        e.on('accountsChanged', function (a) {
          account = a && a[0] || null; verified = false;
          $('wAddr').textContent = account ? account.slice(0, 10) + '…' + account.slice(-6) : 'not connected';
          $('wVerified').textContent = ''; renderFins();
        });
      }
      renderFins();
    } catch (err) { note('Connect failed: ' + (err.message || err), false); }
  }

  async function verify() {
    if (!account) { note('Connect first.', false); return; }
    try {
      var msg = 'Arcades of Time — verify wallet ownership · ' + new Date().toISOString().slice(0, 10);
      var hex = '0x' + Array.from(new TextEncoder().encode(msg))
        .map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      await eth().request({ method: 'personal_sign', params: [hex, account] });
      verified = true;
      $('wVerified').textContent = '✓ verified';
      $('wVerified').style.color = '#22d3ee';
      note('Wallet verified. Pay to earn fins.');
      renderFins();
    } catch (err) { note('Verify failed: ' + (err.message || err), false); }
  }

  function pad32(hexNoX) { return hexNoX.padStart(64, '0'); }
  function toHex(n) { return '0x' + n.toString(16); }

  async function pay() {
    if (!account || !verified) { note('Connect + verify first.', false); return; }
    var key = $('payToken').value, t = TOKENS[key];
    if (!t || t.disabled) return;
    var amt = parseFloat($('payAmt').value);
    if (!(amt > 0)) { note('Enter an amount.', false); return; }
    var units = BigInt(Math.round(amt * Math.pow(10, t.decimals)));
    var tx;
    if (t.kind === 'native') {
      tx = { from: account, to: TREASURY, value: toHex(units) };
    } else {
      var data = '0xa9059cbb' + pad32(TREASURY.slice(2).toLowerCase()) + pad32(units.toString(16));
      tx = { from: account, to: t.contract, data: data, value: '0x0' };
    }
    try {
      note('Confirm in your wallet…');
      var hash = await eth().request({ method: 'eth_sendTransaction', params: [tx] });
      note('Sent ' + hash.slice(0, 12) + '… — waiting for confirmation…');
      var receipt = null, tries = 0;
      while (!receipt && tries < 60) {
        await new Promise(function (r) { setTimeout(r, 2000); });
        receipt = await eth().request({ method: 'eth_getTransactionReceipt', params: [hash] });
        tries++;
      }
      if (!receipt || receipt.status !== '0x1') throw new Error('not confirmed');
      var usd = amt * t.usd;
      var earned = Math.max(1, Math.floor(usd * FIN_PER_USD * t.mult));
      setFins(fins() + earned);
      note('Confirmed on Base — +' + earned + ' fins (' + t.tier + ' tier' +
        (t.mult > 1 ? ' ×' + t.mult : '') + ').', true);
    } catch (err) { note('Payment failed: ' + (err.message || err), false); }
  }

  function play() {
    if (fins() < 1 || !verified || !account) return;
    setFins(fins() - 1);
    window.ArcadeWallet.paidSession = true;
    $('walletPanel').style.display = 'none';
    $('cabinet').style.display = 'block';
    window.startDoom();
  }

  function buildTokenOptions() {
    var sel = $('payToken');
    Object.keys(TOKENS).forEach(function (k) {
      var t = TOKENS[k], o = document.createElement('option');
      o.value = k;
      o.textContent = t.label + ' · ' + t.tier + (t.mult > 1 ? ' 1.5× fins' : '') + (t.disabled ? ' (' + t.disabled + ')' : '');
      if (t.disabled) o.disabled = true;
      sel.appendChild(o);
    });
  }

  $('connectBtn').addEventListener('click', connect);
  $('verifyBtn').addEventListener('click', verify);
  $('payBtn').addEventListener('click', pay);
  $('playBtn').addEventListener('click', play);
  buildTokenOptions();
  $('moonNote').textContent = MOON_LIST_NOTE;
  renderFins();
})();
