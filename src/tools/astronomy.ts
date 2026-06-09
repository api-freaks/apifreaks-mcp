import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { GeoLang } from "../enums.js";
import { READ_ONLY, type Params } from "../constants.js";
import { requireIpOrLocation } from "../utils/location.js";

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "astronomy_lookup",
    {
      title: "Astronomy Lookup",
      description:
        "Get astronomy data for a location and date: sunrise/sunset, moon phase, twilight, " +
        "golden/blue hour, solar noon, moonrise/moonset, and sun/moon position metrics. " +
        "Provide one of: ip, location, or lat+long. At least one is required. " +
        "Date format: YYYY-MM-DD (past or future), defaulting to today.",
      inputSchema: z.object({
        location: z
          .string()
          .optional()
          .describe(
            "City name or address (e.g. 'London', 'Tokyo, Japan'). Use EITHER this OR lat+long OR ip.",
          ),
        lat: z
          .number()
          .min(-90)
          .max(90)
          .optional()
          .describe("Latitude (-90 to 90). Must be paired with 'long'."),
        long: z
          .number()
          .min(-180)
          .max(180)
          .optional()
          .describe("Longitude (-180 to 180). Must be paired with 'lat'."),
        ip: z
          .string()
          .optional()
          .describe(
            "IPv4 or IPv6 address for location. Required if 'location' and lat/long are not provided.",
          ),
        date: z
          .string()
          .optional()
          .describe(
            "Date in YYYY-MM-DD format. Accepts past or future dates. Defaults to today.",
          ),
        elevation: z
          .number()
          .min(0)
          .max(10_000)
          .default(0)
          .describe(
            "Elevation above sea level in meters (0–10,000). Defaults to 0.",
          ),
        time_zone: z
          .string()
          .optional()
          .describe(
            "Preferred timezone for returned time values (tz database name, e.g. 'America/New_York'). Defaults to the resolved location's timezone.",
          ),
        lang: GeoLang.default("en").describe(
          "Language for location name fields. Defaults to English.",
        ),
      }),
      annotations: READ_ONLY,
    },
    async ({ location, lat, long, ip, date, elevation, time_zone, lang }) => {
      requireIpOrLocation(ip, location, lat, long);
      const params: Params = { lang, elevation };
      if (location !== undefined) params["location"] = location;
      if (lat !== undefined) params["lat"] = lat;
      if (long !== undefined) params["long"] = long;
      if (ip !== undefined) params["ip"] = ip;
      if (date !== undefined) params["date"] = date;
      if (time_zone !== undefined) params["time_zone"] = time_zone;
      const data = await callApi(ENDPOINTS.GEO_ASTRONOMY, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
