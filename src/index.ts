import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getApiKey } from "./env.js";
import { registerEnabledModules } from "./modules.js";

async function main() {
  const apiKey = getApiKey();

  const server = new McpServer({
    name: "apifreaks-mcp-server",
    version: "2.0.0",
  });

  registerEnabledModules(server, apiKey);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("APIFreaks MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
