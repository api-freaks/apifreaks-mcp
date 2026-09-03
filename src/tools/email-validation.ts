import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { READ_ONLY, type Body } from "../constants.js";

const EMAIL_DESC = "Email address to validate (e.g. 'user@example.com').";
const NAME_DESC = "Optional name or label for record tracking.";
const IP_DESC =
  "Optional IPv4 or IPv6 address for geolocation and security enrichment. " +
  "When set, the response may include 'ip' plus an 'address' object with location and security fields " +
  "(threat_score, Tor/proxy/bot/spam/cloud-provider flags).";

const EmailEntry = z.object({
  email: z.string().describe(EMAIL_DESC),
  name: z.string().optional().describe(NAME_DESC),
  ip: z.string().optional().describe(IP_DESC),
});

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "email_validate",
    {
      title: "Email Validation",
      description:
        "Validate one email address: syntax, domain DNS, disposable/spam/free/catch-all flags, " +
        "and whether it looks deliverable. " +
        "Read 'validEmail' for the overall result: 'valid' (deliverable), 'invalid' (rejected or undeliverable), " +
        "'unknown' (inconclusive), 'risky' (uncertain, often catch-all), or 'app_server_blocked' " +
        "(the recipient mail server blocked verification). " +
        "When 'validSyntax' is false, 'validEmail' is 'invalid'. When the result is not 'valid', 'reason' explains why. " +
        "DNS hostnames are in 'dns.mxRecord' and 'dns.aRecord'. " +
        "Optional: pass 'ip' to attach geolocation and threat signals for that IP.",
      inputSchema: EmailEntry,
      annotations: READ_ONLY,
    },
    async ({ email, name, ip }) => {
      const body: Body = { email };
      if (name !== undefined) body["name"] = name;
      if (ip !== undefined) body["ip"] = ip;
      const data = await callApi(
        ENDPOINTS.EMAIL_VALIDATION_SINGLE,
        apiKey,
        {},
        body,
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "email_bulk_validate",
    {
      title: "Bulk Email Validation",
      description:
        "Validate up to 10 email addresses in one request. Each address is checked independently, " +
        "so one failure does not drop the rest of the batch. " +
        "The response is 'emailResponse': an array of the same per-email result as 'email_validate'.",
      inputSchema: z.object({
        emails: z
          .array(EmailEntry)
          .max(10)
          .describe(
            'List of email objects (max 10). Each object must include "email"; "name" and "ip" are optional. Example: [{"email":"user@example.com"},{"email":"admin@example.org","ip":"8.8.8.8"}]',
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ emails }) => {
      const emailData = emails.map((entry) => {
        const item: Body = { email: entry.email };
        if (entry.name !== undefined) item["name"] = entry.name;
        if (entry.ip !== undefined) item["ip"] = entry.ip;
        return item;
      });
      const data = await callApi(
        ENDPOINTS.EMAIL_VALIDATION_BULK,
        apiKey,
        {},
        { emailData },
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
