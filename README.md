# Work Save Bitcoin | Fiat Freedom Portfolio

Public, mobile-responsive dashboard for the Work Save Bitcoin YouTube channel and its recurring Fiat Freedom Portfolio series.

The site documents three financially separate components:

1. **Actual securities portfolio** — Bitcoin treasury equities and preferred securities.
2. **WSB Strategic Bitcoin Reserve** — Bitcoin from voluntary channel support (no ownership claim).
3. **Fiat Freedom Income Model** — Hypothetical income if the securities portfolio were converted today.

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run build` | Production build (also validates data files) |
| `npm run quotes` | Print live Coinbase/Yahoo marks (informational) |
| `npm run sync:episodes` | Refresh YouTube feed + report unmatched series videos (`--apply` drafts snapshots) |
| `npm start` | Serve production build |

## Updating portfolio data

Edit `data/portfolio.json` and `data/transactions.json`. Use integer cents. Mark unknown prices as `null`. Run `npm test` and `npm run build`.

## Appending open / close valuation history

Edit `data/valuation-history.json` (append-only). Each trading day that should appear on charts needs up to two points:

1. **Open** — `session: "open"`, typically `09:30:00-04:00` (or `-05:00` in EST), with `portfolioValueCents` when known.
2. **Close** — `session: "close"`, typically `16:00:00-04:00` / `-05:00`, matching the official regular-market account snapshot.

Rules:

* Unique `id` (e.g. `vh-2026-09-17-close`) and unique `asOf|session` pairs.
* Set BTCUSD / SPY / GLD (and optional holding) prices only when confirmed; otherwise leave `null` — never invent.
* Do not rewrite prior points unless correcting a documented error.
* Charts and `/api/public-dashboard` derive series from this file.
* Optional helper: `npm run quotes` prints live Coinbase/Yahoo marks for drafting a close — still confirm before writing history.

## Live quotes (informational)

* Endpoint: `/api/live-quotes`
* Live income (informational): `/api/live-income-model`
* UI panel on home and portfolio pages
* CLI: `npm run quotes`
* Sources: Coinbase BTC-USD spot; Yahoo Finance chart for equities/preferreds
* Not written into official episodes or valuation-history unless you manually confirm and paste values

## Adding an episode

Manual checklist (still the source of truth for official values):

1. Append a snapshot to `data/episodes.json` with a unique `episodeNumber` and `slug`.
2. Add related rows to `data/transactions.json` when needed.
3. Update `data/portfolio.json` current valuation fields and positions.
4. Append matching close rows to `data/valuation-history.json` and `data/market-observations.json`.
5. Optionally update `data/market-prices.json` and `data/issuer-metrics.json` with cited figures.
6. Do **not** rewrite prior episode snapshots unless correcting a documented error.

### Automatic YouTube sync

```bash
npm run sync:episodes              # refresh data/youtube-feed.json + list unmatched series videos
npm run sync:episodes -- --apply   # also append draft episode snapshots from the latest official close ≤ publish time
```

Rules:

* Series videos are channel uploads on/after `2026-09-16`.
* `--apply` never invents closes — it requires a stored `market_close` observation at or before publish.
* Draft notes should be reviewed; official narration can replace auto-draft text.
* Historical episode values remain frozen.

## Updating issuer metrics

Edit `data/issuer-metrics.json`. Prefer company IR releases and SEC filings. Include `sourceName`, `sourceUrl`, `asOf`, and `retrievedAt`.

## Updating the Bitcoin Reserve

Edit `data/reserve-transactions.json`. Categories: `contribution_received`, `sats_sent`, `network_fee`, `correction`. Never set portfolio-performance flags.

## Editing the income model

Edit `data/income-model.json`. Either leave `securities` empty (unconfigured) or provide allocations totaling exactly `10000` basis points.

## Public data

* `/data/portfolio.json` — sanitized portfolio file
* `/api/public-dashboard` — consolidated public dashboard JSON

## Deployment notes

Do not deploy without explicit approval. Set `canonicalBaseUrl` in `data/site-config.json` before production.
