/* PROOF 3 — shooter: move + shoot targets. Proves projectiles + spawn + destroy. */
var BlobGame_shooter = {
  name: 'Shooter',
  mechanic: 'shooter',
  params: {
    shipSpeed: 380, bulletSpeed: 520, enemySpeed: 90, spawnEvery: 0.9,
    fireCool: 0.22, shipColor: '#22d3ee', bulletColor: '#ffd76b', enemyColor: '#f0f'
  },
  code: {
    init: function (P, api) {
      return {
        sx: api.W / 2, bullets: [], enemies: [],
        score: 0, lives: 3, over: false,
        spawnT: 0.5, cool: 0, invuln: 0, t: 0
      };
    },
    tick: function (S, P, input, dt, api) {
      if (S.over) return;
      S.t += dt;
      if (S.invuln > 0) S.invuln -= dt;
      // ship: keys or finger-follow
      if (input.touchActive) {
        S.sx = api.clamp(input.tx, 24, api.W - 24);
      } else {
        if (input.left) S.sx -= P.shipSpeed * dt;
        if (input.right) S.sx += P.shipSpeed * dt;
        S.sx = api.clamp(S.sx, 24, api.W - 24);
      }
      // fire
      if (S.cool > 0) S.cool -= dt;
      if (input.fire && S.cool <= 0) {
        S.bullets.push({ x: S.sx - 3, y: api.H - 70, w: 6, h: 14 });
        S.cool = P.fireCool;
      }
      // bullets
      for (var i = S.bullets.length - 1; i >= 0; i--) {
        S.bullets[i].y -= P.bulletSpeed * dt;
        if (S.bullets[i].y < -20) S.bullets.splice(i, 1);
      }
      // spawn enemies
      S.spawnT -= dt;
      if (S.spawnT <= 0) {
        S.spawnT = P.spawnEvery * api.rand(0.7, 1.3);
        var ew = api.rand(26, 44);
        S.enemies.push({
          x: api.rand(10, api.W - 10 - ew), y: -30, w: ew, h: 22,
          vx: api.rand(-40, 40), ph: api.rand(0, 6.28)
        });
      }
      // enemies drift down with sine wobble
      var ship = api.rect(S.sx - 18, api.H - 66, 36, 28);
      for (var j = S.enemies.length - 1; j >= 0; j--) {
        var e = S.enemies[j];
        e.y += P.enemySpeed * dt;
        e.x += (e.vx + Math.sin(S.t * 2 + e.ph) * 40) * dt;
        e.x = api.clamp(e.x, 0, api.W - e.w);
        // bullet hits
        var dead = false;
        for (var k = S.bullets.length - 1; k >= 0; k--) {
          if (api.overlap(S.bullets[k], e)) {
            S.bullets.splice(k, 1); dead = true; S.score += 10; break;
          }
        }
        if (dead) { S.enemies.splice(j, 1); continue; }
        // reached bottom or hit ship
        if (e.y > api.H) { S.enemies.splice(j, 1); continue; }
        if (S.invuln <= 0 && api.overlap(e, ship)) {
          S.enemies.splice(j, 1);
          S.lives--; S.invuln = 1.5;
          if (S.lives <= 0) { S.over = true; return; }
        }
      }
    },
    draw: function (S, P, ctx, api) {
      ctx.fillStyle = '#e8e8f5'; ctx.font = '16px monospace'; ctx.textAlign = 'left';
      ctx.fillText('SCORE ' + S.score, 12, 24);
      ctx.textAlign = 'right';
      ctx.fillText(S.lives > 0 ? '♥'.repeat(S.lives) : 'LIVES 0', api.W - 12, 24);
      // ship (blink while invulnerable)
      if (S.invuln <= 0 || Math.floor(S.t * 12) % 2 === 0) {
        ctx.fillStyle = P.shipColor;
        ctx.beginPath();
        ctx.moveTo(S.sx, api.H - 66); ctx.lineTo(S.sx - 18, api.H - 38); ctx.lineTo(S.sx + 18, api.H - 38);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = P.bulletColor;
      for (var i = 0; i < S.bullets.length; i++) {
        var b = S.bullets[i];
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
      ctx.fillStyle = P.enemyColor;
      for (var j = 0; j < S.enemies.length; j++) {
        var e = S.enemies[j];
        ctx.fillRect(e.x, e.y, e.w, e.h);
        ctx.fillRect(e.x + 4, e.y + 4, e.w - 8, e.h - 8);
      }
      if (S.over) {
        ctx.fillStyle = 'rgba(10,10,24,0.8)'; ctx.fillRect(0, 0, api.W, api.H);
        ctx.fillStyle = '#f0f'; ctx.textAlign = 'center'; ctx.font = 'bold 34px monospace';
        ctx.fillText('GAME OVER', api.W / 2, api.H / 2 - 10);
        ctx.fillStyle = '#e8e8f5'; ctx.font = '16px monospace';
        ctx.fillText('score ' + S.score, api.W / 2, api.H / 2 + 22);
      }
    }
  }
};
if (typeof module !== 'undefined') module.exports = BlobGame_shooter;
