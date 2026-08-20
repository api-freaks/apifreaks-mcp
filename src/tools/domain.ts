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
const SUBDOMAIN_STATUS = z.enum(["active", "inactive"]);

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

  server.registerTool(
    "domain_subdomain_lookup",
    {
      title: "Subdomain Lookup",
      description:
        "List subdomains discovered for a domain, with first-seen and last-seen dates. " +
        "Results are paginated at 100 subdomains per page. The response includes 'domain', 'status', " +
        "'current_page', 'total_pages', 'total_records', and a 'subdomains' array. " +
        "Each subdomain object has 'subdomain' and 'last_seen'; 'first_seen' can be absent, " +
        "and 'inactive_from' appears only on inactive records. " +
        "Defaults to status='active' and page=1. 'after' must be earlier than 'before', and neither date can be in the future. " +
        "Check 'total_pages' before requesting further pages.",
      inputSchema: z.object({
        domain: z
          .string()
          .describe("Domain name to list subdomains for (e.g. 'example.com')."),
        status: SUBDOMAIN_STATUS.default("active").describe(
          "Filter by discovery status: 'active' (default) or 'inactive'.",
        ),
        after: z
          .string()
          .optional()
          .describe(
            "Filter subdomains seen after this date (YYYY-MM-DD). Must be earlier than 'before' and not in the future.",
          ),
        before: z
          .string()
          .optional()
          .describe(
            "Filter subdomains seen before this date (YYYY-MM-DD). Must be later than 'after' and not in the future.",
          ),
        page: z
          .number()
          .int()
          .min(1)
          .default(1)
          .describe(
            "Page number for paginated results (100 subdomains per page). Defaults to 1.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ domain, status, after, before, page }) => {
      const params: Params = { domain, status, page };
      if (after !== undefined) params["after"] = after;
      if (before !== undefined) params["before"] = before;
      const data = await callApi(
        ENDPOINTS.DOMAIN_SUBDOMAIN_LOOKUP,
        apiKey,
        params,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
