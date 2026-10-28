# GENIQ / FIN — Open Source Release (MIT)

Released 2026-10-27 by David Jeffords / KrysAI Systems. All code and design
documents in this package are MIT-licensed (see LICENSE).

## What this is
A closed-loop metering system for quantum compute access. GENIQ exists only as
numbers inside one shared ledger object — there is no coin, no transfer
function, no market, no yield. Quotes are priced from Quantinuum's published
HQC formula with a disclosed 1.2 margin, escrowed per job, and burned on
delivery. Receipts are soulbound and carry a salted hash commitment so any
result can be recomputed and checked.

## Contents
- `geniq_protocol/` — the Move package (Sui): ledger.move, receipts.move,
  Move.toml, and the full Move test suite (15/15 passing at release).
- `lamp/` — the Python reference implementation: lamp.py (106/106 acceptance
  checks), router.py free-first router (15/15), and both test suites.
- `kids-lab/` — the pure-JS statevector emulator (sim.js) behind the Kids
  Quantum Lab, with its test file.
- `yaae-watch/` — yaae_watch.py, the local results-queue watcher that verifies
  receipt hashes before anything is learned from them.
- `docs/` — PROTOCOL-V3.md (design of record), GENIQ-RETHINK.md,
  HIVE-AND-KIDS-DESIGN-2026-10-23.md, AUDIT-2026-10-23.md (the token audit).

## What this is not
- Not a tradable token, not an investment, not financial advice.
- Not connected to any wallet, mainnet, or live payment rail in this release.
- TEST GENIQ on the live gateway page is a test credit with real ledger
  numbers and no monetary value.

## Build / test
- Move: `sui move build` and `sui move test` inside `geniq_protocol/`.
- Python: `python3 lamp/test_lamp.py`, `python3 lamp/test_router.py`.
- JS: `node kids-lab/test_sim.js`.
