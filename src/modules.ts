import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { READ_ONLY } from "./constants.js";
import { ENV, getModulesEnv } from "./env.js";
import {
  MODULE_CATALOG,
  MODULE_NAMES,
  type ModuleName,
  type ModuleTool,
} from "./module-catalog.js";
import { register as registerAstronomy } from "./tools/astronomy.js";
import { register as registerCommodity } from "./tools/commodity.js";
import { register as registerCurrency } from "./tools/currency.js";
import { register as registerDns } from "./tools/dns.js";
import { register as registerDomain } from "./tools/domain.js";
import { register as registerEmailValidation } from "./tools/email-validation.js";
import { register as registerFinancial } from "./tools/financial.js";
import { register as registerGeocoding } from "./tools/geocoding.js";
import { register as registerGeodb } from "./tools/geodb.js";
import { register as registerIpIntelligence } from "./tools/ip-intelligence.js";
import { register as registerPhoneValidation } from "./tools/phone-validation.js";
import { register as registerScraper } from "./tools/scraper.js";
import { register as registerScreenshot } from "./tools/screenshot.js";
import { register as registerSsl } from "./tools/ssl.js";
import { register as registerTimezone } from "./tools/timezone.js";
import { register as registerUserAgent } from "./tools/user-agent.js";
import { register as registerWeather } from "./tools/weather.js";
import { register as registerWhois } from "./tools/whois.js";
import { register as registerZipcode } from "./tools/zipcode.js";

const MODULES: Record<
  ModuleName,
  (server: McpServer, apiKey: string) => void
> = {
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
  scraper: registerScraper,
  "user-agent": registerUserAgent,
  astronomy: registerAstronomy,
  financial: registerFinancial,
  "email-validation": registerEmailValidation,
  "phone-validation": registerPhoneValidation,
  geocoding: registerGeocoding,
  geodb: registerGeodb,
};

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
  const description =
    enabled.length === 0
      ? `No APIFreaks API tools are registered because ${ENV.MODULES} is not set. ` +
        `Call this tool to see each module and the tools it contains, then ask the user to add the needed modules to ${ENV.MODULES} and restart. ` +
        `Example: ${ENV.MODULES}=geodb,weather`
      : `Enabled APIFreaks modules: ${enabled.join(", ")}. ` +
        `Call this tool to see tools in every module if something the user needs is not enabled. ` +
        `To change the set, update ${ENV.MODULES} and restart.`;

  server.registerTool(
    "list_modules",
    {
      title:
        enabled.length === 0
          ? `Set ${ENV.MODULES} to enable tools`
          : "List APIFreaks modules",
      description,
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
              modules: moduleCatalogPayload(enabled),
              example: `${ENV.MODULES}=weather,whois,geodb`,
            }),
          },
        ],
      };
    },
  );
}

function moduleCatalogPayload(enabled: Array<ModuleName>): Record<
  ModuleName,
  { enabled: boolean; summary: string; tools: Array<ModuleTool> }
> {
  const enabledSet = new Set<ModuleName>(enabled);
  const catalog = {} as Record<
    ModuleName,
    { enabled: boolean; summary: string; tools: Array<ModuleTool> }
  >;
  for (const name of MODULE_NAMES) {
    catalog[name] = {
      enabled: enabledSet.has(name),
      summary: MODULE_CATALOG[name].summary,
      tools: MODULE_CATALOG[name].tools,
    };
  }
  return catalog;
}
