# The stack — who does what

The design rule: **anything heavy happens somewhere else.** This HTML file is a mirror and a chat room. It never ingests, transcodes, stores, or re-hosts video.

| Layer | Who does it | What it costs you |
|---|---|---|
| Encoding, scenes, overlays | **OBS** on your machine | Free, your CPU |
| Transcode, CDN, scale | **Restream / YouTube / Twitch** | Their plan |
| Presence, signalling, config | **Railway** (one small relay) | ~$5/mo |
| Card builder, chat, orders, cut files | **This HTML file** | Nothing |

Your viewers pull video from a CDN built for it. The relay passes a few hundred bytes per person. The HTML holds nothing.

---

## Restream

Restream multistreams one OBS feed to every platform at once, and gives you an embed player for your own site.

**Setup:** Channels → Add New → **Embed Player** → copy the iframe → paste it into Railway → Channel → Restream.

**What you're getting into, plainly:**

- The website player is a **paid Business plan feature**
- Up to **1,000 concurrent viewers**
- **~60 seconds of latency** — this is a broadcast, not a conversation
- **Restream's chat is not included** in the website player
- Max stream length 14 days; the embed code stays the same across streams

That chat gap is why the chat in this app is ours and not theirs. It's peer-to-peer, sub-second, and runs alongside whatever player you mirror.

**Latency matters for how you sell.** At 60 seconds behind, "first to tap gets it" isn't fair — some viewers see the offer a minute later than others. Push the offer, then leave it up for a few minutes. Or use the phone camera path, which is sub-second, for live 1/1 auctions.

## OBS

OBS 28 and later include **WebSocket v5 built in** — no plugin to install. Enable it under **Tools → WebSocket Server Settings**, copy the password from **Show Connect Info**, and the OBS tab can switch scenes, start and stop the stream, and record.

**The password never leaves your browser.** It talks to `127.0.0.1` on your own machine and is not sent to Railway or anywhere else.

**Where this doesn't work, and why:** browsers block an `https://` page from opening `ws://localhost` as mixed content. Chrome and Firefox make an exception for loopback addresses; **Safari and iOS do not.** So OBS control works on Chrome, Edge, or Firefox on the desktop. The app checks your browser and says so up front rather than failing with a blank error.

If you're on Safari or a phone, use the phone camera path or an embed instead. You lose nothing except scene switching.

## Railway

Railway runs the relay. Deploy is in `RAILWAY-SETUP.md` — about two minutes.

Worth knowing from their platform features: services get a free `.up.railway.app` domain with automatic TLS, up to 10 Gbps public transfer, healthcheck endpoints, and configurable **usage limits with hard and soft caps**. Set a spending limit on day one; it isn't on by default.

If you ever want to run your *own* RTMP ingest instead of Restream, Railway's **TCP proxy** supports non-HTTP protocols, and **volumes** go up to 5 TB. That's how you'd self-host a Restreamer or MediaMTX container. It's a real path, and it's also a real bill and a real ops burden — I'd use Restream until you have a reason not to.

---

## Which streaming path to pick

| | Latency | Viewers | Cost | Needs |
|---|---|---|---|---|
| **Phone camera** | <1s | ~5–10 | free | nothing |
| **Restream embed** | ~60s | 1,000 | Business plan | OBS |
| **YouTube Live** | 5–30s | unlimited | free | OBS or phone |
| **Twitch** | 3–10s | large | free | OBS + parent domain |
| **HLS / WHEP** | 1–20s | your CDN | your bill | your own service |

**Teaching a few people to build a card?** Phone camera. Sub-second, no accounts, no setup, and you can see them react.

**Broadcasting a build session to a crowd?** OBS → Restream or YouTube, mirrored here, with our chat underneath.

Both paths use the same chat, the same room, and the same live-offer button.

---

## Art files

There's no Adobe or Canva plug-in, and that's deliberate. Those integrations need server-side OAuth, an app review, and per-seat licensing — all three break the single-file, no-backend promise.

What works today with zero infrastructure: design in Canva, Photoshop, Photopea, or Figma; export a PNG; import it here. The **Art** tab links each one with its exact export settings, and checks any PNG you feed it for aspect ratio, resolution, and transparency before you waste material cutting it.

**The number to remember: 744 × 1039 px.** That's 300dpi at 63 × 88mm. Transparency on, or your cut-outs come out as white boxes.

---

## Verify the mirror claim

Don't take my word for it:

1. Mirror a Restream or YouTube embed
2. Open your browser's Network tab
3. Watch where the video bytes come from

They come from Restream's or Google's CDN, directly to the viewer. Railway's network graph stays flat. That's the whole design: **we connect, we never hold.**
