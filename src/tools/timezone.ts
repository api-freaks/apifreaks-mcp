import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { GeoLang } from "../enums.js";
import { READ_ONLY, type Params } from "../constants.js";
import { requireIpOrLocation } from "../utils/location.js";

const LANG_DESC = "Language for location name fields. Defaults to English.";
const TZ_NAME_DESC =
  "Timezone name (tz database format, e.g. 'America/New_York', 'Europe/London').";
const IATA_DESC = "3-letter IATA airport code (e.g. 'JFK', 'LHR').";
const ICAO_DESC = "4-letter ICAO airport code (e.g. 'KJFK', 'EGLL').";
const LOCODE_DESC = "5-character UN/LOCODE for a city (e.g. 'USNYC', 'GBLON').";
const IP_DESC =
  "IPv4 or IPv6 address. Required if none of the other location fields are provided.";
const LOCATION_DESC =
  "City name or address (e.g. 'Tokyo, Japan', 'New York, US').";
const LAT_DESC = "Latitude (-90 to 90). Must be paired with 'long'.";
const LONG_DESC = "Longitude (-180 to 180). Must be paired with 'lat'.";

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "timezone_lookup",
    {
      title: "Timezone Lookup",
      description:
        "Look up timezone information for a location. " +
        "Accepts one of: IP address, timezone name, city/address, lat/long, IATA code, ICAO code, or UN/LOCODE. " +
        "At least one input is required — provide IP if location fields are not provided. " +
        "Returns current time, UTC offset, DST status, and timezone metadata. " +
        "Airport/LOCODE inputs also return venue details.",
      inputSchema: z.object({
        ip: z.string().optional().describe(IP_DESC),
        tz: z.string().optional().describe(TZ_NAME_DESC),
        location: z.string().optional().describe(LOCATION_DESC),
        lat: z.number().min(-90).max(90).optional().describe(LAT_DESC),
        long: z.number().min(-180).max(180).optional().describe(LONG_DESC),
        iata_code: z.string().optional().describe(IATA_DESC),
        icao_code: z.string().optional().describe(ICAO_DESC),
        lo_code: z.string().optional().describe(LOCODE_DESC),
        lang: GeoLang.default("en").describe(LANG_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({
      ip,
      tz,
      location,
      lat,
      long,
      iata_code,
      icao_code,
      lo_code,
      lang,
    }) => {
      requireIpOrLocation(
        ip,
        tz,
        location,
        lat,
        long,
        iata_code,
        icao_code,
        lo_code,
      );
      const params: Params = { lang };
      if (ip !== undefined) params["ip"] = ip;
      if (tz !== undefined) params["tz"] = tz;
      if (location !== undefined) params["location"] = location;
      if (lat !== undefined) params["lat"] = lat;
      if (long !== undefined) params["long"] = long;
      if (iata_code !== undefined) params["iata_code"] = iata_code;
      if (icao_code !== undefined) params["icao_code"] = icao_code;
      if (lo_code !== undefined) params["lo_code"] = lo_code;
      const data = await callApi(ENDPOINTS.GEO_TIMEZONE, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "timezone_convert",
    {
      title: "Timezone Converter",
      description:
        "Convert a date/time from one timezone to another. " +
        "Specify the source and destination timezone each using ONE of: " +
        "timezone name (tz_from/tz_to), coordinates (lat/long_from + lat/long_to), " +
        "city address (location_from/location_to), IATA code (iata_from/iata_to), " +
        "ICAO code (icao_from/icao_to), or UN/LOCODE (locode_from/locode_to).",
      inputSchema: z.object({
        time: z
          .string()
          .describe(
            "Datetime to convert. Formats: 'yyyy-MM-dd HH:mm' or 'yyyy-MM-dd HH:mm:ss'.",
          ),
        tz_from: z
          .string()
          .optional()
          .describe(
            "Source timezone name (e.g. 'America/New_York'). Use ONE source type only.",
          ),
        tz_to: z
          .string()
          .optional()
          .describe(
            "Destination timezone name (e.g. 'Asia/Tokyo'). Use ONE destination type only.",
          ),
        lat_from: z
          .number()
          .optional()
          .describe("Source latitude. Must be paired with 'long_from'."),
        long_from: z
          .number()
          .optional()
          .describe("Source longitude. Must be paired with 'lat_from'."),
        lat_to: z
          .number()
          .optional()
          .describe("Destination latitude. Must be paired with 'long_to'."),
        long_to: z
          .number()
          .optional()
          .describe("Destination longitude. Must be paired with 'lat_to'."),
        location_from: z
          .string()
          .optional()
          .describe("Source city/address (e.g. 'London, UK')."),
        location_to: z
          .string()
          .optional()
          .describe("Destination city/address (e.g. 'New York, US')."),
        iata_from: z
          .string()
          .optional()
          .describe("Source 3-letter IATA airport code (e.g. 'LHR')."),
        iata_to: z
          .string()
          .optional()
          .describe("Destination 3-letter IATA airport code (e.g. 'JFK')."),
        icao_from: z
          .string()
          .optional()
          .describe("Source 4-letter ICAO airport code (e.g. 'EGLL')."),
        icao_to: z
          .string()
          .optional()
          .describe("Destination 4-letter ICAO airport code (e.g. 'KJFK')."),
        locode_from: z
          .string()
          .optional()
          .describe("Source UN/LOCODE (e.g. 'GBLON')."),
        locode_to: z
          .string()
          .optional()
          .describe("Destination UN/LOCODE (e.g. 'USNYC')."),
      }),
      annotations: READ_ONLY,
    },
    async ({
      time,
      tz_from,
      tz_to,
      lat_from,
      long_from,
      lat_to,
      long_to,
      location_from,
      location_to,
      iata_from,
      iata_to,
      icao_from,
      icao_to,
      locode_from,
      locode_to,
    }) => {
      const params: Params = { time };
      if (tz_from !== undefined) params["tz_from"] = tz_from;
      if (tz_to !== undefined) params["tz_to"] = tz_to;
      if (lat_from !== undefined) params["lat_from"] = lat_from;
      if (long_from !== undefined) params["long_from"] = long_from;
      if (lat_to !== undefined) params["lat_to"] = lat_to;
      if (long_to !== undefined) params["long_to"] = long_to;
      if (location_from !== undefined) params["location_from"] = location_from;
      if (location_to !== undefined) params["location_to"] = location_to;
      if (iata_from !== undefined) params["iata_from"] = iata_from;
      if (iata_to !== undefined) params["iata_to"] = iata_to;
      if (icao_from !== undefined) params["icao_from"] = icao_from;
      if (icao_to !== undefined) params["icao_to"] = icao_to;
      if (locode_from !== undefined) params["locode_from"] = locode_from;
      if (locode_to !== undefined) params["locode_to"] = locode_to;
      const data = await callApi(
        ENDPOINTS.GEO_TIMEZONE_CONVERTER,
        apiKey,
        params,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
