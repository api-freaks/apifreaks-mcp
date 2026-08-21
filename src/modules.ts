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

import { register as registerCommodity } from "./tools/commodity.js";
import { register as registerCurrency } from "./tools/currency.js";
import { register as registerDns } from "./tools/dns.js";
import { register as registerDomain } from "./tools/domain.js";
import { register as registerEmailValidation } from "./tools/email-validation.js";
import { register as registerFinancial } from "./tools/financial.js";
import { register as registerGeocoding } from "./tools/geocoding.js";
import { register as registerGeography } from "./tools/geodb.js";
import { register as registerIpIntelligence } from "./tools/ip-intelligence.js";
import { register as registerPdf } from "./tools/pdf.js";
import { register as registerPhoneValidation } from "./tools/phone-validation.js";
import { register as registerScraper } from "./tools/scraper.js";
import { register as registerScreenshot } from "./tools/screenshot.js";
import { register as registerSsl } from "./tools/ssl.js";
import { register as registerTimezone } from "./tools/timezone.js";
import { register as registerUserAgent } from "./tools/user-agent.js";
import { register as registerWeather } from "./tools/weather.js";
import { register as registerWhois } from "./tools/whois.js";
import { register as registerZipcode } from "./tools/zipcode.js";

const MODULES: Record<ModuleName, (server: McpServer, apiKey: string) => void> =
  {
    "ip-intelligence": registerIpIntelligence,
    geocoding: registerGeocoding,
    whois: registerWhois,
    dns: registerDns,
    scraper: registerScraper,
    "email-validation": registerEmailValidation,
    "phone-validation": registerPhoneValidation,
    ssl: registerSsl,
    domain: registerDomain,
    screenshot: registerScreenshot,
    pdf: registerPdf,
    currency: registerCurrency,
    commodity: registerCommodity,
    financial: registerFinancial,
    zipcode: registerZipcode,
    weather: registerWeather,
    geography: registerGeography,
    timezone: registerTimezone,
    "user-agent": registerUserAgent,
  };

export function registerEnabledModules(
  server: McpServer,
  apiKey: string,
): void {
  const { enabled, unknown } = parseEnabledModules();
  registerListModules(server, enabled, unknown);

  for (const name of enabled) {
    MODULES[name](server, apiKey);
  }
}

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
    if (!name) {
      continue;
    }
    if (seen.has(name)) {
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

function registerListModules(
  server: McpServer,
  enabled: Array<ModuleName>,
  unknown: Array<string>,
): void {
  const currentLine = enabled.length > 0 ? modulesEnvLine(enabled) : "";
  const exampleLine = modulesEnvLine([
    "ip-intelligence",
    "whois",
    "dns",
    "weather",
  ]);
  const howToEnable =
    `When a module is missing, give the user the full ${ENV.MODULES}=... line to paste ` +
    `(keep every currently enabled module, then append the new ones). ` +
    `Do not only name the module. They must restart the MCP server after changing it.`;

  const description =
    enabled.length === 0
      ? `No APIFreaks API tools are registered because ${ENV.MODULES} is not set. ` +
        `Call this tool to see each module and its tools, then give the user a complete assignment to paste. ` +
        `Example: ${exampleLine}`
      : `Enabled APIFreaks modules: ${enabled.join(", ")} (${currentLine}). ` +
        `Call this tool to see tools in every module if something the user needs is not enabled. ` +
        howToEnable;

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
              current: currentLine,
              example: exampleLine,
              how_to_enable: howToEnable,
              modules: moduleCatalogPayload(enabled),
            }),
          },
        ],
      };
    },
  );
}

function moduleCatalogPayload(
  enabled: Array<ModuleName>,
): Record<
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

function modulesEnvLine(names: Array<string>): string {
  return `${ENV.MODULES}=${names.join(",")}`;
}
