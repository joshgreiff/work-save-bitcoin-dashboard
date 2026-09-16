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
| `npm start` | Serve production build |

## Updating portfolio data

Edit `data/portfolio.json` and `data/transactions.json`. Use integer cents. Mark unknown prices as `null`. Run `npm test` and `npm run build`.

## Adding an episode

See [docs/EPISODE_2.md](docs/EPISODE_2.md) for the exact Episode 2 checklist.

1. Append a snapshot to `data/episodes.json` with a unique `episodeNumber` and `slug`.
2. Add related rows to `data/transactions.json`.
3. Update `data/portfolio.json` current valuation fields and positions.
4. Optionally update `data/market-prices.json` and `data/issuer-metrics.json` with cited figures.
5. Do **not** rewrite prior episode snapshots unless correcting a documented error.

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
