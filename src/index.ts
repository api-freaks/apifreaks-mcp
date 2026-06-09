import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getApiKey } from "./auth.js";
import { register as registerWeather } from "./tools/weather.js";
import { register as registerZipcode } from "./tools/zipcode.js";
import { register as registerCommodity } from "./tools/commodity.js";
import { register as registerIpIntelligence } from "./tools/ip-intelligence.js";
import { register as registerTimezone } from "./tools/timezone.js";
import { register as registerAstronomy } from "./tools/astronomy.js";
import { register as registerUserAgent } from "./tools/user-agent.js";
import { register as registerWhois } from "./tools/whois.js";
import { register as registerDns } from "./tools/dns.js";
import { register as registerSsl } from "./tools/ssl.js";
import { register as registerDomain } from "./tools/domain.js";
import { register as registerCurrency } from "./tools/currency.js";
import { register as registerScreenshot } from "./tools/screenshot.js";

async function main() {
  const apiKey = getApiKey();

  const server = new McpServer({
    name: "apifreaks-mcp-server",
    version: "1.0.0",
  });
  
  registerZipcode(server, apiKey);
  registerCommodity(server, apiKey);
  registerCurrency(server, apiKey);
  registerWeather(server, apiKey);
  registerIpIntelligence(server, apiKey);
  registerWhois(server, apiKey);
  registerDns(server, apiKey);
  registerSsl(server, apiKey);
  registerDomain(server, apiKey);
  registerScreenshot(server, apiKey);
  registerUserAgent(server, apiKey);
  registerTimezone(server, apiKey);
  registerAstronomy(server, apiKey);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("APIFreaks MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
