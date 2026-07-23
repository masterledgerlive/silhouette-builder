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
