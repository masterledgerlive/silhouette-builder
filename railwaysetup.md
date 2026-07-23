# Railway Setup — the two-minute version

You only need this if you want the **Live Studio** (seeing who's online, chat, building together). Everything else — the builder, the xTool export, storage, the market — works with no server at all.

---

## What you're deploying

A relay. It does two things:

1. Tells people in the same room that each other exist
2. Passes the WebRTC handshake so their browsers can connect **directly**

Once two browsers are linked, card data flows between them and **never touches the server**. The relay is an introduction service, not a warehouse.

It has **zero npm dependencies** — no packages, no supply chain, nothing to audit but one file you can read in ten minutes.

---

## Deploy it

**1. Put the `relay/` folder in a GitHub repo.** New repo, upload the folder, done.

**2. Go to [railway.com](https://railway.com)** → sign in with GitHub → **New Project** → **Deploy from GitHub repo** → pick your repo.

Railway auto-detects Node from `package.json`. No configuration needed.

**3. Get your URL.** Settings → **Networking** → **Generate Domain**. You get something like `silouttes-relay-production.up.railway.app`.

**4. Test it.** Open `https://your-url.up.railway.app/health` in a browser. You should see:

```json
{"ok":true,"uptime":12}
```

If you see that, you're done. Total time: about two minutes.

**5. Paste the URL** into the builder: **Studio → Relay URL**. Connect.

---

## Lock it down (do this once you have a real site)

Railway → your service → **Variables** → add:

```
ALLOWED_ORIGINS = https://yourname.github.io
```

Now only your site can open a connection. Skip it while testing; set it before you tell anyone about it.

Other optional variables are in `.env.example`. The defaults are sensible — you don't need to touch them.

---

## What it costs

Railway gives you $5 in one-time trial credits, then it's the Hobby plan. This relay is tiny — no database, no disk, memory in the low tens of megabytes — so a small community fits comfortably in the cheapest tier.

**Set a spending limit in the Railway dashboard.** It isn't set by default, and that's the single most common way people get a surprise bill. Do it on day one.

Two other things worth knowing: Railway doesn't autoscale, so you adjust resources manually if you outgrow the defaults; and each redeploy has a brief moment of downtime while the container swaps. For a chat relay that means people reconnect. Not a problem here, but don't be surprised by it.

---

## Verify it yourself

Don't take my word for any of this:

| Check | How | Expected |
|---|---|---|
| Server is alive | Visit `/health` | `{"ok":true,...}` |
| It stores nothing | Visit `/metrics` | Counts only, plus a note saying no user data is stored |
| Rooms are isolated | Two browsers, different room names | Neither sees the other's chat |
| P2P actually engages | Connect two browsers, same room | Peer shows **P2P DIRECT** in orange |
| Data really bypasses the server | With P2P DIRECT showing, Railway → Metrics | Network traffic stays flat while you share builds |
| Restart forgets everything | Railway → Restart, then `/metrics` | Rooms and peers back to zero |

That fifth one is the important one. If the peer tag says **P2P DIRECT**, your card data is moving browser-to-browser and the relay is idle.

---

## When P2P fails

Roughly 10–15% of connections can't establish a direct link — usually strict corporate firewalls or symmetric NAT. The app falls back to relaying through the server, and the peer tag shows **relay-fallback** instead of **P2P DIRECT** so you always know which mode you're in.

In fallback mode your chat and build data *do* pass through the relay. It isn't stored, but it is transmitted. If that matters to you, add a TURN server (Metered, Twilio, or self-hosted coturn) — that's the standard fix and it's outside what this file does.

**The app tells you the truth about which mode you're in.** That's the part that matters.

---

## Running it locally instead

```bash
cd relay
node server.js
```

Then use `ws://localhost:8080` as your relay URL. No Railway account, no cloud, no cost. Good for testing on one machine or for a LAN party.

---

## Running the tests

```bash
cd relay
node test-relay.js
```

19 checks covering the handshake, room isolation, rate limiting, oversize payloads, disconnect cleanup, and confirmation that nothing is written to disk. All should pass.
