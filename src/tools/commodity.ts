import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { READ_ONLY, type Params } from "../constants.js";

const SYMBOL_DESC =
  "Comma-separated commodity symbols (e.g. 'XAU,XAG,WTIOIL-SPOT'). " +
  "If unsure of the exact symbol, use 'commodity_symbols' first.";

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "commodity_symbols",
    {
      title: "Commodity Symbols",
      description:
        "List all supported commodity symbols with full metadata (name, unit, quote currency, exchange, status).",
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
        "Validate a commodity symbol and return its full metadata (name, unit, quote currency, exchange, status). " +
        "Use this instead of 'commodity_symbols' when you already have a symbol and just need to confirm it's valid or get its details.",
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
        "List all supported commodity quote currencies with symbol and currency name.",
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
        "Get real-time prices for one or more commodities. Supports custom quote currencies.",
      inputSchema: z.object({
        symbols: z.string().describe(SYMBOL_DESC),
        updates: z
          .enum(["1m", "10m"])
          .default("1m")
          .describe(
            "Price update frequency: '1m' = refreshed every minute (default), '10m' = every 10 minutes.",
          ),
        quote: z
          .string()
          .optional()
          .describe(
            "Quote currency code (e.g. USD, EUR). If unsure, use 'commodity_quotes' first.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ symbols, updates, quote }) => {
      const params: Params = { symbols, updates };
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
        "Get historical open, high, low, close (OHLC) prices for specific commodities on a specific date.\n" +
        "NOTE: If data is unavailable for the exact requested date (e.g. weekends/holidays), " +
        "this tool will automatically return the rates for the nearest previous available date.",
      inputSchema: z.object({
        symbols: z.string().describe(SYMBOL_DESC),
        date: z.string().describe("Target date in YYYY-MM-DD format."),
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
        "Get price fluctuation for commodity symbols over a date range. " +
        "If symbols are missing from results or a 404 is returned, " +
        "use 'commodity_historical_rates' to find valid trading dates and retry.",
      inputSchema: z.object({
        symbols: z.string().describe(SYMBOL_DESC),
        start_date: z
          .string()
          .describe("Start date of the interval in YYYY-MM-DD format."),
        end_date: z
          .string()
          .describe("End date of the interval in YYYY-MM-DD format."),
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
        "Get daily OHLC (Open, High, Low, and Close) prices for commodities over a date range (max 365 days). " +
        "If symbols are missing from results or a 404 is returned, " +
        "use 'commodity_historical_rates' to find valid trading dates and retry.",
      inputSchema: z.object({
        symbols: z.string().describe(SYMBOL_DESC),
        start_date: z
          .string()
          .describe(
            "Start date in YYYY-MM-DD format. Max range from end_date is 365 days.",
          ),
        end_date: z
          .string()
          .describe(
            "End date in YYYY-MM-DD format. Max range from start_date is 365 days.",
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
