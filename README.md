# Vice City Nights — Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/indraHA01/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/indraHA01/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn any photo and a caption into GTA 6-style cover art, right in the browser —
no upload, no account, no network. Built for the
[make.fun GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Multi-panel poster builder** — three layouts: Comic Trio (hero panel + two
  stacked), Four Corners (2×2 grid), and Full Bleed (one photo, edge to edge).
- **Any photo** — load your own photos from your machine, one per panel or the
  same photo across all panels. Click a panel to select it, drag to pan, use the
  zoom slider to crop exactly how you want it.
- **Bold caption lettering** — a big condensed title (Anton, SIL OFL) with a
  hard outline and drop shadow, plus a neon script subtitle (Pacifico, SIL OFL).
- **One-click looks** — Sunset, Neon Nights and Vice Pink colour grades, each
  with its own retro sun, gradient sky and palm silhouettes, drawn procedurally.
- **Fast and easy** — photo in, PNG out in seconds, in the three common post
  sizes: 1080×1080, 1080×1350 and 1920×1080. Live preview while you edit.
- **Fully offline** — static files under `app/` only; every font, sample photo
  and script is a local file. Your photos never leave your machine.

## Try it

```sh
node serve.ts   # or any static server over app/
# open http://localhost:8080
```

1. Pick a layout and a look.
2. Click a panel, add a photo (or try a sample), drag to position it.
3. Type the title and subtitle.
4. Pick a size and hit **Export PNG**.

Screenshots in `screenshots/` are fixed scenes of the app itself
(`?shot=cover` / `?shot=editor` with a sample photo and caption) — the
exported covers shown there are the PNGs this app draws.

## Layout

- `main.ts` — hands `app/` and `screenshots/` in (Node 22, standard library only)
- `app/index.html` — the editor page
- `app/style.css` — editor styling
- `app/src/cover.js` — the cover renderer: layouts, grades, lettering, grain
- `app/src/main.js` — editor wiring: panels, uploads, drag-to-pan, export
- `app/src/shots.js` — fixed `?shot=` scenes for screenshots
- `app/fonts/` — Anton + Pacifico under the SIL Open Font License
- `app/samples/` — two sample photos made with an image model for make.fun

Everything is original: no Rockstar Games logo, artwork, character or font.
The palm trees, sun and sky are drawn in code; the lettering uses OFL fonts.
