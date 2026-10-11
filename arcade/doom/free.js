/* FREE PLAY (test mode) — erasable.
   Turn on:  open the page with ?free=1  (remembered in this browser)
   Turn off: ?free=0, or press "END FREE PLAY" — clears the flag.
   Erase the whole feature: delete this file + its <script> tag + the #freeBar block in index.html.
   While on: no wallet, no fins, NO on-chain writes. SEAL THIS RUN is disabled and never calls
   /api/inject, so bots in free play cannot spend gas or flood the real seal list.
   VERIFY NOW (free read) still works. */
(function () {
  'use strict';
  var KEY = 'arcade_free_play';
  var q = new URLSearchParams(location.search).get('free');
  if (q === '1') localStorage.setItem(KEY, '1');
  if (q === '0') localStorage.removeItem(KEY);
  var on = localStorage.getItem(KEY) === '1';
  window.ArcadeFree = {
    on: on,
    end: function () {
      localStorage.removeItem(KEY);
      var u = new URL(location.href); u.searchParams.delete('free'); location.replace(u.toString());
    },
    start: function () {
      localStorage.setItem(KEY, '1');
      var u = new URL(location.href); u.searchParams.set('free', '1'); location.replace(u.toString());
    }
  };
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.getElementById('freeBar');
    if (bar) bar.style.display = on ? 'block' : 'none';
    var tryBtn = document.getElementById('freeTryBtn');
    if (tryBtn) {
      tryBtn.style.display = on ? 'none' : 'inline-block';
      tryBtn.addEventListener('click', function () { window.ArcadeFree.start(); });
    }
    var endBtn = document.getElementById('freeEndBtn');
    if (endBtn) endBtn.addEventListener('click', function () { window.ArcadeFree.end(); });
    var playFree = document.getElementById('freePlayBtn');
    if (playFree) playFree.addEventListener('click', function () {
      document.getElementById('walletPanel').style.display = 'none';
      document.getElementById('cabinet').style.display = 'block';
      window.startDoom();
    });
    if (on) {
      var s = document.getElementById('sealBtn');
      if (s) { s.disabled = true; s.textContent = 'SEAL OFF — FREE PLAY'; s.title = 'Free play never writes on-chain'; }
      var o = document.getElementById('sealOut');
      if (o) o.textContent = 'Free play runs are practice only: nothing is sent to the inject relay and no gas is spent. Connect + pay a fin (end free play) to seal real runs.';
    }
  });
})();
