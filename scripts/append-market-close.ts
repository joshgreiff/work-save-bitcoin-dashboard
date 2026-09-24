#!/usr/bin/env tsx
/**
 * Append official 4:00 p.m. Eastern market-close snapshots.
 *
 * Usage:
 *   npx tsx scripts/append-market-close.ts                 # dry-run catch-up
 *   npx tsx scripts/append-market-close.ts --write         # write catch-up
 *   npx tsx scripts/append-market-close.ts --date 2026-09-22 --write
 */
import {
  appendMarketCloseCatchUp,
  appendMarketCloseForDay,
} from "../src/lib/quotes/append-market-close";

function parseArgs(argv: string[]) {
  let write = false;
  let date: string | undefined;
  let catchUp = true;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--write") write = true;
    else if (arg === "--date") {
      date = argv[++i];
      catchUp = false;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Append official market-close rows (Coinbase 4pm BTC + Yahoo unadjusted equity closes).

Options:
  --write          Persist data files (default is dry-run)
  --date YYYY-MM-DD  Append a single session day instead of catch-up
`);
      process.exit(0);
    }
  }
  return { write, date, catchUp };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const results = args.date
    ? [await appendMarketCloseForDay({ sessionDay: args.date, write: args.write })]
    : await appendMarketCloseCatchUp({ write: args.write });

  if (results.length === 0) {
    console.log("No missing weekday closes to append.");
    return;
  }

  for (const result of results) {
    if (result.status === "skipped") {
      console.log(`SKIP ${result.sessionDay}: ${result.reason}`);
      continue;
    }
    const mode = result.wrote ? "WROTE" : "DRY-RUN";
    console.log(
      `${mode} ${result.sessionDay}: portfolio=${result.snapshot.portfolioValueCents} (${(result.snapshot.portfolioValueCents / 100).toFixed(2)}) BTC=${result.snapshot.prices.BTCUSD} MSTR=${result.snapshot.prices.MSTR} ASST=${result.snapshot.prices.ASST} MPJPY=${result.snapshot.prices.MPJPY}`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
