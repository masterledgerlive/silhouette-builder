# 🌊 KODA KAI LANGUAGE SUBLAYER — Specialist Plugin Spec v0.1
David's commission, 2026-10-20. Status: SPEC + TV v1 wiring. Nothing deployed.

## What it is
An agentic AI layer that sits *under every language* in the Koda Kai Network —
under Radio, TV, Kids Mode and the podcasts. It does not translate word-for-word.
It translates **register**: the cultural tone, verbiage and normality of a region —
how people there actually speak when they're being ordinary, polite, funny, or blunt.
Slang is the proof: slang is born inside a language's own context, so the layer's job
is to find the *equivalent context* in the other tongue, not the literal words.

## The five organs

### 1. Region Profile (the "common tongue" card)
Per language/region: formality defaults, directness norm, humor style, topics handled
gently, everyday greetings/closings, current slang with glosses, and words that carry
more weight there than an outsider expects. Stored as small JSON cards — one per region —
so a card can be downloaded, carried offline, and later live in Walrus blobs as a
versioned, hash-verified pack (same rule as blob cinema: a receipt is not proof;
a pack is trusted only after hash-verify read-back).

### 2. The Courtesy Gate (the Hopi rule) — David's design, binding
Some languages — Hopi is David's example — are described as having a smaller, happier
lexicon where words of hate are simply not known or taught. The layer honors that as law:
- **Never render a hate word, slur or curse INTO a language/culture whose common tongue
  doesn't carry it.** Not repeated, not "explained by saying it." It is *described*
  respectfully instead: "a harsh insult about [topic] — not spoken in this tongue."
- The same gate runs in reverse for kids' mode and family spaces, any language.
- We do not heighten a people's vocabulary with our worst words. We heighten *our own*
  tongue when we have the visual aid (see Lens, below) — learning flows toward us.
- Describing is always allowed; repeating is the thing that's gated. Tone of the
  description stays neutral and brief — a translator's courtesy, not a lecture.

### 3. The Visual Thesaurus Lens (dictionary in the eyes)
When a caption/transcript line is on screen, any word is tappable:
- definition in plain words, pronunciation, part of speech
- **Say it softer / Say it local / Say it formal** — three swaps for the same meaning
  at three registers, drawn from the Region Profile + thesaurus data
- "Swap" rewrites the displayed line in place, so the viewer *sees* their own language
  get richer (David: "heighten our own tongue when we have visual aid in the eyes")
- every swap is logged to the viewer's personal phrasebook (localStorage first;
  blob-synced later) — the layer literally learns the viewer's growing vocabulary.

### 4. Transcript Learning Loop
The layer feeds on real speech, in this order of trust:
1. The stream's own caption/subtitle tracks (VLC-style: embedded CEA-608/708 in HLS,
   WebVTT sidecars, broadcaster subtitle tracks — try the built-in layers first)
2. Our own ASR — the same faster-whisper large-v3 stack that already does Kids Mode
   read-along (94% word match on Shadow), run per channel in windows
3. News/wire copy from the same region (already flowing through the Network news engine)
What it learns, per region: which words are *normal* there this month, new slang as it
is born, tone shifts. Learnings land as proposed Region Profile edits — graded, dated,
source-attached (historian rules: no free-floating claims), never silently merged.

### 5. Model Chassis (pluggable, free-first, offline-capable)
The layer is a chassis, not a model. It refines on top of whatever top-quality engine
is present, in David's standing free-first order:
- Live engines when available (Google-class translation, the big LLMs via our routers)
- Downloadable offline packs for no-internet use: open translation models
  (Argos Translate language packs / NLLB-class distilled models) + offline thesaurus
  and dictionary data + the Region Profile cards — one "language pack" per region
- Later: packs live in Walrus blobs (versioned, renewal-owned like Blob Cinema films)
  so the network's TVs/radios pull the same verified pack everywhere
Routing rule is the Series-12 ladder: FREE_LOCAL → FREE_TIER → CREDIT → PAID,
and PAID only on David's gate. The chassis logs which engine produced each rendering,
so quality is auditable per engine, per region.

## Where it plugs in
- **Koda Kai TV (built first, v1 in tv.html):** caption bar under the picture
  (house rule: captions never cover the image), region tuner sets the Profile,
  Lens on every caption/info word, Courtesy Gate on all rendered text.
- **Radio:** DJ intros/outros rendered at the station region's register; slang glossed.
- **Kids Mode:** read-along captions pass the Courtesy Gate always; Lens becomes
  the tap-a-word dictionary the kids already expect from read-along.
- **Podcasts/Decoder:** foreign quotes arrive with register notes, not just translations.

## Honesty rules (standing)
- No invented transcripts: a channel with no caption source says so on screen.
- Demo/example lines are labeled DEMO wherever they stand in for a live feed.
- A translation is labeled with its engine + confidence lane (built-in track / ASR / model).
- Region Profiles are evidence-graded like historian work — a profile claim carries
  its source, or it doesn't ship.
