import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { READ_ONLY } from "./constants.js";
import { ENV, getModulesEnv } from "./env.js";
import { register as registerAstronomy } from "./tools/astronomy.js";
import { register as registerCommodity } from "./tools/commodity.js";
import { register as registerCurrency } from "./tools/currency.js";
import { register as registerDns } from "./tools/dns.js";
import { register as registerDomain } from "./tools/domain.js";
import { register as registerIpIntelligence } from "./tools/ip-intelligence.js";
import { register as registerScreenshot } from "./tools/screenshot.js";
import { register as registerSsl } from "./tools/ssl.js";
import { register as registerTimezone } from "./tools/timezone.js";
import { register as registerUserAgent } from "./tools/user-agent.js";
import { register as registerWeather } from "./tools/weather.js";
import { register as registerWhois } from "./tools/whois.js";
import { register as registerZipcode } from "./tools/zipcode.js";

const MODULES = {
  weather: registerWeather,
  currency: registerCurrency,
  "ip-intelligence": registerIpIntelligence,
  whois: registerWhois,
  dns: registerDns,
  domain: registerDomain,
  ssl: registerSsl,
  commodity: registerCommodity,
  zipcode: registerZipcode,
  timezone: registerTimezone,
  screenshot: registerScreenshot,
  "user-agent": registerUserAgent,
  astronomy: registerAstronomy,
} as const;

type ModuleName = keyof typeof MODULES;

const MODULE_NAMES = Object.keys(MODULES) as Array<ModuleName>;

export function registerEnabledModules(
  server: McpServer,
  apiKey: string,
): void {
  const { enabled, unknown } = parseEnabledModules();
  registerListModules(server, enabled, unknown);

  // register the modules that are enabled
  for (const name of enabled) {
    MODULES[name](server, apiKey);
  }
}

// parse the enabled modules from the environment variable and return the enabled and unknown modules
function parseEnabledModules(): {
  enabled: Array<ModuleName>;
  unknown: Array<string>;
} {
  const raw = getModulesEnv();
  if (!raw?.trim()) {
    return { enabled: [], unknown: [] };
  }

  const enabled: Array<ModuleName> = [];
  const seen = new Set<string>();
  const unknown: Array<string> = [];

  for (const token of raw.split(",")) {
    const name = token.trim().toLowerCase().replaceAll("_", "-");
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    if (name in MODULES) {
      enabled.push(name as ModuleName);
    } else {
      unknown.push(name);
    }
  }

  return { enabled, unknown };
}

// register the list modules tool that lists the enabled and unknown modules
function registerListModules(
  server: McpServer,
  enabled: Array<ModuleName>,
  unknown: Array<string>,
): void {
  const message =
    enabled.length === 0
      ? `No APIFreaks API tools are available because ${ENV.MODULES} is not set. ` +
        `Ask the user to add ${ENV.MODULES} to this MCP server's env in their client config, then restart the server. ` +
        `Use a comma-separated list of modules. Available: ${MODULE_NAMES.join(", ")}. ` +
        `Example: ${ENV.MODULES}=weather,whois`
      : `Enabled APIFreaks modules: ${enabled.join(", ")}. ` +
        `Available modules: ${MODULE_NAMES.join(", ")}. ` +
        `To change the set, update ${ENV.MODULES} in the MCP client config and restart.`;

  server.registerTool(
    "list_modules",
    {
      title:
        enabled.length === 0
          ? `Set ${ENV.MODULES} to enable tools`
          : "List APIFreaks modules",
      description: message,
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async function () {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              env: ENV.MODULES,
              enabled,
              unknown,
              available: MODULE_NAMES,
              message,
              example: `${ENV.MODULES}=weather,whois`,
            }),
          },
        ],
      };
    },
  );
}
