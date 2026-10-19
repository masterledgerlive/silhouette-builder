/* PROOF 1 — bounce: paddle + ball physics. Proves movement + collision + scoring. */
var BlobGame_bounce = {
  name: 'Bounce',
  mechanic: 'bounce',
  params: {
    paddleSpeed: 460, ballSpeed: 300, paddleW: 96, paddleH: 14, ballR: 9,
    paddleColor: '#22d3ee', ballColor: '#f0f'
  },
  code: {
    init: function (P, api) {
      return {
        px: api.W / 2 - P.paddleW / 2,
        bx: api.W / 2, by: api.H / 2,
        vx: P.ballSpeed * 0.7, vy: -P.ballSpeed,
        score: 0, lives: 3, over: false
      };
    },
    tick: function (S, P, input, dt, api) {
      if (S.over) return;
      // paddle: keys or finger-follow
      if (input.touchActive) {
        S.px = api.clamp(input.tx - P.paddleW / 2, 0, api.W - P.paddleW);
      } else {
        if (input.left) S.px -= P.paddleSpeed * dt;
        if (input.right) S.px += P.paddleSpeed * dt;
        S.px = api.clamp(S.px, 0, api.W - P.paddleW);
      }
      // ball
      S.bx += S.vx * dt; S.by += S.vy * dt;
      if (S.bx < P.ballR) { S.bx = P.ballR; S.vx = Math.abs(S.vx); }
      if (S.bx > api.W - P.ballR) { S.bx = api.W - P.ballR; S.vx = -Math.abs(S.vx); }
      if (S.by < P.ballR) { S.by = P.ballR; S.vy = Math.abs(S.vy); }
      // paddle bounce with angle from hit position
      var py = api.H - 30;
      if (S.vy > 0 && S.by + P.ballR >= py && S.by - P.ballR < py + P.paddleH &&
          S.bx > S.px - P.ballR && S.bx < S.px + P.paddleW + P.ballR) {
        var hit = api.clamp((S.bx - (S.px + P.paddleW / 2)) / (P.paddleW / 2), -1, 1);
        var sp = Math.min(Math.sqrt(S.vx * S.vx + S.vy * S.vy) * 1.045, 900);
        S.vx = hit * sp * 0.85;
        S.vy = -Math.sqrt(Math.max(sp * sp - S.vx * S.vx, 40000));
        S.by = py - P.ballR;
        S.score++;
      }
      // missed
      if (S.by > api.H + 24) {
        S.lives--;
        if (S.lives <= 0) { S.over = true; return; }
        S.bx = api.W / 2; S.by = api.H / 2;
        S.vx = P.ballSpeed * 0.7 * (Math.random() < 0.5 ? -1 : 1);
        S.vy = -P.ballSpeed;
      }
    },
    draw: function (S, P, ctx, api) {
      var py = api.H - 30;
      ctx.fillStyle = P.paddleColor;
      ctx.fillRect(S.px, py, P.paddleW, P.paddleH);
      ctx.fillStyle = P.ballColor;
      ctx.beginPath(); ctx.arc(S.bx, S.by, P.ballR, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#e8e8f5'; ctx.font = '16px monospace'; ctx.textAlign = 'left';
      ctx.fillText('SCORE ' + S.score, 12, 24);
      ctx.textAlign = 'right';
      ctx.fillText(S.lives > 0 ? '♥'.repeat(S.lives) : 'LIVES 0', api.W - 12, 24);
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
if (typeof module !== 'undefined') module.exports = BlobGame_bounce;
