import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { READ_ONLY, type Params } from "../constants.js";

const SWIFT_CODE_DESC =
  "SWIFT/BIC code to look up. Must be 8 or 11 characters (e.g. 'DEUTDEFF' or 'DEUTDEFFXXX'). " +
  "An 8-character code is returned padded to 11 characters with 'XXX'.";
const IBAN_DESC = "IBAN to validate (e.g. 'GB82WEST12345698765432').";
const VAT_NUMBER_DESC =
  "EU or UK VAT number to validate. EU numbers are checked against VIES; UK numbers against HMRC.";
const VAT_COUNTRY_DESC =
  "Country identifier as ISO 3166-1 alpha-2 (PK), alpha-3 (PAK), or full name (Pakistan). " +
  "Case-insensitive; spaces may be replaced with underscores. " +
  "If unsure which countries are supported, use 'financial_supported_countries' with kind='vat' first.";
const VAT_STATE_DESC =
  "Optional state or region as alpha-2 (NY) or full name (New_York). " +
  "Use with 'country' for sub-national VAT. Case-insensitive; spaces may be replaced with underscores. " +
  "State-level VAT is documented for a handful of countries (US, Canada, Spain) — " +
  "use 'financial_supported_country_info' to see nested state codes.";
enum FINANCIAL_KIND {
  VAT = "vat",
  IBAN = "iban",
  SWIFT = "swift",
}

const FinancialKind = z.enum([
  FINANCIAL_KIND.VAT,
  FINANCIAL_KIND.IBAN,
  FINANCIAL_KIND.SWIFT,
]);

const SUPPORTED_COUNTRIES_KEY: Record<FINANCIAL_KIND, string> = {
  [FINANCIAL_KIND.VAT]: "VAT_Supported_Countries_And_States",
  [FINANCIAL_KIND.IBAN]: "IBAN_Supported_Countries",
  [FINANCIAL_KIND.SWIFT]: "SWIFT_Supported_Countries",
};

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "financial_supported_countries",
    {
      title: "Financial Supported Countries",
      description:
        "Get the countries (and, for VAT, some states) supported by the VAT, IBAN, and SWIFT APIs. " +
        "Returns three arrays: VAT entries as single-key objects keyed by lowercase underscore names " +
        "(each with a code and, for a few countries, nested states), " +
        "plus IBAN and SWIFT lists of country name and ISO code. " +
        "Pass kind to return only that category. " +
        "If you already have a country name or code, prefer 'financial_supported_country_info'.",
      inputSchema: z.object({
        kind: FinancialKind.optional().describe(
          "If set, return only that category: 'vat', 'iban', or 'swift'. Omit to return all three.",
        ),
      }),
      annotations: READ_ONLY,
    },
    async ({ kind }) => {
      const data = await callApi(
        ENDPOINTS.FINANCIAL_SUPPORTED_COUNTRIES,
        apiKey,
        financialTypeParams(kind),
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(sliceSupportedCountries(data, kind)),
          },
        ],
      };
    },
  );

  server.registerTool(
    "financial_supported_country_info",
    {
      title: "Financial Supported Country Info",
      description:
        "Look up whether a country is supported by the VAT, IBAN, and/or SWIFT APIs. " +
        "A match returns the query plus whichever of vat, iban, and swift hit " +
        "(VAT: name plus code and optional states; IBAN/SWIFT: name and country code). " +
        "A miss is plain text pointing at 'financial_supported_countries'. " +
        "Use this instead of the list tool when you already have a country name or code.",
      inputSchema: z.object({
        country: z
          .string()
          .describe(
            "Country name or ISO code to look up (e.g. 'Germany', 'DE', 'united_states').",
          ),
        kind: FinancialKind.optional().describe(
          "Limit the search to 'vat', 'iban', or 'swift'. Omit to search all three categories.",
        ),
      }),
      annotations: READ_ONLY,
    },
    async ({ country, kind }) => {
      const data = await callApi(
        ENDPOINTS.FINANCIAL_SUPPORTED_COUNTRIES,
        apiKey,
        financialTypeParams(kind),
      );
      const match = findSupportedCountry(data, country, kind);
      if (match === undefined) {
        return {
          content: [
            {
              type: "text" as const,
              text: missingCountryText(country, kind),
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
    "financial_swift_lookup",
    {
      title: "SWIFT/BIC Code Lookup",
      description:
        "Look up an 8- or 11-character SWIFT/BIC code and return one bank record: " +
        "the code itself (8-character input is padded to 11 with XXX), bank name, " +
        "the 4-character bank prefix, branch address, city, country name, and ISO country code. " +
        "Headquarters and branch codes are both supported. " +
        "Wrong length returns 400; an unknown code returns 404. " +
        "If you do not have a code, use 'financial_swift_finder' to drill down country → bank → city → codes.",
      inputSchema: z.object({
        swift_code: z.string().describe(SWIFT_CODE_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ swift_code }) => {
      const data = await callApi(ENDPOINTS.SWIFT_LOOKUP, apiKey, {
        swiftCode: swift_code,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "financial_swift_finder",
    {
      title: "SWIFT/BIC Code Finder",
      description:
        "Progressively drill down from supported countries to a bank's SWIFT/BIC codes. " +
        "Returns a JSON array of strings: country names with no parameters, bank names with country, " +
        "cities with country + bank, or SWIFT/BIC codes with country + bank + city. " +
        "Parameters must be supplied in that order or the API returns 400. " +
        "An unmatched combination returns 200 with an empty array, not an error. " +
        "Country is a full name (e.g. 'United States'); bank and city are sent in upper case. " +
        "Pass a returned code to 'financial_swift_lookup' for the full bank record.",
      inputSchema: z.object({
        country: z
          .string()
          .optional()
          .describe(
            "Country name (e.g. 'Pakistan', 'United States'). Alone, returns bank names in that country. Omit entirely to list all supported countries.",
          ),
        bank: z
          .string()
          .optional()
          .describe(
            "Bank name. Requires 'country'. Without 'city', returns cities that bank operates in.",
          ),
        city: z
          .string()
          .optional()
          .describe(
            "City name. Requires 'country' and 'bank'. Returns matching SWIFT/BIC codes for that bank in that city.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ country, bank, city }) => {
      const params: Params = {};
      if (country !== undefined) params["country"] = country;
      if (bank !== undefined) params["bank"] = bank.toUpperCase();
      if (city !== undefined) params["city"] = city.toUpperCase();
      const data = await callApi(ENDPOINTS.SWIFT_FINDER, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "financial_iban_validate",
    {
      title: "IBAN Validation",
      description:
        "Validate an IBAN against country-specific format, length, and checksum rules. " +
        "Returns whether it is valid (false is still HTTP 200, not an error), the submitted IBAN, " +
        "per-check flags, an optional BBAN checksum (unknown means that country does not support BBAN checks), " +
        "and bank/SEPA metadata — BIC, bank name, codes, country, city, address, account, and SEPA eligibility. " +
        "Most bank fields are null when the IBAN is structurally invalid or bank data is not resolvable. " +
        "Missing iban returns 400. " +
        "Use 'financial_supported_country_info' if you need to confirm IBAN coverage first.",
      inputSchema: z.object({
        iban: z.string().describe(IBAN_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ iban }) => {
      const data = await callApi(ENDPOINTS.IBAN_VALIDATION, apiKey, { iban });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "financial_vat_validate",
    {
      title: "VAT Number Validation",
      description:
        "Validate an EU VAT number against VIES or a UK VAT number against HMRC. " +
        "Returns the country prefix, the number without prefix, a timestamp, " +
        "validity plus the consultation authority, and company name/address (may be empty strings). " +
        "Pass requester_vat_number to also get a consultation number for audit. " +
        "Unsupported prefix returns 400; an unregistered number returns 404.",
      inputSchema: z.object({
        vat_number: z.string().describe(VAT_NUMBER_DESC),
        requester_vat_number: z
          .string()
          .optional()
          .describe(
            "Requester EU or UK VAT number, used for match-based validation.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ vat_number, requester_vat_number }) => {
      const params: Params = { vatNumber: vat_number };
      if (requester_vat_number !== undefined) {
        params["requesterVatNumber"] = requester_vat_number;
      }
      const data = await callApi(ENDPOINTS.VAT_VALIDATION, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "financial_vat_rates_by_country",
    {
      title: "VAT Rates by Country",
      description:
        "Get VAT rates for one country, including standard, reduced, and super-reduced rates where published. " +
        "Returns a JSON array of one rate object: country, tax type, currency, and standard_rate as a decimal (0.19 = 19%). " +
        "EU/UK may also include reduced, super-reduced, parking, and category rates. " +
        "State-level entries include state; currency may be an empty string. " +
        "Covers EU and major global jurisdictions. Optionally pass 'state' for sub-national VAT. " +
        "Missing country returns 400; no VAT data returns 404. " +
        "If unsure of the country or state identifier, use 'financial_supported_country_info' first.",
      inputSchema: z.object({
        country: z.string().describe(VAT_COUNTRY_DESC),
        state: z.string().optional().describe(VAT_STATE_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ country, state }) => {
      const params: Params = { country };
      if (state !== undefined) params["state"] = state;
      const data = await callApi(ENDPOINTS.VAT_RATES_COUNTRY, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "financial_vat_rates_bulk",
    {
      title: "Bulk VAT Rates by Country",
      description:
        "Get VAT rates for up to 100 countries or country/state combinations in one request. " +
        "Returns a JSON array of the same rate objects as 'financial_vat_rates_by_country' (decimal standard_rate, optional reduced/category rates), in request order. " +
        "Invalid country/state entries are omitted, so the array can be shorter than the request. " +
        "A missing/malformed body returns 400; a payload over the size limit returns 413.",
      inputSchema: z.object({
        countries: z
          .array(
            z.object({
              country: z.string().describe(VAT_COUNTRY_DESC),
              state: z.string().optional().describe(VAT_STATE_DESC),
            }),
          )
          .max(100)
          .describe(
            'List of country entries (max 100). Example: [{"country":"DE"},{"country":"United_States","state":"New_York"}]',
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ countries }) => {
      const data = await callApi(
        ENDPOINTS.VAT_RATES_COUNTRY,
        apiKey,
        {},
        { countries },
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "financial_vat_rates_by_ip",
    {
      title: "VAT Rates by IP",
      description:
        "Get VAT rates for the country resolved from an IP address. " +
        "Returns a JSON array of one rate object (same shape as 'financial_vat_rates_by_country', including state when the IP maps to sub-national tax). " +
        "Rates are decimals (0.20 = 20%). Supports IPv4 and IPv6. " +
        "If ip_address is omitted, the API uses the originating request IP — from this MCP server that is the server's egress address, not the end user. " +
        "Pass ip_address explicitly whenever you need a specific client's location. " +
        "Invalid IP returns 400; no VAT data for the resolved location returns 404.",
      inputSchema: z.object({
        ip_address: z
          .string()
          .optional()
          .describe(
            "IPv4 or IPv6 address to resolve VAT rates for. If omitted, the API uses the originating request IP (this MCP server's egress IP, not the end user).",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ ip_address }) => {
      const params: Params = {};
      if (ip_address !== undefined) params["ipAddress"] = ip_address;
      const data = await callApi(ENDPOINTS.VAT_RATES_IP, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}

function missingCountryText(
  country: string,
  kind: FINANCIAL_KIND | undefined,
): string {
  const hint =
    kind === undefined
      ? "'financial_supported_countries'"
      : `'financial_supported_countries' with kind='${kind}'`;
  return `Country '${country}' not found. Use ${hint} to browse supported countries.`;
}

function financialTypeParams(
  kind: FINANCIAL_KIND | undefined,
): Params | undefined {
  if (kind === undefined) {
    return undefined;
  }
  return { type: kind.toUpperCase() };
}

function sliceSupportedCountries(
  data: Params,
  kind: FINANCIAL_KIND | undefined,
): Params {
  if (kind === undefined) {
    return data;
  }
  const key = SUPPORTED_COUNTRIES_KEY[kind];
  return { [key]: data[key] };
}

function findSupportedCountry(
  data: Params,
  country: string,
  kind: FINANCIAL_KIND | undefined,
): Record<string, unknown> | undefined {
  const result: Record<string, unknown> = { query: country };
  const needle = normalizeCountryToken(country);
  let found = false;

  if (kind === undefined || kind === FINANCIAL_KIND.VAT) {
    const vat = findVatCountry(
      data[SUPPORTED_COUNTRIES_KEY[FINANCIAL_KIND.VAT]],
      needle,
    );
    if (vat !== undefined) {
      result[FINANCIAL_KIND.VAT] = vat;
      found = true;
    }
  }
  if (kind === undefined || kind === FINANCIAL_KIND.IBAN) {
    const iban = findNamedCountry(
      data[SUPPORTED_COUNTRIES_KEY[FINANCIAL_KIND.IBAN]],
      needle,
    );
    if (iban !== undefined) {
      result[FINANCIAL_KIND.IBAN] = iban;
      found = true;
    }
  }
  if (kind === undefined || kind === FINANCIAL_KIND.SWIFT) {
    const swift = findNamedCountry(
      data[SUPPORTED_COUNTRIES_KEY[FINANCIAL_KIND.SWIFT]],
      needle,
    );
    if (swift !== undefined) {
      result[FINANCIAL_KIND.SWIFT] = swift;
      found = true;
    }
  }

  return found ? result : undefined;
}

function findVatCountry(
  list: unknown,
  needle: string,
): Record<string, unknown> | undefined {
  if (!Array.isArray(list)) {
    return undefined;
  }
  for (const item of list) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const rec = item as Record<string, unknown>;
    for (const [name, entry] of Object.entries(rec)) {
      const code =
        typeof entry === "object" && entry !== null
          ? String((entry as Record<string, unknown>)["code"] ?? "")
          : "";
      if (
        normalizeCountryToken(name) === needle ||
        normalizeCountryToken(code) === needle
      ) {
        return { name, details: entry };
      }
    }
  }
  return undefined;
}

function findNamedCountry(
  list: unknown,
  needle: string,
): Record<string, unknown> | undefined {
  if (!Array.isArray(list)) {
    return undefined;
  }
  return list.find((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    const rec = item as Record<string, unknown>;
    const name = String(rec["name"] ?? "");
    const code = String(rec["countryCode"] ?? "");
    return (
      normalizeCountryToken(name) === needle ||
      normalizeCountryToken(code) === needle
    );
  }) as Record<string, unknown> | undefined;
}

function normalizeCountryToken(value: string): string {
  return value.trim().toLowerCase().replaceAll(" ", "_");
}
