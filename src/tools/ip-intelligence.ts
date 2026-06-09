import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { GeoLang } from "../enums.js";
import { READ_ONLY, type Params } from "../constants.js";

const INCLUDE_DESC =
  "Additional data modules to include. " +
  "Available: security, hostname, liveHostname, hostnameFallbackLive, user_agent, abuse, dma_code, time_zone, geo_accuracy.";
const FIELDS_DESC =
  "Comma-separated dot-path fields to include in the response (allowlist). E.g. 'location.city,asn.organization'.";
const EXCLUDES_DESC =
  "Comma-separated dot-path fields to exclude from the response (denylist). E.g. 'location.city,asn.organization'.";
const LANG_DESC = "Language for location name fields. Defaults to English.";

const IncludeModule = z.enum([
  "security",
  "hostname",
  "liveHostname",
  "hostnameFallbackLive",
  "user_agent",
  "abuse",
  "dma_code",
  "time_zone",
  "geo_accuracy",
]);

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "ipgeolocation_lookup",
    {
      title: "IP Geolocation Lookup",
      description:
        "Look up geolocation data for an IP address, IPv6 address, or hostname. " +
        "Returns location, network/ASN, currency, and optionally security, timezone, " +
        "hostname, abuse contact, and user-agent data. 'ip' field is required — pass the IP or hostname to look up.",
      inputSchema: z.object({
        ip: z
          .string()
          .describe("IPv4 address, IPv6 address, or hostname to look up."),
        lang: GeoLang.default("en").describe(LANG_DESC),
        include: z.array(IncludeModule).optional().describe(INCLUDE_DESC),
        fields: z.string().optional().describe(FIELDS_DESC),
        excludes: z.string().optional().describe(EXCLUDES_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ ip, lang, include, fields, excludes }) => {
      const params: Params = { ip, lang };
      if (include?.length) params["include"] = include.join(",");
      if (fields !== undefined) params["fields"] = fields;
      if (excludes !== undefined) params["excludes"] = excludes;
      const data = await callApi(ENDPOINTS.GEO_IP_LOOKUP, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "ipgeolocation_bulk_lookup",
    {
      title: "Bulk IP Geolocation Lookup",
      description:
        "Look up geolocation data for up to 50,000 IP addresses or hostnames in one request. " +
        "Returns an array of geolocation objects — same fields as the single lookup. " +
        "Individual IP failures include a 'message' field; they don't block other results.",
      inputSchema: z.object({
        ips: z
          .array(z.string())
          .max(50_000)
          .describe(
            'List of IPv4/IPv6 addresses or hostnames to look up (max 50,000). Example: ["8.8.8.8", "1.1.1.1"]',
          ),
        lang: GeoLang.default("en").describe(LANG_DESC),
        include: z.array(IncludeModule).optional().describe(INCLUDE_DESC),
        fields: z.string().optional().describe(FIELDS_DESC),
        excludes: z.string().optional().describe(EXCLUDES_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ ips, lang, include, fields, excludes }) => {
      const params: Params = { lang };
      if (include?.length) params["include"] = include.join(",");
      if (fields !== undefined) params["fields"] = fields;
      if (excludes !== undefined) params["excludes"] = excludes;
      const data = await callApi(
        ENDPOINTS.GEO_IP_LOOKUP,
        apiKey,
        params,
        { ips },
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
