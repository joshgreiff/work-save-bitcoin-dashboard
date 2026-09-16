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
