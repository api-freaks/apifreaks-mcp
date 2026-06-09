import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { DomainResultSource } from "../enums.js";
import { READ_ONLY, type Params } from "../constants.js";

const DOMAIN_DESC =
  "Domain name to check availability for (e.g. 'example.com').";
const SOURCE_DESC =
  "Data source for the availability check: 'dns' (faster) or 'whois' (more accurate). Defaults to 'dns'.";

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "domain_check_availability",
    {
      title: "Domain Availability Check",
      description:
        "Check whether a single domain name is available for registration. " +
        "Returns a boolean 'domainAvailability' field. " +
        "Use source='whois' for a more authoritative check, source='dns' for a faster one.",
      inputSchema: z.object({
        domain: z.string().describe(DOMAIN_DESC),
        source: DomainResultSource.default("dns").describe(SOURCE_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ domain, source }) => {
      const data = await callApi(ENDPOINTS.DOMAIN_AVAILABILITY, apiKey, {
        domain,
        source,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "domain_check_availability_with_suggestions",
    {
      title: "Domain Availability with Suggestions",
      description:
        "Check domain name availability and receive alternative domain name suggestions " +
        "across different TLDs and SLDs if the domain is taken. " +
        "Returns a 'domain_available_response' array with availability status for " +
        "the queried domain plus the requested number of suggestions (up to 100).",
      inputSchema: z.object({
        domain: z.string().describe(DOMAIN_DESC),
        source: DomainResultSource.default("dns").describe(SOURCE_DESC),
        count: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(5)
          .describe(
            "Number of alternative domain name suggestions to return (max 100). Defaults to 5.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ domain, source, count }) => {
      const data = await callApi(
        ENDPOINTS.DOMAIN_AVAILABILITY_SUGGESTIONS,
        apiKey,
        { domain, source, count },
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "domain_bulk_check_availability",
    {
      title: "Bulk Domain Availability Check",
      description:
        "Check domain name availability for up to 100 domains at once. " +
        "Returns a 'bulk_domain_availability_response' array one result per input domain. Each result includes " +
        "'domain', 'domainAvailability' (true/false), and 'status' (true if the check succeeded). " +
        "Always verify 'status' before trusting 'domainAvailability'.",
      inputSchema: z.object({
        domain_names: z
          .array(z.string())
          .max(100)
          .describe(
            'List of domain names to check availability for (max 100). Example: ["example.com", "mybrand.io"]',
          ),
        source: DomainResultSource.default("dns").describe(SOURCE_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ domain_names, source }) => {
      const data = await callApi(
        ENDPOINTS.DOMAIN_AVAILABILITY,
        apiKey,
        { source } as Params,
        { domainNames: domain_names },
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
