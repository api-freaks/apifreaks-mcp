import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { READ_ONLY, type Params } from "../constants.js";

const UPDATE_INTERVAL_DESC =
  "Each symbol has its own updateInterval: PER_SECOND, PER_MINUTE, PER_10_MINUTES, " +
  "PER_HOUR, PER_DAY, PER_WEEK, or PER_MONTH. Use 'commodity_symbol_info' (or 'commodity_symbols') to read it — " +
  "price endpoints do not return freshness.";

const SYMBOL_DESC =
  "Comma-separated commodity symbols (e.g. 'XAU,XAG,WTIOIL-SPOT'). " +
  "If unsure of the exact symbol, use 'commodity_symbols' first. " +
  "If some symbols cannot be resolved, they appear in an 'unresolved' map " +
  "(often with close-match suggestions) while rates for the rest are still returned. " +
  "If none resolve, the request fails.";

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "commodity_symbols",
    {
      title: "Commodity Symbols",
      description:
        "List all 245+ supported commodity symbols across metals, energy, agriculture, industrial, " +
        "raw materials, oils and meals, textiles, meats, poultry, and livestock. " +
        "Each entry includes symbol, name, category, pricing currency, unit, status, and updateInterval " +
        "(PER_SECOND, PER_MINUTE, PER_10_MINUTES, PER_HOUR, PER_DAY, PER_WEEK, or PER_MONTH — the symbol's own refresh cadence). " +
        "Deprecated symbols stay listed with status 'inactive' and a deprecationDate — " +
        "historical rates remain available up to that date, but latest rates do not.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      const data = await callApi(ENDPOINTS.COMMODITY_SYMBOLS, apiKey);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "commodity_symbol_info",
    {
      title: "Commodity Symbol Info",
      description:
        "Validate a commodity symbol and return its full metadata, including updateInterval " +
        "(the symbol's own refresh cadence: PER_SECOND, PER_MINUTE, PER_10_MINUTES, PER_HOUR, PER_DAY, PER_WEEK, or PER_MONTH), " +
        "plus name, category, status, currency, unit, and optional exchange/deprecationDate. " +
        "Use this instead of 'commodity_symbols' when you already have a symbol. " +
        "If status is 'inactive', latest rates are unavailable and historical rates stop at deprecationDate.",
      inputSchema: z.object({
        symbol: z
          .string()
          .describe(
            "The commodity symbol to look up (e.g. 'XAU', 'WTIOIL-SPOT').",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ symbol }) => {
      const data = await callApi(ENDPOINTS.COMMODITY_SYMBOLS, apiKey);
      const upper = symbol.toUpperCase();
      const list = data["symbols"];
      const match = Array.isArray(list)
        ? list.find(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              String(
                (item as Record<string, unknown>)["symbol"] ?? "",
              ).toUpperCase() === upper,
          )
        : undefined;
      if (match === undefined) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Symbol '${symbol}' not found. Use 'commodity_symbols' to browse all available symbols.`,
            },
          ],
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(match) }],
      };
    },
  );

  server.registerTool(
    "commodity_quotes",
    {
      title: "Commodity Quote Currencies",
      description:
        "List all supported commodity quote currencies with symbol and currency name. " +
        "Use before 'commodity_latest_rates' when converting prices into a target quote currency.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      const data = await callApi(ENDPOINTS.CURRENCY_SUPPORTED, apiKey);
      const supported = (data["supportedCurrenciesMap"] ??
        {}) as unknown as Record<string, Record<string, unknown>>;
      const fiat = Object.values(supported)
        .filter(
          (c) =>
            c["countryCode"] !== "Crypto" &&
            c["countryCode"] !== "Metal" &&
            c["countryCode"] != null &&
            String(c["status"] ?? "").toUpperCase() === "AVAILABLE",
        )
        .map((c) => ({
          code: c["currencyCode"] ?? c["code"],
          name: c["currencyName"] ?? c["name"],
        }))
        .sort((a, b) =>
          String(a.code ?? "").localeCompare(String(b.code ?? "")),
        );
      if (!fiat.length)
        return {
          content: [
            {
              type: "text" as const,
              text: "No supported fiat quote currencies found.",
            },
          ],
        };
      const text =
        "Supported commodity quote currencies:\n" +
        fiat.map((c) => `- ${c.code} (${c.name})`).join("\n");
      return { content: [{ type: "text" as const, text }] };
    },
  );

  server.registerTool(
    "commodity_latest_rates",
    {
      title: "Commodity Latest Rates",
      description:
        "Get the latest prices for one or more commodities, with unit and currency metadata. " +
        "An optional quote parameter converts prices into a target currency. " +
        "If quote conversion is temporarily unavailable, rates stay in each commodity's default currency and a warning is returned. " +
        UPDATE_INTERVAL_DESC,
      inputSchema: z.object({
        symbols: z.string().describe(SYMBOL_DESC),
        quote: z
          .string()
          .optional()
          .describe(
            "Target currency for the price (e.g. USD, EUR). Defaults to the market currency of each commodity. If unsure, use 'commodity_quotes' first.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ symbols, quote }) => {
      const params: Params = { symbols };
      if (quote !== undefined) params["quote"] = quote;
      const data = await callApi(ENDPOINTS.COMMODITY_LATEST, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "commodity_historical_rates",
    {
      title: "Commodity Historical Rates",
      description:
        "Get OHLC (open, high, low, close) prices for commodities on a specific date, from January 1990 onwards. " +
        "If a symbol has no rate on the requested date, the API falls back to the last available rate before it " +
        "and returns that earlier date on the rate object. " +
        "Symbols with updateInterval PER_MONTH only have a closing price — open, high, and low come back as 0.",
      inputSchema: z.object({
        symbols: z.string().describe(SYMBOL_DESC),
        date: z
          .string()
          .describe(
            "Date for which the rates are required (YYYY-MM-DD). Data available from 1990 onwards.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ symbols, date }) => {
      const data = await callApi(ENDPOINTS.COMMODITY_HISTORICAL, apiKey, {
        symbols,
        date,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "commodity_fluctuation",
    {
      title: "Commodity Fluctuation",
      description:
        "Get start price, end price, absolute change, and percentage change for commodities over a custom date range. " +
        "Values are rounded to 2 decimal places. There is no limit on range length. " +
        "start_date must not be after end_date. " +
        "For symbols with updateInterval PER_MONTH, fluctuation is computed between the first day of the start month " +
        "and the first day of the end month.",
      inputSchema: z.object({
        symbols: z.string().describe(SYMBOL_DESC),
        start_date: z
          .string()
          .describe(
            "Start date for the fluctuation range (YYYY-MM-DD). Must not be after end_date.",
          ),
        end_date: z
          .string()
          .describe("End date for the fluctuation range (YYYY-MM-DD)."),
      }),
      annotations: READ_ONLY,
    },
    async ({ symbols, start_date, end_date }) => {
      const data = await callApi(ENDPOINTS.COMMODITY_FLUCTUATION, apiKey, {
        symbols,
        startDate: start_date,
        endDate: end_date,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "commodity_time_series",
    {
      title: "Commodity Time Series",
      description:
        "Get daily OHLC (open, high, low, close) prices for commodities over a date range of up to 365 days. " +
        "The response is a date-indexed map; non-trading days are excluded. " +
        "A symbol counts as resolved if it appears on at least one date. " +
        "Symbols with updateInterval PER_MONTH only have a closing price — open, high, and low come back as 0.",
      inputSchema: z.object({
        symbols: z.string().describe(SYMBOL_DESC),
        start_date: z
          .string()
          .describe("Start date for the time series (YYYY-MM-DD)."),
        end_date: z
          .string()
          .describe(
            "End date for the time series (YYYY-MM-DD). Maximum range from start_date is 365 days.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ symbols, start_date, end_date }) => {
      const data = await callApi(ENDPOINTS.COMMODITY_TIMESERIES, apiKey, {
        symbols,
        startDate: start_date,
        endDate: end_date,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
