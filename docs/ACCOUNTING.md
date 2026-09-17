# Accounting

All amounts use **integer cents** for fiat and **integer satoshis** for Bitcoin. Primary valuation timezone: `America/New_York`.

## Net external contributions

```
Net external contributions
= total external contributions
- external withdrawals
```

Only transactions with `externalCashFlow: true` count. Contribution categories include initial funding, personal, YouTube/affiliate/sponsorship revenue contributions, and viewer-support contributions into the securities account.

**Example:** Initial funding $1,999.91 + later personal $500 − withdrawal $100 → net external contributions $2,399.91.

## Investment profit or loss

```
Total investment profit or loss
= current portfolio value
+ investment-related withdrawals
- total external contributions
```

**Example:** Contributions $1,999.91, current value $1,999.91 → investment P&L $0. A deposit must not create profit.

If a dividend remains as cash in the account, it is already inside current portfolio value and must not be added again on top of P&L.

## Look-through Bitcoin exposure

```
Look-through BTC exposure (sats)
= shares owned × diluted sats per share
```

```
Total look-through exposure
= sum of eligible positions’ look-through sats
```

Preferred securities, ETFs, cash, and issuers without usable disclosures are excluded or marked unavailable.

## Bitcoin Reserve

```
Current reserve sats
= total sats received
- sats sent
- network fees
```

Reserve USD changes never enter securities-portfolio performance.

## Income model

```
Deployable value = portfolio value − excluded cash
Allocated capital = deployable value × target allocation
Modeled shares = allocated capital ÷ price  (or floor for whole-share mode)
Projected annual income = modeled shares × annual distribution per share
Monthly income = annual income ÷ 12
```

WSB Bitcoin Reserve is never deployable capital.

## Fiat Freedom Income Model / Scenario Lab

The Income Model is a **hypothetical** third ledger. It may use the actual portfolio’s deployable liquidation value as an input, but it must never mutate portfolio JSON, episode snapshots, contribution records, reserve balances, or reported investment performance.

* **Income Today** — deterministic gross-income calculator from allocations, prices, and indicated distributions.
* **Scenario Lab** — user-assumption projections for BTC, MSTR (NAV × mNAV), and preferreds (distribution + required-yield terminal). Presets are labeled illustrative only.
* **Security Comparison** — historical risk metrics only when verified total-return history exists; otherwise “Insufficient history.”

STRF seed terms use stated-amount × fixed rate for income and market price for current yield. STRC’s variable rate is dated/editable and must not be treated as a permanent constant.

## Valuation history (open / close)

Official chart series come from append-only session points in `data/valuation-history.json`:

* `portfolioValueCents` at each open/close is the stored account mark (not recomputed).
* Contribution-adjusted portfolio return at each point uses the same P&L formula as the live portfolio, with contributions as of the ledger (currently cumulative through current transactions).
* BTC / SPY / GLD percentage and cash-flow-matched legs appear only when confirmed `prices` exist for that session (or earlier sessions for cash-flow matching).
* After-hours marks stay informational and must not be written as `session: "close"`.
