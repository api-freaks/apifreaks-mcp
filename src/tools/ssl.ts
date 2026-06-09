import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { READ_ONLY } from "../constants.js";

const DOMAIN_NAME_DESC =
  "Domain name or URL to inspect for SSL certificate data " +
  "(e.g. 'example.com' or 'https://example.com').";
const SSL_RAW_DESC =
  "If true, also include the raw OpenSSL output in the response. Default: false.";

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "ssl_live_lookup",
    {
      title: "SSL Live Lookup",
      description:
        "Retrieve the live SSL certificate for a domain (end-user/leaf certificate only, no chain). " +
        "Returns validity dates, serial number, signature algorithm, subject/issuer details, " +
        "public key info, key usages, Subject Alternative Names, and the PEM-encoded certificate. " +
        "To retrieve the full certificate chain use 'ssl_live_chain_lookup' instead.",
      inputSchema: z.object({
        domain_name: z.string().describe(DOMAIN_NAME_DESC),
        ssl_raw: z.boolean().default(false).describe(SSL_RAW_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ domain_name, ssl_raw }) => {
      const data = await callApi(ENDPOINTS.SSL_LIVE, apiKey, {
        domainName: domain_name,
        sslRaw: ssl_raw,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "ssl_live_chain_lookup",
    {
      title: "SSL Live Chain Lookup",
      description:
        "Retrieve the complete live SSL certificate chain for a domain. " +
        "Includes the leaf certificate plus intermediate and root CA certificates when available. " +
        "Each certificate includes chain order, validity window, subject and issuer details, " +
        "public key details, key usages, SAN, and PEM output. " +
        "To retrieve only the end-user certificate, use 'ssl_live_lookup' instead.",
      inputSchema: z.object({
        domain_name: z.string().describe(DOMAIN_NAME_DESC),
        ssl_raw: z.boolean().default(false).describe(SSL_RAW_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ domain_name, ssl_raw }) => {
      const data = await callApi(ENDPOINTS.SSL_LIVE_CHAIN, apiKey, {
        domainName: domain_name,
        sslRaw: ssl_raw,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
