import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { CommodityIntradayInterval } from "../enums.js";
import { READ_ONLY, type Params } from "../constants.js";

const UPDATE_INTERVAL_DESC =
  "Each symbol has its own updateInterval. The live catalog uses PER_SECOND, PER_MINUTE, PER_10_MINUTES, " +
  "PER_DAY, PER_WEEK, PER_MONTH, and PER_6_MONTHS. The symbols reference also lists PER_HOUR, " +
  "which no current symbol uses. Read the value with 'commodity_symbol_info' or 'commodity_symbols'. " +
  "Price responses do not include that cadence. The latest-rates endpoint refreshes on a rolling ~1 minute cadence, " +
  "but a symbol's price only moves as often as its updateInterval " +
  "(XAU is PER_SECOND; NG-EU is PER_MONTH; household electricity such as ELEC-HH-BE is PER_6_MONTHS).";

const SYMBOL_DESC =
  "Comma-separated commodity symbols (e.g. 'XAU,XAG,WTIOIL-SPOT'). Case-insensitive. " +
  "-SPOT is the continuous cash price. -FUT follows the front-month futures contract and rolls at expiry. " +
  "A delivery month uses a symbol like 'WTIOIL-FUT-DEC27'. " +
  "If unsure of the symbol, use 'commodity_symbols'. " +
  "To list the delivery months currently listed for a contract, call 'commodity_symbols' with underlying " +
  "set to the continuous symbol (e.g. 'WTIOIL-FUT'). " +
  "If some symbols cannot be resolved, they appear in an 'unresolved' map " +
  "(a message, and often a suggestions list of close matches) while rates for the rest are still returned. " +
  "If none resolve, the request fails with 404.";

const RESOLVED_TO_DESC =
  "A symbol with exactly one close match is answered under that symbol, and its unresolved entry includes resolvedTo.";

const MONTHLY_OHLC_DESC =
  "Symbols with updateInterval PER_MONTH or PER_6_MONTHS are dated on the first of the month, " +
  "and open, high, and low equal close. ";

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "commodity_symbols",
    {
      title: "Commodity Symbols",
      description:
        "List the 520+ supported commodity symbols across Metals, Energy, Agriculture, Industrial, " +
        "Raw Materials, Oils and Meals, Textiles, Meats, Poultry, and Livestock. " +
        "Each entry includes symbol, name, optional description, category, " +
        "status ('active' or 'inactive'), updateInterval " +
        "(PER_SECOND, PER_MINUTE, PER_10_MINUTES, PER_DAY, PER_WEEK, PER_MONTH, or PER_6_MONTHS; " +
        "the reference also lists PER_HOUR), " +
        "optional exchange, currency (code, name, symbol), and unit (symbol, name). " +
        "A delivery month also includes contract, deliveryMonth, expiresAt, and underlying " +
        "(the continuous futures symbol, e.g. 'WTIOIL-FUT'). " +
        "Inactive symbols stay listed with a deprecationDate: latest rates are unavailable, " +
        "and historical rates remain available up to that date. Symbols are never reused. " +
        "Pass underlying (e.g. 'WTIOIL-FUT') to list the delivery months currently listed for that contract.",
      inputSchema: z.object({
        underlying: z
          .string()
          .optional()
          .describe(
            "Continuous futures symbol (e.g. 'WTIOIL-FUT'). " +
              "When set, the response lists the delivery months currently listed for that contract.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ underlying }) => {
      const params: Params = {};
      if (underlying !== undefined) params["underlying"] = underlying;
      const data = await callApi(
        ENDPOINTS.COMMODITY_SYMBOLS,
        apiKey,
        params,
      );
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
        "Validate a commodity symbol and return its metadata from the symbols catalog: " +
        "name, optional description, category, status, updateInterval " +
        "(PER_SECOND, PER_MINUTE, PER_10_MINUTES, PER_DAY, PER_WEEK, PER_MONTH, or PER_6_MONTHS), " +
        "optional exchange, optional deprecationDate, currency (code, name, symbol), and unit (symbol, name). " +
        "A delivery month also includes contract, deliveryMonth, expiresAt, and underlying. " +
        "Use this instead of 'commodity_symbols' when you already have a symbol. " +
        "If status is 'inactive', latest rates are unavailable and historical rates stop at deprecationDate. " +
        "Delivery months for a futures contract are listed by 'commodity_symbols' with underlying set to the continuous symbol.",
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
              text: `Symbol '${symbol}' not found. Use 'commodity_symbols' to browse all available symbols, or pass underlying to list delivery months for a continuous futures symbol.`,
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
        "List fiat currencies for the quote parameter on 'commodity_latest_rates'. " +
        "Built from the currency supported catalog: status AVAILABLE, excluding entries whose countryCode is Crypto or Metal. " +
        "The commodity reference does not publish a separate quote list; an invalid quote returns QUOTE_NOT_FOUND. " +
        "Historical, fluctuation, time series, and intraday prices stay in each commodity's own currency.",
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
        "Fiat currencies for commodity_latest_rates quote:\n" +
        fiat.map((c) => `- ${c.code} (${c.name})`).join("\n");
      return { content: [{ type: "text" as const, text }] };
    },
  );

  server.registerTool(
    "commodity_latest_rates",
    {
      title: "Commodity Latest Rates",
      description:
        "Get the latest price for one or more of 520+ commodities, with unit and quote metadata. " +
        "An optional quote converts prices into a target currency. Defaults to each commodity's market currency. " +
        "If that conversion is temporarily unavailable, rates stay in each commodity's default currency and the response includes warning. " +
        "Pass metadata false to omit unit and quote metadata and return only prices. " +
        RESOLVED_TO_DESC +
        " An expired futures month is unresolved and includes expiredOn. " +
        "A distant month that only has a daily settlement has no live price. " +
        "Use 'commodity_historical_rates' for both. " +
        "-SPOT and -FUT are not official exchange settlements. " +
        UPDATE_INTERVAL_DESC,
      inputSchema: z.object({
        symbols: z.string().describe(SYMBOL_DESC),
        quote: z
          .string()
          .optional()
          .describe(
            "Target currency for the price (e.g. USD, EUR). Defaults to the market currency of each commodity. If unsure, use 'commodity_quotes' first. An invalid quote returns QUOTE_NOT_FOUND.",
          ),
        metadata: z
          .boolean()
          .optional()
          .describe(
            "Pass false to omit the metadata object (unit and quote) and return only prices.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ symbols, quote, metadata }) => {
      const params: Params = { symbols };
      if (quote !== undefined) params["quote"] = quote;
      if (metadata !== undefined) params["metadata"] = metadata;
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
        "Get OHLC (open, high, low, close) prices for commodities on a specific date. " +
        "Prices are in each commodity's own currency (see 'commodity_symbols'); this endpoint does not take a quote. " +
        "The API reference documents availability from January 1990. " +
        "Each symbol's history starts on its own first date; the longest series, such as gold, are documented back to 1980. " +
        "If a symbol has no rate on the requested date, the rate object's date is the last earlier day that has a price. " +
        "If every symbol is valid but none has a price on or before the date, the request returns 404. " +
        MONTHLY_OHLC_DESC +
        "Delivery-month symbols (e.g. WTIOIL-FUT-DEC27) have history from October 2026, and close is the exchange daily settlement, " +
        "updated when the final figure differs from the preliminary one. " +
        "Use the continuous symbol (e.g. WTIOIL-FUT) for older futures history. " +
        "A deprecated symbol keeps history up to its deprecationDate, and an expired futures month keeps daily history up to expiry. " +
        RESOLVED_TO_DESC,
      inputSchema: z.object({
        symbols: z.string().describe(SYMBOL_DESC),
        date: z
          .string()
          .describe(
            "Date for the rates (YYYY-MM-DD). The API reference documents data from January 1990. Each symbol starts on its own first date; gold is documented back to 1980. Delivery-month history starts in October 2026.",
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
        "Get startRate, endRate, absolute change, and changePercent for commodities over a custom date range. " +
        "Every value is rounded to 2 decimal places. There is no limit on range length. " +
        "start_date must be on or before end_date. " +
        "For symbols with updateInterval PER_MONTH, the change is measured between the first day of the start month " +
        "and the first day of the end month. Daily and monthly symbols can be mixed in one request. " +
        "Delivery-month history starts in October 2026, so a range for a symbol like WTIOIL-FUT-DEC27 must start then or later. " +
        "Use the continuous symbol (e.g. WTIOIL-FUT) for a longer futures range. " +
        RESOLVED_TO_DESC +
        " If every symbol is valid but none has data in the range, the request returns 404.",
      inputSchema: z.object({
        symbols: z.string().describe(SYMBOL_DESC),
        start_date: z
          .string()
          .describe(
            "Start date for the fluctuation range (YYYY-MM-DD). Must be on or before end_date.",
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
        "Prices are in each commodity's own currency (see 'commodity_symbols'); this endpoint does not take a quote. " +
        "The response is keyed by date, then by symbol. Dates with no price, such as weekends and holidays, are omitted. " +
        "When several symbols are requested, a symbol is left out of any date it has no price for. Gaps are not filled forward. " +
        "A symbol counts as resolved if it appears on at least one date. " +
        MONTHLY_OHLC_DESC +
        "Delivery-month symbols (e.g. WTIOIL-FUT-DEC27) return one row per trading day from October 2026, " +
        "and close is the exchange daily settlement. An expired contract keeps that history up to expiry. " +
        "Use the continuous symbol (e.g. WTIOIL-FUT) for longer futures history. " +
        "For a range longer than 365 days, split it into yearly requests, or use 'commodity_fluctuation' for only the net change. " +
        "If none of the symbols have data in the range, the request returns 404.",
      inputSchema: z.object({
        symbols: z.string().describe(SYMBOL_DESC),
        start_date: z
          .string()
          .describe("Start date for the time series (YYYY-MM-DD)."),
        end_date: z
          .string()
          .describe(
            "End date for the time series (YYYY-MM-DD). The range from start_date must not exceed 365 days.",
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

  server.registerTool(
    "commodity_intraday_rates",
    {
      title: "Commodity Intraday Rates",
      description:
        "Get timestamped prices for exactly one commodity through a UTC day. " +
        "Each point is the single price recorded at that time, not a bar, keyed by an ISO 8601 UTC timestamp " +
        "(e.g. 2026-10-14T18:00:00Z), in ascending order, rounded to two decimals. " +
        "A mark with no recorded price is omitted. " +
        "Available only for symbols whose updateInterval is PER_SECOND, PER_MINUTE, or PER_10_MINUTES. " +
        "Symbols updated hourly or less often return 400. " +
        "interval is 1m, 5m, 10m, 15m, 30m, 45m, 1h, 2h, 4h, 8h, 12h, or 1d. " +
        "Symbols updated every 10 minutes accept only 10m, 30m, 1h, 2h, 4h, 8h, 12h, and 1d. " +
        "date is a UTC day (YYYY-MM-DD) and cannot be in the future. For today, points stop at the current UTC minute. " +
        "start_time is the first mark, HH:mm UTC. It defaults to 00:00 and must fall on a mark of the interval. For 1d it can only be 00:00. " +
        "A response holds at most 100 points. When more remain, nextStartTime is the start_time for the next page; it is null at the end of the window. " +
        "From 15m upward, a full day fits in one response. A full day at 1m is 1,440 points across 15 requests. " +
        "metadata defaults to included. Pass false to omit unit and quote. " +
        "Two or more symbols return 400. There is no 206. " +
        "A single-match alias (e.g. GOLD answered as XAU) returns 200 with unresolved.resolvedTo. " +
        "An unrecognized symbol returns 404, with suggestions when close matches exist. " +
        "Prices are in the commodity's own currency; this endpoint does not take a quote.",
      inputSchema: z.object({
        symbols: z
          .string()
          .describe(
            "Exactly one commodity symbol (e.g. 'XAU', 'WTIOIL-FUT'). Case-insensitive. " +
              "Two or more symbols return 400. " +
              "Only symbols updated every second, minute, or 10 minutes have intraday rates. " +
              "If unsure, use 'commodity_symbol_info' and check updateInterval.",
          ),
        interval: CommodityIntradayInterval.describe(
          "Spacing between points. One of 1m, 5m, 10m, 15m, 30m, 45m, 1h, 2h, 4h, 8h, 12h, 1d. " +
            "Case-insensitive. Symbols with updateInterval PER_10_MINUTES accept only 10m, 30m, 1h, 2h, 4h, 8h, 12h, 1d.",
        ),
        date: z
          .string()
          .describe(
            "UTC day to read (YYYY-MM-DD). Cannot be in the future. For today, points stop at the current UTC minute.",
          ),
        start_time: z
          .string()
          .optional()
          .describe(
            "First mark of the window, 24-hour UTC time HH:mm. Defaults to 00:00. " +
              "Must fall on a mark of interval (14:30 works for 5m or 30m, not for 1h). For 1d, only 00:00. " +
              "To page, pass the previous response's nextStartTime.",
          ),
        metadata: z
          .boolean()
          .optional()
          .describe(
            "Whether to include unit and quote metadata. Omit or pass true to include it. Pass false to return only prices.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ symbols, interval, date, start_time, metadata }) => {
      const params: Params = { symbols, interval, date };
      if (start_time !== undefined) params["startTime"] = start_time;
      if (metadata !== undefined) params["metadata"] = metadata;
      const data = await callApi(ENDPOINTS.COMMODITY_INTRADAY, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
