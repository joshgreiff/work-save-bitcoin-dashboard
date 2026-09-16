<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Work Save Bitcoin Dashboard — Agent Rules

* This repository powers the public Work Save Bitcoin Fiat Freedom Portfolio dashboard.
* The actual portfolio, WSB Bitcoin Reserve, and hypothetical income model are independent accounting entities.
* Never combine Bitcoin Reserve value with securities-portfolio value or performance.
* Never count personal deposits, channel revenue, affiliate revenue, or viewer support as investment returns.
* Never request, store, or connect Robinhood credentials.
* Never expose brokerage account numbers, wallet credentials, seed phrases, xpubs, private financial documents, tax records, private donor information, or authentication secrets.
* All publicly displayed figures must come from validated data files or documented derived calculations.
* Store raw inputs and calculate aggregates in shared accounting utilities. Do not duplicate financial calculations inside UI components.
* Every dated metric must include an `asOf` or valuation timestamp.
* Never present stale data as live.
* Update methodology documentation when calculation behavior changes.
* Run linting, tests, and production build before completing a change.
* Confirm mobile responsiveness at a 375-pixel viewport.
* Do not deploy without explicit user approval.
