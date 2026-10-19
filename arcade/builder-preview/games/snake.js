/* PROOF 2 — snake: grid snake. Proves grid state + growth + input queue. */
var BlobGame_snake = {
  name: 'Snake',
  mechanic: 'snake',
  params: {
    cols: 20, rows: 23, cell: 20, topPad: 40,
    speed: 8, snakeColor: '#7CFF6B', foodColor: '#f0f', headColor: '#e8e8f5'
  },
  code: {
    init: function (P, api) {
      function placeFood(S) {
        for (var t = 0; t < 200; t++) {
          var f = { x: Math.floor(api.rand(0, P.cols)), y: Math.floor(api.rand(0, P.rows)) };
          var hit = false;
          for (var i = 0; i < S.segs.length; i++)
            if (S.segs[i].x === f.x && S.segs[i].y === f.y) { hit = true; break; }
          if (!hit) return f;
        }
        return { x: 0, y: 0 };
      }
      var cx = Math.floor(P.cols / 2), cy = Math.floor(P.rows / 2);
      var S = {
        segs: [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }],
        dir: { x: 1, y: 0 }, queue: [], food: null,
        score: 0, over: false, acc: 0, grow: 0
      };
      S.food = placeFood(S);
      return S;
    },
    tick: function (S, P, input, dt, api) {
      if (S.over) return;
      function placeFood() {
        for (var t = 0; t < 200; t++) {
          var f = { x: Math.floor(api.rand(0, P.cols)), y: Math.floor(api.rand(0, P.rows)) };
          var hit = false;
          for (var i = 0; i < S.segs.length; i++)
            if (S.segs[i].x === f.x && S.segs[i].y === f.y) { hit = true; break; }
          if (!hit) return f;
        }
        return { x: 0, y: 0 };
      }
      // direction input -> queue (no 180° turns), keyboard + swipe
      var nd = null;
      if (input.left || input.swipe === 'left') nd = { x: -1, y: 0 };
      else if (input.right || input.swipe === 'right') nd = { x: 1, y: 0 };
      else if (input.up || input.swipe === 'up') nd = { x: 0, y: -1 };
      else if (input.down || input.swipe === 'down') nd = { x: 0, y: 1 };
      if (nd) {
        var last = S.queue.length ? S.queue[S.queue.length - 1] : S.dir;
        if (S.queue.length < 3 && !(nd.x === -last.x && nd.y === -last.y) &&
            !(nd.x === last.x && nd.y === last.y)) S.queue.push(nd);
      }
      S.acc += dt;
      var step = 1 / P.speed;
      while (S.acc >= step) {
        S.acc -= step;
        if (S.queue.length) S.dir = S.queue.shift();
        var h = { x: S.segs[0].x + S.dir.x, y: S.segs[0].y + S.dir.y };
        // wall
        if (h.x < 0 || h.y < 0 || h.x >= P.cols || h.y >= P.rows) { S.over = true; return; }
        // self (ignore tail tip if not growing — it moves away)
        var lim = S.grow > 0 ? S.segs.length : S.segs.length - 1;
        for (var i = 0; i < lim; i++)
          if (S.segs[i].x === h.x && S.segs[i].y === h.y) { S.over = true; return; }
        S.segs.unshift(h);
        if (h.x === S.food.x && h.y === S.food.y) {
          S.score += 10; S.grow += 2;
          S.food = placeFood();
          if (P.speed < 16 && S.score % 50 === 0) P.speed += 0.5; // gentle ramp
        }
        if (S.grow > 0) S.grow--;
        else S.segs.pop();
      }
    },
    draw: function (S, P, ctx, api) {
      var ox = (api.W - P.cols * P.cell) / 2, oy = P.topPad;
      ctx.fillStyle = '#e8e8f5'; ctx.font = '16px monospace'; ctx.textAlign = 'left';
      ctx.fillText('SCORE ' + S.score, 12, 24);
      ctx.textAlign = 'right';
      ctx.fillText('LEN ' + S.segs.length, api.W - 12, 24);
      // food
      ctx.fillStyle = P.foodColor;
      ctx.fillRect(ox + S.food.x * P.cell + 3, oy + S.food.y * P.cell + 3, P.cell - 6, P.cell - 6);
      // snake
      for (var i = S.segs.length - 1; i >= 0; i--) {
        ctx.fillStyle = i === 0 ? P.headColor : P.snakeColor;
        ctx.fillRect(ox + S.segs[i].x * P.cell + 1, oy + S.segs[i].y * P.cell + 1, P.cell - 2, P.cell - 2);
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
if (typeof module !== 'undefined') module.exports = BlobGame_snake;
