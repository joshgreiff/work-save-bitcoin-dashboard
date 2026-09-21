import { describe, expect, it } from "vitest";
import {
  appendLiveTrailingChartPoints,
  lastConfirmedBenchmarkPrices,
} from "@/lib/accounting/live-chart-trail";

describe("live trailing chart tip", () => {
  const valueChart = [
    { label: "Sep 16 inception", value: 1999.91 },
    { label: "Sep 16 market close", value: 1996.92 },
    { label: "Sep 17 market close", value: 2082.35 },
  ];
  const cashFlowChart = [
    { label: "Sep 16 inception", portfolio: 1999.91, btc: 2000, spy: 1990, gld: 1980 },
    { label: "Sep 16 market close", portfolio: 1996.92, btc: 1980, spy: 1985, gld: 1990 },
    { label: "Sep 17 market close", portfolio: 2082.35, btc: 2050, spy: 2010, gld: 2000 },
  ];
  const lastBenchmarkPrices = { btc: 100_000, spy: 650, gld: 250 };

  it("keeps historical points and appends a live tip when live is present", () => {
    const result = appendLiveTrailingChartPoints({
      valueChart,
      cashFlowChart,
      lastBenchmarkPrices,
      live: {
        portfolioDollars: 2150.5,
        asOf: "2026-09-18T11:30:00-04:00",
        btcDollars: 102_000,
        spyDollars: 660,
        gldDollars: 255,
      },
    });

    expect(result.usingLive).toBe(true);
    expect(result.valueChart).toHaveLength(4);
    expect(result.valueChart.slice(0, 3)).toEqual(valueChart);
    expect(result.valueChart[3]?.label).toMatch(/Sep 18 live/i);
    expect(result.valueChart[3]?.value).toBe(2150.5);

    expect(result.cashFlowChart).toHaveLength(4);
    expect(result.cashFlowChart[3]?.portfolio).toBe(2150.5);
    expect(result.cashFlowChart[3]?.btc).toBeCloseTo(2050 * (102_000 / 100_000), 8);
    expect(result.cashFlowChart[3]?.spy).toBeCloseTo(2010 * (660 / 650), 8);
    expect(result.cashFlowChart[3]?.gld).toBeCloseTo(2000 * (255 / 250), 8);
  });

  it("returns historical series unchanged when live is unavailable", () => {
    const result = appendLiveTrailingChartPoints({
      valueChart,
      cashFlowChart,
      lastBenchmarkPrices,
      live: null,
    });
    expect(result.usingLive).toBe(false);
    expect(result.valueChart).toEqual(valueChart);
    expect(result.cashFlowChart).toEqual(cashFlowChart);
  });

  it("reads the latest confirmed benchmark prices from the series", () => {
    expect(
      lastConfirmedBenchmarkPrices([
        { btc: 1, spy: null, gld: 3 },
        { btc: null, spy: 2, gld: null },
        { btc: 4, spy: null, gld: 5 },
      ]),
    ).toEqual({ btc: 4, spy: 2, gld: 5 });
  });
});
