import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { IpGeoLang } from "../enums.js";
import { READ_ONLY, type Params } from "../constants.js";

const INCLUDE_DESC =
  "Additional data modules to include. " +
  "Available: security, hostname, liveHostname, hostnameFallbackLive, user_agent, abuse, dma_code, geo_accuracy. Use '*' to include all modules. " +
  "Note: 'security' and 'abuse' fields cost extra credits.";
const FIELDS_DESC =
  "Comma-separated dot-path fields to include in the response (allowlist). E.g. 'location.city,asn.organization' or 'security.threat_score'.";
const EXCLUDES_DESC =
  "Comma-separated dot-path fields to exclude from the response (denylist). The 'ip' field is always included and cannot be excluded.";
const LANG_DESC =
  "Language for location name fields. Defaults to English. " +
  "Supported: en, de, ru, ja, fr, cn, es, cs, it, ko, fa, pt.";
const SECURITY_PROFILE_DESC =
  "a 0-100 'threat_score' plus VPN, proxy (incl. residential), Tor, relay, anonymity, " +
  "known-attacker, bot, spam, cloud-provider, and corporate-gateway signals. " +
  "Where available: provider names, confidence scores, last-seen dates; for bots also 'bot_type', " +
  "'is_known_good_bot', 'bot_operator_name', and confidence; for gateways 'corporate_gateway_type' " +
  "('secure_web_gateway' | 'browser_isolation') and provider name. " +
  "Use fields/excludes with dot-paths (e.g. 'security.threat_score') to trim the response.";

const IncludeModule = z.enum([
  "security",
  "hostname",
  "liveHostname",
  "hostnameFallbackLive",
  "user_agent",
  "abuse",
  "dma_code",
  "geo_accuracy",
  "*",
]);

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "ipgeolocation_lookup",
    {
      title: "IP Geolocation Lookup",
      description:
        "Look up geolocation data for an IP address, IPv6 address, or hostname. " +
        "Returns location, country_metadata, network, ASN, company, currency, and time_zone by default. " +
        "Pass include to add security, hostname/liveHostname/hostnameFallbackLive, user_agent, abuse, dma_code, " +
        "or geo_accuracy (or '*' for all). Bogon/reserved IPs return 423; unrecognized IPs return 404.",
      inputSchema: z.object({
        ip: z
          .string()
          .describe("IPv4 address, IPv6 address, or hostname to look up."),
        lang: IpGeoLang.default("en").describe(LANG_DESC),
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
        "Returns an array in request order — same default fields as the single lookup (location, " +
        "country_metadata, network, ASN, company, currency, time_zone), with the same include modules. " +
        "Individual IP failures return a per-item object with a 'message' field; they don't block other results.",
      inputSchema: z.object({
        ips: z
          .array(z.string())
          .max(50_000)
          .describe(
            'List of IPv4/IPv6 addresses or hostnames to look up (max 50,000). Example: ["8.8.8.8", "1.1.1.1"]',
          ),
        lang: IpGeoLang.default("en").describe(LANG_DESC),
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

  server.registerTool(
    "ip_security_lookup",
    {
      title: "IP Threat Intelligence Lookup",
      description:
        "IP threat intelligence for a single IPv4 or IPv6 address. Returns " +
        SECURITY_PROFILE_DESC +
        " If 'ip' is omitted, the public IP of the requesting client is used. " +
        "Malformed IPs return 400; bogon/reserved IPs return 423.",
      inputSchema: z.object({
        ip: z
          .string()
          .optional()
          .describe(
            "IPv4 or IPv6 address to check. If omitted, the public IP of the requesting client is used.",
          ),
        fields: z.string().optional().describe(FIELDS_DESC),
        excludes: z.string().optional().describe(EXCLUDES_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ ip, fields, excludes }) => {
      const params: Params = {};
      if (ip !== undefined) params["ip"] = ip;
      if (fields !== undefined) params["fields"] = fields;
      if (excludes !== undefined) params["excludes"] = excludes;
      const data = await callApi(ENDPOINTS.IP_SECURITY, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "ip_security_bulk_lookup",
    {
      title: "Bulk IP Threat Intelligence Lookup",
      description:
        "IP threat intelligence for up to 50,000 IP addresses in one request. " +
        "Returns an array in request order with the same security profile as the single lookup: " +
        SECURITY_PROFILE_DESC +
        " A bad or bogon IP in the batch returns a per-item object with a 'message' field; it does not fail the whole request.",
      inputSchema: z.object({
        ips: z
          .array(z.string())
          .max(50_000)
          .describe(
            'List of IPv4/IPv6 addresses to check (max 50,000). Example: ["8.8.8.8", "1.1.1.1"]',
          ),
        fields: z.string().optional().describe(FIELDS_DESC),
        excludes: z.string().optional().describe(EXCLUDES_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ ips, fields, excludes }) => {
      const params: Params = {};
      if (fields !== undefined) params["fields"] = fields;
      if (excludes !== undefined) params["excludes"] = excludes;
      const data = await callApi(
        ENDPOINTS.IP_SECURITY,
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
