import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { CurrencyUpdateFrequency } from "../enums.js";
import { READ_ONLY, type Params } from "../constants.js";

const BASE_DESC =
  "Base currency code (e.g. 'USD', 'EUR', 'GBP'). Defaults to 'USD'.";
const SYMBOLS_DESC =
  "An array of 3-letter ISO 4217 fiat currency codes or cryptocurrency symbols (e.g., ['USD', 'EUR', 'BTC']). If omitted, the API will return rates for all 1,000+ supported assets. For a full list of valid codes, use the `currency_symbols` tool first.";
const UPDATES_DESC =
  "Exchange rate update frequency: '1m' (default), '10m', '1h', or '1d'.";
const DATE_DESC =
  "Date for historical rates in YYYY-MM-DD format (e.g. '2024-03-20').";
const START_DATE_DESC =
  "Start date of the time range in YYYY-MM-DD format (e.g. '2022-06-01').";
const END_DATE_DESC =
  "End date of the time range in YYYY-MM-DD format. Defaults to the day before the current date if not provided.";
const FROM_DESC =
  "Source currency code to convert from (e.g. 'USD', 'EUR', 'BTC').";
const TO_DESC =
  "Target currency code to convert to (e.g. 'PKR', 'GBP', 'ETH').";
const AMOUNT_DESC =
  "Amount to convert. Must be a positive number. Defaults to 1.";

function joinSymbols(symbols: string[]): string {
  return symbols.map((s) => s.trim().toUpperCase()).join(",");
}

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "currency_latest_rates",
    {
      title: "Currency Latest Rates",
      description:
        "Retrieve the latest exchange rates for 170+ fiat currencies and 830+ cryptocurrencies. " +
        "Returns a 'rates' dictionary mapping currency codes to their rate relative to the base. " +
        "Filter to specific symbols to reduce response size.",
      inputSchema: z.object({
        base: z.string().default("USD").describe(BASE_DESC),
        symbols: z.array(z.string()).optional().describe(SYMBOLS_DESC),
        updates: CurrencyUpdateFrequency.default("1m").describe(UPDATES_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ base, symbols, updates }) => {
      const params: Params = { base, updates };
      if (symbols?.length) params["symbols"] = joinSymbols(symbols);
      const data = await callApi(
        ENDPOINTS.CURRENCY_RATES_LATEST,
        apiKey,
        params,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "currency_historical_rates",
    {
      title: "Currency Historical Rates",
      description:
        "Retrieve historical exchange rates for a specific past date. " +
        "Supports 170+ fiat currencies and 830+ cryptocurrencies with data going back 40+ years.",
      inputSchema: z.object({
        date: z.string().describe(DATE_DESC),
        base: z.string().default("USD").describe(BASE_DESC),
        symbols: z.array(z.string()).optional().describe(SYMBOLS_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ date, base, symbols }) => {
      const params: Params = { date, base };
      if (symbols?.length) params["symbols"] = joinSymbols(symbols);
      const data = await callApi(
        ENDPOINTS.CURRENCY_RATES_HISTORICAL,
        apiKey,
        params,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "currency_latest_converter",
    {
      title: "Currency Latest Converter",
      description:
        "Convert an amount from one currency to another using the latest exchange rates. " +
        "Supports 170+ fiat currencies and 800+ cryptocurrencies. " +
        "Returns the exchange rate used, the given amount, and the converted amount.",
      inputSchema: z.object({
        from_currency: z.string().describe(FROM_DESC),
        to_currency: z.string().describe(TO_DESC),
        amount: z.number().positive().default(1).describe(AMOUNT_DESC),
        updates: CurrencyUpdateFrequency.default("1m").describe(UPDATES_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ from_currency, to_currency, amount, updates }) => {
      const params: Params = {
        from: from_currency.toUpperCase(),
        to: to_currency.toUpperCase(),
        amount,
        updates,
      };
      const data = await callApi(
        ENDPOINTS.CURRENCY_CONVERTER_LATEST,
        apiKey,
        params,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "currency_historical_converter",
    {
      title: "Currency Historical Converter",
      description:
        "Convert an amount from one currency to another using exchange rates from a specific past date. " +
        "Useful for financial auditing, tax reporting, and invoice reconciliation. " +
        "Returns the exchange rate on that date, the given amount, and the converted amount.",
      inputSchema: z.object({
        from_currency: z.string().describe(FROM_DESC),
        to_currency: z.string().describe(TO_DESC),
        date: z.string().describe(DATE_DESC),
        amount: z.number().positive().default(1).describe(AMOUNT_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ from_currency, to_currency, date, amount }) => {
      const params: Params = {
        from: from_currency.toUpperCase(),
        to: to_currency.toUpperCase(),
        date,
        amount,
      };
      const data = await callApi(
        ENDPOINTS.CURRENCY_CONVERTER_HISTORICAL,
        apiKey,
        params,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "currency_time_series",
    {
      title: "Currency Time Series",
      description:
        "Retrieve historical exchange rates day-by-day across a custom date range. " +
        "Returns a 'historicalRatesList' array where each entry has a date and a 'rates' dictionary. " +
        "Useful for charting currency trends and analyzing multi-day rate movements. " +
        "startDate is required; endDate defaults to yesterday if omitted. Max interval supported is 1 year.",
      inputSchema: z.object({
        start_date: z.string().describe(START_DATE_DESC),
        end_date: z.string().optional().describe(END_DATE_DESC),
        base: z.string().default("USD").describe(BASE_DESC),
        symbols: z.array(z.string()).optional().describe(SYMBOLS_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ start_date, end_date, base, symbols }) => {
      const params: Params = { startDate: start_date, base };
      if (end_date !== undefined) params["endDate"] = end_date;
      if (symbols?.length) params["symbols"] = joinSymbols(symbols);
      const data = await callApi(
        ENDPOINTS.CURRENCY_TIME_SERIES,
        apiKey,
        params,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "currency_fluctuation",
    {
      title: "Currency Fluctuation",
      description:
        "Retrieve exchange rate fluctuation metrics for currencies over a date range. " +
        "For each requested currency returns: startRate, endRate, absolute change, and percent change. " +
        "Useful for volatility analysis and comparing currency movements. " +
        "startDate is required; endDate defaults to yesterday if omitted.",
      inputSchema: z.object({
        start_date: z.string().describe(START_DATE_DESC),
        end_date: z.string().optional().describe(END_DATE_DESC),
        base: z.string().optional().describe(BASE_DESC),
        symbols: z.array(z.string()).optional().describe(SYMBOLS_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ start_date, end_date, base, symbols }) => {
      const params: Params = { startDate: start_date };
      if (end_date !== undefined) params["endDate"] = end_date;
      if (base !== undefined) params["base"] = base;
      if (symbols?.length) params["symbols"] = joinSymbols(symbols);
      const data = await callApi(
        ENDPOINTS.CURRENCY_FLUCTUATION,
        apiKey,
        params,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "currency_geo_convert",
    {
      title: "Currency Geo Convert",
      description:
        "Convert an amount from a given currency to the local currency of an IP address's location. " +
        "Returns the detected target currency, exchange rate, and converted amount. " +
        "Useful for e-commerce checkout localization. Supports IPv4 and IPv6.",
      inputSchema: z.object({
        from_currency: z.string().describe(FROM_DESC),
        ip: z
          .string()
          .describe(
            "IPv4 or IPv6 address of the user whose local currency to convert to.",
          ),
        amount: z.number().positive().default(1).describe(AMOUNT_DESC),
        updates: CurrencyUpdateFrequency.default("1m").describe(UPDATES_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ from_currency, ip, amount, updates }) => {
      const params: Params = {
        from: from_currency.toUpperCase(),
        ip,
        amount,
        updates,
      };
      const data = await callApi(
        ENDPOINTS.CURRENCY_GEO_CONVERT,
        apiKey,
        params,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "currency_supported",
    {
      title: "Currency Supported",
      description:
        "Get the supported currencies map. Each entry includes code, name, country data, status, availability dates, and icon. " +
        "Covers 170+ fiat currencies and 830+ cryptocurrencies.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      const data = await callApi(ENDPOINTS.CURRENCY_SUPPORTED, apiKey);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "currency_symbols",
    {
      title: "Currency Symbols",
      description: "Get a map of supported currency symbols to currency names.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      const data = await callApi(ENDPOINTS.CURRENCY_SYMBOLS, apiKey);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "currency_symbol_info",
    {
      title: "Currency Symbol Info",
      description:
        "Validate a currency symbol and return its full name. " +
        "Use this instead of 'currency_symbols' when you already have a symbol and just need to confirm it's valid or get its display name.",
      inputSchema: z.object({
        symbol: z
          .string()
          .describe(
            "The currency symbol to look up (e.g. 'USD', 'EUR', 'BTC').",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ symbol }) => {
      const data = await callApi(ENDPOINTS.CURRENCY_SYMBOLS, apiKey);
      const raw = data["currencySymbols"];
      const map = (typeof raw === "object" && raw !== null && !Array.isArray(raw))
        ? (raw as Record<string, string>)
        : undefined;
      const upper = symbol.toUpperCase();
      const key = map ? Object.keys(map).find((k) => k.toUpperCase() === upper) : undefined;
      if (key === undefined || map === undefined) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Symbol '${symbol}' not found. Use 'currency_symbols' to browse all available symbols.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ symbol: key, name: map[key] }),
          },
        ],
      };
    },
  );
}
