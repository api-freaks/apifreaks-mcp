import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { READ_ONLY, type Body } from "../constants.js";

const VALIDATE_EMAIL_DESC =
  "The email address to validate (for example 'abc.def@gmail.com').";
const CHECK_EMAIL_DESC =
  "The email address to check (for example 'john@1000gmail.com').";
const NAME_DESC =
  "Optional identifier or label for record tracking. Reserved for future identity verification.";
const VALIDATE_IP_DESC =
  "Optional IP address for geolocation and security enrichment (VPN, proxy, TOR, threat detection). " +
  "Returned as 'ip'. 'address' is included only when this is set.";
const DISPOSABLE_IP_DESC =
  "Optional IP address to look up for location and security data, such as the IP the signup came from. " +
  "'ip' and 'address' are returned only when this is set. " +
  "If the lookup fails, 'address' is left out and the disposable result is unaffected. " +
  "An invalid or reserved IP still returns 200 with 'address.validIpAddress' false.";

const EmailEntry = z.object({
  email: z.string().describe(VALIDATE_EMAIL_DESC),
  name: z.string().optional().describe(NAME_DESC),
  ip: z.string().optional().describe(VALIDATE_IP_DESC),
});

const DisposableEntry = z.object({
  email: z.string().describe(CHECK_EMAIL_DESC),
  ip: z.string().optional().describe(DISPOSABLE_IP_DESC),
});

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "email_validate",
    {
      title: "Email Validation",
      description:
        "Validate one email address: syntax, MX records, " +
        "domain validity, disposable addresses, catch-all domains, role-based accounts, spam traps, and deliverability. " +
        "Required body field 'email'. Optional 'name' and 'ip'. " +
        "Read 'validEmail': " +
        "'valid' (recipient confirmed; 'reason' is omitted), " +
        "'accept_all' (catch-all domain accepted the recipient, so this mailbox is unconfirmed; see 'domain.catchAll'), " +
        "'invalid' (rejected, syntax failure, or the domain accepts no mail; also the value when 'validSyntax' is false), " +
        "'unknown' (inconclusive; most common when there is no MX record and the domain is only probed on its address record), " +
        "'risky' (uncertain deliverability, e.g. a full mailbox or a greylisting deferral), " +
        "'app_server_blocked' (the recipient mail server blocked the verification request, so deliverability could not be determined). " +
        "When 'validEmail' is not 'valid', 'reason' is the explanation. " +
        "'domain.catchAll' true: the mail server accepts mail for any address and 'validEmail' is 'accept_all'. " +
        "false: the check ran and the domain is not catch-all. Omitted when the check could not complete. " +
        "'dns.mxRecord' is every mail host at the lowest MX preference, with trailing dots. " +
        "'[\".\"]' means a null MX and the domain accepts no mail. Absent when the domain has no MX record. " +
        "'dns.aRecord' is the domain A records (IPv4). " +
        "'dns' is absent when the domain publishes neither MX nor A records.",
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
        "Validate up to 100 email addresses. " +
        "Each address is independently checked for syntax, MX records, domain validity, disposable addresses, " +
        "catch-all domains, role-based accounts, spam traps, and deliverability. " +
        "Invalid entries do not affect the rest of the batch. " +
        "Pass 'emails' (maximum 100). Each object needs 'email'; 'name' and 'ip' are optional. " +
        "The request body is 'emailData'. " +
        "The response is 'emailResponse': each object follows the 'email_validate' schema.",
      inputSchema: z.object({
        emails: z
          .array(EmailEntry)
          .max(100)
          .describe(
            'Email objects to validate. Maximum 100. Each object must include "email"; "name" and "ip" are optional. Sent as emailData. Example: [{"email":"abc.def@gmail.com","name":"Test User","ip":"1.1.1.1"},{"email":"test@example.com","name":"Example User"},{"email":"someone@mailinator.com"}]',
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

  server.registerTool(
    "email_disposable_check",
    {
      title: "Disposable Email Checker",
      description:
        "Check one email address: throwaway provider, " +
        "whether the domain resolves and has mail servers, and whether it is a free provider, spam-listed, or role-based. " +
        "Required body field 'email'. Optional 'ip' for location and security data, in the same 'address' shape as Email Checker. " +
        "'ip' and 'address' are returned only when an 'ip' was sent. " +
        "If the IP lookup fails, 'address' is left out and the disposable result is unaffected. " +
        "An invalid or reserved IP still returns 200, with 'address.validIpAddress' false. " +
        "A malformed address still returns 200: 'validSyntax' is false, and 'domain' has only 'name' and 'validDomain' false. " +
        "'account' and 'dns' are not returned when 'validSyntax' is false. " +
        "'domain.disposable' is true for a known throwaway or temp-mail provider (the provider list is updated daily) and is omitted when 'validSyntax' is false. " +
        "'domain.free' is true for consumer providers such as Gmail or Outlook, independent of 'disposable', and is omitted when 'validSyntax' is false. " +
        "'domain.spam' is true when the domain is listed in spam databases, and is omitted when 'validSyntax' is false. " +
        "'domain.validDomain' is true when the domain resolves and is set up for mail; false when the domain does not exist or the address is malformed. " +
        "'account.role' is true for a shared inbox read by a team rather than a person (e.g. 'support@', 'admin@', 'info@'). " +
        "'dns.mxRecord' lists mail servers from the MX records, with trailing dots, and only when the domain has them. " +
        "A documented null-MX example returns 'dns.mxRecord' as '[\".\"]' for a domain that accepts no mail. " +
        "'dns.aRecord' lists IPv4 addresses from the A records, and only when the domain has them.",
      inputSchema: DisposableEntry,
      annotations: READ_ONLY,
    },
    async ({ email, ip }) => {
      const body: Body = { email };
      if (ip !== undefined) body["ip"] = ip;
      const data = await callApi(
        ENDPOINTS.EMAIL_DISPOSABLE,
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
    "email_bulk_disposable_check",
    {
      title: "Bulk Disposable Email Checker",
      description:
        "Run the same checks as 'email_disposable_check' for up to 100 addresses. " +
        "Each address gets its own result. " +
        "Pass 'emails' (1 to 100). Each object needs 'email' and may include 'ip'. The request body is 'emailData'. " +
        "The response is 'disposableEmailResponse': one result per submitted address, in request order, " +
        "with the same schema as the single check. " +
        "A malformed address never fails the batch: 'validSyntax' is false and 'domain.validDomain' is false. " +
        "The API returns 400 'Please pass at least one entry in emailData' when 'emailData' is missing or empty. " +
        "It returns 400 when an entry is null or has a blank or missing email: " +
        "'emailData' must not contain null entries or entries without a valid 'email'. " +
        "More than 100 entries returns 413 'Maximum request body size limit exceeded'.",
      inputSchema: z.object({
        emails: z
          .array(DisposableEntry)
          .min(1)
          .max(100)
          .describe(
            'Email objects to check (1 to 100). Each object must include "email"; "ip" is optional. Sent as emailData. Example: [{"email":"abc"},{"email":"john@microsoft.com","ip":"8.8.8.8"},{"email":"test@mailinator.com"}]',
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ emails }) => {
      const emailData = emails.map((entry) => {
        const item: Body = { email: entry.email };
        if (entry.ip !== undefined) item["ip"] = entry.ip;
        return item;
      });
      const data = await callApi(
        ENDPOINTS.EMAIL_DISPOSABLE_BULK,
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
