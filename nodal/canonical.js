'use strict';
/*
 * canonical.js — THE CANONICAL ADDRESS (Phase 0, Consolidated Plan 2026-11-09)
 *
 * One address for every event-cell in every surface of the integrated
 * tennis system (GAME DAY lattice · NODAL desk · Arena broadcast · Hall).
 * Dependency-free. Loads in Node (module.exports) or a browser (window.Canonical).
 *
 * Address shape:
 *   { sport, event_id, match_key:"A|B", set, game, point_index,
 *     server, situation, outcome,
 *     refs: { tape_ref, genesis_root, ledger_seq, engine_version } }
 *
 * Baseball extension (GAME DAY): sport:"baseball" addresses carry
 *   { inning, half, slot } in place of set/game, and outcome is a
 *   scoring code (F0, F7, FO, ...). Same envelope, same refs.
 *
 * GLOSSARY LAW: cell = a lattice unit (one addressed event) · point = a
 * tennis event · NODE = only the derived score receipt (never a cell,
 * never a point). See CANONICAL-ADDRESS.md.
 */

const MODES = ['REPLAY', 'SNAPSHOT', 'GAME-LIVE', 'POINT-LIVE', 'PRICE-SHADOW'];

const TENNIS_OUTCOMES = ['ACE', 'DF', 'SRV', 'RET']; // ace · double fault · server won · returner won

function parseMatchKey(match_key) {
  if (typeof match_key !== 'string') return null;
  const parts = match_key.split('|');
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return null;
  return { a: parts[0], b: parts[1] };
}

function makeAddress(fields) {
  const f = fields || {};
  const addr = {
    sport: f.sport,
    event_id: f.event_id,
    match_key: f.match_key,
    set: f.set != null ? f.set : null,
    game: f.game != null ? f.game : null,
    point_index: f.point_index != null ? f.point_index : null,
    server: f.server != null ? f.server : null,
    situation: f.situation != null ? f.situation : null,
    outcome: f.outcome != null ? f.outcome : null,
    refs: {
      tape_ref: (f.refs && f.refs.tape_ref) || null,
      genesis_root: (f.refs && f.refs.genesis_root) || null,
      ledger_seq: (f.refs && f.refs.ledger_seq != null) ? f.refs.ledger_seq : null,
      engine_version: (f.refs && f.refs.engine_version) || null
    }
  };
  if (f.sport === 'baseball') {
    addr.inning = f.inning != null ? f.inning : null;
    addr.half = f.half || null;   // 'top' | 'bot'
    addr.slot = f.slot != null ? f.slot : null;
  }
  return addr;
}

function validateAddress(addr) {
  const errors = [];
  if (!addr || typeof addr !== 'object') return { ok: false, errors: ['not an object'] };
  if (!addr.sport) errors.push('sport missing');
  if (!addr.event_id) errors.push('event_id missing');
  if (addr.sport === 'tennis') {
    if (!parseMatchKey(addr.match_key)) errors.push('match_key must be "A|B"');
    if (!(Number.isInteger(addr.set) && addr.set >= 1)) errors.push('set must be an integer >= 1');
    if (!(Number.isInteger(addr.game) && addr.game >= 1)) errors.push('game must be an integer >= 1');
    if (!(Number.isInteger(addr.point_index) && addr.point_index >= 0)) errors.push('point_index must be an integer >= 0');
    if (!addr.server) errors.push('server missing');
    if (!addr.outcome) errors.push('outcome missing');
    else if (!TENNIS_OUTCOMES.includes(addr.outcome)) errors.push('tennis outcome must be one of ' + TENNIS_OUTCOMES.join('/'));
  } else if (addr.sport === 'baseball') {
    if (!(Number.isInteger(addr.inning) && addr.inning >= 1)) errors.push('inning must be an integer >= 1');
    if (!(Number.isInteger(addr.slot) && addr.slot >= 1)) errors.push('slot must be an integer >= 1');
    if (!addr.outcome) errors.push('outcome missing');
  } else if (addr.sport) {
    errors.push('unsupported sport: ' + addr.sport);
  }
  if (!addr.refs || typeof addr.refs !== 'object') errors.push('refs missing');
  return { ok: errors.length === 0, errors };
}

/* GAME DAY style extract string:
 *   tennis:   [AO2011F | set=1 | game=1 | pt=0 | srv=Na Li | sit=sets 0-0 · games 0-0 · pts 0-0 | out=ACE]
 *   baseball: [WS1956G5 | inn=4 | slot=1 | out=F0]                                        */
function formatExtract(addr) {
  if (addr.sport === 'baseball') {
    const half = addr.half ? ' ' + addr.half : '';
    return '[' + addr.event_id + ' | inn=' + addr.inning + half +
           ' | slot=' + addr.slot + ' | out=' + addr.outcome + ']';
  }
  let s = '[' + addr.event_id + ' | set=' + addr.set + ' | game=' + addr.game +
          ' | pt=' + addr.point_index + ' | srv=' + addr.server;
  if (addr.situation) s += ' | sit=' + addr.situation;
  s += ' | out=' + addr.outcome + ']';
  return s;
}

/*
 * Parse NODAL's native citation — pair string + point index, with the
 * per-point facts the desk's tape carries — into a canonical address.
 *   nodalPoint = { event_id, match_key, point_index, set, game,
 *                  server, situation, outcome, refs }
 */
function fromNodalPoint(nodalPoint) {
  const n = nodalPoint || {};
  return makeAddress({
    sport: 'tennis',
    event_id: n.event_id,
    match_key: n.match_key,
    set: n.set, game: n.game,
    point_index: n.point_index,
    server: n.server, situation: n.situation, outcome: n.outcome,
    refs: n.refs
  });
}

/* Wrap one addressed event as a lattice CELL (the reveal-order unit). */
function makeCell(address, extra) {
  const v = validateAddress(address);
  if (!v.ok) throw new Error('invalid address: ' + v.errors.join('; '));
  return Object.assign({ address }, extra || {});
}

const Canonical = { MODES, TENNIS_OUTCOMES, parseMatchKey, makeAddress, validateAddress, formatExtract, fromNodalPoint, makeCell };
if (typeof module !== 'undefined' && module.exports) module.exports = Canonical;
if (typeof window !== 'undefined') window.Canonical = Canonical;
