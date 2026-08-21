import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi, callApiBinary } from "../client.js";
import { READ_ONLY, type Params } from "../constants.js";

const ISO2_DESC =
  "Country code in ISO 3166-1 alpha-2 format (e.g. 'US', 'PK').";
const FlagType = z.enum(["country", "organization"]);
const FlagShape = z.enum(["flat", "round"]);
const FlagFormat = z.enum(["png", "webp", "svg"]);
const FlagSize = z.enum(["16px", "24px", "32px", "48px", "64px"]);

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "geodb_admin_levels",
    {
      title: "GeoDB Admin Levels",
      description:
        "List the administrative level types defined for a country (e.g. state, district, province, outlying area). " +
        "Returns an 'admin_levels' array of strings. Use those names with 'geodb_admin_units' via admin_level. " +
        "A valid two-letter country code is required; invalid codes return 400 and countries without published admin levels return 404.",
      inputSchema: z.object({
        country: z.string().describe(ISO2_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ country }) => {
      const data = await callApi(ENDPOINTS.GEO_ADMIN_LEVELS, apiKey, {
        country,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "geodb_admin_units",
    {
      title: "GeoDB Admin Units",
      description:
        "List administrative units (states, provinces, governorates, districts) for a country. " +
        "Returns an 'admin_units' array; each item has name, admin_code, and admin_level. " +
        "Optionally filter by one or more levels with a comma-separated admin_level list. " +
        "A level name that matches nothing returns 200 with an empty admin_units array, not an error. " +
        "Countries without published admin units return 404. Use 'geodb_admin_levels' for valid level names.",
      inputSchema: z.object({
        country: z.string().describe(ISO2_DESC),
        admin_level: z
          .string()
          .optional()
          .describe(
            "Comma-separated administrative levels to filter by (e.g. 'state' or 'state,district'). Use 'geodb_admin_levels' for valid names. An unknown level for the country returns an empty admin_units array.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ country, admin_level }) => {
      const params: Params = { country };
      if (admin_level !== undefined) params["admin_level"] = admin_level;
      const data = await callApi(ENDPOINTS.GEO_ADMIN_UNITS, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "geodb_admin_unit_details",
    {
      title: "GeoDB Admin Unit Details",
      description:
        "Get details for one administrative unit identified by country code and admin unit code. " +
        "Returns name, admin_code, admin_iso3166_2, admin_level, country_iso3166_2, and country_name. " +
        "admin_iso3166_2 can be absent for some units. Both country and admin_unit are required; " +
        "invalid combinations return 400, unmatched combinations return 404. " +
        "Use 'geodb_admin_units' to find a valid admin_unit code.",
      inputSchema: z.object({
        country: z.string().describe(ISO2_DESC),
        admin_unit: z
          .string()
          .describe(
            "Admin code of the administrative unit (from 'geodb_admin_units').",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ country, admin_unit }) => {
      const data = await callApi(ENDPOINTS.GEO_ADMIN_UNIT_DETAILS, apiKey, {
        country,
        admin_unit,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "geodb_countries",
    {
      title: "GeoDB Countries",
      description:
        "List 250 countries and territories. " +
        "Returns a 'countries' array; each item has name, iso_alpha_2, iso_alpha_3, iso_numeric, capital, region, and subregion. " +
        "Optionally filter by region or subregion name. " +
        "capital, region, and subregion are empty strings (not omitted) for a handful of uninhabited or dependent territories " +
        "with no assigned value — e.g. Bouvet Island and Heard Island and McDonald Islands have no region/subregion, " +
        "and Antarctica/Tokelau/US Minor Outlying Islands have no capital. " +
        "Invalid region or subregion names return 400. " +
        "Use 'geodb_regions' / 'geodb_subregions' for valid filter names, and 'geodb_country_details' for one country's full metadata.",
      inputSchema: z.object({
        region: z
          .string()
          .optional()
          .describe(
            "Optional filter to return countries within a specific region (e.g. 'Europe', 'Asia'). Use 'geodb_regions' for valid names.",
          ),
        subregion: z
          .string()
          .optional()
          .describe(
            "Optional filter to return countries within a specific subregion (e.g. 'Northern Europe', 'Southern Asia'). Use 'geodb_subregions' for valid names.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ region, subregion }) => {
      const params: Params = {};
      if (region !== undefined) params["region"] = region;
      if (subregion !== undefined) params["subregion"] = subregion;
      const data = await callApi(ENDPOINTS.GEO_COUNTRIES, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "geodb_country_details",
    {
      title: "GeoDB Country Details",
      description:
        "Get metadata for one country by ISO 3166-1 alpha-2 code. " +
        "Returns name, iso_alpha_2, iso_alpha_3, iso_numeric, phone_code, capital, top_level_domain, native_name, " +
        "region, subregion, nationality, flag_emoji, currency_code, currency_name, and currency_symbol. " +
        "capital, region, and subregion are empty strings for the same uninhabited/dependent territories as 'geodb_countries'; " +
        "every other field, including currency and phone code, is populated for those territories. " +
        "Use 'geodb_countries' if you need to resolve a name to an alpha-2 code first. " +
        "Invalid or missing country codes return 400.",
      inputSchema: z.object({
        country: z.string().describe(ISO2_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ country }) => {
      const data = await callApi(ENDPOINTS.GEO_COUNTRY_DETAILS, apiKey, {
        country,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "geodb_cities",
    {
      title: "GeoDB Cities",
      description:
        "List all cities for a country. " +
        "Returns a 'cities' array; each item has name, latitude, longitude, iso_alpha_2, " +
        "and a nested admin_unit object (name, admin_code, admin_level). " +
        "Optionally filter by admin_unit code. " +
        "There is no pagination: large countries return every city in one response, which can be very large. " +
        "Prefer filtering with admin_unit (from 'geodb_admin_units') when you only need one subdivision. " +
        "An admin_unit code that does not exist for the country returns 400, not an empty result. " +
        "A recognized country with no cities (e.g. Vatican City) returns 404. " +
        "A valid country code is required.",
      inputSchema: z.object({
        country: z.string().describe(ISO2_DESC),
        admin_unit: z
          .string()
          .optional()
          .describe(
            "Administrative unit code to filter cities (from 'geodb_admin_units'). An unknown code for the country returns 400.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ country, admin_unit }) => {
      const params: Params = { country };
      if (admin_unit !== undefined) params["admin_unit"] = admin_unit;
      const data = await callApi(ENDPOINTS.GEO_CITIES, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "geodb_regions",
    {
      title: "GeoDB Regions",
      description:
        "List the geographical regions supported by GeoDB. " +
        "Returns a 'regions' array of exactly 6 names: Africa, Americas, Asia, Europe, Oceania, and Polar. " +
        "Use a returned name with 'geodb_subregions' to list subregions, or with 'geodb_countries' to filter countries.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      const data = await callApi(ENDPOINTS.GEO_REGIONS, apiKey);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "geodb_subregions",
    {
      title: "GeoDB Subregions",
      description:
        "List subregions within a geographical region, or all subregions across every region when 'region' is omitted. " +
        "Returns a 'subregions' array of names such as Western Europe, Southern Asia, or Northern America. " +
        "Use 'geodb_regions' for valid region names. An invalid region name returns 400; " +
        "a region with no subregions (Polar) returns 404.",
      inputSchema: z.object({
        region: z
          .string()
          .optional()
          .describe(
            "Region name to list subregions for (e.g. 'Europe', 'Asia'). Omit to return all subregions across every region. Use 'geodb_regions' for valid names.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ region }) => {
      const params: Params = {};
      if (region !== undefined) params["region"] = region;
      const data = await callApi(ENDPOINTS.GEO_SUBREGIONS, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "geodb_flags_supported",
    {
      title: "GeoDB Supported Flags",
      description:
        "List country and international-organization flags supported by 'geodb_flag'. " +
        "Returns 'supported_countries' (238 entries of name, iso2, iso3 — not iso_alpha_2) and " +
        "'supported_organizations' (22 case-sensitive identifier strings such as United_Nations, NATO, European_Union). " +
        "Organization identifiers must be passed to 'geodb_flag' exactly as listed here, including underscores and capitalization. " +
        "Use this before 'geodb_flag' if you are unsure of the name.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      const data = await callApi(ENDPOINTS.GEO_FLAGS_SUPPORTED, apiKey);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "geodb_flag",
    {
      title: "GeoDB Flag Image",
      description:
        "Retrieve a country or international-organization flag image. " +
        "Requires name, type ('country' or 'organization'), and shape ('flat' or 'round'). " +
        "For country flags, name is an ISO 3166-1 alpha-2 code. " +
        "For organization flags, name is case-sensitive and must exactly match an entry from 'geodb_flags_supported' " +
        "(e.g. NATO, European_Union, United_Nations) — lowercase or abbreviated forms return 404. " +
        "format is png (default), webp, or svg. size is 16px, 24px, 32px, 48px, or 64px (default 64px) and applies to PNG/WEBP only; " +
        "it is ignored for SVG. Missing/invalid parameters return 400; unrecognized identifiers return 404. " +
        "On success the response body is the raw image, returned here as MCP image content (SVG as text).",
      inputSchema: z.object({
        name: z
          .string()
          .describe(
            "ISO 3166-1 alpha-2 country code for type='country', or a case-sensitive organization identifier from 'geodb_flags_supported' for type='organization' (e.g. 'US', 'NATO', 'European_Union').",
          ),
        type: FlagType.describe(
          "Type of flag to retrieve: 'country' or 'organization'.",
        ),
        shape: FlagShape.describe("Shape of the flag image: 'flat' or 'round'."),
        format: FlagFormat.default("png").describe(
          "Image format: 'png' (default), 'webp', or 'svg'.",
        ),
        size: FlagSize.default("64px").describe(
          "Flag size for PNG/WEBP: 16px, 24px, 32px, 48px, or 64px (default). Ignored when format is svg.",
        ),
      }),
      annotations: READ_ONLY,
    },
    async ({ name, type, shape, format, size }) => {
      const params: Params = { name, type, shape, format };
      if (format !== "svg") params["size"] = size;
      const { bytes, mimeType } = await callApiBinary(
        ENDPOINTS.GEO_FLAGS,
        apiKey,
        params,
      );
      if (format === "svg" || mimeType === "image/svg+xml") {
        return {
          content: [
            {
              type: "text" as const,
              text: bytes.toString("utf8"),
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "image" as const,
            data: bytes.toString("base64"),
            mimeType: mimeType || `image/${format}`,
          },
        ],
      };
    },
  );
}
