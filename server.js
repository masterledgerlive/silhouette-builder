/* ══════════════════════════════════════════════════════════════
   SILOUTTES RELAY — presence + signaling only.  MIT.

   WHAT THIS SERVER DOES:
     · tells peers in a room that each other exist
     · passes WebRTC handshake blobs between them
     · relays chat/state ONLY as fallback when P2P fails

   WHAT IT DOES NOT DO — by design:
     · store cards, projects, images, or any user file
     · read message payloads (they are opaque strings to it)
     · require accounts, emails, or passwords
     · persist anything to disk or a database

   Restart it and it forgets everything. That is the point.
   Zero npm dependencies: raw node:http + hand-rolled RFC6455.
   ══════════════════════════════════════════════════════════════ */
'use strict';
const http = require('node:http');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 8080;
const ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
const MAX_ROOM = +(process.env.MAX_ROOM_SIZE || 8);
const MAX_MSG = +(process.env.MAX_MSG_BYTES || 64 * 1024);
const RATE_N = +(process.env.RATE_LIMIT_MSGS || 40);   // msgs per window
const RATE_MS = +(process.env.RATE_LIMIT_WINDOW || 10000);
const IDLE_MS = +(process.env.IDLE_TIMEOUT || 120000);
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/* ── state: in memory only ── */
const rooms = new Map();   // roomId -> Map(peerId -> peer)
let peerSeq = 0;
const stats = { started: Date.now(), conns: 0, msgs: 0, dropped: 0 };

const log = (...a) => console.log(new Date().toISOString(), ...a);

/* ══════════ minimal RFC6455 ══════════ */
function wsAccept(key) {
  return crypto.createHash('sha1').update(key + GUID).digest('base64');
}

function encodeFrame(str) {
  const payload = Buffer.from(str, 'utf8');
  const len = payload.length;
  let head;
  if (len < 126) {
    head = Buffer.alloc(2); head[1] = len;
  } else if (len < 65536) {
    head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.alloc(10); head[1] = 127;
    head.writeUInt32BE(0, 2); head.writeUInt32BE(len, 6);
  }
  head[0] = 0x81;                       // FIN + text
  return Buffer.concat([head, payload]);
}

function ctrlFrame(opcode, payload = Buffer.alloc(0)) {
  const f = Buffer.alloc(2 + payload.length);
  f[0] = 0x80 | opcode; f[1] = payload.length;
  payload.copy(f, 2);
  return f;
}

/* Incremental frame parser. Returns {frames:[], rest:Buffer}. */
function parseFrames(buf) {
  const frames = [];
  let off = 0;
  while (off + 2 <= buf.length) {
    const b0 = buf[off], b1 = buf[off + 1];
    const fin = (b0 & 0x80) !== 0, opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f, p = off + 2;

    if (len === 126) { if (p + 2 > buf.length) break; len = buf.readUInt16BE(p); p += 2; }
    else if (len === 127) {
      if (p + 8 > buf.length) break;
      const hi = buf.readUInt32BE(p), lo = buf.readUInt32BE(p + 4);
      len = hi * 4294967296 + lo; p += 8;
    }
    if (len > MAX_MSG) return { frames, rest: buf.slice(off), tooBig: true };
    let mask = null;
    if (masked) { if (p + 4 > buf.length) break; mask = buf.slice(p, p + 4); p += 4; }
    if (p + len > buf.length) break;

    const data = Buffer.from(buf.slice(p, p + len));
    if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
    frames.push({ fin, opcode, data });
    off = p + len;
  }
  return { frames, rest: buf.slice(off) };
}

/* ══════════ peer plumbing ══════════ */
function send(peer, obj) {
  if (peer.sock.destroyed || !peer.sock.writable) return;
  try { peer.sock.write(encodeFrame(JSON.stringify(obj))); } catch (e) { /* closed */ }
}

function roster(roomId) {
  const r = rooms.get(roomId);
  if (!r) return [];
  return [...r.values()].map(p => ({ id: p.id, name: p.name, mode: p.mode }));
}

function broadcast(roomId, obj, exceptId) {
  const r = rooms.get(roomId);
  if (!r) return;
  for (const p of r.values()) if (p.id !== exceptId) send(p, obj);
}

function join(peer, roomId, name) {
  leave(peer);
  roomId = String(roomId || 'lobby').slice(0, 48).replace(/[^\w.\-]/g, '') || 'lobby';
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  const room = rooms.get(roomId);
  if (room.size >= MAX_ROOM) { send(peer, { t: 'error', msg: 'Room is full (' + MAX_ROOM + ' max)' }); return; }

  peer.room = roomId;
  peer.name = String(name || 'guest').slice(0, 32);
  room.set(peer.id, peer);

  send(peer, { t: 'joined', you: peer.id, room: roomId, peers: roster(roomId) });
  broadcast(roomId, { t: 'peer-in', peer: { id: peer.id, name: peer.name } }, peer.id);
  log(`join ${peer.id} -> ${roomId} (${room.size})`);
}

function leave(peer) {
  if (!peer.room) return;
  const room = rooms.get(peer.room);
  if (room) {
    room.delete(peer.id);
    broadcast(peer.room, { t: 'peer-out', id: peer.id });
    if (!room.size) rooms.delete(peer.room);
  }
  peer.room = null;
}

function rateOK(peer) {
  const now = Date.now();
  if (now - peer.winStart > RATE_MS) { peer.winStart = now; peer.count = 0; }
  return ++peer.count <= RATE_N;
}

/* ══════════ HTTP ══════════ */
const server = http.createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': ORIGINS[0] === '*' ? '*' : ORIGINS.join(','),
    'Content-Type': 'application/json'
  };
  if (req.url === '/health') {
    return res.writeHead(200, cors).end(JSON.stringify({
      ok: true, uptime: Math.floor((Date.now() - stats.started) / 1000)
    }));
  }
  if (req.url === '/metrics') {
    return res.writeHead(200, cors).end(JSON.stringify({
      rooms: rooms.size,
      peers: [...rooms.values()].reduce((a, r) => a + r.size, 0),
      totalConnections: stats.conns, messagesRelayed: stats.msgs, dropped: stats.dropped,
      uptimeSec: Math.floor((Date.now() - stats.started) / 1000),
      memoryMB: +(process.memoryUsage().heapUsed / 1048576).toFixed(1),
      note: 'This server stores no user data. Rooms are in memory and vanish on restart.'
    }));
  }
  if (req.url === '/' ) {
    return res.writeHead(200, { ...cors, 'Content-Type': 'text/plain' }).end(
      'SILOUTTES RELAY — presence and WebRTC signaling only.\n' +
      'No user data is stored here. Endpoints: /health /metrics\n' +
      'Connect a WebSocket to this same URL to join a room.\n');
  }
  res.writeHead(404, cors).end('{"error":"not found"}');
});

/* ══════════ upgrade → WebSocket ══════════ */
server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key'];
  const origin = req.headers.origin || '';

  if (!key) { sock.destroy(); return; }
  if (ORIGINS[0] !== '*' && origin && !ORIGINS.includes(origin)) {
    log('reject origin', origin);
    sock.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return;
  }

  sock.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + wsAccept(key) + '\r\n\r\n');

  sock.setNoDelay(true);
  const peer = {
    id: 'p' + (++peerSeq).toString(36) + Date.now().toString(36).slice(-4),
    sock, room: null, name: 'guest', mode: null,
    winStart: Date.now(), count: 0, alive: true, last: Date.now()
  };
  stats.conns++;
  let buf = Buffer.alloc(0);

  send(peer, { t: 'hello', id: peer.id, maxRoom: MAX_ROOM });

  sock.on('data', chunk => {
    peer.last = Date.now();
    buf = Buffer.concat([buf, chunk]);
    if (buf.length > MAX_MSG * 2) { stats.dropped++; sock.destroy(); return; }

    const { frames, rest, tooBig } = parseFrames(buf);
    buf = rest;
    if (tooBig) { send(peer, { t: 'error', msg: 'Message too large' }); sock.destroy(); return; }

    for (const f of frames) {
      if (f.opcode === 0x8) { sock.end(ctrlFrame(0x8)); return; }       // close
      if (f.opcode === 0x9) { sock.write(ctrlFrame(0xA, f.data)); continue; } // ping->pong
      if (f.opcode === 0xA) { peer.alive = true; continue; }            // pong
      if (f.opcode !== 0x1) continue;                                   // text only

      if (!rateOK(peer)) { stats.dropped++; send(peer, { t: 'error', msg: 'Slow down' }); continue; }

      let m; try { m = JSON.parse(f.data.toString('utf8')); } catch (e) { continue; }
      stats.msgs++;

      switch (m.t) {
        case 'join': join(peer, m.room, m.name); break;
        case 'leave': leave(peer); break;
        case 'mode':
          peer.mode = String(m.mode || '').slice(0, 40);
          if (peer.room) broadcast(peer.room, { t: 'peer-mode', id: peer.id, mode: peer.mode }, peer.id);
          break;

        /* WebRTC handshake — server never inspects sdp/candidate */
        case 'signal': {
          if (!peer.room) break;
          const room = rooms.get(peer.room);
          const dst = room && room.get(m.to);
          if (dst) send(dst, { t: 'signal', from: peer.id, data: m.data });
          break;
        }

        /* fallback relay when a direct P2P link could not be made */
        case 'relay':
          if (peer.room) broadcast(peer.room, { t: 'relay', from: peer.id, data: m.data }, peer.id);
          break;

        case 'ping': send(peer, { t: 'pong', ts: m.ts }); break;
      }
    }
  });

  // Upgraded sockets are raw net.Sockets: 'close' alone is not reliable
  // across all disconnect paths, so listen broadly and make bye idempotent.
  let gone = false;
  const bye = () => {
    if (gone) return;
    gone = true;
    leave(peer);
    if (!sock.destroyed) sock.destroy();
  };
  sock.on('close', bye);
  sock.on('end', bye);
  sock.on('error', bye);
  sock.on('timeout', bye);
});

/* keepalive + idle reaper */
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values())
    for (const p of [...room.values()]) {
      if (p.sock.destroyed || !p.sock.writable) { leave(p); continue; }
      if (now - p.last > IDLE_MS) { p.sock.destroy(); leave(p); continue; }
      try { p.sock.write(ctrlFrame(0x9)); } catch (e) { leave(p); }
    }
}, 30000).unref();

server.listen(PORT, () => {
  log(`SILOUTTES relay on :${PORT}`);
  log(`origins=${ORIGINS.join(',')} maxRoom=${MAX_ROOM}`);
  log('storage: none — this server holds no user data');
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
module.exports = { server, parseFrames, encodeFrame, wsAccept, rooms };
