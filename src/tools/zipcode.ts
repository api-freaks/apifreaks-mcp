import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { DistanceUnit } from "../enums.js";
import { READ_ONLY, Params } from "../constants.js";

const COUNTRY_DESC = "ISO 3166-1 alpha-2 country code (e.g. 'US', 'GB', 'DE').";
const UNIT_DESC = "Distance unit. Default: km. Options: km, mi, yd, m, ft, in.";
const PAGE_DESC =
  "Page number for paginated results (max 500 results per page).";
const RADIUS_LIMITS =
  "Max radius per unit: km=100, mi=100, yd=109361, m=100000, ft=328084, in=3937008.";

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "zipcode_lookup",
    {
      title: "ZIP Code Lookup",
      description:
        "Look up a single ZIP or postal code to retrieve its city, region, country, their codes and geographic coordinates. " +
        "Optionally filter by country using an ISO 3166-1 alpha-2 code.",
      inputSchema: z.object({
        code: z
          .string()
          .describe(
            "ZIP or postal code to look up (e.g. '10009', 'SW1A 1AA').",
          ),
        country: z
          .string()
          .optional()
          .describe(
            COUNTRY_DESC + " Narrows the search to the specified country.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ code, country }) => {
      const params: Params = { code };
      if (country !== undefined) params["country"] = country;
      const data = await callApi(ENDPOINTS.ZIPCODE_LOOKUP, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "zipcode_bulk_lookup",
    {
      title: "Bulk ZIP Code Lookup",
      description:
        "Look up details for up to 100 ZIP/postal codes at once. " +
        "Returns an array of results including city, region, country, their codes, and geographic coordinates for each ZIP code. " +
        "Optionally filter all codes to a single country.",
      inputSchema: z.object({
        codes: z
          .array(z.string())
          .max(100)
          .describe(
            'List of ZIP/postal codes to look up (max 100). Example: ["10009", "90210", "SW1A 1AA"]',
          ),
        country: z
          .string()
          .optional()
          .describe(COUNTRY_DESC + " Applies to all codes in the batch."),
      }),
      annotations: READ_ONLY,
    },
    async ({ codes, country }) => {
      const body: Params = { codes };
      if (country !== undefined) body["country"] = country;
      const data = await callApi(
        ENDPOINTS.ZIPCODE_LOOKUP,
        apiKey,
        {},
        body,
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "zipcode_radius_search",
    {
      title: "ZIP Code Radius Search",
      description:
        "Find all ZIP/postal codes within a given radius of a center point. " +
        "Specify the center as EITHER a ZIP code + country OR lat/long coordinates. " +
        "Returns paginated results (up to 500 per page) with each code's distance from center. " +
        RADIUS_LIMITS,
      inputSchema: z.object({
        radius: z
          .number()
          .gt(0)
          .describe("Search radius (must be > 0). " + RADIUS_LIMITS),
        code: z
          .string()
          .optional()
          .describe(
            "Center ZIP/postal code. Must be paired with 'country'. Use EITHER this OR lat+long.",
          ),
        country: z
          .string()
          .optional()
          .describe(
            COUNTRY_DESC +
              " Required when using 'code' as center. Use this with code, not with lat/long.",
          ),
        lat: z
          .number()
          .min(-90)
          .max(90)
          .optional()
          .describe(
            "Center latitude (-90 to 90). Must be paired with 'long'. Use EITHER this OR code+country.",
          ),
        long: z
          .number()
          .min(-180)
          .max(180)
          .optional()
          .describe(
            "Center longitude (-180 to 180). Must be paired with 'lat'. Use EITHER this OR code+country.",
          ),
        unit: DistanceUnit.default("km").describe(UNIT_DESC),
        page: z.number().int().min(1).default(1).describe(PAGE_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ radius, code, country, lat, long, unit, page }) => {
      const params: Params = { radius, unit, page };
      if (code !== undefined) params["code"] = code;
      if (country !== undefined) params["country"] = country;
      if (lat !== undefined) params["lat"] = lat;
      if (long !== undefined) params["long"] = long;
      const data = await callApi(ENDPOINTS.ZIPCODE_RADIUS, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "zipcode_distance",
    {
      title: "ZIP Code Distance",
      description:
        "Calculate the straight-line distance from a base point to each of up to 100 ZIP codes. " +
        "Specify the base point as EITHER a ZIP code + country OR lat/long coordinates. " +
        "Returns a distance value for each comparison code.",
      inputSchema: z.object({
        compare: z
          .array(z.string())
          .max(100)
          .describe(
            'List of ZIP/postal codes to measure distance to (max 100). Example: ["10001", "90210", "60601"]',
          ),
        code: z
          .string()
          .optional()
          .describe(
            "Base ZIP/postal code. Must be paired with 'country'. Use EITHER this OR lat+long.",
          ),
        country: z
          .string()
          .optional()
          .describe(
            COUNTRY_DESC + " Required when using 'code' as base point.",
          ),
        lat: z
          .number()
          .min(-90)
          .max(90)
          .optional()
          .describe("Base latitude (-90 to 90). Must be paired with 'long'."),
        long: z
          .number()
          .min(-180)
          .max(180)
          .optional()
          .describe("Base longitude (-180 to 180). Must be paired with 'lat'."),
        unit: DistanceUnit.default("km").describe(UNIT_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ compare, code, country, lat, long, unit }) => {
      const body: Params = { compare, unit };
      if (code !== undefined) body["code"] = code;
      if (country !== undefined) body["country"] = country;
      if (lat !== undefined) body["lat"] = lat;
      if (long !== undefined) body["long"] = long;
      const data = await callApi(
        ENDPOINTS.ZIPCODE_DISTANCE,
        apiKey,
        {},
        body,
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "zipcode_distance_match",
    {
      title: "ZIP Code Distance Match",
      description:
        "Find all pairs of ZIP codes within a given distance threshold. " +
        "All codes must be in the same country. " +
        "Returns every pair (code_1, code_2) whose distance is ≤ the threshold.",
      inputSchema: z.object({
        codes: z
          .array(z.string())
          .describe(
            'List of ZIP/postal codes to find close pairs within. Example: ["10001", "10002", "10003", "11201"]',
          ),
        country: z.string().describe(COUNTRY_DESC),
        distance: z
          .number()
          .gt(0)
          .default(100)
          .describe(
            "Maximum distance threshold for pairing. Default: 100 (in the selected unit).",
          ),
        unit: DistanceUnit.default("km").describe(UNIT_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ codes, country, distance, unit }) => {
      const body = { codes, country, unit, distance };
      const data = await callApi(
        ENDPOINTS.ZIPCODE_DISTANCE_MATCH,
        apiKey,
        {},
        body,
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "zipcode_by_city",
    {
      title: "ZIP Codes by City",
      description:
        "Get all ZIP/postal codes for a city. " +
        "Providing 'state_name' is recommended to disambiguate cities with the same name. " +
        "Returns paginated results (up to 500 per page).",
      inputSchema: z.object({
        city: z
          .string()
          .describe("City name to search (e.g. 'Brooklyn', 'Manchester')."),
        country: z.string().describe(COUNTRY_DESC),
        state_name: z
          .string()
          .optional()
          .describe(
            "State, province, or region name (e.g. 'New York', 'England'). Recommended to disambiguate.",
          ),
        page: z.number().int().min(1).default(1).describe(PAGE_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ city, country, state_name, page }) => {
      const params: Params = { city, country, page };
      if (state_name !== undefined) params["state_name"] = state_name;
      const data = await callApi(ENDPOINTS.ZIPCODE_CITY, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "zipcode_by_region",
    {
      title: "ZIP Codes by Region",
      description:
        "Get all ZIP/postal codes for a state, province, or region. " +
        "Returns paginated results (up to 500 per page).",
      inputSchema: z.object({
        region: z
          .string()
          .describe(
            "State, province, or region name (e.g. 'California', 'Bavaria', 'Ontario').",
          ),
        country: z.string().describe(COUNTRY_DESC),
        page: z.number().int().min(1).default(1).describe(PAGE_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ region, country, page }) => {
      const params = { region, country, page };
      const data = await callApi(ENDPOINTS.ZIPCODE_REGION, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
