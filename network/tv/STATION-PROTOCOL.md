# 📡 KODA KAI STATION PROTOCOL — our Roku-equivalent stack v0.1
David's commission, 2026-10-20: "the all-in-one TV station… create the same protocols
Roku originally made and gather our own throughputs and connections."

Roku's real inventions were never the box — they were the agreements between parts:
a channel store, one search across services, one remote protocol (ECP), standard
stream formats (HLS/DASH). Ours, built from pieces we already own:

## KK-DIAL — the library protocol (built, live)
Channels are data, not apps: M3U/HLS entries in our own library files
(`library/countries/<cc>.json` + manifest), each with country, region, language,
group, logo, source. Any player that speaks KK-DIAL can render the whole dial.
Throughput rule: library is *ours* (refreshed from sources by build_library.py),
never a live dependency on someone else's playlist URL.

## KK-FIND — one search across every avenue (built v1, live in TV v2)
One box searches, in lanes, everything we can legitimately reach:
1. **Our dial** — 5,965 free-to-air channels (play in our player)
2. **Blob Cinema** — our own Walrus-blob films (play in the cinema viewer)
3. **TVmaze** — world TV show index (free API, no key): where a show lives, its data
4. **iTunes Search** — movies, TV, podcasts, audiobooks (free API, no key): artwork,
   store/preview links, prices where listed
5. **Your subscriptions** — finder results deep-link to the service's own app/page.
   Honest rule: DRM subscription video plays in *its* app, never re-hosted in ours;
   our job is to *find it and point*, in one search, from any country view.
Educated guesses: the Finder ranks by the viewer's Likes profile (below), region,
and lane trust (owned → free-to-air → subscription pointer). Guesses are labeled
as guesses ("Picked because you liked…"), never as facts about the title.

## KK-TASTE — the likes engine (built v1)
♡ on any channel/title feeds a local profile (device-local first, blob-synced later):
liked groups, countries, languages, titles. The Surprise Carousel is populated from
it — picks weighted by taste + a deliberate slice of serendipity from other regions,
because a carousel that only mirrors you is a cage. Safe-content rule: kids' spaces
only ever surface Kids-Mode-approved lanes (Courtesy Gate + approved lists).

## KK-CONTROL — one controller for every screen (wiring v1)
Roku's ECP let any device drive the box. Ours already exists in pieces:
- **This page:** keyboard (↑/↓ channels) + standard Gamepad API — any controller
  paired to any computer drives the TV (D-pad = channels, A = play/pause, B = back/mute, Y = surf)
- **Kodakai Control Plane** (built 2026-10-10): the universal MIDI surface on Shadow,
  skins incl. VIDEO, reachable in any browser (midi.gamemaster.quest/capture) — the
  MPK or a phone drives the station the same way it drives TikTok/Music
- **Muse Hands + CueDeck:** the director layer (screen 2) for the live station
KK-CONTROL v1 = these three documented as one surface with one mapping table.
No new install: browser + what David already owns.

## KK-RELAY — the VPN country switch (research → showdown → podcast)
A VPN is a *throughput*, not a feature we fake: the page's country switch plans the
watching (which channels/services a country unlocks from our library + finder), and
the chosen VPN app does the actual routing. Doctrine:
- Four finalists, chosen by streaming-unlock record + independent speed tests
- A panel-of-judges podcast picks TWO winners (primary + backup — when one system
  goes down, the race switches, per David's rule) and says why, on the record
- Affiliate/referral codes: only after David signs up on his exact word; codes then
  live on the TV page so anyone can use them. Nothing is signed up in his name by
  research alone. Free-first: trial / money-back windows are the test track.
- The switch must be honest in the UI: "VPN: not connected" until a real connection
  exists. The page never claims a country it isn't actually routed through.

## Station identity
Koda Kai TV is a *station*, not an app store: one dial (KK-DIAL), one finder (KK-FIND),
one taste (KK-TASTE), one controller (KK-CONTROL), one country switch (KK-RELAY),
and the Language Sublayer under all of it (see LANGUAGE-SUBLAYER.md).
Every country, every screen, same station.
