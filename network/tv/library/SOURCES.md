# Koda Kai TV — Library Data Sources (locations to data)

Our own library (`channels.json`) is *built by us* from public source data, so the
network never depends on VLC or on any one live playlist URL at watch time.
Refresh: `python3 build_library.py` (re-pulls every country file, re-parses, rewrites channels.json).

## Primary source — iptv-org (free-to-air, broadcaster-published streams only)
- Global index (huge, do not load live): https://iptv-org.github.io/iptv/index.m3u
- **Per-country playlists (what we build from):** https://iptv-org.github.io/iptv/countries/{cc}.m3u
  e.g. `.../countries/us.m3u`, `.../countries/in.m3u`, `.../countries/gb.m3u`
- Category playlists: https://iptv-org.github.io/iptv/categories/{news,music,documentary,...}.m3u
- Region playlists: https://iptv-org.github.io/iptv/regions/{region}.m3u
- Database/API (channel metadata, languages, broadcast areas): https://iptv-org.github.io/api/
  - channels.json · streams.json · logos · guides (EPG): https://iptv-org.github.io/epg.xml per-guide files under iptv-org/epg repo
- Repo: https://github.com/iptv-org/iptv — community-maintained; streams break/move often.
  Rule from the how2shout guide David supplied: a list promising premium pay-TV is not
  legitimate — free-to-air public/news/government/educational only. That is our line too.

## Secondary source — Free-TV (lean, curated, "fewer channels, all working")
- Playlist: https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8
- Use as the cross-check shelf: when a flagship channel dies in iptv-org, check Free-TV's URL.

## How VLC fits (David's reference: how2shout.com VLC guide)
VLC is a *player*, not a service: Media → Open Network Stream → paste M3U → Ctrl+L playlist.
Our TV page is that same open standard (M3U/HLS) with our own player, guide, caption bar
and language layer on top — no VLC install needed, works on the phone.

## Verified flagship streams (checked 2026-10-20, live 200 + browser CORS open)
- Al Jazeera Arabic — https://live-hls-web-aja.getaj.net/AJA/index.m3u8 (CORS reflects origin ✓)
- Al Jazeera English — https://live-hls-web-aje.getaj.net/AJE/index.m3u8 (200 ✓, same CDN family)
- NHK World Japan — https://masterpl.hls.nhkworld.jp/hls/w/live/master.m3u8 (CORS * ✓)
- DW English — https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8 (CORS * ✓)
- Red Bull TV — https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8 (CORS * ✓)
Browser playability is per-stream: channels.json entries are marked "library" until the
player actually plays them; the player reports a blocked/dead stream plainly, never fakes it.
