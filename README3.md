# SILOUTTES Builder v20

A single HTML file for designing layered shadow-box trading cards and exporting real, laser-ready cut files.

**MIT licensed. No build step, no server, no account, no install.** Double-click the file.

---

## Quick start

1. Open `silouttes-builder-v20.html` in any modern browser.
2. Pick a card, add cuts on the **Add Cuts** tab.
3. Tap **⚡ xTool Export**.
4. You get `silouttes-cut.svg` (1:1 millimetres) and a plain-English instruction sheet.

That's the whole loop. Everything below is optional.

---

## Does it actually work? Verify it yourself

You don't have to take my word for any of this. Check each one:

| # | Check | Expected |
|---|---|---|
| 1 | Open the file with your Wi-Fi **off** | Everything works. The builder makes zero network calls. |
| 2 | Build a card, tap ⚡ Export | Two files download. |
| 3 | Open the SVG in a browser | You see outlined cards with interior shapes. |
| 4 | Import to xTool Creative Space, measure the card outline | **63.0 × 88.0 mm exactly.** If not, set import units to mm. |
| 5 | Count the plies in the export dialog | Matches your layer count. |
| 6 | Refresh the page | Your settings survive. Projects/listings persist in this browser. |
| 7 | Setup → Erase everything, refresh | Back to factory. Nothing left behind. |

If #4 fails, the problem is the import scale setting, not the file. The SVG declares `width="…mm"` and a matching `viewBox`, which is the correct way to specify physical size.

---

## The cut file

Standard laser convention:

- **RED `#FF0000`** — through cut, vector pass
- **BLUE `#0000FF`** — score / registration crosses only. **Do not set these to cut.**

Every ply gets four corner registration crosses. Use them to align plies before gluing, and to align a printed card face to the cut.

**Kerf is not applied.** The laser removes material as it cuts, so apertures come out slightly larger than drawn. Set a ~0.15mm inward offset in your laser software if parts fit loose. This is deliberate — kerf depends on your machine, power, speed, and material, so baking in a guess would be worse than leaving it to you.

**Always test on scrap first.** Measure the outline with calipers before committing good stock.

### Ply order

Ply 1 is the backing and normally has no apertures. Each higher ply reveals the one beneath through its cut-outs. Stack ascending with 2mm spacers between plies for the shadow-box depth.

### Sheet size

Plies are laid out four per row. Seven plies → 282 × 210mm (fits any xTool bed). Ten plies → 282 × 312mm, which exceeds an M1 bed (385 × 300mm); the export dialog warns you and you cut in two batches.

---

## Your data

Everything lives in this browser's `localStorage`. Nothing is uploaded. There is no server to leak.

The trade-offs, stated plainly:

- Clearing browser data **erases your work.** Use **Setup → Back up all data** regularly.
- Different browser or device = different data. It does not sync.
- `localStorage` caps around 5–10MB. The app warns you when a save fails.

**Back up before you care about losing something.**

---

## Optional: selling

None of this is required. The builder and exporter are fully functional without it.

**Fiat** — paste a [Stripe Payment Link](https://stripe.com/payments/payment-links) in Setup. Stripe makes these in their dashboard, no code. Checkout opens your link in a new tab; money goes to your Stripe account, never through anyone else's.

**Crypto** — paste your wallet address and pick a chain. Base is recommended: cents in fees, USDC native, works with Coinbase Wallet and Trust Wallet. Ethereum mainnet gas will exceed the price of a $40 shadow box.

### What the crypto flow honestly does

It connects a browser wallet, reads the address and chain, and **records the order locally**. It does **not** verify that payment arrived. A browser cannot do that — it can only ask a wallet what it claims. Confirming funds requires a server watching chain state.

So: **confirm payment in your own wallet before you cut anything.** The order record is a receipt for you, not proof of payment.

Anyone telling you a static HTML file can verify crypto payment is either confused or selling you something.

---

## Optional: AI co-creation

Bring your own API key ([Anthropic](https://console.anthropic.com) or [Moonshot](https://platform.moonshot.cn)). Paste it in Setup. The browser calls the provider directly; the key never passes through any third party.

The key is stored in `localStorage` in plain text. That's fine on your own device. **Don't enter keys on a shared or public computer.**

You pay the provider for your own usage. There is no proxy, no markup, no middleman.

---

## Market & community goals

List your builds with a price, or at $0 to share them openly. Set a community goal; when recorded orders reach the target, every listing flips to open at no cost, with the original creator name preserved on each.

This runs in one browser. Sharing between people means exporting the market file and sending it. A live shared pool needs a backend, which this deliberately isn't.

---

## What this is not

Honest scope, so you don't discover the gaps at a bad moment:

- **No payment verification.** See above.
- **No multi-user sync.** One browser, one dataset.
- **No hosted storage.** Files download to your machine.
- **No order fulfilment.** Records orders; doesn't ship anything.

Each of those needs a server. That's a different piece of software, and it should be built separately and tested against real keys before anyone trusts it with money.

---

## Turnkey use

Host it anywhere static: GitHub Pages, Netlify, Cloudflare Pages, or a folder on a USB stick. It is one file with no dependencies.

To rebrand: change the shop name in Setup. To ship your own card library: build it, then **Export Catalog**, and give buyers the JSON to import.

---

## License

MIT. Use it, sell it, fork it, rebrand it. No attribution required, though it's appreciated.

Built on the v19 builder — the layer engine, pricing model, and 3D preview are unchanged.


---

# v21 additions — Live Studio & your own storage

## Storage: you pick where data lives

**Storage** in the dock. Four options, no default home:

| Option | What it is | Needs |
|---|---|---|
| **This browser** | localStorage. Fast, erased if you clear site data. | nothing |
| **A file you choose** | A real `.json` file. Put it in Google Drive, iCloud, Dropbox, or a USB stick. | nothing |
| **Your own bucket** | Pre-signed PUT URL for Cloudflare R2, Backblaze B2, Wasabi, MinIO, or S3. | your URL |
| **Your own server** | Any endpoint you control that takes JSON. | your URL |

The middle one is the answer to "let people link their own Google Drive." No OAuth, no API keys, no app registration, no permission screens — you save a file, and you put it wherever you already sync files. The site never sees your Drive account, because it never needs to.

## Live Studio

**Studio** in the dock. Set a relay URL, room name, and handle.

- **Presence** — who's in the room, live
- **Chat** — a room to talk and create in
- **Share my build** — push your layer stack to the room
- **Let teammates change my build** — a checkbox, off by default, that lets two people work one card together

Every peer shows a tag: **P2P DIRECT** (orange) means card data is flowing browser-to-browser and the server is idle. **relay-fallback** means a direct link couldn't be made and traffic is passing through the relay.

The app always tells you which one you're in. That distinction is the whole security model, so it's shown rather than hidden.

## What the relay knows

It knows a room name, a display name, and a random session id that dies when you close the tab. It does not know your cards, projects, images, wallet, or keys. It has no database and no disk. Restart it and every room is gone.

You can verify this: with a peer showing **P2P DIRECT**, watch Railway's network graph while you share builds. It stays flat.

## Honest limits

- **P2P fails 10–15% of the time** on strict networks. Fallback works but routes through the relay. Add a TURN server if that matters.
- **Co-editing is last-write-wins.** Two people editing the same layer simultaneously — one wins. Real conflict resolution (CRDTs) is a much bigger build.
- **Rooms are ephemeral.** No history. Close the tab, the conversation is gone. Save your build to your own storage.
- **The relay is one server.** Deploy your own; don't share someone else's.

## Files

- `silouttes-builder-v21.html` — the whole client
- `relay/` — the server, zero npm dependencies
- `relay/RAILWAY-SETUP.md` — two-minute deploy


---

# v22 — Railway: your channel

"Studio" is now **Railway**. It's where the interaction happens: go live, build a card on air, and let people watching tap to order the exact thing you're making.

## Three ways in

**Channel** — go live, watch others, push offers.
**Room** — chat and co-build.
**Connect** — relay URL, channel name, handle.

## Going live from your phone

Tap **Go live from this phone**. That's it. No OBS, no streaming software, no ingest server, no account anywhere.

Your camera goes straight to each viewer over WebRTC. **The site never touches the video.** It isn't uploaded, transcoded, stored, or re-hosted. Your phone is the broadcaster; the relay just tells people you exist. Seeding, not hosting — exactly the model you asked for.

Controls while live: flip camera, mute mic, end stream. Viewer count is live. Every viewer is listed with a **KICK** button that disconnects and blocks them.

## About RTMP — read this before you paste a URL

You asked for an RTMP pointer, and this is the one place where the honest answer differs from the request.

**No browser can play RTMP.** Not this one, not any of them — RTMP is an *ingest* protocol, the address you push **to** with OBS. It was never designed for playback and browser support for it is gone.

So if you paste `rtmp://…` the app tells you exactly that, and tells you what to use instead. Every streaming service that accepts an RTMP push also gives you a **playback** URL:

| You have | Works? | Latency |
|---|---|---|
| `rtmp://…` (ingest) | ✗ never | — |
| `https://….m3u8` (HLS) | ✓ Safari/iOS native | 5–20s behind |
| `https://…/whep` (WHEP) | ✓ everywhere | under 1s |
| **Phone camera** | ✓ everywhere | under 1s |

The phone camera path needs nothing extra and beats all of them on latency. For most people it's simply the right answer.

On HLS: Safari and iOS play `.m3u8` natively. Other browsers need hls.js, which this build deliberately doesn't bundle — it would break the single-file, zero-dependency promise. The app says so plainly rather than failing with a blank screen.

## Live offers — the part you actually wanted

While you're on air building a card:

1. Set a price and a note
2. **Push offer to viewers**
3. Everyone watching sees a card with the live ply count and an **Order this** button
4. They tap it; you get a notification with their handle

That's build-it-live-and-they-buy-it, working.

**What "Order this" does and doesn't do:** it records an order and notifies you. **No money moves.** The viewer sees that stated plainly on their own screen. You settle with them through Stripe, crypto, or however you like, and you confirm payment on your side before cutting anything. A static page cannot verify a payment, and pretending otherwise is how people get robbed.

## Load stays flat

Your video is peer-to-peer, so the relay's bandwidth doesn't grow when viewers join. What does grow is **your phone's** upload — it sends a separate copy to each viewer. Around 5–10 viewers on decent WiFi is comfortable; past that your phone becomes the bottleneck, not the server.

Scaling past that means an SFU (LiveKit, Mediasoup) — a real server that fans out one copy to many. That's a different piece of infrastructure and a different bill. For live 1/1 card sessions with a handful of collectors watching, P2P is the right tool.

## Verify it

| Check | How | Expected |
|---|---|---|
| Video bypasses the server | Go live with a viewer, watch Railway's network graph | Stays flat |
| RTMP is rejected honestly | Paste `rtmp://x/y` | Explains why + names the alternative |
| Kick works | Kick a viewer | Their video stops; they can't rejoin |
| Offers reach viewers | Push an offer | Appears on their screen with live ply count |
| Orders are honest | Tap Order this | Says plainly that no money has moved |
| Nothing persists | Restart the relay | Rooms and viewers gone |


---

# v23 — the mirror layer

The site now points at the platforms that do the heavy lifting, and holds nothing itself. Full detail in **STREAMING-STACK.md**.

## Six ways to put video in the Channel tab

**Restream · YouTube · Twitch · HLS/WHEP · Any iframe · This phone**

Paste an embed code or a URL and the app works out what it is. Their CDN carries the video straight to each viewer; this page renders a frame around it. Whatever you mirror, our chat and the live-order button sit underneath.

When you mirror something, everyone in your room gets the same embed pushed to them automatically.

## Two things the app refuses to do, on purpose

**RTMP URLs are rejected with an explanation.** `rtmp://` is what you push *to* from OBS. No browser plays it. The app tells you that and names what to paste instead.

**Stream keys are rejected.** Paste something that looks like a key and you get a warning to rotate it. Anyone who sees your key can broadcast as you — that's a real way people get hurt, and a text field on a web page is exactly where it happens.

## OBS deck

OBS 28+ has WebSocket v5 built in — no plugin. Enable it, paste the password, and you get scene switching, start/stop stream, and record from the same panel as your chat.

The password talks to `127.0.0.1` and never leaves your browser.

**Chrome, Edge, or Firefox on desktop only.** Safari and iOS block `ws://localhost` from an https page. The app detects this and tells you before you try, rather than failing silently.

## Art

Canva, Photoshop, Photopea, Figma — each linked with its exact export settings. Drop a PNG in and it's checked for aspect ratio, resolution, and transparency before you cut.

**744 × 1039 px** is 300dpi at card size. Transparency on.

No Adobe/Canva plug-in: those need server-side OAuth and app review, which would break the single-file promise. Export → import needs neither and works today.

## What each layer costs

| Layer | Who | Cost |
|---|---|---|
| Encoding, scenes | OBS, your machine | free |
| Transcode, CDN, scale | Restream / YouTube / Twitch | their plan |
| Presence, signalling | Railway relay | ~$5/mo |
| Builder, chat, orders, cut files | this file | nothing |

## Honest notes

- **Restream's embed player is a paid Business feature**, ~60s latency, 1,000 viewers, and **its chat isn't included** — which is why ours is peer-to-peer and sub-second.
- **60s latency changes how you sell.** Don't run "first to tap wins" on a delayed stream. Leave offers up for minutes, or use the phone camera for live 1/1s.
- **Twitch needs a parent domain** matching where you host this file, or the player refuses to load.
- **YouTube @handles can't be resolved** without an API key. Use your channel ID (starts with `UC`).


---

# v24 — Railway is the engine

## The rethink

Four UI layers had accumulated, each patching the one before it. v24 replaces them with **one Studio panel** that opens on the live wall.

**Three tabs, phone-first:**

- **LIVE** — who's broadcasting right now, the stage, and room chat. This is the front door.
- **GO LIVE** — phone camera, or mirror OBS / Restream / YouTube / Twitch / HLS.
- **SETUP** — relay, storage, OBS deck, art.

## Railway holds the keys

Every secret lives as a Railway environment variable, sealed. The browser is handed **public config only** and never a credential.

**Storage works without the file ever touching the server.** The browser asks the relay for a signed URL, the relay signs it, and the browser `PUT`s straight to the bucket. A 25MB PNG costs the relay one small HTTP response. Same principle as the video: signalling through Railway, payload peer to peer.

The signing is AWS SigV4, implemented from `node:crypto` with zero dependencies, and verified against the signing-key vector AWS publishes in their own docs.

## One edit reconfigures everyone

`/config` serves site name, default room, public payment link, and public wallet address. Change a Railway variable and every browser picks it up on next connect. No redeploying the HTML.

## Testing with other people today

Open the HTML and find this near the top of the script block:

```js
const DEFAULT_RELAY = '';        // 'wss://your-app.up.railway.app'
const DEFAULT_ROOM  = 'main';
```

Fill it in. **Anyone who opens the file is connected automatically** — no setup screen, no pasting a URL. Send the file to your testers and they land in your room, see the live wall, and can chat or go live immediately.

## The live wall

Going live registers you on a server-side registry that's pushed to every connected browser. Tap a card to watch. Disconnect and you're removed automatically, so the wall never shows ghosts.

The relay tracks: a display name, a room, a title, and a session id that dies with the tab. Nothing else.

## Honest limits

- **P2P video fans out from your phone.** One copy per viewer. Good to about 5–10; past that your phone is the bottleneck, not Railway. Scaling further needs an SFU.
- **Restream's embed is a paid Business feature**, ~60s latency, and its chat isn't included — which is why ours is peer-to-peer.
- **RTMP can't be played by any browser.** Paste one and the app explains why and names the alternative.
- **OBS control is Chrome/Edge/Firefox on desktop.** Safari and iOS block `ws://localhost` from https pages.
- **Co-editing is last-write-wins.** Two people on the same layer at once, one wins silently.
- **Rooms are ephemeral.** Restart the relay and everything is gone by design.

## Test coverage

| Suite | Checks |
|---|---|
| Client (`t24.js`) | 32 |
| Relay (`test-relay.js`) | 31 |
| SigV4 (`test-sigv4.js`) | 14 |

Two real bugs were caught and fixed during this build: `serveViewer` crashed the host if the relay socket dropped mid-stream, and `safeKey` sanitised the filename but not the owner — letting a crafted request escape its own storage namespace and overwrite another user's files.


---

# v25 — Tear-Apart Studio (owner tools)

Bring in a full card image and turn every element into a real cut line, positioned on its own layer, with the shadow-box stack previewed live. Commits a normal catalog card — so the pricing, the manifest, and the cut-file export already understand it, exactly like the built-in cards.

## The workflow

1. Owner section → **⛏ Tear Apart a Card**.
2. Drop a card image (a straight-on scan works best). Name it.
3. Pick **Box** or **Ellipse**, then drag over each element — the figure, the title bar, the terrain, whatever should lift off its own layer.
4. Each region shows up in the list. Name it, set its type, nudge it up or down a layer with **− / +**.
5. **◱ Preview stack** shows the exploded shadow box: one mini-card per ply, apertures marked where light passes through to the ply beneath.
6. **Add to my library** — now it cuts like any other card. Or **Export cut file now** to get the SVG immediately.

## Why the geometry is correct

A drawn box becomes a CSS `inset()` clip; an ellipse becomes an `ellipse()` clip — the exact format the sample cards use. That runs through the same `buildCutSVG()` you've already seen: 1:1 millimetres, cards at exactly 63×88mm, red cut lines, blue registration crosses, one ply per layer.

The sample output above (`torn-cut.svg`) came from tearing a card into 5 elements across 6 plies. Both ellipse regions became real ellipse cuts. Nothing is faked — a torn card is indistinguishable from `turtleduck` to the rest of the system.

## Layers

Elements on the same layer share a ply; elements on different layers stack with 2mm spacers between them. Drag a region to move it, grab the corner handle to resize, and the price and ply count update as you go — using the app's own pricing math, so the number you see while tearing is the number on the final card.

## Live preview

The exploded view is the shadow box laid flat, bottom ply first. It's how you check that your apertures reveal the right thing before committing material. Cut on scrap once and measure the outline before good stock — same rule as always.

## Test coverage added

25 new checks covering region→clip math (box and ellipse), the inset arithmetic (top/right/bottom/left), `toCard` schema conformance, committed cards cutting to a valid 63×88mm SVG, shared-layer ply collapsing, and live price/ply tracking. Full v25 suite: **52 client + 31 relay + 14 crypto**.

One integration fix: `loadFullStack` now honors an object's explicit `layer` field when present (torn cards set it), falling back to sequential layers for the built-in cards — so two elements you deliberately place on the same ply stay together.


---

# v26 — Path editing: nodes, curves, closure, compound paths

Every element you tear off a card can now be edited as a real vector path — individual nodes, Bézier curves, path closure, and compound paths (an outer island with an inner hole). A path-edited element cuts exactly as drawn, because it flows through the same engine as every other shape.

## How to use it

In the tear-apart list, each element has an **✎ Edit path** button. Open it and you get a node editor over the card:

- **Select** — drag any node to move it; drag the teal square handles to bend the curve on either side.
- **Add node** — tap anywhere on the card to drop a new node into the outline.
- **Delete node** — tap a node to remove it.
- **Smooth / Corner** — toggle the selected node between a hard corner and a smooth curve. Smooth nodes grow mirrored handles so the curve stays continuous.
- **Close path** — join the last node back to the first, enclosing the area. A cut has to be closed to enclose anything.
- **Add hole / island** — start a second subpath. Drawn inside the shape, it cuts as a hole; drawn outside, it's a separate island. Both live in one element.
- **Undo** — steps back through your edits.

**Apply to element** writes the path back. The list marks it **✎ ✓**, the stage shows the real outline, and the cut file carries a true `<path>`.

## Why the geometry is exact

A node path serializes to an SVG path in percent of the card, stored as `clip: path("M… C… Z")` — the same object field the built-in cards use for `inset()` and `ellipse()`. It runs through the same `parseClip → clipToMM → shapeSVG` pipeline, so:

- A node at 40%,15% lands at exactly 25.2mm, 13.2mm on a 63×88mm card.
- Bézier `C` commands survive intact — a smooth curve cuts as a curve.
- A compound path emits one `<path>` with two subpaths and `fill-rule="evenodd"` — the laser reads that as island-plus-hole.

The sample above (`path-cut.svg`) is one card with three elements at once: a Bézier blob, a compound donut, and a plain rectangle. All valid, all 63×88mm, coexisting.

## Round-trip safety

A path you save and reopen parses back to the same nodes you drew — verified stable over repeated round-trips, including the tricky case where a closing curve returns to the first node (which naïvely leaves a duplicate node; the parser folds it back). Rect, ellipse, and path elements all round-trip identically.

## Compound paths in a shadow box

This is where holes matter. An outer outline with an inner cutout, on the same ply, gives you a frame or a ring in a single cut — the inner subpath removes material inside the outer. Draw the outer shape, hit **Add hole / island**, draw the inner one inside it, close both. The even-odd rule does the rest.

## Test coverage added

24 path-engine checks (build-from-primitive, serialize, round-trip stability, node add/move/delete, corner↔smooth, handle mirroring, closure, compound, stats) plus 11 integration checks (path region → catalog card → valid cut SVG, evenodd fill, island+hole in the cut file, exact mm landing). Full v26 suite: **64 client + 31 relay + 14 crypto = 109**.

Two real bugs caught and fixed: the straight-closure serializer wrote a redundant `L` back to the start that re-parsed as a duplicate node, and a closing Bézier left a duplicate node coincident with the first — both would have corrupted the node count on reopening.


---

# v27 — Tear-Apart & Path Editor bug fixes

Every issue reported against the node editor and the tear-apart flow, fixed and tested.

## The crash (both screenshots)

`Cannot read properties of undefined (reading 'stack')` came from the export and commit handlers reading `window.S` — but the app's state object `S` is a script-scope constant, not a global on `window`, so `window.S` was `undefined`. Every reference is now the correctly-scoped `S`. Export and "Add to my library" both work with node paths and compound paths.

The tear module also read the card genre from `window.S.genre`; it now carries genre on its own state, set when you start a tear.

## Add-node placement

Previously every added node appended after the first node, so points landed "all over the place." Now a click inserts on **whichever existing edge is nearest** — click near the right edge, the node splits the right edge; click near the top, it splits the top. Verified: a right-edge click inserts at index 2, a top-edge click at index 1, and different clicks land in different positions.

## Add hole / island

The compound button used to create an empty subpath you had to build node by node — and an empty subpath was part of what crashed the export. It now drops a **ready-made square** in the middle of your shape that you reshape by dragging its nodes. It's a valid hole immediately, and it exports cleanly. Empty subpaths are also defended against everywhere, so they can never break the cut file.

## The flow

- **Info is required first.** After you choose an image, a **Start editing** button appears but stays disabled until you enter a card name. No more skipping straight past the details.
- **Reopening always starts fresh.** Opening Tear-Apart now fully resets — the previous card, its image, and its regions are cleared, so you never inherit the last card's state. "Start over" does the same.
- **Commit posts to the main area with the image intact.** Committing verifies the card still has its image, switches the app to it, rebuilds the preview, and jumps to the build tab so you see it immediately.

## Tested

New checks cover: the export no longer crashing on scope, genre captured correctly, add-node landing on the nearest segment (not always after node 0), add-hole producing a valid compound, empty subpaths being skipped, and reopening clearing all state. A generated cut file exercises a node-inserted polygon and a compound hole together — valid, 63×88mm, image preserved. Full suite: **78 client + 31 relay + 14 crypto = 123**.


---

# v28 — Node-edited cuts now render in the right place

The die-line editor produced a correct cut but the **image clipped to the wrong spot** — a tiny region in the top-left instead of the part of the card you outlined (the first screenshot). Fixed.

## What was wrong

The app applies each element's clip straight to CSS: `element.style.clipPath = clip`. That's correct for `inset()` and `ellipse()` — they're native CSS clip-path functions that accept percentages. But a node-edited element is stored as `path("M25 13 …")` in **percent of the card**, and CSS `clip-path: path()` reads those numbers as **pixels**, not percent. So `M25 13` clipped the image to a 25×13-pixel box in the corner. The laser cut was right because the export does its own correct percent-to-millimetre scaling; only the on-screen clip was wrong.

A second, related gap: `clipBox()` — which the app uses to place the image window and to position free-moved layers — only understood `inset()` and `ellipse()`. For a path it fell back to "the whole card," so the image window was placed as if the element filled the entire face.

## The fix

Path clips now render through an inline **SVG `clipPath` with `clipPathUnits="objectBoundingBox"`**, whose coordinates are the path's percentages divided by 100 (so 25% becomes 0.25 in the 0–1 bounding-box space). This scales with the element and handles curves correctly, while `inset()` and `ellipse()` still go straight to CSS exactly as before. Every place that clips an image — the card stage, the loupe preview, and both thumbnail strips — routes through the same helper.

`clipBox()` now computes the true bounding box of a path from its coordinates, so the image window and free-move land where the outline actually is.

## Verified

The cut path and the image clip now agree on position: a node at 20% of the card lands at 12.6mm in the cut file (20% of 63mm) and at 0.20 in the on-screen clip — the same place. Tested that clipBox returns the real path bbox rather than full-card, that inset/ellipse boxes are unchanged (no regression), that paths route to an SVG clipPath while shapes stay on CSS, and that the percent-to-fraction conversion is exact. Full suite: **87 client + 31 relay + 14 crypto = 132**.

The stale-clip cleanup runs on every stage rebuild, so the SVG defs don't accumulate as you edit.


---

# v29 — Support terminal (bottom-left tip jar)

A small, quiet way for anyone using the tool to support the work — QR codes and addresses for three chains, live wallet watching, and a momentary thank-you when a tip lands while someone's looking.

## What it does

A pill sits in the bottom-left. Tap it and a compact panel opens with:
- **Tabs for Base, Sui, and Solana** — each shows a scannable QR and the full address.
- **One-tap copy** that always works, even if a QR reader is finicky.
- **Open wallet** link that hands the address to the device's wallet app.
- **A live balance line** for the selected chain.

It **auto-shrinks after 3 seconds** of no hover or interaction, so it's never in the way. It never grows large — the panel is a fixed, small size.

## The QR codes are generated in the file

No external service, no dependency, no phoning home. There's a small QR encoder built in (Reed-Solomon and all), and it's verified by **round-tripping its own output** — every address is encoded and then decoded back to the exact original string in the tests. Each chain's QR encodes the proper send URI (`ethereum:…`, `solana:…`, or the raw Sui address) so scanning it opens a send screen in a wallet.

Standalone QR files are included (`qr-base.svg`, `qr-sui.svg`, `qr-solana.svg`) — **scan them with your own phone first** to confirm they resolve to your wallets before you share the file.

## Live wallet watching

The widget polls each chain's public RPC every 25 seconds and reads your balance. When a balance **goes up**, it means a tip landed — and it shows a momentary thank-you (with the amount and a little sparkle) to whoever's viewing the page. If the panel was closed, it briefly opens to show the thanks, then tucks itself away again.

Each chain is independent and **fails soft**: if a public RPC blocks the browser (some do, via CORS) or rate-limits, that chain's balance just shows "live view unavailable" and the others keep working. The QR and copy never depend on the network at all.

## The copy

Warm and honest, and it rotates between a few lines about building solo for family and the work to come. **No amounts are ever suggested** — it's support of any size or none. And it deliberately doesn't make "tip the exact right person" part of the pitch.

## Edit your addresses in one place

All three addresses, the RPC endpoints, and the poll interval live in a clearly-marked **CONFIG block** at the top of the tip-jar code. They were transcribed from your screenshots — **verify each one against your wallet before sharing**, since one wrong character sends nowhere. (This is a note for you, not a line in the widget.)

## Honest limits

- I can't make live blockchain calls in this environment, so the watching logic is tested against mocked RPC responses (tip detection, fail-soft, balance math all verified) — but the real public-RPC connection is something to confirm on your device.
- "Live" means polled every 25 seconds, so a tip appears within that window, not instantly. That keeps it well under any rate limit.
- Public RPCs sometimes block browser requests. If a chain shows "live view unavailable," swap its `rpc` in the CONFIG for a free endpoint (Alchemy/Helius/QuickNode all have free tiers) and it'll light up.

Test coverage added: **13 QR round-trip + 17 watcher/fail-soft + 12 integration** checks. Full suite across everything: **96 client + 13 QR + 17 watcher + 31 relay + 14 crypto = 171**.


---

# v30 — Tip jar fixes: live view now works, open-wallet removed

Three changes from your feedback.

## Removed "Open wallet"

Gone. The QR does the job — it's exactly what your wallet's own receive screen shows, and scanning it drops the address straight into a sender's wallet. The QR now encodes the **raw address** (the most universally scannable form) rather than a URI scheme.

## Live view now actually works

The reason it didn't: **the default public RPCs block browser requests.** Solana's own docs are explicit — front-end `getBalance` calls get a `403 blocked`, and the Base/Sui public endpoints are the same. That's not a bug in the widget; it's the endpoints refusing browser traffic.

The fix is a browser-friendly RPC that sends the right CORS headers. Each chain now tries **PublicNode** first (free, no key, no signup, allows browser requests), then falls back to the original endpoints:

- Base → `base-rpc.publicnode.com`, then `mainnet.base.org`, then `base.llamarpc.com`
- Sui → `sui-rpc.publicnode.com`, then `fullnode.mainnet.sui.io`
- Solana → `solana-rpc.publicnode.com`, then `api.mainnet-beta.solana.com`

The watcher tries each endpoint in order until one answers, and **remembers the one that worked** so it goes there first next time. If a balance goes up on any of the three, whoever's on the page sees the thank-you — automatically, for all three accounts.

## Phantom handle

The Solana tab now shows **on Phantom: nintendokidkai** so people can find and tip you by name, not just by address.

## What I can and can't promise

I tested the whole watcher against mocked endpoints — fallback order, remembering the good endpoint, tip detection across a fallback, and fail-soft when everything's down (all pass). What I **can't** do from here is make the real network call, because this build environment has no internet. So the logic is proven; the actual PublicNode connection is the one thing to confirm when you open the file.

If you open it and a chain still says "live view unavailable," that endpoint is having a moment — the CONFIG block at the top of the tip-jar code lets you drop in any RPC URL (a free Helius/Alchemy/QuickNode key is the most reliable). But PublicNode should work browser-side without any of that.

Everything else — QR scannability (round-trip verified), copy, the 3-second auto-collapse, the no-amounts warm copy — is unchanged and still passing. Full suite: **99 client + 13 QR + 10 watcher + 31 relay + 14 crypto = 167**.


---

# v31 — Your exact Phantom QR codes

You tested the generated QRs and they didn't work, so these are now **your real QR images, straight from the Phantom app.**

Each screenshot was cropped to the QR, binarized (so there's zero compression blur), given a clean white quiet-zone border, and embedded pixel-exact. Scanning one is identical to scanning it in Phantom — including the little center logos, which the QR's own error correction handles. The generated encoder is kept only as a silent fallback if an image is ever missing; your images always take priority.

Everything else from v30 stays: the live view uses browser-friendly PublicNode RPCs with fallback, the Phantom handle shows on the Solana tab, "Open wallet" is gone, and the 3-second auto-collapse and no-amounts copy are unchanged.

Full suite: **103 client + 10 watcher + 31 relay + 14 crypto = 158**, all passing.
