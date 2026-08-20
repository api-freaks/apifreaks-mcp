import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { READ_ONLY, type Params } from "../constants.js";

const QUERY_DESC =
  "Free-form search query. Accepts addresses, place names, business names, and landmarks (e.g. 'Wembley Stadium, London').";
const LANG_DESC =
  "Language preference for result names. A single code or a comma-separated list (sent as the Accept-Language header). " +
  "Defaults to English if omitted or unmatched.";
const VIEWBOX_TOGETHER =
  "All four viewbox parameters (min_lat, max_lat, min_lon, max_lon) must be provided together.";

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "geocode_forward",
    {
      title: "Forward Geocoding",
      description:
        "Convert a free-form address, place name, landmark, or business name into WGS84 coordinates. " +
        "Returns a JSON array of matches (default 1, max 40), each with coordinates, address components " +
        "(street, postcode, city, state, country), a bounding box [lat_min, lat_max, lon_min, lon_max], " +
        "and optional points of interest. " +
        "Pass all four of min_lat, max_lat, min_lon, and max_lon together to bias results toward a viewbox. " +
        "Optional accept_language localizes names (default English). " +
        "No match returns 404, not an empty array.",
      inputSchema: z.object({
        query: z.string().describe(QUERY_DESC),
        limit: z
          .number()
          .int()
          .min(1)
          .max(40)
          .default(1)
          .describe(
            "Maximum number of results to return. Min 1, max 40. Defaults to 1.",
          ),
        min_lat: z
          .number()
          .min(-90)
          .max(90)
          .optional()
          .describe(
            "Minimum latitude of the viewbox (-90 to 90). Must be ≤ max_lat. " +
              VIEWBOX_TOGETHER,
          ),
        max_lat: z
          .number()
          .min(-90)
          .max(90)
          .optional()
          .describe(
            "Maximum latitude of the viewbox (-90 to 90). Must be ≥ min_lat. " +
              VIEWBOX_TOGETHER,
          ),
        min_lon: z
          .number()
          .min(-180)
          .max(180)
          .optional()
          .describe(
            "Minimum longitude of the viewbox (-180 to 180). Must be ≤ max_lon. " +
              VIEWBOX_TOGETHER,
          ),
        max_lon: z
          .number()
          .min(-180)
          .max(180)
          .optional()
          .describe(
            "Maximum longitude of the viewbox (-180 to 180). Must be ≥ min_lon. " +
              VIEWBOX_TOGETHER,
          ),
        accept_language: z.string().optional().describe(LANG_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({
      query,
      limit,
      min_lat,
      max_lat,
      min_lon,
      max_lon,
      accept_language,
    }) => {
      const params: Params = { query, limit };
      if (min_lat !== undefined) params["min_lat"] = min_lat;
      if (max_lat !== undefined) params["max_lat"] = max_lat;
      if (min_lon !== undefined) params["min_lon"] = min_lon;
      if (max_lon !== undefined) params["max_lon"] = max_lon;
      const data = await callApi(
        ENDPOINTS.GEOCODER_SEARCH,
        apiKey,
        params,
        undefined,
        "GET",
        languageHeader(accept_language),
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "geocode_reverse",
    {
      title: "Reverse Geocoding",
      description:
        "Turn WGS84 coordinates into the nearest street address. " +
        "A single request returns one result: the closest match, with address components, " +
        "a bounding box, and nearby points of interest. " +
        "lat is -90 to 90; lon is -180 to 180. " +
        "Optional accept_language localizes names (default English). " +
        "Out-of-range or missing coordinates return 400; no match returns 404.",
      inputSchema: z.object({
        lat: z
          .number()
          .min(-90)
          .max(90)
          .describe("Latitude of the location. Valid range: -90 to 90."),
        lon: z
          .number()
          .min(-180)
          .max(180)
          .describe("Longitude of the location. Valid range: -180 to 180."),
        accept_language: z.string().optional().describe(LANG_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ lat, lon, accept_language }) => {
      const data = await callApi(
        ENDPOINTS.GEOCODER_REVERSE,
        apiKey,
        { lat, lon },
        undefined,
        "GET",
        languageHeader(accept_language),
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}

function languageHeader(
  acceptLanguage: string | undefined,
): Record<string, string> | undefined {
  if (acceptLanguage === undefined) {
    return undefined;
  }
  return { "Accept-Language": acceptLanguage };
}
