import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { WhoisReverseLookupMode } from "../enums.js";
import { READ_ONLY, type Params } from "../constants.js";

const DOMAIN_NAME_DESC =
  "Domain name or URL to look up (e.g. 'example.com'). Sub-domains resolve to their root domain automatically.";

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "whois_domain_lookup",
    {
      title: "WHOIS Domain Lookup",
      description:
        "Retrieve live WHOIS data for a domain name. " +
        "Returns registrar details, registrant/admin/technical contacts, name servers, " +
        "domain status, expiry dates, and raw WHOIS text.",
      inputSchema: z.object({
        domain_name: z.string().describe(DOMAIN_NAME_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ domain_name }) => {
      const data = await callApi(ENDPOINTS.WHOIS_DOMAIN_LIVE, apiKey, {
        domainName: domain_name,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "whois_ip_lookup",
    {
      title: "WHOIS IP Lookup",
      description:
        "Retrieve live WHOIS ownership and network data for an IPv4 or IPv6 address. " +
        "Returns network block info, CIDR ranges, organization details, " +
        "technical/abuse contacts, and raw WHOIS text from the relevant RIR.",
      inputSchema: z.object({
        ip: z
          .string()
          .describe("IPv4 or IPv6 address to look up (e.g. '8.8.8.8')."),
      }),
      annotations: READ_ONLY,
    },
    async ({ ip }) => {
      const data = await callApi(ENDPOINTS.WHOIS_IP_LIVE, apiKey, { ip });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "whois_asn_lookup",
    {
      title: "WHOIS ASN Lookup",
      description:
        "Retrieve real-time WHOIS data for an Autonomous System Number. " +
        "Returns AS name, organization, allocation status, associated CIDR route objects, " +
        "upstream/downstream/peer ASNs, contact emails, and raw WHOIS text. " +
        "Accepts the ASN with or without the 'AS' prefix (e.g. 'AS15169' or '15169')." +
        "Warning: Large ASNs (e.g. major cloud/telecom providers) can return very large responses with thousands of routes and peers, which may consume significant tokens.",
      inputSchema: z.object({
        asn: z
          .string()
          .describe(
            "Autonomous System Number to look up. Accepts with or without the 'AS' prefix (e.g. 'AS15169' or '15169').",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ asn }) => {
      const data = await callApi(ENDPOINTS.WHOIS_ASN_LIVE, apiKey, { asn });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "whois_domain_history",
    {
      title: "WHOIS Domain History",
      description:
        "Retrieve historical WHOIS snapshots for a domain, with data going back to 1986. " +
        "Returns a chronological list of records each containing registrar info, " +
        "contacts, name servers, and domain status at time of capture." +
        "Warning: Long-established domains can return a large number of historical records, which may consume significant tokens.",
      inputSchema: z.object({
        domain_name: z.string().describe(DOMAIN_NAME_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ domain_name }) => {
      const data = await callApi(ENDPOINTS.WHOIS_DOMAIN_HISTORY, apiKey, {
        domainName: domain_name,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "whois_reverse_lookup",
    {
      title: "WHOIS Reverse Lookup",
      description:
        "Search WHOIS records in reverse to find all domains linked to an owner, " +
        "email, company, or keyword. Provide exactly one of: keyword, email, owner, or company. " +
        "keyword uses pattern matching, email supports wildcard regex (e.g. 'm*@gmail.com'), " +
        "owner and company use full-text phrase matching. " +
        "Results are paginated. Default mode returns 50 records per page with full WHOIS data; " +
        "mini mode returns 100 records per page with key fields only.",
      inputSchema: z.object({
        keyword: z
          .string()
          .optional()
          .describe("Domain keyword to search using pattern matching."),
        email: z
          .string()
          .optional()
          .describe("Email to search. Supports wildcard regex with '*'."),
        owner: z
          .string()
          .optional()
          .describe(
            "Registrant/owner name to search using full-text phrase matching.",
          ),
        company: z
          .string()
          .optional()
          .describe(
            "Company/organization name to search using full-text phrase matching.",
          ),
        exact: z
          .boolean()
          .default(false)
          .describe(
            "If true, return only exact matches. Applies to keyword, owner, and company searches.",
          ),
        mode: WhoisReverseLookupMode.default("default").describe(
          "Result mode: 'default' (50 records per page, full WHOIS data) or 'mini' (100 records per page, key fields only).",
        ),
        page: z
          .number()
          .int()
          .min(1)
          .default(1)
          .describe("Page number for paginated results. Defaults to 1."),
      }),
      annotations: READ_ONLY,
    },
    async ({ keyword, email, owner, company, exact, mode, page }) => {
      const params: Params = { mode, page, exact };
      if (keyword !== undefined) params["keyword"] = keyword;
      if (email !== undefined) params["email"] = email;
      if (owner !== undefined) params["owner"] = owner;
      if (company !== undefined) params["company"] = company;
      const data = await callApi(
        ENDPOINTS.WHOIS_DOMAIN_REVERSE,
        apiKey,
        params,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "whois_bulk_domain_lookup",
    {
      title: "Bulk WHOIS Domain Lookup",
      description:
        "Retrieve live WHOIS data for up to 100 domain names. " +
        "Returns structured registrar info, contacts, name servers, status, and raw WHOIS text per domain. " +
        "The response is an array under 'bulk_whois_response'. " +
        "If a single domain fails its entry has status=false while the rest are still returned.",
      inputSchema: z.object({
        domain_names: z
          .array(z.string())
          .max(100)
          .describe(
            'List of domain names or URLs to look up (max 100). Example: ["google.com", "microsoft.com"]',
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ domain_names }) => {
      const data = await callApi(
        ENDPOINTS.WHOIS_DOMAIN_LIVE,
        apiKey,
        {},
        { domainNames: domain_names },
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
