import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { ForecastPrecision, HistoricalPrecision } from "../enums.js";
import { requireIpOrLocation } from "../utils/location.js";
import { READ_ONLY, Params } from "../constants.js";

const LOC_DESC =
  'Target location — city name, place name, or full address (e.g. "London", "Paris, France", "1600 Amphitheatre Parkway, Mountain View, CA").';
const LAT_DESC = "Latitude (-90 to 90). Must be paired with 'long'.";
const LONG_DESC = "Longitude (-180 to 180). Must be paired with 'lat'.";
const IP_DESC =
  "IPv4 or IPv6 address. Required if 'location' and lat/long are not provided.";
const TZ_DESC =
  "Timezone for returned timestamps (tz database name, e.g. 'America/New_York'). Defaults to the resolved location's timezone.";

function buildLocationParams(
  location?: string,
  lat?: number,
  long?: number,
  ip?: string,
  timezone?: string,
): Params {
  requireIpOrLocation(location, lat, long, ip);
  const params: Params = {};
  if (location !== undefined) params["location"] = location;
  if (lat !== undefined) params["lat"] = lat;
  if (long !== undefined) params["long"] = long;
  if (ip !== undefined) params["ip"] = ip;
  if (timezone !== undefined) params["timezone"] = timezone;
  return params;
}

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "weather_current",
    {
      title: "Current Weather",
      description:
        "Get real-time weather for a location, including temperature, humidity, " +
        "wind, pressure, air quality (AQI), and astronomy (sunrise/sunset/moon phase). " +
        "Provide at least one of: 'location', lat+long, or 'ip'.",
      inputSchema: z.object({
        location: z.string().optional().describe(LOC_DESC),
        lat: z.number().min(-90).max(90).optional().describe(LAT_DESC),
        long: z.number().min(-180).max(180).optional().describe(LONG_DESC),
        ip: z.string().optional().describe(IP_DESC),
        time_zone: z.string().optional().describe(TZ_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ location, lat, long, ip, time_zone }) => {
      const params = buildLocationParams(location, lat, long, ip, time_zone);
      const data = await callApi(ENDPOINTS.WEATHER_CURRENT, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "weather_bulk_current",
    {
      title: "Bulk Current Weather",
      description:
        "Get real-time weather for up to 50 locations at once. " +
        "Each location in the array can be a city name, lat/long pair, or IP address. " +
        "Returns weather + astronomy data for each location wrapped in a 'bulk' array.",
      inputSchema: z.object({
        locations: z
          .array(
            z.object({
              location: z.string().optional().describe(LOC_DESC),
              lat: z.number().min(-90).max(90).optional().describe(LAT_DESC),
              long: z
                .number()
                .min(-180)
                .max(180)
                .optional()
                .describe(LONG_DESC),
              ip: z.string().optional().describe(IP_DESC),
            }),
          )
          .max(50)
          .describe(
            "Array of location objects (max 50). Each object can contain: " +
              '"location" (string), "lat"+"long" (floats), or "ip" (string). ' +
              'Example: [{"location":"London"},{"lat":48.85,"long":2.35},{"ip":"8.8.8.8"}]',
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ locations }) => {
      const data = await callApi(
        ENDPOINTS.WEATHER_CURRENT,
        apiKey,
        {},
        { locations },
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "weather_forecast",
    {
      title: "Weather Forecast",
      description:
        "Get weather forecast for up to 16 days with daily, hourly, or minutely precision. " +
        "Use EITHER 'forecast_days' OR 'start_date'+'end_date' to define the range, not both. " +
        "Only current or future dates are allowed. " +
        "Provide at least one of: 'location', lat+long, or 'ip'.",
      inputSchema: z.object({
        location: z.string().optional().describe(LOC_DESC),
        lat: z.number().min(-90).max(90).optional().describe(LAT_DESC),
        long: z.number().min(-180).max(180).optional().describe(LONG_DESC),
        ip: z.string().optional().describe(IP_DESC),
        start_date: z
          .string()
          .optional()
          .describe(
            "Start date for forecast range (YYYY-MM-DD). Current or future dates only. Must be paired with 'end_date'. Max 16-day range.",
          ),
        end_date: z
          .string()
          .optional()
          .describe(
            "End date for forecast range (YYYY-MM-DD). Current or future dates only. Must be paired with 'start_date'. Max 16-day range.",
          ),
        forecast_days: z
          .number()
          .int()
          .min(1)
          .max(16)
          .optional()
          .describe(
            "Number of forecast days (1–16). Defaults to 7 if neither this nor start_date/end_date is provided. Do NOT combine with start_date/end_date.",
          ),
        precision: ForecastPrecision.default("daily").describe(
          "Forecast granularity: 'daily' (default), 'hourly', or 'minutely'.",
        ),
        time_zone: z.string().optional().describe(TZ_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({
      location,
      lat,
      long,
      ip,
      start_date,
      end_date,
      forecast_days,
      precision,
      time_zone,
    }) => {
      const params = buildLocationParams(location, lat, long, ip, time_zone);
      params["precision"] = precision;
      if (start_date !== undefined) params["startDate"] = start_date;
      if (end_date !== undefined) params["endDate"] = end_date;
      if (forecast_days !== undefined) params["forecastDays"] = forecast_days;
      const data = await callApi(ENDPOINTS.WEATHER_FORECAST, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "weather_historical",
    {
      title: "Historical Weather",
      description:
        "Get historical weather data for a specific past date (back to 1940). " +
        "Returns daily or hourly weather + astronomy for the given date. " +
        "Only past dates are allowed — current or future dates are rejected. " +
        "Provide at least one of: 'location', lat+long, or 'ip'.",
      inputSchema: z.object({
        date: z
          .string()
          .describe(
            "Target date in YYYY-MM-DD format. Must be a past date (back to 1940).",
          ),
        location: z.string().optional().describe(LOC_DESC),
        lat: z.number().min(-90).max(90).optional().describe(LAT_DESC),
        long: z.number().min(-180).max(180).optional().describe(LONG_DESC),
        ip: z.string().optional().describe(IP_DESC),
        precision: HistoricalPrecision.default("daily").describe(
          "Data granularity: 'daily' (default) or 'hourly'.",
        ),
        time_zone: z.string().optional().describe(TZ_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ date, location, lat, long, ip, precision, time_zone }) => {
      const params = buildLocationParams(location, lat, long, ip, time_zone);
      params["date"] = date;
      params["precision"] = precision;
      const data = await callApi(ENDPOINTS.WEATHER_HISTORICAL, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "weather_time_series",
    {
      title: "Weather Time Series",
      description:
        "Get historical weather data over a date range (time series). " +
        "Max range: 90 days for daily precision, 7 days for hourly. " +
        "Only past dates are allowed — current or future dates are rejected. " +
        "Data available back to 1940. " +
        "Provide at least one of: 'location', lat+long, or 'ip'.",
      inputSchema: z.object({
        start_date: z
          .string()
          .describe("Start date in YYYY-MM-DD format. Must be a past date."),
        end_date: z
          .string()
          .describe(
            "End date in YYYY-MM-DD format. Must be a past date. Max 90 days from start_date (daily) or 7 days (hourly).",
          ),
        location: z.string().optional().describe(LOC_DESC),
        lat: z.number().min(-90).max(90).optional().describe(LAT_DESC),
        long: z.number().min(-180).max(180).optional().describe(LONG_DESC),
        ip: z.string().optional().describe(IP_DESC),
        precision: HistoricalPrecision.default("daily").describe(
          "Data granularity: 'daily' (default, max 90 days) or 'hourly' (max 7 days).",
        ),
        time_zone: z.string().optional().describe(TZ_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({
      start_date,
      end_date,
      location,
      lat,
      long,
      ip,
      precision,
      time_zone,
    }) => {
      const params = buildLocationParams(location, lat, long, ip, time_zone);
      params["startDate"] = start_date;
      params["endDate"] = end_date;
      params["precision"] = precision;
      const data = await callApi(ENDPOINTS.WEATHER_TIMESERIES, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "weather_air_quality",
    {
      title: "Air Quality",
      description:
        "Get air quality data either real-time or forecast. " +
        "Returns PM2.5, PM10, CO, NO₂, SO₂, ozone, dust, and UV index. " +
        "Real-time mode also includes AQI summary indices (US & EU); forecast mode returns raw pollutant values only. " +
        "Omit dates for real-time AQI. Provide 'start_date' and 'end_date' for hourly AQI forecast (max 6 days, current/future dates only). " +
        "NOTE: Use this tool over 'weather_current' when you need standalone or forecast air quality data. " +
        "Provide at least one of: 'location', lat+long, or 'ip'.",
      inputSchema: z.object({
        location: z.string().optional().describe(LOC_DESC),
        lat: z.number().min(-90).max(90).optional().describe(LAT_DESC),
        long: z.number().min(-180).max(180).optional().describe(LONG_DESC),
        ip: z.string().optional().describe(IP_DESC),
        start_date: z
          .string()
          .optional()
          .describe(
            "Start date for AQI forecast (YYYY-MM-DD). Current/future dates only. Must be paired with 'end_date'. Max 6-day range. Omit for real-time AQI.",
          ),
        end_date: z
          .string()
          .optional()
          .describe(
            "End date for AQI forecast (YYYY-MM-DD). Current/future dates only. Must be paired with 'start_date'. Max 6-day range.",
          ),
        time_zone: z.string().optional().describe(TZ_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ location, lat, long, ip, start_date, end_date, time_zone }) => {
      const params = buildLocationParams(location, lat, long, ip, time_zone);
      if (start_date !== undefined) params["startDate"] = start_date;
      if (end_date !== undefined) params["endDate"] = end_date;
      const data = await callApi(ENDPOINTS.WEATHER_AIR_QUALITY, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "weather_marine",
    {
      title: "Marine Weather",
      description:
        "Get marine/ocean weather, real-time or forecast, up to 16 days. " +
        "Returns wave height, swell, wind speed/direction, and sea-surface data. " +
        "Omit dates for real-time conditions. Provide 'start_date' and 'end_date' for forecast mode (max 16 days, current/future dates only). " +
        "Coordinates (lat/long) are recommended for offshore/ocean queries since city names resolve to land. " +
        "Provide at least one of: 'location', lat+long, or 'ip'.",
      inputSchema: z.object({
        location: z.string().optional().describe(LOC_DESC),
        lat: z
          .number()
          .min(-90)
          .max(90)
          .optional()
          .describe(LAT_DESC + " Recommended for offshore/ocean queries."),
        long: z
          .number()
          .min(-180)
          .max(180)
          .optional()
          .describe(LONG_DESC + " Recommended for offshore/ocean queries."),
        ip: z.string().optional().describe(IP_DESC),
        start_date: z
          .string()
          .optional()
          .describe(
            "Start date for marine forecast (YYYY-MM-DD). Current/future dates only. Must be paired with 'end_date'. Max 16-day range. Omit for real-time conditions.",
          ),
        end_date: z
          .string()
          .optional()
          .describe(
            "End date for marine forecast (YYYY-MM-DD). Current/future dates only. Must be paired with 'start_date'. Max 16-day range.",
          ),
        precision: ForecastPrecision.default("daily").describe(
          "Data granularity: 'daily' (default), 'hourly', or 'minutely'.",
        ),
        time_zone: z.string().optional().describe(TZ_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({
      location,
      lat,
      long,
      ip,
      start_date,
      end_date,
      precision,
      time_zone,
    }) => {
      const params = buildLocationParams(location, lat, long, ip, time_zone);
      params["precision"] = precision;
      if (start_date !== undefined) params["startDate"] = start_date;
      if (end_date !== undefined) params["endDate"] = end_date;
      const data = await callApi(ENDPOINTS.WEATHER_MARINE, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "weather_flood_forecast",
    {
      title: "Flood Forecast",
      description:
        "Get flood forecast data — river discharge and flow percentiles (mean, median, min/max, p25/p75). " +
        "Forecast range up to 16 days. Only current or future dates are allowed. " +
        "Data may be limited for locations far from rivers. " +
        "Provide at least one of: 'location', lat+long, or 'ip'.",
      inputSchema: z.object({
        start_date: z
          .string()
          .describe(
            "Start date in YYYY-MM-DD format. Current or future dates only.",
          ),
        end_date: z
          .string()
          .describe(
            "End date in YYYY-MM-DD format. Current or future dates only. Max 16 days from start_date.",
          ),
        location: z.string().optional().describe(LOC_DESC),
        lat: z.number().min(-90).max(90).optional().describe(LAT_DESC),
        long: z.number().min(-180).max(180).optional().describe(LONG_DESC),
        ip: z.string().optional().describe(IP_DESC),
        time_zone: z.string().optional().describe(TZ_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ start_date, end_date, location, lat, long, ip, time_zone }) => {
      const params = buildLocationParams(location, lat, long, ip, time_zone);
      params["startDate"] = start_date;
      params["endDate"] = end_date;
      const data = await callApi(ENDPOINTS.WEATHER_FLOOD, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
