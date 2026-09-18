import { readFileSync } from "node:fs";
import path from "node:path";
import { donationsFileSchema } from "@/lib/schemas/donations";
import { episodesFileSchema } from "@/lib/schemas/episodes";
import {
  incomeHistoryFileSchema,
  incomeModelSchema,
  incomeSecuritiesFileSchema,
} from "@/lib/schemas/income-model";
import { issuerBitcoinPerShareFileSchema } from "@/lib/schemas/issuer-bps-history";
import { issuerMetricsFileSchema } from "@/lib/schemas/issuer-metrics";
import { marketObservationsFileSchema } from "@/lib/schemas/market-observations";
import { marketPricesFileSchema } from "@/lib/schemas/market-prices";
import { portfolioSchema } from "@/lib/schemas/portfolio";
import { reserveFileSchema } from "@/lib/schemas/reserve";
import { siteConfigSchema } from "@/lib/schemas/site-config";
import { transactionsFileSchema } from "@/lib/schemas/transactions";
import { valuationHistoryFileSchema } from "@/lib/schemas/valuation-history";

const DATA_DIR = path.join(process.cwd(), "data");

function readJsonFile(filename: string): unknown {
  const fullPath = path.join(DATA_DIR, filename);
  const raw = readFileSync(fullPath, "utf8");
  return JSON.parse(raw) as unknown;
}

function parseOrThrow<T>(
  filename: string,
  result: { success: true; data: T } | { success: false; error: { message: string } },
): T {
  if (!result.success) {
    throw new Error(`Invalid data file ${filename}: ${result.error.message}`);
  }
  return result.data;
}

export function loadSiteConfig() {
  return parseOrThrow("site-config.json", siteConfigSchema.safeParse(readJsonFile("site-config.json")));
}

export function loadPortfolio() {
  return parseOrThrow("portfolio.json", portfolioSchema.safeParse(readJsonFile("portfolio.json")));
}

export function loadEpisodes() {
  return parseOrThrow("episodes.json", episodesFileSchema.safeParse(readJsonFile("episodes.json")));
}

export function loadTransactions() {
  return parseOrThrow(
    "transactions.json",
    transactionsFileSchema.safeParse(readJsonFile("transactions.json")),
  );
}

export function loadMarketPrices() {
  return parseOrThrow(
    "market-prices.json",
    marketPricesFileSchema.safeParse(readJsonFile("market-prices.json")),
  );
}

export function loadIssuerMetrics() {
  return parseOrThrow(
    "issuer-metrics.json",
    issuerMetricsFileSchema.safeParse(readJsonFile("issuer-metrics.json")),
  );
}

export function loadReserve() {
  return parseOrThrow(
    "reserve-transactions.json",
    reserveFileSchema.safeParse(readJsonFile("reserve-transactions.json")),
  );
}

export function loadDonations() {
  return parseOrThrow(
    "donations.json",
    donationsFileSchema.safeParse(readJsonFile("donations.json")),
  );
}

export function loadValuationHistory() {
  return parseOrThrow(
    "valuation-history.json",
    valuationHistoryFileSchema.safeParse(readJsonFile("valuation-history.json")),
  );
}

export function loadIncomeModel() {
  return parseOrThrow(
    "income-model.json",
    incomeModelSchema.safeParse(readJsonFile("income-model.json")),
  );
}

export function loadIncomeSecurities() {
  return parseOrThrow(
    "income-securities.json",
    incomeSecuritiesFileSchema.safeParse(readJsonFile("income-securities.json")),
  );
}

export function loadIncomeHistory() {
  return parseOrThrow(
    "income-history.json",
    incomeHistoryFileSchema.safeParse(readJsonFile("income-history.json")),
  );
}

export function loadMarketObservations() {
  return parseOrThrow(
    "market-observations.json",
    marketObservationsFileSchema.safeParse(readJsonFile("market-observations.json")),
  );
}

export function loadIssuerBpsHistory() {
  return parseOrThrow(
    "issuer-bps-history.json",
    issuerBitcoinPerShareFileSchema.safeParse(
      readJsonFile("issuer-bps-history.json"),
    ),
  );
}

export function validateAllDataFiles(): void {
  loadSiteConfig();
  loadPortfolio();
  loadEpisodes();
  loadTransactions();
  loadMarketPrices();
  loadIssuerMetrics();
  loadReserve();
  loadDonations();
  loadValuationHistory();
  loadMarketObservations();
  loadIssuerBpsHistory();
  loadIncomeModel();
  loadIncomeSecurities();
  loadIncomeHistory();
}
