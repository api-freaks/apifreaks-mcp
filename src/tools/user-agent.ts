import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { READ_ONLY } from "../constants.js";

const UA_DESC =
  "The user-agent string to parse " +
  '(e.g. "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...").';

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "user_agent_parse",
    {
      title: "Parse User Agent",
      description:
        "Parse a single user-agent string to extract browser, device, OS, and engine details. " +
        "Also identifies crawlers/bots and flags potential attack user-agents.",
      inputSchema: z.object({
        user_agent: z.string().describe(UA_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ user_agent }) => {
      const data = await callApi(
        ENDPOINTS.USER_AGENT_LOOKUP,
        apiKey,
        {},
        undefined,
        "GET",
        { "User-Agent": user_agent },
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "user_agent_bulk_parse",
    {
      title: "Bulk Parse User Agents",
      description:
        "Parse up to 20,000 user-agent strings in a single request. " +
        "Returns an array of parsed objects — same fields as the 'user_agent_parse' tool. " +
        "Individual parse failures include a 'message' field without blocking other results. " +
        "**Always ask the user before sending a large body** (hundreds to 20,000 user-agents): " +
        "each string consumes API credits. Confirm the count and that they want to spend those credits.",
      inputSchema: z.object({
        ua_strings: z
          .array(z.string())
          .max(20_000)
          .describe(
            'List of user-agent strings to parse (max 20,000). Each string consumes credits — ask the user before large batches. Example: ["Mozilla/5.0 (Windows ...)", "Googlebot/2.1 (...)"]',
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ ua_strings }) => {
      const data = await callApi(
        ENDPOINTS.USER_AGENT_LOOKUP,
        apiKey,
        {},
        { uaStrings: ua_strings },
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
