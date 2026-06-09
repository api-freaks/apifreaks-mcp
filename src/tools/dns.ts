import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { READ_ONLY, type Params } from "../constants.js";

const HOST_NAME_DESC =
  "Hostname or URL to look up DNS records for (e.g. 'example.com').";
const TYPE_DESC =
  "List of DNS record types to retrieve. " +
  "Allowed values: 'A', 'AAAA', 'MX', 'NS', 'SOA', 'SPF', 'TXT', 'CNAME', 'all'. " +
  "Use ['all'] to retrieve every supported type in one request.";
const PAGE_DESC = "Page number for paginated results. Defaults to 1.";

const DnsRecordType = z.enum([
  "A",
  "AAAA",
  "MX",
  "NS",
  "SOA",
  "SPF",
  "TXT",
  "CNAME",
  "all",
]);
const DnsReverseRecType = z.enum([
  "A",
  "AAAA",
  "MX",
  "NS",
  "SOA",
  "SPF",
  "TXT",
  "CNAME",
]);

function joinTypes(types: string[]): string {
  return types.map((t) => t.trim()).join(",");
}

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "dns_lookup",
    {
      title: "DNS Lookup",
      description:
        "Retrieve real-time DNS records for a hostname or IP address. " +
        "Supports A, AAAA, MX, NS, SOA, SPF, TXT, and CNAME record types. " +
        "At least one of host_name or ip_address must be provided. " +
        "When ip_address is provided, record_types must be ['all'].",
      inputSchema: z.object({
        record_types: z.array(DnsRecordType).describe(TYPE_DESC),
        host_name: z.string().optional().describe(HOST_NAME_DESC),
        ip_address: z
          .string()
          .optional()
          .describe(
            "IP address for PTR record lookup. When provided, record_types must be ['all']. Can be combined with host_name.",
          ),
        format: z
          .string()
          .optional()
          .describe("Response format: 'json' (default) or 'xml'."),
      }),
      annotations: READ_ONLY,
    },
    async ({ record_types, host_name, ip_address, format }) => {
      const params: Params = { type: joinTypes(record_types) };
      if (host_name !== undefined) params["host-name"] = host_name;
      if (ip_address !== undefined) params["ipAddress"] = ip_address;
      if (format !== undefined) params["format"] = format;
      const data = await callApi(ENDPOINTS.DNS_LIVE, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "dns_history",
    {
      title: "DNS History",
      description:
        "Retrieve historical DNS records for a hostname. " +
        "Returns paginated snapshots of DNS records captured over time, up to 100 per page. " +
        "Supports A, AAAA, MX, NS, SOA, SPF, TXT, and CNAME record types.",
      inputSchema: z.object({
        host_name: z.string().describe(HOST_NAME_DESC),
        record_types: z.array(DnsRecordType).describe(TYPE_DESC),
        page: z.number().int().min(1).default(1).describe(PAGE_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ host_name, record_types, page }) => {
      const params: Params = {
        "host-name": host_name,
        type: joinTypes(record_types),
        page,
      };
      const data = await callApi(ENDPOINTS.DNS_HISTORY, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "dns_reverse",
    {
      title: "DNS Reverse Lookup",
      description:
        "Find all hostnames associated with a specific DNS record value. " +
        "Supports reverse IP lookup (all domains on an IP/CIDR), " +
        "reverse MX lookup (all domains using a mail provider), " +
        "reverse NS lookup (all domains on a name server), and more. " +
        "Wildcard patterns using '*' are supported for MX, NS, SOA, SPF, TXT, CNAME. " +
        "Results are paginated at up to 100 DNS records per page.",
      inputSchema: z.object({
        record_type: DnsReverseRecType.describe(
          "DNS record type to reverse-search on. Allowed values: 'A', 'AAAA', 'MX', 'NS', 'SOA', 'SPF', 'TXT', 'CNAME'.",
        ),
        value: z
          .string()
          .describe(
            "The value to query depending on record type. " +
              "For A/AAAA: an IP address or CIDR block. " +
              "For MX/NS/SOA/SPF/TXT/CNAME: a hostname or provider domain. Wildcard patterns with '*' are supported.",
          ),
        exact: z
          .boolean()
          .default(false)
          .describe(
            "If true, return only exact matches for NS, MX, CNAME, SOA, SPF, and TXT. Default: false.",
          ),
        page: z.number().int().min(1).default(1).describe(PAGE_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ record_type, value, exact, page }) => {
      const params: Params = { type: record_type, value, exact, page };
      const data = await callApi(ENDPOINTS.DNS_REVERSE, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "dns_bulk_lookup",
    {
      title: "Bulk DNS Lookup",
      description:
        "Retrieve real-time DNS records for up to 100 hostnames at once. " +
        "Supports A, AAAA, MX, NS, SOA, SPF, TXT, and CNAME record types. " +
        "The response is an array under 'bulk_dns_info'. " +
        "If a single hostname fails its entry has status=false while the rest are still returned.",
      inputSchema: z.object({
        domain_names: z
          .array(z.string())
          .max(100)
          .describe(
            'List of hostnames or URLs to look up DNS records for (max 100). Example: ["google.com", "cloudflare.com"]',
          ),
        record_types: z.array(DnsRecordType).describe(TYPE_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ domain_names, record_types }) => {
      const data = await callApi(
        ENDPOINTS.DNS_LIVE,
        apiKey,
        { type: joinTypes(record_types) },
        { domainNames: domain_names },
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
