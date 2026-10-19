/* Starter object library for the Blob Arcade Builder v2.
   Each object: real functions here; the page serializes via fn.toString().
   Objects compose: paddle+ball+score+bg = a playable bounce game. */
var BlobObjects_starter = [
  {
    name: 'Starfield', kind: 'background',
    params: { count: 60 },
    emits: [], listens: [],
    init: function (P, api, world) {
      var stars = [];
      for (var i = 0; i < P.count; i++)
        stars.push({ x: api.rand(0, api.W), y: api.rand(0, api.H), s: api.rand(1, 2.5), ph: api.rand(0, 6.28) });
      return { stars: stars };
    },
    tick: function (S, P, input, dt, api, world, emit) { /* the stars just twinkle */ },
    draw: function (S, P, ctx, api) {
      for (var i = 0; i < S.stars.length; i++) {
        var st = S.stars[i];
        ctx.fillStyle = 'rgba(180,180,255,0.55)';
        ctx.fillRect(st.x, st.y, st.s, st.s);
      }
    }
  },
  {
    name: 'Paddle', kind: 'sprite',
    params: { w: 96, h: 14, speed: 460, color: '#22d3ee' },
    emits: [], listens: [],
    init: function (P, api, world) { return { x: api.W / 2 - P.w / 2 }; },
    tick: function (S, P, input, dt, api, world, emit) {
      if (input.touchActive) {
        S.x = api.clamp(input.tx - P.w / 2, 0, api.W - P.w);
      } else {
        if (input.left) S.x -= P.speed * dt;
        if (input.right) S.x += P.speed * dt;
        S.x = api.clamp(S.x, 0, api.W - P.w);
      }
      // publish for other objects (ball reads world.paddle)
      world.paddle = { x: S.x, w: P.w, y: api.H - 30, h: P.h };
    },
    draw: function (S, P, ctx, api) {
      ctx.fillStyle = P.color;
      ctx.fillRect(S.x, api.H - 30, P.w, P.h);
    }
  },
  {
    name: 'Ball', kind: 'sprite',
    params: { r: 9, speed: 300, color: '#f0f' },
    emits: ['bounce', 'miss'],
    listens: [],
    init: function (P, api, world) {
      return { x: api.W / 2, y: api.H / 2, vx: P.speed * 0.7, vy: -P.speed };
    },
    tick: function (S, P, input, dt, api, world, emit) {
      S.x += S.vx * dt; S.y += S.vy * dt;
      world.ballPos = { x: S.x, y: S.y }; // publish for trigger zones
      if (S.x < P.r) { S.x = P.r; S.vx = Math.abs(S.vx); }
      if (S.x > api.W - P.r) { S.x = api.W - P.r; S.vx = -Math.abs(S.vx); }
      if (S.y < P.r) { S.y = P.r; S.vy = Math.abs(S.vy); }
      var pd = world.paddle;
      if (pd && S.vy > 0 && S.y + P.r >= pd.y && S.y - P.r < pd.y + pd.h &&
          S.x > pd.x - P.r && S.x < pd.x + pd.w + P.r) {
        var hit = api.clamp((S.x - (pd.x + pd.w / 2)) / (pd.w / 2), -1, 1);
        var sp = Math.min(Math.sqrt(S.vx * S.vx + S.vy * S.vy) * 1.045, 900);
        S.vx = hit * sp * 0.85;
        S.vy = -Math.sqrt(Math.max(sp * sp - S.vx * S.vx, 40000));
        S.y = pd.y - P.r;
        emit('bounce', { x: Math.round(S.x) });
      }
      if (S.y > api.H + 24) {
        emit('miss', {});
        S.x = api.W / 2; S.y = api.H / 2;
        S.vx = P.speed * 0.7 * (Math.random() < 0.5 ? -1 : 1);
        S.vy = -P.speed;
      }
    },
    draw: function (S, P, ctx, api) {
      ctx.fillStyle = P.color;
      ctx.beginPath(); ctx.arc(S.x, S.y, P.r, 0, 6.2832); ctx.fill();
    }
  },
  {
    name: 'Score Keeper', kind: 'score',
    params: { lives: 3 },
    emits: ['gameover'],
    listens: ['bounce', 'miss'],
    init: function (P, api, world) { return { score: 0, lives: P.lives, over: false }; },
    tick: function (S, P, input, dt, api, world, emit) {
      if (S.over) return;
      for (var i = 0; i < world.cues.length; i++) {
        var c = world.cues[i];
        if (c.cue === 'bounce') S.score++;
        if (c.cue === 'miss') {
          S.lives--;
          if (S.lives <= 0) { S.over = true; emit('gameover', { score: S.score }); }
        }
      }
    },
    draw: function (S, P, ctx, api) {
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
  },
  {
    name: 'Trigger Zone', kind: 'trigger',
    params: { x: 150, y: 200, w: 100, h: 60, color: '#ffd76b', cue: 'zone' },
    emits: ['zone'],
    listens: [],
    init: function (P, api, world) { return { inside: false }; },
    tick: function (S, P, input, dt, api, world, emit) {
      // fires when the ball enters the zone
      var b = world.ballPos;
      var now = b && b.x > P.x && b.x < P.x + P.w && b.y > P.y && b.y < P.y + P.h;
      if (now && !S.inside) emit(P.cue, { x: Math.round(b.x), y: Math.round(b.y) });
      S.inside = now;
    },
    draw: function (S, P, ctx, api) {
      ctx.strokeStyle = P.color; ctx.setLineDash([6, 4]);
      ctx.strokeRect(P.x, P.y, P.w, P.h);
      ctx.setLineDash([]);
      ctx.fillStyle = P.color; ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(P.cue.toUpperCase() + ' ZONE', P.x + P.w / 2, P.y - 6);
    }
  }
];
if (typeof module !== 'undefined') module.exports = BlobObjects_starter;
