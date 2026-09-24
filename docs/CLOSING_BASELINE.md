# Closing baseline checklist

## Completed — Episode 1 inception

- [x] Inception valuation: `2026-09-16T08:00:00-04:00`
- [x] Portfolio value: `$1,999.91` (`199991` cents)
- [x] `valuationType: inception`

## Completed — Sep 16, 2026 regular close

- [x] Official close valuation: `2026-09-16T16:00:00-04:00`
- [x] Portfolio value: `$1,996.92` (`199692` cents)
- [x] `valuationType: market_close`
- [x] Synchronized BTC: `$75,980.71` (Coinbase 1-minute candle at 20:00 UTC)
- [x] Unadjusted equity closes: MSTR `$126.18`, ASST `$27.41`, MPJPY `$1.53`, SPY `$754.05`, GLD `$391.74`
- [x] After-hours `$2,006.94` stored as informational only (not official)

## Completed — Sep 17, 2026 regular close

- [x] Official close valuation: `2026-09-17T16:00:00-04:00`
- [x] Portfolio value: `$2,082.35` (`208235` cents) = `12.12×$132.25 + 13.7×$28.28 + 59×$1.56`
- [x] Synchronized BTC: `$76,466.21` (Coinbase 1-minute candle at 20:00 UTC)
- [x] Unadjusted equity closes: MSTR `$132.25`, ASST `$28.28`, MPJPY `$1.56`, SPY `$762.60`, GLD `$398.36`
- [x] First synchronized MSTR-vs-BTC completed-session comparison populated

## Completed — Sep 18, 2026 regular close

- [x] Official close: `$2,376.27` (`237627` cents) = `12.12×$153.92 + 13.7×$30.09 + 59×$1.67`
- [x] Synchronized BTC: `$81,055.26`
- [x] Episode 3 (“Will MSTR Outperform Bitcoin?”) valued at Sep 17 close

## Completed — Sep 21, 2026 regular close

- [x] Official close: `$2,567.48` (`256748` cents) = `12.12×$168.50 + 13.7×$30.33 + 59×$1.86`
- [x] Synchronized BTC: `$86,562.31`
- [x] Episode 4 (“…Up 26% in One Week”) valued at Sep 21 close

## Completed — Sep 22, 2026 regular close (automated)

- [x] Official close: `$2,539.88` (`253988` cents) = `12.12×$167.33 + 13.7×$29.35 + 59×$1.86`
- [x] MPJPY prior close carried forward due to no reported session print (Sep 21 `$1.86`, `fallbackUsed: true`)
- [x] Synchronized BTC: `$86,226.05`

## Completed — Sep 23, 2026 regular close (automated)

- [x] Official close: `$2,468.63` (`246863` cents) = `12.12×$162.20 + 13.7×$28.99 + 59×$1.79`
- [x] Synchronized BTC: `$84,535.51`
- [x] Current portfolio mark advanced by `npm run close:append`

## Still pending

- [ ] Confirmed regular-session cash balance (do not use buying power)
